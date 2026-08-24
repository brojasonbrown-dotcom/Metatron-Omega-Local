/**
 * FILE 24 — analysis/toroidalFlow.ts
 *
 * Poles, dipoles, and toroidal energy flow of a scale's field — the multipole
 * read of "how toroidal closure at this scale shapes the emergent flow".
 *
 * What this honestly is: a PURE OBSERVER over the geometry substrate (File 5
 * torus, File 6 closureResidual) and the certified exact-DFT primitive
 * (analysis/eigenmodes.ts). It NEVER mutates dynamics and is imported by no
 * dynamics file — zero regression by construction (the File-19 pattern). Given
 * a real field Ψ(u,v) on a Lucas-stable scale's torus it reports, with
 * provenance on every number:
 *
 *   • The (m,n) TOROIDAL-MODE POWER SPECTRUM — how much of the field lives in
 *     the toroidal-axis direction (u, wavenumber m), the poloidal-tube
 *     direction (v, wavenumber n), and mixed modes. A pure axis mode is the
 *     field looping the symmetry axis = the POLE structure; a pure poloidal
 *     mode loops the tube = the DIPOLE (toroidal-moment) structure.
 *
 *   • The POLE STRUCTURE — the two geometric poles of the torus flow are the
 *     OUTER equator (v=0, Gaussian curvature K>0) and the INNER equator (v=π,
 *     K<0): the torus's own curvature sign split (File 5
 *     gaussianCurvatureTimesR2). We measure the field's energy and mean on each
 *     pole circle and the net circulation around the toroidal (u) and poloidal
 *     (v) cycles — the multipole "charges" of the flow.
 *
 *   • The TOROIDAL DIPOLE MOMENT T — the established third multipole family of
 *     electrodynamics (toroidal/anapole moment), T ∝ ∫[ r(r·J) − 2r²J ] d³r,
 *     reduced exactly to the torus surface with the physical current density
 *     taken as the surface gradient J = ∇Ψ.
 *
 *   • The EMERGENT FLOW — the most probable (friction-minimal) flow direction:
 *     the residual-minimising mix of toroidal vs poloidal circulation, with the
 *     closure residual (File 6) as the friction measure. A frictionless loop
 *     (machine-eps residual) that carries pure toroidal circulation is the
 *     engine's "most frictionless flow" made computational.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RESEARCH GROUNDING (provenance per claim, per the no-mistakes firewall):
 *
 *   Ring-torus embedding      x=(R+r·cos v)cos u, y=(R+r·cos v)sin u, z=r·sin v.
 *     [EXACT]               ∂_u has magnitude (R+r·cos v), ∂_v magnitude r — the
 *                           same first fundamental form as File 5 (up to its r²
 *                           factoring). Wolfram MathWorld "Torus".
 *
 *   Surface gradient        ∇Ψ = (1/g_uu)∂_uΨ·∂_u + (1/g_vv)∂_vΨ·∂_v, with
 *     [EXACT]               g_uu=(R+r cos v)², g_vv=r². Differential geometry of
 *                           a parametrized surface (do Carmo, §2).
 *
 *   Toroidal dipole moment  T = (1/10c)∫[ r(r·J) − 2r²J ] d³r for a current
 *     [EXACT reduction /    distribution J — the toroidal/anapole multipole
 *      POSTULATE physics]   family (Dubovik & Tugushev 1990; Radescu & Vaman
 *                           2002; handwiki/Wikipedia "Toroidal moment"). The
 *                           1/(10c) is an SI unit convention; we return the
 *                           dimensionless integral CORE ∫[ r(r·J) − 2r²J ].
 *                           Identifying the RHUFT field gradient ∇Ψ as a
 *                           physical current density is the POSTULATE.
 *
 *   Curvature poles         K(v) = cos v / (aspect + cos v) (File 5, ·r² form):
 *     [EXACT]               positive at v=0 (outer), negative at v=π (inner).
 *                           These are the two distinguished flow circles of a
 *                           ring torus; Gauss–Bonnet forces ∮K dA = 0 (genus 1).
 *
 *   Friction = closure      File 6: |∮∇Ψ·dS| + seam obstruction; never exactly
 *     residual [EXACT int / 0 (Lucas obstruction). Reading a smaller residual as
 *      POSTULATE physics]   "more frictionless flow" is the RHUFT POSTULATE.
 *
 * Dependency direction (strictly downward, DAG):
 *   toroidalFlow(24) → { torus(05), closureResidual(06), eigenmodes(ext),
 *                        constants(01), provenance(02) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PHI_INV, PI, TWO_PI, C } from "../core/constants.ts";
import { classify, tainted, type Classified } from "../core/provenance.ts";
import {
  metric,
  wrapAngle,
  type TorusField,
  type TorusParams,
} from "../geometry/torus.ts";
import { closureResidual } from "../geometry/closureResidual.ts";
import { rawDftReal, rawDftComplex } from "./eigenmodes.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Grid helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default sampling grid per angular cycle. Matches File 6's spectral-trapezoid
 * resolution so the mode spectrum and the closure residual are computed on the
 * same quadrature footing.
 */
