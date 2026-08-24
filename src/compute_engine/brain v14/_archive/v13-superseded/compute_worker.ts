import { at } from "./core/indexing.ts";
/**
 * RHUFT v13 — Worker Thread for Parallel Framework/Memory Compute
 *
 * Offloads heavy framework and memory computations from the main thread.
 * Uses deterministic math with IEEE-754 Float64.
 * No randomness. φ-scale-proportional parameters throughout.
 *
 * Epistemic Status: [SPEC] + [PERF] — Computational optimization only.
 * Mathematical results must be bit-identical to synchronous execution.
 */

const { parentPort } = require("worker_threads");

if (!parentPort) {
  throw new Error("This module must be run as a worker thread");
}

// ── Deterministic math helpers (copied from fractal_node.ts for standalone execution) ──

const PHI = 1.618033988749895;
const PHI_INV = 0.6180339887498949;
const PHI_NEG2 = 0.3819660112501051;
const PI = 3.141592653589793;

function dft(input: Float64Array): Float64Array {
  const N = input.length;
  const result = new Float64Array(2 * N);
  for (let k = 0; k < N; k++) {
    let re = 0.0;
    let im = 0.0;
    for (let n = 0; n < N; n++) {
      const angle = (-2.0 * PI * k * n) / N;
      re += at(input, n) * Math.cos(angle);
      im += at(input, n) * Math.sin(angle);
    }
    result[2 * k] = re;
    result[2 * k + 1] = im;
  }
  return result;
}

function magnitudeSpectrum(complex: Float64Array): Float64Array {
  const N = complex.length / 2;
  const result = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const re = at(complex, 2 * k);
    const im = at(complex, 2 * k + 1);
    result[k] = Math.sqrt(re * re + im * im);
  }
  return result;
}

function idft(complex: Float64Array): Float64Array {
  const N = complex.length / 2;
  const result = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    let re = 0.0;
    for (let k = 0; k < N; k++) {
      const angle = (2.0 * PI * k * n) / N;
      re += at(complex, 2 * k) * Math.cos(angle) - at(complex, 2 * k + 1) * Math.sin(angle);
    }
    result[n] = re / N;
  }
  return result;
}

// ── Framework compute implementations (deterministic, no external deps) ──

type ComputeTask = {
  type: "framework" | "memory";
  id: string;
  input: number[];
  fieldState: number[];
  scale: number;
};

type ComputeResult = {
  id: string;
  output: number[];
  error?: string;
};

function computeF8_SubPlanckian(input: Float64Array, fieldState: Float64Array): Float64Array {
  const N = Math.min(input.length, fieldState.length);
  if (N === 0) return new Float64Array(0);
  const spectrum = dft(input);
  const magnitudes = magnitudeSpectrum(spectrum);
  const HBAR = 1.054571817e-34;
  const zeroPointEnergy = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const omega = (2.0 * PI * k) / N;
    zeroPointEnergy[k] = (HBAR * omega) / 2.0;
  }
  const kPlanck = N / PHI;
  const cutoffFilter = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const ratio = k / kPlanck;
    cutoffFilter[k] = ratio < 1.0 ? 1.0 : Math.exp(-(ratio - 1.0) * PHI);
  }
  const alpha = 1.0 / PHI;
  const permittivity = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const kRatio = k / (kPlanck + 1e-300);
    permittivity[k] = 1.0 + alpha / (1.0 + kRatio * kRatio);
  }
  const filteredSpectrum = new Float64Array(2 * N);
  for (let k = 0; k < N; k++) {
    const filter = at(cutoffFilter, k) / at(permittivity, k);
    const energyFactor = 1.0 / (1.0 + at(zeroPointEnergy, k) * 1e34);
    filteredSpectrum[2 * k] = at(spectrum, 2 * k) * filter * energyFactor;
    filteredSpectrum[2 * k + 1] = at(spectrum, 2 * k + 1) * filter * energyFactor;
  }
  const reconstructed = idft(filteredSpectrum);
  const damping = 1.0 / PHI;
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    result[i] = at(reconstructed, i) * damping + at(fieldState, i) * (1.0 - damping);
  }
  return result;
}

