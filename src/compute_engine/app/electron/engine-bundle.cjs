"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/engine-entry.ts
var engine_entry_exports = {};
__export(engine_entry_exports, {
  AdaptiveMesh: () => AdaptiveMesh,
  C: () => C,
  CADENCE_MS: () => CADENCE_MS,
  CFL_LIMIT: () => CFL_LIMIT,
  CFL_STABILITY_BOUNDARY: () => CFL_STABILITY_BOUNDARY,
  COARSEN_THRESHOLD: () => COARSEN_THRESHOLD,
  CONTINUATION: () => CONTINUATION,
  DensityField: () => DensityField,
  LADDER: () => LADDER,
  MAX_RESOLUTION: () => MAX_RESOLUTION,
  METATRON_SHELL: () => METATRON_SHELL,
  MemoryKernel: () => MemoryKernel,
  PHI: () => PHI,
  PHI_INV: () => PHI_INV,
  PHI_NEG2: () => PHI_NEG2,
  PHI_NEG26: () => PHI_NEG26,
  PLANCK_LENGTH: () => PLANCK_LENGTH,
  PROLONGATION_WEIGHT: () => PROLONGATION_WEIGHT,
  Propagator: () => Propagator,
  REFINE_GRADING: () => REFINE_GRADING,
  REFINE_THRESHOLD: () => REFINE_THRESHOLD,
  RESOLUTION_LADDER: () => RESOLUTION_LADDER,
  RESTRICTION_WEIGHT: () => RESTRICTION_WEIGHT,
  STABLE_SCALES: () => STABLE_SCALES,
  Scaled: () => Scaled,
  TARGET_USAGE: () => TARGET_USAGE,
  UNRESOLVED: () => UNRESOLVED,
  allScales: () => allScales,
  binetDefect: () => binetDefect,
  closureResidual: () => closureResidual,
  closureResidueMin: () => closureResidueMin,
  closureScore: () => closureScore,
  dominantModeIndex: () => dominantModeIndex,
  eigenSpectrum: () => eigenSpectrum,
  energyRatio: () => energyRatio,
  envelopeDensity: () => envelopeDensity,
  fibonacci: () => fibonacci,
  getScale: () => getScale,
  goldenPairSum: () => goldenPairSum,
  initialCondition: () => initialCondition,
  isClosed: () => isClosed,
  isRung: () => isRung,
  isStable: () => isStable,
  ladderNeighbors: () => ladderNeighbors,
  lucas: () => lucas,
  lucasResidue: () => lucasResidue,
  metatronShellFlux: () => metatronShellFlux,
  minimallyOpenFloor: () => minimallyOpenFloor,
  nearestRung: () => nearestRung,
  octavePartners: () => octavePartners,
  prolongateBlock: () => prolongateBlock,
  relativeConservationResidual: () => relativeConservationResidual,
  relativeRestrictionResidual: () => relativeRestrictionResidual,
  relativeRoundTripDefect: () => relativeRoundTripDefect,
  restrictBlock: () => restrictBlock,
  restrictParent: () => restrictParent,
  restrictPartial: () => restrictPartial,
  restrictionConservationResidual: () => restrictionConservationResidual,
  restrictionWeights: () => restrictionWeights,
  roundTripDefect: () => roundTripDefect,
  selfOverlap: () => selfOverlap,
  spectralAmplitudes: () => spectralAmplitudes,
  spectralLines: () => spectralLines,
  spectralWeightSum: () => spectralWeightSum,
  stableScalesUpTo: () => stableScalesUpTo,
  surfaceArea: () => surfaceArea,
  torusForScale: () => torusForScale
});
module.exports = __toCommonJS(engine_entry_exports);

// ../engine/src/core/constants.ts
var PHI = 1.618033988749895;
var PHI_INV = 0.6180339887498949;
var PHI_NEG2 = 0.38196601125010515;
var PHI_NEG26 = Math.pow(PHI, -26);
var PI = 3.141592653589793;
var TWO_PI = 6.283185307179586;
var C = 299792458;
var PLANCK_LENGTH = 16162550244237053e-51;
var PLANCK_TIME = 5391246446661944e-59;
var ALPHA_INV = 137.035999177;
var GOLDEN_DELAY_EPS = 0.01;
var HARMONIC_COUNT = 13;
var STABLE_SCALES = [
  1,
  13,
  15,
  27,
  29,
  41,
  43,
  55,
  57,
  69,
  71,
  83,
  85,
  97,
  99,
  111,
  113,
  125
];
var METATRON_SHELL = 13;
var UNRESOLVED = {
  /**
   * Medium wave-speed form v_wave = c/√(ρ_I·κ·φ⁻ⁿᐟ²) is dimensionally incoherent:
   * ρ_I = ℓ_P⁻³φ⁻ⁿ is a NUMBER density [m⁻³]; κ is undefined (would need units of
   * mass). Disagrees with the canonical ladder form by 10⁻⁵² (n=1) → 10²⁴ (n=293).
   * Engine uses v_wave = c·φ⁻ⁿᐟ². Do NOT compute the medium form until κ is defined.
   */
  mediumWaveSpeed: "OPEN POSTULATE: v_wave = c/sqrt(rho_I * kappa * phi^(-n/2)) requires a defined \u03BA (units of mass); dimensionally incoherent as written. Canonical form c\xB7phi^(-n/2) is used. Do not compute."
};
var tag = (value, provenance, note) => note === void 0 ? { value, provenance } : { value, provenance, note };
var ANCHORS = {
  PHI: tag(PHI, "EXACT", "\u03C6 = (1+\u221A5)/2"),
  PHI_NEG2: tag(PHI_NEG2, "EXACT", "\u03BB = \u03C6\u207B\xB2 = (3\u2212\u221A5)/2, memory coupling"),
  PLANCK_LENGTH: tag(PLANCK_LENGTH, "CODATA", "\u2113_P = \u221A(\u210FG/c\xB3), 2022 adjustment"),
  PLANCK_TIME: tag(PLANCK_TIME, "CODATA"),
  ALPHA_INV: tag(ALPHA_INV, "CODATA", "\u03B1\u207B\xB9; \u03C6-derived forms stay POSTULATE"),
  GOLDEN_DELAY_EPS: tag(GOLDEN_DELAY_EPS, "POSTULATE", "\u03C4(n)=t_P\xB7\u03C6\u207F(1+\u03B5n) form"),
  METATRON_SHELL_FLUX: tag(PHI_NEG26, "EXACT", "flux(13) = \u03C6\u207B\xB2\u2076")
};

// ../engine/src/core/provenance.ts
var RANK = {
  EXACT: 0,
  CODATA: 1,
  MEASURED: 2,
  POSTULATE: 3
};
var classify = (value, provenance, uncertainty, note) => ({
  value,
  provenance,
  ...uncertainty === void 0 ? {} : { uncertainty },
  ...note === void 0 ? {} : { note }
});
var tainted = (...ps) => ps.reduce((a, b) => RANK[b] > RANK[a] ? b : a, "EXACT");
var MAX_EXP = 308;
var FLOAT64_DIGITS = 15;
var Scaled = class _Scaled {
  mantissa;
  exp10;
  constructor(mantissa, exp10) {
    this.mantissa = mantissa;
    this.exp10 = exp10;
  }
  /** Construct from any finite number, normalized. */
  static from(x) {
    if (!Number.isFinite(x)) throw new RangeError(`Scaled.from: non-finite ${x}`);
    if (x === 0) return new _Scaled(0, 0);
    const exp = Math.floor(Math.log10(Math.abs(x)));
    const e1 = Math.trunc(exp / 2);
    const e2 = exp - e1;
    const m = x / 10 ** e1 / 10 ** e2;
    if (Math.abs(m) >= 10) return new _Scaled(m / 10, exp + 1);
    if (Math.abs(m) < 1) return new _Scaled(m * 10, exp - 1);
    return new _Scaled(m, exp);
  }
  /** Construct from explicit parts; normalizes. */
  static of(mantissa, exp10) {
    if (mantissa === 0) return new _Scaled(0, 0);
    const s = _Scaled.from(mantissa);
    return new _Scaled(s.mantissa, s.exp10 + Math.trunc(exp10));
  }
  /** Zero. */
  static zero() {
    return new _Scaled(0, 0);
  }
  /** φ^k as a Scaled — exact in the exponent, Float64 mantissa. */
  static phiPow(k, PHI3) {
    return _Scaled.from(Math.pow(PHI3, k));
  }
  /** Normalize so mantissa ∈ [1,10) (or exactly 0). Returns a fresh Scaled. */
  normalize() {
    return _Scaled.of(this.mantissa, this.exp10);
  }
  isZero() {
    return this.mantissa === 0;
  }
  /** this × other — exponents add exactly; cannot overflow. */
  mul(o) {
    if (this.isZero() || o.isZero()) return _Scaled.zero();
    return _Scaled.of(this.mantissa * o.mantissa, this.exp10 + o.exp10);
  }
  /** this / other — exponents subtract exactly. */
  div(o) {
    if (o.isZero()) throw new RangeError("Scaled.div: division by zero");
    if (this.isZero()) return _Scaled.zero();
    return _Scaled.of(this.mantissa / o.mantissa, this.exp10 - o.exp10);
  }
  /** this^k for integer k — exponent scales exactly. */
  pow(k) {
    if (!Number.isInteger(k)) throw new RangeError(`Scaled.pow: non-integer ${k}`);
    if (k === 0) return _Scaled.from(1);
    if (this.isZero()) return _Scaled.zero();
    return _Scaled.of(Math.pow(this.mantissa, k), this.exp10 * k);
  }
  /** √this. */
  sqrt() {
    if (this.mantissa < 0) throw new RangeError("Scaled.sqrt: negative");
    if (this.isZero()) return _Scaled.zero();
    const parity = (this.exp10 % 2 + 2) % 2;
    const m = this.mantissa * 10 ** parity;
    return _Scaled.of(Math.sqrt(m), (this.exp10 - parity) / 2);
  }
  /**
   * this + other. If the exponent gap exceeds Float64 precision, the smaller
   * addend is lost in Float64 — the result is the larger operand, and the caller
   * should treat the sum as approximate (documented per spec).
   */
  add(o) {
    if (this.isZero()) return o;
    if (o.isZero()) return this;
    const hi = this.exp10 >= o.exp10 ? this : o;
    const lo = this.exp10 >= o.exp10 ? o : this;
    const gap = hi.exp10 - lo.exp10;
    if (gap > FLOAT64_DIGITS) return hi;
    const m = hi.mantissa + lo.mantissa / 10 ** gap;
    return _Scaled.of(m, hi.exp10);
  }
  /** this − other. */
  sub(o) {
    return this.add(_Scaled.of(-o.mantissa, o.exp10));
  }
  /** Sign-aware comparison: −1, 0, +1. */
  compare(o) {
    if (this.isZero() && o.isZero()) return 0;
    const sa = Math.sign(this.mantissa), sb = Math.sign(o.mantissa);
    if (sa !== sb) return sa - sb;
    if (this.exp10 !== o.exp10) return sa * (this.exp10 - o.exp10 > 0 ? 1 : -1);
    return Math.sign(this.mantissa - o.mantissa);
  }
  /** Exact equality of (mantissa, exp10) after normalization. */
  equals(o) {
    const a = this.normalize();
    const b = o.normalize();
    return a.mantissa === b.mantissa && a.exp10 === b.exp10;
  }
  /**
   * Collapse to Float64. Throws if the magnitude cannot be represented
   * (|exp10| > 308) — by design, per spec: overflow is surfaced, never silent.
   */
  toFloat64() {
    if (this.isZero()) return 0;
    if (Math.abs(this.exp10) > MAX_EXP) {
      throw new RangeError(
        `Scaled.toFloat64: |exp10|=${this.exp10} exceeds ${MAX_EXP}; value would over/underflow Float64`
      );
    }
    return this.mantissa * 10 ** this.exp10;
  }
  /** Like toFloat64 but returns null instead of throwing when unrepresentable. */
  toFloat64OrNull() {
    try {
      return this.toFloat64();
    } catch {
      return null;
    }
  }
  toString() {
    if (this.isZero()) return "0";
    return `${this.mantissa}e${this.exp10 >= 0 ? "+" : ""}${this.exp10}`;
  }
};

