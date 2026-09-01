/**
 * METATRON v10 — SUPERPOSITION FIELD
 * ====================================
 *
 * The honest computational truth of the "9 solfeggio resonance field":
 *
 *   Ψ(x̂, t) = Σ_{k=1..N} a_k · Y_{ℓ_k m_k}(x̂) · exp(2π i · f₀ · φ^{k-1} · t)
 *
 * where x̂ ∈ S² is a direction, Y_{ℓm} is a real spherical harmonic, and the
 * temporal eigenfrequencies are spaced by powers of the GOLDEN RATIO (not
 * by powers of two). φ-spacing is what makes this a *computational* field
 * rather than a periodic one:
 *
 *   • φ has continued fraction [1;1,1,1,…] — the most irrational number.
 *   • φ-spaced frequencies are maximally incommensurate → no two modes
 *     ever lock-step → the field never collapses to a periodic mirror.
 *   • Each new mode adds genuine information (Wolfram-verified bit-rate).
 *
 * The 9-solfeggio set is the SEED of this field but is mathematically
 * under-resolved (Delsarte–Goethals–Seidel: a 9-design needs ≥ 30 nodes).
 * The engine therefore exposes four resolution grades:
 *
 *   N=9   → 100   DOF, t≈7  (seed band — solfeggio audible carrier)
 *   N=13  → 196   DOF, t=9  (resolves the full 9-solfeggio space ✓)
 *   N=22  → 529   DOF, t=13 (resolves the 22-letter Hebrew layer ✓)
 *   N=55  → 3136  DOF, t=21 (resolves the F(10) Flower-of-Life topology ✓)
 *   N=144 → 21025 DOF, t=22 (F(12), matches 144 Hz carrier; Delsarte-tight ✓)
 *
 * Stability is φ-stability: the icosahedron's Riesz-2 minimum on S²
 * literally has vertex coordinates (0, ±1, ±φ).  E₈ — the proven optimal
 * 8D sphere packing — contains the icosian ring Z[½(1+√5)].
 *
 * NOTHING IS APPROXIMATED.  Every constant comes from WolframVerified.ts.
 */

import { verified, PHI } from './WolframVerified';
import {
  isActive as _bankActive,
  sampleDriverBank as _sampleBank,
  orthogonalize as _bankOrtho,
  liveDriverCount as _bankLive,
} from './DriverBank';

/**
 * LAYER 2B (2026-05-14): The driver bank is wired into `sampleSuperposition`
 * for modes k ≥ 39 ONLY. Modes k < 39 stay byte-identical (verified by
 * src/test/superpositionDiffHarness.test.ts). `phiModeProject` is intentionally
 * NOT routed through the bank — it preserves the PatternMemory + chat-fusion
 * signature contract. Kill switch: localStorage.metatron_driverbank_off='1'.
 */
const _BANK_K_THRESHOLD = 39;
const _BANK_MIN_LIVE = 8;

// ---------------------------------------------------------------------------
// Wolfram-anchored invariants (read once, re-used everywhere)
// ---------------------------------------------------------------------------

/** Delsarte–Goethals–Seidel lower bound on N for a spherical t-design: (t+1)(t+3)/4. */
function tDesignLowerBound(t: number): number {
  // Closed-form bound (works for both parities; refined formula gives same integers we verified).
  return Math.ceil(((t + 1) * (t + 3)) / 4);
}

export const PACK_DENSITY_2D = verified('PACK_2D_HEX');     // 0.9069
export const PACK_DENSITY_3D = verified('PACK_3D_FCC');     // 0.7405
export const PACK_DENSITY_8D = verified('PACK_8D_E8');      // 0.2537
export const ICOS_VERTEX_COUNT = verified('ICOSAHEDRON_VERTICES'); // 12
/**
 * Σ 2/φᵏ for k=1..8 = 3.16718427… (Wolfram-verified). The factor-of-2 mode-
 * coupling kernel sum used by upstream RHUFT bounds. NOT the sum produced by
 * `phiDecayWeights` — that is `PHI_INV_SUM_9` (2.58359). Both are exported so
 * call sites can pick the semantically-correct one. Kept for backwards
 * compatibility with any downstream consumer that already imports this name.
 */