const DEFAULT_GRID = 96;

/**
 * Sample a TorusField onto a uniform grid × grid mesh (cell-centred, periodic).
 * Returns row-major values f[i·grid + j] with u = (i+½)du (toroidal index i)
 * and v = (j+½)du (poloidal index j).
 */
function sampleField(field: TorusField, grid: number): Float64Array {
  const du = TWO_PI / grid;
  const out = new Float64Array(grid * grid);
  for (let i = 0; i < grid; i++) {
    const u = (i + 0.5) * du;
    for (let j = 0; j < grid; j++) {
      const v = (j + 0.5) * du;
      const val = field({ u, v });
      if (!Number.isFinite(val)) {
        throw new RangeError(`toroidalFlow: non-finite field value at (i=${i}, j=${j}).`);
      }
      out[i * grid + j] = val;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// (m,n) toroidal-mode power spectrum
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The full 2-D discrete Fourier power spectrum of the field on the (u,v) grid,
 * as a function of toroidal wavenumber m (index into u) and poloidal
 * wavenumber n (index into v).
 *
 * EXACT: the field is 2π-periodic in BOTH coordinates, so the separable DFT is
 * spectrally exact for band-limited fields — the same chirp-z primitive
 * (eigenmodes.rawDftReal) applied per axis, as in spectralND. Power is folded
 * for the real-signal conjugate symmetry so Σ_{m,n} power = Σ_{i,j} f²
 * (Parseval). The parsevalResidual is the conservation certificate.
 */
export interface ModeSpectrum {
  /** Grid resolution per cycle. */
  readonly grid: number;
  /**
   * Folded real-signal power indexed by [m][n] over the NON-NEGATIVE toroidal
   * wavenumbers m ∈ [0, grid/2] and poloidal wavenumbers n ∈ [0, grid/2].
   * Symmetric modes are folded in, so power[m][n] is the total energy of the
   * (±m, ±n) family. Row-major: power[m*(half+1) + n].
   */
  readonly power: Float64Array;
  /** half+1 — the side length of the folded power block. */
  readonly side: number;
  /** Σ f² over the grid (real-space energy, Parseval reference). */
  readonly realEnergy: number;
  /** Σ power over the folded block (must equal realEnergy). */
  readonly spectralEnergy: number;
  /** |spectralEnergy − realEnergy| — machine floor when exact. */
  readonly parsevalResidual: number;
  /** Total power in toroidal-axis modes (m≠0, n=0) — the pole/loop family. */
  readonly toroidalAxisPower: number;
  /** Total power in poloidal-tube modes (m=0, n≠0) — the dipole family. */
  readonly poloidalTubePower: number;
  /** Total power in mixed modes (m≠0, n≠0) — the helical family. */
  readonly mixedPower: number;
  /** The dominant non-DC mode as (m, n). */
  readonly dominant: { m: number; n: number };
}

export function modeSpectrum(field: TorusField, grid = DEFAULT_GRID): ModeSpectrum {
  if (!Number.isInteger(grid) || grid < 8 || grid % 2 !== 0) {
    throw new RangeError(`toroidalFlow: grid must be an even integer ≥ 8, got ${grid}`);
  }
  const f = sampleField(field, grid);
  let realEnergy = 0;
  for (let i = 0; i < f.length; i++) realEnergy += f[i]! * f[i]!;

  // Forward 2-D DFT, separable: FFT along u (axis i, stride grid) then along v
  // (axis j, stride 1). Result is complex, row-major over (m, n) full grids.
  const re = new Float64Array(f.length);
  const im = new Float64Array(f.length);
  // Axis u: transform each fixed-j line along i (stride = grid).
  for (let j = 0; j < grid; j++) {
    const line = new Float64Array(grid);
    for (let i = 0; i < grid; i++) line[i] = f[i * grid + j]!;
    const out = rawDftReal(line, grid);
    for (let m = 0; m < grid; m++) {
      re[m * grid + j] = out.re[m]!;
      im[m * grid + j] = out.im[m]!;
    }
  }
  // Axis v: transform each fixed-m line along j (stride = 1), now complex.
  for (let m = 0; m < grid; m++) {
    const lre = new Float64Array(grid), lim = new Float64Array(grid);
    for (let n = 0; n < grid; n++) { lre[n] = re[m * grid + n]!; lim[n] = im[m * grid + n]!; }
    const out = rawDftComplex(lre, lim, grid);
    for (let n = 0; n < grid; n++) { re[m * grid + n] = out.re[n]!; im[m * grid + n] = out.im[n]!; }
  }

  const half = grid >> 1;
  const side = half + 1;
  const power = new Float64Array(side * side);
  // Fold the full (m,n) spectrum into the non-negative quadrant, accounting for
  // the real-signal conjugate symmetry F(−m,−n) = conj(F(m,n)). Each interior
  // mode family { (m,n), (−m,−n) } contributes twice its single-bin energy;
  // axis/DC modes (m=0 or n=0 families that coincide under negation) once.
  // Unnormalised DFT ⇒ divide by grid² to match Σf² (Parseval, n-D convention).
  const norm = grid * grid;
  let spectralEnergy = 0;
  for (let m = 0; m <= half; m++) {
    for (let n = 0; n <= half; n++) {
      const mm = m === 0 ? 0 : grid - m; // −m mod grid
      const nn = n === 0 ? 0 : grid - n; // −n mod grid
      const eHere = re[m * grid + n]! ** 2 + im[m * grid + n]! ** 2;
      const eMirror = re[mm * grid + nn]! ** 2 + im[mm * grid + nn]! ** 2;
      // DC and self-conjugate corners counted once; everything else twice.
      const selfConjugate = (m === 0 || m === half) && (n === 0 || n === half);
      const e = (selfConjugate ? eHere : eHere + eMirror) / norm;
      power[m * side + n] = e;
      spectralEnergy += e;
    }
  }

  let toroidalAxisPower = 0, poloidalTubePower = 0, mixedPower = 0;
  let best = -1, bestM = 0, bestN = 0;
  for (let m = 0; m <= half; m++) {
    for (let n = 0; n <= half; n++) {
      const e = power[m * side + n]!;
      if (m === 0 && n === 0) continue; // DC = the mean, not a flow mode
      if (n === 0) toroidalAxisPower += e;
      else if (m === 0) poloidalTubePower += e;
      else mixedPower += e;
      if (e > best) { best = e; bestM = m; bestN = n; }
    }
  }

  return {
    grid,
    power,
    side,
    realEnergy,
    spectralEnergy,
    parsevalResidual: Math.abs(spectralEnergy - realEnergy),
    toroidalAxisPower,
    poloidalTubePower,
    mixedPower,
    dominant: { m: bestM, n: bestN },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pole structure — the two curvature poles and the cycle circulations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One curvature pole of the torus flow: a distinguished circle (outer equator
 * v=0 with K>0, or inner equator v=π with K<0) and the field's state on it.
 */
export interface Pole {
  /** 'outer' (v=0, K>0) or 'inner' (v=π, K<0). */
  readonly kind: "outer" | "inner";
  /** Poloidal angle of the pole circle (0 or π). */
  readonly v: number;
  /** Gaussian curvature sign there (+1 outer, −1 inner) — File 5, EXACT. */
  readonly curvatureSign: number;
  /** Field energy Σ f² sampled around the pole circle. */
  readonly energy: number;
  /** Field mean around the pole circle (the DC "pole charge"). */
  readonly mean: number;
}

/**
 * The pole/dipole structure of the flow: the two geometric poles plus the net
 * circulations around the two fundamental cycles.
 *
 * Circulations are the exact discrete line integrals of the physical surface
 * gradient J = ∇Ψ around the mean circles:
 *   Γ_u = ∮ J·ê_u ds  at the outer equator  (toroidal circulation — pole loop)
 *   Γ_v = ∮ J·ê_v ds  at a fixed u           (poloidal circulation — dipole loop)
 * For a closed (periodic) field these are ~machine-eps (the field returns to
 * itself); a nonzero circulation is a winding the field cannot shed — the
 * geometric signature of a persistent pole/dipole current. EXACT integrals;
 * reading them as physical current is the POSTULATE.
 */
export interface PoleStructure {
  readonly outer: Pole;
  readonly inner: Pole;
  /** Net toroidal circulation Γ_u (outer-equator loop). Classified. */
  readonly toroidalCirculation: Classified<number>;
  /** Net poloidal circulation Γ_v (poloidal loop). Classified. */
  readonly poloidalCirculation: Classified<number>;
  /**
   * Pole asymmetry = (E_outer − E_inner)/(E_outer + E_inner) ∈ [−1,1]. +1 =
   * all flow energy on the outer pole; −1 = all on the inner; 0 = balanced.
   */
  readonly poleAsymmetry: number;
}

export function poleStructure(field: TorusField, torus: TorusParams, grid = DEFAULT_GRID): PoleStructure {
  if (!Number.isInteger(grid) || grid < 8) {
    throw new RangeError(`poleStructure: grid must be an integer ≥ 8, got ${grid}`);
  }
  const du = TWO_PI / grid;

  // Sample the two pole circles. v=0 is the outer equator, v=π the inner.
  const sampleCircle = (v: number): { energy: number; mean: number } => {
    let e = 0, s = 0;
    for (let i = 0; i < grid; i++) {
      const u = (i + 0.5) * du;
      const val = field({ u, v });
      if (!Number.isFinite(val)) throw new RangeError("poleStructure: non-finite field value.");
      e += val * val;
      s += val;
    }
    return { energy: e, mean: s / grid };
  };
  const o = sampleCircle(0);
  const pi = sampleCircle(PI);

  const mkPole = (kind: "outer" | "inner", v: number, curvSign: number, c: { energy: number; mean: number }): Pole =>
    Object.freeze({ kind, v, curvatureSign: curvSign, energy: c.energy, mean: c.mean });

  // Toroidal circulation Γ_u = ∮ J·ê_u ds around the outer equator. With the
  // physical line element ds = (R + r cos v) du and J_u = (1/(R+r cos v))∂_uΨ,
  // the radius cancels: J_u·ds = ∂_uΨ du. So Γ_u = ∮ ∂_uΨ du = exact discrete
  // Ψ-difference around the loop — 0 for any single-valued (closed) field.
  let gammaU = 0;
  for (let i = 0; i < grid; i++) {
    const u = (i + 0.5) * du;
    const up = wrapAngle(u + du);
    gammaU += field({ u: up, v: 0 }) - field({ u, v: 0 });
  }
  // Poloidal circulation Γ_v = ∮ ∂_vΨ dv around a poloidal loop at fixed u.
  let gammaV = 0;
  for (let j = 0; j < grid; j++) {
    const v = (j + 0.5) * du;
    const vp = wrapAngle(v + du);
    gammaV += field({ u: 0, v: vp }) - field({ u: 0, v });
  }

  const prov = tainted("EXACT", "POSTULATE");
  const eSum = o.energy + pi.energy;
  return Object.freeze({
    outer: mkPole("outer", 0, +1, o),
    inner: mkPole("inner", PI, -1, pi),
    toroidalCirculation: classify(gammaU, prov, undefined,
      "Γ_u = ∮ ∂_uΨ du around the outer equator; EXACT loop integral, ~0 for a closed field; physical-current reading POSTULATE"),
    poloidalCirculation: classify(gammaV, prov, undefined,
      "Γ_v = ∮ ∂_vΨ dv around a poloidal loop; EXACT loop integral, ~0 for a closed field; physical-current reading POSTULATE"),
    poleAsymmetry: eSum > 0 ? (o.energy - pi.energy) / eSum : 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Toroidal dipole moment T
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The toroidal (anapole) dipole moment of the field's gradient current.
 *
 *   T ∝ ∫ [ r_vec (r_vec·J) − 2 r_vec² J ] d³r ,
 *
 * reduced to the torus surface. The physical current density is the surface
 * gradient J = ∇Ψ (RHUFT POSTULATE); the surface element is dA = r(R+r cos v)
 * du dv (File 5 areaElement). We return the dimensionless integral core
 *   ∫ [ r_vec (r_vec·J) − 2 r_vec² J ] (r(R+r cos v)) du dv
 * with r_vec measured in units of the scale's minor radius r (so the value is
 * scale-shape-only, like File 6's residual — the physical moment is recovered
 * by multiplying by the appropriate power of r and the SI 1/(10c) prefactor,
 * which we expose as `siPrefactor` = 1/(10c), CODATA c).
 *
 * EXACT as a vector integral over the given field; POSTULATE as physics. The
 * result is a 3-vector {x,y,z}; a poloidal tube current produces T along the
 * symmetry (z) axis — the toroidal-moment signature.
 */
export interface ToroidalDipole {
  /** Dimensionless integral core, Cartesian components. Classified. */
  readonly core: { readonly x: Classified<number>; readonly y: Classified<number>; readonly z: Classified<number> };
  /** |T| of the integral core. */
  readonly magnitude: number;
  /**
   * The dominant Cartesian axis ('x'|'y'|'z') — z for a clean toroidal moment.
   * null when the moment is zero (a flat/symmetric field has no dipole axis; we
   * report that honestly rather than naming an arbitrary direction).
   */
  readonly axis: "x" | "y" | "z" | null;
  /** 1/(10c) — the SI prefactor (CODATA c) that scales the core to SI units. */
  readonly siPrefactor: number;
}

export function toroidalDipoleMoment(field: TorusField, torus: TorusParams, grid = DEFAULT_GRID): ToroidalDipole {
  if (!Number.isInteger(grid) || grid < 8) {
    throw new RangeError(`toroidalDipoleMoment: grid must be an integer ≥ 8, got ${grid}`);
  }
  const du = TWO_PI / grid;
  const aspect = torus.aspect; // R/r = φ, dimensionless

  // All lengths in units of the minor radius r: ρ = (aspect + cos v) is
  // (R + r cos v)/r, and z/r = sin v. This keeps every scale Float64-safe and
  // makes the moment a pure-shape number, like the closure residual.
  let Tx = 0, Ty = 0, Tz = 0;
  for (let i = 0; i < grid; i++) {
    const u = (i + 0.5) * du;
    const cosU = Math.cos(u), sinU = Math.sin(u);
    for (let j = 0; j < grid; j++) {
      const v = (j + 0.5) * du;
      const cosV = Math.cos(v), sinV = Math.sin(v);
      const rho = aspect + cosV; // (R + r cos v)/r, dimensionless

      // Position vector (units of r).
      const rx = rho * cosU, ry = rho * sinU, rz = sinV;
      const r2 = rx * rx + ry * ry + rz * rz;

      // Surface gradient J = ∇Ψ (physical). Central differences on the grid;
      // J_u = (1/(R+r cos v))∂_uΨ → (1/(r·rho))∂_uΨ; J_v = (1/r)∂_vΨ.
      // In units of (1/r) the gradient components are ∂_uΨ/rho and ∂_vΨ.
      const up = wrapAngle(u + du), um = wrapAngle(u - du);
      const vp = wrapAngle(v + du), vm = wrapAngle(v - du);
      const dPsiDu = (field({ u: up, v }) - field({ u: um, v })) / (2 * du);
      const dPsiDv = (field({ u, v: vp }) - field({ u, v: vm })) / (2 * du);
      const Ju = dPsiDu / rho; // (1/r) units
      const Jv = dPsiDv;       // (1/r) units
      // Physical direction: ê_u = (−sin u, cos u, 0); ê_v = (cos v cos u, cos v sin u, −sin v).
      const eux = -sinU, euy = cosU, euz = 0;
      const evx = cosV * cosU, evy = cosV * sinU, evz = -sinV;
      const Jx = Ju * eux + Jv * evx;
      const Jy = Ju * euy + Jv * evy;
      const Jz = Ju * euz + Jv * evz;

      const rdotJ = rx * Jx + ry * Jy + rz * Jz;
      // Integrand r(r·J) − 2r²J, times surface element r(R+r cos v) → r²·rho in
      // dimensionless units; the r² scale factor is common and dropped (we
      // report the shape core). du·dv is the angular measure.
      const w = rho * du * du; // (R + r cos v)/r · du dv ∝ dA/r²
      Tx += (rx * rdotJ - 2 * r2 * Jx) * w;
      Ty += (ry * rdotJ - 2 * r2 * Jy) * w;
      Tz += (rz * rdotJ - 2 * r2 * Jz) * w;
    }
  }

  const prov = tainted("EXACT", "POSTULATE");
  const note =
    "toroidal dipole core ∫[r(r·J)−2r²J]dA (J=∇Ψ); EXACT vector integral, POSTULATE as physical current; SI scale via ×1/(10c)";
  const mag = Math.hypot(Tx, Ty, Tz);
  // A zero moment has no axis — report null rather than an arbitrary direction
  // (the tiebreak would otherwise silently claim 'z' for a flat field).
  const axis: "x" | "y" | "z" | null =
    mag === 0 ? null
      : Math.abs(Tz) >= Math.abs(Tx) && Math.abs(Tz) >= Math.abs(Ty) ? "z"
        : Math.abs(Ty) >= Math.abs(Tx) ? "y" : "x";
  return {
    core: {
      x: classify(Tx, prov, undefined, note),
      y: classify(Ty, prov, undefined, note),
      z: classify(Tz, prov, undefined, note),
    },
    magnitude: mag,
    axis,
    siPrefactor: 1 / (10 * C),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Emergent flow — the friction-minimal flow direction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The most probable emergent energy flow through the field: the balance between
 * toroidal-axis and poloidal-tube circulation, read against the closure
 * residual (the friction measure, File 6).
 *
 *   flowRatio = toroidalAxisPower / (toroidalAxisPower + poloidalTubePower)
 *             ∈ [0,1];  1 = flow is purely around the symmetry axis (pole loop),
 *                       0 = purely around the tube (dipole loop),
 *                       ~½ = helical/mixed.
 *
 * The closure residual gates interpretation: a machine-eps residual means the
 * reported flow is frictionless (a closed loop); a finite residual means part
 * of the flow "leaks" — the un-closed flux the next scale must absorb (the
 * crossScaleFlow pushback). All numbers Classified: the power split is EXACT
 * (Parseval-certified), the residual is EXACT-integral/POSTULATE-physics.
 */
export interface EmergentFlow {
  /**
   * Fraction of structured power in toroidal-axis modes ∈ [0,1]. Classified.
   * null when the field carries no structured power above the machine-epsilon
   * floor (a flat/unstructured field has no flow direction — reported honestly,
   * never a coin-flip on DFT roundoff).
   */
  readonly flowRatio: Classified<number> | null;
  /** Fraction in poloidal-tube modes ∈ [0,1] (0 when unstructured). */
  readonly poloidalRatio: number;
  /** Fraction in mixed/helical modes ∈ [0,1] (0 when unstructured). */
  readonly mixedRatio: number;
  /** The dominant multipole order (m, n). */
  readonly dominantMode: { m: number; n: number };
  /** Closure residual of the field (friction). Classified (File 6). */
  readonly closureResidual: Classified<number>;
  /** Parseval residual of the underlying spectrum (conservation certificate). */
  readonly parsevalResidual: number;
  /** True when structured power exceeds the machine floor (flow is meaningful). */
  readonly structured: boolean;
}

export function emergentFlow(field: TorusField, torus: TorusParams, grid = DEFAULT_GRID): EmergentFlow {
  const spec = modeSpectrum(field, grid);
  const structured = spec.toroidalAxisPower + spec.poloidalTubePower + spec.mixedPower;
  // Structured-power floor: relative to total real-space energy, at the
  // machine-epsilon scale of the Parseval-certified DFT. A field whose entire
  // "structure" is below this is flat to numerical precision — its flowRatio
  // would be a meaningless split of roundoff, so we report null.
  const STRUCTURED_FLOOR = 1e-12;
  const isStructured = spec.realEnergy > 0 && structured / spec.realEnergy > STRUCTURED_FLOOR;
  const flowRatio = isStructured ? spec.toroidalAxisPower / structured : null;
  const poloidalRatio = isStructured ? spec.poloidalTubePower / structured : 0;
  const mixedRatio = isStructured ? spec.mixedPower / structured : 0;
  const residual = closureResidual(field, torus, grid);
  return Object.freeze({
    flowRatio: flowRatio === null ? null : classify(flowRatio, "EXACT", undefined,
      "toroidal-axis power fraction; EXACT from the Parseval-certified (m,n) spectrum"),
    poloidalRatio,
    mixedRatio,
    dominantMode: spec.dominant,
    closureResidual: residual,
    parsevalResidual: spec.parsevalResidual,
    structured: isStructured,
  });
}