function computeF4_Geometric(input: Float64Array, fieldState: Float64Array, scale: number): Float64Array {
  const N = Math.min(input.length, fieldState.length);
  if (N === 0) return new Float64Array(0);
  const NUM_NODES = 13;
  const adjacency: number[][] = [];
  for (let i = 0; i < NUM_NODES; i++) {
    adjacency[i] = [];
    for (let j = 0; j < NUM_NODES; j++) {
      const diff = Math.abs(i - j);
      const isFibonacci = diff === 1 || diff === 2 || diff === 3 || diff === 5 || diff === 8 || diff === 13;
      at(adjacency, i)[j] = isFibonacci && i !== j ? 1.0 : 0.0;
    }
  }
  const harmonics: Float64Array[] = [];
  for (let l = 0; l <= 3; l++) {
    for (let m = -l; m <= l; m++) {
      const mode = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const theta = (2.0 * PI * i) / N;
        const phi = (PI * i) / N;
        mode[i] = sphericalHarmonicReal(l, m, theta, phi);
      }
      harmonics.push(mode);
    }
  }
  const harmonicCoeffs = new Float64Array(harmonics.length);
  for (let h = 0; h < harmonics.length; h++) {
    let dot = 0.0;
    for (let i = 0; i < N; i++) {
      dot += at(input, i) * at(at(harmonics, h), i);
    }
    harmonicCoeffs[h] = dot / N;
  }
  const latticeValues = new Float64Array(NUM_NODES);
  for (let i = 0; i < NUM_NODES; i++) {
    latticeValues[i] = at(input, i % N);
  }
  for (let iter = 0; iter < 3; iter++) {
    const newValues = new Float64Array(NUM_NODES);
    for (let i = 0; i < NUM_NODES; i++) {
      let sum = at(latticeValues, i);
      let degree = 1.0;
      for (let j = 0; j < NUM_NODES; j++) {
        if (at(at(adjacency, i), j) > 0) {
          sum += at(latticeValues, j) * at(at(adjacency, i), j);
          degree += 1.0;
        }
      }
      newValues[i] = sum / degree;
    }
    for (let i = 0; i < NUM_NODES; i++) {
      latticeValues[i] = at(newValues, i);
    }
  }
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const latticeIdx = i % NUM_NODES;
    const latticeContribution = at(latticeValues, latticeIdx);
    let harmonicContribution = 0.0;
    for (let h = 0; h < harmonics.length; h++) {
      harmonicContribution += at(harmonicCoeffs, h) * at(at(harmonics, h), i);
    }
    const blend = PHI_INV;
    result[i] = latticeContribution * (1.0 - blend) * 0.5 + harmonicContribution * blend * 0.5 + at(fieldState, i) * (1.0 / PHI);
  }
  return result;
}

function sphericalHarmonicReal(l: number, m: number, theta: number, phi: number): number {
  const absM = Math.abs(m);
  const norm = Math.sqrt(((2.0 * l + 1.0) * factorial(l - absM)) / (4.0 * PI * factorial(l + absM)));
  const P = associatedLegendre(l, absM, Math.cos(theta));
  if (m === 0) return norm * P;
  const SQRT2 = 1.4142135623730951;
  if (m > 0) return norm * P * Math.cos(m * phi) * SQRT2;
  return norm * P * Math.sin(absM * phi) * SQRT2;
}

function factorial(n: number): number {
  if (n <= 0) return 1.0;
  let result = 1.0;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function associatedLegendre(l: number, m: number, x: number): number {
  if (m > l) return 0.0;
  if (m < 0) return Math.pow(-1.0, -m) * associatedLegendre(l, -m, x);
  let pmm = 1.0;
  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0.0, 1.0 - x * x));
    let fact = 1.0;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2.0;
    }
  }
  if (l === m) return pmm;
  let pmmp1 = x * (2.0 * m + 1.0) * pmm;
  if (l === m + 1) return pmmp1;
  let pll = 0.0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2.0 * ll - 1.0) * x * pmmp1 - (ll + m - 1.0) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