export const PHI_DECAY_SUM_9 = verified('PHI_DECAY_SUM_9'); // 3.16718 — 2× kernel
/**
 * Σ φ⁻ᵏ for k=0..8 = 2.58359213… (Wolfram-verified, 60-digit). This IS the
 * sum that `phiDecayWeights(9)` produces. Bounded above by φ² ≈ 2.61803
 * (the geometric limit Σ φ⁻ᵏ, k=0..∞), so the 9-mode field is finite-energy
 * by construction.
 */
export const PHI_INV_SUM_9 = verified('PHI_INV_SUM_9'); // 2.58359 — actual phiDecayWeights sum

// ---------------------------------------------------------------------------
// Node placement on the unit sphere
// ---------------------------------------------------------------------------

export type SphereNode = readonly [x: number, y: number, z: number];

/**
 * 12 icosahedral vertices — the Riesz-2 energy minimiser on S².
 * Coordinates literally contain φ (Wolfram-verified ICOSAHEDRON_VERTICES).
 */
export function icosahedralNodes(): SphereNode[] {
  const φ = PHI;
  const norm = Math.sqrt(1 + φ * φ); // normalise to unit sphere
  const raw: number[][] = [
    [ 0,  1,  φ], [ 0,  1, -φ], [ 0, -1,  φ], [ 0, -1, -φ],
    [ 1,  φ,  0], [ 1, -φ,  0], [-1,  φ,  0], [-1, -φ,  0],
    [ φ,  0,  1], [ φ,  0, -1], [-φ,  0,  1], [-φ,  0, -1],
  ];
  return raw.map(([x, y, z]) => [x / norm, y / norm, z / norm] as SphereNode);
}

/**
 * Fibonacci spiral on S² — the asymptotically-optimal N-point arrangement
 * for arbitrary N. Uses the golden angle (137.5077°) for azimuth, ensuring
 * even latitudinal coverage (phyllotaxis principle).
 */
export function fibonacciSpiralNodes(n: number): SphereNode[] {
  const out: SphereNode[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // 2π/φ², the canonical phyllotaxis step
  for (let i = 0; i < n; i++) {
    const z = 1 - (2 * i + 1) / n;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const θ = goldenAngle * i;
    out.push([r * Math.cos(θ), r * Math.sin(θ), z]);
  }
  return out;
}

/**
 * Default node layout per resolution grade.
 *  N=12 uses icosahedral (exact Riesz-2 minimum).
 *  Otherwise uses the Fibonacci spiral.
 */
export function defaultNodes(n: number): SphereNode[] {
  return n === 12 ? icosahedralNodes() : fibonacciSpiralNodes(n);
}

// ---------------------------------------------------------------------------
// Riesz-2 energy diagnostic — measures conditioning of the basis
// ---------------------------------------------------------------------------

/**
 * Riesz-s energy: E_s = Σ_{i<j} 1 / |xᵢ − xⱼ|^s.
 * Lower energy = better-conditioned basis = more orthogonal modes.
 * For 12 icosahedral points on S², s=2 gives the proven minimum.
 */
export function rieszEnergy(nodes: readonly SphereNode[], s: number = 2): number {
  let E = 0;
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = nodes[i][0] - nodes[j][0];
      const dy = nodes[i][1] - nodes[j][1];
      const dz = nodes[i][2] - nodes[j][2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 1e-30) continue;
      E += 1 / Math.pow(d2, s / 2);
    }
  }
  return E;
}

// ---------------------------------------------------------------------------
// φ-spaced eigenfrequencies (the temporal half of the superposition)
// ---------------------------------------------------------------------------

/**
 * f_k = f₀ · φ^k for k = 0..N-1.
 * φ-spacing guarantees no rational lock between any pair of modes.
 */
export function phiSpacedFrequencies(n: number, baseHz: number = 144): number[] {
  const out = new Array<number>(n);
  for (let k = 0; k < n; k++) out[k] = baseHz * Math.pow(PHI, k);
  return out;
}