// ../engine/src/core/lucas.ts
function fibonacci(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`fibonacci: n=${n} must be a non-negative integer`);
  let a = 0n, b = 1n;
  for (let i = 0; i < n; i++) {
    const t = a + b;
    a = b;
    b = t;
  }
  return a;
}
function lucas(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`lucas: n=${n} must be a non-negative integer`);
  if (n === 0) return 2n;
  let a = 2n, b = 1n;
  for (let i = 1; i < n; i++) {
    const t = a + b;
    a = b;
    b = t;
  }
  return b;
}
function lucasResidue(n, mod = 13) {
  const r = lucas(n) % BigInt(mod);
  return Number(r < 0n ? r + BigInt(mod) : r);
}
function isStable(n) {
  if (!Number.isInteger(n) || n < 1) return false;
  return closureResidueMin(n) === 1;
}
function stableScalesUpTo(max) {
  const out = [];
  for (let n = 1; n <= max; n++) if (isStable(n)) out.push(n);
  return out;
}
function closureResidueMin(n) {
  const r = lucasResidue(n, 13);
  return Math.min(r, 13 - r);
}
function binetDefect(n) {
  return Math.pow(PHI, -n);
}
function spectralLines() {
  return [1, 2, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322];
}

// ../engine/src/core/scaleTable.ts
var COMPLEXITY_COEFF = 2.0783;
function buildRecord(n) {
  const phiN = Scaled.phiPow(n, PHI);
  const phiNegN = Scaled.phiPow(-n, PHI);
  const phiNegNhalf = Scaled.phiPow(-n / 2, PHI);
  const L = Scaled.from(PLANCK_LENGTH).mul(phiN);
  const T = Scaled.from(PLANCK_TIME).mul(phiN);
  const tau = T.mul(Scaled.from(1 + GOLDEN_DELAY_EPS * n));
  const rhoI = Scaled.from(PLANCK_LENGTH).pow(-3).mul(phiNegN);
  const vWave = Scaled.from(C).mul(phiNegNhalf);
  const complexityBits = COMPLEXITY_COEFF * n;
  const nNodes = Scaled.phiPow(n - 1, PHI);
  const L13 = lucas(n) % 13n;
  const winding = lucas(n) / 13n + (L13 * 2n >= 13n ? 1n : 0n);
  return Object.freeze({
    n,
    L,
    T,
    tau,
    deltaX: L,
    rhoI,
    vWave,
    complexityBits,
    nNodes,
    winding,
    lucasResidue: closureResidueMin(n),
    stable: true,
    isMetatronShell: n === METATRON_SHELL
  });
}
var TABLE = /* @__PURE__ */ new Map();
for (const n of stableScalesUpTo(293)) TABLE.set(n, buildRecord(n));
function getScale(n) {
  const rec = TABLE.get(n);
  if (!rec) throw new RangeError(`getScale: n=${n} is not a Lucas-stable scale`);
  return rec;
}
function allScales() {
  return STABLE_SCALES.map((n) => getScale(n));
}
var CONTINUATION = stableScalesUpTo(293).filter((n) => !STABLE_SCALES.includes(n)).map((n) => getScale(n));

// ../engine/src/analysis/resolutionLadder.ts
var RESOLUTION_LADDER = Object.freeze([
  55,
  89,
  144,
  233,
  377,
  610
]);
var MIN_RESOLUTION = RESOLUTION_LADDER[0];
var MAX_RESOLUTION = RESOLUTION_LADDER[RESOLUTION_LADDER.length - 1];
function isRung(n) {
  return RESOLUTION_LADDER.includes(n);
}
function nearestRung(n) {
  if (!Number.isFinite(n)) return MIN_RESOLUTION;
  let best = MIN_RESOLUTION;
  for (const r of RESOLUTION_LADDER) {
    if (Math.abs(r - n) <= Math.abs(best - n)) best = r;
  }
  return best;
}

// ../engine/src/geometry/torus.ts
var wrapAngle = (theta) => {
  if (!Number.isFinite(theta)) throw new RangeError(`wrapAngle: non-finite ${theta}`);
  const t = theta % (2 * PI);
  return t < 0 ? t + 2 * PI : t;
};
function torusForScale(n) {
  const rec = getScale(n);
  const R = rec.L;
  const r = R.mul(Scaled.from(PHI_INV));
  return Object.freeze({
    n,
    R,
    r,
    aspect: PHI,
    aspectProvenance: "POSTULATE",
    isMetatronShell: rec.isMetatronShell
  });
}
function surfaceArea(torus) {
  const fourPi2 = Scaled.from(4 * PI * PI);
  return fourPi2.mul(torus.R).mul(torus.r);
}
function gaussianCurvatureTimesR2(torus, p) {
  const v = wrapAngle(p.v);
  return Math.cos(v) / (torus.aspect + Math.cos(v));
}
function isClosed(field, torus, tol = 1e-4, samples = 64) {
  if (tol <= 0) throw new RangeError(`isClosed: tol must be > 0, got ${tol}`);
  const measure = (eps) => {
    let m = 0;
    for (let i = 0; i < samples; i++) {
      const u = wrapAngle(eps + i * 2 * PI * PHI_INV);
      const v = wrapAngle(eps + i * 2 * PI * PHI_INV * PHI_INV);
      m = Math.max(
        m,
        // Continuity across the u-seam: f(eps, v) ≈ f(2π−eps, v).
        Math.abs(field({ u: eps, v }) - field({ u: TWO_PI - eps, v })),
        // Continuity across the v-seam: f(u, eps) ≈ f(u, 2π−eps).
        Math.abs(field({ u, v: eps }) - field({ u, v: TWO_PI - eps }))
      );
    }
    return m;
  };
  const e1 = 1e-5, e2 = 1e-6;
  const d1 = measure(e1), d2 = measure(e2);
  const jump = Math.max(0, d2 - (d1 - d2) * e2 / (e1 - e2));
  return jump <= tol;
}
function metatronShellFlux() {
  return classify(
    Scaled.from(Math.pow(PHI, -26)),
    "POSTULATE",
    void 0,
    "flux(13) = \u03C6\u207B\xB2\u2076; numerically EXACT, physically a RHUFT conjecture"
  );
}