function computeF5_ColorMusic(input: Float64Array, fieldState: Float64Array): Float64Array {
  const N = Math.min(input.length, fieldState.length);
  if (N === 0) return new Float64Array(0);
  const spectrum = dft(input);
  const magnitudes = magnitudeSpectrum(spectrum);
  const H = 6.62607015e-34;
  const C = 2.99792458e8;
  const massFreqConversion = (C * C) / H;
  const harmonicSeries = new Float64Array(N);
  const baseFreq = at(magnitudes, 0) > 0 ? at(magnitudes, 0) : 1.0;
  for (let n = 0; n < N; n++) {
    harmonicSeries[n] = baseFreq * Math.pow(PHI, -n);
  }
  const colorWeights = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const freq = at(magnitudes, i) > 0 ? at(magnitudes, i) : 1e-300;
    const wavelengthNm = (C / freq) * 1e9;
    const peakWavelength = 550.0;
    const sigma = 100.0;
    colorWeights[i] = Math.exp(-Math.pow(wavelengthNm - peakWavelength, 2) / (2.0 * sigma * sigma));
  }
  const musicalIntervals = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let intervalScore = 0.0;
    for (let j = 1; j < N && j < 12; j++) {
      if (at(magnitudes, i) > 0 && at(magnitudes, j) > 0) {
        const ratio = at(magnitudes, j) / at(magnitudes, i);
        const intervals = [3.0 / 2.0, 5.0 / 4.0, 6.0 / 5.0, 4.0 / 3.0, 2.0];
        for (const interval of intervals) {
          const deviation = Math.abs(ratio - interval) / interval;
          if (deviation < 0.1) {
            intervalScore += 1.0 / (1.0 + deviation * PHI);
          }
        }
      }
    }
    musicalIntervals[i] = intervalScore;
  }
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const massFreq = at(input, i) * massFreqConversion;
    const harmonicWeight = at(harmonicSeries, i % N) / (baseFreq + 1e-300);
    const colorWeight = at(colorWeights, i);
    const musicWeight = 1.0 + at(musicalIntervals, i);
    const spectralTransform = massFreq * (1.0 / PHI) * harmonicWeight * colorWeight * musicWeight;
    const normalized = Math.atan(spectralTransform) / (PI / 2.0);
    result[i] = normalized * (1.0 / PHI) + at(fieldState, i) * (1.0 - 1.0 / PHI);
  }
  return result;
}

const HEBREW_GEMATRIA: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400,
];