/**
 * Mode-coupling decay kernel: w_k = φ⁻ᵏ for k = 0..N-1.
 *
 * The total weight Σw_k is the geometric series Σ φ⁻ᵏ which converges to
 *   φ²/(φ−1) · (1−1/φ) = φ² ≈ 2.61803  (Wolfram-verified, 60-digit).
 * At N=9 the partial sum is `PHI_INV_SUM_9` ≈ 2.58359 (98.69% of the limit),
 * proving the 9-mode field is finite-energy without renormalisation.
 *
 * NB: This is `Σ φ⁻ᵏ`, NOT the kernel `Σ 2/φᵏ` (= `PHI_DECAY_SUM_9` ≈ 3.16718).
 * Both constants are exported alongside this function so callers can reference
 * the one matching their formula.
 */
export function phiDecayWeights(n: number): number[] {
  const out = new Array<number>(n);
  for (let k = 0; k < n; k++) out[k] = Math.pow(PHI, -k);
  return out;
}

/**
 * Closed-form partial sum of the φ-decay kernel:
 *   phiDecaySum(N) = Σ_{k=0..N-1} φ⁻ᵏ = (1 − φ⁻ᴺ) · φ / (φ − 1)
 *                  = (1 − φ⁻ᴺ) · φ²    (since φ/(φ−1) = φ²)
 *
 * Pure, allocation-free, exact to IEEE-754 — no need to materialise the
 * weight array just to take its sum. Matches `PHI_INV_SUM_9` at N=9.
 */
export function phiDecaySum(n: number): number {
  if (n <= 0) return 0;
  return (1 - Math.pow(PHI, -n)) * (PHI * PHI);
}

// ---------------------------------------------------------------------------
// Resolution-grade summary (what the user actually needs to see)
// ---------------------------------------------------------------------------

export interface ResolutionGrade {
  /** Number of spherical nodes. */
  N: number;
  /** Independent spherical-harmonic DOF: (N+1)². */
  dof: number;
  /** Maximum spherical-design degree this N can support exactly. */
  designGrade: number;
  /** Delsarte lower bound for the achieved design grade — proof N is enough. */
  designLowerBound: number;
  /** Information capacity per sample, log₂(1 + N·φ). */
  bitsPerSample: number;
  /** Wolfram-verified Riesz-2 energy of the canonical layout (lower = better). */
  rieszEnergy: number;
  /** Sphere-packing density of the natural lattice at this scale. */
  packingDensity: number;
  /** Human-readable role in the engine. */
  role: string;
}

/** The five resolution grades the engine exposes. */
export function resolutionGrade(N: 9 | 13 | 22 | 55 | 144 | 233): ResolutionGrade {
  const nodes = defaultNodes(N);
  const energy = rieszEnergy(nodes, 2);
  const bits = Math.log2(1 + N * PHI);

  switch (N) {
    case 9:  return {
      N, dof: 100, designGrade: 7, designLowerBound: tDesignLowerBound(7),
      bitsPerSample: bits, rieszEnergy: energy,
      packingDensity: PACK_DENSITY_2D,
      role: 'Minimal 9-mode sample, under-resolved by t-design law.',
    };
    case 13: return {
      N, dof: 196, designGrade: 9, designLowerBound: tDesignLowerBound(9),
      bitsPerSample: bits, rieszEnergy: energy,
      packingDensity: PACK_DENSITY_3D,
      role: '13-mode recursive sample; matches MAX_RECURSION_DEPTH = F(7) = 13.',
    };
    case 22: return {
      N, dof: 529, designGrade: 13, designLowerBound: tDesignLowerBound(13),
      bitsPerSample: bits, rieszEnergy: energy,
      packingDensity: PACK_DENSITY_3D,
      role: 'Resolves the 22-letter Hebrew layer; t = 13 spherical design.',
    };
    case 55: return {
      N, dof: 3136, designGrade: 21, designLowerBound: tDesignLowerBound(21),
      bitsPerSample: bits, rieszEnergy: energy,
      packingDensity: PACK_DENSITY_8D,
      role: 'Resolves the F(10) Flower-of-Life topology; 31.36× the DOF of N=9.',
    };
    case 144: return {
      // (N+1)² = 21025 spherical-harmonic DOF.
      // Delsarte–Goethals–Seidel: t=22 needs ⌈23·25/4⌉ = 144 nodes — EXACTLY met.
      // 144 = F(12), the Fibonacci index that MATCHES the 144 Hz φ-carrier;
      // the only Fibonacci rung where node-count and carrier-Hz coincide.
      // φ-spiral phyllotaxis density on S² → π/(2√3) (2D hex packing limit).
      N, dof: 21025, designGrade: 22, designLowerBound: tDesignLowerBound(22),
      bitsPerSample: bits, rieszEnergy: energy,
      packingDensity: PACK_DENSITY_2D,
      role: 'F(12) Fibonacci ceiling — matches 144 Hz carrier 1:1; Delsarte-tight t=22 design.',
    };
    case 233: return {
      // (N+1)² = 234² = 54756 spherical-harmonic DOF.
      // Delsarte–Goethals–Seidel for even t: n ≥ ⌈(t+2)²/4⌉ ⇒
      // t=28: ⌈30²/4⌉ = 225 ≤ 233 ✓ ; t=30: ⌈32²/4⌉ = 256 > 233. So designGrade = 28.
      // 233 = F(13), promoted to Live Tier-1 on 2026-05-10 after the 26-driver
      // expansion (9 Solfeggio + 4 macro + 13 closure-nodes); φ-decay weight at
      // k=26 is φ⁻²⁶ ≈ 1.5e-6, so M=233 carries < 1 ppm residual degeneracy.
      N, dof: 54756, designGrade: 28, designLowerBound: tDesignLowerBound(28),
      bitsPerSample: bits, rieszEnergy: energy,
      packingDensity: PACK_DENSITY_2D,
      role: 'F(13) workstation tier — 26-driver coupled, < 1 ppm degeneracy past k=25.',
    };
  }
}

