/**
 * RHUFT v14 — Parallel Engine: Shared-Field Node Compute
 *
 * A faithful, side-effect-isolated port of `FractalNode.compute()` that sources
 * CHILD fields from the shared buffer (SAB) instead of each child's private
 * array, and RETURNS the new field instead of writing it into `node._state`.
 *
 * Why this exists:
 *   In the serial engine, `compute()` reads `child.state.field_state` directly.
 *   Under shared-memory parallelism, child fields live in the SAB (written by
 *   whichever worker owns that child). This function is the SAME math — the 3
 *   Master-Equation terms, the framework pass, the memory pass, and child
 *   feedback — but parameterised on the field source so a worker can compute a
 *   node it owns while reading its children's freshly-written SAB rows.
 *
 * No-regression guarantee (PARALLEL_ENGINE.md §2):
 *   The arithmetic is replicated term-for-term, in the SAME operation order
 *   (Float64 addition order is preserved), using the node's REAL framework and
 *   memory objects (so their internal state — e.g. L2_Hebbian correlation
 *   matrix — evolves identically). Given identical inputs the result is
 *   bit-for-bit identical to `FractalNode.compute()`. Phase 2e proves it.
 *
 * Epistemic Status: [SPEC] — same ontology as fractal_node.ts; no new math.
 */

import type { ComplexAmplitude, Float64 } from "../types.ts";
import {
  CLOSURE_COUPLING,
  MASTER_EQUATION_N,
  PHI,
  PHI_INV,
  PHI_NEG2,
  PI,
} from "../core/constants.ts";
import { at } from "../core/indexing.ts";

// ── Local helpers (mirrors of fractal_node.ts private fns — kept in lockstep) ─

function computePhaseAngle(k: number, n: number): Float64 {
  const base = (2 * PI * k * PHI_INV * n) / 89;
  const normalized = base % (2 * PI);
  return (normalized >= 0 ? normalized : normalized + 2 * PI) as Float64;
}

function complexExp(theta: Float64): ComplexAmplitude {
  return [Math.cos(theta) as Float64, Math.sin(theta) as Float64];
}

function computeGeometricOverlap(fieldA: Float64Array, fieldB: Float64Array): Float64 {
  const len = Math.min(fieldA.length, fieldB.length);
  if (len === 0) return 0 as Float64;
  let dotReal = 0, dotImag = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i += 2) {
    const aR = fieldA[i] ?? 0, aI = fieldA[i + 1] ?? 0;
    const bR = fieldB[i] ?? 0, bI = fieldB[i + 1] ?? 0;
    dotReal += aR * bR + aI * bI;
    dotImag += aR * bI - aI * bR;
    normA += aR * aR + aI * aI;
    normB += bR * bR + bI * bI;
  }
  const normProduct = Math.sqrt(normA * normB);
  if (normProduct === 0) return 0 as Float64;
  const overlap = Math.sqrt(dotReal * dotReal + dotImag * dotImag) / normProduct;
  return (overlap * overlap) as Float64;
}

/**
 * Term-1 (summation) field is a pure function of scale: every node at a depth
 * shares one scale, so all nodes in that level produce the identical summation
 * field. Cache per scale and reuse — BIT-IDENTICAL to recomputing (same literal
 * values, same op order within a scale's single computation). Never invalidated:
 * the value depends only on the immutable scale index. [SPEC]
 */
const _summationCache = new Map<number, Float64Array>();
function getSummationField(scale: number, fieldSize: number): Float64Array {
  let f = _summationCache.get(scale);
  if (f === undefined) {
    f = new Float64Array(fieldSize);
    for (let k = 0; k <= (fieldSize / 2) - 1; k++) {
      const amplitudeWeight = Math.pow(PHI_INV, k) as Float64;
      const phaseAngle = computePhaseAngle(k, scale);
      const [re, im] = complexExp(phaseAngle);
      const idx = 2 * k;
      if (idx < fieldSize) {
        f[idx] = (amplitudeWeight * re) as Float64;
        f[idx + 1] = (amplitudeWeight * im) as Float64;
      }
    }
    _summationCache.set(scale, f);
  }
  return f;
}

/**
 * The minimal node surface the shared compute needs. Satisfied by the real
 * FractalNode (structural typing) — framework/memory objects are the node's
 * OWN instances so their state evolves across ticks exactly as in serial.
 */
export interface SharedNodeRef {
  readonly scale: number;
  readonly _membrane: {
    readonly surface_area: number;
    readonly boundary_field: Float64Array;
    readonly curvature_coupling: number;
  };
  readonly _previousField: Float64Array | null;
  readonly _frameworkComputes: readonly { compute(input: Float64Array, field_state: Float64Array): Float64Array }[];
  readonly _memoryComputes: readonly { store(pattern: Float64Array): void; recall(pattern: Float64Array): Float64Array }[];
  /** Current field (the node's own latest committed field). */
  readonly currentField: Float64Array;
}

export interface SharedComputeResult {
  readonly field: Float64Array;
  readonly coherence: Float64;
  readonly energyDensity: Float64;
}

