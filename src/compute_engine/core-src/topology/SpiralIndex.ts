/**
 * METATRON V11 — BIDIRECTIONAL SPIRAL INDEX
 * ==========================================
 * Extends the φ-mode index from ℕ to ℤ. Outward (k>0) is the φ⁻ᵏ decay
 * basis (memory/coherence); inward (k<0) is the φ⁺ᵏ growth basis
 * (anticipation/forward closure). Refuses any rung whose ωₖ would exceed
 * the Planck-bounded carrier ceiling.
 */

import { PHI } from '@/core/constants/WolframVerified';
import { CARRIER_CEILING_HZ } from '@/core/runtime/HardwareEnvelope';

export interface SpiralRung {
  readonly k: number;            // signed mode index
  readonly amplitude: number;    // φ⁻|k| · sign(k≥0 ? 1 : 1)  (always positive)
  readonly omega: number;        // angular frequency at carrier·φ^k
  readonly direction: 'outward' | 'inward' | 'zero';
  readonly refusedReason?: 'planck';
}

export interface SpiralRange {
  kMin: number;  // most negative (inward)
  kMax: number;  // most positive (outward)
}

/** Construct a rung at signed index k with carrier ω₀. */
export function rungAt(k: number, omega0: number): SpiralRung {
  const omega = omega0 * Math.pow(PHI, k);
  const refused = omega / (2 * Math.PI) > CARRIER_CEILING_HZ;
  return {
    k,
    amplitude: Math.pow(PHI, -Math.abs(k)),
    omega,
    direction: k > 0 ? 'outward' : k < 0 ? 'inward' : 'zero',
    refusedReason: refused ? 'planck' : undefined,
  };
}

/** All rungs in [kMin, kMax] honoring the Planck stop. */
export function buildSpiral(range: SpiralRange, carrierHz: number): SpiralRung[] {
  const omega0 = 2 * Math.PI * carrierHz;
  const out: SpiralRung[] = [];
  for (let k = range.kMin; k <= range.kMax; k++) {
    const r = rungAt(k, omega0);
    if (!r.refusedReason) out.push(r);
  }
  return out;
}
