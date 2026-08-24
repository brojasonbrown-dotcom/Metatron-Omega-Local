/**
 * FILE 7 — geometry/lattice.ts
 *
 * The 13-harmonic Metatron lattice — the spectral skeleton of every stable
 * scale. On each Lucas-stable rung the standing field is a superposition of 13
 * harmonics whose wavenumber indices are the Lucas spectral lines
 * (1,2,3,4,7,11,18,29,47,76,123,199,322 — File 3) and whose amplitudes decay as
 * φ⁻ᵏ. This is the Tier-1 object in the CORE_VISION ontology: the field that
 * "wants to close" — its spectrum is how a scale *speaks*.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RESEARCH GROUNDING (provenance per claim, per the no-mistakes firewall):
 *
 *   Telescoping weights        Σ_{k=0}^{∞} φ⁻ᵏ diverges (ratio 1/φ < 1? NO —
 *                              φ⁻¹ < 1 so it converges to φ²/( ... )), but the
 *                              canonical pair identity is φ⁻¹ + φ⁻² = 1 exactly.
 *                              The 13-term partial sum Σ_{k=0}^{12} φ⁻ᵏ is a
 *                              finite geometric series, computed EXACTLY here.
 *                              [EXACT] — geometric series; φ⁻¹+φ⁻²=1 to 1e-12.
 *
 *   Lucas spectral lines       The 13 wavenumber indices are Lucas-sequence
 *                              driven (File 3, EXACT integers). Reading them as
 *                              a *physical* spectrum is the framework's
 *                              conjecture. [POSTULATE].
 *
 *   Metatron lattice as field  The 13-harmonic superposition Σ φ⁻ᵏ e^{iθ_k} is
 *                              a band-limited toroidal mode — exactly the kind
 *                              of field that closes to machine-eps on the torus
 *                              (File 6). [EXACT math / POSTULATE physics].
 *
 * Dependency direction (strictly downward, spec §4):
 *   lattice(07) → { lucas(03), torus(05), constants(01), provenance(02) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PHI, PHI_INV, HARMONIC_COUNT, METATRON_SHELL, PHI_NEG26 } from "../core/constants.ts";
import { spectralLines } from "../core/lucas.ts";
import { classify, type Classified } from "../core/provenance.ts";
import type { TorusParams, TorusPoint } from "./torus.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Complex numbers (self-contained; the field amplitude is complex)
// ─────────────────────────────────────────────────────────────────────────────

/** A complex amplitude in rectangular form. */
export interface Complex {
  readonly re: number;
  readonly im: number;
}

export const cx = (re: number, im = 0): Complex => ({ re, im });
export const cxAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const cxScale = (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s });
export const cxAbs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
/** e^{iθ} */
export const cxExpI = (theta: number): Complex => ({ re: Math.cos(theta), im: Math.sin(theta) });

// ─────────────────────────────────────────────────────────────────────────────
// Spectral structure — the 13 Lucas lines and their golden amplitudes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 13 spectral amplitudes a_k = φ⁻ᵏ, k = 0..12. Monotone decreasing by
 * construction (φ⁻¹ < 1). EXACT as a φ-identity.
 */
export function spectralAmplitudes(): readonly number[] {
  const out: number[] = [];
  for (let k = 0; k < HARMONIC_COUNT; k++) out.push(Math.pow(PHI, -k));
  return out;
}

/**
 * The telescoping anchor: the golden pair φ⁻¹ + φ⁻² = 1 exactly. This is the
 * spectral law's conservation identity — the two leading harmonics already
 * carry the whole unit weight. EXACT.
 */
export function goldenPairSum(): number {
  return PHI_INV + Math.pow(PHI, -2);
}

/**
 * The 13-term partial geometric sum S = Σ_{k=0}^{12} φ⁻ᵏ. Finite geometric
 * series: S = (1 − φ⁻¹³)/(1 − φ⁻¹). EXACT. Used to normalise the lattice so a
 * unit-amplitude drive yields a bounded field.
 */