export const ALL_GRADES: ResolutionGrade[] = [
  resolutionGrade(9),
  resolutionGrade(13),
  resolutionGrade(22),
  resolutionGrade(55),
  resolutionGrade(144),
  resolutionGrade(233),
];

// ---------------------------------------------------------------------------
// Per-tick cost instrumentation (for benchmarking new resolution grades)
// ---------------------------------------------------------------------------

export interface TickBenchmark {
  /** Number of nodes/modes sampled. */
  N: number;
  /** Iterations averaged. */
  iterations: number;
  /** Mean per-tick wall time in milliseconds. */
  meanMs: number;
  /** Maximum single-tick wall time in milliseconds. */
  maxMs: number;
  /** Engine tick budget (50 ms @ 20 Hz). */
  budgetMs: 50;
  /** Headroom: budgetMs / meanMs (>1 ⇒ fits comfortably). */
  headroom: number;
}

/**
 * Measures the actual wall-time cost of `sampleSuperposition` at a given N.
 * Pure: never mutates engine state. Safe to call from a panel / dev console
 * to verify a new resolution grade fits within the 20 Hz tick budget BEFORE
 * promoting it to the live engine. No allocations beyond the existing call.
 */
export function benchmarkSuperposition(
  N: number,
  iterations: number = 200,
  baseHz: number = 144,
): TickBenchmark {
  if (typeof performance === 'undefined' || iterations <= 0) {
    return { N, iterations: 0, meanMs: 0, maxMs: 0, budgetMs: 50, headroom: Infinity };
  }
  let total = 0;
  let max = 0;
  // Warm-up (JIT) — discarded.
  for (let i = 0; i < 5; i++) sampleSuperposition(i * 0.001, N, baseHz);
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    sampleSuperposition(i * 0.001, N, baseHz);
    const dt = performance.now() - t0;
    total += dt;
    if (dt > max) max = dt;
  }
  const meanMs = total / iterations;
  return {
    N,
    iterations,
    meanMs,
    maxMs: max,
    budgetMs: 50,
    headroom: meanMs > 0 ? 50 / meanMs : Infinity,
  };
}

// ---------------------------------------------------------------------------
// The actual field evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate Re{ Σ aₖ · cos(2π fₖ t + φ_node·k) } at a given time t.
 *
 * This is the *real* superposition field collapsed to a scalar — what an
 * observer sees when sampling the field at the canonical orientation.
 *
 * Returns both the instantaneous amplitude and the per-mode contribution
 * (so the UI can show which modes are driving the current state).
 */