function computeF6_Hebrew(input: Float64Array, fieldState: Float64Array): Float64Array {
  const N = Math.min(input.length, fieldState.length);
  if (N === 0) return new Float64Array(0);
  const NUM_LETTERS = 22;
  const letterIndices = new Int32Array(N);
  for (let i = 0; i < N; i++) letterIndices[i] = i % NUM_LETTERS;
  const gematriaValues = new Float64Array(NUM_LETTERS);
  for (let i = 0; i < NUM_LETTERS; i++) gematriaValues[i] = at(HEBREW_GEMATRIA, i);
  const permutationMatrix: number[][] = [];
  for (let i = 0; i < NUM_LETTERS; i++) {
    permutationMatrix[i] = [];
    for (let j = 0; j < NUM_LETTERS; j++) {
      const step = (j - i + NUM_LETTERS) % NUM_LETTERS;
      at(permutationMatrix, i)[j] = 1.0 / (at(gematriaValues, step) + 1.0);
    }
  }
  const cyclicTransformed = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const letterIdx = at(letterIndices, i);
    let sum = 0.0;
    for (let j = 0; j < NUM_LETTERS; j++) {
      const inputIdx = (i + j) % N;
      sum += at(input, inputIdx) * at(at(permutationMatrix, letterIdx), j);
    }
    let weightSum = 0.0;
    for (let j = 0; j < NUM_LETTERS; j++) weightSum += at(at(permutationMatrix, letterIdx), j);
    cyclicTransformed[i] = sum / (weightSum + 1e-300);
  }
  const SEPTENARY_LEVELS = 7;
  const encoded154 = new Float64Array(NUM_LETTERS * SEPTENARY_LEVELS);
  for (let letter = 0; letter < NUM_LETTERS; letter++) {
    for (let level = 0; level < SEPTENARY_LEVELS; level++) {
      const idx = letter * SEPTENARY_LEVELS + level;
      const inputIdx = idx % N;
      const levelWeight = Math.pow(PHI, -level) / (1.0 - Math.pow(PHI, -SEPTENARY_LEVELS)) * (1.0 - 1.0 / PHI);
      const letterWeight = 1.0 / (at(gematriaValues, letter) + 1.0);
      encoded154[idx] = at(input, inputIdx) * levelWeight * letterWeight;
    }
  }
  let totalEncoded = 0.0;
  for (let i = 0; i < encoded154.length; i++) totalEncoded += Math.abs(at(encoded154, i));
  let entropySum = 0.0;
  for (let i = 0; i < encoded154.length; i++) {
    const p = Math.abs(at(encoded154, i)) / (totalEncoded + 1e-300);
    if (p > 0) entropySum -= p * Math.log(p);
  }
  const normalizedEntropy = entropySum / Math.log(NUM_LETTERS * SEPTENARY_LEVELS);
  const septenaryTransformed = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const letterIdx = at(letterIndices, i);
    let levelSum = 0.0;
    let weightSum = 0.0;
    for (let level = 0; level < SEPTENARY_LEVELS; level++) {
      const encodedIdx = letterIdx * SEPTENARY_LEVELS + level;
      const levelWeight = Math.pow(PHI, -level);
      levelSum += at(encoded154, encodedIdx) * levelWeight;
      weightSum += levelWeight;
    }
    septenaryTransformed[i] = levelSum / (weightSum + 1e-300);
  }
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const combined = at(cyclicTransformed, i) * (1.0 / PHI) + at(septenaryTransformed, i) * (1.0 / (PHI * PHI)) + normalizedEntropy * (1.0 / (PHI * PHI * PHI));
    result[i] = combined * (1.0 - 1.0 / PHI) + at(fieldState, i) * (1.0 / PHI);
  }
  return result;
}

function computeF7_Thermodynamic(input: Float64Array, fieldState: Float64Array): Float64Array {
  const N = Math.min(input.length, fieldState.length);
  if (N === 0) return new Float64Array(0);
  let totalAmplitude = 0.0;
  for (let i = 0; i < N; i++) totalAmplitude += at(fieldState, i) * at(fieldState, i);
  const probabilities = new Float64Array(N);
  for (let i = 0; i < N; i++) probabilities[i] = (at(fieldState, i) * at(fieldState, i)) / (totalAmplitude + 1e-300);
  let entropy = 0.0;
  for (let i = 0; i < N; i++) {
    const p = at(probabilities, i);
    if (p > 1e-300) entropy -= p * Math.log(p);
  }
  const maxEntropy = Math.log(N);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0.0;
  let internalEnergy = 0.0;
  for (let i = 0; i < N; i++) internalEnergy += at(fieldState, i) * at(fieldState, i);
  const energyDensity = internalEnergy / N;
  const temperature = energyDensity * PHI;
  const freeEnergy = internalEnergy - temperature * entropy;
  const learningRate = 1.0 / (PHI * PHI * N);
  const gradientDescent = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const psi = at(fieldState, i);
    const p = at(probabilities, i);
    const logP = p > 1e-300 ? Math.log(p) : 0.0;
    const dFdPsi = 2.0 * psi - temperature * (1.0 + logP) * Math.sign(psi);
    gradientDescent[i] = -learningRate * dFdPsi;
  }
  const thermalDiffusivity = 1.0 / PHI;
  const thermalDiffusion = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const prev = i > 0 ? at(fieldState, i - 1) : at(fieldState, N - 1);
    const next = i < N - 1 ? at(fieldState, i + 1) : at(fieldState, 0);
    const laplacian = next - 2.0 * at(fieldState, i) + prev;
    thermalDiffusion[i] = thermalDiffusivity * laplacian;
  }
  const kappa = 1.0 / (PHI * PI);
  const friction = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const prevEntropy = i > 0 ? at(probabilities, i - 1) : at(probabilities, N - 1);
    const entropyGrad = Math.abs(at(probabilities, i) - prevEntropy);
    friction[i] = kappa * entropyGrad;
  }
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const thermodynamicUpdate = at(input, i) * (1.0 - kappa) + at(gradientDescent, i) + at(thermalDiffusion, i) * (1.0 - normalizedEntropy) - at(friction, i) * at(fieldState, i);
    const blendFactor = 1.0 / PHI;
    result[i] = thermodynamicUpdate * (1.0 - blendFactor) + at(fieldState, i) * blendFactor;
  }
  return result;
}