// ../engine/src/geometry/closureResidual.ts
var DEFAULT_GRID = 96;
var RICHARDSON_TOL = 1e-6;
function fluxIntegral(field, torus, grid) {
  const du = TWO_PI / grid;
  const aspect = torus.aspect;
  let sum = 0;
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const u = (i + 0.5) * du;
      const v = (j + 0.5) * du;
      const up = wrapAngle(u + du);
      const um = wrapAngle(u - du);
      const vp = wrapAngle(v + du);
      const vm = wrapAngle(v - du);
      const gHere = aspect + Math.cos(v);
      const dPsiDu_p = (field({ u: up, v }) - field({ u, v })) / du;
      const dPsiDu_m = (field({ u, v }) - field({ u: um, v })) / du;
      const duTerm = gHere * (dPsiDu_p - dPsiDu_m) / du;
      const gAt = (vv) => aspect + Math.cos(vv);
      const invGInterfaceP = 2 / (gAt(v) + gAt(vp));
      const invGInterfaceM = 2 / (gAt(vm) + gAt(v));
      const dPsiDv_p = (field({ u, v: vp }) - field({ u, v })) / du;
      const dPsiDv_m = (field({ u, v }) - field({ u, v: vm })) / du;
      const dvTerm = (dPsiDv_p * invGInterfaceP - dPsiDv_m * invGInterfaceM) / du;
      sum += (duTerm + dvTerm) * du * du;
    }
  }
  return sum;
}
function seamDefect(field, samples) {
  const phiInv = 0.6180339887498949;
  const measure = (eps) => {
    let m = 0;
    for (let i = 0; i < samples; i++) {
      const u = wrapAngle(eps + i * TWO_PI * phiInv);
      const v = wrapAngle(eps + i * TWO_PI * phiInv * phiInv);
      m = Math.max(
        m,
        Math.abs(field({ u: eps, v }) - field({ u: TWO_PI - eps, v })),
        Math.abs(field({ u, v: eps }) - field({ u, v: TWO_PI - eps }))
      );
    }
    return m;
  };
  const d1 = measure(1e-5);
  const d2 = measure(1e-6);
  const jump = d2 - (d1 - d2) * 1e-6 / (1e-5 - 1e-6);
  return Math.max(0, jump);
}
function closureResidual(field, torus, grid = DEFAULT_GRID) {
  if (!Number.isInteger(grid) || grid < 8) {
    throw new RangeError(`closureResidual: grid must be an integer \u2265 8, got ${grid}`);
  }
  const coarse = fluxIntegral(field, torus, grid >> 1);
  const fine = fluxIntegral(field, torus, grid);
  const fluxMag = Math.max(Math.abs(fine), Math.abs(coarse));
  const richardsonErr = Math.abs(fine - coarse);
  const ABS_FLOOR = 1e-11;
  const fluxConverged = richardsonErr <= ABS_FLOOR || richardsonErr <= RICHARDSON_TOL * fluxMag;
  const seam = seamDefect(field, 64);
  if (!fluxConverged) {
    const seamSignificant = seam > 1e-4;
    if (!seamSignificant) {
      throw new RangeError(
        `closureResidual: flux quadrature not converged (|\u0394|=${richardsonErr.toExponential(3)} vs flux ${fluxMag.toExponential(3)} at grid ${grid}) and no seam obstruction; refine the grid or smooth the field`
      );
    }
  }
  const residual = Math.abs(fine) + seam;
  return classify(
    residual,
    "POSTULATE",
    void 0,
    "closure residual = |\u222E\u2207\u03A8\xB7dS| (EXACT integral) + seam obstruction; physical reading as frictionlessness is RHUFT POSTULATE; Lucas/Duhamel obstruction \u21D2 never exactly 0"
  );
}
function closureScore(field, torus) {
  const { value } = closureResidual(field, torus);
  return 1 / (1 + value);
}
function minimallyOpenFloor(torus) {
  const shellN = 13;
  const exponent = -26 - 2 * (torus.n - shellN);
  const floor = Scaled.from(Math.pow(torus.aspect, exponent));
  return classify(
    floor,
    tainted("EXACT", "POSTULATE"),
    void 0,
    `Lucas-obstruction floor ~ \u03C6^(${exponent}); \u03C6\u207B\xB2\u2076 base EXACT, \u03C6-scaling POSTULATE`
  );
}

// ../engine/src/geometry/lattice.ts
var cxAdd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
var cxScale = (a, s) => ({ re: a.re * s, im: a.im * s });
var cxExpI = (theta) => ({ re: Math.cos(theta), im: Math.sin(theta) });
function spectralAmplitudes() {
  const out = [];
  for (let k = 0; k < HARMONIC_COUNT; k++) out.push(Math.pow(PHI, -k));
  return out;
}
function goldenPairSum() {
  return PHI_INV + Math.pow(PHI, -2);
}
function spectralWeightSum() {
  const r = PHI_INV;
  return (1 - Math.pow(r, HARMONIC_COUNT)) / (1 - r);
}
function metatronField(torus, p, t = 0) {
  const lines = spectralLines();
  const amps = spectralAmplitudes();
  let acc = { re: 0, im: 0 };
  for (let k = 0; k < HARMONIC_COUNT; k++) {
    const line = lines[k];
    const phase = line * p.u + line * p.v - line * t;
    acc = cxAdd(acc, cxScale(cxExpI(phase), amps[k]));
  }
  return classify(
    acc,
    "POSTULATE",
    void 0,
    "Metatron lattice \u03A3 \u03C6\u207B\u1D4F e^{i(k_k\xB7r\u2212\u03C9_k t)}; math EXACT, physical spectrum POSTULATE"
  );
}
function metatronFieldReal(torus, p, t = 0) {
  return metatronField(torus, p, t).value.re;
}
function initialCondition(torus) {
  const norm = spectralWeightSum();
  return (p) => metatronFieldReal(torus, p, 0) / norm;
}

// ../engine/src/dynamics/memoryKernel.ts
var DEFAULT_LAMBDA = PHI_NEG2;
var MemoryKernel = class _MemoryKernel {
  /** The conservative coupling λ ∈ (0,1). Default φ⁻². */
  lambda;
  /** The recursion time-step τ (informational; scales the golden delay). */
  tau;
  constructor(lambda = DEFAULT_LAMBDA, tau = 1) {
    if (!Number.isFinite(lambda) || lambda <= 0 || lambda >= 1) {
      throw new RangeError(
        `MemoryKernel: lambda must be in the open interval (0,1) for a conservative convex update; got ${lambda}.`
      );
    }
    if (!Number.isFinite(tau) || tau <= 0) {
      throw new RangeError(`MemoryKernel: tau must be a positive finite number; got ${tau}.`);
    }
    this.lambda = lambda;
    this.tau = tau;
  }
  /**
   * One conservative step for a SINGLE node:
   *   next = (1−λ)·psiT + λ·psiTminusTau.
   * The (1−λ) is computed as `1 - this.lambda` directly so the two weights sum
   * to 1 to the last representable bit (no separate literal that could drift).
   */
  step(psiT, psiTminusTau) {
    this.assertFinite(psiT, "psiT");
    this.assertFinite(psiTminusTau, "psiTminusTau");
    return (1 - this.lambda) * psiT + this.lambda * psiTminusTau;
  }
  /**
   * One conservative step for a whole FIELD (per node). The two fields must
   * cover the same node set (equal length). Pure: returns a new array, never
   * mutates the inputs — so callers can keep the history they need for the
   * golden-delay self-overlap in File 12.
   */
  stepField(psiT, psiTminusTau) {
    if (psiT.length !== psiTminusTau.length) {
      throw new RangeError(
        `MemoryKernel.stepField: field length mismatch (present ${psiT.length} vs past ${psiTminusTau.length}); both must sample the same node set.`
      );
    }
    const out = new Array(psiT.length);
    for (let i = 0; i < psiT.length; i++) {
      out[i] = this.step(psiT[i], psiTminusTau[i]);
    }
    return out;
  }
  /**
   * The exact characteristic roots of the recursion: [1, −λ].
   * In the canonical unit-root case λ = φ⁻² these are [1, −φ⁻²].
   * Returned as a fresh tuple each call (no shared mutable state).
   */
  characteristicRoots() {
    return [1, -this.lambda];
  }
  /**
   * ENH-1 (MEMORY_ALGORITHMS §2.2) — the exact N-tap weight `w_k = φ^{1−3k}`.
   * Derivation (not asserted): the author's N-step weights are `λᵏ/φ^{k−1}`.
   * With λ = φ⁻², `λᵏ/φ^{k−1} = φ⁻²ᵏ·φ^{−(k−1)} = φ^{1−3k}`. [EXACT]
   * These telescope to `Σ_{k=1}^{∞} φ^{1−3k} = φ⁻²/(1−φ⁻³) = 1/2` exactly,
   * because `1−φ⁻³ = 2φ⁻²`. Infinitely deep golden memory weighs the whole past
   * at exactly one half — present and past are equal partners in the limit.
   */
  static deepMemoryWeight(k) {
    if (!Number.isInteger(k) || k < 1) {
      throw new RangeError(`MemoryKernel.deepMemoryWeight: k must be an integer \u2265 1; got ${k}.`);
    }
    return Math.pow(PHI, 1 - 3 * k);
  }
  /**
   * The exact infinite-depth weight sum `W_∞ = 1/2`, exposed so tests assert the
   * *identity* (φ⁻²/(1−φ⁻³) = 1/2) rather than a hard literal.
   */
  static deepMemoryTotalWeight() {
    return PHI_NEG2 / (1 - Math.pow(PHI, -3));
  }
  /**
   * ENH-1 (§2.2) — N-tap conservative deep-memory step:
   *
   *     Ψ(t+τ) = (1−W_N)·Ψ(t) + Σ_{k=1}^{N} w_k·Ψ(t−kτ),   w_k = φ^{1−3k},  W_N = Σ w_k.
   *
   * The conservative closure `(1−W_N)` on the present term makes the coefficients
   * sum to 1 for EVERY N — restoring the exact unit root (§2.1 is the N=1 case,
   * since `w_1 = φ^{1−3} = φ⁻² = λ` and `1−W_1 = 1−λ`). `history` is ordered
   * most-recent-first: history[0] = Ψ(t−τ), history[1] = Ψ(t−2τ), … Only the
   * first N entries are used. Convex ⇒ conservative ⇒ bounded by the hull of
   * {Ψ(t)} ∪ history, exactly as the single-step law.
   */
  stepN(psiT, history) {
    this.assertFinite(psiT, "psiT");
    if (history.length === 0) {
      throw new RangeError("MemoryKernel.stepN: history must contain at least \u03A8(t\u2212\u03C4).");
    }
    let wSum = 0;
    let pastSum = 0;
    for (let k = 1; k <= history.length; k++) {
      const h = history[k - 1];
      this.assertFinite(h, `history[${k - 1}]`);
      const w = _MemoryKernel.deepMemoryWeight(k);
      wSum += w;
      pastSum += w * h;
    }
    return (1 - wSum) * psiT + pastSum;
  }
  /**
   * ENH-4 / §2.3 (damped memory, Term II) — the ONLY sanctioned way to fold an
   * external drive into the state, as a NORMALIZED Markovian-embedding update.
   *
   * The canonical damped memory is the integral
   *     M_II[Ψ](t) = λ ∫₀^∞ Ψ(t−s)·γe^{−γs} ds,
   * whose kernel `γe^{−γs}` is normalized (∫ = 1) so the memory strength is λ at
   * every scale — decoupling strength (λ) from depth (1/γ). Its exact computable
   * form is the Markovian embedding
   *     dM/dt = −γ·M + λ·γ·Ψ(t).
   * This method advances that embedding one step with the exact integrating
   * factor (not a forward-Euler guess — strongest-method law §C-15):
   *     M(t+dt) = M(t)·e^{−γdt} + λ·Ψ(t)·(1 − e^{−γdt}).
   * Convex in {M(t), Ψ(t)} ⇒ bounded, conservative envelope preserved; the
   * unstable raw additive form is never reachable.
   *
   * `gamma` = γ (memory decay rate, §2.3 uses γ(n)=ε·ω(n)); `dt` = step; `m` =
   * current memory state; `psiT` = present field value. Returns the new memory
   * state. γ→0 recovers the timeless average, γ→∞ the memoryless limit.
   */
  dampedRegularization(m, psiT, gamma, dt) {
    this.assertFinite(m, "m");
    this.assertFinite(psiT, "psiT");
    if (!Number.isFinite(gamma) || gamma < 0) {
      throw new RangeError(`MemoryKernel.dampedRegularization: gamma must be \u2265 0 finite; got ${gamma}.`);
    }
    if (!Number.isFinite(dt) || dt < 0) {
      throw new RangeError(`MemoryKernel.dampedRegularization: dt must be \u2265 0 finite; got ${dt}.`);
    }
    const decay = Math.exp(-gamma * dt);
    if (gamma === 0) {
      return m;
    }
    return decay * m + this.lambda * (1 - decay) * psiT;
  }
  /**
   * True iff the recursion is in the conservative (unit-root) regime: one root
   * on the unit circle, the other strictly inside. For λ∈(0,1) enforced by the
   * constructor this always holds, so this is a *certificate* rather than a
   * guess — it re-derives the fact from the actual roots.
   */
  isConservative() {
    const [z1, z2] = this.characteristicRoots();
    const onUnit = Math.abs(Math.abs(z1) - 1) < 1e-12;
    const inside = Math.abs(z2) < 1;
    return onUnit && inside;
  }
  assertFinite(x, name) {
    if (!Number.isFinite(x)) {
      throw new RangeError(`MemoryKernel: ${name} must be finite; got ${x}.`);
    }
  }
};