/**
 * Compute a node's next field, reading child fields from the shared buffer.
 *
 * @param node         — the node's live reference (frameworks/memory/state).
 * @param childFields  — the node's children's CURRENT field rows (from SAB),
 *                       in the node's fixed child order.
 * @param maxK         — Master-Equation summation limit (default N=13).
 * @returns the new field, coherence, and energy density (not yet committed).
 */
export function computeNodeShared(
  node: SharedNodeRef,
  childFields: readonly Float64Array[],
  maxK: number = MASTER_EQUATION_N
): SharedComputeResult {
  const N = maxK;
  const fieldSize = 2 * (N + 1);
  const scale = node.scale;

  // ── Term 1: Summation Σ(k=0..N) φ^(−k) · e^(i·θ_k) — per-scale cached ──────
  const summationField = getSummationField(scale, fieldSize);

  // ── Term 2: Recursive memory λ · Ψ_previous ──────────────────────────────
  const memoryField = new Float64Array(fieldSize);
  if (node._previousField !== null) {
    const prev = node._previousField;
    for (let i = 0; i < fieldSize; i++) memoryField[i] = (PHI_NEG2 * (prev[i] ?? 0)) as Float64;
  }

  // ── Term 3: Surface closure κ · (∮∇Ψ·dS) / A ─────────────────────────────
  const surfaceField = new Float64Array(fieldSize);
  const membrane = node._membrane;
  if (membrane.surface_area !== 0) {
    const boundary = membrane.boundary_field;
    const cc = membrane.curvature_coupling;
    const factor = (CLOSURE_COUPLING * cc) as Float64;
    const field = node.currentField;
    for (let i = 0; i < fieldSize; i++) {
      const bVal = boundary[i % boundary.length] ?? 0;
      surfaceField[i] = (factor * (bVal - at(field, i))) as Float64;
    }
  }

  // ── Total: sum of the three terms ─────────────────────────────────────────
  const totalField = new Float64Array(fieldSize);
  for (let i = 0; i < fieldSize; i++) {
    totalField[i] = (at(summationField, i) + at(memoryField, i) + at(surfaceField, i)) as Float64;
  }

  // ── Framework pass (node's REAL framework objects; state evolves) ─────────
  const realInputSize = Math.floor(fieldSize / 2);
  const realInput = new Float64Array(realInputSize);
  for (let i = 0; i < realInputSize; i++) {
    const re = totalField[2 * i] ?? 0, im = totalField[2 * i + 1] ?? 0;
    realInput[i] = Math.sqrt(re * re + im * im);
  }

  if (node._frameworkComputes.length > 0) {
    const frameworkSum = new Float64Array(realInputSize);
    for (const fw of node._frameworkComputes) {
      const fwOutput = fw.compute(realInput, realInput);
      for (let i = 0; i < realInputSize; i++) {
        frameworkSum[i] += at(fwOutput, i) * (1.0 / PHI) / node._frameworkComputes.length;
      }
    }
    for (let i = 0; i < realInputSize; i++) {
      const contribution = frameworkSum[i];
      totalField[2 * i] = (at(totalField, 2 * i) + contribution * Math.cos(computePhaseAngle(i, scale))) as Float64;
      totalField[2 * i + 1] = (at(totalField, 2 * i + 1) + contribution * Math.sin(computePhaseAngle(i, scale))) as Float64;
    }
  }

  // ── Memory pass (node's REAL memory objects; store() mutates, as serial) ──
  if (node._memoryComputes.length > 0) {
    const memorySum = new Float64Array(realInputSize);
    for (const mem of node._memoryComputes) {
      mem.store(realInput);
      const memOutput = mem.recall(realInput);
      for (let i = 0; i < realInputSize; i++) {
        memorySum[i] += at(memOutput, i) * (1.0 / (PHI * PHI)) / node._memoryComputes.length;
      }
    }
    for (let i = 0; i < realInputSize; i++) {
      const contribution = memorySum[i];
      totalField[2 * i] = (at(totalField, 2 * i) + contribution * Math.cos(computePhaseAngle(i + 1, scale))) as Float64;
      totalField[2 * i + 1] = (at(totalField, 2 * i + 1) + contribution * Math.sin(computePhaseAngle(i + 1, scale))) as Float64;
    }
  }

  // ── Child feedback (from SHARED rows, fixed child order — same as serial) ─
  if (childFields.length > 0) {
    const childWeight = (1.0 / PHI) / (childFields.length + 1e-300);
    for (const childField of childFields) {
      for (let i = 0; i < fieldSize; i++) {
        totalField[i] = (at(totalField, i) + at(childField, i) * childWeight) as Float64;
      }
    }
  }

  // ── Coherence C(n) = |<Ψ(n)|Ψ(n−1)>|² ────────────────────────────────────
  const coherence: Float64 =
    node._previousField !== null
      ? computeGeometricOverlap(totalField, node._previousField)
      : (1.0 as Float64);

  // ── Energy density ────────────────────────────────────────────────────────
  let energySum = 0;
  for (let i = 0; i < fieldSize; i += 2) {
    const re = totalField[i], im = totalField[i + 1];
    energySum += re * re + im * im;
  }
  const energyDensity = (energySum / (N + 1)) as Float64;

  return { field: totalField, coherence, energyDensity };
}