function computeF1_Septenary(input: Float64Array, fieldState: Float64Array): Float64Array {
  const N = Math.min(input.length, fieldState.length);
  if (N === 0) return new Float64Array(0);
  const NUM_LEVELS = 7;
  const levelOutputs: Float64Array[] = [];
  const level0 = new Float64Array(N);
  let inputMax = 0.0;
  for (let i = 0; i < N; i++) if (Math.abs(at(input, i)) > inputMax) inputMax = Math.abs(at(input, i));
  const normFactor = inputMax > 0 ? 1.0 / inputMax : 1.0;
  for (let i = 0; i < N; i++) level0[i] = at(input, i) * normFactor;
  levelOutputs.push(level0);
  const level1 = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const prev = i > 0 ? at(level0, i - 1) : at(level0, N - 1);
    const next = i < N - 1 ? at(level0, i + 1) : at(level0, 0);
    const gradient = (next - prev) / 2.0;
    level1[i] = gradient * PHI_INV;
  }
  levelOutputs.push(level1);
  const level2 = new Float64Array(N);
  const windowSize = Math.max(1, Math.floor(N / PHI));
  for (let i = 0; i < N; i++) {
    let sum = 0.0;
    let count = 0;
    for (let w = -windowSize; w <= windowSize; w++) {
      const idx = (i + w + N) % N;
      const weight = Math.pow(PHI_INV, Math.abs(w));
      sum += at(level1, idx) * weight;
      count += weight;
    }
    level2[i] = sum / (count + 1e-300);
  }
  levelOutputs.push(level2);
  const level3 = new Float64Array(N);
  const correlationWindow = Math.max(1, Math.floor(N / (PHI * PHI)));
  for (let i = 0; i < N; i++) {
    let correlation = 0.0;
    for (let j = 1; j <= correlationWindow; j++) {
      const idx = (i + j) % N;
      const weight = Math.pow(PHI_INV, j);
      correlation += at(level2, i) * at(level2, idx) * weight;
    }
    level3[i] = correlation * PHI_INV;
  }
  levelOutputs.push(level3);
  const level4 = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const prev = i > 0 ? at(level3, i - 1) : at(level3, N - 1);
    const trend = at(level3, i) - prev;
    const prediction = at(level3, i) + trend * PHI_INV;
    const predictionError = at(level3, i) - prediction;
    level4[i] = predictionError * PHI_INV;
  }
  levelOutputs.push(level4);
  const level5 = new Float64Array(N);
  let globalMean = 0.0;
  for (let i = 0; i < N; i++) globalMean += at(level4, i);
  globalMean /= N;
  let globalVariance = 0.0;
  for (let i = 0; i < N; i++) globalVariance += Math.pow(at(level4, i) - globalMean, 2);
  globalVariance = Math.sqrt(globalVariance / N);
  for (let i = 0; i < N; i++) {
    const deviation = (at(level4, i) - globalMean) / (globalVariance + 1e-300);
    level5[i] = deviation * PHI_INV;
  }
  levelOutputs.push(level5);
  const level6 = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let transcendence = 0.0;
    let weightSum = 0.0;
    for (let l = 0; l < levelOutputs.length; l++) {
      const weight = Math.pow(PHI_INV, l);
      transcendence += at(at(levelOutputs, l), i) * weight;
      weightSum += weight;
    }
    level6[i] = transcendence / (weightSum + 1e-300);
  }
  levelOutputs.push(level6);
  const informationContent = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let variance = 0.0;
    for (let l = 0; l < NUM_LEVELS; l++) {
      variance += Math.pow(at(at(levelOutputs, l), i) - at(level6, i), 2);
    }
    informationContent[i] = Math.sqrt(variance / NUM_LEVELS);
  }
  const attentionWeights = new Float64Array(N);
  let maxInfo = 0.0;
  for (let i = 0; i < N; i++) if (at(informationContent, i) > maxInfo) maxInfo = at(informationContent, i);
  let attentionSum = 0.0;
  for (let i = 0; i < N; i++) {
    attentionWeights[i] = Math.exp((at(informationContent, i) - maxInfo) * PHI);
    attentionSum += at(attentionWeights, i);
  }
  for (let i = 0; i < N; i++) attentionWeights[i] = at(attentionWeights, i) / (attentionSum + 1e-300);
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const attentionOutput = at(level6, i) * at(attentionWeights, i) * PHI;
    const biasCorrection = 1.0 / (1.0 + Math.abs(at(level6, i)) * PHI_INV);
    const correctedOutput = attentionOutput * biasCorrection;
    result[i] = correctedOutput * (1.0 - 1.0 / PHI) + at(fieldState, i) * (1.0 / PHI);
  }
  return result;
}