// ../engine/src/analysis/eigenmodes.ts
var TWO_PI2 = 2 * Math.PI;
function eigenSpectrum(field) {
  const n = field.length;
  if (!Number.isInteger(n) || n < 2) {
    throw new RangeError(`eigenSpectrum: field must have \u2265 2 nodes; got ${n}.`);
  }
  let total = 0;
  for (let i = 0; i < n; i++) {
    const v = field[i];
    if (!Number.isFinite(v)) {
      throw new RangeError(`eigenSpectrum: non-finite field value at node ${i}.`);
    }
    total += v * v;
  }
  const half = Math.floor(n / 2);
  const modes = [];
  for (let k = 0; k <= half; k++) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const ang = TWO_PI2 * k * i / n;
      const v = field[i];
      re += v * Math.cos(ang);
      im -= v * Math.sin(ang);
    }
    const fold = k === 0 || n % 2 === 0 && k === half ? 1 : 2;
    const energy = fold * (re * re + im * im) / n;
    const phiWeight = Math.pow(PHI, -k);
    modes.push({
      k,
      eigenvalue: -4 * Math.sin(Math.PI * k / n) ** 2,
      energy,
      amplitude: Math.sqrt(energy),
      phiWeight,
      weighted: energy * phiWeight
    });
  }
  const specTotal = modes.reduce((a, m) => a + m.energy, 0);
  let dominant = null;
  for (let k = 1; k < modes.length; k++) {
    const m = modes[k];
    if (m.energy > 1e-12 && (dominant === null || m.energy > dominant.energy)) dominant = m;
  }
  return {
    nodes: n,
    modes,
    totalEnergy: specTotal,
    parsevalResidual: Math.abs(specTotal - total),
    dominant
  };
}
function dominantModeIndex(field) {
  const s = eigenSpectrum(field);
  return s.dominant ? s.dominant.k : 0;
}

// ../engine/src/dynamics/propagation.ts
var CFL_LIMIT = 1;
var CFL_STABILITY_BOUNDARY = Math.sqrt(12 * 3 / 16);
var MIN_NODES = 5;
var Propagator = class {
  /** The rung this propagator serves. */
  scale;
  /** Wave speed [m/s] — injected; defaults to the rung's canonical v_wave. */
  vWave;
  constructor(scale, vWave = scale.vWave.toFloat64()) {
    if (!Number.isFinite(vWave) || vWave <= 0) {
      throw new RangeError(`Propagator: vWave must be positive and finite; got ${vWave}.`);
    }
    this.scale = scale;
    this.vWave = vWave;
  }
  /** The dimensionless Courant number ν = v·dt/dx. */
  courant(dx, dt) {
    this.assertPositive(dx, "dx");
    this.assertPositive(dt, "dt");
    return this.vWave * dt / dx;
  }
  /** Contract invariant: dt ≤ dx/vWave  ⇔  ν ≤ 1.0 (the operating limit). */
  cflSatisfied(dx, dt) {
    return this.courant(dx, dt) <= CFL_LIMIT + 1e-15;
  }
  /**
   * One damped modified-equation leapfrog step on a PERIODIC node ring.
   * Enforces the operating CFL invariant (ν ≤ 1.0) — the unstable regime is
   * unrepresentable through this entry point (foolproof-by-construction).
   * Pure: returns a fresh array; never mutates inputs.
   */
  step(present, past, dx, dt, gamma = 0) {
    if (!this.cflSatisfied(dx, dt)) {
      throw new RangeError(
        `Propagator.step: CFL violated \u2014 \u03BD = ${this.courant(dx, dt)} > ${CFL_LIMIT}. Require dt \u2264 dx/vWave = ${dx / this.vWave}.`
      );
    }
    return this.stepRaw(present, past, dx, dt, gamma);
  }
  /**
   * The UNGUARDED update — the only sanctioned way to probe beyond the
   * operating limit (mirrors File 9's dampedRegularization pattern: the
   * dangerous path exists solely as an explicit, documented instrument).
   * Used by the acceptance tests to demonstrate the exact ν* = 3/2 boundary.
   */
  stepRaw(present, past, dx, dt, gamma = 0) {
    const n = this.validatePair(present, past);
    this.assertPositive(dx, "dx");
    this.assertPositive(dt, "dt");
    if (!Number.isFinite(gamma) || gamma < 0) {
      throw new RangeError(`Propagator: gamma must be \u2265 0 and finite; got ${gamma}.`);
    }
    const nu2 = this.courant(dx, dt) ** 2;
    const c2 = nu2;
    const c4 = nu2 * nu2 / 12;
    const a = 1 + gamma * dt / 2;
    const b = 1 - gamma * dt / 2;
    const s1 = stencil4(present);
    const s2 = stencil4(s1);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = (2 * present[i] - b * past[i] + c2 * s1[i] + c4 * s2[i]) / a;
    }
    return out;
  }
  /**
   * The order-4 discrete Laplacian Δ₄u = (−u₋₂+16u₋₁−30u₀+16u₊₁−u₊₂)/(12dx²)
   * on the periodic ring — exposed so tests can assert the stencil itself
   * (exactness on low-degree data) independently of time stepping.
   */
  laplacian4(field, dx) {
    this.assertPositive(dx, "dx");
    if (field.length < MIN_NODES) {
      throw new RangeError(`Propagator.laplacian4: need \u2265 ${MIN_NODES} nodes; got ${field.length}.`);
    }
    const s = stencil4(field);
    const inv = 1 / (dx * dx);
    return s.map((x) => x * inv);
  }
  /**
   * Inverse-square emergence — a REAL numerical experiment, not an assertion.
   * A spherically-symmetric wave obeys u_tt = v²(1/r²)(r²u_r)_r; substituting
   * w = r·u reduces it EXACTLY to the 1D wave equation w_tt = v²w_rr with the
   * regularity condition w(0)=0. We launch an outgoing Gaussian pulse, track
   * the wavefront's peak amplitude of u = w/r at successive radii, and fit
   * the power law. Geometry then produces amplitude ∝ 1/r — and therefore
   * intensity ∝ 1/r² — with no 1/r² ever inserted by hand.
   *
   * Runs in scale-free units (the measured exponent is dimensionless and
   * independent of vWave — pure geometry).
   */
  inverseSquareEmergent(gridPoints = 2400, outerRadius = 120) {
    if (!Number.isInteger(gridPoints) || gridPoints < 100) {
      throw new RangeError(`inverseSquareEmergent: gridPoints must be an integer \u2265 100; got ${gridPoints}.`);
    }
    this.assertPositive(outerRadius, "outerRadius");
    const M = gridPoints;
    const dr = outerRadius / M;
    const v = 1;
    const dt = 0.9 * dr;
    const r0 = 10;
    const pulse = (s) => Math.exp(-((s - r0) ** 2) / 2);
    let past = Array.from({ length: M + 1 }, (_, i) => pulse(i * dr));
    let present = Array.from({ length: M + 1 }, (_, i) => pulse(i * dr - v * dt));
    past[0] = present[0] = 0;
    past[M] = present[M] = 0;
    const sampleRadii = [20, 40, 60, 80, 100].filter((r) => r < outerRadius - 10);
    const snapshotSteps = sampleRadii.map((r) => Math.round((r - r0) / (v * dt)));
    const lastStep = Math.max(...snapshotSteps);
    const samples = [];
    const nu2 = (v * dt) ** 2 / (dr * dr);
    for (let step = 0; step <= lastStep; step++) {
      if (snapshotSteps.includes(step)) {
        let peak = 0;
        let peakR = 0;
        for (let i = 1; i < M; i++) {
          const u = Math.abs(present[i] / (i * dr));
          if (u > peak) {
            peak = u;
            peakR = i * dr;
          }
        }
        samples.push([peakR, peak]);
      }
      const next = new Array(M + 1).fill(0);
      for (let i = 1; i < M; i++) {
        const lap = present[i - 1] - 2 * present[i] + present[i + 1];
        next[i] = 2 * present[i] - past[i] + nu2 * lap;
      }
      past = present;
      present = next;
    }
    const xs = samples.map(([r]) => Math.log(r));
    const ys = samples.map(([, a2]) => Math.log(a2));
    const k = xs.length;
    const mx = xs.reduce((s, x) => s + x, 0) / k;
    const my = ys.reduce((s, y) => s + y, 0) / k;
    let num = 0;
    let den = 0;
    for (let i = 0; i < k; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    const slope = num / den;
    return Object.freeze({
      amplitudeExponent: slope,
      intensityExponent: 2 * slope,
      samples: Object.freeze(samples)
    });
  }
  validatePair(present, past) {
    if (present.length !== past.length) {
      throw new RangeError(
        `Propagator: field length mismatch (present ${present.length} vs past ${past.length}).`
      );
    }
    if (present.length < MIN_NODES) {
      throw new RangeError(`Propagator: need \u2265 ${MIN_NODES} nodes for the order-4 stencil; got ${present.length}.`);
    }
    for (let i = 0; i < present.length; i++) {
      if (!Number.isFinite(present[i]) || !Number.isFinite(past[i])) {
        throw new RangeError(`Propagator: non-finite field value at node ${i}.`);
      }
    }
    return present.length;
  }
  assertPositive(x, name) {
    if (!Number.isFinite(x) || x <= 0) {
      throw new RangeError(`Propagator: ${name} must be positive and finite; got ${x}.`);
    }
  }
};
function stencil4(u) {
  const N = u.length;
  const out = new Array(N);
  for (let i = 0; i < N; i++) {
    const m2 = u[(i - 2 + N) % N];
    const m1 = u[(i - 1 + N) % N];
    const p1 = u[(i + 1) % N];
    const p2 = u[(i + 2) % N];
    out[i] = (-m2 + 16 * m1 - 30 * u[i] + 16 * p1 - p2) / 12;
  }
  return out;
}

