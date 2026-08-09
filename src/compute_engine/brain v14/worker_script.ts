/**
 * RHUFT v13 — Worker Thread Script
 *
 * This file runs inside worker threads and executes pure computational tasks
 * for fractal node operations. It has NO side effects and NO shared mutable state.
 * All inputs come via messages; all outputs go back via messages.
 *
 * [SPEC] — Deterministic Float64 computation. No randomness. No I/O.
 */

import { parentPort } from "node:worker_threads";
import type { WorkerTask, WorkerResult, ComputeNodeResult, StabilizeNodeResult, DeepOntologyResult } from "./worker_pool.ts";
import { at } from "./core/indexing.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Constants (mirrored from constants.ts for worker independence)
// ═══════════════════════════════════════════════════════════════════════════════

const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;
const PHI_NEG2 = 1 / (PHI * PHI);
const PI = Math.PI;
const CLOSURE_COUPLING = 1 / (PHI * PI);
const MASTER_EQUATION_N = 13;
const COHERENCE_THRESHOLD = PHI_NEG2;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Message Handler
// ═══════════════════════════════════════════════════════════════════════════════

if (parentPort) {
  parentPort.on("message", async (task: WorkerTask) => {
    try {
      const data = await handleTask(task);
      const result: WorkerResult = {
        taskId: task.taskId,
        type: task.type,
        success: true,
        data,
      };
      parentPort!.postMessage(result);
    } catch (err) {
      const result: WorkerResult = {
        taskId: task.taskId,
        type: task.type,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
      parentPort!.postMessage(result);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Task Dispatcher
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle a worker task and return the computed result.
 * Exported so the main thread can use it as a fallback (sync execution).
 */
export async function handleTask(task: WorkerTask): Promise<ComputeNodeResult | StabilizeNodeResult | DeepOntologyResult> {
  switch (task.type) {
    case "compute_node":
      return handleComputeNode(task.payload);
    case "stabilize_node":
      return handleStabilizeNode(task.payload);
    case "deep_ontology":
      return handleDeepOntology(task.payload);
    default:
      throw new Error(`Unknown task type: ${(task as WorkerTask).type}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Compute Node Handler
// ═══════════════════════════════════════════════════════════════════════════════

function handleComputeNode(payload: WorkerTask["payload"] & { readonly childFieldStates?: Float64Array[] }): ComputeNodeResult {
  const p = payload as {
    readonly scale: number;
    readonly fieldState: Float64Array;
    readonly previousField: Float64Array | null;
    readonly membraneBoundary: Float64Array;
    readonly curvatureCoupling: number;
    readonly surfaceArea: number;
    readonly childFieldStates: Float64Array[];
    readonly frameworkCount: number;
    readonly memoryCount: number;
    readonly options?: { readonly include_surface_term?: boolean; readonly include_memory_term?: boolean; readonly max_k?: number };
  };

  const N = p.options?.max_k ?? MASTER_EQUATION_N;
  const fieldSize = 2 * (N + 1);
  const scale = p.scale;

  // ── Term 1: Summation Σ(k=0 to N) φ^(-k) · e^(i·θ_k) ───────────────────
  const summationField = new Float64Array(fieldSize);
  for (let k = 0; k <= N; k++) {
    const amplitudeWeight = Math.pow(PHI_INV, k);
    const phaseAngle = computePhaseAngle(k, scale);
    const re = Math.cos(phaseAngle);
    const im = Math.sin(phaseAngle);

    const idx = 2 * k;
    if (idx < fieldSize) {
      summationField[idx] = amplitudeWeight * re;
      summationField[idx + 1] = amplitudeWeight * im;
    }
  }

  // ── Term 2: Recursive memory λ · Ψ_previous ────────────────────────────
  const memoryField = new Float64Array(fieldSize);
  if (p.options?.include_memory_term !== false && p.previousField !== null) {
    const prev = p.previousField;
    for (let i = 0; i < fieldSize; i++) {
      memoryField[i] = PHI_NEG2 * (prev[i] ?? 0);
    }
  }

  // ── Term 3: Surface closure κ · (∮∇Ψ·dS) / A ───────────────────────────
  const surfaceField = new Float64Array(fieldSize);
  if (p.options?.include_surface_term !== false && p.surfaceArea > 0) {
    const boundary = p.membraneBoundary;
    const cc = p.curvatureCoupling;
    const factor = CLOSURE_COUPLING * cc;
    const field = p.fieldState;

    for (let i = 0; i < fieldSize; i++) {
      const bVal = boundary[i % boundary.length] ?? 0;
      const diff = bVal - at(field, i);
      surfaceField[i] = factor * diff;
    }
  }

  // ── Total field: sum all three terms ───────────────────────────────────
  const totalField = new Float64Array(fieldSize);
  for (let i = 0; i < fieldSize; i++) {
    totalField[i] = at(summationField, i) + at(memoryField, i) + at(surfaceField, i);
  }

  // ── Child Field Feedback ───────────────────────────────────────────────
  if (p.childFieldStates.length > 0) {
    const childWeight = (1.0 / PHI) / (p.childFieldStates.length + 1e-300);
    for (const childField of p.childFieldStates) {
      for (let i = 0; i < fieldSize; i++) {
        totalField[i] += at(childField, i) * childWeight;
      }
    }
  }

  // ── Compute coherence C(n) = |<Ψ(n)|Ψ(n-1)>|² ──────────────────────────
  let coherence: number;
  if (p.previousField !== null) {
    coherence = computeGeometricOverlap(totalField, p.previousField);
  } else {
    coherence = 1.0;
  }

  // ── Compute energy density ─────────────────────────────────────────────
  let energySum = 0;
  for (let i = 0; i < fieldSize; i += 2) {
    const re = totalField[i];
    const im = totalField[i + 1];
    energySum += re * re + im * im;
  }
  const energyDensity = energySum / (N + 1);

  return {
    fieldState: totalField,
    coherence,
    energyDensity,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Stabilize Node Handler
// ═══════════════════════════════════════════════════════════════════════════════

function handleStabilizeNode(payload: WorkerTask["payload"]): StabilizeNodeResult {
  const p = payload as {
    readonly fieldState: Float64Array;
    readonly membraneBoundary: Float64Array;
    readonly curvatureCoupling: number;
    readonly tolerance: number;
    readonly maxIterations: number;
    readonly previousField: Float64Array | null;
  };

  const field = new Float64Array(p.fieldState); // copy
  const boundary = p.membraneBoundary;
  const cc = p.curvatureCoupling;
  const fieldLen = field.length;
  const tolerance = p.tolerance;
  const maxIter = p.maxIterations;

  let iteration = 0;
  let maxDelta = Infinity;

  while (maxDelta > tolerance && iteration < maxIter) {
    maxDelta = 0;
    for (let i = 0; i < fieldLen; i++) {
      const bVal = boundary[i % boundary.length] ?? 0;
      const correction = cc * (bVal - at(field, i));
      const newVal = at(field, i) + correction;
      const delta = Math.abs(newVal - at(field, i));
      if (delta > maxDelta) {
        maxDelta = delta;
      }
      field[i] = newVal;
    }
    iteration++;
  }

  // Recompute coherence
  let newCoherence = 1.0;
  if (p.previousField !== null) {
    newCoherence = computeGeometricOverlap(field, p.previousField);
  }

  // Recompute energy density
  let energySum = 0;
  for (let i = 0; i < fieldLen; i += 2) {
    const re = field[i];
    const im = field[i + 1] ?? 0;
    energySum += re * re + im * im;
  }
  const N = (fieldLen / 2) - 1;
  const newEnergyDensity = energySum / (N + 1);

  return {
    fieldState: field,
    coherence: newCoherence,
    energyDensity: newEnergyDensity,
    iterations: iteration,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Deep Ontology Handler (simplified — returns placeholder data)
// ═══════════════════════════════════════════════════════════════════════════════

function handleDeepOntology(payload: WorkerTask["payload"]): DeepOntologyResult {
  const p = payload as {
    readonly fieldState: Float64Array;
    readonly coherence: number;
    readonly energyDensity: number;
    readonly scale: number;
    readonly childCoherences: number[];
    readonly childEnergyDensities: number[];
    readonly childScales: number[];
    readonly previousField: Float64Array | null;
    readonly membraneBoundary: Float64Array;
    readonly nodeId: string;
  };

  const coherence = p.coherence;

  // Simplified deep ontology results — deterministic placeholders
  // In a full implementation, these would run the actual ontology modules
  return {
    perfectionDeficit: {
      convergenceScore: coherence * PHI_INV,
      cornerDefect: 1 - coherence,
      epsilon: 0.01,
    },
    dimensionalStability: {
      stabilityScore: coherence,
      isStable: coherence > COHERENCE_THRESHOLD,
    },
    multiscaleClosure: {
      globalClosure: coherence * PHI_NEG2,
      temporalPersistence: coherence * PHI_INV,
      driftRate: 0,
      leakRate: 0,
    },
    continuityState: p.previousField !== null ? {
      isContinuous: coherence > 0.5,
      continuityScore: coherence,
    } : null,
    effectiveComplexity: {
      complexity: p.childCoherences.length * PHI_INV,
      isStable: coherence > COHERENCE_THRESHOLD,
    },
    spherePrinciple: {
      samplingIncompleteness: 1 - coherence,
      finiteResolutionDefect: 0.01,
    },
    burdenResult: {
      totalBurden: p.childCoherences.length * PHI_NEG2,
      isManageable: coherence > COHERENCE_THRESHOLD,
    },
    recursiveMeasurement: {
      measurementError: 1 - coherence,
      isConsistent: coherence > 0.5,
    },
    geometricReflection: {
      reflectionGain: coherence * PHI_INV,
      isReflected: coherence > COHERENCE_THRESHOLD,
    },
    multiscaleStabilization: {
      stabilizedScales: p.childScales.length,
      globalStability: coherence,
    },
    interferenceAnalysis: {
      modeCount: 7,
      dominantFrequency: p.scale * PHI,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Helper Functions (mirrored from fractal_node.ts)
// ═══════════════════════════════════════════════════════════════════════════════

function computePhaseAngle(k: number, n: number): number {
  const base = (2 * PI * k * PHI_INV * n) / 89;
  const normalized = base % (2 * PI);
  return normalized >= 0 ? normalized : normalized + 2 * PI;
}

function computeGeometricOverlap(fieldA: Float64Array, fieldB: Float64Array): number {
  const len = Math.min(fieldA.length, fieldB.length);
  if (len === 0) return 0;

  let dotReal = 0;
  let dotImag = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i += 2) {
    const aR = fieldA[i] ?? 0;
    const aI = fieldA[i + 1] ?? 0;
    const bR = fieldB[i] ?? 0;
    const bI = fieldB[i + 1] ?? 0;

    dotReal += aR * bR + aI * bI;
    dotImag += aR * bI - aI * bR;

    normA += aR * aR + aI * aI;
    normB += bR * bR + bI * bI;
  }

  const normProduct = Math.sqrt(normA * normB);
  if (normProduct === 0) return 0;

  const overlap = Math.sqrt(dotReal * dotReal + dotImag * dotImag) / normProduct;
  return overlap * overlap;
}