function computeF9_Hypergalactic(input: Float64Array, fieldState: Float64Array): Float64Array {
  const N = Math.min(input.length, fieldState.length);
  if (N === 0) return new Float64Array(0);
  const spectrum = dft(input);
  const magnitudes = magnitudeSpectrum(spectrum);
  const cosmicScale = 292;
  const hubbleConstant = 2.184e-18;
  const darkMatterFraction = 0.27;
  const darkEnergyFraction = 0.68;
  const totalDark = darkMatterFraction + darkEnergyFraction;
  const cosmicWeights = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const scaleFactor = k / (N + 1e-300);
    cosmicWeights[k] = darkMatterFraction * Math.pow(scaleFactor, PHI_INV) + darkEnergyFraction * Math.pow(1.0 - scaleFactor, PHI_INV);
  }
  const holographicTransform = new Float64Array(2 * N);
  for (let k = 0; k < N; k++) {
    const phase = (2.0 * PI * k * cosmicScale) / (N + 1e-300);
    const weight = at(cosmicWeights, k) / totalDark;
    holographicTransform[2 * k] = at(spectrum, 2 * k) * weight * Math.cos(phase);
    holographicTransform[2 * k + 1] = at(spectrum, 2 * k + 1) * weight * Math.sin(phase);
  }
  const holographicField = idft(holographicTransform);
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const expansionRate = hubbleConstant * at(fieldState, i);
    const darkEnergyTerm = darkEnergyFraction * expansionRate * PHI_INV;
    const darkMatterTerm = darkMatterFraction * at(fieldState, i) * (1.0 - PHI_INV);
    const holographicTerm = at(holographicField, i) * (1.0 / (PHI * PHI));
    result[i] = darkEnergyTerm + darkMatterTerm + holographicTerm;
  }
  return result;
}

// ── Memory compute implementations ──