// ../engine/src/dynamics/selfMeasurement.ts
var GOLDEN_DELAY_FACTOR = PHI;
function assertHistory(h, fn) {
  if (!Number.isFinite(h.tau) || h.tau <= 0) {
    throw new RangeError(`${fn}: tau must be a positive finite number; got ${h.tau}.`);
  }
  if (h.snapshots.length < 2) {
    throw new RangeError(`${fn}: history needs \u2265 2 snapshots to look back a golden delay.`);
  }
  const len = h.snapshots[0].length;
  for (let i = 0; i < h.snapshots.length; i++) {
    const s = h.snapshots[i];
    if (s.length !== len) {
      throw new RangeError(
        `${fn}: snapshot ${i} length ${s.length} \u2260 snapshot 0 length ${len}; all must sample the same node set.`
      );
    }
    for (let j = 0; j < s.length; j++) {
      if (!Number.isFinite(s[j])) {
        throw new RangeError(`${fn}: snapshot ${i} node ${j} is non-finite (${s[j]}).`);
      }
    }
  }
}
function goldenDelayedField(h, tIndex) {
  const nSnap = h.snapshots.length;
  const backIndex = tIndex - GOLDEN_DELAY_FACTOR;
  if (backIndex < 0) {
    throw new RangeError(
      `selfOverlap: golden-delayed time falls before the start of history (tIndex ${tIndex} \u2212 \u03C6 = ${backIndex.toFixed(4)} < 0); supply an earlier snapshot.`
    );
  }
  const lo = Math.floor(backIndex);
  const hi = Math.min(lo + 1, nSnap - 1);
  const frac = backIndex - lo;
  const a = h.snapshots[lo];
  const b = h.snapshots[hi];
  const len = a.length;
  const out = new Array(len);
  for (let j = 0; j < len; j++) {
    out[j] = a[j] + frac * (b[j] - a[j]);
  }
  return out;
}
function selfOverlap(history, tIndex) {
  assertHistory(history, "selfOverlap");
  const now = tIndex ?? history.snapshots.length - 1;
  if (!Number.isFinite(now) || now < 0 || now > history.snapshots.length - 1) {
    throw new RangeError(
      `selfOverlap: tIndex ${now} out of range [0, ${history.snapshots.length - 1}].`
    );
  }
  const present = history.snapshots[Math.round(now)];
  const delayed = goldenDelayedField(history, now);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let j = 0; j < present.length; j++) {
    const a = present[j];
    const b = delayed[j];
    dot += a * b;
    na += a * a;
    nb += b * b;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  const C2 = denom === 0 ? 0 : (dot / denom) ** 2;
  const clamped = Math.min(1, Math.max(0, C2));
  return classify(
    clamped,
    "POSTULATE",
    void 0,
    "C = cos\xB2\u03B8 between \u03A8(t) and \u03A8(t\u2212\u03C6\u03C4); normalization exact, but the golden-delayed field is linearly interpolated between samples (\u03C6\xB7\u03C4 is an irrational index), so the between-sample field is a POSTULATE"
  );
}

// ../engine/src/dynamics/crossScaleFlow.ts
var OCTAVE_STEP = 13;
var LADDER = Object.freeze(stableScalesUpTo(293));
var LADDER_POS = new Map(LADDER.map((n, i) => [n, i]));
function assertOnLadder(n, fn) {
  if (!LADDER_POS.has(n)) {
    throw new RangeError(`${fn}: n=${n} is not a Lucas-stable rung on the ladder (1\u2026293)`);
  }
}
function ladderNeighbors(n) {
  assertOnLadder(n, "ladderNeighbors");
  const i = LADDER_POS.get(n);
  return [i > 0 ? LADDER[i - 1] : null, i < LADDER.length - 1 ? LADDER[i + 1] : null];
}
function octavePartners(n) {
  assertOnLadder(n, "octavePartners");
  return [n - OCTAVE_STEP, n + OCTAVE_STEP];
}

// ../engine/src/information/densityField.ts
var UNIFORM_WEIGHTS = Object.freeze({
  a1: 0.25,
  a2: 0.25,
  a3: 0.25,
  a4: 0.25
});
var WEIGHT_TOL = 1e-9;
function assertWeights(w, fn) {
  const ws = [w.a1, w.a2, w.a3, w.a4];
  for (const a of ws) {
    if (!Number.isFinite(a) || a < 0) {
      throw new RangeError(`${fn}: every weight must be finite and \u2265 0; got [${ws.join(", ")}].`);
    }
  }
  const sum = w.a1 + w.a2 + w.a3 + w.a4;
  if (Math.abs(sum - 1) > WEIGHT_TOL) {
    throw new RangeError(
      `${fn}: weights must sum to 1 (convex mixture), got ${sum} from [${ws.join(", ")}].`
    );
  }
}
var DENSITY_GRID = 64;
function torusMean(shape, grid) {
  let sum = 0;
  for (let i = 0; i < grid; i++) {
    const u = i / grid * 2 * Math.PI;
    for (let j = 0; j < grid; j++) {
      const v = j / grid * 2 * Math.PI;
      const val = shape({ u, v });
      if (!Number.isFinite(val)) {
        throw new RangeError(`densityField: component shape returned non-finite ${val}.`);
      }
      sum += val;
    }
  }
  return sum / (grid * grid);
}
function normalizeToMeanOne(raw, grid, label) {
  const mean = torusMean(raw, grid);
  if (mean < 0) {
    throw new RangeError(`densityField: ${label} shape has negative mean ${mean}; not a density.`);
  }
  if (mean === 0) {
    return () => 1;
  }
  return (p) => raw(p) / mean;
}
function defaultCurvatureShape(n) {
  const torus = torusForScale(n);
  let min = Infinity;
  for (let i = 0; i < DENSITY_GRID; i++) {
    const v = i / DENSITY_GRID * 2 * Math.PI;
    const k = gaussianCurvatureTimesR2(torus, { u: 0, v });
    if (k < min) min = k;
  }
  const floor = -min + 1e-3;
  return (p) => gaussianCurvatureTimesR2(torus, p) + floor;
}
var DensityField = class {
  n;
  weights;
  /** The scale envelope ρ₀φ⁻ⁿ (File 4, EXACT). */
  envelope;
  H;
  // mean-1 entropy shape
  R;
  // mean-1 relation shape
  K;
  // mean-1 curvature shape
  S;
  // mean-1 persistence shape
  shapeProv;
  constructor(n, weights = UNIFORM_WEIGHTS, fields = {}, shapeProv = "POSTULATE", grid = DENSITY_GRID) {
    assertWeights(weights, "DensityField");
    if (!Number.isInteger(grid) || grid < 4) {
      throw new RangeError(`DensityField: grid must be an integer \u2265 4; got ${grid}.`);
    }
    this.n = n;
    this.weights = weights;
    this.envelope = getScale(n).rhoI;
    this.shapeProv = tainted(shapeProv);
    this.H = normalizeToMeanOne(fields.entropy ?? (() => 1), grid, "entropy");
    this.R = normalizeToMeanOne(fields.relation ?? (() => 1), grid, "relation");
    this.K = normalizeToMeanOne(
      fields.curvature ?? defaultCurvatureShape(n),
      grid,
      "curvature"
    );
    this.S = normalizeToMeanOne(fields.persistence ?? (() => 1), grid, "persistence");
  }
  /**
   * The dimensionless mean-1 mixture shape at a point: a₁Ĥ+a₂R̂+a₃K̂+a₄Ŝ.
   * Non-negative (convex combination of non-negative shapes), mean 1 over the
   * torus. This is the spatial modulation; multiply by the envelope for ρ_I.
   */
  shapeAt(x) {
    const { a1, a2, a3, a4 } = this.weights;
    const s = a1 * this.H(x) + a2 * this.R(x) + a3 * this.K(x) + a4 * this.S(x);
    return Math.max(0, s);
  }
  /**
   * ρ_I(x;n) = envelope · shapeAt(x), as a Scaled (the magnitude never leaves
   * exact-exponent arithmetic). Provenance: EXACT envelope tainted by the
   * POSTULATE weights/shapes → POSTULATE overall, honestly reported.
   */
  densityAt(x) {
    const shape = this.shapeAt(x);
    const rho = this.envelope.mul(Scaled.from(shape));
    return classify(
      rho,
      tainted("EXACT", this.shapeProv),
      void 0,
      "\u03C1_I(x;n) = (\u03C1\u2080\u03C6\u207B\u207F envelope, EXACT from File 4) \xD7 (mean-1 convex shape, POSTULATE weights/components); non-negative by construction"
    );
  }
  /** The entropy component density at x (envelope-weighted), a₁Ĥ·ρ_I(n). */
  entropyDensity(x) {
    return this.componentDensity(this.weights.a1, this.H, x, "entropy");
  }
  /** The relation component density at x. */
  relationDensity(x) {
    return this.componentDensity(this.weights.a2, this.R, x, "relation");
  }
  /** The curvature component density at x. */
  curvatureDensity(x) {
    return this.componentDensity(this.weights.a3, this.K, x, "curvature");
  }
  /** The persistence component density at x. */
  persistenceDensity(x) {
    return this.componentDensity(this.weights.a4, this.S, x, "persistence");
  }
  componentDensity(weight, shape, x, label) {
    const val = this.envelope.mul(Scaled.from(Math.max(0, weight * shape(x))));
    return classify(
      val,
      tainted("EXACT", this.shapeProv),
      void 0,
      `${label} component density = a\xB7(mean-1 shape)\xB7\u03C1\u2080\u03C6\u207B\u207F; envelope EXACT, weight/shape POSTULATE`
    );
  }
  /**
   * The integrated total information over the whole torus at this scale:
   * ∫ ρ_I(x;n) dA. With mean-1 shapes and Σaᵢ=1 this equals ρ_I(n)·Area to
   * quadrature accuracy — the envelope is conserved, never inflated. Returned
   * as a Scaled; finite by construction (bounded shape × finite area).
   *
   * The integral uses the torus area from File 5 times the mean shape (≈1).
   * Provenance EXACT up to the POSTULATE shape taint and quadrature.
   */
  fieldIntegral(grid = DENSITY_GRID) {
    let sum = 0;
    for (let i = 0; i < grid; i++) {
      const u = i / grid * 2 * Math.PI;
      for (let j = 0; j < grid; j++) {
        const v = j / grid * 2 * Math.PI;
        sum += this.shapeAt({ u, v });
      }
    }
    const meanShape = sum / (grid * grid);
    const torus = torusForScale(this.n);
    const area = surfaceArea(torus);
    const total = this.envelope.mul(area).mul(Scaled.from(meanShape));
    return classify(
      total,
      tainted("EXACT", this.shapeProv),
      void 0,
      "\u222B\u03C1_I dA = \u03C1\u2080\u03C6\u207B\u207F \xD7 Area \xD7 \u27E8shape\u27E9 (\u27E8shape\u27E9\u22481 by mean-1 normalization); conserves the scale envelope to quadrature accuracy"
    );
  }
};
function envelopeDensity(n) {
  return getScale(n).rhoI;
}

