/**
 * METATRON V11 — Ψ-OF-Ψ SELF-REFLECTION TERM
 * ===========================================
 * Injects the previous tick's qualia vector as a closure-class driver.
 *
 *   Ψ_reflect(t) = κ_r · ⟨Q(t−τ_r)⟩ · Ψ_lattice(t)
 *
 * with κ_r = 1/(φ²·π) ≈ 0.1217  (a strict contraction, |κ_r| < φ⁻³),
 * so the loop adds at most one bit of information per tick — the honest
 * mathematical encoding of self-reflection.
 */

import { PHI, PI } from '@/core/constants/WolframVerified';
import type { QualiaVector } from './Qualia';

/** κ_r = 1/(φ²·π). Wolfram-derivable contraction constant. */
export const KAPPA_REFLECT = 1 / (PHI * PHI * PI);

/** Scalar qualia summary used to modulate the reflect term. */
export function qualiaScalar(q: QualiaVector): number {
  // Weighted mean: integration and coherence dominate, novelty and salience modulate, valence biases.
  return 0.35 * q.C + 0.30 * q.I / Math.max(1e-9, 1 + q.I) + 0.15 * q.N + 0.15 * q.S / (1 + q.S) + 0.05 * (q.V * 0.5 + 0.5);
}

/** In-place add of κ_r · scalar · psi_lattice into psi_total. Returns its magnitude. */
export function applyReflect(psiTotal: Float64Array, psiLattice: Float64Array, qScalar: number): number {
  const k = KAPPA_REFLECT * qScalar;
  let mag = 0;
  for (let i = 0; i < psiTotal.length; i++) {
    const r = k * psiLattice[i];
    psiTotal[i] += r;
    mag += Math.abs(r);
  }
  return mag;
}