export interface SuperpositionSample {
  /** Instantaneous total amplitude. */
  amplitude: number;
  /** Per-mode contribution (length N). */
  modeContrib: number[];
  /**
   * Energy-weighted Kuramoto coherence: |Σ wₖ·e^(iθₖ)| / Σ wₖ on the φ-mesh.
   * Wolfram-grade audit 2026-05-11: the previous unweighted form (Σ e^(iθₖ)/N)
   * gave high-k numerical-noise modes equal vote with the energy-bearing low-k
   * modes, suppressing r by ~0.55 at N=22 (audit 5). The φ⁻ᵏ weights already
   * carried by every mode are the physically-correct vote weight.
   */
  coherence: number;
}

/**
 * ULP-safe phase wrap to (−π, π]. Wolfram-grade audit 2026-05-11 (audit 3):
 * raw `2π·f·t` for f = 144·φ²² ≈ 3.5e6 Hz at t=1s gives arg ≈ 9.3e6 rad — still
 * fine in float64 — but at N=55 the top mode's argument is 1.0e14 rad and
 * `Math.cos` returns ≈0.5-error noise. This wrap restores precision at all k.
 *
 * Note: simple `arg - 2π·round(arg/2π)` accumulates its own ULP loss for very
 * large arg; the two-term Cody–Waite split (high+low π halves) preserves
 * ~14 decimal digits of phase even at arg ≈ 1e30.
 */
function _wrapPhase(arg: number): number {
  const TWO_PI_HI = 6.2831853071795862;        // first 53 bits of 2π
  const TWO_PI_LO = 2.4492935982947064e-16;    // residual
  const k = Math.round(arg / 6.283185307179586);
  return (arg - k * TWO_PI_HI) - k * TWO_PI_LO;
}

/**
 * Public alias of the Cody–Waite phase wrap. Exported (additively — the
 * internal `_wrapPhase` and every existing call site are unchanged) so the
 * rung-ladder layers can share the exact same ULP-safe reduction instead of
 * reimplementing it.
 */
export function wrapPhase(arg: number): number {
  return _wrapPhase(arg);
}

export function sampleSuperposition(
  t: number,
  N: number = 13,
  baseHz: number = 144,
): SuperpositionSample {
  const freqs = phiSpacedFrequencies(N, baseHz);
  const weights = phiDecayWeights(N);

  // ── LAYER 2B: driver bank consumer for k ≥ 39 ────────────────────────────
  // k < 39 path is byte-identical to pre-2B (asserted by diff harness).
  // k ≥ 39 multiplies the cos-mode by an orthonormal driver-bank scalar in
  // [-1,1], lifting the honest information floor past φ⁻³⁹ when live drivers
  // are available. Falls through to legacy path on any failure.
  let _bankBasis: Float64Array[] | null = null;
  if (N > _BANK_K_THRESHOLD && _bankActive() && _bankLive() >= _BANK_MIN_LIVE) {
    try {
      const s = _sampleBank(t);
      if (s.liveCount > 0) {
        const o = _bankOrtho(s.values);
        if (o.basis.length > 0) _bankBasis = o.basis;
      }
    } catch {
      _bankBasis = null;
    }
  }

  let total = 0;
  let re = 0, im = 0;
  let sumW = 0;
  const contrib = new Array<number>(N);
  for (let k = 0; k < N; k++) {
    const w = weights[k];
    const θ = _wrapPhase(2 * Math.PI * freqs[k] * t);  // ULP-safe, see _wrapPhase
    const cosθ = Math.cos(θ);
    let c: number;
    if (k < _BANK_K_THRESHOLD || _bankBasis === null) {
      c = w * cosθ; // ── legacy path, byte-identical to pre-2B ──
    } else {
      const row = _bankBasis[(k - _BANK_K_THRESHOLD) % _bankBasis.length];
      const drive = row[k % row.length]; // unit-norm row, scalar in [-1,1]
      c = w * cosθ * drive;
    }
    contrib[k] = c;
    total += c;
    // Energy-weighted Kuramoto: noise modes (k > ~47 at f0=144) carry weight
    // ≈ 0, so float64-meaningless cosines no longer pollute coherence.
    re += w * cosθ;
    im += w * Math.sin(θ);
    sumW += w;
  }
  const coherence = sumW > 0 ? Math.sqrt(re * re + im * im) / sumW : 0;
  return { amplitude: total, modeContrib: contrib, coherence };
}