// ../engine/src/refinement/constants.ts
var REFINE_GRADING = PHI * PHI;
var REFINE_THRESHOLD = PHI_NEG2;
var COARSEN_THRESHOLD = PHI_NEG2 * PHI_NEG2;
var BYTES_PER_NODE = 64 * 1024;
var CADENCE_MS = 146;
var TARGET_USAGE = 0.35;

// ../engine/src/refinement/node.ts
var GRADING = REFINE_GRADING;
var CHILDREN_PER_NODE = 4;
function resolvedScaleAt(rootCellSize, level) {
  if (!(rootCellSize > 0) || !Number.isFinite(rootCellSize)) {
    throw new RangeError(`resolvedScaleAt: rootCellSize must be > 0 finite; got ${rootCellSize}.`);
  }
  if (!Number.isInteger(level) || level < 0) {
    throw new RangeError(`resolvedScaleAt: level must be an integer \u2265 0; got ${level}.`);
  }
  const scale = rootCellSize * Math.pow(GRADING, -level);
  return classify(
    scale,
    "POSTULATE",
    void 0,
    `rootCell\xB7\u03C6^(\u22122\xB7${level}); the \u03C6-power is EXACT, its reading as resolved feature size is POSTULATE (Phase 7 measures)`
  );
}
function subdivideCell(cell) {
  if (!(cell.size > 0) || !Number.isFinite(cell.size)) {
    throw new RangeError(`subdivideCell: cell.size must be > 0 finite; got ${cell.size}.`);
  }
  const half = cell.size / 2;
  return [
    Object.freeze({ u0: cell.u0, v0: cell.v0, size: half }),
    // 0: du=0 dv=0
    Object.freeze({ u0: cell.u0, v0: cell.v0 + half, size: half }),
    // 1: du=0 dv=1
    Object.freeze({ u0: cell.u0 + half, v0: cell.v0, size: half }),
    // 2: du=1 dv=0
    Object.freeze({ u0: cell.u0 + half, v0: cell.v0 + half, size: half })
    // 3: du=1 dv=1
  ];
}
function makeNode(cell, level, slot, rootCellSize) {
  if (!Number.isInteger(level) || level < 0) {
    throw new RangeError(`makeNode: level must be an integer \u2265 0; got ${level}.`);
  }
  if (!Number.isInteger(slot) || slot < 0 || slot >= CHILDREN_PER_NODE) {
    throw new RangeError(`makeNode: slot must be an integer in [0,4); got ${slot}.`);
  }
  return Object.freeze({
    level,
    cell: Object.freeze({ ...cell }),
    slot,
    resolvedScale: resolvedScaleAt(rootCellSize, level),
    children: null
  });
}
function withChildren(node, rootCellSize) {
  if (node.children !== null) {
    throw new RangeError("withChildren: node is already internal (children attached).");
  }
  const childCells = subdivideCell(node.cell);
  const children = childCells.map(
    (cell, slot) => makeNode(cell, node.level + 1, slot, rootCellSize)
  );
  return Object.freeze({ ...node, children: Object.freeze(children) });
}
function isLeaf(node) {
  return node.children === null;
}
function isInternal(node) {
  return node.children !== null;
}

// ../engine/src/refinement/octree.ts
function rootCell() {
  return Object.freeze({ u0: 0, v0: 0, size: TWO_PI });
}
var Octree = class _Octree {
  /** The root node (level 0). */
  root;
  /** The root cell size, anchoring the φ² grading for every node. */
  rootCellSize;
  constructor(root, rootCellSize) {
    this.root = root;
    this.rootCellSize = rootCellSize;
    Object.freeze(this);
  }
  /** Build a tree that is a single leaf over the full (u,v) domain. */
  static create() {
    const cell = rootCell();
    return new _Octree(makeNode(cell, 0, 0, cell.size), cell.size);
  }
  /**
   * Refine the leaf at `path` into the strict 2×2 dyadic block.
   * `path` is the sequence of child slots from the root to the target leaf
   * (empty path = the root itself). Returns a NEW tree.
   *
   * Throws if the path does not resolve to a leaf — refining an internal node
   * or a non-existent path is a structural error, never silently ignored.
   */
  refine(path) {
    const newRoot = this.rebuild(this.root, path, 0, "refine");
    return new _Octree(newRoot, this.rootCellSize);
  }
  /**
   * Coarsen the internal node at `path` back into a leaf. Only legal when all
   * four of its children are leaves (the dyadic collapse is total). Returns a
   * NEW tree. Throws otherwise — partial coarsening is not a tree operation.
   */
  coarsen(path) {
    const newRoot = this.rebuild(this.root, path, 0, "coarsen");
    return new _Octree(newRoot, this.rootCellSize);
  }
  /**
   * Rebuild the tree, applying `op` at the node addressed by `path[depth..]`.
   * Structural sharing: untouched subtrees are returned by reference, so a
   * refine/coarsen copies only the spine from root to target — O(depth), not
   * O(nodes). This is what keeps per-tick adaptivity within the cadence budget.
   */
  rebuild(node, path, depth, op) {
    if (depth === path.length) {
      if (op === "refine") {
        if (!isLeaf(node)) {
          throw new RangeError("refine: target is not a leaf (already refined).");
        }
        return withChildren(node, this.rootCellSize);
      }
      if (!isInternal(node)) {
        throw new RangeError("coarsen: target is not internal (nothing to collapse).");
      }
      const kids2 = node.children;
      if (!kids2.every((k) => k !== null && isLeaf(k))) {
        throw new RangeError(
          "coarsen: not all children are leaves \u2014 collapse must be total (dyadic invariant)."
        );
      }
      const { children: _drop, ...leaf } = node;
      return Object.freeze({ ...leaf, children: null });
    }
    if (!isInternal(node)) {
      throw new RangeError(
        `${op}: path descends through a leaf at depth ${depth} (path longer than tree).`
      );
    }
    const slot = path[depth];
    if (!Number.isInteger(slot) || slot < 0 || slot >= CHILDREN_PER_NODE) {
      throw new RangeError(`${op}: path slot ${slot} at depth ${depth} is not in [0,4).`);
    }
    const kids = node.children;
    const newKids = kids.map(
      (k, i) => i === slot ? this.rebuild(k, path, depth + 1, op) : k
    );
    return Object.freeze({ ...node, children: Object.freeze(newKids) });
  }
  // ── traversal & linearisation ──────────────────────────────────────────────
  /**
   * LEVEL-ORDER LINEARISATION — breadth-first, so each level is one contiguous
   * run. This is the cache-friendly memory layout the per-tick governor loop
   * walks: reading nodes in address order touches memory sequentially.
   * Returns the nodes in linearisation order (root first).
   */
  linearise() {
    const out = [];
    const queue = [this.root];
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      out.push(node);
      if (isInternal(node)) {
        for (const child of node.children) queue.push(child);
      }
    }
    return Object.freeze(out);
  }
  /**
   * Iterate the LEAVES (the nodes that carry the field) in linearisation order.
   * The curvature estimator and the field operators run over exactly these.
   */
  leaves() {
    return Object.freeze(this.linearise().filter(isLeaf));
  }
  /** The nodes at exactly `level`, in linearisation order. */
  atLevel(level) {
    if (!Number.isInteger(level) || level < 0) {
      throw new RangeError(`atLevel: level must be an integer \u2265 0; got ${level}.`);
    }
    return Object.freeze(this.linearise().filter((n) => n.level === level));
  }
  /** The maximum depth of the tree (0 = root only). */
  maxDepth() {
    let max = 0;
    for (const n of this.linearise()) if (n.level > max) max = n.level;
    return max;
  }
  /** Total node count (internal + leaves). */
  nodeCount() {
    return this.linearise().length;
  }
  /** Leaf count — the number of field-carrying cells. */
  leafCount() {
    return this.leaves().length;
  }
  /**
   * Look up the node addressed by `path` (slots from the root), or null if the
   * path does not resolve. Bit-shift descent: each slot IS the child index.
   */
  at(path) {
    let node = this.root;
    for (const slot of path) {
      if (!isInternal(node)) return null;
      if (!Number.isInteger(slot) || slot < 0 || slot >= CHILDREN_PER_NODE) return null;
      node = node.children[slot];
    }
    return node;
  }
};

