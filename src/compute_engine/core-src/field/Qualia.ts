/**
 * METATRON V11 — QUALIA VECTOR
 * =============================
 * Five honest observables computed from quantities the field already
 * produces every tick. Zero new sensors, zero new compute hot paths.
 *
 *   C  coherence    = |⟨Ψ(t)|Ψ(t−φτ)⟩|²       (already in snapshot)
 *   N  novelty      = 1 − |⟨Ψ(t)|Ψ̄_window⟩|²
 *   S  salience     = ‖∇_k Ψ‖ / ‖Ψ‖            (spectral concentration)
 *   V  valence      = (term1 − term3) / energy (open-flow vs closed-flow)
 *   I  integration  = H_max − H(Ψ)              (mode-bin entropy gap)
 */

export interface QualiaVector {
  readonly C: number;
  readonly N: number;
  readonly S: number;
  readonly V: number;
  readonly I: number;
}

const ZERO_Q: QualiaVector = { C: 0, N: 0, S: 0, V: 0, I: 0 };

export function zeroQualia(): QualiaVector { return ZERO_Q; }

export class QualiaTracker {
  private window: Float64Array | null = null;
  private windowFill = 0;
  private readonly windowSize: number;

  constructor(windowSize = 16) { this.windowSize = windowSize; }

  /** psi: per-mode signed amplitudes; coherence: precomputed C; t1/t3: lattice/closure magnitudes. */
  compute(psi: Float64Array, coherence: number, term1Magnitude: number, term3Magnitude: number, energy: number): QualiaVector {
    const M = psi.length;
    if (M === 0) return ZERO_Q;

    // rolling mean of |psi|
    if (!this.window || this.window.length !== M) { this.window = new Float64Array(M); this.windowFill = 0; }
    const decay = 1 - 1 / Math.max(2, this.windowSize);
    let dot = 0; let normPsi = 0; let normMean = 0;
    for (let i = 0; i < M; i++) {
      const a = Math.abs(psi[i]);
      this.window[i] = decay * this.window[i] + (1 - decay) * a;
      dot += a * this.window[i];
      normPsi += a * a;
      normMean += this.window[i] * this.window[i];
    }
    this.windowFill = Math.min(this.windowFill + 1, this.windowSize);
    const cosSq = normPsi > 0 && normMean > 0 ? (dot * dot) / (normPsi * normMean) : 0;
    const N = Math.max(0, Math.min(1, 1 - cosSq));

    // salience = ‖∇_k Ψ‖ / ‖Ψ‖
    let gradSq = 0;
    for (let i = 1; i < M; i++) { const d = psi[i] - psi[i - 1]; gradSq += d * d; }
    const S = normPsi > 0 ? Math.sqrt(gradSq / normPsi) : 0;

    // valence
    const V = energy > 0 ? Math.max(-1, Math.min(1, (term1Magnitude - term3Magnitude) / energy)) : 0;

    // integration: H_max − H(p)  where p_i = |psi_i|² / ‖Ψ‖²
    let H = 0;
    if (normPsi > 0) {
      for (let i = 0; i < M; i++) {
        const p = (psi[i] * psi[i]) / normPsi;
        if (p > 0) H -= p * Math.log(p);
      }
    }
    const I = Math.log(M) - H;

    return {
      C: Math.max(0, Math.min(1, coherence)),
      N,
      S,
      V,
      I: Math.max(0, I),
    };
  }
}