export function spectralWeightSum(): number {
  const r = PHI_INV; // common ratio φ⁻¹ < 1
  return (1 - Math.pow(r, HARMONIC_COUNT)) / (1 - r);
}

/**
 * The 13 Lucas spectral-line wavenumber indices (delegates to File 3).
 * EXACT integers.
 */
export function latticeLines(): readonly number[] {
  return spectralLines();
}

/**
 * The golden stability law: a rung hosts a Metatron lattice iff it is a
 * Lucas-stable scale AND the harmonic count is the Fibonacci F₇ = 13. The law
 * is the conjunction of the exact closure theorem (File 3) and the harmonic
 * structure. Returned as a Classified boolean: the *mathematics* is EXACT; the
 * reading as a physical stability criterion is POSTULATE.
 */
export function goldenStabilityLaw(n: number, isStableRung: boolean): Classified<boolean> {
  return classify(
    isStableRung && HARMONIC_COUNT === 13,
    "POSTULATE",
    undefined,
    "golden stability: Lucas-stable rung ∧ 13 harmonics (F₇); math EXACT, physics POSTULATE",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The Metatron field on the torus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Metatron standing field on a scale's torus at point (u,v) and time phase
 * t. Each harmonic k contributes a_k·e^{i(k_k·u − ω_k·t)} where k_k is the k-th
 * Lucas spectral line and ω_k = k_k·v_wave/L is the dispersion (here folded
 * into the phase t so the field is dimensionless on the torus).
 *
 *   Ψ(u,v,t) = Σ_{k=0}^{12} φ⁻ᵏ · e^{i( line_k·u + line_k·v − line_k·t ) }
 *
 * The field is band-limited (13 toroidal modes), hence periodic in u and v, so
 * it closes to machine-epsilon under the File-6 residual — the frictionless
 * ideal. This is the initial-condition / standing-wave skeleton the engine
 * perturbs and measures.
 *
 * Physical reading of the spectrum is POSTULATE (taint propagates).
 */
export function metatronField(
  torus: TorusParams,
  p: TorusPoint,
  t = 0,
): Classified<Complex> {
  void torus; // the field is shape-only (dimensionless on the torus), like the File-6 residual
  const lines = spectralLines();
  const amps = spectralAmplitudes();
  let acc: Complex = { re: 0, im: 0 };
  for (let k = 0; k < HARMONIC_COUNT; k++) {
    const line = lines[k]!;
    // Standing toroidal mode: phase = line·u + line·v − line·t.
    const phase = line * p.u + line * p.v - line * t;
    acc = cxAdd(acc, cxScale(cxExpI(phase), amps[k]!));
  }
  return classify(
    acc,
    "POSTULATE",
    undefined,
    "Metatron lattice Σ φ⁻ᵏ e^{i(k_k·r−ω_k t)}; math EXACT, physical spectrum POSTULATE",
  );
}

/**
 * The real (observable) part of the Metatron field — the quantity the closure
 * residual (File 6) and self-measurement (File 12) operate on.
 */
export function metatronFieldReal(torus: TorusParams, p: TorusPoint, t = 0): number {
  return metatronField(torus, p, t).value.re;
}

/**
 * The geometric initial condition: the lattice's unit-normalised standing wave
 * at t=0. Dividing by the spectral weight sum makes the drive bounded and the
 * per-harmonic decomposition comparable across scales. Returns a plain field
 * function suitable for closureResidual / isClosed.
 */
export function initialCondition(torus: TorusParams): (p: TorusPoint) => number {
  const norm = spectralWeightSum();
  return (p: TorusPoint) => metatronFieldReal(torus, p, 0) / norm;
}

/**
 * Flux through the Metatron shell (n=13): φ⁻²⁶ = 3.6840146919×10⁻⁶.
 * EXACT as a number; its interpretation as a physical flux is POSTULATE.
 * Re-exported here so the lattice file owns the shell's spectral flux anchor.
 */
export function latticeShellFlux(): Classified<number> {
  return classify(
    PHI_NEG26,
    "POSTULATE",
    undefined,
    "flux(13) = φ⁻²⁶; numerically EXACT, physically a RHUFT conjecture",
  );
}