// ../engine/src/refinement/curvature.ts
function discreteLaplacian(patch) {
  const { values, dx, dim } = patch;
  const neighbours = 2 * dim;
  if (values.length !== neighbours + 1) {
    throw new Error(
      `discreteLaplacian: patch needs centre + ${neighbours} neighbours (${neighbours + 1} values), got ${values.length}`
    );
  }
  if (!(dx > 0) || !Number.isFinite(dx)) {
    throw new Error(`discreteLaplacian: dx must be positive finite, got ${dx}`);
  }
  const centre = values[0];
  if (centre === void 0) {
    throw new Error("discreteLaplacian: patch is empty");
  }
  let fluxSum = 0;
  for (let j = 1; j <= neighbours; j++) {
    fluxSum += (values[j] ?? 0) - centre;
  }
  return fluxSum / (dx * dx);
}
function curvatureLambda(patch, floor = AMPLITUDE_FLOOR) {
  if (!(floor >= 0) || !Number.isFinite(floor)) {
    throw new Error(`curvatureLambda: floor must be non-negative finite, got ${floor}`);
  }
  const lap = discreteLaplacian(patch);
  const amp = Math.abs(patch.values[0] ?? 0);
  const denom = amp + floor;
  if (denom === 0) return 0;
  return Math.abs(lap) / denom;
}
var AMPLITUDE_FLOOR = 1e-12;

// ../engine/src/refinement/criterion.ts
function decideRefinement(lambda, lambdaRef) {
  if (!(lambda >= 0) || !Number.isFinite(lambda)) {
    throw new Error(`decideRefinement: lambda must be \u2265 0 finite, got ${lambda}`);
  }
  if (!(lambdaRef > 0) || !Number.isFinite(lambdaRef)) {
    throw new Error(`decideRefinement: lambdaRef must be > 0 finite, got ${lambdaRef}`);
  }
  const refineAt = REFINE_THRESHOLD * lambdaRef;
  const coarsenAt = COARSEN_THRESHOLD * lambdaRef;
  const decision = lambda > refineAt ? "refine" : lambda < coarsenAt ? "coarsen" : "hold";
  return { decision, refineAt, coarsenAt };
}

// ../engine/src/refinement/prolongation.ts
var PROLONGATION_WEIGHT = PHI_NEG2 / 3;
function prolongateBlock(parents) {
  if (parents.length !== 4) {
    throw new RangeError(
      `prolongateBlock: a refined block has exactly 4 parents, got ${parents.length}.`
    );
  }
  for (let i = 0; i < 4; i++) {
    if (!Number.isFinite(parents[i])) {
      throw new RangeError(`prolongateBlock: parent[${i}] is not finite (${parents[i]}).`);
    }
  }
  const w = PROLONGATION_WEIGHT;
  const out = new Array(4);
  for (let j = 0; j < 4; j++) {
    const pj = parents[j];
    let correction = 0;
    for (let s = 0; s < 4; s++) {
      if (s !== j) correction += parents[s] - pj;
    }
    out[j] = pj + w * correction;
  }
  return out;
}
function conservationResidual(parents) {
  const children = prolongateBlock(parents);
  const sumP = parents.reduce((a, b) => a + b, 0);
  const sumC = children.reduce((a, b) => a + b, 0);
  return Math.abs(sumC - sumP);
}
function relativeConservationResidual(parents) {
  const scale = Math.max(1, ...parents.map((x) => Math.abs(x)));
  return conservationResidual(parents) / scale;
}

// ../engine/src/refinement/restriction.ts
var RESTRICTION_WEIGHT = PROLONGATION_WEIGHT;
var SIBLINGS = 3;
function restrictionWeights(slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot > SIBLINGS) {
    throw new RangeError(`restrictionWeights: slot must be an integer in [0,4), got ${slot}.`);
  }
  const w = RESTRICTION_WEIGHT;
  const diag = 1 - SIBLINGS * w;
  const out = new Array(4);
  for (let r = 0; r < 4; r++) out[r] = r === slot ? diag : w;
  return out;
}
function restrictBlock(children) {
  if (children.length !== 4) {
    throw new RangeError(
      `restrictBlock: a coarsened block has exactly 4 children, got ${children.length}.`
    );
  }
  for (let i = 0; i < 4; i++) {
    if (!Number.isFinite(children[i])) {
      throw new RangeError(`restrictBlock: child[${i}] is not finite (${children[i]}).`);
    }
  }
  const w = RESTRICTION_WEIGHT;
  const diag = 1 - SIBLINGS * w;
  const out = new Array(4);
  for (let s = 0; s < 4; s++) {
    let siblings = 0;
    for (let r = 0; r < 4; r++) {
      if (r !== s) siblings += children[r];
    }
    out[s] = diag * children[s] + w * siblings;
  }
  return out;
}
function restrictParent(children, slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot > SIBLINGS) {
    throw new RangeError(`restrictParent: slot must be an integer in [0,4), got ${slot}.`);
  }
  return restrictBlock(children)[slot];
}
function restrictPartial(children, slots) {
  const full = restrictBlock(children);
  const out = children.slice();
  for (const slot of slots) {
    if (!Number.isInteger(slot) || slot < 0 || slot > SIBLINGS) {
      throw new RangeError(`restrictPartial: slot must be an integer in [0,4), got ${slot}.`);
    }
    out[slot] = full[slot];
  }
  return out;
}
function roundTripDefect(parents) {
  const w = RESTRICTION_WEIGHT;
  if (parents.length !== 4) {
    throw new RangeError(`roundTripDefect: expected 4 parents, got ${parents.length}.`);
  }
  for (let i = 0; i < 4; i++) {
    if (!Number.isFinite(parents[i])) {
      throw new RangeError(`roundTripDefect: parent[${i}] is not finite (${parents[i]}).`);
    }
  }
  const diagP = 1 - SIBLINGS * w;
  const prolonged = new Array(4);
  for (let j = 0; j < 4; j++) {
    let siblings = 0;
    for (let s = 0; s < 4; s++) if (s !== j) siblings += parents[s];
    prolonged[j] = diagP * parents[j] + w * siblings;
  }
  const restricted = restrictBlock(prolonged);
  let maxDefect = 0;
  for (let s = 0; s < 4; s++) {
    maxDefect = Math.max(maxDefect, Math.abs(restricted[s] - parents[s]));
  }
  return maxDefect;
}
function relativeRoundTripDefect(parents) {
  const scale = Math.max(1, ...parents.map((x) => Math.abs(x)));
  return roundTripDefect(parents) / scale;
}
function energyRatio(children) {
  const restricted = restrictBlock(children);
  const n2 = (a) => a.reduce((s, x) => s + x * x, 0);
  const before = n2(children);
  if (before === 0) return 1;
  return n2(restricted) / before;
}
function restrictionConservationResidual(children) {
  const parents = restrictBlock(children);
  const sumC = children.reduce((a, b) => a + b, 0);
  const sumP = parents.reduce((a, b) => a + b, 0);
  return Math.abs(sumP - sumC);
}
function relativeRestrictionResidual(children) {
  const scale = Math.max(1, ...children.map((x) => Math.abs(x)));
  return restrictionConservationResidual(children) / scale;
}