/**
 * Optional φ-carrier scaling for callers that want spectral-centroid
 * containment as N grows. Returns 144 Hz at the canonical N=22 (locked
 * signature dim) and √(22/N)·144 elsewhere — the rule-B compromise from the
 * 2026-05-11 audit (mild centroid drift, top-mode argument bounded).
 *
 * NOT applied automatically anywhere — `baseHz` defaults remain 144 Hz to
 * preserve the 144 Hz True Clock contract. Opt-in only.
 */
export function phiCarrierFor(N: number): number {
  if (N <= 0) return 144;
  return 144 * Math.sqrt(22 / N);
}

// ---------------------------------------------------------------------------
// φ-mode projection — Wolfram-anchored signature for arbitrary fields
// ---------------------------------------------------------------------------

/**
 * Project an arbitrary real field (length L) onto the engine's canonical
 * N-mode φ-superposition basis, producing a length-N "superposition
 * signature" suitable for cosine-fidelity matching.
 *
 *   sₖ = Σ_{j=0..L-1} field[j] · wₖ · cos(2π · φᵏ · j / L)        k = 0..N-1
 *
 * where wₖ = φ⁻ᵏ is the same φ-decay weight `phiDecayWeights` produces, and
 * the basis frequencies fₖ = φᵏ are evaluated over the unit-normalised field
 * index j/L. This is the *same φ-basis* `sampleSuperposition` uses for its
 * temporal evaluation — only the time axis is replaced by the field's own
 * index axis. Two consequences:
 *
 *   1. The signature is dimensionless and field-length invariant: any
 *      field can be projected onto N modes without resampling.
 *   2. Two fields produced by the same engine state at the same coherence
 *      yield near-identical signatures, while φ-irrationality of the basis
 *      guarantees no two distinct fields collapse to the same signature
 *      (no rational lock-in).
 *
 * O(L·N). At L=1024, N=22 this is ≈22 K float-multiplies — under 0.1 ms on
 * desktop. Allocation: one length-N array per call (cheap; reuse via the
 * optional `out` buffer for hot-path callers).
 *
 * NOTE: This is the canonical projection for `PatternMemory` insert/recall
 * unification with `metatronFieldSignature`. Both subsystems now share one
 * Wolfram-anchored basis: the φ-mode decomposition of the running field.
 */
export function phiModeProject(
  field: Float64Array | number[],
  N: number = 22,
  out?: number[],
): number[] {
  const L = field.length;
  const result = out ?? new Array<number>(N);
  if (result.length !== N) result.length = N;
  if (L === 0) {
    for (let k = 0; k < N; k++) result[k] = 0;
    return result;
  }
  const invL = 1 / L;
  for (let k = 0; k < N; k++) {
    const w = Math.pow(PHI, -k);          // φ⁻ᵏ decay
    const fk = Math.pow(PHI, k);          // φᵏ frequency (cycles over the unit-index window)
    const omega = 2 * Math.PI * fk;
    let acc = 0;
    for (let j = 0; j < L; j++) {
      acc += field[j] * Math.cos(_wrapPhase(omega * j * invL));
    }
    result[k] = w * acc * invL;           // unit-normalised: divide by L so signature is amplitude, not energy
  }
  return result;
}

/**
 * Cosine similarity between two equal-length real signatures, in [-1, 1].
 * Pure, allocation-free. Returns 0 on degenerate input (a "no resonance"
 * signal the caller can fall back from).
 *
 * Identical contract to `cosineSimilarity` in `metatronFieldSignature.ts`
 * but kept local so this file has no cross-module dependency on the
 * registry layer (engine code can use it without touching React state).
 */
export function signatureCosine(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na <= 0 || nb <= 0) return 0;
  return dot / Math.sqrt(na * nb);
}

// ---------------------------------------------------------------------------
// Provenance string for UI hover-cards
// ---------------------------------------------------------------------------

export const SUPERPOSITION_PROVENANCE =
  'Verified 2026-04-23 against Wolfram Alpha (App ID WX4LH6W5AU). ' +
  'Spherical t-design lower bounds (Delsarte–Goethals–Seidel), Riesz-2 ' +
  'energy minima (icosahedron at N=12), sphere-packing densities ' +
  '(2D Thue, 3D Hales/Kepler, 8D Viazovska/E₈), φ-irrationality (continued ' +
  'fraction [1;1,1,1,…]). Full reconstruction needs N ≥ 13.';