function computeL1_Pattern(input: Float64Array): Float64Array {
  const N = input.length;
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const prev = i > 0 ? at(input, i - 1) : at(input, N - 1);
    const next = i < N - 1 ? at(input, i + 1) : at(input, 0);
    const gradient = (next - prev) / 2.0;
    result[i] = gradient * PHI_INV;
  }
  return result;
}

function computeL2_Hebbian(input: Float64Array): Float64Array {
  const N = input.length;
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const prev = i > 0 ? at(input, i - 1) : at(input, N - 1);
    const next = i < N - 1 ? at(input, i + 1) : at(input, 0);
    const correlation = at(input, i) * (prev + next) / 2.0;
    result[i] = correlation * PHI_NEG2;
  }
  return result;
}

function computeL3_Kuramoto(input: Float64Array): Float64Array {
  const N = input.length;
  const result = new Float64Array(N);
  const meanField = new Float64Array(N);
  let sum = 0.0;
  for (let i = 0; i < N; i++) sum += at(input, i);
  const mean = sum / N;
  for (let i = 0; i < N; i++) meanField[i] = mean;
  for (let i = 0; i < N; i++) {
    const phaseDiff = at(input, i) - at(meanField, i);
    result[i] = phaseDiff * PHI_INV * Math.sin(phaseDiff);
  }
  return result;
}

function computeL4_Sensory(input: Float64Array): Float64Array {
  const N = input.length;
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const prev = i > 0 ? at(input, i - 1) : at(input, N - 1);
    const next = i < N - 1 ? at(input, i + 1) : at(input, 0);
    const laplacian = next - 2.0 * at(input, i) + prev;
    result[i] = laplacian * PHI_NEG2;
  }
  return result;
}

function computeL4p_WeightedRAM(input: Float64Array): Float64Array {
  const N = input.length;
  const result = new Float64Array(N);
  let totalWeight = 0.0;
  for (let i = 0; i < N; i++) totalWeight += Math.abs(at(input, i));
  for (let i = 0; i < N; i++) {
    const weight = Math.abs(at(input, i)) / (totalWeight + 1e-300);
    result[i] = at(input, i) * weight * PHI_INV;
  }
  return result;
}

// ── Worker message handler ──

parentPort.on("message", (task: ComputeTask) => {
  try {
    const input = new Float64Array(task.input);
    const fieldState = new Float64Array(task.fieldState);
    let output: Float64Array;

    switch (task.id) {
      // Frameworks
      case "F8_SubPlanckian":
        output = computeF8_SubPlanckian(input, fieldState);
        break;
      case "F4_Geometric":
        output = computeF4_Geometric(input, fieldState, task.scale);
        break;
      case "F5_ColorMusic":
        output = computeF5_ColorMusic(input, fieldState);
        break;
      case "F6_Hebrew":
        output = computeF6_Hebrew(input, fieldState);
        break;
      case "F7_Thermodynamic":
        output = computeF7_Thermodynamic(input, fieldState);
        break;
      case "F1_Septenary":
        output = computeF1_Septenary(input, fieldState);
        break;
      case "F9_Hypergalactic":
        output = computeF9_Hypergalactic(input, fieldState);
        break;
      // Memories
      case "L1_Pattern":
        output = computeL1_Pattern(input);
        break;
      case "L2_Hebbian":
        output = computeL2_Hebbian(input);
        break;
      case "L3_Kuramoto":
        output = computeL3_Kuramoto(input);
        break;
      case "L4_Sensory":
        output = computeL4_Sensory(input);
        break;
      case "L4+_WeightedRAM":
        output = computeL4p_WeightedRAM(input);
        break;
      default:
        throw new Error(`Unknown compute task: ${task.id}`);
    }

    const result: ComputeResult = {
      id: task.id,
      output: Array.from(output),
    };
    parentPort.postMessage(result);
  } catch (err) {
    const result: ComputeResult = {
      id: task.id,
      output: [],
      error: String(err),
    };
    parentPort.postMessage(result);
  }
});