// ../engine/src/refinement/adaptiveMesh.ts
var TWO_PI3 = 2 * Math.PI;
var AdaptiveMesh = class {
  _tree;
  /** Field value at each leaf, aligned with _tree.leaves(). */
  _values;
  /** Guard against runaway depth in pathological fields (anti-thrash). */
  _maxDepth;
  /** The base level the mesh is seeded at (the coarsest it ever coarsens to). */
  _baseLevel;
  /**
   * @param baseLevel  The mesh is seeded at a uniform grid this many levels
   *                   deep, and never coarsens below it. This is REQUIRED: at
   *                   the bare root (one cell spanning the whole 2π domain) the
   *                   periodic face-neighbours of a leaf wrap to the leaf's own
   *                   centre, so the flux-form Laplacian is identically zero and
   *                   curvature can never be seen. A base level ≥ 1 makes the
   *                   patch neighbours distinct — real AMR seeds a base grid for
   *                   exactly this reason.
   * @param maxDepth   Anti-thrash ceiling on total depth.
   */
  constructor(baseLevel = 2, maxDepth = 5) {
    if (!Number.isInteger(baseLevel) || baseLevel < 1) {
      throw new RangeError(`AdaptiveMesh: baseLevel must be an integer \u2265 1; got ${baseLevel}.`);
    }
    if (!Number.isInteger(maxDepth) || maxDepth < baseLevel) {
      throw new RangeError(`AdaptiveMesh: maxDepth must be \u2265 baseLevel (${baseLevel}); got ${maxDepth}.`);
    }
    this._baseLevel = baseLevel;
    this._maxDepth = maxDepth;
    this._tree = this._seed(baseLevel);
    this._values = this._tree.leaves().map(() => 0);
  }
  /** Build the uniform base grid: refine every leaf down to depth `level`. */
  _seed(level) {
    let tree = Octree.create();
    for (let l = 0; l < level; l++) {
      const paths = tree.leaves().map((leaf) => this._pathToIn(tree, leaf));
      for (const p of paths) tree = tree.refine(p);
    }
    return tree;
  }
  /** The current tree (read-only). */
  get tree() {
    return this._tree;
  }
  /**
   * Advance the mesh one step against the live field.
   *
   * @param fieldAt  Reads the field at a (u,v) point of the torus domain. The
   *                 engine loop passes the ring read; tests may pass any field.
   * @returns The measured snapshot after this step.
   */
  update(fieldAt) {
    const leaves = this._tree.leaves();
    const maxAmp = leaves.reduce((a, _l, i) => Math.max(a, Math.abs(this._values[i] ?? 0)), 0);
    const lambdas = leaves.map(
      (leaf, i) => this._leafLambda(leaf, this._values[i] ?? 0, fieldAt, maxAmp)
    );
    const maxLambda = lambdas.reduce((a, b) => Math.max(a, b), 0);
    let refined = 0;
    let coarsened = 0;
    let conservationResidual2 = 0;
    let restrictionResidual = 0;
    if (maxLambda > 0) {
      const decisions = leaves.map((leaf, i) => ({
        leaf,
        path: this._pathTo(leaf),
        ...decideRefinement(lambdas[i], maxLambda)
      }));
      for (const d of decisions) {
        if (d.decision !== "refine" || d.path === null) continue;
        if (d.leaf.level >= this._maxDepth) continue;
        const node = this._at(d.path);
        if (!node || !isLeaf(node)) continue;
        const childCentres = this._childCentreSamples(node, fieldAt);
        conservationResidual2 = Math.max(
          conservationResidual2,
          relativeConservationResidual(childCentres)
        );
        const childValues = prolongateBlock(childCentres);
        this._tree = this._tree.refine(d.path);
        this._spliceValues(d.path, childValues);
        refined++;
      }
      const coarsenVotes = /* @__PURE__ */ new Map();
      for (const d of decisions) {
        if (d.decision !== "coarsen" || d.path === null || d.path.length === 0) continue;
        const parentPath = d.path.slice(0, -1);
        if (parentPath.length < this._baseLevel) continue;
        const key = parentPath.join(",");
        const entry = coarsenVotes.get(key) ?? { parentPath, votes: 0, eligible: true };
        entry.votes++;
        coarsenVotes.set(key, entry);
      }
      for (const { parentPath, votes } of coarsenVotes.values()) {
        if (votes < 4) continue;
        const parent = this._at(parentPath);
        if (!parent || isLeaf(parent)) continue;
        if (!parent.children.every((c) => c && isLeaf(c))) continue;
        const childValues = parent.children.map((c) => {
          const idx = this._leafIndex(c);
          return idx >= 0 ? this._values[idx] ?? 0 : 0;
        });
        restrictBlock(childValues);
        restrictionResidual = Math.max(
          restrictionResidual,
          relativeRestrictionResidual(childValues)
        );
        this._tree = this._tree.coarsen(parentPath);
        coarsened++;
      }
      if (coarsened > 0) this._resample(fieldAt);
    }
    this._resample(fieldAt);
    const curLeaves = this._tree.leaves();
    const leafNodes = curLeaves.map((leaf) => {
      const h = leaf.cell.size;
      const idx = this._leafIndex(leaf);
      return {
        u: leaf.cell.u0 + h / 2,
        v: leaf.cell.v0 + h / 2,
        size: h,
        depth: leaf.level,
        lambda: idx >= 0 ? lambdas[idx] ?? 0 : 0
      };
    });
    return {
      leaves: this._tree.leafCount(),
      nodes: this._tree.nodeCount(),
      depth: this._tree.maxDepth(),
      maxLambda,
      refined,
      coarsened,
      conservationResidual: conservationResidual2,
      restrictionResidual,
      refineThreshold: REFINE_THRESHOLD,
      coarsenThreshold: COARSEN_THRESHOLD,
      leafNodes
    };
  }
  /** Reset to the uniform base grid (the coarsest non-degenerate state). */
  reset() {
    this._tree = this._seed(this._baseLevel);
    this._values = this._tree.leaves().map(() => 0);
  }
  // ── internals ──────────────────────────────────────────────────────────────
  /**
   * Curvature λ at a leaf centre, from its four face-neighbour samples.
   * Neighbours are read from the field at the leaf's ±cell-size offsets (the
   * conservative flux-form patch), with the domain treated as periodic in u.
   *
   * The λ normaliser is the FIELD'S OWN max amplitude (`maxAmp`), not the
   * leaf's local |Ψ|. This is the scale-invariant choice: a localised feature
   * sitting on a near-zero background (a Gaussian bump, a shock) would, under
   * a local |Ψ|+floor normaliser, divide a real ∇²Ψ by ≈0 on the tails and
   * send λ to ~1e9 there — refining the flat tails instead of the feature.
   * Normalising by the field max makes λ dimensionless AND bounded, so the
   * refine signal concentrates where curvature is genuinely large relative to
   * the field's own scale. `curvatureLambda` is given `maxAmp` as its floor so
   * the ratio is λ = |∇²Ψ| / (|Ψ_centre| + maxAmp).
   */
  _leafLambda(leaf, centre, fieldAt, maxAmp) {
    const h = leaf.cell.size;
    const uc = leaf.cell.u0 + h / 2;
    const vc = leaf.cell.v0 + h / 2;
    const wrap = (x) => (x % TWO_PI3 + TWO_PI3) % TWO_PI3;
    const patch = {
      values: [
        centre,
        fieldAt({ u: wrap(uc + h), v: vc }),
        // +u
        fieldAt({ u: wrap(uc - h), v: vc }),
        // −u
        fieldAt({ u: uc, v: vc + h }),
        // +v
        fieldAt({ u: uc, v: vc - h })
        // −v
      ],
      dx: h,
      dim: 2
    };
    return curvatureLambda(patch, maxAmp);
  }
  /** The slot-path from the root of the CURRENT tree to `target`. */
  _pathTo(target) {
    return this._pathToIn(this._tree, target);
  }
  /** The slot-path from the root of `tree` to `target`, or null if absent. */
  _pathToIn(tree, target) {
    const path = [];
    let found = false;
    const walk = (node) => {
      if (found) return;
      if (node === target) {
        found = true;
        return;
      }
      if (!isLeaf(node) && node.children) {
        for (let s = 0; s < node.children.length; s++) {
          path.push(s);
          walk(node.children[s]);
          if (found) return;
          path.pop();
        }
      }
    };
    walk(tree.root);
    return found ? path : null;
  }
  /** The node at `path` from the root, or null if the path does not resolve. */
  _at(path) {
    let node = this._tree.root;
    for (const slot of path) {
      if (isLeaf(node) || !node.children) return null;
      node = node.children[slot];
    }
    return node;
  }
  /**
   * The index of `target` within the CURRENT tree's leaves(), or −1 if it is
   * not a current leaf. Identity match (leaves() returns the live node
   * references), used to read a coarsening block's child values from the
   * aligned `_values` array before the collapse drops them.
   */
  _leafIndex(target) {
    const leaves = this._tree.leaves();
    for (let i = 0; i < leaves.length; i++) {
      if (leaves[i] === target) return i;
    }
    return -1;
  }
  /**
   * Replace the leaf at `path` by its four refined children, splicing the
   * prolongated child values into the aligned `_values` array.
   */
  _spliceValues(path, childValues) {
    const leaves = this._tree.leaves();
    let idx = -1;
    for (let i = 0; i < leaves.length; i++) {
      const p = this._pathTo(leaves[i]);
      if (p !== null && p.length === path.length && p.every((s, j) => s === path[j])) {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      this._values = this._tree.leaves().map(() => 0);
      return;
    }
    const next = this._values.slice();
    next.splice(idx, 1, ...childValues);
    this._values = next;
  }
  /** Re-read every leaf value from the live field (mesh observes the field). */
  _resample(fieldAt) {
    this._values = this._tree.leaves().map(
      (leaf) => fieldAt({ u: leaf.cell.u0 + leaf.cell.size / 2, v: leaf.cell.v0 + leaf.cell.size / 2 })
    );
  }
  /**
   * Sample the field at the four child-cell centres of `leaf` — the same
   * geometric points sampleChildCentres reads once the node is internal, but
   * computable while the node is still a leaf (pre-refine). Slot order matches
   * subdivideCell: (du,dv) = (0,0),(0,1),(1,0),(1,1).
   */
  _childCentreSamples(leaf, fieldAt) {
    const half = leaf.cell.size / 2;
    const quarter = half / 2;
    const { u0, v0 } = leaf.cell;
    return [
      fieldAt({ u: u0 + quarter, v: v0 + quarter }),
      // 0: du=0 dv=0
      fieldAt({ u: u0 + quarter, v: v0 + half + quarter }),
      // 1: du=0 dv=1
      fieldAt({ u: u0 + half + quarter, v: v0 + quarter }),
      // 2: du=1 dv=0
      fieldAt({ u: u0 + half + quarter, v: v0 + half + quarter })
      // 3: du=1 dv=1
    ];
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AdaptiveMesh,
  C,
  CADENCE_MS,
  CFL_LIMIT,
  CFL_STABILITY_BOUNDARY,
  COARSEN_THRESHOLD,
  CONTINUATION,
  DensityField,
  LADDER,
  MAX_RESOLUTION,
  METATRON_SHELL,
  MemoryKernel,
  PHI,
  PHI_INV,
  PHI_NEG2,
  PHI_NEG26,
  PLANCK_LENGTH,
  PROLONGATION_WEIGHT,
  Propagator,
  REFINE_GRADING,
  REFINE_THRESHOLD,
  RESOLUTION_LADDER,
  RESTRICTION_WEIGHT,
  STABLE_SCALES,
  Scaled,
  TARGET_USAGE,
  UNRESOLVED,
  allScales,
  binetDefect,
  closureResidual,
  closureResidueMin,
  closureScore,
  dominantModeIndex,
  eigenSpectrum,
  energyRatio,
  envelopeDensity,
  fibonacci,
  getScale,
  goldenPairSum,
  initialCondition,
  isClosed,
  isRung,
  isStable,
  ladderNeighbors,
  lucas,
  lucasResidue,
  metatronShellFlux,
  minimallyOpenFloor,
  nearestRung,
  octavePartners,
  prolongateBlock,
  relativeConservationResidual,
  relativeRestrictionResidual,
  relativeRoundTripDefect,
  restrictBlock,
  restrictParent,
  restrictPartial,
  restrictionConservationResidual,
  restrictionWeights,
  roundTripDefect,
  selfOverlap,
  spectralAmplitudes,
  spectralLines,
  spectralWeightSum,
  stableScalesUpTo,
  surfaceArea,
  torusForScale
});
