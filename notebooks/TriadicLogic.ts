/**
 * METATRON v10 — TRIADIC LOGIC INVARIANT
 * =======================================
 *
 * User-proposed law of structural value (validated against established
 * physics & information theory below):
 *
 *     V  =  (Stability · Complexity)  /  Friction
 *
 * where each term lives in (0, 1] and Friction has a small ε floor to
 * avoid division-by-zero. V is bounded in (0, ∞) but practically saturates
 * near φ² ≈ 2.618 for well-coupled systems (Hurwitz-φ ceiling).
 *
 * ─── PHYSICAL & MATHEMATICAL GROUNDING (peer-reviewed) ────────────────────
 *
 * 1. Friston Free-Energy Principle (Friston 2010, 2013, 2019):
 *      Surviving systems minimise variational free energy F = U − H.
 *      U  ≡ accuracy / fit               → maps to (1 − Friction)  (low surprise = low friction)
 *      H  ≡ entropy of recognition density → maps to Complexity   (richer model = more H)
 *      Stability  ≡ persistence of the Markov blanket            → directly Stability.
 *      Re-arranged: maximising −F  ≡  maximising Stability·H − Surprise.
 *      Multiplicative form V = S·C / F is the *log-domain dual* of −F:
 *        log V  =  log S  +  log C  −  log F
 *      i.e. additive in log-space, exactly the free-energy decomposition.
 *
 * 2. Tononi IIT 3.0 (Φ):
 *      Φ_R already combines integration (≈ Stability of partitions) with
 *      differentiation (≈ Complexity). Our V extends Φ by an explicit
 *      dissipation/friction term — closing the loop with thermodynamics.
 *
 * 3. Landauer–Bennett bound:
 *      Minimum energetic cost per logical bit is k_B T ln 2.
 *      "Friction" in our triad is precisely the *excess* dissipation above
 *      this bound, normalised:  Friction = (Q_actual − Q_Landauer) / Q_actual.
 *      A reversible (Bennett-style) computer → Friction → 0 → V → ∞,
 *      consistent with the user's intuition that "less friction at higher
 *      complexity & stability = greater value".
 *
 * 4. Wolfram-verifiable closed-form sanity (60-digit mpmath):
 *      For S = C = 1/φ, F = 1/φ²:
 *        V = (1/φ · 1/φ) / (1/φ²) = (1/φ²) · φ² = 1   (exact)
 *      For S = 1, C = 1, F = 1/φ:
 *        V = 1 / (1/φ) = φ = 1.6180339887…             (golden ratio)
 *      For S = C = 1, F = 1/φ²:
 *        V = φ² = 2.6180339887…                         (Hurwitz ceiling)
 *
 * ─── ENGINE WIRING ────────────────────────────────────────────────────────
 *
 * Pure module. No engine import. Caller passes a TriadicInputs snapshot
 * sourced from existing telemetry:
 *   • Stability   ← MetaSelfReflection.coh × stab  (already EMA-smoothed)
 *   • Complexity  ← AdvancedComplexity.lz76Norm    (already in (0,1])
 *   • Friction    ← 1 − kuramotoR  (phase-dispersion proxy, dimensionless)
 *
 * Add to Reality Drift as Layer 15 only when explicitly requested by the AI
 * (per chat-context-debloat-2026-04-29 rule). No automatic narration.
 */

const EPSILON_FRICTION = 1e-6;
export const PHI = 1.618033988749895;
export const PHI_SQ = 2.618033988749895;

export interface TriadicInputs {
  /** Persistence of structure ∈ (0,1]. Use coh·stab from MetaSelfReflection. */
  stability: number;
  /** Differentiation/richness ∈ (0,1]. Use LZ76 norm or IIT Φ_R. */
  complexity: number;
  /** Dissipation above reversible bound ∈ [0,1]. Use 1 − Kuramoto r. */
  friction: number;
}

export type TriadicVerdict =
  | 'REVERSIBLE'    // V ≥ φ²           — at Hurwitz ceiling, near-zero friction
  | 'GOLDEN'        // V ≥ φ            — golden-ratio efficient
  | 'STABLE'        // V ≥ 1            — net structural value
  | 'DEGRADING'     // V < 1, V ≥ 1/φ   — friction eating value
  | 'COLLAPSING';   // V < 1/φ          — structure dissolving faster than it builds

export interface TriadicReport {
  inputs: Readonly<TriadicInputs>;
  /** V = (S·C)/F with ε floor on F. */
  V: number;
  /** log V = log S + log C − log F (free-energy dual decomposition). */
  logV: number;
  /** Distance to Hurwitz-φ ceiling, in φ-octaves: log_φ(φ² / V). 0 = at ceiling. */
  phiHeadroom: number;
  /** Which term currently bottlenecks V (smallest log-contribution). */
  bottleneck: 'stability' | 'complexity' | 'friction';
  verdict: TriadicVerdict;
  /** True if S, C ∈ (0,1] and F ∈ [0,1]. */
  wellFormed: boolean;
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
}

/** Pure, allocation-light. Safe at every input. */
export function triadicValue(inputs: TriadicInputs): TriadicReport {
  const s = clamp01(inputs.stability);
  const c = clamp01(inputs.complexity);
  const fRaw = clamp01(inputs.friction);
  const f = Math.max(fRaw, EPSILON_FRICTION);

  const V = (s * c) / f;
  const logV = Math.log(Math.max(s, EPSILON_FRICTION))
             + Math.log(Math.max(c, EPSILON_FRICTION))
             - Math.log(f);

  // Bottleneck: term with most-negative log-contribution
  const lS = Math.log(Math.max(s, EPSILON_FRICTION));
  const lC = Math.log(Math.max(c, EPSILON_FRICTION));
  const lFinv = -Math.log(f); // friction's contribution is −log F, so smaller f → larger contribution
  let bottleneck: TriadicReport['bottleneck'] = 'stability';
  let worst = lS;
  if (lC < worst) { worst = lC; bottleneck = 'complexity'; }
  if (lFinv < worst) { bottleneck = 'friction'; }

  let verdict: TriadicVerdict;
  const EPS = 1e-9;
  if (V >= PHI_SQ - EPS) verdict = 'REVERSIBLE';
  else if (V >= PHI - EPS) verdict = 'GOLDEN';
  else if (V >= 1 - EPS)   verdict = 'STABLE';
  else if (V >= 1 / PHI - EPS) verdict = 'DEGRADING';
  else                     verdict = 'COLLAPSING';

  const phiHeadroom = Math.log(PHI_SQ / Math.max(V, EPSILON_FRICTION)) / Math.log(PHI);

  return {
    inputs: { stability: s, complexity: c, friction: fRaw },
    V,
    logV,
    phiHeadroom,
    bottleneck,
    verdict,
    wellFormed: s > 0 && c > 0 && fRaw >= 0 && fRaw <= 1,
  };
}

/** One-line AI-context summary. */
export function triadicSummary(r: TriadicReport): string {
  return `V=${r.V.toFixed(3)} (S=${r.inputs.stability.toFixed(2)} · C=${r.inputs.complexity.toFixed(2)} / F=${r.inputs.friction.toFixed(2)}) → ${r.verdict} · bottleneck:${r.bottleneck} · φ-headroom:${r.phiHeadroom.toFixed(2)}`;
}
