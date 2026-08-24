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
var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

// ../omega/packages/trnn-core/src/index.ts
var src_exports = {};
__export(src_exports, {
  ABSTENTION_TARGET: () => ABSTENTION_TARGET,
  ACCEPT_SIMILARITY: () => ACCEPT_SIMILARITY,
  ACI_ALPHA: () => ACI_ALPHA,
  ACI_GAMMA: () => ACI_GAMMA,
  ACI_WINDOW: () => ACI_WINDOW,
  AdaptiveConformal: () => AdaptiveConformal,
  BIAS_TOTAL: () => BIAS_TOTAL,
  BLADES: () => BLADES,
  BLADE_NAMES: () => BLADE_NAMES,
  BRAID_MULTIPLICITY: () => BRAID_MULTIPLICITY,
  BcmThreshold: () => BcmThreshold,
  BoundedEigenvalue: () => BoundedEigenvalue,
  CAPACITY_PROFILES: () => CAPACITY_PROFILES,
  CAPTURE_FLOOR: () => CAPTURE_FLOOR,
  CARRIER_DIM: () => CARRIER_DIM,
  CARRIER_N: () => CARRIER_N,
  CELL: () => CELL,
  CHECKPOINT_PERIOD: () => CHECKPOINT_PERIOD,
  CHILD_SIZES: () => CHILD_SIZES,
  CLAMP_MAX: () => CLAMP_MAX,
  CLEANUP_FAN_IN: () => CLEANUP_FAN_IN,
  CLEANUP_Z_FLOOR: () => CLEANUP_Z_FLOOR,
  COHERENCE_DELAY: () => COHERENCE_DELAY,
  COHERENCE_DELAY_LADDER: () => COHERENCE_DELAY_LADDER,
  COHERENCE_GATE: () => COHERENCE_GATE,
  CONSOLIDATION_COS: () => CONSOLIDATION_COS,
  CORRIDOR: () => CORRIDOR,
  COVERAGE_TARGET: () => COVERAGE_TARGET,
  CleanupMemory: () => CleanupMemory,
  CoherenceMeter: () => CoherenceMeter,
  ConceptStore: () => ConceptStore,
  Corpus: () => Corpus,
  CorridorGate: () => CorridorGate,
  DEFAULT_BANDS: () => DEFAULT_BANDS,
  DEFAULT_DEPTH: () => DEFAULT_DEPTH,
  DEFAULT_HEADROOM: () => DEFAULT_HEADROOM,
  DENSE_CORE: () => DENSE_CORE,
  DENSE_CORE_COUNT: () => DENSE_CORE_COUNT,
  DRIVE_SLOTS: () => DRIVE_SLOTS,
  DiagonalRLS: () => DiagonalRLS,
  DiagonalSSM: () => DiagonalSSM,
  Digest: () => Digest,
  DigestChain: () => DigestChain,
  EMPIRICAL_CONSTANTS: () => EMPIRICAL_CONSTANTS,
  ENV: () => ENV,
  EngineHost: () => EngineHost,
  FIB_SPINE: () => FIB_SPINE,
  FILTER_RHO_MAX: () => FILTER_RHO_MAX,
  FLUX_CLOSURE_TOLERANCE: () => FLUX_CLOSURE_TOLERANCE,
  FLUX_SINK: () => FLUX_SINK,
  FLUX_WINDOW_HI: () => FLUX_WINDOW_HI,
  FLUX_WINDOW_LO: () => FLUX_WINDOW_LO,
  FluxLedger: () => FluxLedger,
  FractalPool: () => FractalPool,
  GENOME_VERSION: () => GENOME_VERSION,
  GOLDEN_BASELINE: () => GOLDEN_BASELINE,
  GOLDEN_CASES: () => GOLDEN_CASES,
  GenomeLedger: () => GenomeLedger,
  IGNITION_THRESHOLD: () => IGNITION_THRESHOLD,
  ISS_DRIVE_BOUND: () => ISS_DRIVE_BOUND,
  ISS_ENVELOPE: () => ISS_ENVELOPE,
  ISS_GAIN: () => ISS_GAIN,
  ISS_INPUT_SUM: () => ISS_INPUT_SUM,
  ISS_SLACK: () => ISS_SLACK,
  InputGain: () => InputGain,
  JURY_GAIN: () => JURY_GAIN,
  JURY_GAIN_REFERENCE: () => JURY_GAIN_REFERENCE,
  KAPPA: () => KAPPA,
  KAPPA_PHASE: () => KAPPA_PHASE,
  KERNEL_LAMBDA: () => KERNEL_LAMBDA,
  LADDER: () => LADDER,
  LADDER_ANCHOR: () => LADDER_ANCHOR,
  LADDER_MAX_N: () => LADDER_MAX_N,
  LAMBDA_MAX: () => LAMBDA_MAX,
  LAMBDA_MEMORY: () => LAMBDA_MEMORY,
  LEARN_BUDGET: () => LEARN_BUDGET,
  LONG_GAP_SWEEPS: () => LONG_GAP_SWEEPS,
  LUCAS_MOD13_PERIOD: () => LUCAS_MOD13_PERIOD,
  LearnableCell: () => LearnableCell,
  MAX_DEPTH: () => MAX_DEPTH,
  MAX_HZ: () => MAX_HZ,
  MAX_LOOP_GAIN: () => MAX_LOOP_GAIN,
  MEMORY_STRIDE: () => MEMORY_STRIDE,
  MIND_STRIDE: () => MIND_STRIDE,
  MIN_HZ: () => MIN_HZ,
  MIN_PAIRED: () => MIN_PAIRED,
  MIN_SNAPSHOTS: () => MIN_SNAPSHOTS,
  MODALITY_NONE: () => MODALITY_NONE,
  MSC_MIN_SEGMENTS: () => MSC_MIN_SEGMENTS,
  MerkleLog: () => MerkleLog,
  Mind: () => Mind,
  MultiTorusEngine: () => MultiTorusEngine,
  NODE_LADDER: () => NODE_LADDER,
  NOVELTY_THRESHOLD: () => NOVELTY_THRESHOLD,
  NodeOrgans: () => NodeOrgans,
  NuisanceLearner: () => NuisanceLearner,
  OctaveScratch: () => OctaveScratch,
  OrderingMonitor: () => OrderingMonitor,
  PARTIAL_ACCEPT: () => PARTIAL_ACCEPT,
  PHASE_ORDER: () => PHASE_ORDER,
  PHI: () => PHI,
  PHI_INV: () => PHI_INV,
  PHI_INV_7: () => PHI_INV_7,
  PLV_EDGE_FRACTION: () => PLV_EDGE_FRACTION,
  PLV_MIN_SAMPLES: () => PLV_MIN_SAMPLES,
  PROFILES: () => PROFILES,
  PROFILES_BY_TIER: () => PROFILES_BY_TIER,
  PROFILE_ORDER: () => PROFILE_ORDER,
  PROMOTION_THRESHOLD: () => PROMOTION_THRESHOLD,
  PROOF_LATENCY_BUDGET_MS: () => PROOF_LATENCY_BUDGET_MS,
  PSI: () => PSI,
  PhiCoherenceKernel: () => PhiCoherenceKernel,
  QUADRATIC_CAP: () => QUADRATIC_CAP,
  RADIAL_GAIN_MAX: () => RADIAL_GAIN_MAX,
  RECOVERY_BUDGET: () => RECOVERY_BUDGET,
  RESIDUAL_FACTOR: () => RESIDUAL_FACTOR,
  RESONANCE_FLOOR: () => RESONANCE_FLOOR,
  RegressionForest: () => RegressionForest,
  RunLedger: () => RunLedger,
  SENSE_BOUND: () => SENSE_BOUND2,
  SHIP_MARGIN: () => SHIP_MARGIN,
  SHORT_GAP_SWEEPS: () => SHORT_GAP_SWEEPS,
  SIGNATURE_MODES: () => SIGNATURE_MODES,
  SPECTRUM_VERSION: () => SPECTRUM_VERSION,
  STABLE_RESIDUES: () => STABLE_RESIDUES,
  STAT_FLOOR: () => STAT_FLOOR,
  STRESS_THRESHOLD: () => STRESS_THRESHOLD,
  SUSTAIN_TICKS: () => SUSTAIN_TICKS,
  SWEEP_NAMES: () => SWEEP_NAMES,
  SeedStream: () => SeedStream,
  SelfModel: () => SelfModel,
  SensoryNodeArray: () => SensoryNodeArray,
  SensoryPlane: () => SensoryPlane,
  SimplexGain: () => SimplexGain,
  SingleTorusEngine: () => SingleTorusEngine,
  SpectralFilter: () => SpectralFilter,
  SpectralSite: () => SpectralSite,
  SuperpositionMixer: () => SuperpositionMixer,
  T1_MIN_LIMITS: () => T1_MIN_LIMITS,
  TABLE: () => TABLE,
  TAPE_BOUND: () => TAPE_BOUND,
  TAPE_WRITE_WEIGHT: () => TAPE_WRITE_WEIGHT,
  TenSweepProtocol: () => TenSweepProtocol,
  TorusBraid: () => TorusBraid,
  TranscriptionTape: () => TranscriptionTape,
  TuringTape: () => TuringTape,
  abstentionBattery: () => abstentionBattery,
  abstentionGate: () => abstentionGate,
  algSigmoid: () => algSigmoid,
  algSigmoidPrime: () => algSigmoidPrime,
  analyticExpectedC: () => analyticExpectedC,
  analyze: () => analyze,
  angularDistance: () => angularDistance,
  angularPower: () => angularPower,
  applyBladeGain: () => applyBladeGain,
  applyRotor: () => applyRotor,
  applySparse: () => applySparse,
  applySpectralAttention: () => applySpectralAttention,
  assertIndex: () => assertIndex,
  at: () => at,
  bandPLV: () => bandPLV,
  bandTarget: () => bandTarget,
  base64ToBytes: () => base64ToBytes,
  benchmarkThroughput: () => benchmarkThroughput,
  bind: () => bind,
  blendWithResonance: () => blendWithResonance,
  boundField: () => boundField,
  boundaryFlux: () => boundaryFlux,
  braidBeta: () => braidBeta,
  buildBasis: () => buildBasis,
  buildCoupling: () => buildCoupling,
  buildModes: () => buildModes,
  buildRadialBasis: () => buildRadialBasis,
  buildRingLaplacian: () => buildRingLaplacian,
  buildSphericalBasis: () => buildSphericalBasis,
  buildWindow: () => buildWindow,
  bundle: () => bundle,
  butterBandpass: () => butterBandpass,
  bytesToBase64: () => bytesToBase64,
  calibrate: () => calibrate,
  canonicalJson: () => canonicalJson,
  carrierPack: () => carrierPack,
  carrierUnpack: () => carrierUnpack,
  cellStep: () => cellStep,
  certify: () => certify,
  chanceSigma: () => chanceSigma,
  checkMorphism: () => checkMorphism,
  childBytes: () => childBytes,
  chordOffsets: () => chordOffsets,
  circularPhaseDev: () => circularPhaseDev,
  clamp01: () => clamp012,
  clampField: () => clampField,
  cloneField: () => cloneField,
  closureObstructionHolds: () => closureObstructionHolds,
  closureTarget: () => closureTarget,
  coeffBuffer: () => coeffBuffer,
  coherenceDelayForRank: () => coherenceDelayForRank,
  conjugateHv: () => conjugateHv,
  copyField: () => copyField,
  correlationReport: () => correlationReport,
  corridor: () => corridor,
  costMultiplier: () => costMultiplier,
  countBuildWork: () => countBuildWork,
  couplingWeight: () => couplingWeight,
  coverageGate: () => coverageGate,
  createChildField: () => createChildField,
  createField: () => createField,
  createLattice: () => createLattice,
  createMultiVectorField: () => createMultiVectorField,
  crossCorrelate: () => crossCorrelate,
  decimate: () => decimate,
  decodePosition: () => decodePosition,
  decodeRole: () => decodeRole,
  depthRate: () => depthRate,
  describeEngine: () => describeEngine,
  dft: () => dft,
  diffusionTarget: () => diffusionTarget,
  digestValues: () => digestValues,
  directedReport: () => directedReport,
  distance: () => distance,
  distanceCorrelation: () => distanceCorrelation,
  dmlPartialLinear: () => dmlPartialLinear,
  emittedMass: () => emittedMass,
  emptyRoot: () => emptyRoot,
  encodeAudio: () => encodeAudio,
  encodeGrid: () => encodeGrid,
  encodeRecord: () => encodeRecord,
  encodeScalars: () => encodeScalars,
  encodeSequence: () => encodeSequence,
  encodeText: () => encodeText,
  energy: () => energy,
  enumerateWindows: () => enumerateWindows,
  erfc: () => erfc,
  evaluateProfile: () => evaluateProfile,
  expectedCBias: () => expectedCBias,
  fSurvival: () => fSurvival,
  fft: () => fft,
  fftUnitary: () => fftUnitary,
  fib: () => fib,
  fibBig: () => fibBig,
  fibonacciShell: () => fibonacciShell,
  fibonacciStrides: () => fibonacciStrides,
  fieldFrame: () => fieldFrame,
  fitDmd: () => fitDmd,
  fluxFirstInWindow: () => fluxFirstInWindow,
  fromHex: () => fromHex,
  fromUtf8: () => fromUtf8,
  fuseChannels: () => fuseChannels,
  fuseResonance: () => fuseResonance,
  gaussianMI: () => gaussianMI,
  gccPhat: () => gccPhat,
  generalEigenvalues: () => generalEigenvalues,
  geometricProduct: () => geometricProduct,
  get: () => get,
  goldenGate: () => goldenGate,
  goldenPhase: () => goldenPhase,
  goldenStride: () => goldenStride,
  grangerCausality: () => grangerCausality,
  hann: () => hann,
  harmonicLadder: () => harmonicLadder,
  hashEquals: () => hashEquals,
  hashLeaf: () => hashLeaf,
  hashNode: () => hashNode,
  headBytes: () => headBytes,
  heartbeatGaps: () => heartbeatGaps,
  heartbeatSchedule: () => heartbeatSchedule,
  hessenberg: () => hessenberg,
  hilbertAnalytic: () => hilbertAnalytic,
  hsic: () => hsic,
  identityHv: () => identityHv,
  inner: () => inner,
  invNormalCdf: () => invNormalCdf,
  isFibonacci: () => isFibonacci,
  isFiniteField: () => isFiniteField,
  isInertWindow: () => isInertWindow,
  isStableByLucas: () => isStableByLucas,
  isStableByResidue: () => isStableByResidue,
  isStableRung: () => isStableRung,
  jacobiEigen: () => jacobiEigen,
  joglekarWindow: () => joglekarWindow,
  kendallTauB: () => kendallTauB,
  kernelRoots: () => kernelRoots,
  keyPairFromSeed: () => keyPairFromSeed,
  lanczosEigenpairs: () => lanczosEigenpairs,
  largestFibonacciAtMost: () => largestFibonacciAtMost,
  latencyGate: () => latencyGate,
  leafBytes: () => leafBytes,
  legendreP: () => legendreP,
  lgamma: () => lgamma,
  lucasBig: () => lucasBig,
  lucasLine: () => lucasLine,
  lucasMod13: () => lucasMod13,
  lucasMod13Cycle: () => lucasMod13Cycle,
  magneticPhase: () => magneticPhase,
  magnitude: () => magnitude,
  maxNorm: () => maxNorm,
  measureFootprint: () => measureFootprint,
  measureLatency: () => measureLatency,
  measureSpectrum: () => measureSpectrum,
  medianOf: () => medianOf,
  medianPairwise: () => medianPairwise,
  memoryRoots: () => memoryRoots,
  memoryStep: () => memoryStep,
  memristiveStep: () => memristiveStep,
  memristiveVector: () => memristiveVector,
  metatronSpectrum: () => metatronSpectrum,
  minSeparation: () => minSeparation,
  modeLadder: () => modeLadder,
  newField: () => newField,
  nodesForRank: () => nodesForRank,
  normalCdf: () => normalCdf,
  normalScores: () => normalScores,
  normalizeRotor: () => normalizeRotor,
  octaveTransport: () => octaveTransport,
  ojaStep: () => ojaStep,
  olsFit: () => olsFit,
  organBytes: () => organBytes,
  ouInnovation: () => ouInnovation,
  pair: () => pair,
  pearson: () => pearson,
  percentile: () => percentile,
  permutationTest: () => permutationTest,
  permute: () => permute,
  phaseClosureGamma: () => phaseClosureGamma,
  phiPow: () => phiPow,
  phiWeights: () => phiWeights,
  pisotDefect: () => pisotDefect,
  planBands: () => planBands,
  probeHardware: () => probeHardware,
  probeTier1: () => probeTier1,
  probeTier2: () => probeTier2,
  probeTier3: () => probeTier3,
  probeTiers: () => probeTiers,
  profileById: () => profileById,
  profileCost: () => profileCost,
  profileNodes: () => profileNodes,
  project: () => project,
  prolong: () => prolong,
  qrfAttenuation: () => qrfAttenuation,
  qualifies: () => qualifies,
  radialAnalyze: () => radialAnalyze,
  radialGrid: () => radialGrid,
  radialGridSize: () => radialGridSize,
  radialLadderWindow: () => radialLadderWindow,
  radialSynthesize: () => radialSynthesize,
  radialWavenumber: () => radialWavenumber,
  randomHv: () => randomHv,
  rank: () => rank,
  ratedCapacity: () => ratedCapacity,
  rawVector: () => rawVector,
  readState: () => readState,
  realSH: () => realSH,
  recoveryAfterShift: () => recoveryAfterShift,
  regIncBeta: () => regIncBeta,
  residualEnergy: () => residualEnergy,
  restrict: () => restrict,
  reverse: () => reverse,
  rotorFromPlane: () => rotorFromPlane,
  runBattery: () => runBattery,
  runGolden: () => runGolden,
  rungByIndex: () => rungByIndex,
  rungScan: () => rungScan,
  safeLog: () => safeLog,
  sampleTrajectory: () => sampleTrajectory,
  sangerStep: () => sangerStep,
  scaleField: () => scaleField,
  scanRung: () => scanRung,
  scoreAbstention: () => scoreAbstention,
  selectProfile: () => selectProfile,
  senseField: () => senseField,
  sensoryNodeBytes: () => sensoryNodeBytes,
  setRawVector: () => setRawVector,
  shtAnalyze: () => shtAnalyze,
  shtSynthesize: () => shtSynthesize,
  signTreeHead: () => signTreeHead,
  signature: () => signature,
  similarity: () => similarity,
  sns: () => sns,
  sosFilt: () => sosFilt,
  sosFiltFilt: () => sosFiltFilt,
  spearman: () => spearman,
  spectralView: () => spectralView,
  spectrumDigest: () => spectrumDigest,
  sphericalBesselJ: () => sphericalBesselJ,
  stableRungsMod28: () => stableRungsMod28,
  strideSet: () => strideSet,
  substrateParity: () => substrateParity,
  substrateParityHolds: () => substrateParityHolds,
  sweep10Reflection: () => sweep10Reflection,
  sweep1IntakeReplay: () => sweep1IntakeReplay,
  sweep2HdcBinding: () => sweep2HdcBinding,
  sweep3TemporalStamping: () => sweep3TemporalStamping,
  sweep4ContradictionPass: () => sweep4ContradictionPass,
  sweep5PrototypeConsolidation: () => sweep5PrototypeConsolidation,
  sweep6CausalAttribution: () => sweep6CausalAttribution,
  sweep7CrossLevelRescoring: () => sweep7CrossLevelRescoring,
  sweep8RedTeam: () => sweep8RedTeam,
  sweep9GovernorCompression: () => sweep9GovernorCompression,
  sweepSchedule: () => sweepSchedule,
  synthesize: () => synthesize,
  thermalLambda: () => thermalLambda,
  tickWorkUnits: () => tickWorkUnits,
  tier0: () => tier0,
  toHex: () => toHex,
  transferEntropyGaussian: () => transferEntropyGaussian,
  transferEntropyScan: () => transferEntropyScan,
  unbind: () => unbind,
  utf8: () => utf8,
  verdictOf: () => verdictOf,
  verifyConsistency: () => verifyConsistency,
  verifyFootprint: () => verifyFootprint,
  verifyInclusion: () => verifyInclusion,
  verifyTreeHead: () => verifyTreeHead,
  webView: () => webView,
  welchMSC: () => welchMSC,
  windowByTopNodes: () => windowByTopNodes,
  windowWork: () => windowWork,
  wrapAt: () => wrapAt,
  wrapPhase: () => wrapPhase,
  zeckendorf: () => zeckendorf,
  zeckendorfOrder: () => zeckendorfOrder,
  zeroField: () => zeroField
});
module.exports = __toCommonJS(src_exports);

// ../omega/packages/trnn-core/src/core/dmath.ts
var PI_HI = 3.141592653589793;
var PI_LO = 12246467991473532e-32;
var HALF_PI = 1.5707963267948966;
var PIO2_1 = 1.5707963267341256;
var PIO2_2 = 6077100506303966e-26;
var PIO2_3 = 20222662487116645e-37;
var PIO2_3T = 8478427660368898e-47;
var LN2_HI = 0.6931471803691238;
var LN2_LO = 19082149292705877e-26;
var LOG2E = 1.4426950408889634;
var scratch = new DataView(new ArrayBuffer(8));
function pow2i(k) {
  if (k >= 1024) return Number.POSITIVE_INFINITY;
  if (k >= -1022) {
    scratch.setBigUint64(0, BigInt(k + 1023) << 52n);
    return scratch.getFloat64(0);
  }
  scratch.setBigUint64(0, 1n << 52n);
  let v = scratch.getFloat64(0);
  for (let i = -1022; i > k; i--) v *= 0.5;
  return v;
}
function frexp2(x) {
  scratch.setFloat64(0, x);
  const bits = scratch.getBigUint64(0);
  let e = Number(bits >> 52n & 0x7ffn);
  if (e === 0) {
    const scaled = x * 18014398509481984;
    scratch.setFloat64(0, scaled);
    const b2 = scratch.getBigUint64(0);
    e = Number(b2 >> 52n & 0x7ffn) - 54;
    scratch.setBigUint64(0, b2 & 0x000fffffffffffffn | 1023n << 52n);
    return { m: scratch.getFloat64(0), e: e - 1023 };
  }
  scratch.setBigUint64(0, bits & 0x000fffffffffffffn | 1023n << 52n);
  return { m: scratch.getFloat64(0), e: e - 1023 };
}
var SIN_C = (() => {
  const c = [];
  let f = 1;
  for (let j = 0; j <= 8; j++) {
    const k = 2 * j + 1;
    if (j > 0) f = f * (k - 1) * k;
    c.push((j % 2 === 0 ? 1 : -1) / f);
  }
  return c;
})();
var COS_C = (() => {
  const c = [];
  let f = 1;
  for (let j = 0; j <= 8; j++) {
    const k = 2 * j;
    if (j > 0) f = f * (k - 1) * k;
    c.push((j % 2 === 0 ? 1 : -1) / f);
  }
  return c;
})();
var EXP_C = (() => {
  const c = [];
  let f = 1;
  for (let k = 0; k <= 17; k++) {
    if (k > 0) f *= k;
    c.push(1 / f);
  }
  return c;
})();
function oddRecip(n) {
  const c = [];
  for (let j = 0; j <= n; j++) c.push(1 / (2 * j + 1));
  return c;
}
var ATANH_C = oddRecip(12);
var ATAN_C = oddRecip(22).map((v, j) => j % 2 === 0 ? v : -v);
function horner(c, z) {
  let s = c[c.length - 1];
  for (let j = c.length - 2; j >= 0; j--) s = c[j] + z * s;
  return s;
}
function sinKernel(r) {
  const z = r * r;
  return r * horner(SIN_C, z);
}
function cosKernel(r) {
  const z = r * r;
  return horner(COS_C, z);
}
function reduceQuadrant(x) {
  const kf = Math.floor(x * (2 / PI_HI) + 0.5);
  let r = x - kf * PIO2_1;
  r -= kf * PIO2_2;
  r -= kf * PIO2_3;
  r -= kf * PIO2_3T;
  let k = kf - Math.floor(kf / 4) * 4;
  if (k < 0) k += 4;
  return { k, r };
}
function dsin(x) {
  if (!Number.isFinite(x)) return NaN;
  if (x === 0) return x;
  const { k, r } = reduceQuadrant(x);
  switch (k) {
    case 0:
      return sinKernel(r);
    case 1:
      return cosKernel(r);
    case 2:
      return -sinKernel(r);
    default:
      return -cosKernel(r);
  }
}
function dcos(x) {
  if (!Number.isFinite(x)) return NaN;
  const { k, r } = reduceQuadrant(x);
  switch (k) {
    case 0:
      return cosKernel(r);
    case 1:
      return -sinKernel(r);
    case 2:
      return -cosKernel(r);
    default:
      return sinKernel(r);
  }
}
function dexp(x) {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.782712893384) return Number.POSITIVE_INFINITY;
  if (x < -745.1332191019411) return 0;
  const k = Math.floor(x * LOG2E + 0.5);
  const r = x - k * LN2_HI - k * LN2_LO;
  let s = EXP_C[EXP_C.length - 1];
  for (let j = EXP_C.length - 2; j >= 0; j--) s = EXP_C[j] + r * s;
  return s * pow2i(k);
}
function dlog(x) {
  if (Number.isNaN(x) || x < 0) return NaN;
  if (x === 0) return Number.NEGATIVE_INFINITY;
  if (!Number.isFinite(x)) return x;
  let { m, e } = frexp2(x);
  if (m > 1.4142135623730951) {
    m *= 0.5;
    e += 1;
  }
  const s = (m - 1) / (m + 1);
  const z = s * s;
  return 2 * s * horner(ATANH_C, z) + e * LN2_HI + e * LN2_LO;
}
function dlog1p(x) {
  if (x > -0.25 && x < 0.5) {
    const s = x / (2 + x);
    const z = s * s;
    return 2 * s * horner(ATANH_C, z);
  }
  return dlog(1 + x);
}
function dpowi(base, n) {
  let e = Math.abs(n | 0);
  let b = base;
  let acc = 1;
  while (e > 0) {
    if (e & 1) acc *= b;
    b *= b;
    e >>= 1;
  }
  return n < 0 ? 1 / acc : acc;
}
function dpow(x, y) {
  if (y === 0) return 1;
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (Number.isInteger(y) && Math.abs(y) <= 1024) return dpowi(x, y);
  if (x === 0) return y > 0 ? 0 : Number.POSITIVE_INFINITY;
  if (x < 0) return NaN;
  const l = dlog(x);
  const lh = splitHi(l);
  const ll = l - lh;
  const yh = splitHi(y);
  const yl = y - yh;
  const p = yh * lh;
  const q = yh * ll + yl * lh + yl * ll;
  return dexp(p) * dexp(q);
}
function splitHi(v) {
  const big = v * 134217729;
  return big - (big - v);
}
function datan(x) {
  if (Number.isNaN(x)) return NaN;
  const sign = x < 0 ? -1 : 1;
  let t = Math.abs(x);
  if (!Number.isFinite(t)) return sign * HALF_PI;
  let offset = 0;
  if (t > 1) {
    t = 1 / t;
    offset = HALF_PI;
  }
  let flip = offset !== 0 ? -1 : 1;
  if (t > 0.2679491924311227) {
    const SQ3 = 1.7320508075688772;
    const t2 = (t * SQ3 - 1) / (t + SQ3);
    const core = atanCore(t2) + 0.5235987755982988;
    return sign * (offset + flip * core);
  }
  return sign * (offset + flip * atanCore(t));
}
function atanCore(t) {
  const z = t * t;
  return t * horner(ATAN_C, z);
}
function datan2(y, x) {
  if (x === 0 && y === 0) return 0;
  if (x > 0) return datan(y / x);
  if (x < 0) return y >= 0 ? datan(y / x) + PI_HI : datan(y / x) - PI_HI;
  return y > 0 ? HALF_PI : -HALF_PI;
}
function dacos(x) {
  if (x >= 1) return 0;
  if (x <= -1) return PI_HI + PI_LO;
  return datan2(Math.sqrt(1 - x * x), x);
}
function datanh(x) {
  if (x >= 1) return Number.POSITIVE_INFINITY;
  if (x <= -1) return Number.NEGATIVE_INFINITY;
  return 0.5 * dlog1p(2 * x / (1 - x));
}
function dtanh(x) {
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e = dexp(2 * x);
  return (e - 1) / (e + 1);
}
function dmag(a, b) {
  return Math.sqrt(a * a + b * b);
}

// ../omega/packages/trnn-core/src/core/constants.ts
var PHI = (1 + Math.sqrt(5)) / 2;
var PHI_INV = PHI - 1;
function phiPow(n) {
  return dpow(PHI, n);
}
var PHI_INV_7 = 0.034441853748633025;
var KAPPA = 1 / (PHI * Math.PI);
var LAMBDA_MEMORY = phiPow(-2);
var CLAMP_MAX = phiPow(4);
var CELL = {
  alpha: phiPow(-2),
  // self / recurrence
  beta: phiPow(-5),
  // geometric drive G
  gamma: phiPow(-3),
  // phase term P
  delta: phiPow(-3),
  // resonance term R
  epsilon: phiPow(-8),
  // Pi (closure) pull
  zeta: phiPow(-3),
  // zhat (prediction) pull
  eta: phiPow(-5),
  // external input U
  mu: phiPow(-5),
  // web / cross-rung V
  xi: phiPow(-5)
  // sensory S
};
var JURY_GAIN = Math.abs(CELL.alpha) + Math.abs(CELL.beta) + 2 * Math.abs(CELL.epsilon) + Math.abs(CELL.zeta);
var JURY_GAIN_REFERENCE = 0.7507764050037855;
var COHERENCE_DELAY = 233;
var IGNITION_THRESHOLD = phiPow(-2);
var CHECKPOINT_PERIOD = 144;
var SIGNATURE_MODES = 13;
var CORRIDOR = {
  stable: phiPow(-1),
  stress: 0.7 * phiPow(-1),
  hysteresis: phiPow(-8),
  gateScales: [1, phiPow(-1), phiPow(-2)]
};
var ISS_INPUT_SUM = Math.abs(CELL.gamma) + Math.abs(CELL.delta) + Math.abs(CELL.eta) + Math.abs(CELL.mu) + Math.abs(CELL.xi);
var ISS_GAIN = ISS_INPUT_SUM / (1 - JURY_GAIN);
var ISS_ENVELOPE = ISS_GAIN;
var ISS_DRIVE_BOUND = CLAMP_MAX;
var COHERENCE_DELAY_LADDER = [
  13,
  21,
  34,
  55,
  89,
  144,
  233,
  233,
  233,
  377,
  377,
  610,
  610,
  987,
  987,
  1597,
  1597,
  2584
];
function coherenceDelayForRank(rank2, clock = "uniform") {
  if (clock === "uniform") return COHERENCE_DELAY;
  const i = Math.max(0, Math.min(COHERENCE_DELAY_LADDER.length - 1, Math.trunc(rank2)));
  return COHERENCE_DELAY_LADDER[i];
}
var ENV = {
  /** Reference temperature of the decoherence map, in the field's own units. */
  temperatureRef: phiPow(3),
  /** Radians of mode-phase bias per unit of magnetic bias. */
  magneticScale: phiPow(-3),
  /** Quantum-reference-frame attenuation exponent divisor (φ^(−n/qrfDivisor)). */
  qrfDivisor: 89
};
function thermalLambda(temperature, lambda = LAMBDA_MEMORY) {
  const t = temperature > 0 ? temperature : 0;
  return t === 0 ? lambda : lambda * dexp(-t / ENV.temperatureRef);
}
function magneticPhase(bias) {
  return bias === 0 ? 0 : bias * ENV.magneticScale;
}
function qrfAttenuation(n) {
  return n === 0 ? 1 : phiPow(-n / ENV.qrfDivisor);
}

// ../omega/packages/trnn-core/src/core/indexing.ts
function assertIndex(i, length, what = "index") {
  if (!Number.isInteger(i)) throw new RangeError(`${what}: ${i} is not an integer`);
  if (i < 0 || i >= length) throw new RangeError(`${what}: ${i} out of range [0, ${length})`);
  return i;
}
function at(xs, i, what = "at") {
  return xs[assertIndex(i, xs.length, what)];
}
function wrapAt(xs, i) {
  const n = xs.length;
  if (n === 0) throw new RangeError("wrapAt: empty");
  return xs[(i % n + n) % n];
}
function get(map, key, what = "get") {
  if (!Object.prototype.hasOwnProperty.call(map, key)) throw new RangeError(`${what}: missing key ${key}`);
  return map[key];
}

// ../omega/packages/trnn-core/src/core/fibonacci.ts
var FIB_CACHE = [0n, 1n];
var LUC_CACHE = [2n, 1n];
function fibBig(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`fibBig: bad n ${n}`);
  while (FIB_CACHE.length <= n) FIB_CACHE.push(FIB_CACHE[FIB_CACHE.length - 1] + FIB_CACHE[FIB_CACHE.length - 2]);
  return FIB_CACHE[n];
}
function lucasBig(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`lucasBig: bad n ${n}`);
  while (LUC_CACHE.length <= n) LUC_CACHE.push(LUC_CACHE[LUC_CACHE.length - 1] + LUC_CACHE[LUC_CACHE.length - 2]);
  return LUC_CACHE[n];
}
function fib(n) {
  return Number(fibBig(n));
}
var PROFILES = {
  PICO: 144,
  BASE: 987,
  CORE: 2584,
  GRAND: 6765,
  COSMIC: 75025,
  TRANSFINITE: 832040,
  ABSOLUTE: 2178309
};
var PROFILE_ORDER = [
  "PICO",
  "BASE",
  "CORE",
  "GRAND",
  "COSMIC",
  "TRANSFINITE",
  "ABSOLUTE"
];
function largestFibonacciAtMost(n) {
  let best = 1;
  for (let k = 2; k <= 90; k++) {
    const f = fib(k);
    if (f > n) break;
    best = f;
  }
  return best;
}
function isFibonacci(n) {
  for (let k = 0; k <= 90; k++) {
    const f = fib(k);
    if (f === n) return true;
    if (f > n) return false;
  }
  return false;
}

// ../omega/packages/trnn-core/src/core/scaleLadder.ts
var LADDER_MAX_N = 293;
var STABLE_RESIDUES = [1, 13, 15, 27];
var DENSE_CORE_COUNT = 18;
var LN_PHI = dlog(PHI);
function lucasMod13(n) {
  return Number(lucasBig(n) % 13n);
}
function isStableByResidue(n) {
  const r = (n % 28 + 28) % 28;
  return STABLE_RESIDUES.includes(r);
}
function isStableByLucas(n) {
  const m = lucasMod13(n);
  return m === 1 || m === 12;
}
function makeRung(n, rank2) {
  return {
    n,
    rank: rank2,
    lucasResidue: lucasMod13(n),
    logRadius: n * LN_PHI,
    logMinorRadius: (n - 1) * LN_PHI,
    logTau: n * LN_PHI + dlog1p(0.01 * n),
    qrf: dpow(PHI, -n / 89),
    dense: false
  };
}
function buildLadder() {
  const out = [];
  for (let n = 1; n <= LADDER_MAX_N; n++) {
    if (!isStableByResidue(n)) continue;
    out.push(makeRung(n, out.length));
  }
  return out.map((r, i) => ({ ...r, dense: i < DENSE_CORE_COUNT }));
}
var LADDER = Object.freeze(buildLadder());
var DENSE_CORE = Object.freeze(LADDER.slice(0, DENSE_CORE_COUNT));
function rungByIndex(n) {
  return LADDER.find((r) => r.n === n);
}
function closureObstructionHolds(maxN = LADDER_MAX_N) {
  for (let n = 1; n <= maxN; n++) if (lucasMod13(n) === 0) return false;
  return true;
}

// ../omega/packages/trnn-core/src/core/window.ts
var FIB_SPINE = [
  13,
  21,
  34,
  55,
  89,
  144,
  233,
  377,
  610,
  987,
  1597,
  2584,
  4181,
  6765,
  10946,
  17711,
  28657,
  46368
];
var DEFAULT_ENV = {
  baseTemperature: 0,
  temperatureRamp: 1,
  baseMagnetic: 0,
  magneticRamp: 1,
  coherenceClock: "uniform"
};
function buildWindow(start, opts = {}) {
  const count = Math.max(1, Math.trunc(opts.count ?? DENSE_CORE_COUNT));
  if (count > DENSE_CORE_COUNT) {
    throw new RangeError(`buildWindow: ${count} rungs exceeds the ${DENSE_CORE_COUNT}-rung dense core`);
  }
  if (!Number.isInteger(start) || start < 0) {
    throw new RangeError(`buildWindow: start must be a non-negative integer, got ${start}`);
  }
  if (start + count > FIB_SPINE.length) {
    throw new RangeError(
      `buildWindow: window [${start}, ${start + count}) runs past the Fibonacci spine (${FIB_SPINE.length})`
    );
  }
  const env = { ...DEFAULT_ENV, ...stripUndefined(opts) };
  const rungs = [];
  let total = 0;
  for (let rank2 = 0; rank2 < count; rank2++) {
    const spineIndex = start + rank2;
    const nodes = FIB_SPINE[spineIndex];
    const rung = DENSE_CORE[rank2];
    const temperature = env.baseTemperature * dpow(env.temperatureRamp, rank2);
    const magnetic = env.baseMagnetic * dpow(env.magneticRamp, rank2);
    rungs.push({
      rank: rank2,
      rung,
      nodes,
      spineIndex,
      coherenceDelay: coherenceDelayForRank(rank2, env.coherenceClock),
      temperature,
      lambda: thermalLambda(temperature),
      magnetic,
      magneticPhase: magneticPhase(magnetic),
      qrf: qrfAttenuation(rung.n)
    });
    total += nodes;
  }
  return {
    id: opts.id ?? `OMEGA-${FIB_SPINE[start + count - 1]}`,
    start,
    rungs,
    totalNodes: total,
    minNodes: rungs[0].nodes,
    maxNodes: rungs[rungs.length - 1].nodes,
    environment: env
  };
}
function stripUndefined(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) if (v !== void 0 && k !== "count" && k !== "id") out[k] = v;
  return out;
}
function enumerateWindows(count = DENSE_CORE_COUNT, env = {}) {
  const out = [];
  for (let s = 0; s + count <= FIB_SPINE.length; s++) out.push(buildWindow(s, { ...env, count }));
  return out;
}
function windowByTopNodes(nodes, count = DENSE_CORE_COUNT, env = {}) {
  const top = FIB_SPINE.indexOf(nodes);
  if (top < 0) return void 0;
  const start = top - count + 1;
  if (start < 0) return void 0;
  return buildWindow(start, { ...env, count });
}
function windowWork(w, modes, couplingBand) {
  const analysis = 2 * w.totalNodes * modes;
  const exchange = w.totalNodes * Math.min(w.rungs.length - 1, 2 * couplingBand);
  return analysis + exchange + 12 * w.totalNodes;
}
function isInertWindow(w) {
  const e = w.environment;
  return e.baseTemperature === 0 && e.baseMagnetic === 0 && e.coherenceClock === "uniform" && w.rungs.every((r) => r.lambda === LAMBDA_MEMORY && r.magneticPhase === 0 && r.coherenceDelay === COHERENCE_DELAY);
}

// ../omega/packages/trnn-core/src/core/determinism.ts
var FNV_OFFSET = 0xcbf29ce484222325n;
var FNV_PRIME = 0x100000001b3n;
var MASK64 = 0xffffffffffffffffn;
var scratch2 = new DataView(new ArrayBuffer(8));
var Digest = class {
  h;
  constructor(seed = FNV_OFFSET) {
    this.h = seed & MASK64;
  }
  byte(b) {
    this.h = (this.h ^ BigInt(b & 255)) * FNV_PRIME & MASK64;
    return this;
  }
  /** Absorb a float64 by its exact bit pattern (NaN/-0 included). */
  float(x) {
    scratch2.setFloat64(0, x, true);
    for (let i = 0; i < 8; i++) this.byte(scratch2.getUint8(i));
    return this;
  }
  int(x) {
    scratch2.setFloat64(0, x, true);
    for (let i = 0; i < 8; i++) this.byte(scratch2.getUint8(i));
    return this;
  }
  text(s) {
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      this.byte(c & 255).byte(c >>> 8);
    }
    return this;
  }
  array(xs) {
    this.int(xs.length);
    for (let i = 0; i < xs.length; i++) this.float(xs[i]);
    return this;
  }
  value() {
    return this.h;
  }
  hex() {
    return this.h.toString(16).padStart(16, "0");
  }
};
var DigestChain = class {
  h;
  n = 0;
  constructor(seed) {
    this.h = new Digest().text(seed).value();
  }
  /** Absorb one tick's payload and return the new head. */
  link(...payloads) {
    const d = new Digest(this.h);
    d.int(this.n++);
    for (const p of payloads) d.array(p);
    this.h = d.value();
    return this.head();
  }
  head() {
    return this.h.toString(16).padStart(16, "0");
  }
  length() {
    return this.n;
  }
  /** Restore a chain to a checkpointed head (rollback support). */
  restore(headHex, count) {
    this.h = BigInt("0x" + headHex) & MASK64;
    this.n = count;
  }
};
var SeedStream = class {
  s;
  constructor(seed) {
    this.s = new Digest().text(seed).value();
  }
  next() {
    this.s = this.s + 0x9e3779b97f4a7c15n & MASK64;
    let z = this.s;
    z = (z ^ z >> 30n) * 0xbf58476d1ce4e5b9n & MASK64;
    z = (z ^ z >> 27n) * 0x94d049bb133111ebn & MASK64;
    z = z ^ z >> 31n;
    return Number(z >> 11n) / 9007199254740992;
  }
  /** Symmetric sample in [-1, 1). */
  signed() {
    return this.next() * 2 - 1;
  }
};

// ../omega/packages/trnn-core/src/core/complex.ts
function createField(n) {
  return { re: new Float64Array(n), im: new Float64Array(n), n };
}
function copyField(dst, src) {
  dst.re.set(src.re);
  dst.im.set(src.im);
}
function zeroField(f) {
  f.re.fill(0);
  f.im.fill(0);
}
function cloneField(f) {
  return { re: Float64Array.from(f.re), im: Float64Array.from(f.im), n: f.n };
}
function energy(f) {
  let s = 0;
  for (let i = 0; i < f.n; i++) s += f.re[i] * f.re[i] + f.im[i] * f.im[i];
  return s;
}
function maxNorm(f) {
  let m = 0;
  for (let i = 0; i < f.n; i++) {
    const a = Math.sqrt(f.re[i] * f.re[i] + f.im[i] * f.im[i]);
    if (a > m) m = a;
  }
  return m;
}
function distance(a, b) {
  let s = 0;
  for (let i = 0; i < a.n; i++) {
    const dr = a.re[i] - b.re[i];
    const di = a.im[i] - b.im[i];
    s += dr * dr + di * di;
  }
  return Math.sqrt(s);
}
function inner(a, b) {
  let re = 0;
  let im = 0;
  for (let i = 0; i < a.n; i++) {
    re += a.re[i] * b.re[i] + a.im[i] * b.im[i];
    im += a.re[i] * b.im[i] - a.im[i] * b.re[i];
  }
  return { re, im };
}
function scaleField(f, k) {
  for (let i = 0; i < f.n; i++) {
    f.re[i] *= k;
    f.im[i] *= k;
  }
}
function isFiniteField(f) {
  for (let i = 0; i < f.n; i++) {
    if (!Number.isFinite(f.re[i]) || !Number.isFinite(f.im[i])) return false;
  }
  return true;
}
function clampField(f, limit) {
  let clamped = 0;
  for (let i = 0; i < f.n; i++) {
    const a = Math.sqrt(f.re[i] * f.re[i] + f.im[i] * f.im[i]);
    if (a > limit && a > 0) {
      const k = limit / a;
      f.re[i] *= k;
      f.im[i] *= k;
      clamped++;
    }
  }
  return clamped;
}

// ../omega/packages/trnn-core/src/cell/update.ts
var ISS_SLACK = 1e-9;
function addTerm(re, im, k, t, n) {
  if (!t) return 0;
  if (t.n !== n) {
    throw new RangeError(`cellStep: term width ${t.n} does not match the field width ${n}`);
  }
  const ak = Math.abs(k);
  let maxSq = 0;
  for (let i = 0; i < n; i++) {
    const tr = t.re[i];
    const ti = t.im[i];
    const sq = tr * tr + ti * ti;
    if (sq > maxSq) maxSq = sq;
    re[i] += k * tr;
    im[i] += k * ti;
  }
  return ak * Math.sqrt(maxSq);
}
function cellStep(z, out, terms) {
  if (out === z) throw new Error("cellStep: out must differ from z (Jacobi staging)");
  const n = z.n;
  if (out.n !== n) throw new RangeError(`cellStep: out width ${out.n} does not match z width ${n}`);
  const { re, im } = out;
  let inMax = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.sqrt(z.re[i] * z.re[i] + z.im[i] * z.im[i]);
    if (a > inMax) inMax = a;
    const c = CELL.alpha - CELL.epsilon - CELL.zeta;
    re[i] = c * z.re[i];
    im[i] = c * z.im[i];
  }
  let drive = 0;
  drive += addTerm(re, im, CELL.beta, terms.G, n);
  drive += addTerm(re, im, CELL.gamma, terms.P, n);
  drive += addTerm(re, im, CELL.delta, terms.R, n);
  drive += addTerm(re, im, CELL.epsilon, terms.Pi, n);
  drive += addTerm(re, im, CELL.zeta, terms.zhat, n);
  drive += addTerm(re, im, CELL.eta, terms.U, n);
  drive += addTerm(re, im, CELL.mu, terms.V, n);
  drive += addTerm(re, im, CELL.xi, terms.S, n);
  const clamped = clampField(out, CLAMP_MAX);
  let d = 0;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const dr = re[i] - z.re[i];
    const di = im[i] - z.im[i];
    d += dr * dr + di * di;
    const a = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    if (a > peak) peak = a;
  }
  const issBound = JURY_GAIN * inMax + drive;
  return {
    clamped,
    delta: Math.sqrt(d),
    peak,
    realizedGain: inMax > 0 ? peak / inMax : 0,
    issBound,
    driveNorm: drive,
    issSatisfied: peak <= issBound * (1 + ISS_SLACK) + ISS_SLACK
  };
}

// ../omega/packages/trnn-core/src/cell/memory.ts
function memoryStep(m, zNext, lambda = LAMBDA_MEMORY) {
  const k = 1 - lambda;
  const n = Math.min(m.n, zNext.n);
  for (let i = 0; i < n; i++) {
    m.re[i] = k * m.re[i] + lambda * zNext.re[i];
    m.im[i] = k * m.im[i] + lambda * zNext.im[i];
  }
}
function memoryRoots(lambda = LAMBDA_MEMORY) {
  return [1, -lambda];
}

// ../omega/packages/trnn-core/src/cell/closure.ts
function closureTarget(z, pi, turn, shift) {
  const n = z.n;
  if (n === 0) return { obstruction: 0, residualFlux: 0, turn, defect: 0, closure: 1 };
  const theta = 2 * Math.PI * (turn * (1 / 1.618033988749895) % 1);
  const c = dcos(theta);
  const s = dsin(theta);
  let obs = 0;
  let flux = 0;
  let ar = 0;
  let ai = 0;
  let e = 0;
  const sh = (shift % n + n) % n;
  for (let i = 0; i < n; i++) {
    const j = (i + sh) % n;
    const rr = z.re[j] * c - z.im[j] * s;
    const ri = z.re[j] * s + z.im[j] * c;
    const dr = rr - z.re[i];
    const di = ri - z.im[i];
    obs += dr * dr + di * di;
    pi.re[i] = z.re[i] + KAPPA * dr;
    pi.im[i] = z.im[i] + KAPPA * di;
    const ur = (1 - KAPPA) * dr;
    const ui = (1 - KAPPA) * di;
    flux += ur * ur + ui * ui;
    ar += z.re[i] * z.re[j] + z.im[i] * z.im[j];
    ai += z.re[i] * z.im[j] - z.im[i] * z.re[j];
    e += z.re[i] * z.re[i] + z.im[i] * z.im[i];
  }
  const gamma = e > 1e-300 ? Math.min(1, Math.sqrt(ar * ar + ai * ai) / e) : 0;
  const defect = Math.sqrt(Math.max(0, 2 - 2 * gamma));
  return { obstruction: Math.sqrt(obs), residualFlux: flux, turn, defect, closure: gamma };
}

// ../omega/packages/trnn-core/src/spectral/radial.ts
function radialGrid(n) {
  if (n <= 0 || !Number.isInteger(n)) throw new RangeError(`radialGrid: n must be a positive integer, got ${n}`);
  const r = new Float64Array(n);
  const w = new Float64Array(n);
  const dr = 1 / n;
  for (let i = 0; i < n; i++) {
    const ri = (i + 0.5) * dr;
    r[i] = ri;
    w[i] = ri * ri * dr;
  }
  return { n, r, w };
}
function sphericalBesselJ(l, x) {
  if (l < 0 || !Number.isInteger(l)) throw new RangeError(`sphericalBesselJ: l must be a non-negative integer, got ${l}`);
  if (x === 0) return l === 0 ? 1 : 0;
  const ax = Math.abs(x);
  if (ax < l / 2 + 1) return besselSeries(l, x);
  let jm1 = dcos(x) / x;
  let j0 = dsin(x) / x;
  if (l === 0) return j0;
  for (let k = 0; k < l; k++) {
    const next = (2 * k + 1) / x * j0 - jm1;
    jm1 = j0;
    j0 = next;
  }
  return j0;
}
function besselSeries(l, x) {
  let dfact = 1;
  for (let k = 3; k <= 2 * l + 1; k += 2) dfact *= k;
  const pref = dpow(x, l) / dfact;
  const h = -x * x / 2;
  let term = 1;
  let sum = 1;
  for (let k = 1; k < 60; k++) {
    term *= h / (k * (2 * l + 2 * k + 1));
    sum += term;
    if (Math.abs(term) < 1e-18 * Math.abs(sum)) break;
  }
  return pref * sum;
}
function quadInner(w, a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += w[i] * a[i] * b[i];
  return s;
}
function radialGridSize(count, offset = 0) {
  if (count <= 0 || !Number.isInteger(count)) throw new RangeError(`radialGridSize: count must be a positive integer, got ${count}`);
  if (offset < 0 || !Number.isInteger(offset)) throw new RangeError(`radialGridSize: offset must be a non-negative integer, got ${offset}`);
  return Math.max(count, Math.ceil(2 * dpow(PHI, offset + count - 1)));
}
function radialLadderWindow(count, gridCap = 233) {
  let w = 0;
  while (radialGridSize(count, w) <= gridCap) w++;
  return Math.max(1, w);
}
function buildRadialBasis(grid, l = 0, count = 8, rung0 = 0) {
  const rungs = [];
  const raw = [];
  for (let i = 0; i < count; i++) {
    const rung = rung0 + i;
    const kappa = Math.PI * dpow(PHI, rung);
    const v = new Float64Array(grid.n);
    for (let j = 0; j < grid.n; j++) v[j] = sphericalBesselJ(l, kappa * grid.r[j]);
    rungs.push(rung);
    raw.push(v);
  }
  let defect = 0;
  for (let a = 0; a < raw.length; a++) {
    const na = Math.sqrt(quadInner(grid.w, raw[a], raw[a]));
    for (let b = 0; b < raw.length; b++) {
      const nb = Math.sqrt(quadInner(grid.w, raw[b], raw[b]));
      if (na === 0 || nb === 0) continue;
      const g2 = quadInner(grid.w, raw[a], raw[b]) / (na * nb);
      defect = Math.max(defect, Math.abs(g2 - (a === b ? 1 : 0)));
    }
  }
  const basis = [];
  const kept = [];
  for (let k = 0; k < raw.length; k++) {
    const v = Float64Array.from(raw[k]);
    for (let pass = 0; pass < 2; pass++) {
      for (const b of basis) {
        const c = quadInner(grid.w, b, v);
        for (let i = 0; i < v.length; i++) v[i] -= c * b[i];
      }
    }
    const nrm = Math.sqrt(quadInner(grid.w, v, v));
    if (!(nrm > 1e-10)) continue;
    for (let i = 0; i < v.length; i++) v[i] /= nrm;
    basis.push(v);
    kept.push(rungs[k]);
  }
  return { grid, l, rungs: kept, vectors: basis, gramDefect: defect };
}
function radialAnalyze(basis, f, out) {
  for (let k = 0; k < basis.vectors.length; k++) out[k] = quadInner(basis.grid.w, basis.vectors[k], f);
  return out;
}
function radialSynthesize(basis, coeffs, out) {
  out.fill(0);
  for (let k = 0; k < basis.vectors.length; k++) {
    const c = coeffs[k];
    if (c === 0) continue;
    const b = basis.vectors[k];
    for (let i = 0; i < out.length; i++) out[i] += c * b[i];
  }
  return out;
}

// ../omega/packages/trnn-core/src/cell/organs.ts
var MODALITY_NONE = 0;
var RADIAL_GAIN_MAX = PHI_INV;
var NodeOrgans = class {
  n;
  orders;
  modes;
  stride;
  radialGain;
  radialBasis;
  /** φ-ladder offset actually used (0 — the only fully representable anchor). */
  radialLadderOffset;
  /** Grid index the radial reconstruction is read at (golden-section radius). */
  readIndex;
  // --- eigenmode organ -----------------------------------------------------
  /** |z_j − (basis reconstruction)_j| per node. */
  eigenResidual;
  /** Index of the mode carrying the largest magnitude at node j. */
  eigenLead;
  // --- radial organ --------------------------------------------------------
  /** Row-major [node][order] spherical-Bessel coefficients. */
  radialCoef;
  /** Reconstruction at r→0 of each node's ray, carried on the node's phase. */
  radialField;
  // --- superposition organ -------------------------------------------------
  /** Participation ratio of the modal decomposition at node j. */
  participation;
  /** Local phase coherence against the golden-neighbour pair. */
  localCoherence;
  // --- sensory organ -------------------------------------------------------
  senseGain;
  senseModality;
  senseLast;
  ray;
  coefRow;
  amp;
  tickCount = 0;
  age = 0;
  last;
  constructor(n, modes, opts = {}) {
    if (!Number.isInteger(n) || n <= 0) throw new RangeError(`NodeOrgans: n must be a positive integer, got ${n}`);
    const orders = opts.radialOrders ?? 8;
    if (!Number.isInteger(orders) || orders < 1) {
      throw new RangeError(`NodeOrgans: radialOrders must be a positive integer, got ${orders}`);
    }
    const gain = opts.radialGain ?? 0;
    if (!Number.isFinite(gain) || gain < 0 || gain > RADIAL_GAIN_MAX) {
      throw new RangeError(`NodeOrgans: radialGain must be in [0, ${RADIAL_GAIN_MAX}], got ${gain}`);
    }
    const stride = opts.stride ?? 1;
    if (!Number.isInteger(stride) || stride < 1) {
      throw new RangeError(`NodeOrgans: stride must be a positive integer, got ${stride}`);
    }
    this.n = n;
    this.orders = orders;
    this.modes = modes;
    this.stride = stride;
    this.radialGain = gain;
    const window = radialLadderWindow(orders);
    const offset = Math.min(0, window - 1);
    const grid = radialGrid(radialGridSize(orders, offset));
    this.radialLadderOffset = offset;
    this.radialBasis = buildRadialBasis(grid, 0, orders, offset);
    this.eigenResidual = new Float64Array(n);
    this.eigenLead = new Int32Array(n);
    this.radialCoef = new Float64Array(n * orders);
    this.radialField = createField(n);
    this.participation = new Float64Array(n);
    this.localCoherence = new Float64Array(n);
    this.senseGain = new Float64Array(n).fill(1);
    this.senseModality = new Int8Array(n);
    this.senseLast = new Float64Array(n);
    this.ray = new Float64Array(grid.n);
    this.readIndex = Math.min(grid.n - 1, Math.round(grid.n * PHI_INV));
    this.coefRow = new Float64Array(this.radialBasis.vectors.length);
    this.amp = new Float64Array(n);
    this.last = {
      age: 0,
      meanEigenResidual: 0,
      maxEigenResidual: 0,
      meanParticipation: 0,
      meanLocalCoherence: 0,
      radialPeak: 0,
      radialGramDefect: this.radialBasis.gramDefect,
      radialBands: this.radialBasis.vectors.length,
      radialLadderOffset: offset,
      radialClipped: 0,
      receptors: 0
    };
  }
  /** Exact bytes this bank allocates — feeds the footprint check. */
  bytes() {
    const perNode = 8 + 4 + 8 * this.orders + 16 + 8 + 8 + 8 + 1 + 8;
    const basis = this.radialBasis.vectors.length * this.orders * 8 + this.orders * 16;
    return this.n * perNode + basis + this.ray.byteLength + this.coefRow.byteLength + this.amp.byteLength;
  }
  report() {
    return this.last;
  }
  /** Attach a receptor to one node. Gain 0 mutes it. */
  setReceptor(node, modality, gain = 1) {
    if (!Number.isInteger(node) || node < 0 || node >= this.n) {
      throw new RangeError(`NodeOrgans.setReceptor: node ${node} out of range [0, ${this.n})`);
    }
    if (!Number.isFinite(gain) || gain < 0 || gain > PHI) {
      throw new RangeError(`NodeOrgans.setReceptor: gain must be in [0, ${PHI}], got ${gain}`);
    }
    this.senseGain[node] = gain;
    this.senseModality[node] = modality;
  }
  /** Record what the sensory plane actually delivered to each node this tick. */
  recordInjection(s) {
    if (!s) {
      this.senseLast.fill(0);
      return;
    }
    const k = Math.min(this.n, s.n);
    for (let j = 0; j < k; j++) this.senseLast[j] = dmag(s.re[j], s.im[j]);
    for (let j = k; j < this.n; j++) this.senseLast[j] = 0;
  }
  /**
   * Recompute every organ from the live field.
   *
   * `coeffs` is the rung's modal decomposition (interleaved re/im, already
   * computed by the engine — the organ bank never re-runs the analysis) and
   * `basis` its orthonormal mode vectors.
   */
  update(z, basis, coeffs) {
    const t = this.tickCount++;
    if (t % this.stride !== 0) {
      this.age++;
      this.last = { ...this.last, age: this.age };
      return this.last;
    }
    this.age = 0;
    const n = this.n;
    const K = basis.vectors.length;
    for (let j = 0; j < n; j++) this.amp[j] = dmag(z.re[j], z.im[j]);
    let resSum = 0;
    let resMax = 0;
    let prSum = 0;
    for (let j = 0; j < n; j++) {
      let rr = 0;
      let ri = 0;
      let p2 = 0;
      let p4 = 0;
      let lead = 0;
      let leadMag = -1;
      for (let k = 0; k < K; k++) {
        const cr = coeffs[2 * k];
        const ci = coeffs[2 * k + 1];
        const br = basis.vectors[k].re[j];
        const bi = basis.vectors[k].im[j];
        const xr = cr * br - ci * bi;
        const xi = cr * bi + ci * br;
        rr += xr;
        ri += xi;
        const m2 = xr * xr + xi * xi;
        p2 += m2;
        p4 += m2 * m2;
        if (m2 > leadMag) {
          leadMag = m2;
          lead = k;
        }
      }
      const res = dmag(z.re[j] - rr, z.im[j] - ri);
      this.eigenResidual[j] = res;
      this.eigenLead[j] = lead;
      resSum += res;
      if (res > resMax) resMax = res;
      const pr = p4 > 0 ? p2 * p2 / (K * p4) : 0;
      this.participation[j] = pr;
      prSum += pr;
    }
    const step = Math.max(1, Math.round(n * PHI_INV) % n || 1);
    let cohSum = 0;
    for (let j = 0; j < n; j++) {
      const a = (j + step) % n;
      const b = (j - step + n) % n;
      const ma = this.amp[j] * this.amp[a];
      const mb = this.amp[j] * this.amp[b];
      const da = ma > 0 ? (z.re[j] * z.re[a] + z.im[j] * z.im[a]) / ma : 0;
      const db = mb > 0 ? (z.re[j] * z.re[b] + z.im[j] * z.im[b]) / mb : 0;
      const c = 0.5 * (0.5 * (da + 1) + 0.5 * (db + 1));
      this.localCoherence[j] = c;
      cohSum += c;
    }
    const grid = this.radialBasis.grid;
    const R = this.radialBasis.vectors.length;
    let radPeak = 0;
    let clipped = 0;
    for (let j = 0; j < n; j++) {
      let rayMax = 0;
      for (let i = 0; i < grid.n; i++) {
        const off = Math.round(grid.r[i] * n * PHI_INV);
        const a = this.amp[(j + off) % n];
        this.ray[i] = a;
        if (a > rayMax) rayMax = a;
      }
      radialAnalyze(this.radialBasis, this.ray, this.coefRow);
      const row = j * this.orders;
      let v = 0;
      for (let k = 0; k < R; k++) {
        const c = this.coefRow[k];
        this.radialCoef[row + k] = c;
        v += c * this.radialBasis.vectors[k][this.readIndex];
      }
      for (let k = R; k < this.orders; k++) this.radialCoef[row + k] = 0;
      const av = Math.abs(v);
      let vFed = v;
      if (av > rayMax) {
        vFed = v < 0 ? -rayMax : rayMax;
        clipped++;
      }
      const m = this.amp[j];
      if (m > 0) {
        this.radialField.re[j] = vFed * z.re[j] / m;
        this.radialField.im[j] = vFed * z.im[j] / m;
      } else {
        this.radialField.re[j] = 0;
        this.radialField.im[j] = 0;
      }
      if (av > radPeak) radPeak = av;
    }
    let receptors = 0;
    for (let j = 0; j < n; j++) if (this.senseGain[j] > 0 && this.senseModality[j] !== MODALITY_NONE) receptors++;
    this.last = {
      age: 0,
      meanEigenResidual: resSum / n,
      maxEigenResidual: resMax,
      meanParticipation: prSum / n,
      meanLocalCoherence: cohSum / n,
      radialPeak: radPeak,
      radialGramDefect: this.radialBasis.gramDefect,
      radialBands: this.radialBasis.vectors.length,
      radialLadderOffset: this.radialLadderOffset,
      radialClipped: clipped,
      receptors
    };
    return this.last;
  }
  /**
   * Blend the radial reconstruction into the resonance slot:
   *
   *   R_j ← (1 − g) · R_j + g · radial_j,   g = radialGain ∈ [0, φ⁻¹]
   *
   * A convex blend, so ‖R‖∞ never exceeds max(‖m‖∞, ‖radial‖∞) and the δ·R
   * drive term stays inside the envelope the ISS certificate already bounds.
   * At g = 0 this is a no-op and the digest is untouched.
   */
  applyRadial(R) {
    const g2 = this.radialGain;
    if (g2 <= 0) return;
    const h = 1 - g2;
    for (let j = 0; j < this.n; j++) {
      R.re[j] = h * R.re[j] + g2 * this.radialField.re[j];
      R.im[j] = h * R.im[j] + g2 * this.radialField.im[j];
    }
  }
  /** Per-node receptor scaling applied to a staged sensory field, in place. */
  applyReceptors(s) {
    const k = Math.min(this.n, s.n);
    for (let j = 0; j < k; j++) {
      const g2 = this.senseGain[j];
      if (g2 === 1) continue;
      s.re[j] *= g2;
      s.im[j] *= g2;
    }
  }
};
function organBytes(n, orders = 8) {
  const perNode = 8 + 4 + 8 * orders + 16 + 8 + 8 + 8 + 1 + 8;
  return n * perNode + orders * orders * 8 + orders * 16;
}
function radialWavenumber(order, rung = 0) {
  return Math.PI * dpow(PHI, rung + order);
}

// ../omega/packages/trnn-core/src/torus/lattice.ts
var TWO_PI = 2 * Math.PI;
function createLattice(n, kind = "fibonacci") {
  if (n <= 0) throw new RangeError(`createLattice: n must be positive, got ${n}`);
  if (!isFibonacci(n)) throw new RangeError(`createLattice: node count ${n} is not Fibonacci (Law 2.2)`);
  const u = new Float64Array(n);
  const v = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    u[j] = TWO_PI * j / n;
    const raw = TWO_PI * j * PHI_INV;
    v[j] = kind === "golden-ring" ? raw % TWO_PI : raw;
  }
  return { kind, n, u, v };
}
function minSeparation(l) {
  const xs = Array.from(l.v, (x) => (x % TWO_PI + TWO_PI) % TWO_PI).sort((a, b) => a - b);
  let m = TWO_PI;
  for (let i = 1; i < xs.length; i++) m = Math.min(m, xs[i] - xs[i - 1]);
  if (xs.length > 1) m = Math.min(m, TWO_PI - xs[xs.length - 1] + xs[0]);
  return m;
}

// ../omega/packages/trnn-core/src/torus/eigenmodes.ts
function modeLadder(count = SIGNATURE_MODES) {
  const raw = [];
  let sum = 0;
  for (let k = 0; k < count; k++) {
    const w = dpow(PHI, -k);
    sum += w;
    raw.push({ k, p: k, q: Math.round(k * PHI_INV), w });
  }
  return raw.map((r) => ({ k: r.k, p: r.p, q: r.q, weight: r.w / sum }));
}
function lucasLine(k) {
  return dpow(PHI, k) + dpow(-PHI, -k);
}
function buildModes(lattice, specs) {
  return specs.map((s) => {
    const re = new Float64Array(lattice.n);
    const im = new Float64Array(lattice.n);
    for (let j = 0; j < lattice.n; j++) {
      const ph = s.p * lattice.u[j] + s.q * lattice.v[j];
      re[j] = dcos(ph);
      im[j] = dsin(ph);
    }
    return { re, im, n: lattice.n };
  });
}

// ../omega/packages/trnn-core/src/torus/superposition.ts
function scaleInto(dst, src, kr, ki) {
  for (let i = 0; i < dst.n; i++) {
    dst.re[i] = kr * src.re[i] - ki * src.im[i];
    dst.im[i] = kr * src.im[i] + ki * src.re[i];
  }
}
function subtractProjection(v, b) {
  const c = inner(b, v);
  for (let i = 0; i < v.n; i++) {
    v.re[i] -= c.re * b.re[i] - c.im * b.im[i];
    v.im[i] -= c.re * b.im[i] + c.im * b.re[i];
  }
}
function buildBasis(lattice, count) {
  const specs = modeLadder(count);
  const raw = buildModes(lattice, specs);
  const basis = [];
  for (const v of raw) {
    const w = { re: Float64Array.from(v.re), im: Float64Array.from(v.im), n: v.n };
    for (let pass = 0; pass < 2; pass++) for (const b of basis) subtractProjection(w, b);
    const norm2 = Math.sqrt(inner(w, w).re);
    if (!(norm2 > 1e-10)) continue;
    scaleInto(w, w, 1 / norm2, 0);
    basis.push(w);
  }
  return { specs: specs.slice(0, basis.length), vectors: basis, n: lattice.n };
}
function analyze(basis, psi, out) {
  for (let k = 0; k < basis.vectors.length; k++) {
    const c = inner(basis.vectors[k], psi);
    out[2 * k] = c.re;
    out[2 * k + 1] = c.im;
  }
  return out;
}
function synthesize(basis, coeffs, out) {
  out.re.fill(0);
  out.im.fill(0);
  for (let k = 0; k < basis.vectors.length; k++) {
    const cr = coeffs[2 * k];
    const ci = coeffs[2 * k + 1];
    const b = basis.vectors[k];
    for (let i = 0; i < out.n; i++) {
      out.re[i] += cr * b.re[i] - ci * b.im[i];
      out.im[i] += cr * b.im[i] + ci * b.re[i];
    }
  }
  return out;
}
function signature(basis, coeffs, out) {
  for (let k = 0; k < basis.vectors.length; k++) {
    const cr = coeffs[2 * k];
    const ci = coeffs[2 * k + 1];
    out[k] = basis.specs[k].weight * (cr * cr + ci * ci);
  }
  return out;
}
function coeffBuffer(basis) {
  return new Float64Array(2 * basis.vectors.length);
}
function project(basis, psi, scratch3, out) {
  analyze(basis, psi, scratch3);
  return synthesize(basis, scratch3, out);
}
function newField(n) {
  return createField(n);
}

// ../omega/packages/trnn-core/src/measure/coherence.ts
var CoherenceMeter = class {
  ringRe;
  ringIm;
  width;
  frames;
  cursor = 0;
  written = 0;
  last = 0;
  constructor(width, delay = COHERENCE_DELAY) {
    this.width = width;
    this.frames = delay + 1;
    this.ringRe = new Float64Array(this.frames * width);
    this.ringIm = new Float64Array(this.frames * width);
  }
  reset() {
    this.ringRe.fill(0);
    this.ringIm.fill(0);
    this.cursor = 0;
    this.written = 0;
    this.last = 0;
  }
  /** Push the current field and read C(t). */
  push(psi) {
    const w = this.width;
    const base = this.cursor * w;
    for (let i = 0; i < w; i++) {
      this.ringRe[base + i] = psi.re[i];
      this.ringIm[base + i] = psi.im[i];
    }
    const warm = this.written >= this.frames - 1;
    let c = 0;
    if (warm) {
      const old = (this.cursor + 1) % this.frames * w;
      let ir = 0;
      let ii = 0;
      let na = 0;
      let nb = 0;
      for (let i = 0; i < w; i++) {
        const ar = this.ringRe[base + i];
        const ai = this.ringIm[base + i];
        const br = this.ringRe[old + i];
        const bi = this.ringIm[old + i];
        ir += ar * br + ai * bi;
        ii += ar * bi - ai * br;
        na += ar * ar + ai * ai;
        nb += br * br + bi * bi;
      }
      const den = na * nb;
      c = den > 0 ? (ir * ir + ii * ii) / den : 0;
      if (c > 1) c = 1;
    }
    this.cursor = (this.cursor + 1) % this.frames;
    this.written++;
    const ignition = warm && this.last <= IGNITION_THRESHOLD && c > IGNITION_THRESHOLD;
    this.last = c;
    return { c, ignition, warm };
  }
};

// ../omega/packages/trnn-core/src/measure/state.ts
function readState(psi) {
  let s = 0;
  for (let i = 0; i < psi.n; i++) s += Math.sqrt(psi.re[i] * psi.re[i] + psi.im[i] * psi.im[i]);
  return { energy: energy(psi), peak: maxNorm(psi), meanMagnitude: psi.n > 0 ? s / psi.n : 0 };
}
var CorridorGate = class {
  regime = "STABLE";
  reset() {
    this.regime = "STABLE";
  }
  read(error) {
    const skill = 1 / (1 + Math.abs(error));
    const h = CORRIDOR.hysteresis;
    const up = this.regime === "STABLE" ? 0 : h;
    let next;
    if (skill >= CORRIDOR.stable + up) next = "STABLE";
    else if (skill >= CORRIDOR.stress + up) next = "STRESS";
    else next = "CRITICAL";
    this.regime = next;
    const scale = next === "STABLE" ? CORRIDOR.gateScales[0] : next === "STRESS" ? CORRIDOR.gateScales[1] : CORRIDOR.gateScales[2];
    return { skill, regime: next, scale };
  }
};

// ../omega/packages/trnn-core/src/measure/transcription.ts
var TranscriptionTape = class {
  constructor(capacity = 2584, width = SIGNATURE_MODES) {
    this.width = width;
    this.cap = capacity;
    this.buf = new Float64Array(capacity * width);
    this.ticks = new Int32Array(capacity);
    this.digests = new Array(capacity).fill("");
  }
  buf;
  ticks;
  digests;
  cap;
  cursor = 0;
  count = 0;
  write(tick, signature2, digest) {
    const o = this.cursor * this.width;
    for (let i = 0; i < this.width; i++) this.buf[o + i] = signature2[i] ?? 0;
    this.ticks[this.cursor] = tick;
    this.digests[this.cursor] = digest;
    this.cursor = (this.cursor + 1) % this.cap;
    if (this.count < this.cap) this.count++;
  }
  size() {
    return this.count;
  }
  capacity() {
    return this.cap;
  }
  /** Most recent `k` frames, oldest first. */
  tail(k) {
    const m = Math.min(k, this.count);
    const out = [];
    for (let i = m; i > 0; i--) {
      const idx = (this.cursor - i + this.cap) % this.cap;
      out.push({
        tick: this.ticks[idx],
        signature: this.buf.slice(idx * this.width, idx * this.width + this.width),
        digest: this.digests[idx]
      });
    }
    return out;
  }
};

// ../omega/packages/trnn-core/src/spectral/sphere.ts
var TWO_PI2 = 2 * Math.PI;
function fibonacciShell(n) {
  if (n <= 0 || !Number.isInteger(n)) throw new RangeError(`fibonacciShell: n must be a positive integer, got ${n}`);
  const theta = new Float64Array(n);
  const phi = new Float64Array(n);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  const w = new Float64Array(n);
  const wj = 4 * Math.PI / n;
  for (let j = 0; j < n; j++) {
    const zc = 1 - (2 * j + 1) / n;
    const r = Math.sqrt(Math.max(0, 1 - zc * zc));
    const az = TWO_PI2 * j * PHI_INV % TWO_PI2;
    theta[j] = dacos(Math.min(1, Math.max(-1, zc)));
    phi[j] = az;
    x[j] = r * dcos(az);
    y[j] = r * dsin(az);
    z[j] = zc;
    w[j] = wj;
  }
  return { n, theta, phi, x, y, z, w };
}
function legendreP(l, m, xv) {
  if (m < 0 || m > l) throw new RangeError(`legendreP: require 0 <= m <= l, got l=${l} m=${m}`);
  let pmm = 1;
  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0, (1 - xv) * (1 + xv)));
    let fact = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }
  if (l === m) return pmm;
  let pmmp1 = xv * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = (xv * (2 * ll - 1) * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}
function factorialRatio(lminus, lplus) {
  let r = 1;
  for (let k = lminus + 1; k <= lplus; k++) r /= k;
  return r;
}
function realSH(l, m, theta, phi) {
  const am = Math.abs(m);
  const norm2 = Math.sqrt((2 * l + 1) / (4 * Math.PI) * factorialRatio(l - am, l + am));
  const p = legendreP(l, am, dcos(theta));
  if (m === 0) return norm2 * p;
  const s = Math.SQRT2 * norm2 * p;
  return m > 0 ? s * dcos(am * phi) : s * dsin(am * phi);
}
function harmonicLadder(lmax) {
  const out = [];
  for (let l = 0; l <= lmax; l++) for (let m = -l; m <= l; m++) out.push({ l, m });
  return out;
}
function quadInner2(w, a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += w[i] * a[i] * b[i];
  return s;
}
function buildSphericalBasis(shell, lmax = 3) {
  const specs = harmonicLadder(lmax);
  const raw = specs.map((s) => {
    const v = new Float64Array(shell.n);
    for (let j = 0; j < shell.n; j++) v[j] = realSH(s.l, s.m, shell.theta[j], shell.phi[j]);
    return v;
  });
  let defect = 0;
  for (let a = 0; a < raw.length; a++) {
    for (let b = 0; b < raw.length; b++) {
      const g2 = quadInner2(shell.w, raw[a], raw[b]);
      const target = a === b ? 1 : 0;
      defect = Math.max(defect, Math.abs(g2 - target));
    }
  }
  const basis = [];
  const kept = [];
  for (let k = 0; k < raw.length; k++) {
    const v = Float64Array.from(raw[k]);
    for (let pass = 0; pass < 2; pass++) {
      for (const b of basis) {
        const c = quadInner2(shell.w, b, v);
        for (let i = 0; i < v.length; i++) v[i] -= c * b[i];
      }
    }
    const nrm = Math.sqrt(quadInner2(shell.w, v, v));
    if (!(nrm > 1e-10)) continue;
    for (let i = 0; i < v.length; i++) v[i] /= nrm;
    basis.push(v);
    kept.push(specs[k]);
  }
  return { shell, specs: kept, vectors: basis, gramDefect: defect };
}
function shtAnalyze(basis, f, out) {
  for (let k = 0; k < basis.vectors.length; k++) out[k] = quadInner2(basis.shell.w, basis.vectors[k], f);
  return out;
}
function shtSynthesize(basis, coeffs, out) {
  out.fill(0);
  for (let k = 0; k < basis.vectors.length; k++) {
    const c = coeffs[k];
    if (c === 0) continue;
    const b = basis.vectors[k];
    for (let i = 0; i < out.length; i++) out[i] += c * b[i];
  }
  return out;
}
function angularPower(basis, coeffs, lmax) {
  const out = new Float64Array(lmax + 1);
  for (let k = 0; k < basis.specs.length; k++) {
    const l = basis.specs[k].l;
    if (l <= lmax) out[l] += coeffs[k] * coeffs[k];
  }
  return out;
}

// ../omega/packages/trnn-core/src/spectral/site.ts
var SpectralSite = class {
  sphere;
  radial;
  lmax;
  shCoeffs;
  radCoeffs;
  shScratch;
  radScratch;
  constructor(opts = {}) {
    const points = opts.shellPoints ?? 233;
    if (!isFibonacci(points)) {
      throw new RangeError(`SpectralSite: shellPoints ${points} is not Fibonacci (Law 2.2)`);
    }
    this.lmax = opts.lmax ?? 3;
    this.sphere = buildSphericalBasis(fibonacciShell(points), this.lmax);
    this.radial = buildRadialBasis(
      radialGrid(opts.radialNodes ?? 144),
      opts.radialDegree ?? 0,
      opts.radialRungs ?? 8
    );
    this.shCoeffs = new Float64Array(this.sphere.vectors.length);
    this.radCoeffs = new Float64Array(this.radial.vectors.length);
    this.shScratch = new Float64Array(this.sphere.shell.n);
    this.radScratch = new Float64Array(this.radial.grid.n);
  }
  /** Analyse a field sampled on the shell. Returns the coefficient view. */
  analyzeShell(f) {
    return shtAnalyze(this.sphere, f, this.shCoeffs);
  }
  /** Analyse a radial profile sampled on the radial grid. */
  analyzeRadial(f) {
    return radialAnalyze(this.radial, f, this.radCoeffs);
  }
  /** Measured (not assumed) roundtrip fidelity of the shell plane. */
  shellReport(f) {
    const c = shtAnalyze(this.sphere, f, this.shCoeffs);
    shtSynthesize(this.sphere, c, this.shScratch);
    return {
      roundtrip: relError(f, this.shScratch, this.sphere.shell.w),
      gramDefect: this.sphere.gramDefect,
      width: this.sphere.vectors.length
    };
  }
  /** Measured roundtrip fidelity of the radial plane. */
  radialReport(f) {
    const c = radialAnalyze(this.radial, f, this.radCoeffs);
    radialSynthesize(this.radial, c, this.radScratch);
    return {
      roundtrip: relError(f, this.radScratch, this.radial.grid.w),
      gramDefect: this.radial.gramDefect,
      width: this.radial.vectors.length
    };
  }
  /**
   * phi-weighted spectral signature of the shell coefficients, folded to
   * SIGNATURE_MODES entries so it lines up with the transcription tape width.
   */
  signature(f, out = new Float64Array(SIGNATURE_MODES)) {
    const c = shtAnalyze(this.sphere, f, this.shCoeffs);
    out.fill(0);
    let norm2 = 0;
    for (let k = 0; k < c.length; k++) {
      const slot = k % out.length;
      const w = dpow(PHI, -this.sphere.specs[k].l);
      const e = w * c[k] * c[k];
      out[slot] += e;
      norm2 += e;
    }
    if (norm2 > 0) for (let i = 0; i < out.length; i++) out[i] /= norm2;
    return out;
  }
};
function relError(a, b, w) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    num += w[i] * d * d;
    den += w[i] * a[i] * a[i];
  }
  if (den === 0) return Math.sqrt(num);
  return Math.sqrt(num / den);
}

// ../omega/packages/trnn-core/src/spectral/laplacian.ts
function fibonacciUpTo(max) {
  const out = [];
  let a = 1;
  let b = 2;
  if (max >= 1) out.push(1);
  while (b <= max) {
    out.push(b);
    const c = a + b;
    a = b;
    b = c;
  }
  return out;
}
function strideSet(n, strides = 5) {
  const out = [];
  for (const f of fibonacciUpTo(Math.floor(n / 2))) {
    if (f <= 0) continue;
    if (out.includes(f)) continue;
    out.push(f);
    if (out.length >= strides) break;
  }
  return out;
}
function buildRingLaplacian(n, opts = {}) {
  if (!Number.isInteger(n) || n < 3) throw new RangeError(`buildRingLaplacian: n must be an integer >= 3, got ${n}`);
  const strides = strideSet(n, opts.strides ?? 5);
  if (strides.length === 0) throw new RangeError(`buildRingLaplacian: no admissible strides for n=${n}`);
  const rows = Array.from({ length: n }, () => /* @__PURE__ */ new Map());
  const degree = new Float64Array(n);
  strides.forEach((s, r) => {
    const w = dpow(PHI, -(r + 1));
    for (let j = 0; j < n; j++) {
      const a = j;
      const b = (j + s) % n;
      if (a === b) continue;
      rows[a].set(b, (rows[a].get(b) ?? 0) + w);
      rows[b].set(a, (rows[b].get(a) ?? 0) + w);
      degree[a] += w;
      degree[b] += w;
    }
  });
  const rowPtr = new Int32Array(n + 1);
  let nnz = 0;
  for (let i = 0; i < n; i++) nnz += rows[i].size + 1;
  const colIdx = new Int32Array(nnz);
  const val2 = new Float64Array(nnz);
  let p = 0;
  for (let i = 0; i < n; i++) {
    rowPtr[i] = p;
    const cols = Array.from(rows[i].keys()).sort((a, b) => a - b);
    let wroteDiag = false;
    const di = degree[i] > 0 ? 1 / Math.sqrt(degree[i]) : 0;
    for (const c of cols) {
      if (!wroteDiag && c > i) {
        colIdx[p] = i;
        val2[p] = 1;
        p++;
        wroteDiag = true;
      }
      const dj = degree[c] > 0 ? 1 / Math.sqrt(degree[c]) : 0;
      colIdx[p] = c;
      val2[p] = -rows[i].get(c) * di * dj;
      p++;
    }
    if (!wroteDiag) {
      colIdx[p] = i;
      val2[p] = 1;
      p++;
    }
  }
  rowPtr[n] = p;
  return { n, rowPtr, colIdx, val: val2, nnz: p };
}
function applySparse(a, x, out) {
  const { n, rowPtr, colIdx, val: val2 } = a;
  for (let i = 0; i < n; i++) {
    let s = 0;
    let c = 0;
    for (let p = rowPtr[i]; p < rowPtr[i + 1]; p++) {
      const term = val2[p] * x[colIdx[p]];
      const t = s + term;
      c += Math.abs(s) >= Math.abs(term) ? s - t + term : term - t + s;
      s = t;
    }
    out[i] = s + c;
  }
  return out;
}
function dot(a, b) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    const term = a[i] * b[i];
    const t = s + term;
    c += Math.abs(s) >= Math.abs(term) ? s - t + term : term - t + s;
    s = t;
  }
  return s + c;
}
function norm(a) {
  return Math.sqrt(Math.max(0, dot(a, a)));
}
function tql2(d, e, z, m) {
  for (let i = 1; i < m; i++) e[i - 1] = e[i];
  e[m - 1] = 0;
  for (let l = 0; l < m; l++) {
    let iter = 0;
    let mm = l;
    for (; ; ) {
      for (mm = l; mm < m - 1; mm++) {
        const dd = Math.abs(d[mm]) + Math.abs(d[mm + 1]);
        if (Math.abs(e[mm]) <= Number.EPSILON * dd) break;
      }
      if (mm === l) break;
      if (iter++ === 50) break;
      let g2 = (d[l + 1] - d[l]) / (2 * e[l]);
      let r = dmag(g2, 1);
      g2 = d[mm] - d[l] + e[l] / (g2 + (g2 >= 0 ? Math.abs(r) : -Math.abs(r)));
      let s = 1;
      let c = 1;
      let p = 0;
      for (let i = mm - 1; i >= l; i--) {
        let f = s * e[i];
        const b = c * e[i];
        r = dmag(f, g2);
        e[i + 1] = r;
        if (r === 0) {
          d[i + 1] -= p;
          e[mm] = 0;
          break;
        }
        s = f / r;
        c = g2 / r;
        g2 = d[i + 1] - p;
        r = (d[i] - g2) * s + 2 * c * b;
        p = s * r;
        d[i + 1] = g2 + p;
        g2 = c * r - b;
        for (let k = 0; k < m; k++) {
          f = z[k * m + i + 1];
          z[k * m + i + 1] = s * z[k * m + i] + c * f;
          z[k * m + i] = c * z[k * m + i] - s * f;
        }
      }
      d[l] -= p;
      e[l] = g2;
      e[mm] = 0;
    }
  }
}
function lanczosEigenpairs(a, k, opts = {}) {
  const n = a.n;
  if (k <= 0 || k > n) throw new RangeError(`lanczosEigenpairs: k must be in 1..${n}, got ${k}`);
  const m = Math.min(n, opts.steps ?? Math.min(n, 8 * k + 55));
  const q0 = new Float64Array(n);
  for (let i = 0; i < n; i++) q0[i] = dcos(2 * Math.PI * i * (PHI - 1)) + 0.5;
  const n0 = norm(q0);
  for (let i = 0; i < n; i++) q0[i] /= n0;
  const basis = [q0];
  const alpha = new Float64Array(m);
  const beta = new Float64Array(m);
  const w = new Float64Array(n);
  let steps = m;
  for (let j = 0; j < m; j++) {
    applySparse(a, basis[j], w);
    alpha[j] = dot(basis[j], w);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i <= j; i++) {
        const c = dot(basis[i], w);
        const bi = basis[i];
        for (let t = 0; t < n; t++) w[t] -= c * bi[t];
      }
    }
    const nb = norm(w);
    if (j + 1 < m) {
      if (!(nb > 1e-13)) {
        steps = j + 1;
        break;
      }
      beta[j] = nb;
      const q = new Float64Array(n);
      for (let t = 0; t < n; t++) q[t] = w[t] / nb;
      basis.push(q);
    }
  }
  const d = alpha.slice(0, steps);
  const e = new Float64Array(steps);
  for (let i = 1; i < steps; i++) e[i] = beta[i - 1];
  const z = new Float64Array(steps * steps);
  for (let i = 0; i < steps; i++) z[i * steps + i] = 1;
  tql2(d, e, z, steps);
  const order = Array.from({ length: steps }, (_, i) => i).sort((x, y) => d[x] - d[y]);
  const take = Math.min(k, steps);
  const lambda = new Float64Array(take);
  const vectors = [];
  const residual = new Float64Array(take);
  const av = new Float64Array(n);
  for (let s = 0; s < take; s++) {
    const c = order[s];
    lambda[s] = d[c];
    const v = new Float64Array(n);
    for (let i = 0; i < steps; i++) {
      const w_i = z[i * steps + c];
      if (w_i === 0) continue;
      const bi = basis[i];
      for (let t = 0; t < n; t++) v[t] += w_i * bi[t];
    }
    const nv = norm(v);
    if (nv > 0) for (let t = 0; t < n; t++) v[t] /= nv;
    applySparse(a, v, av);
    let r = 0;
    for (let t = 0; t < n; t++) {
      const dlt = av[t] - lambda[s] * v[t];
      r += dlt * dlt;
    }
    residual[s] = Math.sqrt(r);
    vectors.push(v);
  }
  return { lambda, vectors, residual, steps };
}
var SPECTRUM_VERSION = "shfn-A-1";
function spectrumDigest(lambda) {
  const bytes = new Uint8Array(lambda.buffer, lambda.byteOffset, lambda.byteLength);
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
function measureSpectrum(nodes, modes, opts = {}) {
  const L = buildRingLaplacian(nodes, opts);
  const pairs = lanczosEigenpairs(L, modes, opts);
  let maxResidual = 0;
  for (let i = 0; i < pairs.residual.length; i++) maxResidual = Math.max(maxResidual, pairs.residual[i]);
  return {
    nodes,
    modes: pairs.lambda.length,
    lambda: pairs.lambda,
    maxResidual,
    digest: spectrumDigest(pairs.lambda),
    version: SPECTRUM_VERSION
  };
}

// ../omega/packages/trnn-core/src/spectral/fft.ts
var TWO_PI3 = 2 * Math.PI;
function dft(re, im, inverse = false) {
  const n = re.length;
  const outRe = new Float64Array(n);
  const outIm = new Float64Array(n);
  const sign = inverse ? 1 : -1;
  for (let k = 0; k < n; k++) {
    let sr = 0;
    let si = 0;
    for (let j = 0; j < n; j++) {
      const idx = k * j % n;
      const ang = sign * TWO_PI3 * idx / n;
      const c = dcos(ang);
      const s = dsin(ang);
      sr += re[j] * c - im[j] * s;
      si += re[j] * s + im[j] * c;
    }
    outRe[k] = sr;
    outIm[k] = si;
  }
  return { re: outRe, im: outIm };
}
function isPow2(n) {
  return n > 0 && (n & n - 1) === 0;
}
function fftPow2(re, im, inverse) {
  const n = re.length;
  if (n <= 1) return;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const ang = sign * TWO_PI3 * k / len;
        const wr = dcos(ang);
        const wi = dsin(ang);
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + half] * wr - im[i + k + half] * wi;
        const vi = re[i + k + half] * wi + im[i + k + half] * wr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
      }
    }
  }
}
function chirp(n, j, sign) {
  const m = j * j % (2 * n);
  const ang = sign * Math.PI * m / n;
  return { c: dcos(ang), s: dsin(ang) };
}
function fft(reIn, imIn, inverse = false) {
  const n = reIn.length;
  if (imIn.length !== n) throw new RangeError(`fft: re/im length mismatch ${n} vs ${imIn.length}`);
  if (n <= 1) return { re: Float64Array.from(reIn), im: Float64Array.from(imIn) };
  if (isPow2(n)) {
    const re = Float64Array.from(reIn);
    const im = Float64Array.from(imIn);
    fftPow2(re, im, inverse);
    return { re, im };
  }
  const sign = inverse ? 1 : -1;
  let m = 1;
  while (m < 2 * n - 1) m <<= 1;
  const ar = new Float64Array(m);
  const ai = new Float64Array(m);
  const br = new Float64Array(m);
  const bi = new Float64Array(m);
  for (let j = 0; j < n; j++) {
    const w = chirp(n, j, sign);
    ar[j] = reIn[j] * w.c - imIn[j] * w.s;
    ai[j] = reIn[j] * w.s + imIn[j] * w.c;
    br[j] = w.c;
    bi[j] = -w.s;
    if (j > 0) {
      br[m - j] = w.c;
      bi[m - j] = -w.s;
    }
  }
  fftPow2(ar, ai, false);
  fftPow2(br, bi, false);
  for (let i = 0; i < m; i++) {
    const r = ar[i] * br[i] - ai[i] * bi[i];
    const s = ar[i] * bi[i] + ai[i] * br[i];
    ar[i] = r;
    ai[i] = s;
  }
  fftPow2(ar, ai, true);
  const outRe = new Float64Array(n);
  const outIm = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const w = chirp(n, k, sign);
    const cr = ar[k] / m;
    const ci = ai[k] / m;
    outRe[k] = cr * w.c - ci * w.s;
    outIm[k] = cr * w.s + ci * w.c;
  }
  return { re: outRe, im: outIm };
}
function fftUnitary(re, im, inverse = false) {
  const out = fft(re, im, inverse);
  const k = 1 / Math.sqrt(re.length || 1);
  for (let i = 0; i < out.re.length; i++) {
    out.re[i] *= k;
    out.im[i] *= k;
  }
  return out;
}
function crossCorrelate(a, b) {
  const n = a.re.length;
  if (b.re.length !== n) throw new RangeError(`crossCorrelate: length mismatch ${n} vs ${b.re.length}`);
  const fa = fft(a.re, a.im, false);
  const fb = fft(b.re, b.im, false);
  const pr = new Float64Array(n);
  const pi = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    pr[i] = fa.re[i] * fb.re[i] + fa.im[i] * fb.im[i];
    pi[i] = fa.im[i] * fb.re[i] - fa.re[i] * fb.im[i];
  }
  const out = fft(pr, pi, true);
  for (let i = 0; i < n; i++) {
    out.re[i] /= n;
    out.im[i] /= n;
  }
  return out;
}

// ../omega/packages/trnn-core/src/fractal/nest.ts
var CHILD_SIZES = [89, 233];
var MAX_DEPTH = 3;
function depthRate(depth) {
  let r = 1;
  for (let d = 0; d < depth; d++) r *= PHI_INV;
  return r;
}
function costMultiplier(maxDepth = MAX_DEPTH) {
  let s = 0;
  for (let d = 0; d <= maxDepth; d++) s += depthRate(d);
  return s;
}
function createChildField(size, depth, site = -1) {
  if (depth < 1 || depth > MAX_DEPTH) {
    throw new RangeError(`createChildField: depth ${depth} outside 1..${MAX_DEPTH}`);
  }
  const lattice = createLattice(size, "fibonacci");
  const basis = buildBasis(lattice);
  return {
    site,
    depth,
    size,
    basis,
    state: createField(size),
    coeffs: new Float64Array(2 * basis.vectors.length),
    work: createField(size),
    explained: 0,
    lastUsed: 0
  };
}
function residualEnergy(psi, basis, coeffs, work) {
  analyze(basis, psi, coeffs);
  synthesize(basis, coeffs, work);
  const r = energy(psi) - energy(work);
  return r > 0 ? r : 0;
}
function restrict(child, patch) {
  const n = Math.min(child.state.n, patch.n);
  for (let i = 0; i < n; i++) {
    child.state.re[i] = patch.re[i];
    child.state.im[i] = patch.im[i];
  }
  for (let i = n; i < child.state.n; i++) {
    child.state.re[i] = 0;
    child.state.im[i] = 0;
  }
  analyze(child.basis, child.state, child.coeffs);
  synthesize(child.basis, child.coeffs, child.state);
}
function prolong(child, patch, mu) {
  if (!(mu > 0)) return 0;
  const n = Math.min(child.state.n, patch.n);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const dr = mu * child.state.re[i];
    const di = mu * child.state.im[i];
    patch.re[i] += dr;
    patch.im[i] += di;
    s += dr * dr + di * di;
  }
  return Math.sqrt(s);
}
var RESIDUAL_FACTOR = 1 / (PHI_INV * PHI_INV);
var SUSTAIN_TICKS = 89;
function medianOf(values) {
  const xs = Array.from(values).sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const m = xs.length >> 1;
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}
function qualifies(residual, median, sustained) {
  return residual > median * RESIDUAL_FACTOR && sustained >= SUSTAIN_TICKS;
}

// ../omega/packages/trnn-core/src/fractal/pool.ts
function childBytes(size) {
  return size * 8 * 4 + size * 2 * 8;
}
var FractalPool = class {
  constructor(bytesBudget, size = 233, maxSlots = 4096) {
    this.bytesBudget = bytesBudget;
    this.size = size;
    const per = childBytes(size);
    const n = Math.max(0, Math.min(maxSlots, Math.floor(bytesBudget / per)));
    for (let i = 0; i < n; i++) {
      this.slots.push(createChildField(size, 1, -1));
      this.occupied.push(false);
    }
  }
  slots = [];
  occupied = [];
  clock = 0;
  evictions = 0;
  frozen = false;
  /** Pressure gate — while frozen, `acquire` returns null instead of evicting. */
  setFrozen(frozen) {
    this.frozen = frozen;
  }
  isFrozen() {
    return this.frozen;
  }
  capacity() {
    return this.slots.length;
  }
  /** φ-scaled LRU score: recent *and* productive children survive. */
  score(c) {
    return c.lastUsed + c.explained * PHI;
  }
  /**
   * Take a slot for `site` at `depth`. Reuses an existing child for the same
   * site, then a free slot, then evicts the lowest-scoring occupant.
   * Returns null when frozen with nothing free, or when the pool is empty.
   */
  acquire(site, depth = 1) {
    if (depth < 1 || depth > MAX_DEPTH) return null;
    this.clock++;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.occupied[i] && this.slots[i].site === site && this.slots[i].depth === depth) {
        this.slots[i].lastUsed = this.clock;
        return this.slots[i];
      }
    }
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.occupied[i]) {
        this.occupied[i] = true;
        return this.reset(i, site, depth);
      }
    }
    if (this.frozen || this.slots.length === 0) return null;
    let worst = 0;
    let worstScore = Infinity;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.score(this.slots[i]);
      if (s < worstScore) {
        worstScore = s;
        worst = i;
      }
    }
    this.evictions++;
    return this.reset(worst, site, depth);
  }
  reset(i, site, depth) {
    const prev = this.slots[i];
    const c = prev.depth === depth ? prev : createChildField(this.size, depth, site);
    this.slots[i] = c;
    c.site = site;
    c.state.re.fill(0);
    c.state.im.fill(0);
    c.explained = 0;
    c.lastUsed = this.clock;
    return c;
  }
  release(site) {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.occupied[i] && this.slots[i].site === site) {
        this.occupied[i] = false;
        this.slots[i].site = -1;
        this.slots[i].explained = 0;
      }
    }
  }
  active() {
    const out = [];
    for (let i = 0; i < this.slots.length; i++) if (this.occupied[i]) out.push(this.slots[i]);
    return out;
  }
  stats() {
    let occ = 0;
    const hist = new Array(MAX_DEPTH + 1).fill(0);
    for (let i = 0; i < this.slots.length; i++) {
      if (this.occupied[i]) {
        occ++;
        hist[this.slots[i].depth]++;
      }
    }
    return {
      slots: this.slots.length,
      occupied: occ,
      size: this.size,
      bytesUsed: occ * childBytes(this.size),
      bytesBudget: this.bytesBudget,
      frozen: this.frozen,
      depthHistogram: hist,
      evictions: this.evictions
    };
  }
};

// ../omega/packages/trnn-core/src/algebra/clifford.ts
var MASK = [0, 1, 2, 4, 3, 6, 5, 7];
var ORIENT = [1, 1, 1, 1, 1, 1, -1, 1];
var BLADES = 8;
var BLADE_NAMES = ["1", "e1", "e2", "e3", "e12", "e23", "e31", "e123"];
function indexOfMask(m) {
  for (let i = 0; i < BLADES; i++) if (MASK[i] === m) return i;
  throw new Error(`clifford: no blade for mask ${m}`);
}
function reorderSign(a, b) {
  let sign = 1;
  for (let i = 0; i < 3; i++) {
    if (!(b & 1 << i)) continue;
    let above = 0;
    for (let j = i + 1; j < 3; j++) if (a & 1 << j) above++;
    if (above & 1) sign = -sign;
  }
  return sign;
}
function buildTable() {
  const t = [];
  for (let i = 0; i < BLADES; i++) {
    const row = [];
    for (let j = 0; j < BLADES; j++) {
      const a = MASK[i];
      const b = MASK[j];
      const s = reorderSign(a, b) * ORIENT[i] * ORIENT[j];
      const k = indexOfMask(a ^ b);
      row.push({ k, s: s * ORIENT[k] });
    }
    t.push(row);
  }
  return t;
}
var TABLE = buildTable();
function createMultiVectorField(n) {
  const lanes = [];
  for (let b = 0; b < BLADES; b++) lanes.push(new Float64Array(n));
  return { n, lanes };
}
function geometricProduct(a, b, out) {
  out.fill(0);
  for (let i = 0; i < BLADES; i++) {
    const ai = a[i];
    if (ai === 0) continue;
    const row = TABLE[i];
    for (let j = 0; j < BLADES; j++) {
      const bj = b[j];
      if (bj === 0) continue;
      const st = row[j];
      out[st.k] += st.s * ai * bj;
    }
  }
  return out;
}
function reverse(a, out) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = -a[4];
  out[5] = -a[5];
  out[6] = -a[6];
  out[7] = -a[7];
  return out;
}
function magnitude(a) {
  let s = 0;
  for (let i = 0; i < BLADES; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}
function normalizeRotor(a) {
  const m = magnitude(a);
  if (!(m > 0)) return 0;
  for (let i = 0; i < BLADES; i++) a[i] /= m;
  return m;
}
function rotorFromPlane(angle, b12, b23, b31) {
  const n = Math.sqrt(b12 * b12 + b23 * b23 + b31 * b31);
  const r = new Float64Array(BLADES);
  const c = dcos(angle / 2);
  const s = n > 0 ? dsin(angle / 2) / n : 0;
  r[0] = c;
  r[4] = -s * b12;
  r[5] = -s * b23;
  r[6] = -s * b31;
  return r;
}
function applyRotor(rotor, x, out, scratch3 = new Float64Array(BLADES), scratch22 = new Float64Array(BLADES)) {
  geometricProduct(rotor, x, scratch3);
  reverse(rotor, scratch22);
  return geometricProduct(scratch3, scratch22, out);
}
function applyBladeGain(a, gain) {
  for (let i = 1; i < BLADES; i++) a[i] *= gain;
}

// ../omega/packages/trnn-core/src/sense/nodeArray.ts
var TWO_PI4 = 2 * Math.PI;
var DEFAULT_BANDS = 8;
var DEFAULT_DEPTH = 89;
var SensoryNodeArray = class {
  n;
  bands;
  depth;
  /** Frequency plan, shared by every node. */
  plan;
  /** Golden stride used for the v-incident lines. */
  goldenStep;
  /** Latched band magnitude, row-major [node][band]. */
  bandAmp;
  /** Latched band phase in (−π, π], row-major [node][band]. */
  bandPhase;
  /** |z_j|² this tick. */
  energy;
  /** Energy share in [0, 1]. */
  share;
  /** Instantaneous frequency, cycles/tick, in (−½, ½]. */
  frequency;
  /** Signed current divergence across the four incident lattice lines. */
  divergence;
  /**
   * Parseval capture of the latched spectrum, in [0, 1] — the fraction of the
   * node's *vibrational* (AC) window energy the φ bands hold. The DC bin is
   * excluded from both sides: a node's standing amplitude is not a vibration,
   * and counting it in the denominator would make a perfectly-tracked but
   * slowly-drifting convergence read as unresolved.
   */
  capture;
  /**
   * Fraction of each node's window energy sitting on DC — its standing
   * amplitude as opposed to its motion. High dcShare with high capture means
   * a quiet, well-resolved node, not a blind one.
   */
  dcShare;
  /** Live DFT accumulators, row-major [node][band] × (re, im). */
  accRe;
  accIm;
  /** DC (bin 0) accumulators — the window mean, needed to split AC from DC. */
  accDcRe;
  accDcIm;
  /** Raw window trace of the probe node, for its full-spectrum transform. */
  probeRe;
  probeIm;
  probeNode = 0;
  probeResult = null;
  /** Running Σ|z_j|² inside the open window. */
  winEnergy;
  /** arg z_j on the previous tick. */
  prevPhase;
  primed = false;
  /** Per-band rotator for the current tick, recomputed once per tick. */
  rotRe;
  rotIm;
  windowPhase = 0;
  windowsClosed = 0;
  last;
  constructor(n, opts = {}) {
    if (!Number.isInteger(n) || n <= 0) {
      throw new RangeError(`SensoryNodeArray: n must be a positive integer, got ${n}`);
    }
    const bands = opts.bands ?? DEFAULT_BANDS;
    if (!Number.isInteger(bands) || bands < 1) {
      throw new RangeError(`SensoryNodeArray: bands must be a positive integer, got ${bands}`);
    }
    const depth = opts.depth ?? DEFAULT_DEPTH;
    if (!Number.isInteger(depth) || depth < 2) {
      throw new RangeError(`SensoryNodeArray: depth must be an integer >= 2, got ${depth}`);
    }
    if (!isFibonacci(depth)) {
      throw new RangeError(`SensoryNodeArray: depth ${depth} is not Fibonacci (Law 2.2)`);
    }
    if (bands / 2 > Math.floor(depth / 2)) {
      throw new RangeError(
        `SensoryNodeArray: ${bands} bands cannot fit in a ${depth}-tick window (max ${2 * Math.floor(depth / 2)})`
      );
    }
    this.n = n;
    this.bands = bands;
    this.depth = depth;
    this.plan = planBands(bands, depth);
    this.goldenStep = goldenStride(n);
    this.bandAmp = new Float64Array(n * bands);
    this.bandPhase = new Float64Array(n * bands);
    this.energy = new Float64Array(n);
    this.share = new Float64Array(n);
    this.frequency = new Float64Array(n);
    this.divergence = new Float64Array(n);
    this.capture = new Float64Array(n);
    this.accRe = new Float64Array(n * bands);
    this.accIm = new Float64Array(n * bands);
    this.accDcRe = new Float64Array(n);
    this.accDcIm = new Float64Array(n);
    this.probeRe = new Float64Array(depth);
    this.probeIm = new Float64Array(depth);
    this.dcShare = new Float64Array(n);
    this.winEnergy = new Float64Array(n);
    this.prevPhase = new Float64Array(n);
    this.rotRe = new Float64Array(bands);
    this.rotIm = new Float64Array(bands);
    this.last = {
      nodes: n,
      bands,
      depth,
      windowPhase: 0,
      windowsClosed: 0,
      energy: 0,
      peakShare: 0,
      energyEntropy: 0,
      meanFrequency: 0,
      divergenceSum: 0,
      circulation: 0,
      meanCapture: 0,
      minCapture: 0,
      silent: n,
      meanDcShare: 0,
      probe: null
    };
  }
  /** Exact bytes this array allocates — feeds the governor footprint check. */
  bytes() {
    const perNode = 8 * (6 + 4 * this.bands);
    return this.n * perNode + this.bands * 16 + this.plan.length * 32;
  }
  report() {
    return this.last;
  }
  /** Latched spectrum of one node, as a fresh array of `bands` magnitudes. */
  spectrumOf(node) {
    if (!Number.isInteger(node) || node < 0 || node >= this.n) {
      throw new RangeError(`SensoryNodeArray.spectrumOf: node ${node} out of range [0, ${this.n})`);
    }
    return this.bandAmp.slice(node * this.bands, (node + 1) * this.bands);
  }
  /**
   * Read the post-update field. Pure observation — nothing here is fed back
   * into the dynamics, so an engine with sensors digests identically to one
   * without.
   */
  update(z, lattice) {
    const n = this.n;
    const B = this.bands;
    const D = this.depth;
    const t = this.windowPhase;
    for (let k = 0; k < B; k++) {
      const th = -TWO_PI4 * this.plan[k].bin * t / D;
      this.rotRe[k] = dcos(th);
      this.rotIm[k] = dsin(th);
    }
    let total = 0;
    let freqSum = 0;
    for (let j = 0; j < n; j++) {
      const zr = z.re[j];
      const zi = z.im[j];
      const e = zr * zr + zi * zi;
      this.energy[j] = e;
      total += e;
      this.winEnergy[j] += e;
      this.accDcRe[j] += zr;
      this.accDcIm[j] += zi;
      if (j === this.probeNode) {
        this.probeRe[t] = zr;
        this.probeIm[t] = zi;
      }
      const ph = datan2(zi, zr);
      if (this.primed) {
        let d = ph - this.prevPhase[j];
        while (d > Math.PI) d -= TWO_PI4;
        while (d <= -Math.PI) d += TWO_PI4;
        const f = d / TWO_PI4;
        this.frequency[j] = f;
        freqSum += f < 0 ? -f : f;
      } else {
        this.frequency[j] = 0;
      }
      this.prevPhase[j] = ph;
      const row = j * B;
      for (let k = 0; k < B; k++) {
        const rr = this.rotRe[k];
        const ri = this.rotIm[k];
        this.accRe[row + k] += zr * rr - zi * ri;
        this.accIm[row + k] += zr * ri + zi * rr;
      }
    }
    this.primed = true;
    let peakShare = 0;
    let entropy = 0;
    if (total > 0) {
      for (let j = 0; j < n; j++) {
        const s = this.energy[j] / total;
        this.share[j] = s;
        if (s > peakShare) peakShare = s;
        if (s > 0) entropy -= s * dlog(s);
      }
      entropy /= dlog(n > 1 ? n : 2);
    } else {
      this.share.fill(0);
    }
    const step = this.goldenStep;
    let divSum = 0;
    let circulation = 0;
    for (let j = 0; j < n; j++) {
      const zr = z.re[j];
      const zi = z.im[j];
      let d = 0;
      d += current(zr, zi, z.re[(j + 1) % n], z.im[(j + 1) % n]);
      d += current(zr, zi, z.re[(j - 1 + n) % n], z.im[(j - 1 + n) % n]);
      d += current(zr, zi, z.re[(j + step) % n], z.im[(j + step) % n]);
      d += current(zr, zi, z.re[(j - step + n) % n], z.im[(j - step + n) % n]);
      this.divergence[j] = d;
      divSum += d;
      circulation += d < 0 ? -d : d;
    }
    this.windowPhase = t + 1;
    let meanCapture = this.last.meanCapture;
    let minCapture = this.last.minCapture;
    let silent = this.last.silent;
    let meanDcShare = this.last.meanDcShare;
    if (this.windowPhase >= D) {
      this.windowPhase = 0;
      this.windowsClosed++;
      let capSum = 0;
      let dcSum = 0;
      minCapture = 1;
      silent = 0;
      for (let j = 0; j < n; j++) {
        const row = j * B;
        let held = 0;
        let peak = 0;
        for (let k = 0; k < B; k++) {
          const ar = this.accRe[row + k];
          const ai = this.accIm[row + k];
          const mag = dmag(ar, ai) / D;
          this.bandAmp[row + k] = mag;
          this.bandPhase[row + k] = datan2(ai, ar);
          held += (ar * ar + ai * ai) / D;
          if (mag > peak) peak = mag;
          this.accRe[row + k] = 0;
          this.accIm[row + k] = 0;
        }
        const dr = this.accDcRe[j];
        const di = this.accDcIm[j];
        const dcEnergy = (dr * dr + di * di) / D;
        this.accDcRe[j] = 0;
        this.accDcIm[j] = 0;
        const we = this.winEnergy[j];
        this.dcShare[j] = we > 0 ? Math.min(1, dcEnergy / we) : 0;
        const ac = we - dcEnergy;
        const cap = ac > 1e-300 ? Math.min(1, held / ac) : 0;
        this.capture[j] = cap;
        capSum += cap;
        dcSum += this.dcShare[j];
        if (cap < minCapture) minCapture = cap;
        if (peak === 0) silent++;
        this.winEnergy[j] = 0;
      }
      meanCapture = capSum / n;
      meanDcShare = dcSum / n;
      this.probeResult = this.runProbe();
      let hot = 0;
      for (let j = 1; j < n; j++) if (this.energy[j] > this.energy[hot]) hot = j;
      this.probeNode = hot;
    }
    this.last = {
      nodes: n,
      bands: B,
      depth: D,
      windowPhase: this.windowPhase,
      windowsClosed: this.windowsClosed,
      energy: total,
      peakShare,
      energyEntropy: entropy,
      meanFrequency: n > 0 ? freqSum / n : 0,
      divergenceSum: divSum,
      circulation,
      meanCapture,
      minCapture: this.windowsClosed > 0 ? minCapture : 0,
      silent: this.windowsClosed > 0 ? silent : n,
      meanDcShare,
      probe: this.probeResult
    };
    return this.last;
  }
  /**
   * Full windowed DFT of the probe node. Exact for any depth (Bluestein), so
   * the reported lines are the true spectrum of that convergence, not an
   * interpolation between φ bands.
   */
  runProbe() {
    const D = this.depth;
    const spec = fft(this.probeRe, this.probeIm);
    const ladder = new Set(this.plan.map((p) => p.bin));
    let ac = 0;
    const power = new Float64Array(D);
    for (let b = 1; b < D; b++) {
      const e = (spec.re[b] * spec.re[b] + spec.im[b] * spec.im[b]) / D;
      power[b] = e;
      ac += e;
    }
    let onLadder = 0;
    for (const b of ladder) onLadder += power[b] ?? 0;
    const order = [];
    for (let b = 1; b < D; b++) order.push(b);
    order.sort((a, b) => power[b] - power[a]);
    const lines = order.slice(0, 5).map((b) => ({
      bin: b,
      frequency: (b <= D / 2 ? b : b - D) / D,
      share: ac > 0 ? power[b] / ac : 0,
      onLadder: ladder.has(b)
    }));
    return { node: this.probeNode, lines, ladderShare: ac > 0 ? onLadder / ac : 0 };
  }
  /** Reset all accumulators and latched state (used by checkpoint restore). */
  reset() {
    this.accRe.fill(0);
    this.accIm.fill(0);
    this.winEnergy.fill(0);
    this.prevPhase.fill(0);
    this.bandAmp.fill(0);
    this.bandPhase.fill(0);
    this.energy.fill(0);
    this.share.fill(0);
    this.frequency.fill(0);
    this.divergence.fill(0);
    this.capture.fill(0);
    this.dcShare.fill(0);
    this.accDcRe.fill(0);
    this.accDcIm.fill(0);
    this.probeRe.fill(0);
    this.probeIm.fill(0);
    this.probeNode = 0;
    this.probeResult = null;
    this.windowPhase = 0;
    this.windowsClosed = 0;
    this.primed = false;
  }
};
function current(ar, ai, br, bi) {
  return ar * bi - ai * br;
}
var LADDER_ANCHOR = PHI_INV * PHI_INV;
function planBands(bands, depth) {
  if (bands % 2 !== 0) {
    throw new RangeError(`planBands: bands must be even (\xB1 pairs), got ${bands}`);
  }
  const nyquist = Math.floor(depth / 2);
  const used = /* @__PURE__ */ new Set();
  const out = [];
  for (let k = 0; k < bands; k++) {
    const rung = k >> 1;
    const sense = k % 2 === 0 ? 1 : -1;
    const magnitude2 = LADDER_ANCHOR * dpow(PHI_INV, rung);
    const target = sense * magnitude2;
    let m = Math.min(nyquist, Math.round(magnitude2 * depth));
    while (m > 0 && used.has(sense > 0 ? m : depth - m)) m--;
    if (m <= 0) {
      throw new RangeError(
        `planBands: band ${k} (target ${target} cycles/tick) has no free DFT bin in a ${depth}-tick window`
      );
    }
    const bin = sense > 0 ? m : depth - m;
    used.add(bin);
    const frequency = sense * m / depth;
    out.push({
      index: k,
      bin,
      frequency,
      sense,
      target,
      drift: Math.abs(frequency - target) / Math.abs(target)
    });
  }
  return out;
}
function goldenStride(n) {
  const s = Math.round(n * PHI_INV) % n;
  return s < 1 ? 1 : s;
}
function sensoryNodeBytes(n, bands = DEFAULT_BANDS) {
  return n * 8 * (6 + 4 * bands) + bands * 16;
}
function bandTarget(k) {
  return 0.5 * dpow(PHI, -k);
}

// ../omega/packages/trnn-core/src/engine/SingleTorusEngine.ts
var SENSE_BOUND = PHI;
var SingleTorusEngine = class {
  nodes;
  rung;
  lattice;
  basis;
  /** Contraction certificate for the homogeneous cell. */
  juryGain = JURY_GAIN;
  /** Effective memory kernel actually used by this rung (S5). */
  lambda;
  /** Magnetic phase offset actually used by this rung, radians (S5). */
  modePhase;
  /** Vacuum drive setpoint actually in force (0 = undriven / oracle exact). */
  drive;
  /** N0 per-node organ bank, or null when this rung was built without organs. */
  organs;
  /** N1 per-node sensory array, or null when this rung was built without one. */
  sensors;
  /** Frozen cos/sin of the modal rotation — precomputed, never re-derived. */
  cth;
  sth;
  z;
  zNext;
  m;
  G;
  P;
  R;
  Pi;
  zhat;
  coeffs;
  sig;
  chain;
  meter;
  gate = new CorridorGate();
  tape;
  tick = 0;
  lastCheckpoint = null;
  inputBuffer = null;
  webBuffer = null;
  senseBuffer = null;
  /** Vacuum-drive staging buffer (allocated only when the drive is armed). */
  driveBuffer = null;
  constructor(opts) {
    this.nodes = opts.nodes;
    this.rung = opts.rung ?? 1;
    const lambda = opts.lambda ?? LAMBDA_MEMORY;
    if (!(lambda > 0) || lambda > LAMBDA_MEMORY) {
      throw new RangeError(
        `SingleTorusEngine: lambda must be in (0, ${LAMBDA_MEMORY}] \u2014 the thermal operator may only shrink it; got ${lambda}`
      );
    }
    const modePhase = opts.modePhase ?? 0;
    if (!Number.isFinite(modePhase)) {
      throw new RangeError(`SingleTorusEngine: modePhase must be finite, got ${modePhase}`);
    }
    const drive = opts.drive ?? 0;
    if (!Number.isFinite(drive) || drive < 0 || drive > PHI) {
      throw new RangeError(`SingleTorusEngine: drive must be in [0, ${PHI}], got ${drive}`);
    }
    this.lambda = lambda;
    this.modePhase = modePhase;
    this.drive = drive;
    const th = 2 * Math.PI * PHI_INV + modePhase;
    this.cth = dcos(th);
    this.sth = dsin(th);
    this.lattice = createLattice(opts.nodes, opts.lattice ?? "fibonacci");
    this.basis = buildBasis(this.lattice, opts.modes ?? SIGNATURE_MODES);
    this.z = createField(this.nodes);
    this.zNext = createField(this.nodes);
    this.m = createField(this.nodes);
    this.G = createField(this.nodes);
    this.P = createField(this.nodes);
    this.R = createField(this.nodes);
    this.Pi = createField(this.nodes);
    this.zhat = createField(this.nodes);
    this.coeffs = coeffBuffer(this.basis);
    this.sig = new Float64Array(this.basis.vectors.length);
    this.organs = opts.organs ? new NodeOrgans(this.nodes, this.basis.vectors.length, { rung: this.rung, ...opts.organs }) : null;
    this.sensors = opts.sensors ? new SensoryNodeArray(this.nodes, opts.sensors) : null;
    this.chain = new DigestChain(opts.seed ?? "metatron-omega");
    this.meter = new CoherenceMeter(this.nodes, opts.coherenceDelay);
    this.tape = new TranscriptionTape(opts.tapeCapacity ?? 2584, this.basis.vectors.length);
    this.seedField(opts.seed ?? "metatron-omega");
  }
  /** Deterministic initial condition — off the tick path (Law L2 compliant). */
  seedField(seed) {
    const rng = new SeedStream(seed);
    for (let i = 0; i < this.nodes; i++) {
      const a = 0.5 * (0.5 + 0.5 * rng.next());
      const th = 2 * Math.PI * (i * PHI_INV % 1);
      this.z.re[i] = a * dcos(th);
      this.z.im[i] = a * dsin(th);
      this.m.re[i] = this.z.re[i];
      this.m.im[i] = this.z.im[i];
    }
  }
  /** Stage an external input U for the next tick (copied, not retained). */
  setInput(u) {
    if (!u) {
      this.inputBuffer = null;
      return;
    }
    if (!this.inputBuffer) this.inputBuffer = createField(this.nodes);
    zeroField(this.inputBuffer);
    const k = Math.min(this.nodes, u.n);
    for (let i = 0; i < k; i++) {
      this.inputBuffer.re[i] = u.re[i];
      this.inputBuffer.im[i] = u.im[i];
    }
  }
  /**
   * Stage a cross-rung web receipt V for the next tick (copied, not retained).
   * Zero-gated by default: with no receipt the term contributes exactly nothing,
   * so the single-torus digest chain is unchanged (Law: no silent regression).
   */
  setWebReceipt(v) {
    if (!v) {
      this.webBuffer = null;
      return;
    }
    if (!this.webBuffer) this.webBuffer = createField(this.nodes);
    zeroField(this.webBuffer);
    const k = Math.min(this.nodes, v.n);
    for (let i = 0; i < k; i++) {
      this.webBuffer.re[i] = v.re[i];
      this.webBuffer.im[i] = v.im[i];
    }
  }
  /**
   * Stage a sensory injection S for the next tick (copied, not retained).
   * Zero-gated exactly like the web receipt: with no sensory plane attached the
   * ξ-term contributes nothing and the digest chain is bit-identical to P5.
   * The φ bound is re-applied here, so no caller can inject past Law L-S1.
   */
  setSensory(s) {
    if (!s) {
      this.senseBuffer = null;
      return;
    }
    if (!this.senseBuffer) this.senseBuffer = createField(this.nodes);
    zeroField(this.senseBuffer);
    const k = Math.min(this.nodes, s.n);
    for (let i = 0; i < k; i++) {
      this.senseBuffer.re[i] = s.re[i];
      this.senseBuffer.im[i] = s.im[i];
    }
    if (this.organs) this.organs.applyReceptors(this.senseBuffer);
    clampField(this.senseBuffer, SENSE_BOUND);
    this.organs?.recordInjection(this.senseBuffer);
  }
  /**
   * Resolve the U slot for this tick: the staged external input, plus the
   * vacuum drive when it is armed and the rung sits below its setpoint.
   *
   * Deterministic (tick + node index only), allocation-free after the first
   * armed tick, and bounded by φ so Law L-S1 and the ISS certificate hold.
   */
  resolveInput() {
    if (this.drive <= 0) return this.inputBuffer;
    let peak = 0;
    for (let i = 0; i < this.nodes; i++) {
      const a = Math.sqrt(this.z.re[i] * this.z.re[i] + this.z.im[i] * this.z.im[i]);
      if (a > peak) peak = a;
    }
    const deficit = this.drive - peak;
    if (deficit <= 0) return this.inputBuffer;
    const amp = Math.min(CLAMP_MAX, deficit / CELL.eta);
    if (!this.driveBuffer) this.driveBuffer = createField(this.nodes);
    const d = this.driveBuffer;
    const turn = this.tick * PHI_INV % 1;
    for (let i = 0; i < this.nodes; i++) {
      const th = 2 * Math.PI * ((i * PHI_INV + turn) % 1);
      d.re[i] = amp * dcos(th);
      d.im[i] = amp * dsin(th);
    }
    const u = this.inputBuffer;
    if (u) {
      for (let i = 0; i < this.nodes; i++) {
        d.re[i] += u.re[i];
        d.im[i] += u.im[i];
      }
    }
    return d;
  }
  /** One deterministic tick in the fixed E10 order. */
  step() {
    analyze(this.basis, this.z, this.coeffs);
    synthesize(this.basis, this.coeffs, this.G);
    const cth = this.cth;
    const sth = this.sth;
    for (let i = 0; i < this.nodes; i++) {
      this.P.re[i] = this.G.re[i] * cth - this.G.im[i] * sth;
      this.P.im[i] = this.G.re[i] * sth + this.G.im[i] * cth;
    }
    for (let i = 0; i < this.nodes; i++) {
      this.R.re[i] = this.m.re[i];
      this.R.im[i] = this.m.im[i];
    }
    this.organs?.applyRadial(this.R);
    const closure = closureTarget(this.z, this.Pi, this.tick, this.rung);
    for (let i = 0; i < this.nodes; i++) {
      this.zhat.re[i] = this.m.re[i] + (this.m.re[i] - this.z.re[i]) * PHI_INV;
      this.zhat.im[i] = this.m.im[i] + (this.m.im[i] - this.z.im[i]) * PHI_INV;
    }
    const terms = {
      G: this.G,
      P: this.P,
      R: this.R,
      Pi: this.Pi,
      zhat: this.zhat,
      U: this.resolveInput(),
      V: this.webBuffer,
      S: this.senseBuffer
    };
    const cell = cellStep(this.z, this.zNext, terms);
    const finite2 = isFiniteField(this.zNext);
    if (!finite2) {
      const cp = this.lastCheckpoint;
      if (cp) this.restore(cp);
      return {
        tick: this.tick,
        coherence: 0,
        ignition: false,
        coherenceWarm: false,
        energy: 0,
        peak: 0,
        delta: 0,
        realizedGain: 0,
        clamped: cell.clamped,
        obstruction: closure.obstruction,
        residualFlux: closure.residualFlux,
        regime: "CRITICAL",
        gateScale: 0,
        closureDefect: closure.defect,
        closureQuality: closure.closure,
        skill: 0,
        digest: this.chain.head(),
        checkpointed: false,
        finite: false
      };
    }
    const delta = distance(this.zNext, this.z);
    copyField(this.z, this.zNext);
    memoryStep(this.m, this.z, this.lambda);
    const coh = this.meter.push(this.z);
    const st = readState(this.z);
    const gate = this.gate.read(closure.defect);
    analyze(this.basis, this.z, this.coeffs);
    signature(this.basis, this.coeffs, this.sig);
    this.organs?.update(this.z, this.basis, this.coeffs);
    this.sensors?.update(this.z, this.lattice);
    const digest = this.chain.link(this.z.re, this.z.im, this.sig);
    this.tape.write(this.tick, this.sig, digest);
    this.tick++;
    const checkpointed = this.tick % CHECKPOINT_PERIOD === 0;
    if (checkpointed) {
      this.lastCheckpoint = {
        tick: this.tick,
        z: cloneField(this.z),
        m: cloneField(this.m),
        digest,
        chainLength: this.chain.length()
      };
    }
    return {
      tick: this.tick,
      coherence: coh.c,
      ignition: coh.ignition,
      coherenceWarm: coh.warm,
      energy: st.energy,
      peak: st.peak,
      delta,
      realizedGain: cell.realizedGain,
      clamped: cell.clamped,
      obstruction: closure.obstruction,
      residualFlux: closure.residualFlux,
      regime: gate.regime,
      gateScale: gate.scale,
      closureDefect: closure.defect,
      closureQuality: closure.closure,
      skill: gate.skill,
      digest,
      checkpointed,
      finite: true
    };
  }
  run(ticks) {
    let last = this.step();
    for (let i = 1; i < ticks; i++) last = this.step();
    return last;
  }
  /** Immutable read of the live field (copy — never hand out the buffers). */
  snapshot() {
    return {
      tick: this.tick,
      z: cloneField(this.z),
      m: cloneField(this.m),
      signature: Float64Array.from(this.sig),
      digest: this.chain.head()
    };
  }
  checkpoint() {
    return {
      tick: this.tick,
      z: cloneField(this.z),
      m: cloneField(this.m),
      digest: this.chain.head(),
      chainLength: this.chain.length()
    };
  }
  restore(cp) {
    copyField(this.z, cp.z);
    copyField(this.m, cp.m);
    this.tick = cp.tick;
    this.chain.restore(cp.digest, cp.chainLength);
    this.meter.reset();
    this.gate.reset();
    this.sensors?.reset();
  }
  /** Latest per-node organ readout, or null when the rung has no organs. */
  organReport() {
    return this.organs ? this.organs.report() : null;
  }
  /** Latest per-node sensory readout, or null when the rung has no array. */
  sensorReport() {
    return this.sensors ? this.sensors.report() : null;
  }
  currentTick() {
    return this.tick;
  }
  digest() {
    return this.chain.head();
  }
};

// ../omega/packages/trnn-core/src/web/coupling.ts
function kahan(a, from, len) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < len; i++) {
    const y = a[from + i] - c;
    const t = s + y;
    c = t - s - y;
    s = t;
  }
  return s;
}
function chordOffsets(kind, size) {
  const out = [];
  if (kind === "fibonacci") {
    let a = 1;
    let b = 2;
    while (a < size) {
      out.push(a);
      const c = a + b;
      a = b;
      b = c;
    }
  } else if (kind === "lucas") {
    let a = 1;
    let b = 3;
    while (a < size) {
      out.push(a);
      const c = a + b;
      a = b;
      b = c;
    }
  } else {
    for (let k = 1; ; k++) {
      const d = Math.round(dpow(PHI, k));
      if (d >= size) break;
      if (!out.includes(d)) out.push(d);
    }
  }
  return out.filter((d) => d >= 1 && d < size);
}
function buildCoupling(rungs, opts = {}) {
  const size = rungs.length;
  const band = opts.band ?? 3;
  const self = opts.self ?? 1;
  const chordGain = opts.chordGain ?? 1;
  if (!(chordGain >= 0) || chordGain > 1) {
    throw new RangeError(`buildCoupling: chordGain must be in [0, 1], got ${chordGain}`);
  }
  const chordSet = /* @__PURE__ */ new Set();
  for (const kind of opts.chords ?? []) for (const d of chordOffsets(kind, size)) chordSet.add(d);
  const chords = [...chordSet].filter((d) => d > band).sort((a, b) => a - b);
  const w = new Float64Array(size * size);
  for (let i = 0; i < size; i++) {
    const base = i * size;
    for (let j = 0; j < size; j++) {
      const d = Math.abs(i - j);
      if (d > band) continue;
      w[base + j] = d === 0 ? self : dpow(PHI, -d) * rungs[i].qrf;
    }
    if (chordGain > 0) {
      for (const d of chords) {
        const wgt = chordGain * dpow(PHI, -d * PHI_INV) * rungs[i].qrf;
        if (i - d >= 0) w[base + i - d] += wgt;
        if (i + d < size) w[base + i + d] += wgt;
      }
    }
    const s = kahan(w, base, size);
    if (s > 0) for (let j = 0; j < size; j++) w[base + j] /= s;
    w[base + i] = 0;
    const rest = kahan(w, base, size);
    w[base + i] = 1 - rest;
  }
  let defect = 0;
  for (let i = 0; i < size; i++) {
    const e = Math.abs(kahan(w, i * size, size) - 1);
    if (e > defect) defect = e;
  }
  return { size, w, rungs: rungs.map((r) => r.n), rowSumDefect: defect, band, chords };
}
function couplingWeight(m, to, from) {
  return m.w[to * m.size + from];
}
function emittedMass(m, from) {
  let s = 0;
  for (let i = 0; i < m.size; i++) s += m.w[i * m.size + from];
  return s;
}

// ../omega/packages/trnn-core/src/web/octave.ts
function energyOf(f) {
  let s = 0;
  for (let i = 0; i < f.n; i++) s += f.re[i] * f.re[i] + f.im[i] * f.im[i];
  return s;
}
function octaveTransport(src, dst) {
  const N = src.n;
  const M = dst.n;
  const se = energyOf(src);
  if (N === M) {
    dst.re.set(src.re);
    dst.im.set(src.im);
    return { sourceEnergy: se, targetEnergy: se, energyRatio: 1, identity: true };
  }
  if (M < N) {
    const step = N / M;
    for (let k = 0; k < M; k++) {
      const a = k * step;
      const b = a + step;
      let ar = 0;
      let ai = 0;
      let wsum = 0;
      const i0 = Math.floor(a);
      const i1 = Math.ceil(b);
      for (let i = i0; i < i1; i++) {
        const lo = Math.max(a, i);
        const hi = Math.min(b, i + 1);
        const wgt = hi - lo;
        if (wgt <= 0) continue;
        const idx = (i % N + N) % N;
        ar += wgt * src.re[idx];
        ai += wgt * src.im[idx];
        wsum += wgt;
      }
      dst.re[k] = wsum > 0 ? ar / wsum : 0;
      dst.im[k] = wsum > 0 ? ai / wsum : 0;
    }
  } else {
    const step = N / M;
    for (let k = 0; k < M; k++) {
      const x = k * step;
      const i0 = Math.floor(x);
      const t = x - i0;
      const a = (i0 % N + N) % N;
      const b = (a + 1) % N;
      dst.re[k] = src.re[a] * (1 - t) + src.re[b] * t;
      dst.im[k] = src.im[a] * (1 - t) + src.im[b] * t;
    }
  }
  const te = energyOf(dst);
  return { sourceEnergy: se, targetEnergy: te, energyRatio: se > 0 ? te / se : 1, identity: false };
}
var OctaveScratch = class {
  pool = /* @__PURE__ */ new Map();
  get(n) {
    let f = this.pool.get(n);
    if (!f) {
      f = createField(n);
      this.pool.set(n, f);
    }
    return f;
  }
  sizes() {
    return [...this.pool.keys()].sort((a, b) => a - b);
  }
};

// ../omega/packages/trnn-core/src/web/fluxLedger.ts
var FLUX_SINK = -1;
var Neumaier = class {
  s = 0;
  c = 0;
  add(x) {
    const t = this.s + x;
    this.c += Math.abs(this.s) >= Math.abs(x) ? this.s - t + x : x - t + this.s;
    this.s = t;
  }
  value() {
    return this.s + this.c;
  }
  reset() {
    this.s = 0;
    this.c = 0;
  }
};
var FluxLedger = class {
  entries = [];
  debits = new Neumaier();
  credits = new Neumaier();
  perRung = /* @__PURE__ */ new Map();
  cap;
  constructor(cap = 4096) {
    this.cap = cap;
  }
  /** Record a transfer. Negative amounts are rejected — reverse the direction. */
  post(tick, from, to, amount) {
    if (!(amount >= 0) || !Number.isFinite(amount)) {
      throw new Error(`FluxLedger.post: amount must be finite and >= 0, got ${amount}`);
    }
    if (amount === 0) return;
    this.debits.add(amount);
    this.credits.add(amount);
    this.perRung.set(from, (this.perRung.get(from) ?? 0) - amount);
    this.perRung.set(to, (this.perRung.get(to) ?? 0) + amount);
    this.entries.push({ tick, from, to, amount });
    if (this.entries.length > this.cap) this.entries.splice(0, this.entries.length - this.cap);
  }
  /** Route unabsorbed closure residue into the sink (still double-entry). */
  postToSink(tick, from, amount) {
    this.post(tick, from, FLUX_SINK, amount);
  }
  /** Total debit minus total credit — structurally 0, measured anyway. */
  imbalance() {
    return this.debits.value() - this.credits.value();
  }
  /** Net position of a rung rank (positive = net receiver). */
  net(rank2) {
    return this.perRung.get(rank2) ?? 0;
  }
  /** Sum of every net position; 0 by construction, reported for the gate. */
  netImbalance() {
    const acc = new Neumaier();
    for (const v of this.perRung.values()) acc.add(v);
    return acc.value();
  }
  turnover() {
    return this.credits.value();
  }
  tail(k = 32) {
    return this.entries.slice(Math.max(0, this.entries.length - k));
  }
  size() {
    return this.entries.length;
  }
  setCap(cap) {
    this.cap = Math.max(1, cap | 0);
    if (this.entries.length > this.cap) this.entries.splice(0, this.entries.length - this.cap);
  }
  reset() {
    this.entries.length = 0;
    this.debits.reset();
    this.credits.reset();
    this.perRung.clear();
  }
};

// ../omega/packages/trnn-core/src/web/ordering.ts
var PHASE_ORDER = ["stage", "exchange", "update", "measure", "commit"];
var OrderingMonitor = class {
  tick = -1;
  phaseIdx = -1;
  written = /* @__PURE__ */ new Set();
  violations = [];
  beginTick(tick) {
    if (tick <= this.tick) {
      this.violations.push({ tick, rank: -1, phase: "stage", reason: `tick did not advance (${tick} <= ${this.tick})` });
    }
    this.tick = tick;
    this.phaseIdx = -1;
    this.written.clear();
  }
  enterPhase(p) {
    const idx = PHASE_ORDER.indexOf(p);
    if (idx < this.phaseIdx) {
      this.violations.push({ tick: this.tick, rank: -1, phase: p, reason: `phase went backwards from ${PHASE_ORDER[this.phaseIdx]}` });
    }
    this.phaseIdx = idx;
  }
  /** Register a read of rung `rank`'s state; must be pre-update. */
  read(rank2) {
    if (this.written.has(rank2)) {
      this.violations.push({ tick: this.tick, rank: rank2, phase: PHASE_ORDER[Math.max(0, this.phaseIdx)], reason: "read-after-write inside one tick" });
    }
  }
  /** Register a commit of rung `rank`'s new state. */
  write(rank2) {
    if (this.phaseIdx < PHASE_ORDER.indexOf("update")) {
      this.violations.push({ tick: this.tick, rank: rank2, phase: PHASE_ORDER[Math.max(0, this.phaseIdx)], reason: "write before the update phase" });
    }
    this.written.add(rank2);
  }
  count() {
    return this.violations.length;
  }
  list() {
    return this.violations;
  }
  reset() {
    this.tick = -1;
    this.phaseIdx = -1;
    this.written.clear();
    this.violations.length = 0;
  }
};
function fibonacciStrides(size, mode = "uniform") {
  const s = new Int32Array(size);
  if (mode === "uniform") {
    s.fill(1);
    return s;
  }
  let a = 1;
  let b = 1;
  for (let i = 0; i < size; i++) {
    s[i] = Math.min(a, 13);
    const c = a + b;
    a = b;
    b = c;
  }
  return s;
}

// ../omega/packages/trnn-core/src/web/morphism.ts
function mean(f) {
  let r = 0;
  let i = 0;
  for (let k = 0; k < f.n; k++) {
    r += f.re[k];
    i += f.im[k];
  }
  return f.n > 0 ? { re: r / f.n, im: i / f.n } : { re: 0, im: 0 };
}
function rotate(src, dst, theta) {
  const c = dcos(theta);
  const s = dsin(theta);
  for (let i = 0; i < src.n; i++) {
    dst.re[i] = src.re[i] * c - src.im[i] * s;
    dst.im[i] = src.re[i] * s + src.im[i] * c;
  }
}
function checkMorphism(z, targetNodes, theta = 1.0471975511965976) {
  const t1 = createField(targetNodes);
  const t2 = createField(targetNodes);
  const rotSrc = createField(z.n);
  const rotT1 = createField(targetNodes);
  octaveTransport(z, t1);
  rotate(t1, rotT1, theta);
  rotate(z, rotSrc, theta);
  octaveTransport(rotSrc, t2);
  let d = 0;
  for (let i = 0; i < targetNodes; i++) {
    const dr = rotT1.re[i] - t2.re[i];
    const di = rotT1.im[i] - t2.im[i];
    const a = Math.sqrt(dr * dr + di * di);
    if (a > d) d = a;
  }
  const ms = mean(z);
  const mt = mean(t1);
  const mr = mt.re - ms.re;
  const mi = mt.im - ms.im;
  return {
    phaseCommutationDefect: d,
    meanDefect: Math.sqrt(mr * mr + mi * mi)
  };
}

// ../omega/packages/trnn-core/src/memory/turingTape.ts
var TAPE_WRITE_WEIGHT = PHI_INV * PHI_INV;
var TAPE_BOUND = PHI;
var FIB = (() => {
  const f = [1, 2];
  while (f[f.length - 1] < 2 ** 31) f.push(f[f.length - 1] + f[f.length - 2]);
  return f;
})();
function zeckendorf(x) {
  if (!Number.isInteger(x) || x < 0) throw new RangeError(`zeckendorf: x must be a non-negative integer, got ${x}`);
  const out = [];
  let rest = x;
  let i = FIB.length - 1;
  while (rest > 0 && i >= 0) {
    if (FIB[i] <= rest) {
      out.push(i);
      rest -= FIB[i];
      i -= 2;
    } else {
      i--;
    }
  }
  return out;
}
function zeckendorfOrder(x) {
  const z = zeckendorf(x);
  return z.length > 0 ? z[0] : 0;
}
var TuringTape = class {
  capacity;
  re;
  im;
  touched;
  head;
  step = 0;
  occupancy = 0;
  constructor(opts = {}) {
    const capacity = opts.capacity ?? 987;
    if (!isFibonacci(capacity)) {
      throw new RangeError(`TuringTape: capacity ${capacity} is not Fibonacci (Law 2.2)`);
    }
    const head = opts.head ?? 0;
    if (!Number.isInteger(head) || head < 0 || head >= capacity) {
      throw new RangeError(`TuringTape: head ${head} out of range [0, ${capacity})`);
    }
    this.capacity = capacity;
    this.re = new Float64Array(capacity);
    this.im = new Float64Array(capacity);
    this.touched = new Uint8Array(capacity);
    this.head = head;
  }
  bytes() {
    return this.capacity * (8 + 8 + 1);
  }
  position() {
    return this.head;
  }
  steps() {
    return this.step;
  }
  /** Read one cell (no side effects). */
  cell(address) {
    const a = (address % this.capacity + this.capacity) % this.capacity;
    return { re: this.re[a], im: this.im[a] };
  }
  /**
   * Advance the machine one step against a field.
   *
   * The value written at address `a` is the field sampled at the node that
   * address maps onto (address mod nodes) — the tape and the rung share the
   * same circle, so the mapping is a rotation, not an arbitrary hash.
   */
  advance(z) {
    const C = this.capacity;
    const from = this.head;
    const node = z.n > 0 ? from % z.n : 0;
    const vr = z.n > 0 ? z.re[node] : 0;
    const vi = z.n > 0 ? z.im[node] : 0;
    const w = TAPE_WRITE_WEIGHT;
    let nr = (1 - w) * this.re[from] + w * vr;
    let ni = (1 - w) * this.im[from] + w * vi;
    const mag = dmag(nr, ni);
    if (mag > TAPE_BOUND) {
      const k = TAPE_BOUND / mag;
      nr *= k;
      ni *= k;
    }
    this.re[from] = nr;
    this.im[from] = ni;
    if (this.touched[from] === 0) {
      this.touched[from] = 1;
      this.occupancy++;
    }
    const wrote = dmag(w * vr, w * vi);
    const read = dmag(nr, ni);
    const order = zeckendorfOrder(from);
    const kSmall = FIB[Math.min(order, FIB.length - 1)];
    const kLarge = FIB[Math.min(order + 1, FIB.length - 1)];
    const phase = datan2(ni, nr);
    const sector = Math.floor((phase + Math.PI) / (2 * Math.PI) * 5);
    const s = sector < 0 ? 0 : sector > 4 ? 4 : sector;
    const motion = s === 0 ? -kLarge : s === 1 ? -kSmall : s === 2 ? 0 : s === 3 ? kSmall : kLarge;
    const to = ((from + motion) % C + C) % C;
    this.head = to;
    this.step++;
    let peak = 0;
    for (let i = 0; i < C; i++) {
      const m = dmag(this.re[i], this.im[i]);
      if (m > peak) peak = m;
    }
    return { step: this.step, from, to, motion, order, wrote, read, occupancy: this.occupancy, peak };
  }
  /**
   * Project the tape back onto a rung of `n` nodes: cell a contributes to node
   * a mod n, averaged over the cells that land there. Deterministic and
   * allocation-free when `out` is supplied.
   */
  project(n, out) {
    const dst = out ?? createField(n);
    dst.re.fill(0);
    dst.im.fill(0);
    const counts = new Int32Array(n);
    for (let a = 0; a < this.capacity; a++) {
      const j = a % n;
      dst.re[j] += this.re[a];
      dst.im[j] += this.im[a];
      counts[j]++;
    }
    for (let j = 0; j < n; j++) {
      const c = counts[j];
      if (c > 1) {
        dst.re[j] /= c;
        dst.im[j] /= c;
      }
    }
    return dst;
  }
  /** Cells written at least once. */
  occupied() {
    return this.occupancy;
  }
  checkpoint() {
    return {
      step: this.step,
      head: this.head,
      re: Float64Array.from(this.re),
      im: Float64Array.from(this.im),
      touched: Uint8Array.from(this.touched)
    };
  }
  restore(cp) {
    if (cp.re.length !== this.capacity) {
      throw new RangeError(`TuringTape.restore: checkpoint width ${cp.re.length} != capacity ${this.capacity}`);
    }
    this.re.set(cp.re);
    this.im.set(cp.im);
    this.touched.set(cp.touched);
    this.step = cp.step;
    this.head = cp.head;
    let occ = 0;
    for (let i = 0; i < this.capacity; i++) if (this.touched[i] !== 0) occ++;
    this.occupancy = occ;
  }
};

// ../omega/packages/trnn-core/src/engine/MultiTorusEngine.ts
var MultiTorusEngine = class {
  rungs;
  engines;
  coupling;
  ledger;
  ordering = new OrderingMonitor();
  strides;
  staged;
  receipts;
  scratch = new OctaveScratch();
  chain;
  last;
  webTick = 0;
  sensory = null;
  /** N4 — permanent tape, or null when the web was built without one. */
  tape;
  lastTapeStep = null;
  /** The window this web was built from, when one was supplied (S5). */
  window;
  constructor(opts = {}) {
    const win = opts.window ?? null;
    if (win) {
      if (opts.nodes !== void 0) {
        throw new Error("MultiTorusEngine: `nodes` conflicts with `window` \u2014 the window owns node counts");
      }
      if (opts.coherenceDelay !== void 0) {
        throw new Error("MultiTorusEngine: `coherenceDelay` conflicts with `window` \u2014 the window owns \u03C4");
      }
      if (opts.rungs && opts.rungs.length !== win.rungs.length) {
        throw new Error(
          `MultiTorusEngine: window has ${win.rungs.length} rungs but ${opts.rungs.length} were supplied`
        );
      }
    }
    this.window = win;
    this.rungs = opts.rungs ?? (win ? win.rungs.map((w) => w.rung) : DENSE_CORE);
    const nodesOf = typeof opts.nodes === "function" ? opts.nodes : () => typeof opts.nodes === "number" ? opts.nodes : 144;
    const seed = opts.seed ?? "metatron-omega-web";
    this.engines = this.rungs.map((r, rank2) => {
      const w = win ? win.rungs[rank2] : null;
      return new SingleTorusEngine({
        nodes: w ? w.nodes : nodesOf(r, rank2),
        rung: r.n,
        seed: `${seed}:${r.n}`,
        modes: opts.modes,
        coherenceDelay: w ? w.coherenceDelay : opts.coherenceDelay,
        tapeCapacity: opts.tapeCapacity,
        lambda: w ? w.lambda : void 0,
        modePhase: w ? w.magneticPhase : void 0,
        drive: opts.drive,
        organs: opts.organs,
        sensors: opts.sensors
      });
    });
    this.coupling = buildCoupling(this.rungs, {
      band: opts.couplingBand ?? 3,
      chords: opts.chords,
      chordGain: opts.chordGain
    });
    this.tape = opts.tape ? new TuringTape(opts.tape) : null;
    this.ledger = new FluxLedger(opts.ledgerCap ?? 4096);
    this.strides = fibonacciStrides(this.rungs.length, opts.clock ?? "uniform");
    this.staged = this.engines.map((e) => createField(e.nodes));
    this.receipts = this.engines.map((e) => createField(e.nodes));
    this.chain = new DigestChain(`${seed}:web`);
    this.last = this.engines.map(() => null);
  }
  /**
   * Attach (or detach) a sensory plane. When attached, the plane is resolved
   * once per web tick during the stage phase — before any rung updates — so
   * every rung reads the same sensory instant (Jacobi discipline, Law W1).
   */
  attachSensory(plane) {
    if (plane && plane.nodes.length !== this.rungs.length) {
      throw new Error("MultiTorusEngine: sensory plane rung count must match the ladder");
    }
    this.sensory = plane;
    if (!plane) for (const e of this.engines) e.setSensory(null);
  }
  sensoryPlane() {
    return this.sensory;
  }
  /** Rungs due to step on a given web tick (multi-rate clocks). */
  due(tick) {
    const out = [];
    for (let i = 0; i < this.strides.length; i++) if (tick % this.strides[i] === 0) out.push(i);
    return out;
  }
  step() {
    const size = this.rungs.length;
    const t = this.webTick;
    this.ordering.beginTick(t);
    this.ordering.enterPhase("stage");
    for (let i = 0; i < size; i++) {
      const snap = this.engines[i].snapshot();
      this.staged[i].re.set(snap.z.re);
      this.staged[i].im.set(snap.z.im);
      zeroField(this.receipts[i]);
    }
    if (this.sensory) {
      const { fields } = this.sensory.resolve();
      for (let i = 0; i < size; i++) this.engines[i].setSensory(fields[i] ?? null);
    }
    this.ordering.enterPhase("exchange");
    let moved = 0;
    let worstRatio = 1;
    for (let i = 0; i < size; i++) {
      const dst = this.receipts[i];
      for (let j = 0; j < size; j++) {
        if (j === i) continue;
        const wgt = couplingWeight(this.coupling, i, j);
        if (wgt === 0) continue;
        this.ordering.read(j);
        const src = this.staged[j];
        let carrier = src;
        if (src.n !== dst.n) {
          carrier = this.scratch.get(dst.n);
          const rep = octaveTransport(src, carrier);
          const ratio = rep.energyRatio;
          if (Number.isFinite(ratio) && Math.abs(ratio - 1) > Math.abs(worstRatio - 1)) worstRatio = ratio;
        }
        let mass = 0;
        for (let k = 0; k < dst.n; k++) {
          const re = wgt * carrier.re[k];
          const im = wgt * carrier.im[k];
          dst.re[k] += re;
          dst.im[k] += im;
          mass += re * re + im * im;
        }
        mass = Math.sqrt(mass);
        this.ledger.post(t, j, i, mass);
        moved += mass;
      }
    }
    this.ordering.enterPhase("update");
    const stepped = this.due(t);
    let cohSum = 0;
    let warmSum = 0;
    let warmCount = 0;
    let finite2 = true;
    for (const i of stepped) {
      this.engines[i].setWebReceipt(this.receipts[i]);
      const rep = this.engines[i].step();
      this.last[i] = rep;
      this.ordering.write(i);
      cohSum += rep.coherence;
      if (rep.coherenceWarm) {
        warmSum += rep.coherence;
        warmCount++;
      }
      if (!rep.finite) finite2 = false;
      if (rep.residualFlux > 0) this.ledger.postToSink(t, i, Math.sqrt(rep.residualFlux));
    }
    if (this.tape) this.lastTapeStep = this.tape.advance(this.engines[0].snapshot().z);
    this.ordering.enterPhase("measure");
    const coherence = stepped.length > 0 ? cohSum / stepped.length : 0;
    const coherenceWarm = warmCount > 0 ? warmSum / warmCount : NaN;
    let warmRungsTotal = 0;
    for (const r of this.last) if (r?.coherenceWarm) warmRungsTotal++;
    this.ordering.enterPhase("commit");
    const link = new Float64Array(size * 2);
    for (let i = 0; i < size; i++) {
      const r = this.last[i];
      link[i * 2] = r ? r.coherence : 0;
      link[i * 2 + 1] = r ? r.energy : 0;
    }
    const digest = this.chain.link(link, link, link);
    this.webTick++;
    return {
      tick: t,
      rungs: this.last.slice(),
      stepped,
      coherence,
      coherenceWarm,
      warmRungs: warmCount,
      warmRungsTotal,
      fluxMoved: moved,
      fluxImbalance: this.ledger.imbalance(),
      orderingViolations: this.ordering.count(),
      rowSumDefect: this.coupling.rowSumDefect,
      worstEnergyRatio: worstRatio,
      digest,
      finite: finite2
    };
  }
  run(ticks) {
    let last = this.step();
    for (let i = 1; i < ticks; i++) last = this.step();
    return last;
  }
  /** Clock stride per rank (multi-rate); a copy, the engine keeps its own. */
  clockStrides() {
    return Array.from(this.strides);
  }
  /** Latest tape step, or null when there is no tape / it has not run. */
  tapeStep() {
    return this.lastTapeStep;
  }
  currentTick() {
    return this.webTick;
  }
  digest() {
    return this.chain.head();
  }
  /**
   * Full web checkpoint: every rung's cell state plus the web's own tick
   * counter and digest chain head. Restoring only the rungs is NOT exact —
   * the web chain would keep counting — so both live in the same record.
   */
  checkpoint() {
    return {
      tick: this.webTick,
      rungs: this.engines.map((e) => e.checkpoint()),
      digest: this.chain.head(),
      chainLength: this.chain.length(),
      last: this.last.slice()
    };
  }
  restore(cp) {
    this.engines.forEach((e, i) => {
      const s = cp.rungs[i];
      if (s) e.restore(s);
    });
    this.webTick = cp.tick;
    this.chain.restore(cp.digest, cp.chainLength);
    for (let i = 0; i < this.last.length; i++) this.last[i] = cp.last[i];
    for (const f of this.receipts) zeroField(f);
    for (const e of this.engines) e.setWebReceipt(null);
    this.ordering.reset();
    this.ledger.reset();
  }
};

// ../omega/packages/trnn-core/src/runtime/profiles.ts
var NODE_LADDER = [
  13,
  21,
  34,
  55,
  89,
  144,
  233,
  377,
  610,
  987,
  1597,
  2584,
  4181,
  6765,
  10946
];
function nearestFib(x) {
  let best = NODE_LADDER[0];
  let bd = Infinity;
  for (const f of NODE_LADDER) {
    const d = Math.abs(dlog(f) - dlog(Math.max(1, x)));
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  return best;
}
var CAPACITY_PROFILES = [
  {
    id: "PICO",
    tier: 0,
    rungs: 3,
    baseNodes: 13,
    topNodes: 34,
    modes: 8,
    tape: 233,
    couplingBand: 2,
    clock: "uniform",
    note: "smoke tier \u2014 runs anywhere, including throttled mobile"
  },
  {
    id: "NANO",
    tier: 1,
    rungs: 5,
    baseNodes: 34,
    topNodes: 89,
    modes: 13,
    tape: 610,
    couplingBand: 2,
    clock: "uniform",
    note: "low-power laptop / tablet"
  },
  {
    id: "MICRO",
    tier: 2,
    rungs: 8,
    baseNodes: 55,
    topNodes: 233,
    modes: 13,
    tape: 987,
    couplingBand: 3,
    clock: "fibonacci",
    note: "typical browser default"
  },
  {
    id: "MESO",
    tier: 3,
    rungs: 13,
    baseNodes: 89,
    topNodes: 610,
    modes: 13,
    tape: 1597,
    couplingBand: 3,
    clock: "fibonacci",
    note: "desktop class"
  },
  {
    id: "MACRO",
    tier: 4,
    rungs: DENSE_CORE_COUNT,
    baseNodes: 144,
    topNodes: 1597,
    modes: 21,
    tape: 2584,
    couplingBand: 4,
    clock: "fibonacci",
    note: "full dense core, workstation"
  },
  {
    id: "GRAND",
    tier: 5,
    rungs: DENSE_CORE_COUNT,
    baseNodes: 377,
    topNodes: 6765,
    modes: 21,
    tape: 4181,
    couplingBand: 5,
    clock: "fibonacci",
    note: "full dense core at spectral width \u2014 needs real hardware"
  }
];
function profileById(id) {
  const p = CAPACITY_PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`unknown profile ${id}`);
  return p;
}
function nodesForRank(p, rank2) {
  if (p.rungs <= 1) return p.baseNodes;
  const t = Math.min(rank2, p.rungs - 1) / (p.rungs - 1);
  const x = dexp(dlog(p.baseNodes) * (1 - t) + dlog(p.topNodes) * t);
  return nearestFib(x);
}
function profileNodes(p) {
  const out = [];
  for (let r = 0; r < p.rungs; r++) out.push(nodesForRank(p, r));
  return out;
}
function rungBytes(p, n) {
  const fields = 11 * 16 * n;
  const lattice = 3 * 8 * n;
  const basis = p.modes * 16 * n;
  const meter = (p.coherenceDelay ?? COHERENCE_DELAY) * 16 * n + 16 * n;
  const coeffs = p.modes * 16 * 2 + p.modes * 8;
  const tape = p.tape * (p.modes * 8 + 4);
  return fields + lattice + basis + meter + coeffs + tape;
}
function profileCost(p) {
  const ns = profileNodes(p);
  let nodes = 0;
  let bytes = 0;
  for (const n of ns) {
    nodes += n;
    bytes += rungBytes(p, n);
  }
  const web = 2 * 16 * nodes + p.rungs * p.rungs * 8 + 16 * Math.max(...ns);
  const analysis = 2 * nodes * p.modes;
  const exchange = nodes * Math.min(p.rungs - 1, 2 * p.couplingBand);
  return { nodes, nodeTicks: analysis + exchange + 12 * nodes, bytes: bytes + web };
}
var PROFILES_BY_TIER = [...CAPACITY_PROFILES].sort((a, b) => a.tier - b.tier);

// ../omega/packages/trnn-core/src/runtime/hardware.ts
var g = globalThis;
function now() {
  return g.performance?.now ? g.performance.now() : Date.now();
}
function probeCores() {
  const hc = g.navigator?.hardwareConcurrency;
  if (typeof hc === "number" && hc > 0) return { cores: hc, source: "navigator" };
  return { cores: 1, source: "unavailable" };
}
function probeMemory() {
  const dm = g.navigator?.deviceMemory;
  if (typeof dm === "number" && dm > 0) return { bytes: dm * 1024 * 1024 * 1024, source: "deviceMemory" };
  const heap = g.performance?.memory?.jsHeapSizeLimit;
  if (typeof heap === "number" && heap > 0) return { bytes: heap, source: "jsHeap" };
  return { bytes: null, source: "unavailable" };
}
async function probeWebGPU() {
  const none = {
    available: false,
    vendor: null,
    architecture: null,
    maxBufferSize: null,
    maxComputeWorkgroupSizeX: null,
    maxStorageBufferBindingSize: null
  };
  const gpu = g.navigator?.gpu;
  if (!gpu?.requestAdapter) return none;
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return none;
    const l = adapter.limits ?? {};
    return {
      available: true,
      vendor: adapter.info?.vendor ?? null,
      architecture: adapter.info?.architecture ?? null,
      maxBufferSize: l["maxBufferSize"] ?? null,
      maxComputeWorkgroupSizeX: l["maxComputeWorkgroupSizeX"] ?? null,
      maxStorageBufferBindingSize: l["maxStorageBufferBindingSize"] ?? null
    };
  } catch {
    return none;
  }
}
function tickWorkUnits(nodes, modes, exchangePerNode = 0) {
  return nodes * (2 * modes + 12 + exchangePerNode);
}
function benchmarkThroughput(opts = {}) {
  const nodes = opts.nodes ?? 233;
  const ticks = opts.ticks ?? 64;
  const modes = opts.modes ?? 13;
  const repeats = Math.max(1, opts.repeats ?? 3);
  const warm = new SingleTorusEngine({ nodes: 89, seed: "bench:warm", modes });
  warm.run(16);
  const perTick = tickWorkUnits(nodes, modes);
  const rates = [];
  const tickMs = [];
  let totalTicks = 0;
  let totalMs = 0;
  for (let r = 0; r < repeats; r++) {
    const e = new SingleTorusEngine({ nodes, seed: `bench:${r}`, modes });
    const t0 = now();
    e.run(ticks);
    const dt = Math.max(now() - t0, 1e-3);
    rates.push(perTick * ticks / (dt / 1e3));
    tickMs.push(dt / ticks);
    totalTicks += ticks;
    totalMs += dt;
  }
  rates.sort((a, b) => a - b);
  tickMs.sort((a, b) => a - b);
  const mid = rates.length - 1 >> 1;
  const median = rates[mid];
  const jitter = rates.length > 1 ? (rates[rates.length - 1] - rates[0]) / median : 0;
  return {
    nodeTicksPerSecond: median,
    workUnitsPerSecond: median,
    workUnitsPerTick: perTick,
    benchNodes: nodes,
    benchModes: modes,
    msPerTick: tickMs[mid],
    ticks: totalTicks,
    elapsedMs: totalMs,
    jitter
  };
}
async function probeHardware(opts = {}) {
  const c = probeCores();
  const m = probeMemory();
  const webgpu = await probeWebGPU();
  const throughput = benchmarkThroughput(opts.bench);
  return {
    cores: c.cores,
    coresSource: c.source,
    memoryBudget: m.bytes,
    memorySource: m.source,
    webgpu,
    throughput,
    userAgent: g.navigator?.userAgent ?? null,
    probedAt: Date.now()
  };
}

// ../omega/packages/trnn-core/src/runtime/governor.ts
var DEFAULT_HEADROOM = 0.75;
function evaluateProfile(p, probe, targetHz, headroom) {
  const cost = profileCost(p);
  const requiredRate = cost.nodeTicks * targetHz;
  const computeBudget = probe.throughput.nodeTicksPerSecond * headroom;
  const computeLoad = computeBudget > 0 ? requiredRate / computeBudget : Infinity;
  const memBudget = probe.memoryBudget === null ? null : probe.memoryBudget * headroom;
  const memoryLoad = memBudget === null ? null : cost.bytes / memBudget;
  const computeBad = !(computeLoad <= 1);
  const memBad = memoryLoad !== null && !(memoryLoad <= 1);
  const reason = computeBad && memBad ? "compute+memory" : computeBad ? "compute" : memBad ? "memory" : "ok";
  return {
    id: p.id,
    tier: p.tier,
    requiredRate,
    computeLoad,
    bytes: cost.bytes,
    memoryLoad,
    fits: !computeBad && !memBad,
    reason
  };
}
function selectProfile(probe, opts = {}) {
  const targetHz = opts.targetHz ?? 64;
  const headroom = opts.headroom ?? DEFAULT_HEADROOM;
  const table = PROFILES_BY_TIER.map((p) => evaluateProfile(p, probe, targetHz, headroom));
  const ceiling = opts.maxProfile ? PROFILES_BY_TIER.find((p) => p.id === opts.maxProfile)?.tier ?? Infinity : Infinity;
  const floor = opts.minProfile ? PROFILES_BY_TIER.find((p) => p.id === opts.minProfile)?.tier ?? -1 : -1;
  let chosen = null;
  for (let i = 0; i < PROFILES_BY_TIER.length; i++) {
    const p = PROFILES_BY_TIER[i];
    if (p.tier > ceiling) break;
    if (!table[i].fits && p.tier > floor) break;
    chosen = p;
  }
  const degraded = chosen === null;
  const selected = chosen ?? PROFILES_BY_TIER[0];
  const cost = profileCost(selected);
  const maxHz = cost.nodeTicks > 0 ? probe.throughput.nodeTicksPerSecond * headroom / cost.nodeTicks : targetHz;
  return {
    selected,
    targetHz,
    headroom,
    maxHz,
    table,
    degraded,
    memoryConstrained: probe.memoryBudget !== null
  };
}
function verifyFootprint(p, measuredBytes) {
  const predicted = profileCost(p).bytes;
  return {
    predictedBytes: predicted,
    measuredBytes,
    ratio: predicted > 0 ? measuredBytes / predicted : 0
  };
}

// ../omega/packages/trnn-core/src/runtime/calibrate.ts
var nowFn = () => {
  const p = globalThis.performance;
  return p ? p.now() : Date.now();
};
function countBuildWork(p) {
  const perRung = [];
  for (let r = 0; r < p.rungs; r++) perRung.push(nodesForRank(p, r));
  const nodes = perRung.reduce((a, b) => a + b, 0);
  const analysis = 2 * nodes * p.modes;
  const exchange = nodes * Math.min(p.rungs - 1, 2 * p.couplingBand);
  const cell = 12 * nodes;
  return { nodes, perRung, analysis, exchange, cell, total: analysis + exchange + cell };
}
function measureFootprint(root, maxDepth = 12) {
  const seen = /* @__PURE__ */ new Set();
  const buffers = /* @__PURE__ */ new Set();
  let bytes = 0;
  const walk = (v, depth) => {
    if (depth > maxDepth || v === null || typeof v !== "object") return;
    if (seen.has(v)) return;
    seen.add(v);
    if (ArrayBuffer.isView(v)) {
      const buf = v.buffer;
      if (!buffers.has(buf)) {
        buffers.add(buf);
        bytes += buf.byteLength;
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x, depth + 1);
      return;
    }
    if (v instanceof Map) {
      for (const [k, x] of v) {
        walk(k, depth + 1);
        walk(x, depth + 1);
      }
      return;
    }
    if (v instanceof Set) {
      for (const x of v) walk(x, depth + 1);
      return;
    }
    for (const k of Object.keys(v)) {
      walk(v[k], depth + 1);
    }
  };
  walk(root, 0);
  return bytes;
}
function calibrate(profile, opts = {}) {
  const p = typeof profile === "string" ? profileById(profile) : profile;
  const ticks = Math.max(1, opts.ticks ?? 64);
  const warmup = Math.max(0, opts.warmup ?? 8);
  const work = countBuildWork(p);
  const cost = profileCost(p);
  const engine = new MultiTorusEngine({
    rungs: DENSE_CORE.slice(0, p.rungs),
    nodes: (_r, rank2) => nodesForRank(p, rank2),
    couplingBand: p.couplingBand,
    clock: p.clock,
    modes: p.modes,
    tapeCapacity: p.tape,
    seed: opts.seed ?? `calibrate:${p.id}`
  });
  for (let i = 0; i < warmup; i++) engine.step();
  const t0 = nowFn();
  let last = engine.step();
  for (let i = 1; i < ticks; i++) last = engine.step();
  const elapsedMs = Math.max(nowFn() - t0, 1e-3);
  const measuredBytes = measureFootprint(engine);
  const msPerTick = elapsedMs / ticks;
  return {
    profile: p.id,
    ticks,
    predictedWork: cost.nodeTicks,
    countedWork: work.total,
    workRatio: cost.nodeTicks > 0 ? work.total / cost.nodeTicks : 0,
    predictedBytes: cost.bytes,
    measuredBytes,
    byteRatio: cost.bytes > 0 ? measuredBytes / cost.bytes : 0,
    elapsedMs,
    msPerTick,
    achievedRate: work.total / (msPerTick / 1e3),
    maxHz: 1e3 / msPerTick,
    finite: last.finite,
    fluxImbalance: last.fluxImbalance,
    orderingViolations: last.orderingViolations
  };
}

// ../omega/packages/trnn-core/src/runtime/runLedger.ts
var RunLedger = class {
  header;
  marks = [];
  cap;
  dropped = 0;
  /** Cadence: only every `stride`-th tick is marked (Fibonacci by default). */
  stride;
  constructor(header, cap = 4181, stride = 13) {
    this.header = header;
    this.cap = Math.max(1, cap);
    this.stride = Math.max(1, stride);
  }
  /** Returns true when the tick was recorded (cadence hit). */
  mark(m) {
    if (m.tick % this.stride !== 0) return false;
    this.marks.push(m);
    if (this.marks.length > this.cap) {
      this.marks.shift();
      this.dropped++;
    }
    return true;
  }
  snapshot() {
    return this.marks.slice();
  }
  tail(n = 13) {
    return this.marks.slice(Math.max(0, this.marks.length - n));
  }
  head() {
    return this.marks.length ? this.marks[this.marks.length - 1] : null;
  }
  size() {
    return this.marks.length;
  }
  droppedCount() {
    return this.dropped;
  }
  /** Locate the first tick at which two ledgers disagree. */
  static compare(a, b) {
    const xs = a.snapshot();
    const ys = b.snapshot();
    const n = Math.min(xs.length, ys.length);
    for (let i = 0; i < n; i++) {
      if (xs[i].tick !== ys[i].tick || xs[i].digest !== ys[i].digest) {
        return { diverged: true, tick: xs[i].tick, comparedMarks: n };
      }
    }
    return { diverged: false, tick: null, comparedMarks: n };
  }
};

// ../omega/packages/trnn-core/src/sense/encode.ts
var SENSE_BOUND2 = PHI;
function boundField(f, bound = SENSE_BOUND2) {
  const rawPeak = maxNorm(f);
  if (!(rawPeak > bound)) return { rawPeak, peak: rawPeak, scale: 1 };
  const scale = bound / rawPeak;
  scaleField(f, scale);
  return { rawPeak, peak: bound, scale };
}
function finishReport(modality, f, b) {
  let energy2 = 0;
  let support = 0;
  for (let i = 0; i < f.n; i++) {
    const e = f.re[i] * f.re[i] + f.im[i] * f.im[i];
    energy2 += e;
    if (e > 0) support++;
  }
  return { modality, nodes: f.n, rawPeak: b.rawPeak, peak: b.peak, scale: b.scale, energy: energy2, support };
}
var TOKEN_CACHE = /* @__PURE__ */ new Map();
function tokenDraw(codePoint, slot) {
  const key = codePoint * 16 + slot;
  const hit = TOKEN_CACHE.get(key);
  if (hit) return hit;
  const rng = new SeedStream(`t:${codePoint}:${slot}`);
  const pair2 = [rng.next(), rng.next()];
  if (TOKEN_CACHE.size < 65536) TOKEN_CACHE.set(key, pair2);
  return pair2;
}
function goldenPhase(i) {
  return 2 * Math.PI * (i * PHI_INV % 1);
}
function encodeScalars(values, out) {
  const n = out.n;
  const L = values.length;
  if (L === 0) {
    out.re.fill(0);
    out.im.fill(0);
    return finishReport("scalar", out, { rawPeak: 0, peak: 0, scale: 1 });
  }
  const step = L / n;
  for (let k = 0; k < n; k++) {
    let a;
    if (step <= 1) {
      const x = k * step;
      const i0 = Math.floor(x);
      const t = x - i0;
      const v0 = values[i0 % L] ?? 0;
      const v1 = values[(i0 + 1) % L] ?? 0;
      a = v0 * (1 - t) + v1 * t;
    } else {
      const lo = k * step;
      const hi = lo + step;
      let acc = 0;
      let w = 0;
      for (let i = Math.floor(lo); i < Math.ceil(hi); i++) {
        const wgt = Math.min(hi, i + 1) - Math.max(lo, i);
        if (wgt <= 0) continue;
        acc += wgt * (values[(i % L + L) % L] ?? 0);
        w += wgt;
      }
      a = w > 0 ? acc / w : 0;
    }
    if (!Number.isFinite(a)) a = 0;
    const th = goldenPhase(k);
    out.re[k] = a * dcos(th);
    out.im[k] = a * dsin(th);
  }
  return finishReport("scalar", out, boundField(out));
}
function encodeText(text, out) {
  const n = out.n;
  out.re.fill(0);
  out.im.fill(0);
  const cps = Array.from(text);
  if (cps.length === 0) return finishReport("text", out, { rawPeak: 0, peak: 0, scale: 1 });
  const combWeights = [1, PHI_INV, PHI_INV * PHI_INV];
  let prev1 = 0;
  let prev2 = 0;
  for (let p = 0; p < cps.length; p++) {
    const cp = cps[p].codePointAt(0) ?? 0;
    const token = (cp * 131071 + prev1 * 8191 + prev2 * 127 >>> 0) % 2147483647;
    prev2 = prev1;
    prev1 = cp;
    for (let c = 0; c < 3; c++) {
      const [u0, u1] = tokenDraw(token, c);
      const idx = Math.min(n - 1, Math.floor(u0 * n));
      const th = 2 * Math.PI * u1 + goldenPhase(p);
      out.re[idx] += combWeights[c] * dcos(th);
      out.im[idx] += combWeights[c] * dsin(th);
    }
  }
  const k = 1 / Math.sqrt(cps.length);
  scaleField(out, k);
  return finishReport("text", out, boundField(out));
}
function encodeGrid(data, width, height, out) {
  const n = out.n;
  out.re.fill(0);
  out.im.fill(0);
  if (width <= 0 || height <= 0 || data.length === 0) {
    return finishReport("grid", out, { rawPeak: 0, peak: 0, scale: 1 });
  }
  const counts = new Float64Array(n);
  const phi2 = PHI_INV * PHI_INV;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = data[y * width + x] ?? 0;
      if (!Number.isFinite(v)) continue;
      const u = (x * PHI_INV + y * phi2) % 1;
      const idx = Math.min(n - 1, Math.floor(u * n));
      const th = 2 * Math.PI * ((x / width * PHI_INV + y / height * phi2) % 1);
      out.re[idx] += v * dcos(th);
      out.im[idx] += v * dsin(th);
      counts[idx] += 1;
    }
  }
  for (let i = 0; i < n; i++) {
    if (counts[i] > 0) {
      out.re[i] /= counts[i];
      out.im[i] /= counts[i];
    }
  }
  return finishReport("grid", out, boundField(out));
}
function encodeAudio(pcm, out) {
  const n = out.n;
  const L = pcm.length;
  out.re.fill(0);
  out.im.fill(0);
  if (L === 0) return finishReport("audio", out, { rawPeak: 0, peak: 0, scale: 1 });
  const step = L / n;
  let crossings = 0;
  let prev = pcm[0] ?? 0;
  for (let k = 0; k < n; k++) {
    const lo = k * step;
    const hi = lo + step;
    let acc = 0;
    let w = 0;
    for (let i = Math.floor(lo); i < Math.max(Math.floor(lo) + 1, Math.ceil(hi)); i++) {
      const wgt = Math.max(0, Math.min(hi, i + 1) - Math.max(lo, i)) || (step < 1 ? 1 : 0);
      const s = pcm[(i % L + L) % L] ?? 0;
      if (prev < 0 !== s < 0) crossings++;
      prev = s;
      acc += wgt * Math.abs(s);
      w += wgt;
    }
    const a = w > 0 ? acc / w : 0;
    const th = goldenPhase(crossings) + goldenPhase(k);
    out.re[k] = a * dcos(th);
    out.im[k] = a * dsin(th);
  }
  return finishReport("audio", out, boundField(out));
}
function senseField(nodes) {
  return createField(nodes);
}

// ../omega/packages/trnn-core/src/sense/fusion.ts
function alignmentOf(a, b) {
  const n = Math.min(a.n, b.n);
  let dot2 = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot2 += a.re[i] * b.re[i] + a.im[i] * b.im[i];
    na += a.re[i] * a.re[i] + a.im[i] * a.im[i];
    nb += b.re[i] * b.re[i] + b.im[i] * b.im[i];
  }
  if (na <= 0 || nb <= 0) return 0;
  return dot2 / Math.sqrt(na * nb);
}
function fuseChannels(inputs, out, bound = SENSE_BOUND2) {
  zeroField(out);
  const live = inputs.filter((c) => c.field.n > 0 && (c.gain ?? 1) > 0);
  const k = live.length;
  if (k === 0) {
    return {
      channels: [],
      count: 0,
      weight: 0,
      rawPeak: 0,
      peak: 0,
      scale: 1,
      energy: 0,
      withinBound: true
    };
  }
  const w = 1 / Math.sqrt(k);
  for (const c of live) {
    const g2 = Math.min(1, Math.max(0, c.gain ?? 1)) * w;
    const n = Math.min(out.n, c.field.n);
    for (let i = 0; i < n; i++) {
      out.re[i] += g2 * c.field.re[i];
      out.im[i] += g2 * c.field.im[i];
    }
  }
  const b = boundField(out, bound);
  let energy2 = 0;
  for (let i = 0; i < out.n; i++) energy2 += out.re[i] * out.re[i] + out.im[i] * out.im[i];
  const channels = live.map((c) => {
    let e = 0;
    for (let i = 0; i < c.field.n; i++) e += c.field.re[i] * c.field.re[i] + c.field.im[i] * c.field.im[i];
    return {
      id: c.id,
      gain: Math.min(1, Math.max(0, c.gain ?? 1)),
      peak: maxNorm(c.field),
      energy: e,
      alignment: alignmentOf(c.field, out)
    };
  });
  return {
    channels,
    count: k,
    weight: w,
    rawPeak: b.rawPeak,
    peak: b.peak,
    scale: b.scale,
    energy: energy2,
    withinBound: maxNorm(out) <= bound + 1e-12
  };
}

// ../omega/packages/trnn-core/src/sense/plane.ts
var MAX_LOOP_GAIN = phiPow(-2);
var SensoryPlane = class {
  /** Node count of each rung, in rank order. */
  nodes;
  /** Fusion lattice — the widest rung, so no channel is decimated before fusion. */
  fuseNodes;
  channels = /* @__PURE__ */ new Map();
  fused;
  staged;
  transportRatio;
  loopGain = MAX_LOOP_GAIN;
  revision = 0;
  lastReport;
  constructor(nodes, opts = {}) {
    this.nodes = nodes.slice();
    this.fuseNodes = nodes.length > 0 ? Math.max(...nodes) : 0;
    this.fused = createField(Math.max(1, this.fuseNodes));
    this.staged = this.nodes.map((n) => createField(n));
    this.transportRatio = new Float64Array(this.nodes.length).fill(1);
    if (opts.loopGain !== void 0) this.setLoopGain(opts.loopGain);
    this.lastReport = this.emptyReport();
  }
  emptyReport() {
    return {
      revision: this.revision,
      channels: 0,
      loopGain: this.loopGain,
      fusion: {
        channels: [],
        count: 0,
        weight: 0,
        rawPeak: 0,
        peak: 0,
        scale: 1,
        energy: 0,
        withinBound: true
      },
      rungs: this.nodes.map((n, rank2) => ({
        rank: rank2,
        nodes: n,
        peak: 0,
        energy: 0,
        transportRatio: 1,
        falloff: this.falloff(rank2)
      })),
      maxPeak: 0,
      withinBound: true
    };
  }
  /** φ^(−rank/2) — the ladder-matched sensory falloff. */
  falloff(rank2) {
    return dpow(PHI, -rank2 / 2);
  }
  /** Set the actuator loop gain. Values above φ⁻² are rejected (Law L-S2). */
  setLoopGain(g2) {
    if (!Number.isFinite(g2) || g2 < 0) throw new Error("SensoryPlane: loop gain must be finite and \u2265 0");
    if (g2 > MAX_LOOP_GAIN + 1e-15) {
      throw new Error(`SensoryPlane: loop gain ${g2} exceeds the certified bound \u03C6\u207B\xB2 = ${MAX_LOOP_GAIN}`);
    }
    this.loopGain = g2;
    this.revision++;
    return this.loopGain;
  }
  currentLoopGain() {
    return this.loopGain;
  }
  /** Register (or re-register) a channel. Existing data for the id is dropped. */
  declare(spec) {
    if (spec.nodes <= 0) throw new Error("SensoryPlane: channel nodes must be > 0");
    this.channels.set(spec.id, {
      spec,
      field: createField(spec.nodes),
      live: false,
      updatedAt: -1
    });
    this.revision++;
  }
  has(id) {
    return this.channels.has(id);
  }
  channelIds() {
    return [...this.channels.keys()].sort();
  }
  /**
   * Push encoded data into a channel. The field is copied (never retained) and
   * re-bounded defensively, so a caller that hand-builds a field cannot break
   * L-S1 by skipping the encoder.
   */
  push(id, field, tick) {
    const ch = this.channels.get(id);
    if (!ch) throw new Error(`SensoryPlane: unknown channel "${id}"`);
    zeroField(ch.field);
    const n = Math.min(ch.field.n, field.n);
    for (let i = 0; i < n; i++) {
      ch.field.re[i] = field.re[i];
      ch.field.im[i] = field.im[i];
    }
    boundField(ch.field, SENSE_BOUND2);
    ch.live = true;
    ch.updatedAt = tick;
    this.revision++;
  }
  /** Silence a channel without unregistering it. */
  mute(id) {
    const ch = this.channels.get(id);
    if (!ch) return;
    zeroField(ch.field);
    ch.live = false;
    this.revision++;
  }
  clear() {
    for (const ch of this.channels.values()) {
      zeroField(ch.field);
      ch.live = false;
    }
    zeroField(this.fused);
    for (const s of this.staged) zeroField(s);
    this.revision++;
    this.lastReport = this.emptyReport();
  }
  /**
   * Fuse + transport. Returns the per-rung injections in rank order; the
   * returned fields are plane-owned buffers, valid until the next resolve.
   */
  resolve() {
    const inputs = [];
    for (const ch of this.channels.values()) {
      if (!ch.live) continue;
      inputs.push({ id: ch.spec.id, field: ch.field, gain: ch.spec.gain ?? 1 });
    }
    const fusion = fuseChannels(inputs, this.fused, SENSE_BOUND2);
    const rungs = [];
    let maxPeak = 0;
    for (let rank2 = 0; rank2 < this.staged.length; rank2++) {
      const dst = this.staged[rank2];
      if (fusion.count === 0) {
        zeroField(dst);
        this.transportRatio[rank2] = 1;
        rungs.push({ rank: rank2, nodes: dst.n, peak: 0, energy: 0, transportRatio: 1, falloff: this.falloff(rank2) });
        continue;
      }
      const rep = octaveTransport(this.fused, dst);
      this.transportRatio[rank2] = rep.energyRatio;
      const k = this.loopGain * this.falloff(rank2);
      let energy2 = 0;
      let peak = 0;
      for (let i = 0; i < dst.n; i++) {
        dst.re[i] *= k;
        dst.im[i] *= k;
        const e = dst.re[i] * dst.re[i] + dst.im[i] * dst.im[i];
        energy2 += e;
        const a = Math.sqrt(e);
        if (a > peak) peak = a;
      }
      boundField(dst, SENSE_BOUND2);
      if (peak > maxPeak) maxPeak = peak;
      rungs.push({
        rank: rank2,
        nodes: dst.n,
        peak,
        energy: energy2,
        transportRatio: rep.energyRatio,
        falloff: this.falloff(rank2)
      });
    }
    this.lastReport = {
      revision: this.revision,
      channels: fusion.count,
      loopGain: this.loopGain,
      fusion,
      rungs,
      maxPeak,
      withinBound: maxPeak <= SENSE_BOUND2 + 1e-12 && rungs.every((r) => r.peak <= SENSE_BOUND2 + 1e-12)
    };
    return { fields: this.staged, report: this.lastReport };
  }
  report() {
    return this.lastReport;
  }
  /** Peak of the fused (pre-transport) field — telemetry only. */
  fusedPeak() {
    return maxNorm(this.fused);
  }
};

// ../omega/packages/trnn-core/src/memory/braid.ts
var BRAID_MULTIPLICITY = 28;
var ACCEPT_SIMILARITY = 1 - phiPow(-4);
var PARTIAL_ACCEPT = phiPow(-1);
function ratedCapacity(nodes) {
  return Math.max(1, Math.floor(nodes * phiPow(-2)));
}
function braidBeta(load) {
  return PHI * PHI * Math.sqrt(Math.max(1, load) / BRAID_MULTIPLICITY);
}
function normOf(re, im, n) {
  let s = 0;
  for (let i = 0; i < n; i++) s += re[i] * re[i] + im[i] * im[i];
  return Math.sqrt(s);
}
var TorusBraid = class {
  nodes;
  capacity;
  accept;
  /** Row-major store: pattern p occupies [p*n, (p+1)*n). */
  re;
  im;
  meta = [];
  byKey = /* @__PURE__ */ new Map();
  scores;
  weights;
  work;
  probe;
  constructor(opts) {
    this.nodes = opts.nodes;
    this.capacity = Math.max(1, opts.capacity ?? ratedCapacity(opts.nodes));
    this.accept = opts.accept ?? ACCEPT_SIMILARITY;
    this.re = new Float64Array(this.capacity * this.nodes);
    this.im = new Float64Array(this.capacity * this.nodes);
    this.scores = new Float64Array(this.capacity);
    this.weights = new Float64Array(this.capacity);
    this.work = createField(this.nodes);
    this.probe = createField(this.nodes);
  }
  get load() {
    return this.meta.length;
  }
  beta() {
    return braidBeta(this.load);
  }
  patterns() {
    return this.meta;
  }
  /**
   * Store a pattern under `key`. Re-storing an existing key overwrites in place
   * (idempotent), so a repeated percept does not consume capacity.
   * Patterns are stored unit-normalised; the pre-normalisation energy is kept
   * in the metadata so salience survives.
   */
  store(key, field, tick, label) {
    const n = this.nodes;
    const src = field.n === n ? field : this.resample(field);
    const norm2 = normOf(src.re, src.im, n);
    const inv = norm2 > 0 ? 1 / norm2 : 0;
    let idx = this.byKey.get(key);
    if (idx === void 0) {
      if (this.meta.length < this.capacity) {
        idx = this.meta.length;
      } else {
        let oldest = 0;
        for (let p = 1; p < this.meta.length; p++) {
          if (this.meta[p].storedAt < this.meta[oldest].storedAt) oldest = p;
        }
        idx = oldest;
        this.byKey.delete(this.meta[oldest].key);
      }
    }
    const base = idx * n;
    for (let i = 0; i < n; i++) {
      this.re[base + i] = src.re[i] * inv;
      this.im[base + i] = src.im[i] * inv;
    }
    const entry = {
      key,
      index: idx,
      nodes: n,
      energy: norm2 * norm2,
      storedAt: tick,
      label
    };
    this.meta[idx] = entry;
    this.byKey.set(key, idx);
    return entry;
  }
  resample(field) {
    octaveTransport(field, this.work);
    return this.work;
  }
  /** Normalised real overlap of the probe with every stored pattern. */
  score(pre, pim) {
    const n = this.nodes;
    const pn = normOf(pre, pim, n);
    let best = -Infinity;
    let second = -Infinity;
    let arg = -1;
    for (let p = 0; p < this.meta.length; p++) {
      const base = p * n;
      let dot2 = 0;
      for (let i = 0; i < n; i++) {
        dot2 += this.re[base + i] * pre[i] + this.im[base + i] * pim[i];
      }
      const s = pn > 0 ? dot2 / pn : 0;
      this.scores[p] = s;
      if (s > best) {
        second = best;
        best = s;
        arg = p;
      } else if (s > second) {
        second = s;
      }
    }
    if (!Number.isFinite(second)) second = 0;
    return { best: Number.isFinite(best) ? best : 0, second, arg };
  }
  /** One Hopfield sweep at β; writes the readout into `out`. */
  sweep(out, beta) {
    const n = this.nodes;
    const G = this.meta.length;
    let max = -Infinity;
    for (let p = 0; p < G; p++) if (this.scores[p] > max) max = this.scores[p];
    let z = 0;
    for (let p = 0; p < G; p++) {
      const w = dexp(beta * (this.scores[p] - max));
      this.weights[p] = w;
      z += w;
    }
    const inv = z > 0 ? 1 / z : 0;
    zeroField(out);
    for (let p = 0; p < G; p++) {
      const w = this.weights[p] * inv;
      if (w === 0) continue;
      const base = p * n;
      for (let i = 0; i < n; i++) {
        out.re[i] += w * this.re[base + i];
        out.im[i] += w * this.im[base + i];
      }
    }
  }
  /** Cosine of a probe against a stored pattern index. */
  similarityTo(index, field) {
    if (index < 0 || index >= this.meta.length) return 0;
    const n = this.nodes;
    const base = index * n;
    let dot2 = 0;
    let pn = 0;
    for (let i = 0; i < n; i++) {
      const pr = field.re[i] ?? 0;
      const pi = field.im[i] ?? 0;
      dot2 += this.re[base + i] * pr + this.im[base + i] * pi;
      pn += pr * pr + pi * pi;
    }
    return pn > 0 ? dot2 / Math.sqrt(pn) : 0;
  }
  /** R1 — exact key hit. */
  lookup(key) {
    const idx = this.byKey.get(key);
    return idx === void 0 ? null : this.meta[idx];
  }
  /** Copy a stored pattern out (unit-normalised). */
  read(index, out) {
    if (index < 0 || index >= this.meta.length) return false;
    const n = Math.min(this.nodes, out.n);
    const base = index * this.nodes;
    for (let i = 0; i < n; i++) {
      out.re[i] = this.re[base + i];
      out.im[i] = this.im[base + i];
    }
    return true;
  }
  /**
   * The R1–R6 retrieval cascade. `key` short-circuits at R1 when supplied.
   */
  recall(field, key) {
    const beta = this.beta();
    if (this.meta.length === 0) {
      return { stage: "miss", key: null, index: -1, similarity: 0, margin: 0, sweeps: 0, beta, accepted: false };
    }
    if (key !== void 0) {
      const idx = this.byKey.get(key);
      if (idx !== void 0) {
        return {
          stage: "R1",
          key,
          index: idx,
          similarity: 1,
          margin: 1,
          sweeps: 0,
          beta,
          accepted: true
        };
      }
    }
    const n = this.nodes;
    if (field.n === n) {
      this.probe.re.set(field.re.subarray(0, n));
      this.probe.im.set(field.im.subarray(0, n));
    } else {
      octaveTransport(field, this.probe);
    }
    const candidates = /* @__PURE__ */ new Set();
    const propose = (arg) => {
      if (arg >= 0) candidates.add(arg);
    };
    const r2 = this.score(this.probe.re, this.probe.im);
    if (r2.best >= this.accept) return this.hit("R2", r2, 0, beta);
    propose(r2.arg);
    this.sweep(this.work, beta);
    let r3 = this.score(this.work.re, this.work.im);
    if (this.confirms(r3.arg)) return this.hit("R3", r3, 1, beta);
    propose(r3.arg);
    let sweeps = 1;
    let prev = r3.best;
    for (let it = 0; it < 12; it++) {
      this.sweep(this.work, beta);
      sweeps++;
      const rr = this.score(this.work.re, this.work.im);
      if (this.confirms(rr.arg)) return this.hit("R4", rr, sweeps, beta);
      propose(rr.arg);
      if (Math.abs(rr.best - prev) < 1e-12) break;
      prev = rr.best;
      r3 = rr;
    }
    octaveTransport(this.probe, this.work);
    const r5 = this.score(this.work.re, this.work.im);
    if (this.confirms(r5.arg)) return this.hit("R5", r5, sweeps, beta);
    propose(r5.arg);
    for (let i = 0; i < n; i++) {
      const a = Math.sqrt(this.probe.re[i] * this.probe.re[i] + this.probe.im[i] * this.probe.im[i]);
      if (a > 0) {
        this.work.re[i] = this.probe.re[i] / a;
        this.work.im[i] = this.probe.im[i] / a;
      } else {
        this.work.re[i] = 0;
        this.work.im[i] = 0;
      }
    }
    const r6 = this.score(this.work.re, this.work.im);
    if (this.confirms(r6.arg)) return this.hit("R6", r6, sweeps, beta);
    propose(r6.arg);
    let bestIdx = -1;
    let bestSim = -Infinity;
    let secondSim = -Infinity;
    for (const c of candidates) {
      const sim = this.similarityTo(c, this.probe);
      if (sim > bestSim) {
        secondSim = bestSim;
        bestSim = sim;
        bestIdx = c;
      } else if (sim > secondSim) {
        secondSim = sim;
      }
    }
    if (!Number.isFinite(secondSim)) secondSim = 0;
    const accepted = bestIdx >= 0 && bestSim >= PARTIAL_ACCEPT;
    return {
      stage: accepted ? "R6" : "miss",
      key: bestIdx >= 0 ? this.meta[bestIdx].key : null,
      index: bestIdx,
      similarity: Number.isFinite(bestSim) ? bestSim : 0,
      margin: bestSim - secondSim,
      sweeps,
      beta,
      accepted
    };
  }
  /**
   * A sweep readout is a *proposal*, not a verdict: the readout is a blend of
   * every stored pattern, so a high score against the blend says nothing about
   * the cue. A stage may only terminate the cascade when its candidate clears
   * the acceptance cosine against the original probe.
   */
  confirms(arg) {
    return arg >= 0 && this.similarityTo(arg, this.probe) >= this.accept;
  }
  hit(stage, r, sweeps, beta) {
    return {
      stage,
      key: r.arg >= 0 ? this.meta[r.arg].key : null,
      index: r.arg,
      similarity: r.best,
      margin: r.best - r.second,
      sweeps,
      beta,
      accepted: true
    };
  }
  clear() {
    this.re.fill(0);
    this.im.fill(0);
    this.meta = [];
    this.byKey.clear();
  }
};

// ../omega/packages/trnn-core/src/cognition/concepts.ts
var LLOYD_ITERATIONS = 8;
function cosFromD2(d2) {
  return 1 - d2 / 2;
}
var ConceptStore = class {
  dim;
  capacity;
  M;
  efConstruction;
  efSearch;
  vecs;
  rand;
  meta = [];
  byKey = /* @__PURE__ */ new Map();
  /** links[level][node] — neighbour ids, capped at M (2M on level 0). */
  links = [];
  entry = -1;
  topLevel = -1;
  mL;
  // ---- product quantisation ----
  sub;
  centroids;
  subDim;
  trainAt;
  codebook = null;
  // sub × centroids × subDim
  codes = null;
  // capacity × sub
  table;
  // sub × centroids scratch for the query
  pqErrorLast = 0;
  searches = 0;
  evictions = 0;
  // search scratch, reused: no allocation on the query path
  visited;
  visitMark = 0;
  qbuf;
  constructor(opts) {
    this.dim = Math.max(1, Math.floor(opts.dim));
    this.capacity = Math.max(1, Math.floor(opts.capacity));
    this.M = Math.max(2, Math.floor(opts.M ?? 16));
    this.efConstruction = Math.max(this.M, Math.floor(opts.efConstruction ?? 64));
    this.efSearch = Math.max(1, Math.floor(opts.efSearch ?? 32));
    this.mL = 1 / dlog(this.M);
    this.rand = new SeedStream(opts.seed ?? "omega-concepts");
    this.vecs = new Float64Array(this.capacity * this.dim);
    this.visited = new Int32Array(this.capacity);
    this.qbuf = new Float64Array(this.dim);
    const wanted = Math.max(1, Math.floor(opts.sub ?? 8));
    this.sub = this.dim % wanted === 0 ? wanted : 1;
    this.subDim = this.dim / this.sub;
    this.centroids = Math.min(256, Math.max(2, Math.floor(opts.centroids ?? 16)));
    this.trainAt = Math.max(this.centroids, Math.floor(opts.trainAt ?? this.centroids * 4));
    this.table = new Float64Array(this.sub * this.centroids);
  }
  get size() {
    return this.meta.length;
  }
  get pqReady() {
    return this.codebook !== null;
  }
  records() {
    return this.meta.map((m, id) => ({
      id,
      key: m.key,
      label: m.label,
      tick: m.tick,
      hits: m.hits,
      rawNorm: m.rawNorm,
      level: m.level
    }));
  }
  stats() {
    return {
      size: this.meta.length,
      capacity: this.capacity,
      dim: this.dim,
      levels: this.topLevel + 1,
      M: this.M,
      efSearch: this.efSearch,
      pqReady: this.pqReady,
      sub: this.sub,
      centroids: this.centroids,
      pqError: this.pqErrorLast,
      codeBytes: this.meta.length * this.sub,
      vectorBytes: this.meta.length * this.dim * 8,
      searches: this.searches,
      evictions: this.evictions
    };
  }
  /**
   * Insert (or refresh) a concept. Returns its id. An existing key overwrites
   * its embedding in place and keeps its graph position: a concept that drifts
   * is the same concept, and re-linking it would churn the graph for nothing.
   */
  add(key, vec, tick, label) {
    const existing = this.byKey.get(key);
    if (existing !== void 0) {
      const raw = this.writeVector(existing, vec);
      this.meta[existing].tick = tick;
      this.meta[existing].rawNorm = raw;
      if (label !== void 0) this.meta[existing].label = label;
      if (this.codebook) this.encodeOne(existing);
      return existing;
    }
    let id;
    if (this.meta.length < this.capacity) {
      id = this.meta.length;
      this.meta.push({ key, label, tick, hits: 0, rawNorm: 0, level: 0 });
    } else {
      id = this.evictSlot();
      this.byKey.delete(this.meta[id].key);
      this.meta[id] = { key, label, tick, hits: 0, rawNorm: 0, level: this.meta[id].level };
      this.evictions++;
    }
    this.byKey.set(key, id);
    this.meta[id].rawNorm = this.writeVector(id, vec);
    const level = this.assignLevel();
    this.meta[id].level = level;
    this.ensureLevels(level);
    for (let l = 0; l <= level; l++) this.links[l][id] = this.links[l][id] ?? [];
    if (this.entry === -1) {
      this.entry = id;
      this.topLevel = level;
      if (this.codebook) this.encodeOne(id);
      return id;
    }
    let cur = this.entry;
    for (let l = this.topLevel; l > level; l--) cur = this.greedy(cur, id, l);
    for (let l = Math.min(level, this.topLevel); l >= 0; l--) {
      const cand = this.searchLayer(this.vectorAt(id), cur, l, this.efConstruction, id);
      const chosen = this.selectNeighbours(id, cand, l === 0 ? this.M * 2 : this.M);
      this.links[l][id] = chosen.slice();
      for (const nb of chosen) this.connect(nb, id, l);
      cur = chosen.length ? chosen[0] : cur;
    }
    if (level > this.topLevel) {
      this.topLevel = level;
      this.entry = id;
    }
    if (this.codebook) this.encodeOne(id);
    else if (this.meta.length >= this.trainAt) this.trainPQ();
    return id;
  }
  /** kNN by cosine. Exact ordering; PQ only prunes the candidate set. */
  search(vec, k = 5, ef = this.efSearch) {
    if (this.entry === -1 || this.meta.length === 0) {
      return { hits: [], exactOps: 0, pqOps: 0, hops: 0 };
    }
    const q = this.normaliseInto(vec, this.qbuf);
    this.searches++;
    if (q === 0) return { hits: [], exactOps: 0, pqOps: 0, hops: 0 };
    this.opsExact = 0;
    this.opsPq = 0;
    this.opsHops = 0;
    if (this.codebook) this.buildTable(this.qbuf);
    let cur = this.entry;
    for (let l = this.topLevel; l > 0; l--) cur = this.greedyVec(cur, this.qbuf, l);
    const cand = this.searchLayer(this.qbuf, cur, 0, Math.max(ef, k), -1);
    let errSum = 0;
    let errN = 0;
    const scored = cand.map((id) => {
      const exact = this.cosineAt(id, this.qbuf);
      if (this.codebook) {
        errSum += Math.abs(exact - cosFromD2(this.pqDistance(id)));
        errN++;
      }
      return { id, score: exact };
    });
    scored.sort((a, b) => b.score - a.score || a.id - b.id);
    this.pqErrorLast = errN ? errSum / errN : 0;
    const hits = scored.slice(0, k).map((h) => ({
      id: h.id,
      key: this.meta[h.id].key,
      score: h.score
    }));
    if (hits.length) this.meta[hits[0].id].hits++;
    return { hits, exactOps: this.opsExact, pqOps: this.opsPq, hops: this.opsHops };
  }
  // ---- internals -------------------------------------------------------
  opsExact = 0;
  opsPq = 0;
  opsHops = 0;
  writeVector(id, vec) {
    const off = id * this.dim;
    let sum = 0;
    for (let i = 0; i < this.dim; i++) {
      const v = i < vec.length ? vec[i] : 0;
      const x = Number.isFinite(v) ? v : 0;
      this.vecs[off + i] = x;
      sum += x * x;
    }
    const norm2 = Math.sqrt(sum);
    if (norm2 > 0) {
      const inv = 1 / norm2;
      for (let i = 0; i < this.dim; i++) this.vecs[off + i] *= inv;
    }
    return norm2;
  }
  normaliseInto(vec, out) {
    let sum = 0;
    for (let i = 0; i < this.dim; i++) {
      const v = i < vec.length ? vec[i] : 0;
      const x = Number.isFinite(v) ? v : 0;
      out[i] = x;
      sum += x * x;
    }
    const norm2 = Math.sqrt(sum);
    if (norm2 > 0) {
      const inv = 1 / norm2;
      for (let i = 0; i < this.dim; i++) out[i] *= inv;
    }
    return norm2;
  }
  vectorAt(id) {
    return this.vecs.subarray(id * this.dim, id * this.dim + this.dim);
  }
  cosineAt(id, q) {
    this.opsExact++;
    const off = id * this.dim;
    let s = 0;
    for (let i = 0; i < this.dim; i++) s += this.vecs[off + i] * q[i];
    return s;
  }
  assignLevel() {
    const u = Math.max(1e-12, this.rand.next());
    return Math.floor(-dlog(u) * this.mL);
  }
  ensureLevels(level) {
    while (this.links.length <= level) this.links.push([]);
  }
  evictSlot() {
    let worst = 0;
    let worstScore = Infinity;
    for (let i = 0; i < this.meta.length; i++) {
      if (i === this.entry) continue;
      const m = this.meta[i];
      const score2 = m.hits * 1e6 + m.tick;
      if (score2 < worstScore) {
        worstScore = score2;
        worst = i;
      }
    }
    return worst;
  }
  connect(node, other, level) {
    const cap = level === 0 ? this.M * 2 : this.M;
    const list = this.links[level][node] = this.links[level][node] ?? [];
    if (list.includes(other)) return;
    list.push(other);
    if (list.length <= cap) return;
    const v = this.vectorAt(node);
    list.sort((a, b) => this.cosineAt(b, v) - this.cosineAt(a, v) || a - b);
    list.length = cap;
  }
  greedy(from, target, level) {
    return this.greedyVec(from, this.vectorAt(target), level);
  }
  greedyVec(from, q, level) {
    let cur = from;
    let best = this.cosineAt(cur, q);
    for (; ; ) {
      const list = this.links[level]?.[cur];
      if (!list || list.length === 0) return cur;
      let moved = false;
      for (const nb of list) {
        this.opsHops++;
        const s = this.codebook ? cosFromD2(this.pqDistance(nb)) : this.cosineAt(nb, q);
        if (s > best) {
          best = s;
          cur = nb;
          moved = true;
        }
      }
      if (!moved) return cur;
    }
  }
  /**
   * Best-first expansion at one level. Candidate scoring uses PQ when trained
   * (cheap, approximate) and exact cosine otherwise; the returned set is a
   * shortlist, never a final answer — `search` re-ranks it exactly.
   */
  searchLayer(q, entry, level, ef, skip) {
    this.visitMark++;
    const mark = this.visitMark;
    const score2 = (id) => this.codebook && level === 0 ? cosFromD2(this.pqDistance(id)) : this.cosineAt(id, q);
    const candidates = [];
    const results = [];
    const s0 = score2(entry);
    this.visited[entry] = mark;
    candidates.push({ id: entry, s: s0 });
    if (entry !== skip) results.push({ id: entry, s: s0 });
    while (candidates.length) {
      candidates.sort((a, b) => b.s - a.s);
      const cur = candidates.shift();
      const worst = results.length ? results[results.length - 1].s : -Infinity;
      if (results.length >= ef && cur.s < worst) break;
      const list = this.links[level]?.[cur.id];
      if (!list) continue;
      for (const nb of list) {
        if (this.visited[nb] === mark) continue;
        this.visited[nb] = mark;
        this.opsHops++;
        const s = score2(nb);
        candidates.push({ id: nb, s });
        if (nb === skip) continue;
        results.push({ id: nb, s });
        results.sort((a, b) => b.s - a.s || a.id - b.id);
        if (results.length > ef) results.length = ef;
      }
    }
    return results.map((r) => r.id);
  }
  /**
   * Neighbour heuristic: keep a candidate only if it is closer to the new node
   * than to any already-kept neighbour. This is what preserves long-range
   * edges — plain top-M would collapse the graph into a cluster-local mesh.
   */
  selectNeighbours(id, cand, cap) {
    const v = this.vectorAt(id);
    const ranked = cand.filter((c) => c !== id).map((c) => ({ c, s: this.cosineAt(c, v) })).sort((a, b) => b.s - a.s || a.c - b.c);
    const kept = [];
    for (const { c, s } of ranked) {
      if (kept.length >= cap) break;
      let dominated = false;
      const cv = this.vectorAt(c);
      for (const k of kept) {
        if (this.cosineAt(k, cv) > s) {
          dominated = true;
          break;
        }
      }
      if (!dominated) kept.push(c);
    }
    if (!kept.length && ranked.length) kept.push(ranked[0].c);
    return kept;
  }
  // ---- product quantisation -------------------------------------------
  /** Deterministic Lloyd per subspace, k-means++ seeded from the SeedStream. */
  trainPQ() {
    const n = this.meta.length;
    if (n < this.centroids) return;
    const book = new Float64Array(this.sub * this.centroids * this.subDim);
    const assign = new Int32Array(n);
    for (let s = 0; s < this.sub; s++) {
      const base = s * this.centroids * this.subDim;
      const off = s * this.subDim;
      let first = Math.min(n - 1, Math.floor(this.rand.next() * n));
      for (let d = 0; d < this.subDim; d++) {
        book[base + d] = this.vecs[first * this.dim + off + d];
      }
      const dist = new Float64Array(n).fill(Infinity);
      for (let c = 1; c < this.centroids; c++) {
        let total = 0;
        for (let i = 0; i < n; i++) {
          const d2 = this.subD2(i, off, book, base + (c - 1) * this.subDim);
          if (d2 < dist[i]) dist[i] = d2;
          total += dist[i];
        }
        let pick = this.rand.next() * (total || 1);
        let chosen = 0;
        for (let i = 0; i < n; i++) {
          pick -= dist[i];
          if (pick <= 0) {
            chosen = i;
            break;
          }
        }
        for (let d = 0; d < this.subDim; d++) {
          book[base + c * this.subDim + d] = this.vecs[chosen * this.dim + off + d];
        }
      }
      const sums = new Float64Array(this.centroids * this.subDim);
      const counts = new Int32Array(this.centroids);
      for (let it = 0; it < LLOYD_ITERATIONS; it++) {
        sums.fill(0);
        counts.fill(0);
        for (let i = 0; i < n; i++) {
          let bestC = 0;
          let bestD = Infinity;
          for (let c = 0; c < this.centroids; c++) {
            const d2 = this.subD2(i, off, book, base + c * this.subDim);
            if (d2 < bestD) {
              bestD = d2;
              bestC = c;
            }
          }
          assign[i] = bestC;
          counts[bestC]++;
          for (let d = 0; d < this.subDim; d++) {
            sums[bestC * this.subDim + d] += this.vecs[i * this.dim + off + d];
          }
        }
        for (let c = 0; c < this.centroids; c++) {
          if (counts[c] === 0) continue;
          const inv = 1 / counts[c];
          for (let d = 0; d < this.subDim; d++) {
            book[base + c * this.subDim + d] = sums[c * this.subDim + d] * inv;
          }
        }
      }
    }
    this.codebook = book;
    this.codes = new Uint8Array(this.capacity * this.sub);
    for (let i = 0; i < n; i++) this.encodeOne(i);
  }
  subD2(i, off, book, base) {
    let s = 0;
    const vo = i * this.dim + off;
    for (let d = 0; d < this.subDim; d++) {
      const x = this.vecs[vo + d] - book[base + d];
      s += x * x;
    }
    return s;
  }
  encodeOne(id) {
    const book = this.codebook;
    const codes = this.codes;
    for (let s = 0; s < this.sub; s++) {
      const base = s * this.centroids * this.subDim;
      const off = s * this.subDim;
      let bestC = 0;
      let bestD = Infinity;
      for (let c = 0; c < this.centroids; c++) {
        const d2 = this.subD2(id, off, book, base + c * this.subDim);
        if (d2 < bestD) {
          bestD = d2;
          bestC = c;
        }
      }
      codes[id * this.sub + s] = bestC;
    }
  }
  /** Asymmetric table: per subspace, squared distance from the full-precision query. */
  buildTable(q) {
    const book = this.codebook;
    for (let s = 0; s < this.sub; s++) {
      const base = s * this.centroids * this.subDim;
      const off = s * this.subDim;
      for (let c = 0; c < this.centroids; c++) {
        let d2 = 0;
        for (let d = 0; d < this.subDim; d++) {
          const x = q[off + d] - book[base + c * this.subDim + d];
          d2 += x * x;
        }
        this.table[s * this.centroids + c] = d2;
      }
    }
  }
  pqDistance(id) {
    this.opsPq++;
    const codes = this.codes;
    let d2 = 0;
    for (let s = 0; s < this.sub; s++) {
      d2 += this.table[s * this.centroids + codes[id * this.sub + s]];
    }
    return d2;
  }
};

// ../omega/packages/trnn-core/src/cognition/selfModel.ts
var LAMBDA_MAX = phiPow(-1);
var DiagonalRLS = class {
  constructor(dim, mu = 0.995, delta = 1e3) {
    this.dim = dim;
    this.delta = delta;
    this.a = new Float64Array(dim).fill(1);
    this.b = new Float64Array(dim);
    this.p = new Float64Array(dim * 4);
    this.mu = mu;
    this.reset();
  }
  name = "rls";
  a;
  b;
  /** 2×2 inverse covariance per dimension, stored row-major [p00,p01,p10,p11]. */
  p;
  mu;
  reset() {
    this.a.fill(1);
    this.b.fill(0);
    for (let i = 0; i < this.dim; i++) {
      this.p[i * 4 + 0] = this.delta;
      this.p[i * 4 + 1] = 0;
      this.p[i * 4 + 2] = 0;
      this.p[i * 4 + 3] = this.delta;
    }
  }
  predict(x, out) {
    for (let i = 0; i < this.dim; i++) out[i] = this.a[i] * x[i] + this.b[i];
    return out;
  }
  update(x, y) {
    const mu = this.mu;
    for (let i = 0; i < this.dim; i++) {
      const u0 = x[i];
      const u1 = 1;
      const o = i * 4;
      const p00 = this.p[o], p01 = this.p[o + 1], p10 = this.p[o + 2], p11 = this.p[o + 3];
      const pu0 = p00 * u0 + p01 * u1;
      const pu1 = p10 * u0 + p11 * u1;
      const denom = mu + u0 * pu0 + u1 * pu1;
      if (!(denom > 1e-300) || !Number.isFinite(denom)) continue;
      const k0 = pu0 / denom;
      const k1 = pu1 / denom;
      const err = y[i] - (this.a[i] * u0 + this.b[i]);
      this.a[i] += k0 * err;
      this.b[i] += k1 * err;
      const up0 = u0 * p00 + u1 * p10;
      const up1 = u0 * p01 + u1 * p11;
      this.p[o] = (p00 - k0 * up0) / mu;
      this.p[o + 1] = (p01 - k0 * up1) / mu;
      this.p[o + 2] = (p10 - k1 * up0) / mu;
      this.p[o + 3] = (p11 - k1 * up1) / mu;
    }
  }
};
var DiagonalSSM = class {
  constructor(dim, lr = phiPow(-1)) {
    this.dim = dim;
    this.lr = lr;
    this.theta = new Float64Array(dim).fill(datanh(phiPow(-2) / LAMBDA_MAX));
    this.bIn = new Float64Array(dim).fill(1 - phiPow(-2));
    this.cOut = new Float64Array(dim).fill(phiPow(-4));
    this.dSkip = new Float64Array(dim).fill(1);
    this.h = new Float64Array(dim);
    this.hPrev = new Float64Array(dim);
    this.dh = new Float64Array(dim);
    this.lam = new Float64Array(dim);
    this.refreshLambda();
  }
  name = "ssm";
  theta;
  bIn;
  cOut;
  dSkip;
  h;
  /** ∂h/∂θ carried forward (truncated to one step of recurrence). */
  dh;
  lam;
  hPrev;
  reset() {
    this.h.fill(0);
    this.hPrev.fill(0);
    this.dh.fill(0);
  }
  lambdas() {
    return this.lam;
  }
  /** Largest |λ| in force — the measured spectral radius of the recurrence. */
  spectralRadius() {
    let m = 0;
    for (let i = 0; i < this.dim; i++) m = Math.max(m, Math.abs(this.lam[i]));
    return m;
  }
  refreshLambda() {
    for (let i = 0; i < this.dim; i++) this.lam[i] = LAMBDA_MAX * dtanh(this.theta[i]);
  }
  /**
   * Predict without mutating the carried state: the mind may query the model
   * more than once per tick, and a predictor whose state depends on how often
   * it was *read* is not a model of anything.
   */
  predict(x, out) {
    for (let i = 0; i < this.dim; i++) {
      const hNext = this.lam[i] * this.h[i] + this.bIn[i] * x[i];
      out[i] = this.cOut[i] * hNext + this.dSkip[i] * x[i];
    }
    return out;
  }
  /** Advance the state on x and take one gradient step against target y. */
  update(x, y) {
    for (let i = 0; i < this.dim; i++) {
      const hPrev = this.h[i];
      const lam = this.lam[i];
      const hNext = lam * hPrev + this.bIn[i] * x[i];
      const yhat = this.cOut[i] * hNext + this.dSkip[i] * x[i];
      const e = yhat - y[i];
      if (!Number.isFinite(e)) continue;
      const t = dtanh(this.theta[i]);
      const dLam = LAMBDA_MAX * (1 - t * t);
      const dhNext = dLam * hPrev + lam * this.dh[i];
      const dhNextAbs = dhNext * this.cOut[i];
      const energy2 = 1e-9 + x[i] * x[i] + hNext * hNext + dhNextAbs * dhNextAbs + 1;
      const g2 = this.lr * e / energy2;
      this.theta[i] -= g2 * this.cOut[i] * dhNext;
      this.bIn[i] -= g2 * this.cOut[i] * x[i];
      this.cOut[i] -= g2 * hNext;
      this.dSkip[i] -= g2 * x[i];
      this.bIn[i] = clamp(this.bIn[i], -PHI, PHI);
      this.cOut[i] = clamp(this.cOut[i], -PHI, PHI);
      this.dSkip[i] = clamp(this.dSkip[i], -PHI, PHI);
      this.theta[i] = clamp(this.theta[i], -8, 8);
      this.dh[i] = dhNext;
      this.hPrev[i] = hPrev;
      this.h[i] = Number.isFinite(hNext) ? clamp(hNext, -phiPow(6), phiPow(6)) : 0;
    }
    this.refreshLambda();
  }
};
function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}
var SelfModel = class {
  constructor(dim, window = 144, warmup = 34, coldStart = 21) {
    this.dim = dim;
    this.window = window;
    this.warmup = warmup;
    this.coldStart = coldStart;
    this.ssm = new DiagonalSSM(dim);
    this.rls = new DiagonalRLS(dim);
    this.bufSsm = new Float64Array(dim);
    this.bufRls = new Float64Array(dim);
    this.prev = new Float64Array(dim);
    this.ssmWin = new Float64Array(window);
    this.rlsWin = new Float64Array(window);
    this.perWin = new Float64Array(window);
  }
  ssm;
  rls;
  bufSsm;
  bufRls;
  prev;
  havePrev = false;
  ssmWin;
  rlsWin;
  perWin;
  w = 0;
  filled = 0;
  samples = 0;
  seen = 0;
  log = [];
  /** True while the measured margin says the self-model is the better read. */
  get enabled() {
    return this.filled >= this.warmup && this.margin() > 0;
  }
  /**
   * Feed one observation. Returns the prediction of the *next* observation
   * from the predictor currently in force.
   */
  observe(x, tick) {
    if (this.havePrev) {
      this.ssm.predict(this.prev, this.bufSsm);
      this.rls.predict(this.prev, this.bufRls);
      let eS = 0;
      let eR = 0;
      let eP = 0;
      for (let i = 0; i < this.dim; i++) {
        const dS = this.bufSsm[i] - x[i];
        const dR = this.bufRls[i] - x[i];
        const dP = this.prev[i] - x[i];
        eS += dS * dS;
        eR += dR * dR;
        eP += dP * dP;
      }
      this.seen++;
      if (Number.isFinite(eS) && Number.isFinite(eR) && this.seen > this.coldStart) {
        this.ssmWin[this.w] = eS;
        this.rlsWin[this.w] = eR;
        this.perWin[this.w] = eP;
        this.w = (this.w + 1) % this.window;
        this.filled = Math.min(this.window, this.filled + 1);
        this.samples++;
        const source = this.enabled ? "ssm" : "rls";
        this.log.push({
          tick,
          error: source === "ssm" ? eS : eR,
          ssmError: eS,
          rlsError: eR,
          persistenceError: eP,
          source
        });
        if (this.log.length > 34) this.log.shift();
      }
      this.ssm.update(this.prev, x);
      this.rls.update(this.prev, x);
    }
    this.prev.set(x);
    this.havePrev = true;
    const out = this.enabled ? this.bufSsm : this.bufRls;
    const pred = this.enabled ? this.ssm.predict(x, out) : this.rls.predict(x, out);
    for (let i = 0; i < this.dim; i++) if (!Number.isFinite(pred[i])) pred[i] = x[i];
    return pred;
  }
  mean(win) {
    if (this.filled === 0) return 0;
    let s = 0;
    for (let i = 0; i < this.filled; i++) s += win[i];
    return s / this.filled;
  }
  margin() {
    const r = this.mean(this.rlsWin);
    const s = this.mean(this.ssmWin);
    if (!(r > 0)) return 0;
    return (r - s) / r;
  }
  report() {
    const ssmMse = this.mean(this.ssmWin);
    const rlsMse = this.mean(this.rlsWin);
    const perMse = this.mean(this.perWin);
    const inForce = this.enabled ? ssmMse : rlsMse;
    return {
      dim: this.dim,
      samples: this.samples,
      ssmMse,
      rlsMse,
      persistenceMse: perMse,
      margin: this.margin(),
      skill: perMse > 0 ? 1 - inForce / perMse : 0,
      enabled: this.enabled,
      spectralRadius: this.ssm.spectralRadius(),
      lambdaMax: LAMBDA_MAX,
      window: this.filled,
      recent: this.log.slice(-13)
    };
  }
  reset() {
    this.ssm.reset();
    this.rls.reset();
    this.havePrev = false;
    this.filled = 0;
    this.w = 0;
    this.samples = 0;
    this.seen = 0;
    this.log.length = 0;
  }
};

// ../omega/packages/trnn-core/src/cognition/mind.ts
var NOVELTY_THRESHOLD = phiPow(-3);
var Mind = class {
  store;
  self;
  dim;
  noveltyThreshold;
  predicted;
  obs;
  havePrediction = false;
  log = [];
  noveltySum = 0;
  surpriseSum = 0;
  count = 0;
  constructor(opts) {
    this.dim = Math.max(1, Math.floor(opts.dim));
    this.noveltyThreshold = opts.noveltyThreshold ?? NOVELTY_THRESHOLD;
    this.store = new ConceptStore({
      dim: this.dim,
      capacity: opts.capacity ?? 610,
      M: opts.M ?? 16,
      efSearch: opts.efSearch ?? 32,
      seed: opts.seed ?? "omega-mind",
      sub: opts.sub ?? 8,
      centroids: opts.centroids ?? 16
    });
    this.self = new SelfModel(this.dim, opts.window ?? 144);
    this.predicted = new Float64Array(this.dim);
    this.obs = new Float64Array(this.dim);
  }
  /** One cognitive fold. `vec` is the engine's observation for this tick. */
  observe(vec, tick, key) {
    for (let i = 0; i < this.dim; i++) {
      const v = i < vec.length ? vec[i] : 0;
      this.obs[i] = Number.isFinite(v) ? v : 0;
    }
    const trace = this.store.search(this.obs, 3);
    const best = trace.hits[0];
    const novelty = best ? Math.max(0, 1 - best.score) : 1;
    let surprise = 0;
    if (this.havePrediction) {
      let num = 0;
      let den = 0;
      for (let i = 0; i < this.dim; i++) {
        const d = this.predicted[i] - this.obs[i];
        num += d * d;
        den += this.obs[i] * this.obs[i];
      }
      const e = Math.sqrt(num);
      const y = Math.sqrt(den);
      surprise = Number.isFinite(e) && Number.isFinite(y) && e > 0 ? e / (e + y) : 0;
    }
    const next = this.self.observe(this.obs, tick);
    this.predicted.set(next);
    this.havePrediction = true;
    let action;
    let conceptId;
    let conceptKey;
    if (!best) {
      conceptKey = key ?? `c${tick}`;
      conceptId = this.store.add(conceptKey, this.obs, tick);
      action = "seed";
    } else if (novelty >= this.noveltyThreshold) {
      conceptKey = key ?? `c${tick}`;
      conceptId = this.store.add(conceptKey, this.obs, tick);
      action = "store";
    } else {
      conceptKey = best.key;
      conceptId = best.id;
      this.store.add(best.key, this.obs, tick);
      action = "recognise";
    }
    const t = {
      tick,
      novelty,
      surprise,
      conceptKey,
      conceptId,
      action,
      source: this.self.enabled ? "ssm" : "rls",
      exactOps: trace.exactOps
    };
    this.log.push(t);
    if (this.log.length > 55) this.log.shift();
    this.noveltySum += novelty;
    this.surpriseSum += surprise;
    this.count++;
    return t;
  }
  /** Nearest concepts to an arbitrary probe — the read side of semantic memory. */
  recall(vec, k = 5) {
    return this.store.search(vec, k);
  }
  report() {
    const records = this.store.records();
    const top = records.slice().sort((a, b) => b.hits - a.hits || b.tick - a.tick).slice(0, 13);
    return {
      thoughts: this.count,
      meanNovelty: this.count ? this.noveltySum / this.count : 0,
      meanSurprise: this.count ? this.surpriseSum / this.count : 0,
      noveltyThreshold: this.noveltyThreshold,
      concepts: this.store.stats(),
      selfModel: this.self.report(),
      recent: this.log.slice(-13),
      top
    };
  }
};

// ../omega/packages/trnn-core/src/learn/params.ts
function algSigmoid(x) {
  if (!Number.isFinite(x)) return x > 0 ? 1 : -1;
  return x / Math.sqrt(1 + x * x);
}
function algSigmoidPrime(x) {
  if (!Number.isFinite(x)) return 0;
  const d = 1 + x * x;
  return 1 / (d * Math.sqrt(d));
}
var SimplexGain = class {
  kind = "SimplexGain";
  size;
  raw;
  total;
  out;
  constructor(size, total, raw) {
    if (!(size > 0)) throw new Error("SimplexGain: size must be positive");
    if (!(total >= 0) || !Number.isFinite(total)) throw new Error("SimplexGain: total must be finite \u2265 0");
    this.size = size;
    this.total = total;
    this.raw = new Float64Array(size);
    if (raw) for (let i = 0; i < Math.min(size, raw.length); i++) this.raw[i] = raw[i];
    this.out = new Float64Array(size);
  }
  values() {
    let sum = 0;
    for (let i = 0; i < this.size; i++) {
      const u = 1 + algSigmoid(this.raw[i]);
      this.out[i] = u;
      sum += u;
    }
    if (!(sum > 0) || !Number.isFinite(sum)) {
      const u = this.total / this.size;
      for (let i = 0; i < this.size; i++) this.out[i] = u;
      return this.out;
    }
    const k = this.total / sum;
    for (let i = 0; i < this.size; i++) this.out[i] *= k;
    return this.out;
  }
  certificate() {
    const v = this.values();
    let s = 0;
    let minv = Infinity;
    for (let i = 0; i < this.size; i++) {
      s += Math.abs(v[i]);
      if (v[i] < minv) minv = v[i];
    }
    return {
      kind: this.kind,
      statement: `\u03A3|w_i| = ${this.total} and w_i \u2265 0 for every raw \u2208 R^${this.size}`,
      bound: this.total,
      measured: s,
      holds: minv >= 0 && s <= this.total * (1 + 8 * Number.EPSILON) + 8 * Number.EPSILON
    };
  }
};
var InputGain = class {
  kind = "InputGain";
  size = 1;
  raw = new Float64Array(1);
  limit;
  out = new Float64Array(1);
  constructor(limit, raw = 0) {
    if (!(limit > 0) || !Number.isFinite(limit)) throw new Error("InputGain: limit must be finite > 0");
    this.limit = limit;
    this.raw[0] = raw;
  }
  value() {
    return this.limit * algSigmoid(this.raw[0]);
  }
  values() {
    this.out[0] = this.value();
    return this.out;
  }
  certificate() {
    const v = Math.abs(this.value());
    return {
      kind: this.kind,
      statement: `|g| < ${this.limit} for every raw \u2208 R`,
      bound: this.limit,
      measured: v,
      holds: v <= this.limit
    };
  }
};
var BoundedEigenvalue = class {
  kind = "BoundedEigenvalue";
  size = 1;
  raw = new Float64Array(1);
  rho;
  out = new Float64Array(1);
  constructor(rho, raw = 0) {
    if (!(rho > 0) || !(rho < 1)) throw new Error("BoundedEigenvalue: rho must lie in (0, 1)");
    this.rho = rho;
    this.raw[0] = raw;
  }
  lambda() {
    return this.rho * algSigmoid(this.raw[0]);
  }
  values() {
    this.out[0] = this.lambda();
    return this.out;
  }
  certificate() {
    const v = Math.abs(this.lambda());
    return {
      kind: this.kind,
      statement: `|\u03BB| < \u03C1 = ${this.rho} < 1 (Schur stable) for every raw \u2208 R`,
      bound: this.rho,
      measured: v,
      holds: v < 1 && v <= this.rho
    };
  }
};
function rawVector(params) {
  let n = 0;
  for (const p of params) n += p.raw.length;
  const v = new Float64Array(n);
  let o = 0;
  for (const p of params) {
    v.set(p.raw, o);
    o += p.raw.length;
  }
  return v;
}
function setRawVector(params, v) {
  let o = 0;
  for (const p of params) {
    for (let i = 0; i < p.raw.length; i++) p.raw[i] = v[o + i];
    o += p.raw.length;
  }
}

// ../omega/packages/trnn-core/src/learn/cell.ts
var LEARN_BUDGET = (1 - JURY_GAIN) * PHI_INV / 2;
var DRIVE_SLOTS = ["G", "P", "R", "Pi", "zhat"];
var LearnableCell = class {
  mix;
  lambda;
  gateValue;
  constructor(opts = {}) {
    this.mix = new SimplexGain(DRIVE_SLOTS.length, LEARN_BUDGET, opts.mixRaw);
    this.lambda = new BoundedEigenvalue(LEARN_BUDGET, opts.lambdaRaw ?? 0);
    this.gateValue = clamp01(opts.gate ?? 0);
  }
  get gate() {
    return this.gateValue;
  }
  setGate(g2) {
    this.gateValue = clamp01(g2);
  }
  get enabled() {
    return this.gateValue > 0;
  }
  params() {
    return [this.mix, this.lambda];
  }
  /** Worst-case homogeneous gain over *all* parameter values at this gate. */
  certifiedGain() {
    return JURY_GAIN + this.gateValue * (2 * LEARN_BUDGET + this.lambda.rho);
  }
  certificates() {
    return [
      this.mix.certificate(),
      this.lambda.certificate(),
      {
        kind: "JuryGain",
        statement: "homogeneous max-norm gain < 1 for every parameter value at this gate",
        bound: 1,
        measured: this.certifiedGain(),
        holds: this.certifiedGain() < 1
      }
    ];
  }
  /**
   * Certified cell step. `out` must differ from `z` (Jacobi staging).
   * With gate = 0 the result is bit-identical to `cellStep(z, out, terms)`.
   */
  step(z, out, terms) {
    const base = cellStep(z, out, terms);
    if (this.gateValue === 0) return base;
    const w = this.mix.values();
    const lam = this.lambda.lambda() * this.gateValue;
    const n = z.n;
    const slots = [terms.G, terms.P, terms.R, terms.Pi, terms.zhat];
    let learnedDrive = 0;
    for (let s = 0; s < slots.length; s++) {
      const d = slots[s];
      if (!d) continue;
      const k = this.gateValue * w[s];
      if (k === 0) continue;
      const m = Math.min(n, d.n);
      let dMax = 0;
      for (let i = 0; i < m; i++) {
        out.re[i] += k * d.re[i];
        out.im[i] += k * d.im[i];
        const a = Math.sqrt(d.re[i] * d.re[i] + d.im[i] * d.im[i]);
        if (a > dMax) dMax = a;
      }
      learnedDrive += Math.abs(k) * dMax;
    }
    if (lam !== 0) {
      let zMax = 0;
      for (let i = 0; i < n; i++) {
        out.re[i] += lam * z.re[i];
        out.im[i] += lam * z.im[i];
        const a = Math.sqrt(z.re[i] * z.re[i] + z.im[i] * z.im[i]);
        if (a > zMax) zMax = a;
      }
      learnedDrive += Math.abs(lam) * zMax;
    }
    const clamped = clampField(out, CLAMP_MAX);
    let inMax = 0;
    let peak = 0;
    let d2 = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.sqrt(z.re[i] * z.re[i] + z.im[i] * z.im[i]);
      if (a > inMax) inMax = a;
      const b = Math.sqrt(out.re[i] * out.re[i] + out.im[i] * out.im[i]);
      if (b > peak) peak = b;
      const dr = out.re[i] - z.re[i];
      const di = out.im[i] - z.im[i];
      d2 += dr * dr + di * di;
    }
    const driveNorm = base.driveNorm + learnedDrive;
    const issBound = JURY_GAIN * inMax + driveNorm;
    return {
      clamped: base.clamped + clamped,
      delta: Math.sqrt(d2),
      peak,
      realizedGain: inMax > 0 ? peak / inMax : 0,
      issBound,
      driveNorm,
      issSatisfied: peak <= issBound * (1 + ISS_SLACK) + ISS_SLACK
    };
  }
};
function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// ../omega/packages/trnn-core/src/learn/battery.ts
var SHIP_MARGIN = phiPow(-2);
function sampleTrajectory(opts = {}) {
  const nodes = opts.nodes ?? 89;
  const rung = opts.rung ?? 1;
  const warmup = opts.warmup ?? 233;
  const trainTicks = opts.trainTicks ?? 377;
  const holdTicks = opts.holdTicks ?? 144;
  const engine = new SingleTorusEngine({
    nodes,
    rung,
    seed: opts.seed ?? "omega-battery",
    coherenceDelay: 21
  });
  engine.run(warmup);
  const frames = [];
  const ticks = [];
  const total = trainTicks + holdTicks + 1;
  for (let k = 0; k < total; k++) {
    const s = engine.snapshot();
    frames.push(s.z);
    ticks.push(s.tick);
    engine.step();
  }
  return {
    nodes,
    rung,
    basis: buildBasis(createLattice(nodes, "fibonacci"), SIGNATURE_MODES),
    frames,
    ticks,
    trainPairs: trainTicks,
    holdPairs: holdTicks
  };
}
var Scratch = class {
  constructor(traj) {
    this.traj = traj;
    const n = traj.nodes;
    this.G = createField(n);
    this.P = createField(n);
    this.R = createField(n);
    this.Pi = createField(n);
    this.zhat = createField(n);
    this.out = createField(n);
    this.coeffs = coeffBuffer(traj.basis);
  }
  G;
  P;
  R;
  Pi;
  zhat;
  out;
  coeffs;
  /** Drives computable from z_t alone (memory is hidden from the predictor). */
  drives(z, tick) {
    analyze(this.traj.basis, z, this.coeffs);
    synthesize(this.traj.basis, this.coeffs, this.G);
    const th = 2 * Math.PI * PHI_INV;
    const c = dcos(th);
    const s = dsin(th);
    for (let i = 0; i < z.n; i++) {
      this.P.re[i] = this.G.re[i] * c - this.G.im[i] * s;
      this.P.im[i] = this.G.re[i] * s + this.G.im[i] * c;
      this.R.re[i] = z.re[i];
      this.R.im[i] = z.im[i];
      this.zhat.re[i] = z.re[i];
      this.zhat.im[i] = z.im[i];
    }
    closureTarget(z, this.Pi, tick, this.traj.rung);
  }
};
function scoreWindow(traj, cell, from, count, sc) {
  let num = 0;
  let den = 0;
  for (let k = from; k < from + count; k++) {
    const z = traj.frames[k];
    const y = traj.frames[k + 1];
    sc.drives(z, traj.ticks[k]);
    cell.step(z, sc.out, { G: sc.G, P: sc.P, R: sc.R, Pi: sc.Pi, zhat: sc.zhat });
    for (let i = 0; i < z.n; i++) {
      const er = sc.out.re[i] - y.re[i];
      const ei = sc.out.im[i] - y.im[i];
      num += er * er + ei * ei;
      den += y.re[i] * y.re[i] + y.im[i] * y.im[i];
    }
  }
  return { nrmse: den > 0 ? Math.sqrt(num / den) : 0, pairs: count };
}
function runBattery(traj, train = {}) {
  const iterations = train.iterations ?? 400;
  const a0 = train.stepScale ?? 1.5;
  const c0 = train.probeScale ?? 0.25;
  const stream = new SeedStream(train.seed ?? "omega-spsa");
  const sc = new Scratch(traj);
  const holdFrom = traj.trainPairs;
  const baseline = new LearnableCell({ gate: 0 });
  const baselineTrain = scoreWindow(traj, baseline, 0, traj.trainPairs, sc).nrmse;
  const baselineHold = scoreWindow(traj, baseline, holdFrom, traj.holdPairs, sc).nrmse;
  const cell = new LearnableCell({ gate: 1 });
  const params = cell.params();
  let theta = rawVector(params);
  const dim = theta.length;
  const plus = new Float64Array(dim);
  const minus = new Float64Array(dim);
  const delta = new Float64Array(dim);
  const evalTrain = (v) => {
    setRawVector(params, v);
    return scoreWindow(traj, cell, 0, traj.trainPairs, sc).nrmse;
  };
  let best = new Float64Array(theta);
  let bestLoss = evalTrain(theta);
  for (let k = 0; k < iterations; k++) {
    const ck = c0 / dpow(k + 1, 0.101);
    const ak = a0 / dpow(k + 10, 0.602);
    for (let i = 0; i < dim; i++) {
      delta[i] = stream.next() < 0.5 ? -1 : 1;
      plus[i] = theta[i] + ck * delta[i];
      minus[i] = theta[i] - ck * delta[i];
    }
    const lp = evalTrain(plus);
    const lm = evalTrain(minus);
    if (!Number.isFinite(lp) || !Number.isFinite(lm)) break;
    const g2 = (lp - lm) / (2 * ck);
    for (let i = 0; i < dim; i++) theta[i] -= ak * g2 * delta[i];
    const loss = evalTrain(theta);
    if (Number.isFinite(loss) && loss < bestLoss) {
      bestLoss = loss;
      best = new Float64Array(theta);
    }
  }
  theta = best;
  setRawVector(params, theta);
  const learnedTrain = scoreWindow(traj, cell, 0, traj.trainPairs, sc).nrmse;
  const learnedHold = scoreWindow(traj, cell, holdFrom, traj.holdPairs, sc).nrmse;
  const margin = baselineHold > 0 ? 1 - learnedHold / baselineHold : 0;
  const enabled = margin >= SHIP_MARGIN && Number.isFinite(learnedHold);
  if (!enabled) {
    cell.setGate(0);
  }
  const mix = Array.from(cell.mix.values());
  const report = {
    baselineTrain,
    baselineHold,
    learnedTrain,
    learnedHold,
    margin,
    required: SHIP_MARGIN,
    enabled,
    verdict: enabled ? `SHIP \u2014 held-out margin ${margin.toFixed(4)} \u2265 \u03C6\u207B\xB2 (${SHIP_MARGIN.toFixed(4)})` : `KILL \u2014 held-out margin ${margin.toFixed(4)} < \u03C6\u207B\xB2 (${SHIP_MARGIN.toFixed(4)}); learnable cell ships disabled (gate 0, bit-exact baseline)`,
    iterations,
    certifiedGain: cell.certifiedGain(),
    gate: cell.gate,
    mix,
    lambda: cell.lambda.lambda(),
    trainPairs: traj.trainPairs,
    holdPairs: traj.holdPairs
  };
  return { cell, report };
}

// ../omega/packages/trnn-core/src/sense/scan.ts
var FLUX_CLOSURE_TOLERANCE = 1e-9;
var CAPTURE_FLOOR = 0.5;
function histogram(src, buckets = 8) {
  const out = new Array(buckets).fill(0);
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    let b = Math.floor(v * buckets);
    if (!Number.isFinite(b)) b = 0;
    if (b < 0) b = 0;
    if (b >= buckets) b = buckets - 1;
    out[b]++;
  }
  return out;
}
function scanRung(engine, rank2) {
  const defects = [];
  const notes = [];
  const lattice = engine.lattice;
  const nodes = engine.nodes;
  const sep = minSeparation(lattice);
  const sensors = engine.sensors;
  const organs = engine.organs;
  const snap = engine.snapshot();
  const census = {
    status: "OK",
    nodes,
    fibonacci: true,
    // createLattice refuses a non-Fibonacci count at build
    latticeKind: lattice.kind,
    minSeparation: sep,
    separationRatio: sep * nodes,
    goldenStride: sensors ? sensors.goldenStep : 0,
    incidentLines: 4,
    modes: engine.basis.vectors.length
  };
  if (!(sep > 0)) defects.push("S1: two convergences coincide \u2014 the grid is degenerate");
  let organSection;
  if (!organs) {
    organSection = {
      status: "ABSENT",
      report: null,
      cleanFraction: 0,
      coherenceHistogram: [],
      participationHistogram: []
    };
    notes.push("S2: this rung carries no organ bank \u2014 structural readout unavailable");
  } else {
    let clean3 = 0;
    for (let j = 0; j < nodes; j++) if (organs.eigenResidual[j] < 1e-9) clean3++;
    const rep = organs.report();
    organSection = {
      status: rep.maxEigenResidual > 1 ? "DEFECT" : "OK",
      report: rep,
      cleanFraction: clean3 / nodes,
      coherenceHistogram: histogram(organs.localCoherence),
      participationHistogram: histogram(organs.participation)
    };
    if (organSection.status === "DEFECT") {
      defects.push(
        `S2: max modal residual ${rep.maxEigenResidual.toExponential(3)} exceeds the field scale`
      );
    }
  }
  let spectral;
  let energy2;
  let flux;
  if (!sensors) {
    spectral = {
      status: "ABSENT",
      bands: 0,
      depth: 0,
      windowPhase: 0,
      windowsClosed: 0,
      plan: [],
      occupancy: [],
      peakPerBand: [],
      meanCapture: 0,
      minCapture: 0,
      silentNodes: 0,
      maxDrift: 0,
      meanDcShare: 0,
      probe: null
    };
    energy2 = {
      status: "ABSENT",
      total: 0,
      peakShare: 0,
      peakNode: -1,
      entropy: 0,
      meanFrequency: 0,
      peakFrequency: 0,
      hotNodes: []
    };
    flux = {
      status: "ABSENT",
      divergenceSum: 0,
      circulation: 0,
      maxDivergence: 0,
      maxDivergenceNode: -1,
      closureDefect: 0
    };
    notes.push("S3\u2013S5: no sensory node array on this rung \u2014 build with sensors to scan it");
  } else {
    const rep = sensors.report();
    const B = sensors.bands;
    const occupancy = new Array(B).fill(0);
    const peakPerBand = new Array(B).fill(0);
    for (let j = 0; j < nodes; j++) {
      const row = j * B;
      for (let k = 0; k < B; k++) {
        const m = sensors.bandAmp[row + k];
        occupancy[k] += m;
        if (m > peakPerBand[k]) peakPerBand[k] = m;
      }
    }
    for (let k = 0; k < B; k++) occupancy[k] /= nodes;
    let maxDrift = 0;
    for (const p of sensors.plan) if (p.drift > maxDrift) maxDrift = p.drift;
    const warming = rep.windowsClosed === 0;
    const blind = !warming && rep.silent === nodes;
    spectral = {
      status: warming ? "WARMING" : blind ? "DEFECT" : "OK",
      bands: B,
      depth: sensors.depth,
      windowPhase: rep.windowPhase,
      windowsClosed: rep.windowsClosed,
      plan: sensors.plan,
      occupancy,
      peakPerBand,
      meanCapture: rep.meanCapture,
      minCapture: rep.minCapture,
      silentNodes: rep.silent,
      maxDrift,
      meanDcShare: rep.meanDcShare,
      probe: rep.probe
    };
    if (warming) {
      notes.push(
        `S3: first ${sensors.depth}-tick window still open (${rep.windowPhase}/${sensors.depth}) \u2014 no spectrum has latched yet`
      );
    } else if (blind) {
      defects.push("S3: every receptor latched an empty spectrum \u2014 the array is blind");
    } else if (rep.meanCapture < CAPTURE_FLOOR) {
      const top = rep.probe?.lines[0];
      notes.push(
        top ? `S3: the \u03C6 ladder holds ${(rep.meanCapture * 100).toFixed(2)}% of this rung's motion \u2014 its dominant line sits at ${top.frequency.toFixed(4)} cycles/tick (node ${rep.probe.node}, ${(top.share * 100).toFixed(1)}% of that node's AC energy, ${top.onLadder ? "on" : "off"} the ladder)` : `S3: the \u03C6 ladder holds ${(rep.meanCapture * 100).toFixed(2)}% of this rung's motion`
      );
    }
    let peakNode = -1;
    let peak = -1;
    for (let j = 0; j < nodes; j++) {
      if (sensors.energy[j] > peak) {
        peak = sensors.energy[j];
        peakNode = j;
      }
    }
    const order = Array.from({ length: nodes }, (_, j) => j).sort(
      (a, b) => sensors.energy[b] - sensors.energy[a]
    );
    energy2 = {
      status: rep.energy > 0 ? "OK" : "DEFECT",
      total: rep.energy,
      peakShare: rep.peakShare,
      peakNode,
      entropy: rep.energyEntropy,
      meanFrequency: rep.meanFrequency,
      peakFrequency: peakNode >= 0 ? sensors.frequency[peakNode] : 0,
      hotNodes: order.slice(0, 8)
    };
    if (energy2.status === "DEFECT") {
      defects.push("S4: the rung carries zero energy \u2014 the field is dark");
    }
    let maxDiv = 0;
    let maxNode = -1;
    for (let j = 0; j < nodes; j++) {
      const a = Math.abs(sensors.divergence[j]);
      if (a > maxDiv) {
        maxDiv = a;
        maxNode = j;
      }
    }
    const closureDefect = rep.circulation > 0 ? Math.abs(rep.divergenceSum) / rep.circulation : Math.abs(rep.divergenceSum);
    flux = {
      status: closureDefect > FLUX_CLOSURE_TOLERANCE ? "DEFECT" : "OK",
      divergenceSum: rep.divergenceSum,
      circulation: rep.circulation,
      maxDivergence: maxDiv,
      maxDivergenceNode: maxNode,
      closureDefect
    };
    if (flux.status === "DEFECT") {
      defects.push(
        `S5: current divergence does not close \u2014 relative defect ${closureDefect.toExponential(3)}`
      );
    }
  }
  return {
    rank: rank2,
    n: engine.rung,
    tick: snap.tick,
    census,
    organs: organSection,
    spectral,
    energy: energy2,
    flux,
    verdict: {
      pass: defects.length === 0,
      defects,
      notes,
      digest: snap.digest
    }
  };
}

// ../omega/packages/trnn-core/src/runtime/views.ts
function describeEngine(engine) {
  const strides = engine.clockStrides();
  const size = engine.rungs.length;
  const weights = new Array(size * size);
  for (let to = 0; to < size; to++) {
    for (let from = 0; from < size; from++) {
      weights[to * size + from] = couplingWeight(engine.coupling, to, from);
    }
  }
  return {
    rungs: engine.rungs.map((r, rank2) => ({
      rank: rank2,
      n: r.n,
      nodes: engine.engines[rank2].nodes,
      lucasResidue: r.lucasResidue,
      logRadius: r.logRadius,
      logMinorRadius: r.logMinorRadius,
      logTau: r.logTau,
      qrf: r.qrf,
      dense: r.dense,
      stride: strides[rank2] ?? 1,
      emitted: emittedMass(engine.coupling, rank2)
    })),
    web: {
      size,
      band: engine.coupling.band,
      rowSumDefect: engine.coupling.rowSumDefect,
      weights
    }
  };
}
function fieldFrame(engine, rank2, maxSamples = 610) {
  const eng = engine.engines[rank2];
  if (!eng) throw new RangeError(`fieldFrame: rank ${rank2} out of range`);
  const snap = eng.snapshot();
  const nodes = eng.nodes;
  const stride = Math.max(1, Math.ceil(nodes / Math.max(1, maxSamples)));
  const u = [];
  const v = [];
  const amp = [];
  const phase = [];
  let peak = 0;
  let sum = 0;
  for (let j = 0; j < nodes; j += stride) {
    const re = snap.z.re[j];
    const im = snap.z.im[j];
    const a = Math.sqrt(re * re + im * im);
    if (a > peak) peak = a;
    sum += a;
    u.push(eng.lattice.u[j]);
    v.push(eng.lattice.v[j]);
    amp.push(a);
    phase.push(datan2(im, re));
  }
  return {
    rank: rank2,
    n: engine.rungs[rank2].n,
    nodes,
    stride,
    u,
    v,
    amp,
    phase,
    peak,
    mean: amp.length > 0 ? sum / amp.length : 0,
    signature: Array.from(snap.signature),
    digest: snap.digest,
    tick: snap.tick
  };
}
function webView(engine, tail = 24) {
  const size = engine.rungs.length;
  const net = new Array(size);
  for (let i = 0; i < size; i++) net[i] = engine.ledger.net(i);
  return {
    tick: engine.currentTick(),
    net,
    sink: engine.ledger.net(FLUX_SINK),
    turnover: engine.ledger.turnover(),
    imbalance: engine.ledger.imbalance(),
    netImbalance: engine.ledger.netImbalance(),
    entries: engine.ledger.tail(tail),
    orderingViolations: engine.ordering.count()
  };
}
var siteCache = /* @__PURE__ */ new Map();
function siteFor(points) {
  let s = siteCache.get(points);
  if (!s) {
    s = new SpectralSite({ shellPoints: points });
    siteCache.set(points, s);
  }
  return s;
}
function resample(src, m) {
  const out = new Float64Array(m);
  const nsrc = src.length;
  if (nsrc === 0) return out;
  if (nsrc === 1) {
    out.fill(src[0]);
    return out;
  }
  for (let i = 0; i < m; i++) {
    const x = i * (nsrc - 1) / Math.max(1, m - 1);
    const j = Math.min(nsrc - 2, Math.floor(x));
    const f = x - j;
    out[i] = src[j] * (1 - f) + src[j + 1] * f;
  }
  return out;
}
function spectralView(engine, rank2) {
  const eng = engine.engines[rank2];
  if (!eng) throw new RangeError(`spectralView: rank ${rank2} out of range`);
  const snap = eng.snapshot();
  const amp = new Float64Array(eng.nodes);
  for (let j = 0; j < eng.nodes; j++) amp[j] = Math.sqrt(snap.z.re[j] * snap.z.re[j] + snap.z.im[j] * snap.z.im[j]);
  const points = Math.max(13, Math.min(233, largestFibonacciAtMost(eng.nodes)));
  const site = siteFor(points);
  const onShell = resample(amp, site.sphere.shell.n);
  const onRadial = resample(amp, site.radial.grid.n);
  return {
    rank: rank2,
    n: engine.rungs[rank2].n,
    source: `|z| of rung n=${engine.rungs[rank2].n} (${eng.nodes} nodes) resampled linearly onto the ${site.sphere.shell.n}-point Fibonacci shell and the ${site.radial.grid.n}-node radial quadrature`,
    shellPoints: site.sphere.shell.n,
    shell: site.shellReport(onShell),
    radial: site.radialReport(onRadial),
    signature: Array.from(site.signature(onShell))
  };
}
function rungScan(engine, rank2) {
  const e = engine.engines[rank2];
  if (!e) return null;
  return scanRung(e, rank2);
}

// ../omega/packages/trnn-core/src/runtime/host.ts
function tapeCapacityFor(totalNodes) {
  return Math.max(233, Math.min(10946, largestFibonacciAtMost(Math.max(233, totalNodes))));
}
var MEMORY_STRIDE = 144;
var MIND_STRIDE = 21;
var DEFAULT_ORGANS = { radialOrders: 8, radialGain: 0, stride: 3 };
var DEFAULT_SENSORS = { bands: 10, depth: 233 };
var DEFAULT_CHORDS = ["fibonacci", "lucas", "spiral"];
var DEFAULT_CHORD_GAIN = 1 / 1.618033988749895;
var DEFAULT_DRIVE = 1 / 1.618033988749895;
var MIN_HZ = 8;
var MAX_HZ = 64;
var EngineHost = class {
  profile;
  seed;
  ledger;
  engine;
  nodes;
  sliceBudgetMs;
  targetHz;
  busHz = MAX_HZ;
  running = false;
  last = null;
  lastLoad = 0;
  tickRate = 0;
  rateWindowStart = 0;
  rateWindowTicks = 0;
  checkpointTick = null;
  overruns = 0;
  /** Fractional tick debt carried between frames so the rate matches targetHz. */
  debt = 0;
  // ---- Ω-P6 sensory + braid memory ----
  plane = null;
  channelMeta = /* @__PURE__ */ new Map();
  braid = null;
  lastRecall = null;
  lastFoldTick = -1;
  stored = 0;
  skipped = 0;
  scratchField = null;
  // ---- Ω-P7 cognition ----
  mind = null;
  learnCell = null;
  lastLearn = null;
  obs = null;
  lastThought = null;
  lastMindTick = -1;
  /** Folds skipped because the ladder had nothing to report. */
  quiescentFolds = 0;
  constructor(opts) {
    this.profile = typeof opts.profile === "string" ? profileById(opts.profile) : opts.profile;
    this.seed = opts.seed ?? "metatron-omega";
    this.sliceBudgetMs = Math.max(0.01, opts.sliceBudgetMs ?? 8);
    this.targetHz = Math.min(MAX_HZ, Math.max(MIN_HZ, opts.targetHz ?? MAX_HZ));
    const ladder = opts.rungs ?? DENSE_CORE;
    const rungs = ladder.slice(0, this.profile.rungs);
    this.nodes = rungs.map((_, rank2) => nodesForRank(this.profile, rank2));
    this.engine = new MultiTorusEngine({
      rungs,
      nodes: (_r, rank2) => this.nodes[rank2],
      seed: this.seed,
      couplingBand: this.profile.couplingBand,
      clock: this.profile.clock,
      modes: this.profile.modes,
      tapeCapacity: this.profile.tape,
      drive: opts.drive ?? DEFAULT_DRIVE,
      organs: opts.organs === null ? void 0 : opts.organs ?? DEFAULT_ORGANS,
      sensors: opts.sensors === null ? void 0 : opts.sensors ?? DEFAULT_SENSORS,
      chords: opts.chords === null ? void 0 : opts.chords ?? DEFAULT_CHORDS,
      chordGain: opts.chordGain ?? DEFAULT_CHORD_GAIN,
      tape: opts.tape === null ? void 0 : opts.tape ?? { capacity: tapeCapacityFor(this.nodes.reduce((a, b) => a + b, 0)) }
    });
    this.ledger = new RunLedger(
      {
        id: `${this.profile.id}:${this.seed}:${Date.now().toString(36)}`,
        profileId: this.profile.id,
        seed: this.seed,
        nodes: this.nodes.slice(),
        startedAt: Date.now()
      },
      4181,
      opts.ledgerStride ?? 13
    );
  }
  start() {
    this.running = true;
    this.debt = 0;
  }
  stop() {
    this.running = false;
    this.debt = 0;
  }
  isRunning() {
    return this.running;
  }
  setTargetHz(hz) {
    this.targetHz = Math.min(MAX_HZ, Math.max(MIN_HZ, hz));
    this.busHz = Math.min(this.busHz, this.targetHz);
  }
  /** One deterministic tick, ledgered. Usable directly in tests. */
  stepOnce() {
    const rep = this.engine.step();
    this.last = rep;
    const mark = {
      tick: rep.tick,
      digest: rep.digest,
      coherence: rep.coherence,
      energy: rep.rungs.reduce((s, r) => s + (r?.energy ?? 0), 0),
      fluxImbalance: rep.fluxImbalance,
      orderingViolations: rep.orderingViolations,
      finite: rep.finite
    };
    this.ledger.mark(mark);
    this.foldMemory(rep.tick);
    this.foldMind(rep);
    return rep;
  }
  // ---- Ω-P6: sensory plane ----
  /** Lazily build the plane over the live rung geometry. */
  ensurePlane() {
    if (!this.plane) {
      this.plane = new SensoryPlane(this.engine.engines.map((e) => e.nodes));
      this.engine.attachSensory(this.plane);
    }
    return this.plane;
  }
  declareChannel(id, modality, nodes, gain = 1) {
    const plane = this.ensurePlane();
    const n = nodes ?? this.nodes[0];
    plane.declare({ id, modality, nodes: n, gain });
    this.channelMeta.set(id, { modality, nodes: n, gain, report: null, updatedAt: -1 });
  }
  /**
   * Encode raw modality data and push it into a channel. The host owns the
   * encoders so the worker boundary only ever carries plain arrays.
   */
  pushChannel(id, data, opts = {}) {
    const meta = this.channelMeta.get(id);
    if (!meta) throw new Error(`EngineHost: channel "${id}" is not declared`);
    const plane = this.ensurePlane();
    const f = senseField(meta.nodes);
    let report;
    switch (meta.modality) {
      case "text":
        report = encodeText(typeof data === "string" ? data : String(data), f);
        break;
      case "grid":
        report = encodeGrid(
          typeof data === "string" ? [] : data,
          opts.width ?? 0,
          opts.height ?? 0,
          f
        );
        break;
      case "audio":
        report = encodeAudio(typeof data === "string" ? [] : data, f);
        break;
      default:
        report = encodeScalars(typeof data === "string" ? [] : data, f);
        break;
    }
    plane.push(id, f, this.engine.currentTick());
    meta.report = report;
    meta.updatedAt = this.engine.currentTick();
    return report;
  }
  muteChannel(id) {
    this.plane?.mute(id);
    const meta = this.channelMeta.get(id);
    if (meta) meta.report = null;
  }
  /** Set the actuator loop gain (throws above φ⁻², Law L-S2). */
  setSenseGain(g2) {
    return this.ensurePlane().setLoopGain(g2);
  }
  sense() {
    const plane = this.ensurePlane();
    const channels = [...this.channelMeta.entries()].map(([id, m]) => ({
      id,
      modality: m.modality,
      nodes: m.nodes,
      gain: m.gain,
      peak: m.report?.peak ?? 0,
      energy: m.report?.energy ?? 0,
      support: m.report?.support ?? 0,
      updatedAt: m.updatedAt
    }));
    channels.sort((a, b) => a.id < b.id ? -1 : 1);
    return { channels, report: plane.report() };
  }
  // ---- Ω-P6: braid memory ----
  ensureBraid() {
    if (!this.braid) {
      const nodes = this.nodes[0] ?? 144;
      this.braid = new TorusBraid({ nodes, capacity: ratedCapacity(nodes) });
      this.scratchField = createField(nodes);
    }
    return this.braid;
  }
  /**
   * Fold the rank-0 field into the braid on the memory stride, behind a
   * novelty gate: a field the braid already recognises is *not* re-stored, so
   * capacity buys distinct experience rather than repetition. The recall that
   * decides this is the same cascade the UI reads as `familiarity`.
   */
  foldMemory(tick) {
    if (tick % MEMORY_STRIDE !== 0 || tick === this.lastFoldTick) return;
    const braid = this.ensureBraid();
    const snap = this.engine.engines[0].snapshot();
    const probe = this.scratchField;
    const n = Math.min(probe.n, snap.z.n);
    probe.re.fill(0);
    probe.im.fill(0);
    for (let i = 0; i < n; i++) {
      probe.re[i] = snap.z.re[i];
      probe.im[i] = snap.z.im[i];
    }
    const r = braid.recall(probe);
    this.lastRecall = r;
    this.lastFoldTick = tick;
    if (r.accepted && r.similarity >= braid.accept) {
      this.skipped++;
    } else {
      braid.store(snap.digest.slice(0, 16), probe, tick);
      this.stored++;
    }
  }
  // ---- Ω-P7: cognition ----
  ensureMind() {
    if (!this.mind) {
      const dim = Math.max(6, this.engine.rungs.length * 6);
      this.mind = new Mind({ dim, capacity: 610, seed: `${this.seed}-mind` });
      this.obs = new Float64Array(dim);
    }
    return this.mind;
  }
  /**
   * One cognitive fold per MIND_STRIDE ticks. The observation is the engine's
   * own per-rung telemetry — coherence, energy, obstruction, clamp pressure —
   * so a concept is literally a recurring shape of the ladder's behaviour, and
   * surprise is measured against that same vector. Nothing here is synthesised.
   */
  foldMind(rep) {
    if (rep.tick % MIND_STRIDE !== 0 || rep.tick === this.lastMindTick) return;
    const mind = this.ensureMind();
    const v = this.obs;
    for (let i = 0; i < this.engine.rungs.length; i++) {
      const t = rep.rungs[i];
      const o = i * 6;
      v[o] = t?.coherence ?? 0;
      v[o + 1] = dlog1p(Math.max(0, t?.energy ?? 0));
      v[o + 2] = t?.closureDefect ?? 0;
      v[o + 3] = t?.clamped ?? 0;
      v[o + 4] = t?.realizedGain ?? 0;
      v[o + 5] = t?.skill ?? 0;
    }
    let norm2 = 0;
    for (let i = 0; i < v.length; i++) norm2 += v[i] * v[i];
    if (!(norm2 > 1e-18) || !Number.isFinite(norm2)) {
      this.quiescentFolds++;
      this.lastMindTick = rep.tick;
      return;
    }
    this.lastThought = mind.observe(v, rep.tick, rep.digest.slice(0, 16));
    this.lastMindTick = rep.tick;
  }
  cognition() {
    return this.ensureMind().report();
  }
  /** Nearest concepts to the live observation — the read side of the store. */
  reflect(k = 5) {
    const mind = this.ensureMind();
    return mind.recall(this.obs ?? new Float64Array(mind.dim), k);
  }
  memory() {
    const braid = this.ensureBraid();
    return {
      load: braid.load,
      capacity: braid.capacity,
      beta: braid.beta(),
      stride: MEMORY_STRIDE,
      lastFoldTick: this.lastFoldTick,
      stored: this.stored,
      skipped: this.skipped,
      familiarity: this.lastRecall?.similarity ?? 0,
      lastRecall: this.lastRecall,
      patterns: braid.patterns().slice(-13)
    };
  }
  /**
   * Run as many ticks as fit in the slice budget, capped by the target rate.
   * `nowMs` is the frame timeline (injected, so the rate window is testable);
   * the slice budget is measured on the host's own monotonic clock — mixing
   * the two would compare an injected timeline against real time.
   */
  pump(nowMs, elapsedMs) {
    if (!this.running) return 0;
    this.debt = Math.min(this.debt + this.targetHz * elapsedMs / 1e3, this.targetHz);
    const wanted = Math.floor(this.debt);
    if (wanted < 1) return 0;
    const t0 = this.clock();
    let done = 0;
    for (let i = 0; i < wanted; i++) {
      this.stepOnce();
      done++;
      if (this.clock() - t0 >= this.sliceBudgetMs) break;
    }
    this.debt -= done;
    const spent = this.clock() - t0;
    this.lastLoad = spent / this.sliceBudgetMs;
    if (done < wanted || this.lastLoad > 1) {
      this.overruns++;
      this.busHz = Math.max(MIN_HZ, this.busHz / 1.618033988749895);
    } else if (this.lastLoad < 0.5) {
      this.busHz = Math.min(this.targetHz, this.busHz * 1.1);
    }
    if (this.rateWindowStart === 0) this.rateWindowStart = nowMs;
    this.rateWindowTicks += done;
    const span = nowMs - this.rateWindowStart;
    if (span >= 1e3) {
      this.tickRate = this.rateWindowTicks * 1e3 / span;
      this.rateWindowStart = nowMs;
      this.rateWindowTicks = 0;
    }
    return done;
  }
  clock() {
    const p = globalThis.performance;
    return p?.now ? p.now() : Date.now();
  }
  /** Exact web-wide checkpoint (rung state + web tick + digest chain). */
  checkpoint() {
    const cp = this.engine.checkpoint();
    this.checkpointTick = cp.tick;
    return cp;
  }
  restore(cp) {
    this.engine.restore(cp);
    this.last = null;
    this.checkpointTick = cp.tick;
  }
  snapshot() {
    const rep = this.last;
    const cost = profileCost(this.profile);
    const rungs = this.engine.rungs.map((r, i) => {
      const t = rep?.rungs[i];
      return {
        n: r.n,
        nodes: this.nodes[i],
        coherence: t?.coherence ?? 0,
        warm: t?.coherenceWarm ?? false,
        energy: t?.energy ?? 0,
        regime: t?.regime ?? "IDLE",
        clamped: t?.clamped ?? 0,
        obstruction: t?.obstruction ?? 0,
        closureDefect: t?.closureDefect ?? 0,
        closureQuality: t?.closureQuality ?? 0,
        skill: t?.skill ?? 0
      };
    });
    return {
      running: this.running,
      profile: this.profile.id,
      seed: this.seed,
      tick: this.engine.currentTick(),
      tickRate: this.tickRate,
      busHz: this.busHz,
      coherence: rep?.coherence ?? 0,
      coherenceWarm: rep?.coherenceWarm ?? NaN,
      warmRungs: rep?.warmRungsTotal ?? 0,
      energy: rungs.reduce((s, r) => s + r.energy, 0),
      fluxMoved: rep?.fluxMoved ?? 0,
      fluxImbalance: rep?.fluxImbalance ?? 0,
      orderingViolations: rep?.orderingViolations ?? 0,
      rowSumDefect: rep?.rowSumDefect ?? this.engine.coupling.rowSumDefect,
      worstEnergyRatio: rep?.worstEnergyRatio ?? 1,
      digest: rep?.digest ?? this.engine.digest(),
      finite: rep?.finite ?? true,
      stepped: rep?.stepped ?? [],
      rungs,
      nodes: this.nodes.slice(),
      totalNodes: cost.nodes,
      predictedBytes: cost.bytes,
      checkpointTick: this.checkpointTick,
      ledgerMarks: this.ledger.size(),
      load: this.lastLoad,
      senseChannels: this.plane?.report().channels ?? 0,
      sensePeak: this.plane?.report().maxPeak ?? 0,
      senseGain: this.plane?.currentLoopGain() ?? 0,
      memoryLoad: this.braid?.load ?? 0,
      memoryCapacity: this.braid?.capacity ?? 0,
      familiarity: this.lastRecall?.similarity ?? 0,
      memoryStage: this.lastRecall?.stage ?? "idle",
      concepts: this.mind?.store.size ?? 0,
      novelty: this.lastThought?.novelty ?? 0,
      surprise: this.lastThought?.surprise ?? 0,
      selfModel: this.mind?.self.enabled ?? false,
      selfMargin: this.mind?.self.margin() ?? 0,
      quiescentFolds: this.quiescentFolds,
      ...this.organSnapshot(),
      chords: this.engine.coupling.chords,
      tapeOccupancy: this.engine.tape?.occupied() ?? 0,
      tapeCapacity: this.engine.tape?.capacity ?? 0,
      tapeHead: this.engine.tape?.position() ?? 0
    };
  }
  /**
   * Ladder-wide organ rollup. Organ coverage is counted, not assumed: a rung
   * without an organ bank contributes 0 nodes, so `organNodes < totalNodes`
   * is visible in the UI instead of being papered over.
   */
  organSnapshot() {
    let nodes = 0;
    let res = 0;
    let part = 0;
    let rungs = 0;
    for (const e of this.engine.engines) {
      const r = e.organReport();
      if (!r) continue;
      nodes += e.nodes;
      res += r.meanEigenResidual;
      part += r.meanParticipation;
      rungs++;
    }
    return {
      organNodes: nodes,
      organResidual: rungs > 0 ? res / rungs : 0,
      organParticipation: rungs > 0 ? part / rungs : 0
    };
  }
  overrunCount() {
    return this.overruns;
  }
  // ---- Ω-P5 on-demand views (never on the snapshot bus) ----
  /** Static topology: ladder rungs, clocks, channel matrix. */
  describe() {
    return describeEngine(this.engine);
  }
  /** One rung's live field, decimated for rendering. */
  field(rank2, maxSamples = 610) {
    return fieldFrame(this.engine, rank2, maxSamples);
  }
  /** Ledger positions and the tail of the double-entry journal. */
  web(tail = 24) {
    return webView(this.engine, tail);
  }
  /** N1 — six-section sensory scan of one toroid. */
  scan(rank2) {
    return rungScan(this.engine, rank2);
  }
  /** Measured spectral roundtrip on the shell and radial planes. */
  spectral(rank2) {
    return spectralView(this.engine, rank2);
  }
  // ---- Ω-P8: learning ----
  /**
   * Run the held-out battery for the learnable cell against this host's seed.
   * Synchronous and off the bus by design: it is an explicit operator action,
   * not something the tick loop does behind the user's back. The engine state
   * is untouched — the battery builds its own private SingleTorusEngine.
   */
  learn(opts = {}) {
    const t0 = Date.now();
    const traj = sampleTrajectory({
      nodes: opts.nodes ?? Math.min(89, this.nodes[this.nodes.length - 1] ?? 55),
      seed: `${this.seed}-learn`,
      warmup: opts.warmup ?? 89,
      trainTicks: opts.trainTicks ?? 233,
      holdTicks: opts.holdTicks ?? 89
    });
    const { cell, report } = runBattery(traj, {
      iterations: opts.iterations ?? 240,
      seed: `${this.seed}-spsa`
    });
    this.learnCell = cell;
    this.lastLearn = {
      report,
      elapsedMs: Date.now() - t0,
      certificates: cell.certificates().map((c) => ({ ...c })),
      nodes: traj.nodes
    };
    return this.lastLearn;
  }
  /** Last battery result, or null when learning has never been run. */
  learnState() {
    return this.lastLearn;
  }
};

// ../omega/packages/trnn-core/src/learn/spectralFilter.ts
var FILTER_RHO_MAX = PHI_INV;
var SpectralFilter = class {
  kind = "SpectralFilter";
  size;
  /** raw layout: [mag_0..mag_{K-1}, phase_0..phase_{K-1}] */
  raw;
  rhoMax;
  out;
  constructor(modes, rhoMax = FILTER_RHO_MAX) {
    if (!Number.isInteger(modes) || modes <= 0) throw new RangeError(`SpectralFilter: modes must be a positive integer, got ${modes}`);
    if (!(rhoMax > 0) || !(rhoMax < 1)) throw new RangeError(`SpectralFilter: rhoMax must lie in (0,1), got ${rhoMax}`);
    this.size = modes;
    this.rhoMax = rhoMax;
    this.raw = new Float64Array(2 * modes);
    this.out = new Float64Array(2 * modes);
  }
  /** ρ_k ∈ [0, ρ_max]. |s(x)| is used so the map covers the closed lower end. */
  magnitude(k) {
    return this.rhoMax * Math.abs(algSigmoid(this.raw[k]));
  }
  /** ψ_k ∈ (−π, π). */
  phase(k) {
    return Math.PI * algSigmoid(this.raw[this.size + k]);
  }
  /** Interleaved [Re α_0, Im α_0, …]. Owned buffer; no allocation. */
  values() {
    for (let k = 0; k < this.size; k++) {
      const r = this.magnitude(k);
      const p = this.phase(k);
      this.out[2 * k] = r * dcos(p);
      this.out[2 * k + 1] = r * dsin(p);
    }
    return this.out;
  }
  /** c ← α ⊙ c, in place on an interleaved coefficient buffer. */
  apply(coeffs) {
    if (coeffs.length < 2 * this.size) {
      throw new RangeError(`SpectralFilter.apply: buffer holds ${coeffs.length / 2} modes, filter needs ${this.size}`);
    }
    const a = this.values();
    for (let k = 0; k < this.size; k++) {
      const cr = coeffs[2 * k];
      const ci = coeffs[2 * k + 1];
      const ar = a[2 * k];
      const ai = a[2 * k + 1];
      coeffs[2 * k] = ar * cr - ai * ci;
      coeffs[2 * k + 1] = ar * ci + ai * cr;
    }
    return coeffs;
  }
  /** The induced ℓ² gain of the filter: max_k |α_k|. */
  gain() {
    let m = 0;
    for (let k = 0; k < this.size; k++) m = Math.max(m, this.magnitude(k));
    return m;
  }
  certificate() {
    const g2 = this.gain();
    return {
      kind: this.kind,
      statement: `\u2016diag(\u03B1)\u2016\u2082 = max_k|\u03B1_k| \u2264 \u03C1_max = ${this.rhoMax} < 1 for every raw \u2208 R^${2 * this.size}`,
      bound: this.rhoMax,
      measured: g2,
      holds: g2 <= this.rhoMax * (1 + 8 * Number.EPSILON)
    };
  }
  /**
   * One deterministic gradient step on E = ½ Σ_k (ρ_k − target_k)².
   *
   *   dE/draw_k = (ρ_k − t_k) · ρ_max · sign(s) · s'(raw_k)
   *
   * Targets above ρ_max are honestly unreachable; the step drives ρ_k to the
   * ceiling and the residual it returns says so rather than pretending to fit.
   */
  stepMagnitudes(target, rate) {
    if (target.length < this.size) throw new RangeError(`stepMagnitudes: need ${this.size} targets, got ${target.length}`);
    let sse = 0;
    for (let k = 0; k < this.size; k++) {
      const x = this.raw[k];
      const s = algSigmoid(x);
      const rho = this.rhoMax * Math.abs(s);
      const err = rho - target[k];
      sse += err * err;
      const sgn = s >= 0 ? 1 : -1;
      this.raw[k] = x - rate * err * this.rhoMax * sgn * algSigmoidPrime(x);
    }
    return Math.sqrt(sse / this.size);
  }
  /** Run `iters` deterministic steps; returns the final RMS magnitude error. */
  fitMagnitudes(target, rate = 1, iters = 512) {
    let rms = Infinity;
    for (let i = 0; i < iters; i++) rms = this.stepMagnitudes(target, rate);
    return rms;
  }
};
function diffusionTarget(lambda, dt, out) {
  const o = out ?? new Float64Array(lambda.length);
  for (let k = 0; k < lambda.length; k++) o[k] = dexp(-lambda[k] * dt);
  return o;
}

// ../omega/packages/trnn-core/src/learn/mixer.ts
var BIAS_TOTAL = PHI_INV;
var SuperpositionMixer = class {
  basis;
  modes;
  /** Learnable bias *field*, held as its own eigencoefficients β_k. */
  bias;
  spatial;
  scratch;
  constructor(basis, biasTotal = BIAS_TOTAL) {
    this.basis = basis;
    this.modes = basis.vectors.length;
    this.spatial = createField(basis.n);
    this.scratch = new Float64Array(2 * this.modes);
    this.bias = new SimplexGain(this.modes, biasTotal);
  }
  /**
   * c ← analyze( σ( synth(c) ) ) + β. In place on an interleaved buffer.
   * Zero allocation after construction.
   */
  apply(coeffs) {
    if (coeffs.length < 2 * this.modes) {
      throw new RangeError(`SuperpositionMixer.apply: buffer holds ${coeffs.length / 2} modes, basis has ${this.modes}`);
    }
    let inE = 0;
    const occupied = new Uint8Array(this.modes);
    for (let k = 0; k < this.modes; k++) {
      const e = coeffs[2 * k] ** 2 + coeffs[2 * k + 1] ** 2;
      inE += e;
      if (e > 0) occupied[k] = 1;
    }
    synthesize(this.basis, coeffs, this.spatial);
    let peak = 0;
    for (let i = 0; i < this.spatial.n; i++) {
      const re = this.spatial.re[i];
      const im = this.spatial.im[i];
      const a = dmag(re, im);
      if (a > peak) peak = a;
      const g2 = algSigmoid(a);
      this.spatial.re[i] = re * g2;
      this.spatial.im[i] = im * g2;
    }
    analyze(this.basis, this.spatial, this.scratch);
    const beta = this.bias.values();
    let outE = 0;
    let newE = 0;
    for (let k = 0; k < this.modes; k++) {
      const r = this.scratch[2 * k] + beta[k];
      const i = this.scratch[2 * k + 1];
      coeffs[2 * k] = r;
      coeffs[2 * k + 1] = i;
      const e = r * r + i * i;
      outE += e;
      if (!occupied[k]) newE += e;
    }
    return {
      gain: inE > 0 ? Math.sqrt(outE / inE) : 0,
      transfer: outE > 0 ? newE / outE : 0,
      peak
    };
  }
  /** The certified ℓ² bound of this mixer at its current parameters. */
  bound(inputNorm) {
    return inputNorm + this.bias.total;
  }
};

// ../omega/packages/trnn-core/src/learn/spectralAttention.ts
function deinterleave(coeffs, modes) {
  const re = new Float64Array(modes);
  const im = new Float64Array(modes);
  for (let k = 0; k < modes; k++) {
    re[k] = coeffs[2 * k];
    im[k] = coeffs[2 * k + 1];
  }
  return { re, im };
}
function applySpectralAttention(coeffs, memory, modes, strength = 1) {
  if (coeffs.length < 2 * modes || memory.length < 2 * modes) {
    throw new RangeError("applySpectralAttention: buffers shorter than the declared mode count");
  }
  const s = Math.min(1, Math.max(0, strength));
  const q = deinterleave(coeffs, modes);
  const m = deinterleave(memory, modes);
  const c = crossCorrelate(q, m);
  let lag = 0;
  let peak = -1;
  let sumRot = 0;
  for (let k = 0; k < modes; k++) {
    const mag = dmag(c.re[k], c.im[k]);
    if (mag > peak) {
      peak = mag;
      lag = k;
    }
  }
  let eq = 0;
  let em = 0;
  for (let k = 0; k < modes; k++) {
    eq += q.re[k] ** 2 + q.im[k] ** 2;
    em += m.re[k] ** 2 + m.im[k] ** 2;
  }
  const denom = Math.sqrt(eq * em);
  if (s > 0) {
    for (let k = 0; k < modes; k++) {
      const theta = s * datan2(c.im[k], c.re[k]);
      sumRot += Math.abs(theta);
      const ct = dcos(theta);
      const st = dsin(theta);
      const cr = coeffs[2 * k];
      const ci = coeffs[2 * k + 1];
      coeffs[2 * k] = cr * ct - ci * st;
      coeffs[2 * k + 1] = cr * st + ci * ct;
    }
  }
  return {
    lag,
    alignment: denom > 0 ? peak / denom : 0,
    meanRotation: modes > 0 ? sumRot / modes : 0
  };
}

// ../omega/packages/trnn-core/src/learn/tiers.ts
var T1_MIN_LIMITS = {
  maxStorageBufferBindingSize: 64 * 1024 * 1024,
  maxComputeWorkgroupSizeX: 64
};
function tier0() {
  return {
    id: "T0",
    label: "pure TypeScript",
    available: true,
    reason: "always available \u2014 the certified engine path",
    evidence: { allocationFree: true }
  };
}
async function probeTier1(opts = {}) {
  const nav = opts.navigatorRef ?? (typeof navigator !== "undefined" ? navigator : void 0);
  if (!nav?.gpu) {
    return { id: "T1", label: "WebGPU training", available: false, reason: "no navigator.gpu in this context" };
  }
  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) {
      return { id: "T1", label: "WebGPU training", available: false, reason: "requestAdapter() returned null" };
    }
    const limits = adapter.limits ?? {};
    const sb = Number(limits["maxStorageBufferBindingSize"] ?? 0);
    const wg = Number(limits["maxComputeWorkgroupSizeX"] ?? 0);
    const ok = sb >= T1_MIN_LIMITS.maxStorageBufferBindingSize && wg >= T1_MIN_LIMITS.maxComputeWorkgroupSizeX;
    return {
      id: "T1",
      label: "WebGPU training",
      available: ok,
      reason: ok ? "adapter limits meet the training minimum" : `adapter under minimum (storage ${sb}B, workgroupX ${wg})`,
      evidence: {
        maxStorageBufferBindingSize: sb,
        maxComputeWorkgroupSizeX: wg,
        vendor: adapter.info?.vendor ?? "unknown",
        architecture: adapter.info?.architecture ?? "unknown"
      }
    };
  } catch (e) {
    return {
      id: "T1",
      label: "WebGPU training",
      available: false,
      reason: `adapter probe threw: ${e.message}`
    };
  }
}
async function pingJson(url, opts) {
  const f = opts.fetchImpl ?? globalThis.fetch;
  if (!f) throw new Error("no fetch in this context");
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const t = ctrl ? setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 1500) : null;
  const t0 = Date.now();
  try {
    const res = await f(url, ctrl ? { method: "GET", signal: ctrl.signal } : { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ms: Date.now() - t0, body: await res.json() };
  } finally {
    if (t) clearTimeout(t);
  }
}
async function probeTier2(opts = {}) {
  const base = opts.sidecarUrl;
  if (!base) {
    return { id: "T2", label: "local sidecar", available: false, reason: "no sidecar URL configured" };
  }
  try {
    const { ms, body } = await pingJson(`${base.replace(/\/$/, "")}/health`, opts);
    const info = body ?? {};
    return {
      id: "T2",
      label: "local sidecar",
      available: true,
      reason: `sidecar answered in ${ms} ms`,
      evidence: {
        latencyMs: ms,
        engine: String(info["engine"] ?? "unknown"),
        version: String(info["version"] ?? "unknown")
      }
    };
  } catch (e) {
    return { id: "T2", label: "local sidecar", available: false, reason: `no answer: ${e.message}` };
  }
}
async function probeTier3(opts = {}) {
  const url = opts.hostedUrl;
  if (!url) {
    return { id: "T3", label: "hosted training", available: false, reason: "no hosted endpoint configured" };
  }
  try {
    const { ms, body } = await pingJson(url, opts);
    const info = body ?? {};
    return {
      id: "T3",
      label: "hosted training",
      available: true,
      reason: `endpoint answered in ${ms} ms`,
      evidence: { latencyMs: ms, version: String(info["version"] ?? "unknown") }
    };
  } catch (e) {
    return { id: "T3", label: "hosted training", available: false, reason: `no answer: ${e.message}` };
  }
}
async function probeTiers(opts = {}) {
  const [t1, t2, t3] = await Promise.all([probeTier1(opts), probeTier2(opts), probeTier3(opts)]);
  const tiers = [tier0(), t1, t2, t3];
  const order = ["T3", "T2", "T1", "T0"];
  const selected = order.find((id) => tiers.find((t) => t.id === id)?.available) ?? "T0";
  return { tiers, selected };
}

// ../omega/packages/trnn-core/src/substrate/phiSubstrate.ts
var PSI = -PHI_INV;
var LUCAS_MOD13_PERIOD = 28;
function lucasMod13Cycle() {
  const out = [];
  for (let n = 0; n < LUCAS_MOD13_PERIOD; n++) out.push(Number(lucasBig(n) % 13n));
  return out;
}
function stableRungsMod28() {
  const cycle = lucasMod13Cycle();
  const out = [];
  for (let n = 0; n < LUCAS_MOD13_PERIOD; n++) if (cycle[n] === 1 || cycle[n] === 12) out.push(n);
  return out;
}
function isStableRung(n) {
  const r = (n % LUCAS_MOD13_PERIOD + LUCAS_MOD13_PERIOD) % LUCAS_MOD13_PERIOD;
  return stableRungsMod28().includes(r);
}
function heartbeatGaps() {
  const rungs = stableRungsMod28();
  const gaps = [];
  for (let i = 1; i < rungs.length; i++) gaps.push(rungs[i] - rungs[i - 1]);
  gaps.push(rungs[0] + LUCAS_MOD13_PERIOD - rungs[rungs.length - 1]);
  return gaps;
}
function heartbeatSchedule(cycles, start = 0) {
  const out = [];
  let prev = null;
  for (let n = start; n < start + cycles * LUCAS_MOD13_PERIOD; n++) {
    if (!isStableRung(n)) continue;
    const kind = prev !== null && n - prev === 2 ? "short" : "long";
    out.push({ tick: n, kind });
    prev = n;
  }
  return out;
}
function pisotDefect(n) {
  return phiPow(-n);
}
function metatronSpectrum() {
  const out = [];
  for (let k = 0; k < 13; k++) out.push(Math.round(phiPow(k)));
  return out;
}
function boundaryFlux(n) {
  return phiPow(-(13 + n));
}
var FLUX_WINDOW_LO = phiPow(-26);
var FLUX_WINDOW_HI = phiPow(-25);
function fluxFirstInWindow(limit = 1e4) {
  for (let n = 0; n <= limit; n++) {
    const f = boundaryFlux(n);
    if (f >= FLUX_WINDOW_LO && f < FLUX_WINDOW_HI) return n;
  }
  throw new Error("flux window never entered \u2014 substrate broken");
}
var CARRIER_N = 13;
var CARRIER_DIM = 2 * (CARRIER_N + 1);
var CONSOLIDATION_COS = 1 - phiPow(-3);
var PROMOTION_THRESHOLD = Math.ceil(phiPow(4));
var MIN_PAIRED = 34;
var RESONANCE_FLOOR = 0.05625982094858675;
var STRESS_THRESHOLD = 0.432;
var EMPIRICAL_CONSTANTS = {
  RESONANCE_FLOOR: {
    value: RESONANCE_FLOOR,
    class: "C",
    note: "PSLQ over 3 bases at 80 digits found no \u03C6-closed form (F3)."
  },
  STRESS_THRESHOLD: {
    value: STRESS_THRESHOLD,
    class: "C",
    note: "Nearest \u03C6-candidates 0.7\xB7\u03C6\u207B\xB9 and \u03C6\u207B\xB3+\u03BA both miss by ~1e-3 (F4)."
  }
};
function corridor(opts = {}) {
  const vfeNorm = opts.vfeNorm ?? 1;
  const phiCaution = opts.phiCaution ?? PHI_INV;
  const lambdaNorm = opts.lambdaNorm ?? 0;
  const lower = Math.max(phiPow(-2), 1 - vfeNorm);
  const upper = Math.min(phiCaution, 1 - lambdaNorm * PHI_INV);
  const classify = (score2) => score2 >= PHI_INV ? "STABLE" : score2 >= STRESS_THRESHOLD ? "WATCH" : "STRESS";
  return { lower, upper, classify };
}
function carrierPack(re, im, out) {
  const n = Math.min(re.length, im.length);
  const dst = out ?? new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    dst[2 * i] = re[i];
    dst[2 * i + 1] = im[i];
  }
  return dst;
}
function carrierUnpack(x) {
  const n = x.length >> 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    re[i] = x[2 * i];
    im[i] = x[2 * i + 1];
  }
  return { re, im };
}
function sns(d) {
  if (d === 3) return 3;
  if (d === 4) return 2 + 2 * Math.sqrt(5);
  if (d === 5) return 15;
  if (d === 6) return -0.5 + 31 * Math.sqrt(5) / 2;
  throw new Error(`SNS has no closed form at d=${d} (Class A boundary is d \u2208 {3,4,5,6})`);
}
function substrateParity() {
  const checks = [];
  const add2 = (name, cls, ok, detail) => checks.push({ name, class: cls, ok, detail });
  add2("phi^-1 + phi^-2 = 1", "A", Math.abs(PHI_INV + phiPow(-2) - 1) < 1e-15, `${PHI_INV + phiPow(-2)}`);
  add2("psi = -phi^-1", "A", Math.abs(PSI + PHI_INV) < 1e-15, `${PSI}`);
  add2("kappa*phi*pi = 1", "A", Math.abs(KAPPA * PHI * Math.PI - 1) < 1e-15, `${KAPPA}`);
  const cycle = lucasMod13Cycle();
  add2("L_n mod 13 has no zero residue", "A", !cycle.includes(0), cycle.join(","));
  const rungs = stableRungsMod28();
  add2("four stable rungs {1,13,15,27} (F1)", "A", rungs.join(",") === "1,13,15,27", rungs.join(","));
  add2("heartbeat gaps {12,2,12,2}", "A", heartbeatGaps().join(",") === "12,2,12,2", heartbeatGaps().join(","));
  add2("flux window first entered at n=13 (F2)", "A", fluxFirstInWindow() === 13, `${fluxFirstInWindow()}`);
  add2(
    "Metatron spectrum round(phi^k)",
    "A",
    metatronSpectrum().join(",") === "1,2,3,4,7,11,18,29,47,76,123,199,322",
    metatronSpectrum().join(",")
  );
  add2("carrier dim = 2*(13+1) = 28", "A", CARRIER_DIM === 28, `${CARRIER_DIM}`);
  add2("promotion threshold = ceil(phi^4) = 7", "A", PROMOTION_THRESHOLD === 7, `${PROMOTION_THRESHOLD}`);
  add2(
    "consolidation cosine = 1 - phi^-3",
    "A",
    Math.abs(CONSOLIDATION_COS - 0.7639320225002102) < 1e-15,
    `${CONSOLIDATION_COS}`
  );
  add2("SNS(4) = 4*phi", "A", Math.abs(sns(4) - 4 * PHI) < 1e-15, `${sns(4)}`);
  add2("resonance floor is Class C (empirical)", "C", EMPIRICAL_CONSTANTS.RESONANCE_FLOOR.class === "C", `${RESONANCE_FLOOR}`);
  add2("stress threshold is Class C (empirical)", "C", EMPIRICAL_CONSTANTS.STRESS_THRESHOLD.class === "C", `${STRESS_THRESHOLD}`);
  return checks;
}
function substrateParityHolds() {
  return substrateParity().every((c) => c.class !== "A" || c.ok);
}

// ../omega/packages/trnn-core/src/substrate/coherenceKernel.ts
var KERNEL_LAMBDA = phiPow(-2);
var COHERENCE_GATE = phiPow(-2);
function kernelRoots(lam = KERNEL_LAMBDA) {
  const b = 1 - lam;
  const disc = Math.sqrt(b * b + 4 * lam);
  return [(b + disc) / 2, (b - disc) / 2];
}
function analyticExpectedC(theta = 1, d = 8, tauSteps = 1) {
  const rho = dexp(-theta * tauSteps / PHI);
  return rho * rho + (1 - rho * rho) / d;
}
function expectedCBias(d = 8, tauSteps = 1) {
  const c = tauSteps <= 1 ? 0.17 : 0.07;
  return c / d;
}
var PhiCoherenceKernel = class _PhiCoherenceKernel {
  d;
  tauSteps;
  lam;
  /** Live state Ψ(t), split complex. */
  psiRe;
  psiIm;
  histRe;
  histIm;
  innRe;
  innIm;
  cap;
  head = 0;
  count = 0;
  /** Running mean of the injected innovations (Welford incremental). */
  innMeanRe;
  innMeanIm;
  constructor(d = 8, tauSteps = 2, lam = KERNEL_LAMBDA) {
    if (!(d > 0) || !Number.isInteger(d)) throw new Error("kernel dimension must be a positive integer");
    if (!(tauSteps >= 1) || !Number.isInteger(tauSteps)) throw new Error("tauSteps must be an integer >= 1");
    this.d = d;
    this.tauSteps = tauSteps;
    this.lam = lam;
    this.cap = 2 * tauSteps + 1;
    this.psiRe = new Float64Array(d);
    this.psiIm = new Float64Array(d);
    this.histRe = new Float64Array(this.cap * d);
    this.histIm = new Float64Array(this.cap * d);
    this.innRe = new Float64Array(this.cap * d);
    this.innIm = new Float64Array(this.cap * d);
    this.innMeanRe = new Float64Array(d);
    this.innMeanIm = new Float64Array(d);
  }
  /** τ in drive steps for a step size dt against the natural delay φ⁻¹. */
  static fromDt(dt, d = 8) {
    return new _PhiCoherenceKernel(d, Math.max(1, Math.round(dt / PHI_INV)));
  }
  reset() {
    this.psiRe.fill(0);
    this.psiIm.fill(0);
    this.histRe.fill(0);
    this.histIm.fill(0);
    this.innRe.fill(0);
    this.innIm.fill(0);
    this.innMeanRe.fill(0);
    this.innMeanIm.fill(0);
    this.head = 0;
    this.count = 0;
  }
  /** Ring slot of the entry `back` steps behind the newest one (0 = newest). */
  slot(back) {
    return ((this.head - 1 - back) % this.cap + this.cap) % this.cap;
  }
  /** Advance one τ with the given innovation. Returns the measured report. */
  step(innRe, innIm) {
    const d = this.d;
    if (innRe.length !== d || innIm.length !== d) throw new Error("innovation has wrong dimension");
    const haveA = this.count >= this.tauSteps;
    const haveB = this.count >= 2 * this.tauSteps;
    const sa = haveA ? this.slot(this.tauSteps - 1) * d : -1;
    const sb = haveB ? this.slot(2 * this.tauSteps - 1) * d : -1;
    const g2 = 1 - this.lam;
    for (let i = 0; i < d; i++) {
      const ar = haveA ? this.histRe[sa + i] : 0;
      const ai = haveA ? this.histIm[sa + i] : 0;
      const br = haveB ? this.histRe[sb + i] : 0;
      const bi = haveB ? this.histIm[sb + i] : 0;
      this.psiRe[i] = g2 * ar + this.lam * br + innRe[i];
      this.psiIm[i] = g2 * ai + this.lam * bi + innIm[i];
    }
    const base = this.head * d;
    this.histRe.set(this.psiRe, base);
    this.histIm.set(this.psiIm, base);
    this.innRe.set(innRe, base);
    this.innIm.set(innIm, base);
    this.head = (this.head + 1) % this.cap;
    this.count++;
    const n = this.count;
    for (let i = 0; i < d; i++) {
      this.innMeanRe[i] += (innRe[i] - this.innMeanRe[i]) / n;
      this.innMeanIm[i] += (innIm[i] - this.innMeanIm[i]) / n;
    }
    let energy2 = 0;
    for (let i = 0; i < d; i++) energy2 += this.psiRe[i] * this.psiRe[i] + this.psiIm[i] * this.psiIm[i];
    const coherence = this.coherence();
    return {
      coherence,
      gateOpen: coherence !== null && coherence > COHERENCE_GATE,
      energy: energy2,
      samples: this.count
    };
  }
  /**
   * Innovation-form C(t). Returns null (abstain) until τ+1 innovations exist
   * or when either innovation has zero centred norm — never a fabricated 0.
   */
  coherence() {
    if (this.count < this.tauSteps + 1) return null;
    const d = this.d;
    const now2 = this.slot(0) * d;
    const lag = this.slot(this.tauSteps) * d;
    let dotRe = 0;
    let dotIm = 0;
    let nn = 0;
    let ll = 0;
    for (let i = 0; i < d; i++) {
      const ar = this.innRe[now2 + i] - this.innMeanRe[i];
      const ai = this.innIm[now2 + i] - this.innMeanIm[i];
      const br = this.innRe[lag + i] - this.innMeanRe[i];
      const bi = this.innIm[lag + i] - this.innMeanIm[i];
      dotRe += ar * br + ai * bi;
      dotIm += ar * bi - ai * br;
      nn += ar * ar + ai * ai;
      ll += br * br + bi * bi;
    }
    const den = nn * ll;
    if (!(den > 0)) return null;
    const c = (dotRe * dotRe + dotIm * dotIm) / den;
    return Math.min(1, Math.max(0, c));
  }
  /** The corridor gate: measured C(t) strictly above φ⁻². */
  gateOpen() {
    const c = this.coherence();
    return c !== null && c > COHERENCE_GATE;
  }
};
function ouInnovation(rand, re, im, theta = 1, fresh = false) {
  const rho = dexp(-theta / PHI);
  const sigma = Math.sqrt(1 - rho * rho);
  const d = re.length;
  for (let i = 0; i < d; i++) {
    const u1 = Math.max(rand(), Number.MIN_VALUE);
    const u2 = rand();
    const r = Math.sqrt(-2 * dlog(u1));
    const nr = r * dcos(2 * Math.PI * u2) / Math.SQRT2;
    const ni = r * dsin(2 * Math.PI * u2) / Math.SQRT2;
    if (fresh) {
      re[i] = nr;
      im[i] = ni;
    } else {
      re[i] = rho * re[i] + sigma * nr;
      im[i] = rho * im[i] + sigma * ni;
    }
  }
}

// ../omega/packages/trnn-core/src/substrate/signalStats.ts
var MSC_MIN_SEGMENTS = 3;
function hann(n) {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * dcos(2 * Math.PI * i / n);
  return w;
}
function zeros(n) {
  return new Float64Array(n);
}
function mean2(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i];
  return x.length ? s / x.length : 0;
}
function welchMSC(x, y, opts = {}) {
  const n = Math.min(x.length, y.length);
  const fs = opts.fs ?? 1;
  const nperseg = Math.max(8, Math.min(opts.nperseg ?? 64, n));
  const overlap = opts.overlap ?? 0.5;
  const step = Math.max(1, Math.round(nperseg * (1 - overlap)));
  const nBins = Math.floor(nperseg / 2) + 1;
  const freqs = zeros(nBins);
  for (let k = 0; k < nBins; k++) freqs[k] = k * fs / nperseg;
  const segments = n >= nperseg ? Math.floor((n - nperseg) / step) + 1 : 0;
  if (segments < MSC_MIN_SEGMENTS) {
    return {
      msc: null,
      freqs,
      segments,
      bandMean: null,
      abstained: true,
      reason: `need ${MSC_MIN_SEGMENTS} Welch segments, have ${segments}`
    };
  }
  const w = hann(nperseg);
  const sxxR = zeros(nBins);
  const syyR = zeros(nBins);
  const sxyR = zeros(nBins);
  const sxyI = zeros(nBins);
  const bufR = zeros(nperseg);
  const bufI = zeros(nperseg);
  for (let s = 0; s < segments; s++) {
    const off = s * step;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < nperseg; i++) {
      mx += x[off + i];
      my += y[off + i];
    }
    mx /= nperseg;
    my /= nperseg;
    for (let i = 0; i < nperseg; i++) bufR[i] = (x[off + i] - mx) * w[i];
    bufI.fill(0);
    const X = fft(bufR, bufI, false);
    for (let i = 0; i < nperseg; i++) bufR[i] = (y[off + i] - my) * w[i];
    bufI.fill(0);
    const Y = fft(bufR, bufI, false);
    for (let k = 0; k < nBins; k++) {
      const xr = X.re[k];
      const xi = X.im[k];
      const yr = Y.re[k];
      const yi = Y.im[k];
      sxxR[k] += xr * xr + xi * xi;
      syyR[k] += yr * yr + yi * yi;
      sxyR[k] += xr * yr + xi * yi;
      sxyI[k] += xi * yr - xr * yi;
    }
  }
  const msc = zeros(nBins);
  for (let k = 0; k < nBins; k++) {
    const den = sxxR[k] * syyR[k];
    const num = sxyR[k] * sxyR[k] + sxyI[k] * sxyI[k];
    msc[k] = den > 0 ? Math.min(1, num / den) : 0;
  }
  const band = opts.band;
  let bandMean = null;
  {
    let acc = 0;
    let cnt = 0;
    for (let k = 0; k < nBins; k++) {
      if (band && (freqs[k] < band[0] || freqs[k] > band[1])) continue;
      acc += msc[k];
      cnt++;
    }
    bandMean = cnt > 0 ? acc / cnt : null;
  }
  return { msc, freqs, segments, bandMean, abstained: false };
}
var cmul = (p, q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
var cdiv = (p, q) => {
  const d = q.re * q.re + q.im * q.im;
  return { re: (p.re * q.re + p.im * q.im) / d, im: (p.im * q.re - p.re * q.im) / d };
};
var csqrt = (z) => {
  const m = Math.sqrt(Math.sqrt(z.re * z.re + z.im * z.im));
  const a = 0.5 * datan2(z.im, z.re);
  return { re: m * dcos(a), im: m * dsin(a) };
};
function butterBandpass(f1, f2, fs, order = 2) {
  if (!(f1 > 0 && f2 > f1 && f2 < fs / 2)) {
    throw new RangeError(`butterBandpass: need 0 < f1 < f2 < fs/2, got ${f1}, ${f2}, fs=${fs}`);
  }
  const t = 2 * fs;
  const warp = (f) => t * (dsin(Math.PI * (f / fs)) / dcos(Math.PI * (f / fs)));
  const wl = warp(f1);
  const wh = warp(f2);
  const w0sq = wl * wh;
  const B = wh - wl;
  const sos = [];
  const pushPole = (sPole) => {
    const zp = cdiv({ re: t + sPole.re, im: sPole.im }, { re: t - sPole.re, im: -sPole.im });
    sos.push({ b0: 1, b1: 0, b2: -1, a1: -2 * zp.re, a2: zp.re * zp.re + zp.im * zp.im });
  };
  for (let k = 0; k < order; k++) {
    const ang = Math.PI * (2 * k + 1 + order) / (2 * order);
    const p = { re: dcos(ang), im: dsin(ang) };
    if (p.im < -1e-12) continue;
    const Bp = { re: B * p.re, im: B * p.im };
    const disc = csqrt({ re: Bp.re * Bp.re - Bp.im * Bp.im - 4 * w0sq, im: 2 * Bp.re * Bp.im });
    const r0 = { re: (Bp.re + disc.re) / 2, im: (Bp.im + disc.im) / 2 };
    const r1 = { re: (Bp.re - disc.re) / 2, im: (Bp.im - disc.im) / 2 };
    if (Math.abs(p.im) <= 1e-12) {
      pushPole(r0);
    } else {
      pushPole(r0);
      pushPole(r1);
    }
  }
  const fc = Math.sqrt(f1 * f2);
  const w = 2 * Math.PI * fc / fs;
  const ejw = { re: dcos(-w), im: dsin(-w) };
  const ej2w = cmul(ejw, ejw);
  let g2 = { re: 1, im: 0 };
  for (const s of sos) {
    const num = {
      re: s.b0 + s.b1 * ejw.re + s.b2 * ej2w.re,
      im: s.b1 * ejw.im + s.b2 * ej2w.im
    };
    const den = { re: 1 + s.a1 * ejw.re + s.a2 * ej2w.re, im: s.a1 * ejw.im + s.a2 * ej2w.im };
    g2 = cmul(g2, cdiv(num, den));
  }
  const mag = Math.sqrt(g2.re * g2.re + g2.im * g2.im) || 1;
  const scale = dpow(1 / mag, 1 / sos.length);
  return sos.map((s) => ({ ...s, b0: s.b0 * scale, b1: s.b1 * scale, b2: s.b2 * scale }));
}
function sosFilt(sos, x) {
  const out = Float64Array.from(x);
  for (const s of sos) {
    let z1 = 0;
    let z2 = 0;
    for (let i = 0; i < out.length; i++) {
      const v = out[i];
      const y = s.b0 * v + z1;
      z1 = s.b1 * v - s.a1 * y + z2;
      z2 = s.b2 * v - s.a2 * y;
      out[i] = y;
    }
  }
  return out;
}
function sosFiltFilt(sos, x) {
  const fwd = sosFilt(sos, x);
  const rev = Float64Array.from(fwd).reverse();
  const back = sosFilt(sos, rev);
  return Float64Array.from(back).reverse();
}
function hilbertAnalytic(x) {
  const n = x.length;
  const re = Float64Array.from(x);
  const im = new Float64Array(n);
  const X = fft(re, im, false);
  const half = Math.floor(n / 2);
  for (let k = 0; k < n; k++) {
    let h;
    if (k === 0 || n % 2 === 0 && k === half) h = 1;
    else if (k < half + n % 2) h = 2;
    else h = 0;
    X.re[k] *= h;
    X.im[k] *= h;
  }
  const inv = fft(X.re, X.im, true);
  for (let i = 0; i < n; i++) {
    inv.re[i] /= n;
    inv.im[i] /= n;
  }
  return inv;
}
var PLV_EDGE_FRACTION = 0.1;
var PLV_MIN_SAMPLES = 34;
function bandPLV(x, y, band, fs, order = 2) {
  const n = Math.min(x.length, y.length);
  const trim = Math.floor(n * PLV_EDGE_FRACTION);
  const usable = n - 2 * trim;
  if (usable < PLV_MIN_SAMPLES) {
    return {
      plv: null,
      meanPhase: null,
      n: Math.max(0, usable),
      abstained: true,
      reason: `need ${PLV_MIN_SAMPLES} usable samples, have ${Math.max(0, usable)}`
    };
  }
  const sos = butterBandpass(band[0], band[1], fs, order);
  const xf = sosFiltFilt(sos, Array.prototype.slice.call(x, 0, n));
  const yf = sosFiltFilt(sos, Array.prototype.slice.call(y, 0, n));
  const ax = hilbertAnalytic(xf);
  const ay = hilbertAnalytic(yf);
  let sr = 0;
  let si = 0;
  for (let i = trim; i < n - trim; i++) {
    const r = ax.re[i] * ay.re[i] + ax.im[i] * ay.im[i];
    const m = ax.im[i] * ay.re[i] - ax.re[i] * ay.im[i];
    const mag = Math.sqrt(r * r + m * m);
    if (mag <= 0) continue;
    sr += r / mag;
    si += m / mag;
  }
  const plv = Math.min(1, Math.sqrt(sr * sr + si * si) / usable);
  return { plv, meanPhase: datan2(si, sr), n: usable, abstained: false };
}
function gccPhat(x, y, maxLag, eps = 1e-12) {
  const n = Math.min(x.length, y.length);
  if (n < 8) return { lag: null, peak: 0, abstained: true, reason: `need 8 samples, have ${n}` };
  const m = 2 * n;
  const mx = mean2(Array.prototype.slice.call(x, 0, n));
  const my = mean2(Array.prototype.slice.call(y, 0, n));
  const xr = new Float64Array(m);
  const xi = new Float64Array(m);
  const yr = new Float64Array(m);
  const yi = new Float64Array(m);
  for (let i = 0; i < n; i++) {
    xr[i] = x[i] - mx;
    yr[i] = y[i] - my;
  }
  const X = fft(xr, xi, false);
  const Y = fft(yr, yi, false);
  const cr = new Float64Array(m);
  const ci = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const rr = X.re[k] * Y.re[k] + X.im[k] * Y.im[k];
    const ii = X.im[k] * Y.re[k] - X.re[k] * Y.im[k];
    const mag = Math.sqrt(rr * rr + ii * ii);
    const d = mag > eps ? mag : eps;
    cr[k] = rr / d;
    ci[k] = ii / d;
  }
  const c = fft(cr, ci, true);
  for (let k = 0; k < m; k++) c.re[k] /= m;
  const lim = Math.min(maxLag ?? n - 1, n - 1);
  let best = -Infinity;
  let bestLag = 0;
  for (let l = -lim; l <= lim; l++) {
    const idx = l >= 0 ? l : m + l;
    const v = c.re[idx];
    if (v > best) {
      best = v;
      bestLag = l;
    }
  }
  const at2 = (l) => c.re[l >= 0 ? l % m : m + l % m];
  const ym1 = at2(bestLag - 1);
  const y0 = at2(bestLag);
  const y1 = at2(bestLag + 1);
  const den = ym1 - 2 * y0 + y1;
  const frac = Math.abs(den) > 1e-15 ? 0.5 * (ym1 - y1) / den : 0;
  const refined = bestLag + (Math.abs(frac) < 1 ? frac : 0);
  return { lag: 0 - refined, peak: best, abstained: false };
}
function safeLog(v, floor = 1e-300) {
  return dlog(v > floor ? v : floor);
}

// ../omega/packages/trnn-core/src/substrate/correlation.ts
var STAT_FLOOR = 34;
var QUADRATIC_CAP = 512;
var abstain = (n, reason) => ({
  value: null,
  n,
  abstained: true,
  reason
});
function pairLength(x, y) {
  return Math.min(x.length, y.length);
}
function decimate(x, cap) {
  const n = x.length;
  if (n <= cap) return Float64Array.from(x);
  const out = new Float64Array(cap);
  for (let i = 0; i < cap; i++) out[i] = x[Math.floor(i * n / cap)];
  return out;
}
function pearson(x, y) {
  const n = pairLength(x, y);
  if (n < STAT_FLOOR) return abstain(n, `n=${n} < F9 floor ${STAT_FLOOR}`);
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += x[i];
    my += y[i];
  }
  mx /= n;
  my /= n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    sxy += a * b;
    sxx += a * a;
    syy += b * b;
  }
  if (sxx <= 0 || syy <= 0) return abstain(n, "zero variance in one channel");
  const r = sxy / Math.sqrt(sxx * syy);
  return { value: Math.max(-1, Math.min(1, r)), n, abstained: false };
}
function rank(x) {
  const n = x.length;
  const idx = Array.from({ length: n }, (_, i2) => i2).sort((a, b) => x[a] - x[b]);
  const r = new Float64Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && x[idx[j + 1]] === x[idx[i]]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k]] = avg;
    i = j + 1;
  }
  return r;
}
function spearman(x, y) {
  const n = pairLength(x, y);
  if (n < STAT_FLOOR) return abstain(n, `n=${n} < F9 floor ${STAT_FLOOR}`);
  return pearson(rank(Float64Array.from(x).slice(0, n)), rank(Float64Array.from(y).slice(0, n)));
}
function kendallTauB(x, y) {
  const nRaw = pairLength(x, y);
  if (nRaw < STAT_FLOOR) return abstain(nRaw, `n=${nRaw} < F9 floor ${STAT_FLOOR}`);
  const a = decimate(Float64Array.from(x).slice(0, nRaw), QUADRATIC_CAP);
  const b = decimate(Float64Array.from(y).slice(0, nRaw), QUADRATIC_CAP);
  const n = a.length;
  let conc = 0;
  let disc = 0;
  let tx = 0;
  let ty = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = a[i] - a[j];
      const dy = b[i] - b[j];
      const s = Math.sign(dx) * Math.sign(dy);
      if (s > 0) conc++;
      else if (s < 0) disc++;
      else {
        if (dx === 0 && dy !== 0) tx++;
        else if (dy === 0 && dx !== 0) ty++;
        else {
          tx++;
          ty++;
        }
      }
    }
  }
  const n0 = n * (n - 1) / 2;
  const den = Math.sqrt((n0 - tx) * (n0 - ty));
  if (!(den > 0)) return abstain(n, "all pairs tied");
  return { value: Math.max(-1, Math.min(1, (conc - disc) / den)), n, abstained: false };
}
function doubleCenter(v, n) {
  const rowMean = new Float64Array(n);
  let grand = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += v[i * n + j];
    rowMean[i] = s / n;
    grand += s;
  }
  grand /= n * n;
  const out = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) out[i * n + j] = v[i * n + j] - rowMean[i] - rowMean[j] + grand;
  }
  return out;
}
function distMatrix(x) {
  const n = x.length;
  const d = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = Math.abs(x[i] - x[j]);
      d[i * n + j] = v;
      d[j * n + i] = v;
    }
  }
  return d;
}
function distanceCorrelation(x, y) {
  const nRaw = pairLength(x, y);
  if (nRaw < STAT_FLOOR) return abstain(nRaw, `n=${nRaw} < F9 floor ${STAT_FLOOR}`);
  const a = decimate(Float64Array.from(x).slice(0, nRaw), QUADRATIC_CAP);
  const b = decimate(Float64Array.from(y).slice(0, nRaw), QUADRATIC_CAP);
  const n = a.length;
  const A = doubleCenter(distMatrix(a), n);
  const B = doubleCenter(distMatrix(b), n);
  let dcov = 0;
  let dvx = 0;
  let dvy = 0;
  for (let i = 0; i < n * n; i++) {
    dcov += A[i] * B[i];
    dvx += A[i] * A[i];
    dvy += B[i] * B[i];
  }
  const m = n * n;
  dcov /= m;
  dvx /= m;
  dvy /= m;
  const den = Math.sqrt(Math.max(0, dvx) * Math.max(0, dvy));
  if (!(den > 0)) return abstain(n, "degenerate distance variance");
  return { value: Math.min(1, Math.sqrt(Math.max(0, dcov) / den)), n, abstained: false };
}
function medianPairwise(x) {
  const n = x.length;
  const d = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) d.push(Math.abs(x[i] - x[j]));
  if (d.length === 0) return 1;
  d.sort((p, q) => p - q);
  const mid = d.length >> 1;
  const med = d.length % 2 ? d[mid] : 0.5 * (d[mid - 1] + d[mid]);
  return med > 0 ? med : 1;
}
function rbfGram(x, sigma) {
  const n = x.length;
  const k = new Float64Array(n * n);
  const inv = 1 / (2 * sigma * sigma);
  for (let i = 0; i < n; i++) {
    k[i * n + i] = 1;
    for (let j = i + 1; j < n; j++) {
      const dd = x[i] - x[j];
      const v = dexp(-dd * dd * inv);
      k[i * n + j] = v;
      k[j * n + i] = v;
    }
  }
  return k;
}
function hsic(x, y) {
  const nRaw = pairLength(x, y);
  if (nRaw < STAT_FLOOR) return abstain(nRaw, `n=${nRaw} < F9 floor ${STAT_FLOOR}`);
  const a = decimate(Float64Array.from(x).slice(0, nRaw), QUADRATIC_CAP);
  const b = decimate(Float64Array.from(y).slice(0, nRaw), QUADRATIC_CAP);
  const n = a.length;
  const K = doubleCenter(rbfGram(a, medianPairwise(a)), n);
  const L = doubleCenter(rbfGram(b, medianPairwise(b)), n);
  let kl = 0;
  let kk = 0;
  let ll = 0;
  for (let i = 0; i < n * n; i++) {
    kl += K[i] * L[i];
    kk += K[i] * K[i];
    ll += L[i] * L[i];
  }
  const den = Math.sqrt(Math.max(0, kk) * Math.max(0, ll));
  if (!(den > 0)) return abstain(n, "degenerate kernel matrices");
  return { value: Math.max(0, Math.min(1, kl / den)), n, abstained: false };
}
function invNormalCdf(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  const q = p;
  if (q <= 0) return -Infinity;
  if (q >= 1) return Infinity;
  if (q < pl) {
    const t2 = Math.sqrt(-2 * dlog(q));
    return (((((c[0] * t2 + c[1]) * t2 + c[2]) * t2 + c[3]) * t2 + c[4]) * t2 + c[5]) / ((((d[0] * t2 + d[1]) * t2 + d[2]) * t2 + d[3]) * t2 + 1);
  }
  if (q > 1 - pl) {
    const t2 = Math.sqrt(-2 * dlog(1 - q));
    return -(((((c[0] * t2 + c[1]) * t2 + c[2]) * t2 + c[3]) * t2 + c[4]) * t2 + c[5]) / ((((d[0] * t2 + d[1]) * t2 + d[2]) * t2 + d[3]) * t2 + 1);
  }
  const t = q - 0.5;
  const r = t * t;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * t / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
function normalScores(x) {
  const r = rank(x);
  const n = r.length;
  const z = new Float64Array(n);
  for (let i = 0; i < n; i++) z[i] = invNormalCdf(r[i] / (n + 1));
  return z;
}
function gaussianMI(x, y) {
  const n = pairLength(x, y);
  if (n < STAT_FLOOR) return abstain(n, `n=${n} < F9 floor ${STAT_FLOOR}`);
  const r = pearson(normalScores(Float64Array.from(x).slice(0, n)), normalScores(Float64Array.from(y).slice(0, n)));
  if (r.value === null) return abstain(n, r.reason ?? "copula transform degenerate");
  const rho = Math.max(-0.999999999, Math.min(0.999999999, r.value));
  return { value: Math.max(0, -0.5 * dlog(1 - rho * rho)), n, abstained: false };
}
function permutationTest(stat, x, y, opts = {}) {
  const B = opts.permutations ?? 199;
  const base = stat(x, y);
  if (base.value === null) return { ...base, p: null, permutations: 0 };
  const n = pairLength(x, y);
  const ys = Float64Array.from(y).slice(0, n);
  const rng = new SeedStream(opts.seed ?? "omega-real/p2/permutation");
  const buf = new Float64Array(n);
  let ge = 0;
  for (let b = 0; b < B; b++) {
    buf.set(ys);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const t = buf[i];
      buf[i] = buf[j];
      buf[j] = t;
    }
    const s = stat(x, buf);
    if (s.value !== null && Math.abs(s.value) >= Math.abs(base.value) - 1e-15) ge++;
  }
  return { ...base, p: (1 + ge) / (B + 1), permutations: B };
}
function correlationReport(x, y) {
  const n = pairLength(x, y);
  const r = {
    n,
    pearson: pearson(x, y),
    spearman: spearman(x, y),
    kendall: kendallTauB(x, y),
    dcor: distanceCorrelation(x, y),
    hsic: hsic(x, y),
    mi: gaussianMI(x, y)
  };
  return { ...r, abstained: r.pearson.abstained };
}

// ../omega/packages/trnn-core/src/substrate/causal.ts
var LANCZOS_G = 7;
var LANCZOS_P = [
  0.9999999999998099,
  676.5203681218851,
  -1259.1392167224028,
  771.3234287776531,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  9984369578019572e-21,
  15056327351493116e-23
];
function lgamma(x) {
  if (x < 0.5) {
    return dlog(Math.PI / Math.abs(dsin(Math.PI * x))) - lgamma(1 - x);
  }
  const z = x - 1;
  let a = LANCZOS_P[0];
  for (let i = 1; i < LANCZOS_P.length; i++) a += LANCZOS_P[i] / (z + i);
  const t = z + LANCZOS_G + 0.5;
  return 0.5 * dlog(2 * Math.PI) + (z + 0.5) * dlog(t) - t + dlog(a);
}
function betacf(a, b, x) {
  const TINY = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-16) break;
  }
  return h;
}
function regIncBeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = dexp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * dlog(x) + b * dlog(1 - x));
  return x < (a + 1) / (a + b + 2) ? front * betacf(a, b, x) / a : 1 - front * betacf(b, a, 1 - x) / b;
}
function fSurvival(f, d1, d2) {
  if (!(f > 0)) return 1;
  const x = d2 / (d2 + d1 * f);
  return regIncBeta(d2 / 2, d1 / 2, x);
}
var TWO_OVER_SQRT_PI = 1.1283791670955126;
function erfc(x) {
  const a = Math.abs(x);
  let e;
  if (a < 1) {
    let term = a;
    let sum = a;
    for (let n = 1; n < 60; n++) {
      term *= -a * a / n;
      const add2 = term / (2 * n + 1);
      sum += add2;
      if (Math.abs(add2) < 1e-18 * Math.abs(sum)) break;
    }
    e = 1 - TWO_OVER_SQRT_PI * sum;
  } else {
    const TINY = 1e-300;
    let f = TINY;
    let C = f;
    let D = 0;
    for (let j = 1; j < 400; j++) {
      const aj = j === 1 ? 1 : (j - 1) / 2;
      D = a + aj * D;
      if (Math.abs(D) < TINY) D = TINY;
      C = a + aj / C;
      if (Math.abs(C) < TINY) C = TINY;
      D = 1 / D;
      const delta = C * D;
      f *= delta;
      if (Math.abs(delta - 1) < 1e-17) break;
    }
    e = dexp(-a * a) / Math.sqrt(Math.PI) * f;
  }
  return x >= 0 ? e : 2 - e;
}
function normalCdf(z) {
  return 0.5 * erfc(-z / Math.SQRT2);
}
function olsFit(X, y, n, k, ridge = 1e-10) {
  const A = new Float64Array(k * k);
  const b = new Float64Array(k);
  for (let i = 0; i < n; i++) {
    const row = i * k;
    for (let p = 0; p < k; p++) {
      const xp = X[row + p];
      b[p] += xp * y[i];
      for (let q = p; q < k; q++) A[p * k + q] += xp * X[row + q];
    }
  }
  for (let p = 0; p < k; p++) for (let q = 0; q < p; q++) A[p * k + q] = A[q * k + p];
  let trace = 0;
  for (let p = 0; p < k; p++) trace += A[p * k + p];
  const lam = ridge * (trace / Math.max(1, k) + 1e-300);
  let singular = false;
  let L = cholesky(A, k);
  if (!L) {
    singular = true;
    const R = Float64Array.from(A);
    for (let p = 0; p < k; p++) R[p * k + p] += lam;
    L = cholesky(R, k);
    if (!L) {
      return { beta: new Float64Array(k), rss: Number.NaN, n, k, singular: true };
    }
  }
  const beta = choleskySolve(L, b, k);
  let rss = 0;
  for (let i = 0; i < n; i++) {
    let f = 0;
    const row = i * k;
    for (let p = 0; p < k; p++) f += X[row + p] * beta[p];
    const r = y[i] - f;
    rss += r * r;
  }
  return { beta, rss, n, k, singular };
}
function cholesky(A, k) {
  const L = new Float64Array(k * k);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i * k + j];
      for (let m = 0; m < j; m++) s -= L[i * k + m] * L[j * k + m];
      if (i === j) {
        if (!(s > 1e-300)) return null;
        L[i * k + j] = Math.sqrt(s);
      } else {
        L[i * k + j] = s / L[j * k + j];
      }
    }
  }
  return L;
}
function choleskySolve(L, b, k) {
  const z = new Float64Array(k);
  for (let i = 0; i < k; i++) {
    let s = b[i];
    for (let m = 0; m < i; m++) s -= L[i * k + m] * z[m];
    z[i] = s / L[i * k + i];
  }
  const x = new Float64Array(k);
  for (let i = k - 1; i >= 0; i--) {
    let s = z[i];
    for (let m = i + 1; m < k; m++) s -= L[m * k + i] * x[m];
    x[i] = s / L[i * k + i];
  }
  return x;
}
var causalAbstain = (n, lag, reason) => ({
  value: null,
  p: null,
  n,
  lag,
  abstained: true,
  reason
});
function embed(y, x, lag) {
  const N = x ? Math.min(y.length, x.length) : y.length;
  const n = N - lag;
  const k = 1 + lag + (x ? lag : 0);
  const X = new Float64Array(n * k);
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const row = i * k;
    const now2 = i + lag;
    X[row] = 1;
    for (let l = 1; l <= lag; l++) X[row + l] = y[now2 - l];
    if (x) for (let l = 1; l <= lag; l++) X[row + lag + l] = x[now2 - l];
    t[i] = y[now2];
  }
  return { X, y: t, n, k };
}
function grangerCausality(x, y, lag = 1) {
  const L = Math.max(1, Math.floor(lag));
  const N = Math.min(x.length, y.length);
  const n = N - L;
  if (n < STAT_FLOOR) return causalAbstain(Math.max(0, n), L, `n=${n} < F9 floor ${STAT_FLOOR}`);
  const full = embed(y, x, L);
  if (full.n - full.k < 1) return causalAbstain(n, L, "no residual degrees of freedom");
  const restricted = embed(y, null, L);
  const fr = olsFit(restricted.X, restricted.y, restricted.n, restricted.k);
  const ff = olsFit(full.X, full.y, full.n, full.k);
  if (!Number.isFinite(fr.rss) || !Number.isFinite(ff.rss)) {
    return causalAbstain(n, L, "design matrix not solvable");
  }
  if (!(ff.rss > 0) || !(fr.rss > 0)) {
    return causalAbstain(n, L, "degenerate (zero-residual) fit");
  }
  const df1 = L;
  const df2 = full.n - full.k;
  const F = (fr.rss - ff.rss) / df1 / (ff.rss / df2);
  const Fc = F > 0 ? F : 0;
  return { value: Fc, p: fSurvival(Fc, df1, df2), n, lag: L, abstained: false };
}
function transferEntropyGaussian(x, y, lag = 1) {
  const g2 = grangerCausality(x, y, lag);
  if (g2.value === null) return g2;
  const L = g2.lag;
  const full = embed(y, x, L);
  const restricted = embed(y, null, L);
  const fr = olsFit(restricted.X, restricted.y, restricted.n, restricted.k);
  const ff = olsFit(full.X, full.y, full.n, full.k);
  const ratio = fr.rss / ff.rss;
  const te = ratio > 1 ? 0.5 * dlog(ratio) : 0;
  return { value: te, p: g2.p, n: g2.n, lag: L, abstained: false };
}
function transferEntropyScan(x, y, opts = {}) {
  const maxLag = Math.max(1, Math.floor(opts.maxLag ?? 8));
  const alpha = opts.alpha ?? 0.05;
  const perLag = [];
  for (let L = 1; L <= maxLag; L++) perLag.push(transferEntropyGaussian(x, y, L));
  const threshold = alpha / maxLag;
  let best = null;
  for (const r of perLag) {
    if (r.value === null || r.p === null || r.p > threshold) continue;
    if (best === null || r.p < best.p || r.p === best.p && (r.value > best.value || r.lag < best.lag)) {
      best = r;
    }
  }
  if (!best) {
    const anyMeasured = perLag.some((r) => r.value !== null);
    return {
      bestLag: null,
      best: null,
      perLag,
      abstained: true,
      reason: anyMeasured ? `no lag significant at Bonferroni \u03B1/${maxLag}=${threshold}` : perLag[0]?.reason ?? "all lags abstained"
    };
  }
  return { bestLag: best.lag, best, perLag, abstained: false };
}
var RegressionForest = class {
  trees = [];
  p;
  constructor(X, y, n, p, opts = {}) {
    this.p = p;
    const nTrees = Math.max(1, Math.floor(opts.trees ?? 24));
    const minLeaf = Math.max(1, Math.floor(opts.minLeaf ?? 5));
    const maxDepth = Math.max(1, Math.floor(opts.maxDepth ?? 8));
    const mtry = Math.max(1, Math.floor(opts.featuresPerSplit ?? Math.ceil(Math.sqrt(p))));
    const rng = new SeedStream(opts.seed ?? "omega-real/p3/forest");
    for (let t = 0; t < nTrees; t++) {
      const idx = new Int32Array(n);
      for (let i = 0; i < n; i++) idx[i] = Math.floor(rng.next() * n) % n;
      const nodes = [];
      this.grow(X, y, p, idx, 0, n, nodes, 0, maxDepth, minLeaf, mtry, rng);
      this.trees.push(nodes);
    }
  }
  grow(X, y, p, idx, lo, hi, nodes, depth, maxDepth, minLeaf, mtry, rng) {
    const self = nodes.length;
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += y[idx[i]];
    const count = hi - lo;
    const mean3 = sum / count;
    nodes.push({ feature: -1, threshold: 0, left: -1, right: -1, value: mean3 });
    if (depth >= maxDepth || count < 2 * minLeaf) return self;
    let bestGain = 0;
    let bestFeat = -1;
    let bestThr = 0;
    const feats = new Int32Array(p);
    for (let i = 0; i < p; i++) feats[i] = i;
    for (let i = 0; i < Math.min(mtry, p); i++) {
      const j = i + Math.floor(rng.next() * (p - i));
      const t = feats[i];
      feats[i] = feats[j];
      feats[j] = t;
    }
    const order = Array.from({ length: count }, (_, i) => idx[lo + i]);
    for (let f = 0; f < Math.min(mtry, p); f++) {
      const feat = feats[f];
      order.sort((a, b) => X[a * p + feat] - X[b * p + feat] || a - b);
      let sl = 0;
      let sr = sum;
      for (let i = 0; i < count - 1; i++) {
        const v = y[order[i]];
        sl += v;
        sr -= v;
        const nl = i + 1;
        const nr = count - nl;
        if (nl < minLeaf || nr < minLeaf) continue;
        const a = X[order[i] * p + feat];
        const b = X[order[i + 1] * p + feat];
        if (!(b > a)) continue;
        const gain = sl * sl / nl + sr * sr / nr - sum * sum / count;
        if (gain > bestGain) {
          bestGain = gain;
          bestFeat = feat;
          bestThr = 0.5 * (a + b);
        }
      }
    }
    if (bestFeat < 0) return self;
    let w = lo;
    const buf = [];
    for (let i = lo; i < hi; i++) {
      const id = idx[i];
      if (X[id * p + bestFeat] <= bestThr) idx[w++] = id;
      else buf.push(id);
    }
    const mid = w;
    for (const id of buf) idx[w++] = id;
    if (mid === lo || mid === hi) return self;
    nodes[self].feature = bestFeat;
    nodes[self].threshold = bestThr;
    nodes[self].left = this.grow(X, y, p, idx, lo, mid, nodes, depth + 1, maxDepth, minLeaf, mtry, rng);
    nodes[self].right = this.grow(X, y, p, idx, mid, hi, nodes, depth + 1, maxDepth, minLeaf, mtry, rng);
    return self;
  }
  predictRow(row, offset = 0) {
    let acc = 0;
    for (const nodes of this.trees) {
      let i = 0;
      while (nodes[i].feature >= 0) {
        i = row[offset + nodes[i].feature] <= nodes[i].threshold ? nodes[i].left : nodes[i].right;
      }
      acc += nodes[i].value;
    }
    return acc / this.trees.length;
  }
  predict(X, n) {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = this.predictRow(X, i * this.p);
    return out;
  }
};
var NuisanceLearner = class {
  beta;
  forest;
  p;
  k;
  constructor(X, y, n, p, opts = {}) {
    this.p = p;
    this.k = 1 + 2 * p;
    const Z = new Float64Array(n * this.k);
    for (let i = 0; i < n; i++) this.expand(X, i * p, Z, i * this.k);
    const fit = olsFit(Z, y, n, this.k, 1e-8);
    this.beta = fit.beta;
    const resid = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let f = 0;
      for (let j = 0; j < this.k; j++) f += Z[i * this.k + j] * this.beta[j];
      resid[i] = y[i] - f;
    }
    this.forest = new RegressionForest(X, resid, n, p, {
      trees: opts.trees ?? 48,
      minLeaf: opts.minLeaf ?? 3,
      maxDepth: opts.maxDepth ?? 12,
      featuresPerSplit: opts.featuresPerSplit ?? p,
      seed: opts.seed ?? "omega-real/p3/nuisance"
    });
  }
  expand(X, src, out, dst) {
    out[dst] = 1;
    for (let j = 0; j < this.p; j++) {
      const v = X[src + j];
      out[dst + 1 + j] = v;
      out[dst + 1 + this.p + j] = v * v;
    }
  }
  predictRow(X, offset) {
    const z = new Float64Array(this.k);
    this.expand(X, offset, z, 0);
    let f = 0;
    for (let j = 0; j < this.k; j++) f += z[j] * this.beta[j];
    return f + this.forest.predictRow(X, offset);
  }
};
var dmlAbstain = (n, folds, reason) => ({
  theta: null,
  se: null,
  ci: null,
  p: null,
  n,
  folds,
  abstained: true,
  reason
});
function dmlPartialLinear(y, d, X, p, opts = {}) {
  const n = Math.min(y.length, d.length, p > 0 ? Math.floor(X.length / p) : Number.MAX_SAFE_INTEGER);
  const K = Math.max(2, Math.floor(opts.folds ?? 5));
  if (n < STAT_FLOOR) return dmlAbstain(Math.max(0, n), K, `n=${n} < F9 floor ${STAT_FLOOR}`);
  if (n < 2 * K) return dmlAbstain(n, K, `n=${n} too small for ${K} folds`);
  const resY = new Float64Array(n);
  const resD = new Float64Array(n);
  const seed = opts.seed ?? "omega-real/p3/dml";
  for (let k = 0; k < K; k++) {
    const testIdx = [];
    const trainIdx = [];
    for (let i = 0; i < n; i++) (i % K === k ? testIdx : trainIdx).push(i);
    const nt = trainIdx.length;
    const Xtr = new Float64Array(nt * p);
    const ytr = new Float64Array(nt);
    const dtr = new Float64Array(nt);
    for (let i = 0; i < nt; i++) {
      const src = trainIdx[i] * p;
      for (let j = 0; j < p; j++) Xtr[i * p + j] = X[src + j];
      ytr[i] = y[trainIdx[i]];
      dtr[i] = d[trainIdx[i]];
    }
    const gHat = new NuisanceLearner(Xtr, ytr, nt, p, { ...opts, seed: `${seed}/g/${k}` });
    const mHat = new NuisanceLearner(Xtr, dtr, nt, p, { ...opts, seed: `${seed}/m/${k}` });
    for (const i of testIdx) {
      resY[i] = y[i] - gHat.predictRow(X, i * p);
      resD[i] = d[i] - mHat.predictRow(X, i * p);
    }
  }
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += resD[i] * resY[i];
    den += resD[i] * resD[i];
  }
  if (!(den > 0)) return dmlAbstain(n, K, "treatment fully explained by controls (no residual variation)");
  const theta = num / den;
  let psi2 = 0;
  for (let i = 0; i < n; i++) {
    const psi = resD[i] * (resY[i] - theta * resD[i]);
    psi2 += psi * psi;
  }
  const j0 = den / n;
  const se = Math.sqrt(psi2 / n) / (j0 * Math.sqrt(n));
  if (!(se > 0) || !Number.isFinite(se)) return dmlAbstain(n, K, "degenerate variance estimate");
  const z = theta / se;
  const pv = 2 * (1 - normalCdf(Math.abs(z)));
  return {
    theta,
    se,
    ci: [theta - 1.959963984540054 * se, theta + 1.959963984540054 * se],
    p: Math.max(0, Math.min(1, pv)),
    n,
    folds: K,
    abstained: false
  };
}
function directedReport(x, y, opts = {}) {
  const forward = transferEntropyScan(x, y, opts);
  const reverse2 = transferEntropyScan(y, x, opts);
  const f = forward.best?.value ?? null;
  const r = reverse2.best?.value ?? null;
  let netDirection = null;
  if (f !== null && r !== null && f + r > 0) netDirection = (f - r) / (f + r);
  const verdict = f !== null && r !== null ? "bidirectional" : f !== null ? "x\u2192y" : r !== null ? "y\u2192x" : "none";
  if (netDirection === null && f !== null && r === null) netDirection = 1;
  if (netDirection === null && r !== null && f === null) netDirection = -1;
  return { forward, reverse: reverse2, netDirection, verdict };
}

// ../omega/packages/trnn-core/src/substrate/resonanceBus.ts
var KAPPA_PHASE = PHI_INV;
var BLANK = {
  value: NaN,
  channels: [],
  counted: 0,
  abstained: 0,
  gamma: NaN,
  vetoId: null,
  vetoValue: NaN,
  dead: false,
  gated: false,
  subFloor: false
};
function clamp012(x) {
  if (!Number.isFinite(x)) return NaN;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function phaseClosureGamma(phaseDev, kappa = KAPPA_PHASE) {
  if (Number.isNaN(phaseDev) || !Number.isFinite(kappa) || kappa <= 0) return NaN;
  if (!Number.isFinite(phaseDev)) return 0;
  const z = Math.abs(phaseDev) / kappa;
  if (z >= 40) return 0;
  return dexp(-(z * z));
}
function circularPhaseDev(phases) {
  const n = phases.length;
  if (n < 2) return NaN;
  let sx = 0, sy = 0, m = 0;
  for (let i = 0; i < n; i++) {
    const p = phases[i];
    if (!Number.isFinite(p)) continue;
    sx += dcos(p);
    sy += dsin(p);
    m++;
  }
  if (m < 2) return NaN;
  const r = Math.sqrt(sx * sx + sy * sy) / m;
  if (r <= 1e-12) return Number.POSITIVE_INFINITY;
  if (r >= 1) return 0;
  return Math.sqrt(-2 * dlog(r));
}
function fuseResonance(channels, opts = {}) {
  const gate = opts.coherenceGate ?? COHERENCE_GATE;
  const c = opts.coherence;
  const gated = Number.isFinite(c) && c < gate;
  const gamma = phaseClosureGamma(opts.phaseDev ?? NaN, opts.kappa ?? KAPPA_PHASE);
  const all = channels.map((ch) => ({ id: ch.id, value: clamp012(ch.value) }));
  if (Number.isFinite(gamma)) all.push({ id: "gamma", value: gamma });
  let logSum = 0;
  let counted = 0;
  let abstained = 0;
  let vetoId = null;
  let vetoValue = Number.POSITIVE_INFINITY;
  let dead = false;
  for (const ch of all) {
    if (!Number.isFinite(ch.value)) {
      abstained++;
      continue;
    }
    counted++;
    if (ch.value < vetoValue) {
      vetoValue = ch.value;
      vetoId = ch.id;
    }
    if (ch.value <= 0) {
      dead = true;
      continue;
    }
    logSum += dlog(ch.value);
  }
  if (gated) {
    return { ...BLANK, channels: all, counted: 0, abstained: all.length, gamma, gated: true };
  }
  if (counted === 0) return { ...BLANK, channels: all, abstained, gamma };
  const value = dead ? 0 : dexp(logSum / counted);
  return {
    value,
    channels: all,
    counted,
    abstained,
    gamma,
    vetoId,
    vetoValue: Number.isFinite(vetoValue) ? vetoValue : NaN,
    dead,
    gated: false,
    subFloor: value < RESONANCE_FLOOR
  };
}
function blendWithResonance(prior, resonance) {
  if (!Number.isFinite(prior)) return NaN;
  if (!Number.isFinite(resonance)) return prior;
  const w = PHI_INV / (1 + PHI_INV);
  const p = Math.max(prior, 0);
  if (p <= 0) return 0;
  const r = Math.max(resonance, 1e-9);
  return dexp((1 - w) * dlog(p) + w * dlog(r));
}

// ../omega/packages/trnn-core/src/substrate/vsa.ts
var TWO_PI5 = 6.283185307179586;
var PI = 3.141592653589793;
var CLEANUP_FAN_IN = 100;
var CLEANUP_Z_FLOOR = 5;
function wrapPhase(p) {
  if (!Number.isFinite(p)) return NaN;
  let x = p;
  if (x >= PI || x < -PI) {
    const k = Math.floor((x + PI) / TWO_PI5);
    x -= k * TWO_PI5;
    if (x >= PI) x -= TWO_PI5;
    if (x < -PI) x += TWO_PI5;
  }
  return x;
}
function randomHv(dim, seed) {
  const rng = new SeedStream(seed);
  const v = new Float64Array(dim);
  for (let i = 0; i < dim; i++) v[i] = wrapPhase(rng.signed() * PI);
  return v;
}
function identityHv(dim) {
  return new Float64Array(dim);
}
function conjugateHv(a) {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = wrapPhase(-a[i]);
  return out;
}
function bind(a, b) {
  const n = Math.min(a.length, b.length);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = wrapPhase(a[i] + b[i]);
  return out;
}
function unbind(c, a) {
  const n = Math.min(a.length, c.length);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = wrapPhase(c[i] - a[i]);
  return out;
}
function permute(a, k = 1) {
  const n = a.length;
  const out = new Float64Array(n);
  if (n === 0) return out;
  const s = (k % n + n) % n;
  for (let i = 0; i < n; i++) out[(i + s) % n] = a[i];
  return out;
}
function bundle(vs, weights) {
  const m = vs.length;
  if (m === 0) return { hv: new Float64Array(0), agreement: new Float64Array(0), meanAgreement: NaN };
  const dim = vs[0].length;
  const re = new Float64Array(dim);
  const im = new Float64Array(dim);
  let wsum = 0;
  for (let j = 0; j < m; j++) {
    const w = weights ? weights[j] : 1;
    if (!Number.isFinite(w) || w <= 0) continue;
    wsum += w;
    const v = vs[j];
    for (let i = 0; i < dim; i++) {
      const p = v[i];
      if (!Number.isFinite(p)) continue;
      re[i] += w * dcos(p);
      im[i] += w * dsin(p);
    }
  }
  const hv = new Float64Array(dim);
  const agreement = new Float64Array(dim);
  let agSum = 0;
  for (let i = 0; i < dim; i++) {
    const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    hv[i] = mag <= 1e-300 ? 0 : wrapPhase(datan2(im[i], re[i]));
    const a = wsum > 0 ? Math.min(1, mag / wsum) : NaN;
    agreement[i] = a;
    agSum += Number.isFinite(a) ? a : 0;
  }
  return { hv, agreement, meanAgreement: dim > 0 ? agSum / dim : NaN };
}
function phiWeights(m) {
  const w = [];
  let x = 1;
  for (let i = 0; i < m; i++) {
    w.push(x);
    x *= PHI_INV;
  }
  return w;
}
function similarity(a, b) {
  const n = Math.min(a.length, b.length);
  if (n === 0) return NaN;
  let s = 0, m = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    if (!Number.isFinite(d)) continue;
    s += dcos(d);
    m++;
  }
  return m === 0 ? NaN : s / m;
}
function chanceSigma(dim) {
  return dim > 0 ? 1 / Math.sqrt(2 * dim) : NaN;
}
function angularDistance(a, b) {
  const s = similarity(a, b);
  return Number.isFinite(s) ? dacos(Math.max(-1, Math.min(1, s))) : NaN;
}
var CleanupMemory = class {
  constructor(dim, fanInCap = CLEANUP_FAN_IN, zFloor = CLEANUP_Z_FLOOR) {
    this.dim = dim;
    this.fanInCap = fanInCap;
    this.zFloor = zFloor;
  }
  re = /* @__PURE__ */ new Map();
  im = /* @__PURE__ */ new Map();
  n = /* @__PURE__ */ new Map();
  get size() {
    return this.n.size;
  }
  labels() {
    return [...this.n.keys()].sort();
  }
  /**
   * Fold an exemplar into a prototype.
   *
   * At the fan-in ceiling the existing sum is scaled by φ⁻¹ before the new
   * exemplar lands: the prototype keeps tracking rather than freezing, and the
   * effective window stays bounded instead of the mean going to mush.
   */
  add(label, v, weight = 1) {
    if (!Number.isFinite(weight) || weight <= 0) return;
    let re = this.re.get(label);
    let im = this.im.get(label);
    if (!re || !im) {
      re = new Float64Array(this.dim);
      im = new Float64Array(this.dim);
      this.re.set(label, re);
      this.im.set(label, im);
      this.n.set(label, 0);
    }
    let count = this.n.get(label) ?? 0;
    if (count >= this.fanInCap) {
      for (let i = 0; i < this.dim; i++) {
        re[i] *= PHI_INV;
        im[i] *= PHI_INV;
      }
      count = this.fanInCap - 1;
    }
    const lim = Math.min(this.dim, v.length);
    for (let i = 0; i < lim; i++) {
      const p = v[i];
      if (!Number.isFinite(p)) continue;
      re[i] += weight * dcos(p);
      im[i] += weight * dsin(p);
    }
    this.n.set(label, count + 1);
  }
  /** Current prototype hypervector, or null when the label is unknown. */
  prototype(label) {
    const re = this.re.get(label);
    const im = this.im.get(label);
    if (!re || !im) return null;
    const out = new Float64Array(this.dim);
    for (let i = 0; i < this.dim; i++) {
      out[i] = re[i] * re[i] + im[i] * im[i] <= 1e-300 ? 0 : wrapPhase(datan2(im[i], re[i]));
    }
    return out;
  }
  stats(label) {
    const re = this.re.get(label);
    const im = this.im.get(label);
    const n = this.n.get(label);
    if (!re || !im || n === void 0) return null;
    let agree = 0;
    for (let i = 0; i < this.dim; i++) agree += Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    const mean3 = this.dim > 0 && n > 0 ? Math.min(1, agree / (this.dim * n)) : NaN;
    return { label, fanIn: n, meanAgreement: mean3, saturated: n >= this.fanInCap };
  }
  /**
   * Nearest prototype, or null when the evidence does not clear chance.
   *
   * Two independent gates, both required:
   *   z      = sim / (1/√(2D))  ≥ zFloor   — the match is not a coincidence
   *   margin = sim − runnerUp   ≥ zFloor·σ — the match is not a coin flip
   */
  query(v, zFloor = this.zFloor) {
    if (this.n.size === 0) return null;
    const sigma = chanceSigma(this.dim);
    let bestLabel = "";
    let best = Number.NEGATIVE_INFINITY;
    let second = Number.NEGATIVE_INFINITY;
    for (const label of this.labels()) {
      const proto = this.prototype(label);
      if (!proto) continue;
      const s = similarity(v, proto);
      if (!Number.isFinite(s)) continue;
      if (s > best) {
        second = best;
        best = s;
        bestLabel = label;
      } else if (s > second) {
        second = s;
      }
    }
    if (!Number.isFinite(best) || bestLabel === "") return null;
    const margin = Number.isFinite(second) ? best - second : Number.POSITIVE_INFINITY;
    const z = best / sigma;
    if (z < zFloor) return null;
    if (margin < zFloor * sigma) return null;
    return { label: bestLabel, similarity: best, margin, z, fanIn: this.n.get(bestLabel) ?? 0 };
  }
};
function encodeRecord(pairs) {
  return bundle(pairs.map(([r, f]) => bind(r, f)));
}
function decodeRole(record, role) {
  return unbind(record, role);
}
function encodeSequence(vs, weights) {
  return bundle(vs.map((v, i) => permute(v, i)), weights);
}
function decodePosition(seq, i) {
  return permute(seq, -i);
}

// ../omega/packages/trnn-core/src/substrate/plasticity.ts
function ojaStep(w, x, eta) {
  const n = Math.min(w.length, x.length);
  let y = 0;
  for (let i = 0; i < n; i++) y += w[i] * x[i];
  let drift = 0, sq = 0;
  for (let i = 0; i < n; i++) {
    const d = eta * y * (x[i] - y * w[i]);
    w[i] += d;
    drift += Math.abs(d);
    sq += w[i] * w[i];
  }
  return { y, norm: Math.sqrt(sq), drift };
}
function sangerStep(W, k, d, x, eta) {
  const y = new Float64Array(k);
  for (let a = 0; a < k; a++) {
    let s = 0;
    const off = a * d;
    for (let i = 0; i < d; i++) s += W[off + i] * x[i];
    y[a] = s;
  }
  for (let a = 0; a < k; a++) {
    const off = a * d;
    for (let i = 0; i < d; i++) {
      let back = 0;
      for (let b = 0; b <= a; b++) back += y[b] * W[b * d + i];
      W[off + i] += eta * y[a] * (x[i] - back);
    }
  }
  return y;
}
function joglekarWindow(w, wMin = 0, wMax = 1, p = 1) {
  if (!(wMax > wMin)) return NaN;
  const wh = (w - wMin) / (wMax - wMin);
  if (wh <= 0 || wh >= 1) return 0;
  const u = 2 * wh - 1;
  const f = 1 - dpow(u * u, p);
  return f < 0 ? 0 : f > 1 ? 1 : f;
}
function memristiveStep(w, s, params) {
  const wMin = params.wMin ?? 0;
  const wMax = params.wMax ?? 1;
  const p = params.p ?? 1;
  if (!Number.isFinite(w) || !Number.isFinite(s)) return w;
  const eta = s >= 0 ? params.etaSet : params.etaReset ?? params.etaSet * PHI_INV;
  const f = joglekarWindow(w, wMin, wMax, p);
  const next = w + eta * f * s;
  return next < wMin ? wMin : next > wMax ? wMax : next;
}
function memristiveVector(w, drive, params) {
  const n = Math.min(w.length, drive.length);
  let drift = 0;
  for (let i = 0; i < n; i++) {
    const before = w[i];
    w[i] = memristiveStep(before, drive[i], params);
    drift += Math.abs(w[i] - before);
  }
  return drift;
}
var BcmThreshold = class {
  constructor(tau, initial = 0) {
    this.tau = tau;
    this.theta = initial;
  }
  theta;
  get value() {
    return this.theta;
  }
  /** Update θ with a new post-synaptic activity and return the drive factor. */
  observe(y) {
    if (!Number.isFinite(y)) return 0;
    this.theta += (y * y - this.theta) / Math.max(1, this.tau);
    return y - this.theta;
  }
};

// ../omega/packages/trnn-core/src/substrate/dmd.ts
var MIN_SNAPSHOTS = 13;
function jacobiEigen(A, n, sweeps = 60) {
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;
  for (let s = 0; s < sweeps; s++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p * n + q] * A[p * n + q];
    if (off <= 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p * n + q];
        if (Math.abs(apq) < 1e-300) continue;
        const app = A[p * n + p], aqq = A[q * n + q];
        const theta = (aqq - app) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const sn = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k * n + p], akq = A[k * n + q];
          A[k * n + p] = c * akp - sn * akq;
          A[k * n + q] = sn * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p * n + k], aqk = A[q * n + k];
          A[p * n + k] = c * apk - sn * aqk;
          A[q * n + k] = sn * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k * n + p], vkq = V[k * n + q];
          V[k * n + p] = c * vkp - sn * vkq;
          V[k * n + q] = sn * vkp + c * vkq;
        }
      }
    }
  }
  const values = new Float64Array(n);
  for (let i = 0; i < n; i++) values[i] = A[i * n + i];
  return { values, vectors: V };
}
function hessenberg(A, n) {
  for (let m = 1; m < n - 1; m++) {
    let x = 0, i = m;
    for (let j = m; j < n; j++) {
      if (Math.abs(A[j * n + (m - 1)]) > Math.abs(x)) {
        x = A[j * n + (m - 1)];
        i = j;
      }
    }
    if (i !== m) {
      for (let j = m - 1; j < n; j++) {
        const t = A[i * n + j];
        A[i * n + j] = A[m * n + j];
        A[m * n + j] = t;
      }
      for (let j = 0; j < n; j++) {
        const t = A[j * n + i];
        A[j * n + i] = A[j * n + m];
        A[j * n + m] = t;
      }
    }
    if (x !== 0) {
      for (let k = m + 1; k < n; k++) {
        let y = A[k * n + (m - 1)];
        if (y === 0) continue;
        y /= x;
        A[k * n + (m - 1)] = y;
        for (let j = m; j < n; j++) A[k * n + j] -= y * A[m * n + j];
        for (let j = 0; j < n; j++) A[j * n + m] += y * A[j * n + k];
      }
    }
  }
  for (let i = 2; i < n; i++) for (let j = 0; j < i - 1; j++) A[i * n + j] = 0;
}
function generalEigenvalues(M, n, iters = 60) {
  const a = Float64Array.from(M);
  hessenberg(a, n);
  const wr = new Float64Array(n);
  const wi = new Float64Array(n);
  const A = (i, j) => a[i * n + j];
  const set = (i, j, v) => {
    a[i * n + j] = v;
  };
  let anorm = 0;
  for (let i = 0; i < n; i++) for (let j = Math.max(i - 1, 0); j < n; j++) anorm += Math.abs(A(i, j));
  let nn = n - 1;
  let t = 0;
  while (nn >= 0) {
    let its = 0;
    let l;
    do {
      for (l = nn; l >= 1; l--) {
        const s2 = Math.abs(A(l - 1, l - 1)) + Math.abs(A(l, l));
        const sc = s2 === 0 ? anorm : s2;
        if (Math.abs(A(l, l - 1)) + sc === sc) {
          set(l, l - 1, 0);
          break;
        }
      }
      let x = A(nn, nn);
      if (l === nn) {
        wr[nn] = x + t;
        wi[nn] = 0;
        nn--;
        break;
      }
      let y = A(nn - 1, nn - 1);
      let w = A(nn, nn - 1) * A(nn - 1, nn);
      if (l === nn - 1) {
        const p2 = 0.5 * (y - x);
        const q2 = p2 * p2 + w;
        let z2 = Math.sqrt(Math.abs(q2));
        x += t;
        if (q2 >= 0) {
          z2 = p2 + (p2 >= 0 ? Math.abs(z2) : -Math.abs(z2));
          wr[nn - 1] = wr[nn] = x + z2;
          if (z2 !== 0) wr[nn] = x - w / z2;
          wi[nn - 1] = wi[nn] = 0;
        } else {
          wr[nn - 1] = wr[nn] = x + p2;
          wi[nn - 1] = -(wi[nn] = z2);
        }
        nn -= 2;
        break;
      }
      if (its === iters) {
        wr[nn] = x + t;
        wi[nn] = 0;
        nn--;
        break;
      }
      let p = 0, q = 0, r = 0, z = 0, s = 0;
      if (its === 10 || its === 20) {
        t += x;
        for (let i = 0; i <= nn; i++) set(i, i, A(i, i) - x);
        s = Math.abs(A(nn, nn - 1)) + Math.abs(A(nn - 1, nn - 2));
        y = x = 0.75 * s;
        w = -0.4375 * s * s;
      }
      its++;
      let m;
      for (m = nn - 2; m >= l; m--) {
        z = A(m, m);
        r = x - z;
        s = y - z;
        p = (r * s - w) / A(m + 1, m) + A(m, m + 1);
        q = A(m + 1, m + 1) - z - r - s;
        r = A(m + 2, m + 1);
        s = Math.abs(p) + Math.abs(q) + Math.abs(r);
        p /= s;
        q /= s;
        r /= s;
        if (m === l) break;
        const u = Math.abs(A(m, m - 1)) * (Math.abs(q) + Math.abs(r));
        const v = Math.abs(p) * (Math.abs(A(m - 1, m - 1)) + Math.abs(z) + Math.abs(A(m + 1, m + 1)));
        if (u + v === v) break;
      }
      for (let i = m + 2; i <= nn; i++) {
        set(i, i - 2, 0);
        if (i !== m + 2) set(i, i - 3, 0);
      }
      for (let k = m; k <= nn - 1; k++) {
        if (k !== m) {
          p = A(k, k - 1);
          q = A(k + 1, k - 1);
          r = k !== nn - 1 ? A(k + 2, k - 1) : 0;
          x = Math.abs(p) + Math.abs(q) + Math.abs(r);
          if (x !== 0) {
            p /= x;
            q /= x;
            r /= x;
          }
        }
        const sg = Math.sqrt(p * p + q * q + r * r);
        s = p >= 0 ? Math.abs(sg) : -Math.abs(sg);
        if (s === 0) continue;
        if (k === m) {
          if (l !== m) set(k, k - 1, -A(k, k - 1));
        } else {
          set(k, k - 1, -s * x);
        }
        p += s;
        const px = p / s, py = q / s, pz = r / s;
        q /= p;
        r /= p;
        for (let j = k; j <= nn; j++) {
          let pp = A(k, j) + q * A(k + 1, j);
          if (k !== nn - 1) {
            pp += r * A(k + 2, j);
            set(k + 2, j, A(k + 2, j) - pp * pz);
          }
          set(k + 1, j, A(k + 1, j) - pp * py);
          set(k, j, A(k, j) - pp * px);
        }
        const mmin = nn < k + 3 ? nn : k + 3;
        for (let i = l; i <= mmin; i++) {
          let pp = px * A(i, k) + py * A(i, k + 1);
          if (k !== nn - 1) {
            pp += pz * A(i, k + 2);
            set(i, k + 2, A(i, k + 2) - pp * r);
          }
          set(i, k + 1, A(i, k + 1) - pp * q);
          set(i, k, A(i, k) - pp);
        }
      }
    } while (true);
  }
  return { re: wr, im: wi };
}
function fitDmd(snapshots, opts = {}) {
  const dt = opts.dt ?? 1;
  const rankTol = opts.rankTol ?? 1e-6;
  const cols = snapshots.length - 1;
  if (snapshots.length < MIN_SNAPSHOTS || cols < 2) return null;
  const D = snapshots[0].length;
  if (D === 0) return null;
  for (const s of snapshots) {
    if (s.length !== D) return null;
    for (let i = 0; i < D; i++) if (!Number.isFinite(s[i])) return null;
  }
  const G = new Float64Array(cols * cols);
  for (let a = 0; a < cols; a++) {
    for (let b = a; b < cols; b++) {
      let s = 0;
      const xa = snapshots[a], xb = snapshots[b];
      for (let i = 0; i < D; i++) s += xa[i] * xb[i];
      G[a * cols + b] = s;
      G[b * cols + a] = s;
    }
  }
  const { values, vectors } = jacobiEigen(Float64Array.from(G), cols);
  const order = [...values.keys()].sort((p, q) => values[q] - values[p]);
  const sv = order.map((i) => values[i] > 0 ? Math.sqrt(values[i]) : 0);
  const s0 = sv[0] ?? 0;
  if (s0 <= 0) return null;
  let r = 0;
  const maxRank = Math.min(opts.maxRank ?? cols, cols);
  while (r < maxRank && sv[r] > rankTol * s0) r++;
  if (r === 0) return null;
  const U = new Float64Array(D * r);
  for (let j = 0; j < r; j++) {
    const col = order[j];
    const inv = 1 / sv[j];
    for (let k = 0; k < cols; k++) {
      const vk = vectors[k * cols + col] * inv;
      if (vk === 0) continue;
      const xk = snapshots[k];
      for (let i = 0; i < D; i++) U[i * r + j] += vk * xk[i];
    }
  }
  const At = new Float64Array(r * r);
  for (let a = 0; a < r; a++) {
    for (let b = 0; b < r; b++) {
      const colB = order[b];
      const invB = 1 / sv[b];
      let acc = 0;
      for (let k = 0; k < cols; k++) {
        const vk = vectors[k * cols + colB] * invB;
        if (vk === 0) continue;
        const yk = snapshots[k + 1];
        let dot2 = 0;
        for (let i = 0; i < D; i++) dot2 += U[i * r + a] * yk[i];
        acc += dot2 * vk;
      }
      At[a * r + b] = acc;
    }
  }
  const { re, im } = generalEigenvalues(At, r);
  const energyTotal = sv.slice(0, r).reduce((s, v) => s + v * v, 0);
  const modes = [];
  let radius = 0;
  for (let j = 0; j < r; j++) {
    const mag = Math.sqrt(re[j] * re[j] + im[j] * im[j]);
    radius = Math.max(radius, mag);
    modes.push({
      lambdaRe: re[j],
      lambdaIm: im[j],
      magnitude: mag,
      growth: mag > 0 ? dlog(mag) / dt : Number.NEGATIVE_INFINITY,
      frequency: datan2(im[j], re[j]) / (2 * Math.PI * dt),
      energy: energyTotal > 0 ? sv[j] * sv[j] / energyTotal : NaN
    });
  }
  let num = 0, den = 0;
  const predictFrom = (x) => {
    const z = new Float64Array(r);
    for (let a = 0; a < r; a++) {
      let s = 0;
      for (let i = 0; i < D; i++) s += U[i * r + a] * x[i];
      z[a] = s;
    }
    const w = new Float64Array(r);
    for (let a = 0; a < r; a++) {
      let s = 0;
      for (let b = 0; b < r; b++) s += At[a * r + b] * z[b];
      w[a] = s;
    }
    const out = new Float64Array(D);
    for (let i = 0; i < D; i++) {
      let s = 0;
      for (let a = 0; a < r; a++) s += U[i * r + a] * w[a];
      out[i] = s;
    }
    return out;
  };
  for (let k = 0; k < cols; k++) {
    const pred = predictFrom(snapshots[k]);
    const y = snapshots[k + 1];
    for (let i = 0; i < D; i++) {
      const e = y[i] - pred[i];
      num += e * e;
      den += y[i] * y[i];
    }
  }
  return {
    rank: r,
    modes,
    singularValues: sv.slice(0, r),
    relError: den > 0 ? Math.sqrt(num / den) : NaN,
    spectralRadius: radius,
    predict: predictFrom
  };
}

// ../omega/packages/trnn-core/src/ledger/canonical.ts
function canonicalJson(value) {
  return enc(value);
}
function enc(v) {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "boolean") return v ? "true" : "false";
  if (t === "number") {
    if (!Number.isFinite(v)) {
      throw new TypeError("canonicalJson: non-finite number is not representable");
    }
    return Object.is(v, -0) ? "0" : JSON.stringify(v);
  }
  if (t === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map((x) => enc(x === void 0 ? null : x)).join(",") + "]";
  if (v instanceof Uint8Array) return JSON.stringify(bytesToBase64(v));
  if (t === "object") {
    const o = v;
    const keys = Object.keys(o).filter((k) => o[k] !== void 0).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + enc(o[k])).join(",") + "}";
  }
  throw new TypeError(`canonicalJson: unsupported type ${t}`);
}
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function bytesToBase64(b) {
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const c0 = b[i], c1 = b[i + 1], c2 = b[i + 2];
    out += B64[c0 >> 2];
    out += B64[(c0 & 3) << 4 | (c1 ?? 0) >> 4];
    out += i + 1 < b.length ? B64[(c1 & 15) << 2 | (c2 ?? 0) >> 6] : "=";
    out += i + 2 < b.length ? B64[c2 & 63] : "=";
  }
  return out;
}
function base64ToBytes(s) {
  const clean3 = s.replace(/=+$/, "");
  const out = new Uint8Array(clean3.length * 3 >> 2);
  let acc = 0, bits = 0, o = 0;
  for (let i = 0; i < clean3.length; i++) {
    const v = B64.indexOf(clean3[i]);
    if (v < 0) throw new TypeError("base64ToBytes: invalid character");
    acc = acc << 6 | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = acc >> bits & 255;
    }
  }
  return out;
}
var TE = new TextEncoder();
var TD = new TextDecoder();
function utf8(s) {
  return TE.encode(s);
}
function fromUtf8(b) {
  return TD.decode(b);
}

// ../omega/node_modules/@noble/hashes/_u64.js
var U32_MASK64 = /* @__PURE__ */ (() => BigInt(2 ** 32 - 1))();
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var fromNumH = (n) => n / 2 ** 32 | 0;
var fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE2) {
  const h = fromNumH(n);
  const l = fromNumL(n);
  view.setUint32(byteOffset, isLE2 ? l : h, isLE2);
  view.setUint32(byteOffset + 4, isLE2 ? h : l, isLE2);
}
var shrSH = (h, _l, s) => h >>> s;
var shrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

// ../omega/node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
var atitle = (title) => title ? `"${title}" ` : "";
function anumber(n, title = "") {
  if (typeof n !== "number")
    throw new TypeError(atitle(title) + "expected number, got " + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
  return n;
}
function abytes(value, length, title = "") {
  if (isBytes(value) && (length === void 0 || value.length === length))
    return value;
  if (length !== void 0)
    anumber(length, "length");
  const bytes = isBytes(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes)
    throw new TypeError(message);
  throw new RangeError(message);
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new TypeError("expected hash wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
  if (h.outputLen < 1 || h.blockLen < 1)
    throw new Error("hash blockLen / outputLen must be >= 1");
}
var aobject = (value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("hash was destroyed");
  if (checkFinished && instance.finished)
    throw new Error("digest() was already called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "output");
  const min = instance.outputLen;
  if (!(out.length >= min)) {
    throw new RangeError('"output" expected length >= ' + min);
  }
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
var hasHexBuiltin = /* @__PURE__ */ (() => (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
))();
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex(bytes) {
  abytes(bytes);
  if (hasHexBuiltin)
    return bytes.toHex();
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
function asciiToBase16(ch) {
  return ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - (65 - 10) : ch >= 97 && ch <= 102 ? ch - (97 - 10) : void 0;
}
function hexToBytes(hex) {
  if (typeof hex !== "string")
    throw new TypeError("hex string expected, got " + typeof hex);
  if (hasHexBuiltin) {
    try {
      return Uint8Array.fromHex(hex);
    } catch (error) {
      if (error instanceof SyntaxError)
        throw new RangeError(error.message);
      throw error;
    }
  }
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new RangeError("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new RangeError('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}
function checkOpts(defaults, opts, title = "opts") {
  aobject(defaults, "defaults");
  if (opts !== void 0)
    aobject(opts, title);
  const merged = Object.assign(defaults, opts);
  return merged;
}
function createHasher(hashCons, info = {}) {
  if (typeof hashCons !== "function")
    throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
  info = checkOpts({}, info, "info");
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
function randomBytes(bytesLength = 32) {
  anumber(bytesLength, "bytesLength");
  const cr = typeof globalThis === "object" ? globalThis.crypto : null;
  if (typeof cr?.getRandomValues !== "function")
    throw new Error("crypto.getRandomValues must be defined");
  if (bytesLength > 65536)
    throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
  return cr.getRandomValues(new Uint8Array(bytesLength));
}
var oidNist = (suffix) => ({
  // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
  // Larger suffix values would need base-128 OID encoding and a different length byte.
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
});

// ../omega/node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class {
  blockLen;
  outputLen;
  canXOF = false;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = false;
  length = 0;
  pos = 0;
  destroyed = false;
  constructor(blockLen, outputLen, padOffset, isLE2) {
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE2;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    let processed = false;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        processed = true;
        continue;
      }
      buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
        processed = true;
      }
    }
    this.length += data.length;
    if (processed)
      this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE: isLE2 } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    buffer.fill(0, pos);
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      buffer.fill(0);
    }
    setU64FromNum(view, blockLen - 8, this.length * 8, isLE2);
    this.process(view, 0);
    this.roundClean();
    const oview = out === buffer ? view : createView(out);
    const len = this.outputLen;
    const outLen = len / 4;
    const state = this.get();
    if (len % 4 || outLen > state.length)
      throw new Error("invalid outputLen");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE2);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneIntoMeta(to) {
    const { buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (pos)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  4089235720,
  3144134277,
  2227873595,
  1013904242,
  4271175723,
  2773480762,
  1595750129,
  1359893119,
  2917565137,
  2600822924,
  725511199,
  528734635,
  4215389547,
  1541459225,
  327033209
]);

// ../omega/node_modules/@noble/hashes/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA2_32B = class extends HashMD {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  // Numeric initializers matter: starting the fields as `undefined` changes
  // V8's field representation and makes sha256 3x slower (measured).
  A = 0;
  B = 0;
  C = 0;
  D = 0;
  E = 0;
  F = 0;
  G = 0;
  H = 0;
  constructor(outputLen, IV) {
    super(64, outputLen, 8, false);
    this.A = IV[0] | 0;
    this.B = IV[1] | 0;
    this.C = IV[2] | 0;
    this.D = IV[3] | 0;
    this.E = IV[4] | 0;
    this.F = IV[5] | 0;
    this.G = IV[6] | 0;
    this.H = IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  _cloneInto(to) {
    (to ||= new this.constructor()).set(...this.get());
    return this._cloneIntoMeta(to);
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    clean(SHA256_W);
  }
  destroy() {
    this.destroyed = true;
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var _SHA256 = class extends SHA2_32B {
  constructor() {
    super(32, SHA256_IV);
  }
};
var K512 = /* @__PURE__ */ (() => split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((n) => BigInt(n))))();
var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA2_64B = class extends HashMD {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  // h -- high 32 bits, l -- low 32 bits
  // Numeric initializers matter: starting the fields as `undefined` changes
  // V8's field representation and slows hashing down (measured on sha256).
  Ah = 0;
  Al = 0;
  Bh = 0;
  Bl = 0;
  Ch = 0;
  Cl = 0;
  Dh = 0;
  Dl = 0;
  Eh = 0;
  El = 0;
  Fh = 0;
  Fl = 0;
  Gh = 0;
  Gl = 0;
  Hh = 0;
  Hl = 0;
  constructor(outputLen, IV) {
    super(128, outputLen, 16, false);
    this.Ah = IV[0] | 0;
    this.Al = IV[1] | 0;
    this.Bh = IV[2] | 0;
    this.Bl = IV[3] | 0;
    this.Ch = IV[4] | 0;
    this.Cl = IV[5] | 0;
    this.Dh = IV[6] | 0;
    this.Dl = IV[7] | 0;
    this.Eh = IV[8] | 0;
    this.El = IV[9] | 0;
    this.Fh = IV[10] | 0;
    this.Fl = IV[11] | 0;
    this.Gh = IV[12] | 0;
    this.Gl = IV[13] | 0;
    this.Hh = IV[14] | 0;
    this.Hl = IV[15] | 0;
  }
  // prettier-ignore
  get() {
    const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
  }
  // prettier-ignore
  set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
    this.Ah = Ah | 0;
    this.Al = Al | 0;
    this.Bh = Bh | 0;
    this.Bl = Bl | 0;
    this.Ch = Ch | 0;
    this.Cl = Cl | 0;
    this.Dh = Dh | 0;
    this.Dl = Dl | 0;
    this.Eh = Eh | 0;
    this.El = El | 0;
    this.Fh = Fh | 0;
    this.Fl = Fl | 0;
    this.Gh = Gh | 0;
    this.Gl = Gl | 0;
    this.Hh = Hh | 0;
    this.Hl = Hl | 0;
  }
  _cloneInto(to) {
    (to ||= new this.constructor()).set(...this.get());
    return this._cloneIntoMeta(to);
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4) {
      SHA512_W_H[i] = view.getUint32(offset);
      SHA512_W_L[i] = view.getUint32(offset += 4);
    }
    for (let i = 16; i < 80; i++) {
      const W15h = SHA512_W_H[i - 15] | 0;
      const W15l = SHA512_W_L[i - 15] | 0;
      const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
      const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
      const W2h = SHA512_W_H[i - 2] | 0;
      const W2l = SHA512_W_L[i - 2] | 0;
      const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
      const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
      const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
      const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
      SHA512_W_H[i] = SUMh | 0;
      SHA512_W_L[i] = SUMl | 0;
    }
    let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    for (let i = 0; i < 80; i++) {
      const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
      const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
      const CHIh = Eh & Fh ^ ~Eh & Gh;
      const CHIl = El & Fl ^ ~El & Gl;
      const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
      const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
      const T1l = T1ll | 0;
      const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
      const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
      const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
      const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
      Hh = Gh | 0;
      Hl = Gl | 0;
      Gh = Fh | 0;
      Gl = Fl | 0;
      Fh = Eh | 0;
      Fl = El | 0;
      ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
      Dh = Ch | 0;
      Dl = Cl | 0;
      Ch = Bh | 0;
      Cl = Bl | 0;
      Bh = Ah | 0;
      Bl = Al | 0;
      const All = add3L(T1l, sigma0l, MAJl);
      Ah = add3H(All, T1h, sigma0h, MAJh);
      Al = All | 0;
    }
    ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
    ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
    ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
    ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
    ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
    ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
    ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
    ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
    this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
  }
  roundClean() {
    clean(SHA512_W_H, SHA512_W_L);
  }
  destroy() {
    this.destroyed = true;
    clean(this.buffer);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var _SHA512 = class extends SHA2_64B {
  constructor() {
    super(64, SHA512_IV);
  }
};
var sha256 = /* @__PURE__ */ createHasher(
  () => new _SHA256(),
  /* @__PURE__ */ oidNist(1)
);
var sha512 = /* @__PURE__ */ createHasher(
  () => new _SHA512(),
  /* @__PURE__ */ oidNist(3)
);

// ../omega/packages/trnn-core/src/ledger/merkle.ts
var LEAF_PREFIX = 0;
var NODE_PREFIX = 1;
function emptyRoot() {
  return sha256(new Uint8Array(0));
}
function hashLeaf(data) {
  const b = new Uint8Array(1 + data.length);
  b[0] = LEAF_PREFIX;
  b.set(data, 1);
  return sha256(b);
}
function hashNode(left, right) {
  const b = new Uint8Array(1 + left.length + right.length);
  b[0] = NODE_PREFIX;
  b.set(left, 1);
  b.set(right, 1 + left.length);
  return sha256(b);
}
function toHex(h) {
  let s = "";
  for (let i = 0; i < h.length; i++) s += h[i].toString(16).padStart(2, "0");
  return s;
}
function fromHex(s) {
  const n = s.length >> 1;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function hashEquals(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
function splitPoint(n) {
  let k = 1;
  while (k << 1 < n) k <<= 1;
  return k;
}
function mth(leaves, lo, hi) {
  const n = hi - lo;
  if (n === 0) return emptyRoot();
  if (n === 1) return leaves[lo];
  const k = splitPoint(n);
  return hashNode(mth(leaves, lo, lo + k), mth(leaves, lo + k, hi));
}
var MerkleLog = class {
  leaves = [];
  get size() {
    return this.leaves.length;
  }
  /** Append raw leaf data; returns the leaf index. */
  append(data) {
    this.leaves.push(hashLeaf(data));
    return this.leaves.length - 1;
  }
  /** Append an already-computed leaf hash (for replay from a persisted log). */
  appendLeafHash(h) {
    this.leaves.push(Uint8Array.from(h));
    return this.leaves.length - 1;
  }
  leafHash(i) {
    return i >= 0 && i < this.leaves.length ? this.leaves[i] : null;
  }
  /** Merkle tree head over the first `size` leaves (default: all). */
  root(size = this.leaves.length) {
    if (size < 0 || size > this.leaves.length) throw new RangeError("size out of range");
    return mth(this.leaves, 0, size);
  }
  /** RFC-6962 PATH(m, D[0:n]) — audit path proving leaf m is in the size-n tree. */
  inclusionProof(m, size = this.leaves.length) {
    if (size < 0 || size > this.leaves.length) throw new RangeError("size out of range");
    if (m < 0 || m >= size) throw new RangeError("leaf index out of range");
    const path = [];
    let lo = 0, hi = size, idx = m;
    while (hi - lo > 1) {
      const k = splitPoint(hi - lo);
      if (idx < k) {
        path.push(mth(this.leaves, lo + k, hi));
        hi = lo + k;
      } else {
        path.push(mth(this.leaves, lo, lo + k));
        idx -= k;
        lo = lo + k;
      }
    }
    path.reverse();
    return path;
  }
  /** RFC-6962 PROOF(m, D[0:n]) — consistency between the size-m and size-n heads. */
  consistencyProof(m, n = this.leaves.length) {
    if (m < 0 || n > this.leaves.length || m > n) throw new RangeError("bad range");
    if (m === 0 || m === n) return [];
    return this.subproof(m, 0, n, true);
  }
  subproof(m, lo, hi, isComplete) {
    const n = hi - lo;
    if (m === n) return isComplete ? [] : [mth(this.leaves, lo, hi)];
    const k = splitPoint(n);
    if (m <= k) {
      const p2 = this.subproof(m, lo, lo + k, isComplete);
      p2.push(mth(this.leaves, lo + k, hi));
      return p2;
    }
    const p = this.subproof(m - k, lo + k, hi, false);
    p.push(mth(this.leaves, lo, lo + k));
    return p;
  }
};
function verifyInclusion(leaf, m, size, proof, root) {
  if (m < 0 || m >= size) return false;
  let r = leaf;
  let fn = m, sn = size - 1;
  for (let p = 0; p < proof.length; p++) {
    if (sn === 0) return false;
    if ((fn & 1) === 1 || fn === sn) {
      r = hashNode(proof[p], r);
      while ((fn & 1) === 0 && fn !== 0) {
        fn >>= 1;
        sn >>= 1;
      }
    } else {
      r = hashNode(r, proof[p]);
    }
    fn >>= 1;
    sn >>= 1;
  }
  return sn === 0 && hashEquals(r, root);
}
function verifyConsistency(m, oldRoot, n, newRoot, proof) {
  if (m > n || m < 0) return false;
  if (m === n) return proof.length === 0 && hashEquals(oldRoot, newRoot);
  if (m === 0) return proof.length === 0;
  let node = m - 1;
  let size = n - 1;
  while ((node & 1) === 1) {
    node >>= 1;
    size >>= 1;
  }
  let p = 0;
  let fn, sn;
  if (node > 0) {
    if (proof.length === 0) return false;
    fn = sn = proof[p++];
  } else {
    fn = sn = oldRoot;
  }
  while (node > 0) {
    if (p >= proof.length) return false;
    if ((node & 1) === 1) {
      const s = proof[p++];
      fn = hashNode(s, fn);
      sn = hashNode(s, sn);
    } else if (node < size) {
      sn = hashNode(sn, proof[p++]);
    }
    node >>= 1;
    size >>= 1;
  }
  while (size > 0) {
    if (p >= proof.length) return false;
    sn = hashNode(sn, proof[p++]);
    size >>= 1;
  }
  return p === proof.length && hashEquals(fn, oldRoot) && hashEquals(sn, newRoot);
}

// ../omega/node_modules/@noble/curves/utils.js
function aarray(item, title, inner2 = () => {
}) {
  if (!Array.isArray(item))
    throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
  for (let i = 0; i < item.length; i++)
    inner2(item[i], `${title}[${i}]`);
  return item;
}
var abytes2 = (value, length, title) => abytes(value, length, title);
var anumber2 = anumber;
function aobject2(value, title = "object") {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new TypeError(title === "object" ? "expected valid options object" : `"${title}" expected object, got type=${typeof value}`);
  return value;
}
function afunction(value, title) {
  if (typeof value !== "function")
    throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
  return value;
}
var bytesToHex2 = bytesToHex;
var concatBytes2 = (...arrays) => concatBytes(...arrays);
var hexToBytes2 = (hex) => hexToBytes(hex);
var isBytes2 = isBytes;
var randomBytes2 = (bytesLength) => randomBytes(bytesLength);
var _0n = /* @__PURE__ */ BigInt(0);
var _1n = /* @__PURE__ */ BigInt(1);
var atitle2 = (title) => title ? `"${title}" ` : "";
function abool(value, title = "") {
  if (typeof value !== "boolean")
    throw new TypeError(atitle2(title) + "expected boolean, got type=" + typeof value);
  return value;
}
function abignumber(n) {
  if (typeof n === "bigint") {
    if (!isPosBig(n))
      throw new RangeError("positive bigint expected, got " + n);
  } else
    anumber2(n);
  return n;
}
function asafenumber(value, title = "") {
  if (typeof value !== "number") {
    const prefix = title && `"${title}" `;
    throw new TypeError(prefix + "expected number, got type=" + typeof value);
  }
  if (!Number.isSafeInteger(value)) {
    const prefix = title && `"${title}" `;
    throw new RangeError(prefix + "expected safe integer, got " + value);
  }
}
function hexToNumber(hex) {
  if (typeof hex !== "string")
    throw new TypeError("hex string expected, got " + typeof hex);
  return hex === "" ? _0n : BigInt("0x" + hex);
}
function bytesToNumberBE(bytes) {
  return hexToNumber(bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
  return hexToNumber(bytesToHex(copyBytes(abytes(bytes)).reverse()));
}
function numberToBytesBE(n, len) {
  anumber(len);
  if (len === 0)
    throw new Error("zero output length is invalid");
  n = abignumber(n);
  const expectedLen = len * 2;
  const hex = n.toString(16);
  if (hex.length > expectedLen)
    throw new RangeError("number is too large");
  return hexToBytes(hex.padStart(expectedLen, "0"));
}
function numberToBytesLE(n, len) {
  return numberToBytesBE(n, len).reverse();
}
function copyBytes(bytes) {
  return Uint8Array.from(abytes2(bytes));
}
function isPosBig(n) {
  return typeof n === "bigint" && _0n <= n;
}
function inRange(n, min, max) {
  return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
function aInRange(title, n, min, max) {
  if (!inRange(n, min, max))
    throw new RangeError("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
function bitLen(n) {
  if (n < _0n)
    throw new Error("expected non-negative bigint, got " + n);
  return n === _0n ? 0 : n.toString(2).length;
}
var bitMask = (n) => {
  asafenumber(n, "n");
  return (_1n << BigInt(n)) - _1n;
};
function validateObject(object, fields = {}, optFields = {}, title = "object") {
  aobject2(object, title);
  aobject2(fields, "fields");
  aobject2(optFields, "optFields");
  function checkField(fieldName, expectedType, isOpt) {
    const label = title === "object" ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
    const val2 = object[fieldName];
    if (!Object.hasOwn(object, fieldName) && (isOpt ? val2 !== void 0 : expectedType !== "function")) {
      throw new TypeError(`${label} is invalid: expected own property`);
    }
    if (isOpt && val2 === void 0)
      return;
    const current2 = typeof val2;
    if (current2 !== expectedType || val2 === null)
      throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current2}`);
  }
  const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
  iter(fields, false);
  iter(optFields, true);
}

// ../omega/node_modules/@noble/curves/abstract/modular.js
var _0n2 = /* @__PURE__ */ BigInt(0);
var _1n2 = /* @__PURE__ */ BigInt(1);
var _2n = /* @__PURE__ */ BigInt(2);
var _3n = /* @__PURE__ */ BigInt(3);
var _4n = /* @__PURE__ */ BigInt(4);
var _5n = /* @__PURE__ */ BigInt(5);
var _7n = /* @__PURE__ */ BigInt(7);
var _8n = /* @__PURE__ */ BigInt(8);
var _9n = /* @__PURE__ */ BigInt(9);
var _15n = /* @__PURE__ */ BigInt(15);
var _16n = /* @__PURE__ */ BigInt(16);
var POW_WINDOWED_MIN = /* @__PURE__ */ BigInt("0x10000000000000000");
function mod(a, b) {
  if (b <= _0n2)
    throw new Error("mod: expected positive modulus, got " + b);
  const result = a % b;
  return result >= _0n2 ? result : b + result;
}
function pow(num, power, modulo) {
  if (modulo <= _1n2)
    throw new Error("pow: expected modulus > 1, got " + modulo);
  if (typeof power !== "bigint")
    throw new TypeError("invalid exponent: expected bigint, got " + typeof power);
  if (power < _0n2)
    throw new Error("invalid exponent, negatives unsupported");
  if (power === _0n2)
    return _1n2;
  if (power === _1n2)
    return num;
  let d = num % modulo;
  if (d < _0n2)
    d += modulo;
  if (power < POW_WINDOWED_MIN) {
    let p2 = _1n2;
    while (power > _0n2) {
      if (power & _1n2)
        p2 = p2 * d % modulo;
      d = d * d % modulo;
      power >>= _1n2;
    }
    return p2;
  }
  const digits = [];
  while (power > _0n2) {
    digits.push(Number(power & _15n));
    power >>= _4n;
  }
  const table = new Array(16);
  table[0] = _1n2;
  table[1] = d;
  for (let i = 2; i < 16; i++)
    table[i] = table[i - 1] * d % modulo;
  let p = table[digits[digits.length - 1]];
  for (let w = digits.length - 2; w >= 0; w--) {
    p = p * p % modulo;
    p = p * p % modulo;
    p = p * p % modulo;
    p = p * p % modulo;
    const digit = digits[w];
    if (digit !== 0)
      p = p * table[digit] % modulo;
  }
  return p;
}
function pow2(x, power, modulo) {
  if (modulo <= _1n2)
    throw new Error("pow2: expected modulus > 1, got " + modulo);
  if (power < _0n2)
    throw new Error("pow2: expected non-negative exponent, got " + power);
  let res = x;
  while (power-- > _0n2) {
    res *= res;
    res %= modulo;
  }
  return res;
}
function invert(number, modulo) {
  if (number === _0n2)
    throw new Error("invert: expected non-zero number");
  if (modulo <= _1n2)
    throw new Error("invert: expected modulus > 1, got " + modulo);
  let a = mod(number, modulo);
  let b = modulo;
  let x = _0n2, u = _1n2;
  while (a !== _0n2) {
    const q = b / a;
    const r = b - a * q;
    const m = x - u * q;
    b = a, a = r, x = u, u = m;
  }
  const gcd = b;
  if (gcd !== _1n2)
    throw new Error("invert: does not exist");
  return mod(x, modulo);
}
function assertIsSquare(Fp2, root, n) {
  const F = Fp2;
  if (!F.eql(F.sqr(root), n))
    throw new Error("Cannot find square root");
}
function aoddModulus(order, fnName) {
  if ((order & _1n2) === _0n2)
    throw new Error(fnName + ": expected odd modulus, got " + order);
}
function sqrt3mod4(Fp2, n) {
  const F = Fp2;
  const p1div4 = (F.ORDER + _1n2) / _4n;
  const root = F.pow(n, p1div4);
  assertIsSquare(F, root, n);
  return root;
}
function sqrt5mod8(Fp2, n) {
  const F = Fp2;
  const p5div8 = (F.ORDER - _5n) / _8n;
  const n2 = F.mul(n, _2n);
  const v = F.pow(n2, p5div8);
  const nv = F.mul(n, v);
  const i = F.mul(F.mul(nv, _2n), v);
  const root = F.mul(nv, F.sub(i, F.ONE));
  assertIsSquare(F, root, n);
  return root;
}
function sqrt9mod16(P) {
  const Fp_ = Field(P);
  const tn = tonelliShanks(P);
  const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
  const c2 = tn(Fp_, c1);
  const c3 = tn(Fp_, Fp_.neg(c1));
  const c4 = (P + _7n) / _16n;
  return (Fp2, n) => {
    const F = Fp2;
    let tv1 = F.pow(n, c4);
    let tv2 = F.mul(tv1, c1);
    const tv3 = F.mul(tv1, c2);
    const tv4 = F.mul(tv1, c3);
    const e1 = F.eql(F.sqr(tv2), n);
    const e2 = F.eql(F.sqr(tv3), n);
    tv1 = F.cmov(tv1, tv2, e1);
    tv2 = F.cmov(tv4, tv3, e2);
    const e3 = F.eql(F.sqr(tv2), n);
    const root = F.cmov(tv1, tv2, e3);
    assertIsSquare(F, root, n);
    return root;
  };
}
function tonelliShanks(P) {
  if (P < _3n)
    throw new Error("sqrt is not defined for small field");
  aoddModulus(P, "tonelliShanks");
  let Q = P - _1n2;
  let S = 0;
  while (Q % _2n === _0n2) {
    Q /= _2n;
    S++;
  }
  let Z = _2n;
  const _Fp = Field(P);
  while (FpLegendre(_Fp, Z) === 1) {
    if (Z++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  }
  if (S === 1)
    return sqrt3mod4;
  let cc = _Fp.pow(Z, Q);
  const Q1div2 = (Q + _1n2) / _2n;
  return function tonelliSlow(Fp2, n) {
    const F = Fp2;
    if (F.is0(n))
      return n;
    if (FpLegendre(F, n) !== 1)
      throw new Error("Cannot find square root");
    let M = S;
    let c = F.mul(F.ONE, cc);
    let t = F.pow(n, Q);
    let R = F.pow(n, Q1div2);
    while (!F.eql(t, F.ONE)) {
      if (F.is0(t))
        throw new Error("Cannot find square root: probably non-prime P");
      let i = 1;
      let t_tmp = F.sqr(t);
      while (!F.eql(t_tmp, F.ONE)) {
        i++;
        t_tmp = F.sqr(t_tmp);
        if (i === M)
          throw new Error("Cannot find square root");
      }
      const exponent = _1n2 << BigInt(M - i - 1);
      const b = F.pow(c, exponent);
      M = i;
      c = F.sqr(b);
      t = F.mul(t, c);
      R = F.mul(R, b);
    }
    return R;
  };
}
function FpSqrt(P) {
  aoddModulus(P, "Fp.sqrt");
  if (P % _4n === _3n)
    return sqrt3mod4;
  if (P % _8n === _5n)
    return sqrt5mod8;
  if (P % _16n === _9n)
    return sqrt9mod16(P);
  return tonelliShanks(P);
}
var isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n2) === _1n2;
var FIELD_FIELDS = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function validateField(field) {
  aobject2(field, "field");
  if (typeof field.ORDER !== "bigint")
    throw new TypeError('param "ORDER" is invalid: expected bigint, got ' + typeof field.ORDER);
  asafenumber(field.BYTES, "BYTES");
  asafenumber(field.BITS, "BITS");
  for (const name of FIELD_FIELDS)
    afunction(field[name], "field." + name);
  if (field.BYTES < 1 || field.BITS < 1)
    throw new Error("invalid field: expected BYTES/BITS > 0");
  if (field.ORDER <= _1n2)
    throw new Error("invalid field: expected ORDER > 1, got " + field.ORDER);
  return field;
}
function FpInvertBatch(Fp2, nums, passZero = false) {
  validateField(Fp2);
  aarray(nums, "nums");
  abool(passZero, "passZero");
  const F = Fp2;
  const inverted = new Array(nums.length).fill(passZero ? F.ZERO : void 0);
  const multipliedAcc = nums.reduce((acc, num, i) => {
    if (F.is0(num))
      return acc;
    inverted[i] = acc;
    return F.mul(acc, num);
  }, F.ONE);
  const invertedAcc = F.inv(multipliedAcc);
  nums.reduceRight((acc, num, i) => {
    if (F.is0(num))
      return acc;
    inverted[i] = F.mul(acc, inverted[i]);
    return F.mul(acc, num);
  }, invertedAcc);
  return inverted;
}
function FpLegendre(Fp2, n) {
  validateField(Fp2);
  const F = Fp2;
  aoddModulus(F.ORDER, "FpLegendre");
  const p1mod2 = (F.ORDER - _1n2) / _2n;
  const powered = F.pow(n, p1mod2);
  const yes = F.eql(powered, F.ONE);
  const zero = F.eql(powered, F.ZERO);
  const no = F.eql(powered, F.neg(F.ONE));
  if (!yes && !zero && !no)
    throw new Error("invalid Legendre symbol result");
  return yes ? 1 : zero ? 0 : -1;
}
function nLength(n, nBitLength) {
  if (nBitLength !== void 0)
    anumber2(nBitLength);
  if (n <= _0n2)
    throw new Error("invalid n length: expected positive n, got " + n);
  if (nBitLength !== void 0 && nBitLength < 1)
    throw new Error("invalid n length: expected positive bit length, got " + nBitLength);
  const bits = bitLen(n);
  if (nBitLength !== void 0 && nBitLength < bits)
    throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
  const _nBitLength = nBitLength !== void 0 ? nBitLength : bits;
  const nByteLength = Math.ceil(_nBitLength / 8);
  return { nBitLength: _nBitLength, nByteLength };
}
var FIELD_SQRT = /* @__PURE__ */ new WeakMap();
var _Field = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = _0n2;
  ONE = _1n2;
  _lengths;
  _mod;
  constructor(ORDER, opts = {}) {
    if (ORDER <= _1n2)
      throw new Error("invalid field: expected ORDER > 1, got " + ORDER);
    let _nbitLength = void 0;
    this.isLE = false;
    if (opts != null && typeof opts === "object") {
      if (typeof opts.BITS === "number")
        _nbitLength = opts.BITS;
      if (typeof opts.sqrt === "function")
        Object.defineProperty(this, "sqrt", { value: opts.sqrt, enumerable: true });
      if (typeof opts.isLE === "boolean")
        this.isLE = opts.isLE;
      if (opts.allowedLengths)
        this._lengths = Object.freeze(opts.allowedLengths.slice());
      if (typeof opts.modFromBytes === "boolean")
        this._mod = opts.modFromBytes;
    }
    const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
    if (nByteLength > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = ORDER;
    this.BITS = nBitLength;
    this.BYTES = nByteLength;
    Object.freeze(this);
  }
  create(num) {
    return mod(num, this.ORDER);
  }
  isValid(num) {
    if (typeof num !== "bigint")
      throw new TypeError("invalid field element: expected bigint, got " + typeof num);
    return _0n2 <= num && num < this.ORDER;
  }
  is0(num) {
    return num === _0n2;
  }
  // is valid and invertible
  isValidNot0(num) {
    return !this.is0(num) && this.isValid(num);
  }
  isOdd(num) {
    return (num & _1n2) === _1n2;
  }
  neg(num) {
    return mod(-num, this.ORDER);
  }
  eql(lhs, rhs) {
    return lhs === rhs;
  }
  sqr(num) {
    return mod(num * num, this.ORDER);
  }
  add(lhs, rhs) {
    return mod(lhs + rhs, this.ORDER);
  }
  sub(lhs, rhs) {
    return mod(lhs - rhs, this.ORDER);
  }
  mul(lhs, rhs) {
    return mod(lhs * rhs, this.ORDER);
  }
  pow(num, power) {
    return pow(num, power, this.ORDER);
  }
  div(lhs, rhs) {
    return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(num) {
    return num * num;
  }
  addN(lhs, rhs) {
    return lhs + rhs;
  }
  subN(lhs, rhs) {
    return lhs - rhs;
  }
  mulN(lhs, rhs) {
    return lhs * rhs;
  }
  inv(num) {
    return invert(num, this.ORDER);
  }
  sqrt(num) {
    let sqrt = FIELD_SQRT.get(this);
    if (!sqrt)
      FIELD_SQRT.set(this, sqrt = FpSqrt(this.ORDER));
    return sqrt(this, num);
  }
  toBytes(num) {
    return this.isLE ? numberToBytesLE(num, this.BYTES) : numberToBytesBE(num, this.BYTES);
  }
  fromBytes(bytes, skipValidation = false) {
    abytes2(bytes);
    const { _lengths: allowedLengths, BYTES, isLE: isLE2, ORDER, _mod: modFromBytes } = this;
    if (allowedLengths) {
      if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
        throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
      }
      const padded = new Uint8Array(BYTES);
      padded.set(bytes, isLE2 ? 0 : padded.length - bytes.length);
      bytes = padded;
    }
    if (bytes.length !== BYTES)
      throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
    let scalar = isLE2 ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
    if (modFromBytes)
      scalar = mod(scalar, ORDER);
    if (!skipValidation) {
      if (!this.isValid(scalar))
        throw new Error("invalid field element: outside of range 0..ORDER");
    }
    return scalar;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(lst) {
    return FpInvertBatch(this, lst, true);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(a, b, condition) {
    abool(condition, "condition");
    return condition ? b : a;
  }
};
function Field(ORDER, opts = {}) {
  Object.freeze(_Field.prototype);
  return new _Field(ORDER, opts);
}

// ../omega/node_modules/@noble/curves/abstract/curve.js
var _0n3 = /* @__PURE__ */ BigInt(0);
var _1n3 = /* @__PURE__ */ BigInt(1);
var _4n2 = /* @__PURE__ */ BigInt(4);
var BLIND_BYTES = 16;
var BLIND_BITS = 128;
var FW_WINDOW = 5;
var TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
function validatePointCons(Point) {
  const pc = Point;
  if (typeof pc !== "function")
    throw new TypeError('"Point" expected constructor, got type=' + typeof Point);
  afunction(pc.fromAffine, "Point.fromAffine");
  afunction(pc.fromBytes, "Point.fromBytes");
  afunction(pc.fromHex, "Point.fromHex");
  aobject2(pc.BASE, "Point.BASE");
  aobject2(pc.ZERO, "Point.ZERO");
  validateField(pc.Fp);
  validateField(pc.Fn);
}
function normalizeZ(c, points) {
  validatePointCons(c);
  validateMSMPoints(points, c);
  const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
  return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits, min = 1) {
  if (!Number.isSafeInteger(W) || W < min || W > bits)
    throw new Error("invalid window size, expected [" + min + ".." + bits + "], got W=" + W);
}
function validateTableBytes(numPoints, fpBytes) {
  const bytes = numPoints * (4 * fpBytes + 128);
  if (bytes > TABLE_BYTES_MAX)
    throw new Error("invalid window size: table would need ~" + Math.ceil(bytes / 2 ** 20) + " MiB, max " + TABLE_BYTES_MAX / 2 ** 20 + " MiB");
}
function probeRandomBytes(randomBytes3, length) {
  if (randomBytes3 === void 0)
    return void 0;
  afunction(randomBytes3, "randomBytes");
  try {
    const probe = randomBytes3(length);
    if (!isBytes2(probe) || probe.length !== length)
      return void 0;
  } catch {
    return void 0;
  }
  return randomBytes3;
}
function validateMSMPoints(points, c) {
  aarray(points, "points");
  points.forEach((p, i) => {
    if (!(p instanceof c))
      throw new Error("invalid point at index " + i);
  });
}
function validateMSMScalars(scalars, field, maxScalar) {
  if (!Array.isArray(scalars))
    throw new Error("array of scalars expected");
  scalars.forEach((s, i) => {
    const ok = maxScalar === void 0 ? field.isValid(s) : isPosBig(s) && s < maxScalar;
    if (!ok)
      throw new Error("invalid scalar at index " + i);
  });
}
var pointWindowSizes = /* @__PURE__ */ new WeakMap();
function getWindowSize(P) {
  return pointWindowSizes.get(P) || 1;
}
function oddMultiples(p, size) {
  const dbl = p.double();
  const t = [p];
  for (let j = 1; j < size; j++)
    t.push(t[j - 1].add(dbl));
  return t;
}
function wnafDigits(n, W) {
  const size = 2 ** W;
  const half = size / 2;
  const mask = BigInt(size - 1);
  const d = [];
  while (n > _0n3) {
    let w = 0;
    if (n & _1n3) {
      w = Number(n & mask);
      if (w >= half)
        w -= size;
      n -= BigInt(w);
    }
    d.push(w);
    n >>= _1n3;
  }
  return d;
}
function signedWindowDigits(n, W, windows) {
  const size = 2 ** W;
  const half = size / 2;
  const mask = BigInt(size - 1);
  const shiftBy = BigInt(W);
  const d = [];
  for (let w = 0; w < windows; w++) {
    let v = Number(n & mask);
    n >>= shiftBy;
    if (v > half) {
      v -= size;
      n += _1n3;
    }
    d.push(v);
  }
  if (n !== _0n3)
    throw new Error("invalid wnaf");
  return d;
}
function wnafWalk(zero, tables, digits) {
  let max = 0;
  for (const d of digits)
    max = Math.max(max, d.length);
  let acc = zero;
  for (let bit = max - 1; bit >= 0; bit--) {
    if (bit !== max - 1)
      acc = acc.double();
    for (let i = 0; i < digits.length; i++) {
      const w = digits[i][bit];
      if (w) {
        const item = tables[i][Math.abs(w) - 1 >> 1];
        acc = acc.add(w < 0 ? item.negate() : item);
      }
    }
  }
  return acc;
}
var ScalarMultiplier = class {
  Point;
  BASE;
  ZERO;
  randomBytes;
  wnafPrecomputes = /* @__PURE__ */ new WeakMap();
  baseCanBeBlinded;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(Point, randomBytes3) {
    validatePointCons(Point);
    this.randomBytes = probeRandomBytes(randomBytes3, BLIND_BYTES);
    this.Point = Point;
    this.BASE = Point.BASE;
    this.ZERO = Point.ZERO;
    this.bits = Point.Fn.BITS;
  }
  /**
   * Creates a signed fixed-window wNAF precomputation table: for every window w, the
   * multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
   * so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
   * window absorbs the final carry of signed-digit recoding.
   * For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
   * @param point - Point instance
   * @param W - window size
   * @param bits - scalar bitlength the table must cover
   */
  buildWnafTable(point, W, bits) {
    const windows = Math.ceil(bits / W) + 1;
    const half = 2 ** (W - 1);
    const comp = [];
    let base = point;
    for (let w = 0; w < windows; w++) {
      let acc = base;
      for (let i = 0; i < half; i++) {
        comp.push(acc);
        acc = acc.add(base);
      }
      base = comp[comp.length - 1].double();
    }
    return { W, bits, windows, comp };
  }
  /**
   * Implements ec multiplication using precomputed signed fixed-window wNAF tables.
   * Constant-time: fixed window count with one table addition per window — zero digits feed
   * the fake accumulator — and no doublings; the lookup scans the whole window slice.
   * Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
   * {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
   * signedWindowDigits throws if `n` exceeds the table.
   * @returns real and fake (for const-time) points
   */
  wnafCachedCT(precomputes, n) {
    const { W, windows, comp } = precomputes;
    const half = 2 ** (W - 1);
    const digits = signedWindowDigits(n, W, windows);
    let p = this.ZERO;
    let f = this.BASE;
    for (let w = 0; w < windows; w++) {
      const digit = digits[w];
      const start = w * half;
      const idx = Math.abs(digit) - 1;
      let sel = comp[start];
      for (let i = 1; i < half; i++)
        sel = i === idx ? comp[start + i] : sel;
      const neg = sel.negate();
      if (digit === 0)
        f = f.add(comp[start]);
      else
        p = p.add(digit < 0 ? neg : sel);
    }
    return { p, f };
  }
  // Cache key is point identity plus (W, bits); at most two entries exist per point (public-width
  // `Fn.BITS` and blinded `Fn.BITS + BLIND_BITS`). Callers must not reuse the same point with
  // incompatible `transform(...)` layouts and expect a separate cache entry.
  getWnafPrecomputes(W, point, bits, transform) {
    let entries = this.wnafPrecomputes.get(point);
    let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
    if (!comp) {
      comp = this.buildWnafTable(point, W, bits);
      if (typeof transform === "function")
        comp = { ...comp, comp: transform(comp.comp) };
      if (!entries) {
        entries = [];
        this.wnafPrecomputes.set(point, entries);
      }
      entries.push(comp);
    }
    return comp;
  }
  assertPoint(point) {
    if (!(point instanceof this.Point))
      throw new TypeError('"point" expected Point instance, got type=' + typeof point);
  }
  // Shared prologue of the constant-time entry points. Rejects scalar 0: in key/signature-style
  // callers a zero scalar means broken upstream plumbing, and concrete Points already reject it.
  // Uses inRange instead of Fn.isValidNot0: validateField() only certifies the arithmetic subset.
  validateMulInput(point, scalar) {
    this.assertPoint(point);
    if (!inRange(scalar, _1n3, this.Point.Fn.ORDER))
      throw new Error("invalid scalar");
  }
  // Constant-time dispatch shared by mulCT / mulCTBlinded. Un-precomputed points (W===1, e.g.
  // ECDH peer keys) skip building a throwaway cached table in favor of a small fixed-window
  // multiply. `n` must be < 2^bits.
  runCT(point, n, bits, transform) {
    const W = getWindowSize(point);
    if (W === 1)
      return this.fixedWindowCT(point, n, bits);
    return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
  }
  mulCT(point, scalar, transform) {
    this.validateMulInput(point, scalar);
    return this.runCT(point, scalar, this.bits, transform);
  }
  mulCTBlinded(point, scalar, transform) {
    this.validateMulInput(point, scalar);
    if (this.randomBytes === void 0)
      throw new Error("randomBytes is required for scalar blinding");
    const bits = this.Point.Fn.BITS + BLIND_BITS;
    const blind = this.randomBytes(BLIND_BYTES);
    if (!isBytes2(blind) || blind.length !== BLIND_BYTES)
      throw new Error("randomBytes returned invalid byte array");
    blind[0] = blind[0] & 63 | 128;
    const n = scalar + bytesToNumberBE(blind) * this.Point.Fn.ORDER;
    return this.runCT(point, n, bits, transform);
  }
  /**
   * Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
   * A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
   * far cheaper to build for a single use. The point-operation sequence is independent of `n`:
   * build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
   * every table entry, and one addition (adds the identity when the window digit is 0 — never
   * skipped).
   *
   * `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
   * add), which holds for the Weierstrass/Edwards point types used here. The table is left in
   * projective form (no normalizeZ): normalizing this small a table costs more than the
   * mixed-add savings it would buy for a single multiply.
   * @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
   * (this path needs no fake accumulator — its op-count is already scalar-independent).
   */
  fixedWindowCT(point, n, bits) {
    const W = FW_WINDOW;
    const size = 1 << W;
    const mask = bitMask(W);
    const table = new Array(size);
    table[0] = this.ZERO;
    for (let i = 1; i < size; i++)
      table[i] = table[i - 1].add(point);
    const windows = Math.ceil(bits / W);
    let acc = this.ZERO;
    for (let window = windows - 1; window >= 0; window--) {
      if (window !== windows - 1)
        for (let d = 0; d < W; d++)
          acc = acc.double();
      const digit = Number(n >> BigInt(window * W) & mask);
      let sel = table[0];
      for (let i = 1; i < size; i++)
        sel = i === digit ? table[i] : sel;
      acc = acc.add(sel);
    }
    return { p: acc, f: acc };
  }
  shouldBlind(point, cofactor) {
    if (this.randomBytes === void 0)
      return false;
    if (cofactor === _1n3)
      return true;
    if (point !== this.BASE)
      return false;
    if (this.baseCanBeBlinded === void 0)
      this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
    return this.baseCanBeBlinded;
  }
  mulSecret(point, scalar, cofactor, transform) {
    return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform) : this.mulCT(point, scalar, transform);
  }
  mulUnsafe(point, scalar, transform) {
    this.assertPoint(point);
    if (!isPosBig(scalar))
      throw new Error("invalid scalar");
    const W = getWindowSize(point);
    if (W === 1 || scalar >= this.Point.Fn.ORDER)
      return mulAddUnsafe(this.Point, [point], [scalar], true);
    const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
    return this.wnafCachedCT(precomputes, scalar).p;
  }
  // Remembers the window size used for precomputed wNAF multiplication of the given point
  // and drops any previously built tables. Usually only the base point is precomputed.
  // W=1 resets the point to the un-precomputed (table-less) paths.
  // W is additionally capped so tables stay under ~2 GiB ({@link TABLE_BYTES_MAX}).
  setWindowSize(point, W) {
    this.assertPoint(point);
    validateW(W, this.bits);
    const windows = Math.ceil((this.bits + BLIND_BITS) / W) + 1;
    validateTableBytes(windows * 2 ** (W - 1), this.Point.Fp.BYTES);
    pointWindowSizes.set(point, W);
    this.wnafPrecomputes.delete(point);
  }
  // True when a window size is set: tables themselves are built lazily on first multiply.
  hasWindowSize(point) {
    return getWindowSize(point) !== 1;
  }
};
function mulAddUnsafe(c, points, scalars, allowOversized = false) {
  validatePointCons(c);
  validateMSMPoints(points, c);
  abool(allowOversized, "allowOversized");
  validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n2 : void 0);
  if (points.length !== scalars.length)
    throw new Error("arrays of points and scalars must have equal length");
  const tables = points.map((p) => oddMultiples(p, 4));
  const digits = scalars.map((n) => wnafDigits(n, 4));
  return wnafWalk(c.ZERO, tables, digits);
}
function createField2(order, field, isLE2) {
  if (field) {
    if (field.ORDER !== order)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    validateField(field);
    return field;
  } else {
    return Field(order, { isLE: isLE2 });
  }
}
function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
  if (type !== "weierstrass" && type !== "edwards")
    throw new Error('expected curve type "weierstrass" or "edwards"');
  if (FpFnLE === void 0)
    FpFnLE = type === "edwards";
  if (!CURVE || typeof CURVE !== "object")
    throw new Error(`expected valid ${type} CURVE object`);
  validateObject(curveOpts);
  for (const p of ["p", "n", "h"]) {
    const val2 = CURVE[p];
    if (!(isPosBig(val2) && val2 !== _0n3))
      throw new Error(`CURVE.${p} must be positive bigint`);
  }
  const Fp2 = createField2(CURVE.p, curveOpts.Fp, FpFnLE);
  const Fn = createField2(CURVE.n, curveOpts.Fn, FpFnLE);
  const _b = type === "weierstrass" ? "b" : "d";
  const params = ["Gx", "Gy", "a", _b];
  for (const p of params) {
    if (!Fp2.isValid(CURVE[p]))
      throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
  }
  CURVE = Object.freeze(Object.assign({}, CURVE));
  return { CURVE, Fp: Fp2, Fn };
}
function createKeygen(randomSecretKey, getPublicKey) {
  return function keygen(seed) {
    const secretKey = randomSecretKey(seed);
    return { secretKey, publicKey: getPublicKey(secretKey) };
  };
}

// ../omega/node_modules/@noble/curves/abstract/edwards.js
var _0n4 = /* @__PURE__ */ BigInt(0);
var _1n4 = /* @__PURE__ */ BigInt(1);
var _2n2 = /* @__PURE__ */ BigInt(2);
var _4n3 = /* @__PURE__ */ BigInt(4);
var _8n2 = /* @__PURE__ */ BigInt(8);
function isEdValidXY(Fp2, CURVE, x, y) {
  const x2 = Fp2.sqr(x);
  const y2 = Fp2.sqr(y);
  const left = Fp2.add(Fp2.mul(CURVE.a, x2), y2);
  const right = Fp2.add(Fp2.ONE, Fp2.mul(CURVE.d, Fp2.mul(x2, y2)));
  return Fp2.eql(left, right);
}
function edwards(params, extraOpts = {}) {
  validateObject(extraOpts, {}, {}, "extraOpts");
  const opts = extraOpts;
  const validated = createCurveFields("edwards", params, opts, opts.FpFnLE);
  const { Fp: Fp2, Fn } = validated;
  let CURVE = validated.CURVE;
  const { h: cofactor } = CURVE;
  if (FpLegendre(Fp2, CURVE.a) !== 1)
    throw new Error("edwards: CURVE.a must be a square in Fp for complete addition formulas");
  if (FpLegendre(Fp2, CURVE.d) !== -1)
    throw new Error("edwards: CURVE.d must be a non-square in Fp for complete addition formulas");
  validateObject(opts, {}, { uvRatio: "function", randomBytes: "function" });
  const randomBytes3 = opts.randomBytes === void 0 ? randomBytes2 : opts.randomBytes;
  const MASK2 = _2n2 << BigInt(Fp2.BYTES * 8) - _1n4;
  function isOdd(n) {
    if (!Fp2.isOdd)
      throw new Error("Field does not have .isOdd()");
    return Fp2.isOdd(n);
  }
  const uvRatio2 = opts.uvRatio === void 0 ? (u, v) => {
    try {
      return { isValid: true, value: Fp2.sqrt(Fp2.div(u, v)) };
    } catch (e) {
      return { isValid: false, value: _0n4 };
    }
  } : opts.uvRatio;
  if (!isEdValidXY(Fp2, CURVE, CURVE.Gx, CURVE.Gy))
    throw new Error("bad curve params: generator point");
  const mulA = Fp2.eql(CURVE.a, Fp2.neg(Fp2.ONE)) ? (x) => Fp2.neg(x) : Fp2.eql(CURVE.a, Fp2.ONE) ? (x) => x : (x) => Fp2.mul(CURVE.a, x);
  function acoord(title, n, banZero = false) {
    const min = banZero ? _1n4 : _0n4;
    aInRange("coordinate " + title, n, min, MASK2);
    return n;
  }
  function aedpoint(other) {
    if (!(other instanceof Point))
      throw new Error("EdwardsPoint expected");
  }
  class Point {
    static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp2.ONE, Fp2.mul(CURVE.Gx, CURVE.Gy));
    static ZERO = new Point(Fp2.ZERO, Fp2.ONE, Fp2.ONE, Fp2.ZERO);
    static Fp = Fp2;
    static Fn = Fn;
    X;
    Y;
    Z;
    T;
    constructor(X, Y, Z, T) {
      this.X = acoord("x", X);
      this.Y = acoord("y", Y);
      this.Z = acoord("z", Z, true);
      this.T = acoord("t", T);
      Object.freeze(this);
    }
    static CURVE() {
      return CURVE;
    }
    /**
     * Create one extended Edwards point from affine coordinates.
     * Does NOT validate that the point is on-curve or torsion-free.
     * Use `.assertValidity()` on adversarial inputs.
     */
    static fromAffine(p) {
      if (p instanceof Point)
        throw new Error("extended point not allowed");
      const { x, y } = p || {};
      acoord("x", x);
      acoord("y", y);
      return new Point(x, y, Fp2.ONE, Fp2.mul(x, y));
    }
    // Uses algo from RFC8032 5.1.3.
    static fromBytes(bytes, zip215 = false) {
      const len = Fp2.BYTES;
      const { a, d } = CURVE;
      bytes = copyBytes(abytes2(bytes, len, "point"));
      abool(zip215, "zip215");
      const normed = copyBytes(bytes);
      const lastByte = bytes[len - 1];
      normed[len - 1] = lastByte & ~128;
      const y = bytesToNumberLE(normed);
      const max = zip215 ? MASK2 : Fp2.ORDER;
      aInRange("point.y", y, _0n4, max);
      const y2 = Fp2.sqr(y);
      const u = Fp2.sub(y2, Fp2.ONE);
      const v = Fp2.sub(Fp2.mulN(d, y2), a);
      let { isValid, value: x } = uvRatio2(u, v);
      if (!isValid)
        throw new Error("bad point: invalid y coordinate");
      const isXOdd = isOdd(x);
      const isLastByteOdd = (lastByte & 128) !== 0;
      if (!zip215 && Fp2.is0(x) && isLastByteOdd)
        throw new Error("bad point: x=0 and x_0=1");
      if (isLastByteOdd !== isXOdd)
        x = Fp2.neg(x);
      return Point.fromAffine({ x, y });
    }
    static fromHex(hex, zip215 = false) {
      return Point.fromBytes(hexToBytes2(hex), zip215);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    precompute(windowSize = 6, isLazy = true) {
      wnaf.setWindowSize(this, windowSize);
      if (!isLazy)
        this.multiply(_2n2);
      return this;
    }
    // Useful in fromAffine() - not for fromBytes(), which always created valid points.
    assertValidity() {
      const p = this;
      const { a, d } = CURVE;
      if (p.is0())
        throw new Error("bad point: ZERO");
      const { X, Y, Z, T } = p;
      const X2 = Fp2.sqr(X);
      const Y2 = Fp2.sqr(Y);
      const Z2 = Fp2.sqr(Z);
      const Z4 = Fp2.sqr(Z2);
      const aX2 = Fp2.mul(X2, a);
      const left = Fp2.mul(Fp2.add(aX2, Y2), Z2);
      const right = Fp2.add(Z4, Fp2.mul(d, Fp2.mul(X2, Y2)));
      if (!Fp2.eql(left, right))
        throw new Error("bad point: equation left != right (1)");
      const XY = Fp2.mul(X, Y);
      const ZT = Fp2.mul(Z, T);
      if (!Fp2.eql(XY, ZT))
        throw new Error("bad point: equation left != right (2)");
    }
    // Compare one point to another.
    equals(other) {
      aedpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      const X1Z2 = Fp2.mul(X1, Z2);
      const X2Z1 = Fp2.mul(X2, Z1);
      const Y1Z2 = Fp2.mul(Y1, Z2);
      const Y2Z1 = Fp2.mul(Y2, Z1);
      return Fp2.eql(X1Z2, X2Z1) && Fp2.eql(Y1Z2, Y2Z1);
    }
    is0() {
      return this.equals(Point.ZERO);
    }
    negate() {
      return new Point(Fp2.neg(this.X), this.Y, this.Z, Fp2.neg(this.T));
    }
    // Fast algo for doubling Extended Point.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
    // Cost: 4M + 4S + 1*a + 6add + 1*2.
    double() {
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const A = Fp2.sqr(X1);
      const B = Fp2.sqr(Y1);
      const C = Fp2.mul(Fp2.sqr(Z1), _2n2);
      const D = mulA(A);
      const x1y1 = Fp2.addN(X1, Y1);
      const E = Fp2.sub(Fp2.subN(Fp2.sqr(x1y1), A), B);
      const G = Fp2.addN(D, B);
      const F = Fp2.subN(G, C);
      const H = Fp2.subN(D, B);
      const X3 = Fp2.mul(E, F);
      const Y3 = Fp2.mul(G, H);
      const T3 = Fp2.mul(E, H);
      const Z3 = Fp2.mul(F, G);
      return new Point(X3, Y3, Z3, T3);
    }
    // Fast algo for adding 2 Extended Points.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
    // Cost: 9M + 1*a + 1*d + 7add.
    add(other) {
      aedpoint(other);
      const { d } = CURVE;
      const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
      const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
      const A = Fp2.mul(X1, X2);
      const B = Fp2.mul(Y1, Y2);
      const C = Fp2.mul(Fp2.mulN(T1, d), T2);
      const D = Fp2.mul(Z1, Z2);
      const E = Fp2.sub(Fp2.subN(Fp2.mulN(Fp2.addN(X1, Y1), Fp2.addN(X2, Y2)), A), B);
      const F = Fp2.subN(D, C);
      const G = Fp2.addN(D, C);
      const H = Fp2.sub(B, mulA(A));
      const X3 = Fp2.mul(E, F);
      const Y3 = Fp2.mul(G, H);
      const T3 = Fp2.mul(E, H);
      const Z3 = Fp2.mul(F, G);
      return new Point(X3, Y3, Z3, T3);
    }
    subtract(other) {
      aedpoint(other);
      return this.add(other.negate());
    }
    // Constant-time multiplication.
    multiply(scalar) {
      if (!Fn.isValidNot0(scalar))
        throw new RangeError("invalid scalar: expected 1 <= sc < curve.n");
      const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
      return normalize([p, f])[0];
    }
    // Non-constant-time multiplication. Uses double-and-add algorithm.
    // It's faster, but should only be used when you don't care about
    // an exposed private key e.g. sig verification.
    // Keeps the same subgroup-scalar contract: 0 is allowed for public-scalar callers, but
    // n and larger values are rejected instead of being reduced mod n to the identity point.
    multiplyUnsafe(scalar) {
      if (!Fn.isValid(scalar))
        throw new RangeError("invalid scalar: expected 0 <= sc < curve.n");
      if (scalar === _0n4)
        return Point.ZERO;
      if (this.is0() || scalar === _1n4)
        return this;
      return wnaf.mulUnsafe(this, scalar, normalize);
    }
    // Checks if point is of small order.
    // If you add something to small order point, you will have "dirty"
    // point with torsion component.
    // Clears cofactor and checks if the result is 0.
    isSmallOrder() {
      return this.clearCofactor().is0();
    }
    // Multiplies point by curve order and checks if the result is 0.
    // Returns `false` is the point is dirty.
    isTorsionFree() {
      return wnaf.mulUnsafe(this, CURVE.n).is0();
    }
    // Converts Extended point to default (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    toAffine(invertedZ) {
      const p = this;
      let iz = invertedZ;
      if (iz != null && typeof iz !== "bigint")
        throw new TypeError('"invertedZ" expected bigint, got type=' + typeof iz);
      const { X, Y, Z } = p;
      const is0 = p.is0();
      if (iz == null)
        iz = is0 ? Fp2.create(_8n2) : Fp2.inv(Z);
      const x = Fp2.mul(X, iz);
      const y = Fp2.mul(Y, iz);
      const zz = Fp2.mul(Z, iz);
      if (is0)
        return { x: Fp2.ZERO, y: Fp2.ONE };
      if (!Fp2.eql(zz, Fp2.ONE))
        throw new Error("invZ was invalid");
      return { x, y };
    }
    clearCofactor() {
      if (cofactor === _1n4)
        return this;
      if (cofactor === _2n2)
        return this.double();
      if (cofactor === _4n3)
        return this.double().double();
      if (cofactor === _8n2)
        return this.double().double().double();
      return this.multiplyUnsafe(cofactor);
    }
    toBytes() {
      const { x, y } = this.toAffine();
      const bytes = Fp2.toBytes(y);
      bytes[bytes.length - 1] |= isOdd(x) ? 128 : 0;
      return bytes;
    }
    toHex() {
      return bytesToHex2(this.toBytes());
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const normalize = (points) => normalizeZ(Point, points);
  const wnaf = new ScalarMultiplier(Point, randomBytes3);
  if (wnaf.bits >= 6)
    Point.BASE.precompute(6);
  Object.freeze(Point.prototype);
  Object.freeze(Point);
  return Point;
}
function eddsa(Point, cHash, eddsaOpts = {}) {
  validatePointCons(Point);
  if (typeof cHash !== "function")
    throw new Error('"hash" function param is required');
  const hash = cHash;
  const opts = eddsaOpts;
  validateObject(opts, {}, {
    adjustScalarBytes: "function",
    randomBytes: "function",
    domain: "function",
    prehash: "function",
    zip215: "boolean",
    mapToCurve: "function",
    toMontgomery: "function",
    toMontgomerySecret: "function"
  });
  const { prehash } = opts;
  const { BASE, Fp: Fp2, Fn } = Point;
  const outputLen = hash.outputLen;
  const expectedLen = 2 * Fp2.BYTES;
  if (outputLen !== void 0) {
    asafenumber(outputLen, "hash.outputLen");
    if (outputLen !== expectedLen)
      throw new Error(`hash.outputLen must be ${expectedLen}, got ${outputLen}`);
  }
  const randomBytes3 = opts.randomBytes === void 0 ? randomBytes2 : opts.randomBytes;
  const toMontgomery2 = opts.toMontgomery;
  const toMontgomerySecret2 = opts.toMontgomerySecret;
  const adjustScalarBytes2 = opts.adjustScalarBytes === void 0 ? (bytes) => bytes : opts.adjustScalarBytes;
  const domain = opts.domain === void 0 ? (data, ctx, phflag) => {
    abool(phflag, "phflag");
    if (ctx.length || phflag)
      throw new Error("Contexts/pre-hash are not supported");
    return data;
  } : opts.domain;
  function modN_LE(hash2) {
    return Fn.create(bytesToNumberLE(hash2));
  }
  function getPrivateScalar(key) {
    const len = lengths.secretKey;
    abytes2(key, lengths.secretKey, "secretKey");
    const hashed = abytes2(hash(key), 2 * len, "hashedSecretKey");
    const head = adjustScalarBytes2(hashed.slice(0, len));
    const prefix = hashed.slice(len, 2 * len);
    const scalar = modN_LE(head);
    return { head, prefix, scalar };
  }
  function getExtendedPublicKey(secretKey) {
    const { head, prefix, scalar } = getPrivateScalar(secretKey);
    const point = BASE.multiply(scalar);
    const pointBytes = point.toBytes();
    return { head, prefix, scalar, point, pointBytes };
  }
  function getPublicKey(secretKey) {
    return getExtendedPublicKey(secretKey).pointBytes;
  }
  function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
    const msg = concatBytes2(...msgs);
    return modN_LE(hash(domain(msg, abytes2(context, void 0, "context"), !!prehash)));
  }
  function sign(msg, secretKey, options = {}) {
    validateObject(options, {}, {}, "options");
    msg = abytes2(msg, void 0, "message");
    if (prehash)
      msg = prehash(msg);
    const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
    const r = hashDomainToScalar(options.context, prefix, msg);
    const R = BASE.multiply(r).toBytes();
    const k = hashDomainToScalar(options.context, R, pointBytes, msg);
    const s = Fn.create(r + k * scalar);
    if (!Fn.isValid(s))
      throw new Error("sign failed: invalid s");
    const rs = concatBytes2(R, Fn.toBytes(s));
    return abytes2(rs, lengths.signature, "result");
  }
  const verifyOpts = {
    zip215: opts.zip215
  };
  function verify(sig, msg, publicKey, options = verifyOpts) {
    validateObject(options);
    const { context } = options;
    const zip215 = options.zip215 === void 0 ? !!verifyOpts.zip215 : options.zip215;
    const len = lengths.signature;
    sig = abytes2(sig, len, "signature");
    msg = abytes2(msg, void 0, "message");
    publicKey = abytes2(publicKey, lengths.publicKey, "publicKey");
    if (zip215 !== void 0)
      abool(zip215, "zip215");
    if (prehash)
      msg = prehash(msg);
    const mid = len / 2;
    const r = sig.subarray(0, mid);
    const s = bytesToNumberLE(sig.subarray(mid, len));
    let A, R, SB;
    try {
      A = Point.fromBytes(publicKey, zip215);
      R = Point.fromBytes(r, zip215);
      SB = BASE.multiplyUnsafe(s);
    } catch (error) {
      return false;
    }
    if (!zip215 && A.isSmallOrder())
      return false;
    const k = hashDomainToScalar(context, r, publicKey, msg);
    const RkA = R.add(A.multiplyUnsafe(k));
    return RkA.subtract(SB).clearCofactor().is0();
  }
  const _size = Fp2.BYTES;
  const lengths = {
    secretKey: _size,
    publicKey: _size,
    signature: 2 * _size,
    seed: _size
  };
  function randomSecretKey(seed) {
    seed = seed === void 0 ? randomBytes3(lengths.seed) : seed;
    return abytes2(seed, lengths.seed, "seed");
  }
  function isValidSecretKey(key) {
    return isBytes2(key) && key.length === lengths.secretKey;
  }
  function isValidPublicKey(key, zip215) {
    try {
      return !!Point.fromBytes(key, zip215 === void 0 ? verifyOpts.zip215 : zip215);
    } catch (error) {
      return false;
    }
  }
  const utils = {
    getExtendedPublicKey,
    randomSecretKey,
    isValidSecretKey,
    isValidPublicKey,
    /** Converts an Edwards public key to a companion Montgomery public key. */
    toMontgomery(publicKey) {
      if (toMontgomery2 === void 0)
        throw new Error("Montgomery conversion is not supported for this curve");
      return toMontgomery2(Point.fromBytes(publicKey));
    },
    toMontgomerySecret(secretKey) {
      if (toMontgomerySecret2 === void 0)
        throw new Error("Montgomery conversion is not supported for this curve");
      return toMontgomerySecret2(secretKey);
    }
  };
  Object.freeze(lengths);
  Object.freeze(utils);
  return Object.freeze({
    keygen: createKeygen(randomSecretKey, getPublicKey),
    getPublicKey,
    sign,
    verify,
    utils,
    Point,
    lengths
  });
}

// ../omega/node_modules/@noble/curves/ed25519.js
var _1n5 = /* @__PURE__ */ BigInt(1);
var _2n3 = /* @__PURE__ */ BigInt(2);
var _5n2 = /* @__PURE__ */ BigInt(5);
var _8n3 = /* @__PURE__ */ BigInt(8);
var ed25519_CURVE_p = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
var ed25519_CURVE = /* @__PURE__ */ (() => ({
  p: ed25519_CURVE_p,
  n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
  h: _8n3,
  a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
  d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
  Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
  Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
}))();
function ed25519_pow_2_252_3(x) {
  const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
  const P = ed25519_CURVE_p;
  const x2 = x * x % P;
  const b2 = x2 * x % P;
  const b4 = pow2(b2, _2n3, P) * b2 % P;
  const b5 = pow2(b4, _1n5, P) * x % P;
  const b10 = pow2(b5, _5n2, P) * b5 % P;
  const b20 = pow2(b10, _10n, P) * b10 % P;
  const b40 = pow2(b20, _20n, P) * b20 % P;
  const b80 = pow2(b40, _40n, P) * b40 % P;
  const b160 = pow2(b80, _80n, P) * b80 % P;
  const b240 = pow2(b160, _80n, P) * b80 % P;
  const b250 = pow2(b240, _10n, P) * b10 % P;
  const pow_p_5_8 = pow2(b250, _2n3, P) * x % P;
  return { pow_p_5_8, b2 };
}
function adjustScalarBytes(bytes) {
  bytes[0] &= 248;
  bytes[31] &= 127;
  bytes[31] |= 64;
  return bytes;
}
var ED25519_SQRT_M1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
function uvRatio(u, v) {
  const P = ed25519_CURVE_p;
  const v3 = mod(v * v * v, P);
  const v7 = mod(v3 * v3 * v, P);
  const pow3 = ed25519_pow_2_252_3(u * v7).pow_p_5_8;
  let x = mod(u * v3 * pow3, P);
  const vx2 = mod(v * x * x, P);
  const root1 = x;
  const root2 = mod(x * ED25519_SQRT_M1, P);
  const useRoot1 = vx2 === u;
  const useRoot2 = vx2 === mod(-u, P);
  const noRoot = vx2 === mod(-u * ED25519_SQRT_M1, P);
  if (useRoot1)
    x = root1;
  if (useRoot2 || noRoot)
    x = root2;
  if (isNegativeLE(x, P))
    x = mod(-x, P);
  return { isValid: useRoot1 || useRoot2, value: x };
}
var ed25519_Point = /* @__PURE__ */ edwards(ed25519_CURVE, { uvRatio });
var Fp = /* @__PURE__ */ (() => ed25519_Point.Fp)();
function toMontgomery(point) {
  const { y } = point;
  return Fp.toBytes(Fp.div(_1n5 + y, _1n5 - y));
}
function toMontgomerySecret(secretKey) {
  const size = ed25519_Point.Fp.BYTES;
  abytes(secretKey, size);
  return adjustScalarBytes(sha512(secretKey.subarray(0, size))).subarray(0, size);
}
function ed(opts) {
  return eddsa(ed25519_Point, sha512, Object.assign({ adjustScalarBytes, toMontgomery, toMontgomerySecret, zip215: true }, opts));
}
var ed25519 = /* @__PURE__ */ ed({});

// ../omega/packages/trnn-core/src/ledger/sth.ts
function keyPairFromSeed(seed) {
  if (seed.length !== 32) throw new RangeError("seed must be 32 bytes");
  const secretKey = Uint8Array.from(seed);
  return { secretKey, publicKey: ed25519.getPublicKey(secretKey) };
}
function headBytes(head) {
  return utf8(canonicalJson({
    logId: head.logId,
    size: head.size,
    rootHex: head.rootHex,
    timestamp: head.timestamp
  }));
}
function signTreeHead(head, keys) {
  const sig = ed25519.sign(headBytes(head), keys.secretKey);
  return {
    ...head,
    signature: bytesToBase64(sig),
    publicKey: bytesToBase64(keys.publicKey)
  };
}
function verifyTreeHead(sth, expectedPublicKey) {
  const pk = base64ToBytes(sth.publicKey);
  if (expectedPublicKey) {
    if (pk.length !== expectedPublicKey.length) return false;
    let d = 0;
    for (let i = 0; i < pk.length; i++) d |= pk[i] ^ expectedPublicKey[i];
    if (d !== 0) return false;
  }
  try {
    return ed25519.verify(base64ToBytes(sth.signature), headBytes(sth), pk);
  } catch {
    return false;
  }
}

// ../omega/node_modules/@noble/ciphers/utils.js
function isBytes3(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
var atitle3 = (title) => title ? `"${title}" ` : "";
function abool2(value, title = "") {
  if (typeof value !== "boolean")
    throw new TypeError(atitle3(title) + "expected boolean, got type=" + typeof value);
  return value;
}
function anumber3(n, title = "") {
  if (typeof n !== "number")
    throw new TypeError(atitle3(title) + "expected number, got " + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle3(title) + "expected integer >= 0, got " + n);
  return n;
}
function abytes3(value, length, title = "") {
  if (isBytes3(value) && (length === void 0 || value.length === length))
    return value;
  if (length !== void 0)
    anumber3(length, "length");
  const bytes = isBytes3(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle3(title) + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes)
    throw new TypeError(message);
  throw new RangeError(message);
}
function aexists2(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("hash was destroyed");
  if (checkFinished && instance.finished)
    throw new Error("digest() was already called");
}
function aoutput2(out, instance) {
  abytes3(out, void 0, "output");
  const min = instance.outputLen;
  if (!(out.length >= min)) {
    throw new RangeError('"output" expected length >= ' + min);
  }
}
function aoutput32(out, instance) {
  aoutput2(out, instance);
  if (!isAligned32(out))
    throw new Error("invalid output, must be aligned");
}
function u8(arr) {
  return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean2(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView2(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
var swap8IfBE = isLE ? (n) => n : (n) => byteSwap(n) >>> 0;
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
var swap32IfBE = isLE ? (u) => u : byteSwap32;
function equalBytes(a, b) {
  a = abytes3(a);
  b = abytes3(b);
  if (a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++)
    diff |= a[i] ^ b[i];
  return diff === 0;
}
function wrapMacConstructor(keyLen, macCons, fromMsg) {
  const mac = macCons;
  const getArgs = fromMsg || (() => []);
  const macC = (msg, key) => mac(key, ...getArgs(msg)).update(msg).digest();
  const tmp = mac(new Uint8Array(keyLen), ...getArgs(new Uint8Array(0)));
  macC.outputLen = tmp.outputLen;
  macC.blockLen = tmp.blockLen;
  macC.create = (key, ...args) => mac(key, ...args);
  return macC;
}
var wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor) => {
  function wrappedCipher(key, ...args) {
    abytes3(key, void 0, "key");
    if (params.nonceLength !== void 0) {
      const nonce = args[0];
      abytes3(nonce, params.varSizeNonce ? void 0 : params.nonceLength, "nonce");
    }
    const tagl = params.tagLength;
    const aadStart = params.nonceLength !== void 0 ? 1 : 0;
    if (!params.withAAD) {
      for (let i = aadStart; i < args.length; i++)
        if (isBytes3(args[i]))
          throw new Error("AAD not supported");
    }
    if (params.withAAD && args[aadStart] !== void 0)
      abytes3(args[aadStart], void 0, "AAD");
    const cipher = constructor(key, ...args);
    const checkOutput = (fnLength, output) => {
      if (output !== void 0) {
        if (fnLength !== 2)
          throw new Error("cipher output not supported");
        abytes3(output, void 0, "output");
      }
    };
    let called = false;
    const wrCipher = {
      encrypt(data, output) {
        if (called)
          throw new Error("cannot encrypt() twice with same key + nonce");
        called = true;
        abytes3(data, void 0, "data");
        checkOutput(cipher.encrypt.length, output);
        return cipher.encrypt(data, output);
      },
      decrypt(data, output) {
        abytes3(data, void 0, "data");
        if (tagl && data.length < tagl)
          throw new Error('"ciphertext" expected length >= tagLength=' + tagl);
        checkOutput(cipher.decrypt.length, output);
        return cipher.decrypt(data, output);
      }
    };
    return wrCipher;
  }
  Object.assign(wrappedCipher, params);
  return wrappedCipher;
};
function getOutput(expectedLength, out, onlyAligned = true) {
  if (out === void 0)
    return new Uint8Array(expectedLength);
  abytes3(out, expectedLength, "output");
  if (onlyAligned && !isAligned32(out))
    throw new Error("invalid output, must be aligned");
  return out;
}
function u64Lengths(dataLength, aadLength, isLE2) {
  anumber3(dataLength);
  anumber3(aadLength);
  abool2(isLE2);
  const num = new Uint8Array(16);
  const view = createView2(num);
  view.setBigUint64(0, BigInt(aadLength), isLE2);
  view.setBigUint64(8, BigInt(dataLength), isLE2);
  return num;
}
function isAligned32(bytes) {
  return bytes.byteOffset % 4 === 0;
}
function copyBytes2(bytes) {
  return Uint8Array.from(abytes3(bytes));
}

// ../omega/node_modules/@noble/ciphers/_polyval.js
var BLOCK_SIZE = 16;
var ZEROS16 = /* @__PURE__ */ new Uint8Array(16);
var ZEROS32 = /* @__PURE__ */ u32(ZEROS16);
var POLY = 225;
var mul2 = (s0, s1, s2, s3) => {
  const hiBit = s3 & 1;
  return {
    s3: s2 << 31 | s3 >>> 1,
    s2: s1 << 31 | s2 >>> 1,
    s1: s0 << 31 | s1 >>> 1,
    // NIST SP 800-38D §6.3 applies `V >> 1` and XORs R on carry. In this
    // 4x32-bit split, R = 0xe1 || 0^120 lives in the top byte of s0.
    s0: s0 >>> 1 ^ POLY << 24 & -(hiBit & 1)
    // reduce % poly
  };
};
var swapLE = (n) => (n >>> 0 & 255) << 24 | (n >>> 8 & 255) << 16 | (n >>> 16 & 255) << 8 | n >>> 24 & 255 | 0;
var estimateWindow = (bytes) => {
  if (bytes > 64 * 1024)
    return 8;
  if (bytes > 1024)
    return 4;
  return 2;
};
var GHASH = class {
  blockLen = BLOCK_SIZE;
  outputLen = BLOCK_SIZE;
  s0 = 0;
  s1 = 0;
  s2 = 0;
  s3 = 0;
  finished = false;
  destroyed = false;
  t;
  W;
  windowSize;
  // We select bits per window adaptively based on expectedLength
  constructor(key, expectedLength) {
    abytes3(key, 16, "key");
    key = copyBytes2(key);
    const kView = createView2(key);
    let k0 = kView.getUint32(0, false);
    let k1 = kView.getUint32(4, false);
    let k2 = kView.getUint32(8, false);
    let k3 = kView.getUint32(12, false);
    const doubles = [];
    for (let i = 0; i < 128; i++) {
      doubles.push({ s0: swapLE(k0), s1: swapLE(k1), s2: swapLE(k2), s3: swapLE(k3) });
      ({ s0: k0, s1: k1, s2: k2, s3: k3 } = mul2(k0, k1, k2, k3));
    }
    const W = estimateWindow(expectedLength || 1024);
    if (![1, 2, 4, 8].includes(W))
      throw new Error("ghash: invalid window size, expected 2, 4 or 8");
    this.W = W;
    const bits = 128;
    const windows = bits / W;
    const windowSize = this.windowSize = 2 ** W;
    const items = [];
    for (let w = 0; w < windows; w++) {
      for (let byte = 0; byte < windowSize; byte++) {
        let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
        for (let j = 0; j < W; j++) {
          const bit = byte >>> W - j - 1 & 1;
          if (!bit)
            continue;
          const { s0: d0, s1: d1, s2: d2, s3: d3 } = doubles[W * w + j];
          s0 ^= d0, s1 ^= d1, s2 ^= d2, s3 ^= d3;
        }
        items.push({ s0, s1, s2, s3 });
      }
    }
    this.t = items;
  }
  _updateBlock(s0, s1, s2, s3) {
    s0 ^= this.s0, s1 ^= this.s1, s2 ^= this.s2, s3 ^= this.s3;
    const { W, t, windowSize } = this;
    let o0 = 0, o1 = 0, o2 = 0, o3 = 0;
    const mask = (1 << W) - 1;
    let w = 0;
    for (const num of [s0, s1, s2, s3]) {
      for (let bytePos = 0; bytePos < 4; bytePos++) {
        const byte = num >>> 8 * bytePos & 255;
        for (let bitPos = 8 / W - 1; bitPos >= 0; bitPos--) {
          const bit = byte >>> W * bitPos & mask;
          const { s0: e0, s1: e1, s2: e2, s3: e3 } = t[w * windowSize + bit];
          o0 ^= e0, o1 ^= e1, o2 ^= e2, o3 ^= e3;
          w += 1;
        }
      }
    }
    this.s0 = o0;
    this.s1 = o1;
    this.s2 = o2;
    this.s3 = o3;
  }
  update(data) {
    aexists2(this);
    abytes3(data);
    data = copyBytes2(data);
    const b32 = u32(data);
    const blocks = Math.floor(data.length / BLOCK_SIZE);
    const left = data.length % BLOCK_SIZE;
    for (let i = 0; i < blocks; i++) {
      this._updateBlock(swap8IfBE(b32[i * 4 + 0]), swap8IfBE(b32[i * 4 + 1]), swap8IfBE(b32[i * 4 + 2]), swap8IfBE(b32[i * 4 + 3]));
    }
    if (left) {
      ZEROS16.set(data.subarray(blocks * BLOCK_SIZE));
      this._updateBlock(swap8IfBE(ZEROS32[0]), swap8IfBE(ZEROS32[1]), swap8IfBE(ZEROS32[2]), swap8IfBE(ZEROS32[3]));
      clean2(ZEROS32);
    }
    return this;
  }
  destroy() {
    this.destroyed = true;
    const { t } = this;
    for (const elm of t) {
      elm.s0 = 0, elm.s1 = 0, elm.s2 = 0, elm.s3 = 0;
    }
  }
  digestInto(out) {
    aexists2(this);
    aoutput32(out, this);
    this.finished = true;
    const { s0, s1, s2, s3 } = this;
    const o32 = u32(out);
    o32[0] = s0;
    o32[1] = s1;
    o32[2] = s2;
    o32[3] = s3;
    if (!isLE)
      swap32IfBE(o32.subarray(0, BLOCK_SIZE / 4));
  }
  digest() {
    const res = new Uint8Array(BLOCK_SIZE);
    this.digestInto(res);
    this.destroy();
    return res;
  }
};
var ghash = /* @__PURE__ */ wrapMacConstructor(16, (key, expectedLength) => new GHASH(key, expectedLength), (msg) => [msg.length]);

// ../omega/node_modules/@noble/ciphers/aes.js
var BLOCK_SIZE2 = 16;
var BLOCK_SIZE32 = 4;
var EMPTY_BLOCK = /* @__PURE__ */ new Uint8Array(BLOCK_SIZE2);
var POLY2 = 283;
function validateKeyLength(key) {
  if (![16, 24, 32].includes(key.length))
    throw new Error('"aes key" expected Uint8Array of length 16/24/32, got length=' + key.length);
}
function mul22(n) {
  return n << 1 ^ POLY2 & -(n >> 7);
}
function mul(a, b) {
  let res = 0;
  for (; b > 0; b >>= 1) {
    res ^= a & -(b & 1);
    a = mul22(a);
  }
  return res;
}
var sbox = /* @__PURE__ */ (() => {
  const t = new Uint8Array(256);
  for (let i = 0, x = 1; i < 256; i++, x ^= mul22(x))
    t[i] = x;
  const box = new Uint8Array(256);
  box[0] = 99;
  for (let i = 0; i < 255; i++) {
    let x = t[255 - i];
    x |= x << 8;
    box[t[i]] = (x ^ x >> 4 ^ x >> 5 ^ x >> 6 ^ x >> 7 ^ 99) & 255;
  }
  clean2(t);
  return box;
})();
var rotr32_8 = (n) => n << 24 | n >>> 8;
var rotl32_8 = (n) => n << 8 | n >>> 24;
function genTtable(sbox2, fn) {
  if (sbox2.length !== 256)
    throw new Error("wrong sbox length");
  const T0 = new Uint32Array(256).map((_, j) => fn(sbox2[j]));
  const T1 = T0.map(rotl32_8);
  const T2 = T1.map(rotl32_8);
  const T3 = T2.map(rotl32_8);
  const T01 = new Uint32Array(256 * 256);
  const T23 = new Uint32Array(256 * 256);
  const sbox22 = new Uint16Array(256 * 256);
  for (let i = 0; i < 256; i++) {
    for (let j = 0; j < 256; j++) {
      const idx = i * 256 + j;
      T01[idx] = T0[i] ^ T1[j];
      T23[idx] = T2[i] ^ T3[j];
      sbox22[idx] = sbox2[i] << 8 | sbox2[j];
    }
  }
  return { sbox: sbox2, sbox2: sbox22, T0, T1, T2, T3, T01, T23 };
}
var tableEncoding = /* @__PURE__ */ genTtable(sbox, (s) => mul(s, 3) << 24 | s << 16 | s << 8 | mul(s, 2));
var xPowers = /* @__PURE__ */ (() => {
  const p = new Uint8Array(16);
  for (let i = 0, x = 1; i < 16; i++, x = mul22(x))
    p[i] = x;
  return p;
})();
function expandKeyLE(key) {
  abytes3(key);
  const len = key.length;
  validateKeyLength(key);
  const { sbox2 } = tableEncoding;
  const toClean = [];
  if (!isLE || !isAligned32(key))
    toClean.push(key = copyBytes2(key));
  const k32 = swap32IfBE(u32(key));
  const Nk = k32.length;
  const subByte = (n) => applySbox(sbox2, n, n, n, n);
  const xk = new Uint32Array(len + 28);
  xk.set(k32);
  for (let i = Nk; i < xk.length; i++) {
    let t = xk[i - 1];
    if (i % Nk === 0)
      t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1];
    else if (Nk > 6 && i % Nk === 4)
      t = subByte(t);
    xk[i] = xk[i - Nk] ^ t;
  }
  clean2(...toClean);
  return xk;
}
function apply0123(T01, T23, s0, s1, s2, s3) {
  return T01[s0 << 8 & 65280 | s1 >>> 8 & 255] ^ T23[s2 >>> 8 & 65280 | s3 >>> 24 & 255];
}
function applySbox(sbox2, s0, s1, s2, s3) {
  return sbox2[s0 & 255 | s1 & 65280] | sbox2[s2 >>> 16 & 255 | s3 >>> 16 & 65280] << 16;
}
function encrypt(xk, s0, s1, s2, s3) {
  const { sbox2, T01, T23 } = tableEncoding;
  let k = 0;
  s0 ^= xk[k++], s1 ^= xk[k++], s2 ^= xk[k++], s3 ^= xk[k++];
  const rounds = xk.length / 4 - 2;
  for (let i = 0; i < rounds; i++) {
    const t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3);
    const t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0);
    const t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1);
    const t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
    s0 = t02, s1 = t12, s2 = t22, s3 = t32;
  }
  const t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3);
  const t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0);
  const t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1);
  const t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
  return { s0: t0, s1: t1, s2: t2, s3: t3 };
}
function ctr32(xk, isLE2, nonce, src, dst) {
  abytes3(nonce, BLOCK_SIZE2, "nonce");
  abytes3(src);
  dst = getOutput(src.length, dst);
  const ctr = nonce;
  const c32 = u32(ctr);
  const view = createView2(ctr);
  const src32 = u32(src);
  const dst32 = u32(dst);
  const ctrPos = isLE2 ? 0 : 12;
  const srcLen = src.length;
  let ctrNum = view.getUint32(ctrPos, isLE2);
  for (let i = 0; i + 4 <= src32.length; i += 4) {
    const { s0, s1, s2, s3 } = encrypt(xk, swap8IfBE(c32[0]), swap8IfBE(c32[1]), swap8IfBE(c32[2]), swap8IfBE(c32[3]));
    dst32[i + 0] = src32[i + 0] ^ swap8IfBE(s0);
    dst32[i + 1] = src32[i + 1] ^ swap8IfBE(s1);
    dst32[i + 2] = src32[i + 2] ^ swap8IfBE(s2);
    dst32[i + 3] = src32[i + 3] ^ swap8IfBE(s3);
    ctrNum = ctrNum + 1 >>> 0;
    view.setUint32(ctrPos, ctrNum, isLE2);
  }
  const start = BLOCK_SIZE2 * Math.floor(src32.length / BLOCK_SIZE32);
  if (start < srcLen) {
    const { s0, s1, s2, s3 } = encrypt(xk, swap8IfBE(c32[0]), swap8IfBE(c32[1]), swap8IfBE(c32[2]), swap8IfBE(c32[3]));
    const b32 = new Uint32Array([s0, s1, s2, s3]);
    swap32IfBE(b32);
    const buf = u8(b32);
    for (let i = start, pos = 0; i < srcLen; i++, pos++)
      dst[i] = src[i] ^ buf[pos];
    clean2(b32);
  }
  return dst;
}
function computeTag(fn, isLE2, key, data, AAD) {
  const aadLength = AAD ? AAD.length : 0;
  const h = fn.create(key, data.length + aadLength);
  if (AAD)
    h.update(AAD);
  const num = u64Lengths(8 * data.length, 8 * aadLength, isLE2);
  h.update(data);
  h.update(num);
  const res = h.digest();
  clean2(num);
  return res;
}
var gcm = /* @__PURE__ */ wrapCipher({ blockSize: 16, nonceLength: 12, tagLength: 16, withAAD: true, varSizeNonce: true }, function aesgcm(key, nonce, AAD) {
  if (nonce.length < 8)
    throw new Error("aes/gcm: invalid nonce length");
  const tagLength = 16;
  function _computeTag(authKey, tagMask, data) {
    const tag = computeTag(ghash, false, authKey, data, AAD);
    for (let i = 0; i < tagMask.length; i++)
      tag[i] ^= tagMask[i];
    return tag;
  }
  function deriveKeys() {
    const xk = expandKeyLE(key);
    const authKey = EMPTY_BLOCK.slice();
    const counter = EMPTY_BLOCK.slice();
    ctr32(xk, false, counter, counter, authKey);
    if (nonce.length === 12) {
      counter.set(nonce);
    } else {
      const nonceLen = EMPTY_BLOCK.slice();
      const view = createView2(nonceLen);
      view.setBigUint64(8, BigInt(nonce.length * 8), false);
      const g2 = ghash.create(authKey).update(nonce).update(nonceLen);
      g2.digestInto(counter);
      g2.destroy();
    }
    const tagMask = ctr32(xk, false, counter, EMPTY_BLOCK);
    return { xk, authKey, counter, tagMask };
  }
  return {
    encrypt(plaintext) {
      const { xk, authKey, counter, tagMask } = deriveKeys();
      const out = new Uint8Array(plaintext.length + tagLength);
      const toClean = [xk, authKey, counter, tagMask];
      if (!isAligned32(plaintext))
        toClean.push(plaintext = copyBytes2(plaintext));
      ctr32(xk, false, counter, plaintext, out.subarray(0, plaintext.length));
      const tag = _computeTag(authKey, tagMask, out.subarray(0, out.length - tagLength));
      toClean.push(tag);
      out.set(tag, plaintext.length);
      clean2(...toClean);
      return out;
    },
    decrypt(ciphertext) {
      const { xk, authKey, counter, tagMask } = deriveKeys();
      const toClean = [xk, authKey, tagMask, counter];
      if (!isAligned32(ciphertext))
        toClean.push(ciphertext = copyBytes2(ciphertext));
      const data = ciphertext.subarray(0, -tagLength);
      const passedTag = ciphertext.subarray(-tagLength);
      const tag = _computeTag(authKey, tagMask, data);
      toClean.push(tag);
      if (!equalBytes(tag, passedTag)) {
        clean2(...toClean);
        throw new Error("aes-gcm: invalid tag");
      }
      const out = ctr32(xk, false, counter, data);
      clean2(...toClean);
      return out;
    }
  };
});

// ../omega/node_modules/@noble/hashes/hmac.js
var _HMAC = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  canXOF = false;
  finished = false;
  destroyed = false;
  constructor(hash, key) {
    ahash(hash);
    abytes(key, void 0, "key");
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("expected Hash instance");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54;
    this.iHash.update(pad);
    this.oHash = hash.create();
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54 ^ 92;
    this.oHash.update(pad);
    clean(pad);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const buf = out.subarray(0, this.outputLen);
    this.iHash.digestInto(buf);
    this.oHash.update(buf);
    this.oHash.digestInto(buf);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.canXOF = canXOF;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = /* @__PURE__ */ (() => {
  const hmac_ = (hash, key, message) => new _HMAC(hash, key).update(message).digest();
  hmac_.create = (hash, key) => new _HMAC(hash, key);
  return hmac_;
})();

// ../omega/node_modules/@noble/hashes/hkdf.js
var HKDF_COUNTER = /* @__PURE__ */ Uint8Array.of(0);
var EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();
function expand(hash, prk, info, length = 32, _recycled) {
  ahash(hash);
  anumber(length, "length");
  abytes(prk, void 0, "prk");
  const olen = hash.outputLen;
  if (prk.length < olen)
    throw new Error('"prk" must be at least HashLen octets');
  if (length > 255 * olen)
    throw new Error("Length must be <= 255*HashLen");
  const blocks = Math.ceil(length / olen);
  if (info === void 0)
    info = EMPTY_BUFFER;
  else
    abytes(info, void 0, "info");
  if (!blocks) {
    if (_recycled)
      clean(prk);
    return new Uint8Array();
  }
  const okm = _recycled && blocks === 1 ? prk : new Uint8Array(blocks * olen);
  const { iHash, oHash } = hmac.create(hash, prk);
  const T = _recycled ? prk : new Uint8Array(olen);
  const worker = blocks > 1 ? _recycled?.iHash || hash.create() : void 0;
  for (let counter = 0; counter < blocks - 1; counter++) {
    HKDF_COUNTER[0] = counter + 1;
    const iWork = iHash._cloneInto(worker);
    if (counter)
      iWork.update(T);
    iWork.update(info).update(HKDF_COUNTER).digestInto(T);
    oHash._cloneInto(worker).update(T).digestInto(T);
    okm.set(T, olen * counter);
  }
  HKDF_COUNTER[0] = blocks;
  if (blocks > 1)
    iHash.update(T);
  iHash.update(info).update(HKDF_COUNTER).digestInto(T);
  oHash.update(T).digestInto(T);
  okm.set(T, olen * (blocks - 1));
  iHash.destroy();
  oHash.destroy();
  worker?.destroy();
  if (T !== okm)
    clean(T);
  clean(HKDF_COUNTER);
  if (length === okm.length)
    return okm;
  const res = okm.slice(0, length);
  clean(okm);
  return res;
}
var hkdf = (hash, ikm, salt, info, length) => {
  ahash(hash);
  if (salt === void 0)
    salt = new Uint8Array(hash.outputLen);
  const HMAC = hmac.create(hash, salt).update(ikm);
  return expand(hash, HMAC.digest(), info, length, HMAC);
};

// ../omega/packages/trnn-core/src/genome/record.ts
var GENOME_VERSION = 2;
function leafBytes(header, sealed) {
  return utf8(canonicalJson({ header, sealed }));
}
function deriveKey(master, id) {
  return hkdf(sha256, master, utf8("genome-v2-salt"), utf8(`record:${id}`), 32);
}
function nonceFor(id, recordedAt) {
  return sha256(utf8(`nonce:${id}:${recordedAt}`)).slice(0, 12);
}
var GenomeLedger = class {
  constructor(logId, master, signer) {
    this.logId = logId;
    this.master = master;
    this.signer = signer;
    if (master.length !== 32) throw new RangeError("master key must be 32 bytes");
  }
  log = new MerkleLog();
  records = /* @__PURE__ */ new Map();
  order = [];
  keys = /* @__PURE__ */ new Map();
  shredded = /* @__PURE__ */ new Set();
  /** id → id that supersedes it. */
  successor = /* @__PURE__ */ new Map();
  get size() {
    return this.order.length;
  }
  /** Seal and append a new record. Ids are unique and never reused. */
  append(input) {
    if (this.records.has(input.id)) throw new Error(`duplicate record id ${input.id}`);
    return this.write(input, null, null);
  }
  /**
   * Correct an existing record: the old body stays sealed and reachable, and a
   * new record supersedes it. Requires a non-empty reason.
   */
  correct(targetId, newBody, opts) {
    const target = this.records.get(targetId);
    if (!target) throw new Error(`unknown record ${targetId}`);
    if (this.successor.has(targetId)) {
      throw new Error(`record ${targetId} is already superseded by ${this.successor.get(targetId)}`);
    }
    const reason = opts.reason.trim();
    if (reason.length === 0) throw new Error("correction requires a reason");
    const rec = this.write({
      id: opts.id,
      kind: target.header.kind,
      body: newBody,
      recordedAt: opts.recordedAt,
      validFrom: opts.validFrom ?? target.header.validFrom,
      validTo: opts.validTo ?? null,
      provenance: {
        ...opts.provenance,
        derivedFrom: [...opts.provenance.derivedFrom ?? [], targetId]
      }
    }, targetId, reason);
    this.successor.set(targetId, opts.id);
    return rec;
  }
  write(input, supersedes, reason) {
    const header = {
      version: GENOME_VERSION,
      id: input.id,
      kind: input.kind,
      recordedAt: input.recordedAt,
      validFrom: input.validFrom ?? input.recordedAt,
      validTo: input.validTo ?? null,
      provenance: input.provenance,
      supersedes,
      correctionReason: reason
    };
    const key = deriveKey(this.master, input.id);
    const nonce = nonceFor(input.id, header.recordedAt);
    const aad = utf8(canonicalJson(header));
    const ct = gcm(key, nonce, aad).encrypt(utf8(canonicalJson(input.body)));
    const packed = new Uint8Array(nonce.length + ct.length);
    packed.set(nonce, 0);
    packed.set(ct, nonce.length);
    const sealed = bytesToBase64(packed);
    const bytes = leafBytes(header, sealed);
    const leafIndex = this.log.append(bytes);
    const rec = {
      header,
      sealed,
      leafIndex,
      leafHex: toHex(this.log.leafHash(leafIndex))
    };
    this.records.set(input.id, rec);
    this.keys.set(input.id, key);
    this.order.push(input.id);
    return rec;
  }
  get(id) {
    return this.records.get(id) ?? null;
  }
  /** Open a sealed body. Returns null when the record was crypto-shredded. */
  open(id) {
    const rec = this.records.get(id);
    if (!rec) return null;
    const key = this.keys.get(id);
    if (!key || this.shredded.has(id)) return null;
    const packed = base64ToBytes(rec.sealed);
    const nonce = packed.slice(0, 12);
    const ct = packed.slice(12);
    const aad = utf8(canonicalJson(rec.header));
    const pt = gcm(key, nonce, aad).decrypt(ct);
    return JSON.parse(fromUtf8(pt));
  }
  /**
   * Crypto-shred: destroy the record's data key. The ciphertext and its ledger
   * leaf survive, so the log stays consistent and the deletion is itself
   * provable — but the plaintext is gone for everyone, including us.
   */
  shred(id) {
    if (!this.records.has(id)) return false;
    const k = this.keys.get(id);
    if (k) k.fill(0);
    this.keys.delete(id);
    this.shredded.add(id);
    return true;
  }
  isShredded(id) {
    return this.shredded.has(id);
  }
  /** The record that currently stands for `id`, following supersessions. */
  current(id) {
    let cur = id;
    const seen = /* @__PURE__ */ new Set([cur]);
    for (let d = 0; d < 4096; d++) {
      const next = this.successor.get(cur);
      if (!next || seen.has(next)) break;
      seen.add(next);
      cur = next;
    }
    return this.records.get(cur) ?? null;
  }
  /**
   * Ancestors of a record via provenance.derivedFrom, breadth-first.
   * Cycle-guarded and depth-capped: a malformed graph degrades to a short
   * answer, never to a hang.
   */
  lineage(id, maxDepth = 64) {
    const out = [];
    const seen = /* @__PURE__ */ new Set([id]);
    let frontier = [id];
    for (let d = 0; d < maxDepth && frontier.length > 0; d++) {
      const next = [];
      for (const cur of frontier) {
        const rec = this.records.get(cur);
        for (const p of rec?.header.provenance.derivedFrom ?? []) {
          if (seen.has(p)) continue;
          seen.add(p);
          out.push(p);
          next.push(p);
        }
      }
      frontier = next;
    }
    return out;
  }
  /** Records whose valid-time interval covers `t` and that are not superseded. */
  validAt(t) {
    return this.order.map((id) => this.records.get(id)).filter((r) => !this.successor.has(r.header.id) && r.header.validFrom <= t && (r.header.validTo === null || t < r.header.validTo));
  }
  rootHex(size = this.log.size) {
    return toHex(this.log.root(size));
  }
  /** Signed head over the current log. */
  head(timestamp) {
    return signTreeHead(
      { logId: this.logId, size: this.log.size, rootHex: this.rootHex(), timestamp },
      this.signer
    );
  }
  /** Everything a third party needs to check that a record is in this log. */
  prove(id, timestamp) {
    const rec = this.records.get(id);
    if (!rec) return null;
    const size = this.log.size;
    return {
      leafIndex: rec.leafIndex,
      treeSize: size,
      rootHex: this.rootHex(size),
      proofHex: this.log.inclusionProof(rec.leafIndex, size).map(toHex),
      sth: this.head(timestamp)
    };
  }
  /**
   * Inclusion proof for a raw leaf index, independent of any record we hold.
   * An auditor checking a CLAIMED record needs this: the claim supplies the
   * index and the bytes, and the log supplies only the path.
   */
  inclusionProofAt(index, size = this.log.size) {
    if (!Number.isInteger(index) || index < 0 || index >= size) return null;
    return this.log.inclusionProof(index, size).map(toHex);
  }
  /** Consistency proof between an earlier head size and the current one. */
  proveAppendOnly(oldSize) {
    return this.log.consistencyProof(oldSize, this.log.size).map(toHex);
  }
  /**
   * Full self-audit: every record's leaf recomputes from its header+ciphertext,
   * its inclusion proof verifies against the current root, and the signed head
   * verifies under the log's public key.
   */
  audit(timestamp) {
    const failures = [];
    const size = this.log.size;
    const root = this.log.root(size);
    for (const id of this.order) {
      const rec = this.records.get(id);
      const leaf = this.log.leafHash(rec.leafIndex);
      if (!leaf || toHex(leaf) !== rec.leafHex) {
        failures.push(`${id}: leaf hash mismatch`);
        continue;
      }
      const proof = this.log.inclusionProof(rec.leafIndex, size);
      if (!verifyInclusion(leaf, rec.leafIndex, size, proof, root)) failures.push(`${id}: inclusion proof failed`);
    }
    if (!verifyTreeHead(this.head(timestamp), this.signer.publicKey)) failures.push("signed head failed to verify");
    return { ok: failures.length === 0, checked: this.order.length, failures };
  }
};

// ../omega/packages/trnn-core/src/sweeps/tenSweep.ts
var SWEEP_NAMES = Object.freeze({
  1: "intake_replay",
  2: "hdc_binding",
  3: "temporal_stamping",
  4: "contradiction_pass",
  5: "prototype_consolidation",
  6: "causal_attribution",
  7: "cross_level_rescoring",
  8: "adversarial_red_team",
  9: "governor_compression",
  10: "reflective_synthesis"
});
var LONG_GAP_SWEEPS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
var SHORT_GAP_SWEEPS = Object.freeze([8, 9, 10]);
var Corpus = class {
  items = [];
  add(item) {
    this.items.push(item);
    return item;
  }
  byId() {
    const m = /* @__PURE__ */ new Map();
    for (const it of this.items) m.set(it.id, it);
    return m;
  }
  /** Items still open in valid-time and not superseded, in insertion order. */
  open() {
    return this.items.filter((i) => i.validTo === null && i.supersededBy === null);
  }
};
function sweepSchedule(cycles = 1, start = 0) {
  const rungs = heartbeatSchedule(cycles + 1, start).map((r) => r.tick);
  const out = [];
  const limit = start + cycles * LUCAS_MOD13_PERIOD;
  for (let i = 0; i < rungs.length - 1; i++) {
    const tick = rungs[i];
    if (tick >= limit) break;
    const opens = rungs[i + 1] - tick === 2 ? "short" : "long";
    out.push({ tick, opens, sweeps: opens === "long" ? LONG_GAP_SWEEPS : SHORT_GAP_SWEEPS });
  }
  return out;
}
function sweep1IntakeReplay(corpus, ledger) {
  let replayed = 0;
  let shredded = 0;
  const failures = [];
  for (const it of corpus.items) {
    const rec = ledger.get(it.id);
    if (!rec) {
      failures.push(`${it.id}: not in ledger`);
      it.trust = damp(it.trust);
      continue;
    }
    if (ledger.isShredded(it.id)) {
      shredded++;
      continue;
    }
    let body;
    try {
      body = ledger.open(it.id);
    } catch {
      failures.push(`${it.id}: envelope failed to authenticate`);
      it.trust = damp(it.trust);
      continue;
    }
    if (body === null) {
      failures.push(`${it.id}: body unreadable`);
      it.trust = damp(it.trust);
      continue;
    }
    replayed++;
  }
  return { total: corpus.items.length, replayed, shredded, failures };
}
function damp(t) {
  return Number.isFinite(t) ? Math.max(0, t * PHI_INV) : NaN;
}
function sweep2HdcBinding(corpus, opts = {}) {
  const kind = opts.kind ?? "Episode";
  const fanIn = Math.max(1, Math.floor(opts.fanIn ?? CLEANUP_FAN_IN));
  const members = corpus.items.filter((i) => i.kind === kind && i.validTo === null);
  if (members.length === 0) {
    return { members: 0, bundles: 0, fanIn, recalled: 0, probed: 0, abstained: 0 };
  }
  const dim = members[0].vector.length;
  const cleanup = new CleanupMemory(dim, fanIn, opts.zFloor ?? 5);
  const bundles = Math.ceil(members.length / fanIn);
  members.forEach((m, i) => cleanup.add(`bundle:${Math.floor(i / fanIn)}`, m.vector));
  let recalled = 0;
  let abstained = 0;
  members.forEach((m, i) => {
    const hit = cleanup.query(m.vector);
    if (hit === null) {
      abstained++;
      return;
    }
    if (hit.label === `bundle:${Math.floor(i / fanIn)}`) recalled++;
  });
  return { members: members.length, bundles, fanIn, recalled, probed: members.length, abstained };
}
function sweep3TemporalStamping(corpus, now2) {
  let backfilled = 0;
  let closed = 0;
  const inverted = [];
  for (const it of corpus.items) {
    if (it.validFrom === null) {
      it.validFrom = it.recordedAt;
      backfilled++;
    }
    if (it.supersededBy !== null && it.validTo === null) {
      it.validTo = now2;
      closed++;
    }
    if (it.validTo !== null && it.validFrom !== null && it.validTo < it.validFrom) inverted.push(it.id);
  }
  return {
    backfilled,
    closed,
    openRecords: corpus.items.filter((i) => i.validTo === null).length,
    inverted
  };
}
function sweep4ContradictionPass(corpus) {
  const byId = corpus.byId();
  const seen = /* @__PURE__ */ new Set();
  let pairs = 0;
  let resolved = 0;
  const escalated = [];
  const dangling = [];
  for (const it of corpus.items) {
    for (const otherId of it.contradicts) {
      const other = byId.get(otherId);
      if (!other) {
        dangling.push(`${it.id}\u2192${otherId}`);
        continue;
      }
      const key = it.id < otherId ? `${it.id}|${otherId}` : `${otherId}|${it.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs++;
      const a = score(it);
      const b = score(other);
      if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) <= 1e-9) {
        escalated.push(it.id < otherId ? [it.id, otherId] : [otherId, it.id]);
        continue;
      }
      const loser = a > b ? other : it;
      loser.trust = damp(loser.trust);
      resolved++;
    }
  }
  return { pairs, resolved, escalated, dangling };
}
function score(it) {
  return it.trust * (it.validTo === null ? 1 : PHI_INV);
}
function sweep5PrototypeConsolidation(corpus, ledger, opts) {
  const kinds = new Set(opts.kinds ?? ["FactChunk", "Episode", "Prototype"]);
  const threshold = opts.threshold ?? CONSOLIDATION_COS;
  const candidates = corpus.items.filter(
    (i) => kinds.has(i.kind) && i.validTo === null && i.supersededBy === null
  );
  const keep = [];
  const memberIds = /* @__PURE__ */ new Map();
  const prototypeIds = [];
  let merged = 0;
  for (const it of candidates) {
    let target = null;
    for (const p of keep) {
      const s = similarity(it.vector, p.vector);
      if (Number.isFinite(s) && s >= threshold) {
        target = p;
        break;
      }
    }
    if (target === null) {
      keep.push(it);
      memberIds.set(it.id, [it.id]);
      continue;
    }
    const members = [...memberIds.get(target.id) ?? [target.id], it.id];
    const protoId = `proto:${members[0]}:${members.length}`;
    const hv = bundle([target.vector, it.vector]).hv;
    ledger.append({
      id: protoId,
      kind: "Prototype",
      body: { members },
      recordedAt: opts.now,
      provenance: {
        attributedTo: opts.attributedTo,
        generatedBy: "sweep5:prototype_consolidation",
        derivedFrom: [target.id, it.id],
        evidence: "derived"
      }
    });
    target.validTo = opts.now;
    target.supersededBy = protoId;
    it.validTo = opts.now;
    it.supersededBy = protoId;
    const proto = {
      id: protoId,
      kind: "Prototype",
      vector: hv,
      trust: Math.max(finite(target.trust), finite(it.trust)),
      contradicts: [],
      recordedAt: opts.now,
      validFrom: opts.now,
      validTo: null,
      supersededBy: null
    };
    corpus.add(proto);
    keep.splice(keep.indexOf(target), 1, proto);
    memberIds.set(protoId, members);
    prototypeIds.push(protoId);
    merged++;
  }
  let residual = 0;
  for (let i = 0; i < keep.length; i++) {
    for (let j = i + 1; j < keep.length; j++) {
      const s = similarity(keep[i].vector, keep[j].vector);
      if (Number.isFinite(s) && s > residual) residual = s;
    }
  }
  return {
    candidates: candidates.length,
    merged,
    survivors: keep.length,
    prototypeIds,
    residualCos: keep.length > 1 ? residual : null
  };
}
function finite(x) {
  return Number.isFinite(x) ? x : 0;
}
function sweep6CausalAttribution(estimates = {}, minPaired = MIN_PAIRED) {
  const thetas = {};
  const abstained = [];
  const malformed = [];
  const keys = Object.keys(estimates).sort();
  for (const k of keys) {
    const e = estimates[k];
    if (!Number.isFinite(e.theta) || !Number.isFinite(e.se) || e.se < 0) {
      malformed.push(k);
      continue;
    }
    if (!Number.isFinite(e.n) || e.n < minPaired) {
      abstained.push(k);
      continue;
    }
    thetas[k] = e.theta;
  }
  return { decisionTypes: keys.length, spoke: Object.keys(thetas).length, abstained, thetas, malformed };
}
function sweep7CrossLevelRescoring(inputs) {
  let measured = 0, abstained = 0, gated = 0, dead = 0;
  let sum = 0, min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
  for (const it of inputs) {
    const r = fuseResonance(it.channels, { phaseDev: it.phaseDev, coherence: it.coherence });
    if (r.gated) gated++;
    if (r.dead) dead++;
    if (!Number.isFinite(r.value)) {
      abstained++;
      continue;
    }
    measured++;
    sum += r.value;
    if (r.value < min) min = r.value;
    if (r.value > max) max = r.value;
  }
  return {
    items: inputs.length,
    measured,
    abstained,
    gated,
    dead,
    rMean: measured > 0 ? sum / measured : null,
    rMin: measured > 0 ? min : null,
    rMax: measured > 0 ? max : null
  };
}
function sweep8RedTeam(corpus, ledger, forgeries, timestamp) {
  let genuine = 0;
  let genuineVerified = 0;
  for (const it of corpus.items) {
    const rec = ledger.get(it.id);
    if (!rec) continue;
    genuine++;
    const ev = ledger.prove(it.id, timestamp);
    if (!ev) continue;
    const leaf = hashLeaf(leafBytes(rec.header, rec.sealed));
    if (verifyInclusion(leaf, ev.leafIndex, ev.treeSize, ev.proofHex.map(fromHex2), fromHex2(ev.rootHex))) {
      genuineVerified++;
    }
  }
  const accepted = [];
  const size = ledger.size;
  const root = fromHex2(ledger.rootHex());
  for (const f of forgeries) {
    const leaf = hashLeaf(leafBytes(f.header, f.sealed));
    const proof = ledger.inclusionProofAt(f.leafIndex, size);
    if (!proof) continue;
    if (verifyInclusion(leaf, f.leafIndex, size, proof.map(fromHex2), root)) accepted.push(f.label);
  }
  return { genuine, genuineVerified, attempted: forgeries.length, accepted };
}
function fromHex2(hex) {
  const out = new Uint8Array(hex.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function sweep9GovernorCompression(corpus, usage, budget) {
  const total = Object.values(usage).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  const bounded = Number.isFinite(budget);
  const overBudget = bounded && total > budget;
  const plan = [];
  let projected = total;
  if (overBudget) {
    const perItem = corpus.items.length > 0 ? total / corpus.items.length : 0;
    const order = corpus.items.slice().sort((a, b) => {
      const ta = Number.isFinite(a.trust) ? a.trust : -1;
      const tb = Number.isFinite(b.trust) ? b.trust : -1;
      if (ta !== tb) return ta - tb;
      if (a.recordedAt !== b.recordedAt) return a.recordedAt - b.recordedAt;
      return a.id < b.id ? -1 : 1;
    });
    for (const it of order) {
      if (projected <= budget || perItem <= 0) break;
      plan.push(it.id);
      projected -= perItem;
    }
  }
  return { usage, total, budget: bounded ? budget : null, overBudget, evictionPlan: plan, projected };
}
function sweep10Reflection(reports, now2) {
  return {
    sweepsOk: reports.filter((r) => r.ok).length,
    sweepsTotal: reports.length,
    failed: reports.filter((r) => !r.ok).map((r) => `${r.n}:${r.name}`),
    ts: now2
  };
}
var TenSweepProtocol = class {
  constructor(ledger, owner = "metatron/sweeps") {
    this.ledger = ledger;
    this.owner = owner;
  }
  cycle = 0;
  /** Run one full ten-sweep cycle. Failing sweeps are sealed, not skipped. */
  run(corpus, inputs) {
    const sealedFrom = this.ledger.size;
    const reports = [];
    const c = this.cycle++;
    const at2 = inputs.now;
    const go = (n, metric, verdict) => {
      const sealId = `sweep:${c}:${n}`;
      const rec = this.ledger.append({
        id: sealId,
        kind: "SweepSeal",
        body: { sweep: n, name: SWEEP_NAMES[n], metric, ok: verdict.ok, reason: verdict.reason },
        recordedAt: at2,
        provenance: {
          attributedTo: this.owner,
          generatedBy: `sweep${n}:${SWEEP_NAMES[n]}`,
          evidence: "measured"
        }
      });
      reports.push({
        n,
        name: SWEEP_NAMES[n],
        metric,
        ok: verdict.ok,
        reason: verdict.reason,
        sealId,
        leafIndex: rec.leafIndex
      });
    };
    const m1 = sweep1IntakeReplay(corpus, this.ledger);
    go(1, m1, check(
      m1.replayed + m1.shredded === m1.total,
      `${m1.failures.length} envelope failure(s)`
    ));
    const m2 = sweep2HdcBinding(corpus, { kind: inputs.bindKind, fanIn: inputs.fanIn });
    go(2, m2, check(
      m2.probed === 0 || m2.recalled === m2.probed,
      `recall ${m2.recalled}/${m2.probed} (${m2.abstained} abstained)`
    ));
    const m3 = sweep3TemporalStamping(corpus, at2);
    go(3, m3, check(m3.inverted.length === 0, `${m3.inverted.length} inverted interval(s)`));
    const m4 = sweep4ContradictionPass(corpus);
    go(4, m4, check(
      m4.escalated.length === 0 && m4.dangling.length === 0,
      `${m4.escalated.length} escalated, ${m4.dangling.length} dangling`
    ));
    const m5 = sweep5PrototypeConsolidation(corpus, this.ledger, {
      now: at2,
      attributedTo: this.owner
    });
    go(5, m5, check(
      m5.residualCos === null || m5.residualCos < CONSOLIDATION_COS,
      `residual cos ${(m5.residualCos ?? NaN).toFixed(6)} \u2265 threshold: pass is not idempotent`
    ));
    const m6 = sweep6CausalAttribution(inputs.effectEstimates);
    go(6, m6, check(m6.malformed.length === 0, `${m6.malformed.length} malformed estimate(s)`));
    const m7 = sweep7CrossLevelRescoring(inputs.rescore ?? []);
    go(7, m7, check(
      m7.items === 0 || m7.measured > 0,
      "every item abstained: no cross-level evidence at all"
    ));
    const m8 = sweep8RedTeam(corpus, this.ledger, inputs.forgeries ?? [], at2);
    go(8, m8, check(
      m8.accepted.length === 0 && m8.genuineVerified === m8.genuine,
      `${m8.accepted.length} forgery accepted, ${m8.genuine - m8.genuineVerified} genuine rejected`
    ));
    const m9 = sweep9GovernorCompression(
      corpus,
      inputs.usage ?? { atoms: corpus.items.length },
      inputs.budget ?? Number.POSITIVE_INFINITY
    );
    go(9, m9, check(
      !m9.overBudget || m9.projected <= (m9.budget ?? Number.POSITIVE_INFINITY),
      `no eviction plan reaches budget (${m9.projected} > ${m9.budget})`
    ));
    const m10 = sweep10Reflection(reports, at2);
    go(10, m10, check(
      m10.sweepsOk === m10.sweepsTotal,
      `failed sweeps: ${m10.failed.join(", ")}`
    ));
    return {
      reports,
      ok: reports.every((r) => r.ok),
      sealedFrom,
      sealedTo: this.ledger.size
    };
  }
  /** Schedule for `cycles` heartbeat cycles from `start`. */
  static schedule(cycles = 1, start = 0) {
    return sweepSchedule(cycles, start);
  }
};
function check(ok, reason) {
  return { ok, reason: ok ? null : reason };
}

// ../omega/packages/trnn-core/src/harness/golden.ts
var ABSTAIN_MARK = Number.NaN;
function statValues(rs) {
  const out = [];
  for (const r of rs) {
    out.push(r.value === null ? ABSTAIN_MARK : r.value);
    out.push(r.abstained ? 1 : 0);
    out.push(r.n);
  }
  return out;
}
function coupledPair(n, seed) {
  const s = new SeedStream(seed);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const drive = dsin(i / PHI) + 0.35 * s.signed();
    x[i] = drive;
    prev = 0.55 * prev + 0.45 * (i > 0 ? x[i - 1] : 0) + 0.2 * s.signed();
    y[i] = prev;
  }
  return { x, y };
}
var GOLDEN_CASES = [
  {
    id: "substrate-parity",
    guards: "the Class-A \u03C6 identities and the Lucas-mod-13 heartbeat",
    run: () => {
      const v = [];
      for (const p of substrateParity()) {
        v.push(p.ok ? 1 : 0, Number(new Digest().text(p.name).text(p.detail).value() & 0xffffffffn));
      }
      v.push(...metatronSpectrum(), ...heartbeatGaps(), ...stableRungsMod28());
      for (let n = 1; n <= 13; n++) v.push(pisotDefect(n));
      return v;
    }
  },
  {
    id: "coherence-kernel",
    guards: "the innovation-form C(t) roots and its finite-d bias correction",
    run: () => {
      const [r1, r2] = kernelRoots();
      const v = [r1, r2];
      for (const d of [4, 8, 16, 28]) v.push(analyticExpectedC(1, d, 1), expectedCBias(d, 1));
      return v;
    }
  },
  {
    id: "correlation-family",
    guards: "all six Level-2 statistics on one coupled pair",
    run: () => {
      const { x, y } = coupledPair(233, "golden/corr");
      return statValues([
        pearson(x, y),
        spearman(x, y),
        kendallTauB(x, y),
        distanceCorrelation(x, y),
        hsic(x, y),
        gaussianMI(x, y)
      ]);
    }
  },
  {
    id: "correlation-underfloor",
    guards: "the F9 sample floor: every member abstains, none returns 0",
    run: () => {
      const { x, y } = coupledPair(21, "golden/corr-small");
      return statValues([
        pearson(x, y),
        spearman(x, y),
        kendallTauB(x, y),
        distanceCorrelation(x, y),
        hsic(x, y),
        gaussianMI(x, y)
      ]);
    }
  },
  {
    id: "causal-layer",
    guards: "Granger F/p and Gaussian transfer entropy at lags 1..3",
    run: () => {
      const { x, y } = coupledPair(377, "golden/causal");
      const v = [];
      for (const lag of [1, 2, 3]) {
        const g2 = grangerCausality(x, y, lag);
        const t = transferEntropyGaussian(x, y, lag);
        v.push(g2.value ?? ABSTAIN_MARK, g2.p ?? ABSTAIN_MARK, g2.n, g2.lag);
        v.push(t.value ?? ABSTAIN_MARK, t.p ?? ABSTAIN_MARK);
      }
      return v;
    }
  },
  {
    id: "resonance-bus",
    guards: "the fusion law, the \u03B3 factor, the veto and the coherence gate",
    run: () => {
      const chans = [
        { id: "a", value: 0.9 },
        { id: "b", value: 0.6 },
        { id: "c", value: 0.34 }
      ];
      const phases = [0.1, 0.2, 0.12, 0.31, 0.05];
      const dev = circularPhaseDev(phases);
      const g2 = phaseClosureGamma(dev);
      const plain = fuseResonance(chans);
      const withGamma = fuseResonance(chans, { phaseDev: dev });
      const vetoed = fuseResonance([...chans, { id: "dead", value: 0 }], { phaseDev: dev });
      const abstaining = fuseResonance([...chans, { id: "unknown", value: NaN }]);
      const gated = fuseResonance(chans, { coherence: 0.05 });
      return [
        dev,
        g2,
        plain.value,
        plain.counted,
        plain.abstained,
        withGamma.value,
        withGamma.gamma,
        withGamma.vetoValue,
        vetoed.value,
        vetoed.dead ? 1 : 0,
        abstaining.value,
        abstaining.abstained,
        Number.isFinite(gated.value) ? gated.value : ABSTAIN_MARK,
        gated.gated ? 1 : 0
      ];
    }
  },
  {
    id: "vsa-algebra",
    guards: "FHRR bind/unbind exactness and bundle crosstalk at dim 1024",
    run: () => {
      const dim = 1024;
      const a = randomHv(dim, "golden/a");
      const b = randomHv(dim, "golden/b");
      const c = randomHv(dim, "golden/c");
      const ab = bind(a, b);
      const rec = unbind(ab, a);
      const bag = bundle([a, b, c]);
      return [
        similarity(rec, b),
        similarity(ab, a),
        similarity(ab, b),
        similarity(bag.hv, a),
        similarity(bag.hv, b),
        similarity(bag.hv, c),
        bag.meanAgreement
      ];
    }
  }
];
function digestValues(values) {
  return new Digest().array(values).hex();
}
function runGolden(cases = GOLDEN_CASES) {
  return cases.map((c) => {
    const values = c.run();
    return { id: c.id, digest: digestValues(values), length: values.length, guards: c.guards };
  });
}
var GOLDEN_BASELINE = {
  "substrate-parity": "b740fed66ab56c8b",
  "coherence-kernel": "928e38bd0682e011",
  "correlation-family": "2e1db62195a14c4b",
  "correlation-underfloor": "235beaee40582307",
  "causal-layer": "7be87d2c7214af97",
  "resonance-bus": "178bea5f3a721c1b",
  "vsa-algebra": "50ff1689cb06c40d"
};
function goldenGate(baseline = GOLDEN_BASELINE, cases = GOLDEN_CASES) {
  const results = runGolden(cases);
  const drifted = [];
  const unbaselined = [];
  for (const r of results) {
    const want = baseline[r.id];
    if (!want) {
      unbaselined.push(r.id);
      continue;
    }
    if (want !== r.digest) drifted.push({ id: r.id, expected: want, actual: r.digest });
  }
  const ids = new Set(results.map((r) => r.id));
  const orphaned = Object.keys(baseline).filter((k) => !ids.has(k));
  return {
    pass: drifted.length === 0 && unbaselined.length === 0 && orphaned.length === 0,
    results,
    drifted,
    unbaselined,
    orphaned
  };
}

// ../omega/packages/trnn-core/src/harness/abstention.ts
function verdictOf(v) {
  return v === null || v === void 0 || !Number.isFinite(v) ? "abstain" : "report";
}
function scoreAbstention(cases) {
  const outcomes = [];
  const falseConfident = [];
  const falseSilent = [];
  const threw = [];
  for (const c of cases) {
    let value = null;
    let actual = "abstain";
    let err = null;
    try {
      const v = c.run();
      actual = verdictOf(v);
      value = actual === "report" ? v : null;
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
      threw.push(c.id);
    }
    const correct2 = err === null && actual === c.expected;
    if (err === null && !correct2) {
      if (c.expected === "abstain") falseConfident.push(c.id);
      else falseSilent.push(c.id);
    }
    outcomes.push({
      id: c.id,
      expected: c.expected,
      actual,
      correct: correct2,
      value,
      rationale: c.rationale,
      threw: err
    });
  }
  const correct = outcomes.reduce((a, o) => a + (o.correct ? 1 : 0), 0);
  return {
    total: cases.length,
    correct,
    rate: cases.length > 0 ? correct / cases.length : null,
    falseConfident,
    falseSilent,
    threw,
    outcomes
  };
}
var ABSTENTION_TARGET = 0.95;
function abstentionGate(r, target = ABSTENTION_TARGET) {
  const reasons = [];
  if (r.rate === null) reasons.push("empty battery: an unrun gate is not a passed gate");
  else if (r.rate < target) reasons.push(`rate ${r.rate.toFixed(4)} < target ${target}`);
  if (r.falseConfident.length > 0) {
    reasons.push(`false-confident (zero budget): ${r.falseConfident.join(", ")}`);
  }
  if (r.threw.length > 0) reasons.push(`threw: ${r.threw.join(", ")}`);
  return { pass: reasons.length === 0, rate: r.rate, reasons };
}

// ../omega/packages/trnn-core/src/harness/conformal.ts
var ACI_ALPHA = 0.1;
var ACI_GAMMA = PHI_INV / 16;
var ACI_WINDOW = 233;
var COVERAGE_TARGET = 0.85;
var RECOVERY_BUDGET = 100;
function quantileSorted(sorted, level) {
  const n = sorted.length;
  const k = Math.ceil((n + 1) * level);
  if (k <= 0) return sorted[0];
  if (k >= n) return sorted[n - 1];
  return sorted[k - 1];
}
var AdaptiveConformal = class {
  alpha;
  gamma;
  window;
  floor;
  alphaT;
  scores = [];
  log = [];
  constructor(opts = {}) {
    const alpha = opts.alpha ?? ACI_ALPHA;
    if (!(alpha > 0 && alpha < 1)) throw new RangeError("AdaptiveConformal: alpha must be in (0,1)");
    const gamma = opts.gamma ?? ACI_GAMMA;
    if (!(gamma > 0)) throw new RangeError("AdaptiveConformal: gamma must be > 0");
    this.alpha = alpha;
    this.gamma = gamma;
    this.window = Math.max(1, Math.floor(opts.window ?? ACI_WINDOW));
    this.floor = Math.max(1, Math.floor(opts.floor ?? STAT_FLOOR));
    this.alphaT = alpha;
  }
  /** Current adaptive miscoverage level. */
  currentAlpha() {
    return this.alphaT;
  }
  /** Calibration scores currently in the window. */
  calibrationSize() {
    return this.scores.length;
  }
  /**
   * Half-width for the next quote, or null when the window is under floor.
   * Pure — calling it does not advance the recursion.
   */
  halfWidth() {
    if (this.scores.length < this.floor) return null;
    const sorted = [...this.scores].sort((a, b) => a - b);
    const q = quantileSorted(sorted, 1 - this.alphaT);
    return Number.isFinite(q) ? q : null;
  }
  /**
   * Score one event: quote an interval around `prediction`, compare to
   * `truth`, then advance αₜ and the calibration window.
   */
  observe(prediction, truth) {
    const nCalib = this.scores.length;
    const alphaT = this.alphaT;
    const hw = this.halfWidth();
    const score2 = Number.isFinite(prediction) && Number.isFinite(truth) ? Math.abs(truth - prediction) : NaN;
    let covered = null;
    let lo = null;
    let hi = null;
    if (hw !== null && Number.isFinite(score2)) {
      lo = prediction - hw;
      hi = prediction + hw;
      covered = score2 <= hw;
      const err = covered ? 0 : 1;
      const next = alphaT + this.gamma * (this.alpha - err);
      this.alphaT = Math.min(1 - 1e-9, Math.max(1e-9, next));
    }
    if (Number.isFinite(score2)) {
      this.scores.push(score2);
      if (this.scores.length > this.window) this.scores.shift();
    }
    const obs = {
      prediction,
      truth,
      score: score2,
      halfWidth: hw,
      lo,
      hi,
      covered,
      alphaT,
      nCalib
    };
    this.log.push(obs);
    return obs;
  }
  observations() {
    return this.log;
  }
  /** Coverage over a suffix of the log (`from` inclusive, default all). */
  report(from = 0) {
    let scored = 0, covered = 0, abstained = 0, widthSum = 0;
    for (let i = Math.max(0, from); i < this.log.length; i++) {
      const o = this.log[i];
      if (o.covered === null) {
        abstained++;
        continue;
      }
      scored++;
      if (o.covered) covered++;
      if (o.halfWidth !== null) widthSum += o.halfWidth;
    }
    return {
      scored,
      covered,
      abstained,
      coverage: scored > 0 ? covered / scored : null,
      meanWidth: scored > 0 ? widthSum / scored : null,
      alphaFinal: this.alphaT
    };
  }
};
function recoveryAfterShift(observations, shiftAt, target = COVERAGE_TARGET, budget = RECOVERY_BUDGET, probe = 55) {
  const tail = [];
  let recoveredAfter = null;
  let settledFrom = -1;
  for (let i = Math.max(0, shiftAt); i < observations.length; i++) {
    const o = observations[i];
    if (o.covered === null) continue;
    tail.push(o.covered);
    if (recoveredAfter === null && tail.length >= probe) {
      const w = tail.slice(tail.length - probe);
      const cov = w.reduce((a, b) => a + (b ? 1 : 0), 0) / probe;
      if (cov >= target) {
        recoveredAfter = tail.length;
        settledFrom = tail.length;
      }
    }
  }
  const tailCoverage = tail.length > 0 ? tail.reduce((a, b) => a + (b ? 1 : 0), 0) / tail.length : null;
  let settledCoverage = null;
  if (settledFrom >= 0 && settledFrom < tail.length) {
    const rest = tail.slice(settledFrom);
    settledCoverage = rest.reduce((a, b) => a + (b ? 1 : 0), 0) / rest.length;
  }
  return {
    shiftAt,
    scored: tail.length,
    recoveredAfter,
    withinBudget: recoveredAfter !== null && recoveredAfter <= budget,
    tailCoverage,
    settledCoverage
  };
}

// ../omega/packages/trnn-core/src/harness/latency.ts
var PROOF_LATENCY_BUDGET_MS = 100;
var defaultClock = () => typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
function percentile(xs, p) {
  const s = [...xs].filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const k = Math.min(s.length, Math.max(1, Math.ceil(p / 100 * s.length)));
  return s[k - 1];
}
function measureLatency(label, runs, op, clock = defaultClock) {
  const times = [];
  let failures = 0;
  for (let i = 0; i < runs; i++) {
    const t0 = clock();
    let ok = false;
    try {
      ok = op(i);
    } catch {
      ok = false;
    }
    const dt = clock() - t0;
    if (ok) times.push(dt);
    else failures++;
  }
  const mean3 = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
  return {
    label,
    runs,
    failures,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    max: percentile(times, 100),
    mean: mean3
  };
}
function latencyGate(r, budgetMs = PROOF_LATENCY_BUDGET_MS) {
  const reasons = [];
  if (r.failures > 0) reasons.push(`${r.failures}/${r.runs} operations failed`);
  if (r.p95 === null) reasons.push("no successful timed run: an unmeasured gate is not a passed gate");
  else if (r.p95 >= budgetMs) reasons.push(`p95 ${r.p95.toFixed(3)} ms \u2265 budget ${budgetMs} ms`);
  return { pass: reasons.length === 0, p95: r.p95, budgetMs, reasons };
}

// ../omega/packages/trnn-core/src/harness/certify.ts
function coverageGate(observations, overall, shiftAt, target = COVERAGE_TARGET, budget = RECOVERY_BUDGET) {
  const recovery = recoveryAfterShift(observations, shiftAt, target, budget);
  const reasons = [];
  if (overall.coverage === null) reasons.push("no scored events: coverage unmeasured");
  else if (overall.coverage < target) {
    reasons.push(`coverage ${overall.coverage.toFixed(4)} < target ${target}`);
  }
  if (!recovery.withinBudget) {
    reasons.push(
      recovery.recoveredAfter === null ? `coverage never returned to ${target} after the shift` : `recovery took ${recovery.recoveredAfter} events > budget ${budget}`
    );
  }
  return { pass: reasons.length === 0, coverage: overall.coverage, target, recovery, reasons };
}
function certify(input) {
  const golden = goldenGate();
  const abst = abstentionGate(input.abstention);
  const cov = coverageGate(input.observations, input.coverage, input.shiftAt);
  const lat = latencyGate(input.proofLatency);
  const reasons = [];
  for (const d of golden.drifted) reasons.push(`golden/${d.id}: digest ${d.actual} \u2260 ${d.expected}`);
  for (const u of golden.unbaselined) reasons.push(`golden/${u}: not baselined`);
  for (const o of golden.orphaned) reasons.push(`golden/${o}: baseline has no case`);
  for (const r of abst.reasons) reasons.push(`abstention: ${r}`);
  for (const r of cov.reasons) reasons.push(`coverage: ${r}`);
  for (const r of lat.reasons) reasons.push(`latency: ${r}`);
  return {
    pass: golden.pass && abst.pass && cov.pass && lat.pass,
    golden,
    abstention: abst,
    coverage: cov,
    latency: lat,
    reasons
  };
}

// ../omega/packages/trnn-core/src/harness/battery.ts
var val = (r) => r.value;
function pair(n, seed) {
  const s = new SeedStream(seed);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    x[i] = dsin(i / PHI) + 0.35 * s.signed();
    prev = 0.55 * prev + 0.45 * (i > 0 ? x[i - 1] : 0) + 0.2 * s.signed();
    y[i] = prev;
  }
  return { x, y };
}
var FAM = [
  ["pearson", pearson],
  ["spearman", spearman],
  ["kendall", kendallTauB],
  ["dcor", distanceCorrelation],
  ["hsic", hsic],
  ["mi", gaussianMI]
];
function abstentionBattery() {
  const cases = [];
  const big = pair(233, "batt/big");
  const small = pair(21, "batt/small");
  const flat = new Float64Array(233);
  for (const [name, fn] of FAM) {
    cases.push({
      id: `${name}/n233`,
      expected: "report",
      rationale: "233 paired samples, above the F9 floor, genuine dependence",
      run: () => val(fn(big.x, big.y))
    });
    cases.push({
      id: `${name}/n21`,
      expected: "abstain",
      rationale: "21 paired samples \u2014 below the F9 floor of 34",
      run: () => val(fn(small.x, small.y))
    });
    cases.push({
      id: `${name}/degenerate`,
      expected: "abstain",
      rationale: "constant series: correlation with a zero-variance variable is undefined",
      run: () => val(fn(big.x, flat))
    });
    cases.push({
      id: `${name}/empty`,
      expected: "abstain",
      rationale: "no samples at all",
      run: () => val(fn(new Float64Array(0), new Float64Array(0)))
    });
  }
  const causal = pair(377, "batt/causal");
  const causalSmall = pair(20, "batt/causal-small");
  for (const lag of [1, 2]) {
    cases.push({
      id: `granger/lag${lag}`,
      expected: "report",
      rationale: "x drives y at unit lag over 377 samples",
      run: () => grangerCausality(causal.x, causal.y, lag).value
    });
    cases.push({
      id: `te/lag${lag}`,
      expected: "report",
      rationale: "Gaussian transfer entropy on the same driven pair",
      run: () => transferEntropyGaussian(causal.x, causal.y, lag).value
    });
  }
  cases.push({
    id: "granger/short",
    expected: "abstain",
    rationale: "n \u2212 lag falls under the paired-sample floor",
    run: () => grangerCausality(causalSmall.x, causalSmall.y, 1).value
  });
  cases.push({
    id: "granger/lag-eats-sample",
    expected: "abstain",
    rationale: "lag 300 of 377 leaves too few rows to fit",
    run: () => grangerCausality(causal.x, causal.y, 350).value
  });
  cases.push({
    id: "te/short",
    expected: "abstain",
    rationale: "transfer entropy inherits the Granger abstention",
    run: () => transferEntropyGaussian(causalSmall.x, causalSmall.y, 1).value
  });
  const phases = [0.1, 0.2, 0.12, 0.31, 0.05];
  cases.push({
    id: "phase/locked",
    expected: "report",
    rationale: "five near-locked phases give a defined circular deviation",
    run: () => circularPhaseDev(phases)
  });
  cases.push({
    id: "phase/single",
    expected: "abstain",
    rationale: "one phase has no deviation to measure",
    run: () => circularPhaseDev([0.4])
  });
  cases.push({
    id: "gamma/unmeasured-dev",
    expected: "abstain",
    rationale: "\u03B3 of an unmeasured phase deviation is unknown, not 1",
    run: () => phaseClosureGamma(NaN)
  });
  cases.push({
    id: "gamma/total-scatter",
    expected: "report",
    rationale: "infinite deviation is a MEASURED total scatter: \u03B3 = 0 is a reading",
    run: () => phaseClosureGamma(Number.POSITIVE_INFINITY)
  });
  const chans = [{ id: "a", value: 0.9 }, { id: "b", value: 0.6 }];
  cases.push({
    id: "bus/measured",
    expected: "report",
    rationale: "two measured channels fuse to a defined resonance",
    run: () => fuseResonance(chans).value
  });
  cases.push({
    id: "bus/all-abstain",
    expected: "abstain",
    rationale: "every channel abstained: there is nothing to average",
    run: () => fuseResonance([{ id: "a", value: NaN }, { id: "b", value: NaN }]).value
  });
  cases.push({
    id: "bus/veto-zero",
    expected: "report",
    rationale: "a measured zero is a hard 0 reading, not an absence of evidence",
    run: () => fuseResonance([...chans, { id: "dead", value: 0 }]).value
  });
  cases.push({
    id: "bus/gated",
    expected: "abstain",
    rationale: "field coherence below the \u03C6\u207B\xB2 gate: the fusion is not believable",
    run: () => fuseResonance(chans, { coherence: 0.05 }).value
  });
  const dim = 1024;
  const a = randomHv(dim, "batt/a");
  const b = randomHv(dim, "batt/b");
  cases.push({
    id: "vsa/similarity",
    expected: "report",
    rationale: "two hypervectors always have a defined similarity",
    run: () => similarity(a, b)
  });
  cases.push({
    id: "vsa/empty-bundle",
    expected: "abstain",
    rationale: "the agreement of an empty superposition is undefined",
    run: () => bundle([]).meanAgreement
  });
  const mem = new CleanupMemory(dim);
  mem.add("a", a);
  mem.add("b", b);
  cases.push({
    id: "cleanup/exact",
    expected: "report",
    rationale: "an exact stored vector clears the 5\u03C3 chance floor",
    run: () => mem.query(a)?.similarity ?? null
  });
  cases.push({
    id: "cleanup/noise",
    expected: "abstain",
    rationale: "an unrelated vector is chance-level: naming a winner would be fabrication",
    run: () => mem.query(bind(randomHv(dim, "batt/noise"), randomHv(dim, "batt/noise2")))?.similarity ?? null
  });
  cases.push({
    id: "cleanup/empty-store",
    expected: "abstain",
    rationale: "an empty cleanup memory cannot name anything",
    run: () => new CleanupMemory(dim).query(a)?.similarity ?? null
  });
  const snaps = [];
  for (let t = 0; t < 60; t++) {
    const v = new Float64Array(8);
    for (let i = 0; i < 8; i++) v[i] = dcos(0.21 * t + i) * dpow(0.995, t);
    snaps.push(v);
  }
  cases.push({
    id: "dmd/oscillatory",
    expected: "report",
    rationale: "60 snapshots of a decaying oscillation: growth rate is identifiable",
    run: () => fitDmd(snaps)?.modes[0]?.growth ?? null
  });
  cases.push({
    id: "dmd/too-few",
    expected: "abstain",
    rationale: `fewer than ${MIN_SNAPSHOTS} snapshots cannot identify a mode`,
    run: () => fitDmd(snaps.slice(0, MIN_SNAPSHOTS - 1))?.modes[0]?.growth ?? null
  });
  return cases;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ABSTENTION_TARGET,
  ACCEPT_SIMILARITY,
  ACI_ALPHA,
  ACI_GAMMA,
  ACI_WINDOW,
  AdaptiveConformal,
  BIAS_TOTAL,
  BLADES,
  BLADE_NAMES,
  BRAID_MULTIPLICITY,
  BcmThreshold,
  BoundedEigenvalue,
  CAPACITY_PROFILES,
  CAPTURE_FLOOR,
  CARRIER_DIM,
  CARRIER_N,
  CELL,
  CHECKPOINT_PERIOD,
  CHILD_SIZES,
  CLAMP_MAX,
  CLEANUP_FAN_IN,
  CLEANUP_Z_FLOOR,
  COHERENCE_DELAY,
  COHERENCE_DELAY_LADDER,
  COHERENCE_GATE,
  CONSOLIDATION_COS,
  CORRIDOR,
  COVERAGE_TARGET,
  CleanupMemory,
  CoherenceMeter,
  ConceptStore,
  Corpus,
  CorridorGate,
  DEFAULT_BANDS,
  DEFAULT_DEPTH,
  DEFAULT_HEADROOM,
  DENSE_CORE,
  DENSE_CORE_COUNT,
  DRIVE_SLOTS,
  DiagonalRLS,
  DiagonalSSM,
  Digest,
  DigestChain,
  EMPIRICAL_CONSTANTS,
  ENV,
  EngineHost,
  FIB_SPINE,
  FILTER_RHO_MAX,
  FLUX_CLOSURE_TOLERANCE,
  FLUX_SINK,
  FLUX_WINDOW_HI,
  FLUX_WINDOW_LO,
  FluxLedger,
  FractalPool,
  GENOME_VERSION,
  GOLDEN_BASELINE,
  GOLDEN_CASES,
  GenomeLedger,
  IGNITION_THRESHOLD,
  ISS_DRIVE_BOUND,
  ISS_ENVELOPE,
  ISS_GAIN,
  ISS_INPUT_SUM,
  ISS_SLACK,
  InputGain,
  JURY_GAIN,
  JURY_GAIN_REFERENCE,
  KAPPA,
  KAPPA_PHASE,
  KERNEL_LAMBDA,
  LADDER,
  LADDER_ANCHOR,
  LADDER_MAX_N,
  LAMBDA_MAX,
  LAMBDA_MEMORY,
  LEARN_BUDGET,
  LONG_GAP_SWEEPS,
  LUCAS_MOD13_PERIOD,
  LearnableCell,
  MAX_DEPTH,
  MAX_HZ,
  MAX_LOOP_GAIN,
  MEMORY_STRIDE,
  MIND_STRIDE,
  MIN_HZ,
  MIN_PAIRED,
  MIN_SNAPSHOTS,
  MODALITY_NONE,
  MSC_MIN_SEGMENTS,
  MerkleLog,
  Mind,
  MultiTorusEngine,
  NODE_LADDER,
  NOVELTY_THRESHOLD,
  NodeOrgans,
  NuisanceLearner,
  OctaveScratch,
  OrderingMonitor,
  PARTIAL_ACCEPT,
  PHASE_ORDER,
  PHI,
  PHI_INV,
  PHI_INV_7,
  PLV_EDGE_FRACTION,
  PLV_MIN_SAMPLES,
  PROFILES,
  PROFILES_BY_TIER,
  PROFILE_ORDER,
  PROMOTION_THRESHOLD,
  PROOF_LATENCY_BUDGET_MS,
  PSI,
  PhiCoherenceKernel,
  QUADRATIC_CAP,
  RADIAL_GAIN_MAX,
  RECOVERY_BUDGET,
  RESIDUAL_FACTOR,
  RESONANCE_FLOOR,
  RegressionForest,
  RunLedger,
  SENSE_BOUND,
  SHIP_MARGIN,
  SHORT_GAP_SWEEPS,
  SIGNATURE_MODES,
  SPECTRUM_VERSION,
  STABLE_RESIDUES,
  STAT_FLOOR,
  STRESS_THRESHOLD,
  SUSTAIN_TICKS,
  SWEEP_NAMES,
  SeedStream,
  SelfModel,
  SensoryNodeArray,
  SensoryPlane,
  SimplexGain,
  SingleTorusEngine,
  SpectralFilter,
  SpectralSite,
  SuperpositionMixer,
  T1_MIN_LIMITS,
  TABLE,
  TAPE_BOUND,
  TAPE_WRITE_WEIGHT,
  TenSweepProtocol,
  TorusBraid,
  TranscriptionTape,
  TuringTape,
  abstentionBattery,
  abstentionGate,
  algSigmoid,
  algSigmoidPrime,
  analyticExpectedC,
  analyze,
  angularDistance,
  angularPower,
  applyBladeGain,
  applyRotor,
  applySparse,
  applySpectralAttention,
  assertIndex,
  at,
  bandPLV,
  bandTarget,
  base64ToBytes,
  benchmarkThroughput,
  bind,
  blendWithResonance,
  boundField,
  boundaryFlux,
  braidBeta,
  buildBasis,
  buildCoupling,
  buildModes,
  buildRadialBasis,
  buildRingLaplacian,
  buildSphericalBasis,
  buildWindow,
  bundle,
  butterBandpass,
  bytesToBase64,
  calibrate,
  canonicalJson,
  carrierPack,
  carrierUnpack,
  cellStep,
  certify,
  chanceSigma,
  checkMorphism,
  childBytes,
  chordOffsets,
  circularPhaseDev,
  clamp01,
  clampField,
  cloneField,
  closureObstructionHolds,
  closureTarget,
  coeffBuffer,
  coherenceDelayForRank,
  conjugateHv,
  copyField,
  correlationReport,
  corridor,
  costMultiplier,
  countBuildWork,
  couplingWeight,
  coverageGate,
  createChildField,
  createField,
  createLattice,
  createMultiVectorField,
  crossCorrelate,
  decimate,
  decodePosition,
  decodeRole,
  depthRate,
  describeEngine,
  dft,
  diffusionTarget,
  digestValues,
  directedReport,
  distance,
  distanceCorrelation,
  dmlPartialLinear,
  emittedMass,
  emptyRoot,
  encodeAudio,
  encodeGrid,
  encodeRecord,
  encodeScalars,
  encodeSequence,
  encodeText,
  energy,
  enumerateWindows,
  erfc,
  evaluateProfile,
  expectedCBias,
  fSurvival,
  fft,
  fftUnitary,
  fib,
  fibBig,
  fibonacciShell,
  fibonacciStrides,
  fieldFrame,
  fitDmd,
  fluxFirstInWindow,
  fromHex,
  fromUtf8,
  fuseChannels,
  fuseResonance,
  gaussianMI,
  gccPhat,
  generalEigenvalues,
  geometricProduct,
  get,
  goldenGate,
  goldenPhase,
  goldenStride,
  grangerCausality,
  hann,
  harmonicLadder,
  hashEquals,
  hashLeaf,
  hashNode,
  headBytes,
  heartbeatGaps,
  heartbeatSchedule,
  hessenberg,
  hilbertAnalytic,
  hsic,
  identityHv,
  inner,
  invNormalCdf,
  isFibonacci,
  isFiniteField,
  isInertWindow,
  isStableByLucas,
  isStableByResidue,
  isStableRung,
  jacobiEigen,
  joglekarWindow,
  kendallTauB,
  kernelRoots,
  keyPairFromSeed,
  lanczosEigenpairs,
  largestFibonacciAtMost,
  latencyGate,
  leafBytes,
  legendreP,
  lgamma,
  lucasBig,
  lucasLine,
  lucasMod13,
  lucasMod13Cycle,
  magneticPhase,
  magnitude,
  maxNorm,
  measureFootprint,
  measureLatency,
  measureSpectrum,
  medianOf,
  medianPairwise,
  memoryRoots,
  memoryStep,
  memristiveStep,
  memristiveVector,
  metatronSpectrum,
  minSeparation,
  modeLadder,
  newField,
  nodesForRank,
  normalCdf,
  normalScores,
  normalizeRotor,
  octaveTransport,
  ojaStep,
  olsFit,
  organBytes,
  ouInnovation,
  pair,
  pearson,
  percentile,
  permutationTest,
  permute,
  phaseClosureGamma,
  phiPow,
  phiWeights,
  pisotDefect,
  planBands,
  probeHardware,
  probeTier1,
  probeTier2,
  probeTier3,
  probeTiers,
  profileById,
  profileCost,
  profileNodes,
  project,
  prolong,
  qrfAttenuation,
  qualifies,
  radialAnalyze,
  radialGrid,
  radialGridSize,
  radialLadderWindow,
  radialSynthesize,
  radialWavenumber,
  randomHv,
  rank,
  ratedCapacity,
  rawVector,
  readState,
  realSH,
  recoveryAfterShift,
  regIncBeta,
  residualEnergy,
  restrict,
  reverse,
  rotorFromPlane,
  runBattery,
  runGolden,
  rungByIndex,
  rungScan,
  safeLog,
  sampleTrajectory,
  sangerStep,
  scaleField,
  scanRung,
  scoreAbstention,
  selectProfile,
  senseField,
  sensoryNodeBytes,
  setRawVector,
  shtAnalyze,
  shtSynthesize,
  signTreeHead,
  signature,
  similarity,
  sns,
  sosFilt,
  sosFiltFilt,
  spearman,
  spectralView,
  spectrumDigest,
  sphericalBesselJ,
  stableRungsMod28,
  strideSet,
  substrateParity,
  substrateParityHolds,
  sweep10Reflection,
  sweep1IntakeReplay,
  sweep2HdcBinding,
  sweep3TemporalStamping,
  sweep4ContradictionPass,
  sweep5PrototypeConsolidation,
  sweep6CausalAttribution,
  sweep7CrossLevelRescoring,
  sweep8RedTeam,
  sweep9GovernorCompression,
  sweepSchedule,
  synthesize,
  thermalLambda,
  tickWorkUnits,
  tier0,
  toHex,
  transferEntropyGaussian,
  transferEntropyScan,
  unbind,
  utf8,
  verdictOf,
  verifyConsistency,
  verifyFootprint,
  verifyInclusion,
  verifyTreeHead,
  webView,
  welchMSC,
  windowByTopNodes,
  windowWork,
  wrapAt,
  wrapPhase,
  zeckendorf,
  zeckendorfOrder,
  zeroField
});
/*! Bundled license information:

@noble/curves/utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/abstract/modular.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/abstract/curve.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/abstract/edwards.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/ed25519.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/ciphers/utils.js:
  (*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) *)
*/
