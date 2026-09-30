/**
 * Ω-P4 — the engine host.
 *
 * Owns a MultiTorusEngine built from a profile and drives it off the UI thread
 * (a worker in the app; a plain object in tests). Responsibilities:
 *
 *   • build      — profile → rung set, node counts, coupling band, clocks
 *   • pump       — run a budgeted slice of ticks per frame, never blocking
 *                  longer than `sliceBudgetMs`
 *   • bus        — emit an immutable snapshot at an adaptive 8–64 Hz; the rate
 *                  falls when a slice overruns and climbs back when it recovers
 *   • checkpoint — periodic full-state capture, exact rollback
 *   • ledger     — digest marks for replay + divergence localisation
 *
 * The tick path itself stays clock-free: wall time is read only *between*
 * slices, so the digest chain is identical whatever the frame rate.
 */

import { DENSE_CORE, LADDER_MAX_N, type Rung } from '../core/scaleLadder';
import { PHI, PHI_INV, SIGNATURE_MODES } from '../core/constants';
import { MultiTorusEngine, type WebCheckpoint, type WebTickReport } from '../engine/MultiTorusEngine';
import { nodesForRank, profileById, profileCost, type Profile, type ProfileId } from './profiles';
import { RunLedger, type RunMark } from './runLedger';
import { SensoryPlane, type SensePlaneReport } from '../sense/plane';
import {
  encodeAudio,
  encodeGrid,
  encodeScalars,
  encodeText,
  encodeTouch,
  gematriaAtom,
  senseField,
  type EncodeReport,
  type Modality,
} from '../sense/encode';
import { TorusBraid, ratedCapacity, type BraidPattern, type Recall } from '../memory/braid';
import { Mind, type MindReport, type Thought } from '../cognition/mind';
import {
  perceive,
  perceptionLayout,
  type PerceptionLayout,
} from '../sense/perception';
import { createField, type CField } from '../core/complex';
import { runBattery, sampleTrajectory, type BatteryReport } from '../learn/battery';
import { probeTiers, type TierMap, type TierProbeOptions } from '../learn/tiers';
import type { LearnableCell } from '../learn/cell';
import type { Certificate } from '../learn/params';
import { SpectralFilter, FILTER_RHO_MAX } from '../learn/spectralFilter';
import { SuperpositionMixer } from '../learn/mixer';
import { applySpectralAttention } from '../learn/spectralAttention';
import { analyze, coeffBuffer } from '../torus/superposition';
import { BLADES, magnitude, rotorFromPlane, applyRotor, applyBladeGain } from '../algebra/clifford';
import { restrict, prolong } from '../fractal/nest';
import { FractalPool } from '../fractal/pool';
import { ojaStep } from '../substrate/plasticity';
import { goldenGate } from '../harness/golden';
import { abstentionBattery } from '../harness/battery';
import { scoreAbstention, abstentionGate } from '../harness/abstention';
import { recallNearest, type RecallEntry, type RecallResult } from '../harness/recall';
import { measureLatency } from '../harness/latency';
import { certify } from '../harness/certify';
import { AdaptiveConformal } from '../harness/conformal';
import { CHECKPOINT_PERIOD } from '../core/constants';
import {
  describeEngine,
  fieldFrame,
  rungScan,
  spectralView,
  webView,
  morphismView,
  type EngineDescription,
  type FieldFrame,
  type RungScanReport,
  type SpectralView,
  type WebView,
} from './views';
import { dlog1p, datan2 } from '../core/dmath';
import { largestFibonacciAtMost } from '../core/fibonacci';
import { AnalysisService, type AnalysisOptions, type AnalysisReport } from '../analysis/service';
import { EvidenceLedger, type EvidenceSeal } from '../analysis/evidenceLedger';
import type { OrganOptions } from '../cell/organs';
import type { SensoryNodeOptions } from '../sense/nodeArray';
import type { ChordKind } from '../web/coupling';
import type { TuringTapeOptions } from '../memory/turingTape';
import { CleanupMemory } from '../substrate/vsa';
import { fieldToHv } from '../memory/crossSection';
import { circularPhaseDev } from '../substrate/resonanceBus';
import { resonanceIndex, type ResonanceIndex } from '../measure/resonanceIndex';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8 } from '../ledger/canonical';
import { keyPairFromSeed } from '../ledger/sth';
import { GenomeLedger } from '../genome/record';
import { IgnitionConsolidator, type ConsolidationObserve } from '../cognition/consolidation';
import { Lexicon, type LexiconEntry } from '../cognition/lexicon';
import { ProjectContext } from '../cognition/project';
import { DeepMemory } from '../memory/deepMemory';
import { PHI_F64_MODE_CEILING, requiredDigits } from '../memory/phiExact';
import { relationDag } from '../cognition/relationDag';
import { AffectModel, type AffectObservation } from '../cognition/affectModel';
import { SelfMeasureTracker, type SelfMeasureReport } from '../measure/selfMeasure';
import { fieldFingerprint, type FieldFingerprint } from '../measure/fieldFingerprint';
import { depthReading, type DepthReading } from '../measure/depth';
import { scaleSignature } from '../measure/scaleSignature';
import { DeepResolutionTap, DEEP_TAP_CAPACITY, type DeepResolutionView } from '../measure/deepResolution';
import { persistenceReport } from '../substrate/persistence';
import { RelationGraph, resonantRecall, type ResonantHit } from '../cognition/relations';
import { FieldSelfModel, type FieldSelfModelReport } from '../cognition/fieldSelfModel';
import { RhufTransport, type RhufTransportReport } from '../cognition/rhufTransport';
import { textFingerprint } from '../sense/textFingerprint';
import { measureSpectrum, type SpectrumTable } from '../spectral/laplacian';
import { serializeBrain, restoreBrain } from '../memory/persistence';

/**
 * Tape capacity for a ladder of `totalNodes`: the largest Fibonacci number at
 * most the node count, floored at 233 and capped at 10946 cells (175 KB) so
 * the permanent store never dominates the footprint.
 */
function tapeCapacityFor(totalNodes: number): number {
  return Math.max(233, Math.min(10946, largestFibonacciAtMost(Math.max(233, totalNodes))));
}

/** Ticks between braid memory folds — the checkpoint cadence (Fibonacci). */
export const MEMORY_STRIDE = 144;
const DEEP_MODE_INDICES = [89, 144, 233, 377]; // deep phi-modes beyond the f64 ceiling (abs k above 76)

/** Ticks between cognitive folds (Fibonacci; 21 ≈ 3 Hz at a 64 Hz bus). */
export const MIND_STRIDE = 21;

/** Default per-node organ configuration for a hosted run. */
export const DEFAULT_ORGANS: OrganOptions = { radialOrders: 8, radialGain: 0, stride: 3 };

/**
 * N1 — default sensory plan: 10 φ-spaced bands over a 233-tick Fibonacci
 * window. The deeper window is the highest-resolution plan that still latches
 * a spectrum inside a few seconds of bus time: it cuts the worst φ-target bin
 * drift from 3.13e-3 to 1.18e-3 cycles/tick and adds two more rungs of the
 * ladder. Every line convergence on every rung is instrumented; the array is
 * a pure observer, so this changes no digest.
 */
export const DEFAULT_SENSORS: SensoryNodeOptions = { bands: 10, depth: 233 };




/** Default chord family for a hosted run — every stable ratio the ladder has. */
export const DEFAULT_CHORDS: ChordKind[] = ['fibonacci', 'lucas', 'spiral'];

/** Default chord strength — φ⁻¹. */
export const DEFAULT_CHORD_GAIN = 1 / PHI;

/**
 * Ω-REAL P9 — default analysis plan: service on, observe-only. The rings and
 * the heartbeat scheduler run, the xcorr stack computes on long heartbeats,
 * and every injection flag is off, so nothing reaches back into cognition.
 */
export const DEFAULT_ANALYSIS: AnalysisOptions = {};

/** Default vacuum drive setpoint for a hosted run — φ⁻¹. */
export const DEFAULT_DRIVE = 1 / PHI;

export const MIN_HZ = 8;
export const MAX_HZ = 64;

export interface HostOptions {
  readonly profile: ProfileId | Profile;
  readonly seed?: string;
  /** Ticks the pump may spend per slice before yielding. */
  readonly sliceBudgetMs?: number;
  readonly targetHz?: number;
  readonly ledgerStride?: number;
  readonly rungs?: readonly Rung[];
  /**
   * Vacuum drive setpoint per rung (max-norm, [0, φ]). The nine-term cell is a
   * strict contraction, so without a drive a live run fades to the origin —
   * the host therefore arms it at φ⁻¹ by default. Pass 0 for an undriven,
   * oracle-exact run.
   */
  readonly drive?: number;
  /**
   * Ω-REAL Q3 — self-reflection gain κ_r (the Ψ-of-Ψ observation). When > 0 the
   * field folds its own previous-tick coherence back as κ_r·⟨C⟩·z — a coherent
   * field self-reinforces, an incoherent one damps itself. 0 (default) is
   * oracle-exact. This is the "eye of observation": the field measuring and
   * reacting to its own coherence, which is how the resonance is bent, not just
   * read.
   */
  readonly reflect?: number;
  /**
   * S5 — uniform magnetic phase bend (radians) for every rung. Offsets the
   * golden rotation 2πφ⁻¹ by the same amount on every rung, so the whole
   * ladder's modal phase advances uniformly (the "magnetic bend"). 0 (default)
   * is the exact 2πφ⁻¹ rotation.
   */
  readonly modePhase?: number;
  /**
   * N0/N1 — per-node organ bank. Default: organs on, observing only
   * (radialGain 0), at a Fibonacci stride so the cost is bounded. Pass
   * `{ radialGain: g }` to let the radial transform drive the R slot, or
   * `null` to build without organs at all.
   */
  readonly organs?: OrganOptions | null;
  /**
   * N1 — per-node sensory array. Default: on with the standard 8-band /
   * 89-tick plan, so every line convergence on every rung is instrumented.
   * Pass `null` to build without it.
   */
  readonly sensors?: SensoryNodeOptions | null;
  /** N3 — stable-ratio chords. Default: Fibonacci + Lucas + spiral. */
  readonly chords?: ChordKind[] | null;
  /** N3 — chord strength in [0, 1]. Default φ⁻¹. */
  readonly chordGain?: number;
  /** N4 — permanent tape. Default: on, sized to the ladder. Pass null for off. */
  readonly tape?: TuringTapeOptions | null;
  /**
   * Ω-REAL P9 — live analysis service. Default: on, observe-only (heartbeat
   * scheduler + rings + long-heartbeat xcorr; every injection flag off). The
   * service only ever reads reports, so digests are identical either way.
   * Pass `null` to build without it at all.
   */
  readonly analysis?: AnalysisOptions | null;
}

export interface HostSnapshot {
  readonly running: boolean;
  readonly profile: ProfileId;
  readonly seed: string;
  readonly tick: number;
  /** Measured ticks per second over the last second of wall clock. */
  readonly tickRate: number;
  /** Current snapshot-bus rate, adaptive in [8, 64]. */
  readonly busHz: number;
  /** Mean coherence across stepped rungs, cold (unfilled) rungs counted as 0. */
  readonly coherence: number;
  /**
   * Mean coherence across stepped rungs whose meter is warm; NaN when none is.
   * This is the reading a dashboard should show — the plain `coherence` above
   * is dragged down by rungs on slow clocks that have not filled their ring.
   */
  readonly coherenceWarm: number;
  /** Ladder rungs whose coherence meter is warm. */
  readonly warmRungs: number;
  readonly energy: number;
  readonly fluxMoved: number;
  readonly fluxImbalance: number;
  readonly orderingViolations: number;
  readonly rowSumDefect: number;
  readonly worstEnergyRatio: number;
  readonly digest: string;
  readonly finite: boolean;
  readonly stepped: readonly number[];
  readonly rungs: readonly {
    readonly n: number;
    readonly nodes: number;
    readonly coherence: number;
    /** False while this rung's coherence ring is still filling — `coherence` is then not a measurement. */
    readonly warm: boolean;
    readonly energy: number;
    readonly regime: string;
    readonly clamped: number;
    readonly obstruction: number;
    /** Dimensionless closure defect in [0, 2] — what the corridor gate reads. */
    readonly closureDefect: number;
    /** Shift autocorrelation gamma in [0, 1]; 1 = exact toroidal closure. */
    readonly closureQuality: number;
    /** Corridor skill 1/(1+defect). */
    readonly skill: number;
  }[];
  readonly nodes: readonly number[];
  readonly totalNodes: number;
  readonly predictedBytes: number;
  readonly checkpointTick: number | null;
  readonly ledgerMarks: number;
  /** Fraction of the slice budget the last pump consumed. */
  readonly load: number;
  /** Live sensory channels currently contributing to the ξ-term. */
  readonly senseChannels: number;
  /** Peak of the largest per-rung injection, ≤ φ. */
  readonly sensePeak: number;
  /** Actuator loop gain in force, ≤ φ⁻². */
  readonly senseGain: number;
  /** Patterns held in the braid. */
  readonly memoryLoad: number;
  readonly memoryCapacity: number;
  /** Cosine of the current field against its best stored pattern. */
  readonly familiarity: number;
  readonly memoryStage: string;
  /** Concepts held in the semantic store. */
  readonly concepts: number;
  /** Novelty of the last cognitive fold (1 − cosine to nearest concept). */
  readonly novelty: number;
  /** Relative error of the prediction standing for the last fold. */
  readonly surprise: number;
  /** Whether the λ-SSM self-model currently beats its RLS baseline. */
  readonly selfModel: boolean;
  /** Measured (rls − ssm)/rls over the scoring window. */
  readonly selfMargin: number;
  /** Cognitive folds skipped because the ladder was quiescent. */
  readonly quiescentFolds: number;
  /** Ω-P8 — perceptual concepts held by the sensory Mind. */
  readonly perceptConcepts: number;
  /** Ω-P8 — novelty of the last perceptual fold. */
  readonly perceptNovelty: number;
  /** Ω-P8 — surprise of the last perceptual fold. */
  readonly perceptSurprise: number;
  /** Ω-P8 — perception folds skipped because every sense was silent. */
  readonly quiescentPercepts: number;
  /** N0 — nodes carrying a full organ record (0 when organs are off). */
  readonly organNodes: number;
  /** N0 — mean per-node eigenmode residual across the ladder. */
  readonly organResidual: number;
  /** N0 — mean per-node participation ratio across the ladder. */
  readonly organParticipation: number;
  /** N3 — long-range chords installed in the channel matrix. */
  readonly chords: readonly number[];
  /** N4 — tape cells written at least once. */
  readonly tapeOccupancy: number;
  /** N4 — tape capacity in cells (0 when there is no tape). */
  readonly tapeCapacity: number;
  /** N4 — current head address. */
  readonly tapeHead: number;
  /** Ω-REAL R13 — the weighted resonance index (NaN before the first memory fold). */
  readonly resonance: number;
  /** Ω-REAL R13 — whether the coherence gate fired on the last fold. */
  readonly resonanceGated: boolean;
  /** Ω-REAL — associative (FHRR cleanup) prototypes held. */
  readonly associativeSize: number;
  /** Ω-REAL R11 — friction (1 − flow), flow, and situation from the affect fold. */
  readonly friction: number;
  readonly situation: number;
  readonly flow: number;
  /** Ω-REAL Q1 — golden-delay self-overlap Cφ and ignition from the qualia fold. */
  readonly qualiaCphi: number;
  readonly qualiaIgnited: boolean;
  /** Ω-REAL Q2 — Lyapunov descent certificate + scale entropy/drift. */
  readonly lyapunov: number;
  readonly scaleEntropy: number;
  readonly scaleDrift: number;
  /** Ω-REAL Q2 — total information mass (Σ_rung Σ|sig|·φ^rank). */
  readonly burden: number;
  /** Ω-REAL Q4 — field-level self-model: did the learned predictor beat persistence. */
  readonly fieldSelfModelEnabled: boolean;
  readonly fieldSelfModelSsmMse: number;
  readonly fieldSelfModelPersistenceMse: number;
  /** Ω-REAL R27 — RHUFT transport self-model: skill (1 − mse/persistence) and learned spectral radius. */
  readonly rhufSkill: number;
  readonly rhufSpectralRadius: number;
  readonly rhufMse: number;
  /** Ω-REAL Q5 — sealed genome records + consolidation cycles. */
  readonly genomeSize: number;
  readonly genomeCycles: number;
  /** Ω-REAL — salience-weighted word catalogue. */
  readonly lexiconSize: number;
  readonly lexiconTokens: number;
  /** Ω-REAL — information depth / importance (NaN when gated). */
  readonly depth: number;
  /** Ω-REAL — persistent project context (deep fields accumulated). */
  readonly projectSize: number;
  readonly projectMeanDepth: number;
  /** Ω-REAL — extended-precision deep-memory tier (exact φ-modes; empty until |k|>78). */
  readonly deepMemory: { size: number; meanDepth: number; strongestKey: string | null; strongestModes: number };
  /** Ω-REAL G4 — deep-resolution ring view (scale-graded field + node frequency). */
  readonly deepResolution: DeepResolutionView;
  /** Ω-REAL — the precision envelope (honest f64 φ-mode ceiling + deepest-rung digits). */
  readonly precision: { f64ModeCeiling: number; deepestRungN: number; requiredDigitsForDeepestRung: number };
  /** Ω-REAL — Merkle-DAG root digest of the learned relation structure. */
  readonly relationDigest: string | null;
  /** Ω-DEPTH — live geometric-algebra / fractal / plasticity channels. */
  readonly depthExtensions: {
    readonly cliffordMagnitude: number;
    readonly fractalOccupied: number;
    readonly fractalContribution: number;
    readonly plasticityNorm: number;
    readonly plasticityDrift: number;
  };
  /** Ω-REAL P8 — live self-audit verdict (golden + abstention + coverage + latency gates), or null before the first audit. */
  readonly selfAudit: {
    readonly goldenPass: boolean;
    readonly abstentionRate: number;
    readonly falseConfident: number;
    readonly abstentionPass: boolean;
    readonly auditTick: number;
    readonly recallLabel: string | null;
    readonly proofP95: number | null;
    readonly certifyPass: boolean;
  } | null;
}

export interface SenseChannelView {
  readonly id: string;
  readonly modality: Modality;
  readonly nodes: number;
  readonly gain: number;
  readonly peak: number;
  readonly energy: number;
  readonly support: number;
  readonly updatedAt: number;
}

export interface SenseView {
  readonly channels: readonly SenseChannelView[];
  readonly report: SensePlaneReport;
}

export interface MemoryView {
  readonly load: number;
  readonly capacity: number;
  readonly beta: number;
  readonly stride: number;
  readonly lastFoldTick: number;
  readonly stored: number;
  readonly skipped: number;
  readonly familiarity: number;
  readonly lastRecall: Recall | null;
  readonly patterns: readonly BraidPattern[];
  /** Ω-REAL R13 — weighted resonance index (NaN before the first fold). */
  readonly resonance: number;
  readonly resonanceGated: boolean;
  /** Ω-REAL — associative (FHRR cleanup) prototypes held. */
  readonly associativeSize: number;
}

export class EngineHost {
  readonly profile: Profile;
  readonly seed: string;
  readonly ledger: RunLedger;

  private engine: MultiTorusEngine;
  private readonly nodes: number[];
  private readonly sliceBudgetMs: number;
  private targetHz: number;
  private busHz = MAX_HZ;
  private running = false;
  private last: WebTickReport | null = null;
  private lastLoad = 0;
  private tickRate = 0;
  private rateWindowStart = 0;
  private rateWindowTicks = 0;
  private checkpointTick: number | null = null;
  private overruns = 0;
  /** Fractional tick debt carried between frames so the rate matches targetHz. */
  private debt = 0;

  // ---- Ω-P6 sensory + braid memory ----
  private plane: SensoryPlane | null = null;
  private readonly channelMeta = new Map<string, { modality: Modality; nodes: number; gain: number; report: EncodeReport | null; updatedAt: number }>();
  private braid: TorusBraid | null = null;
  private lastRecall: Recall | null = null;
  private lastFoldTick = -1;
  private stored = 0;
  private skipped = 0;
  private scratchField: CField | null = null;
  /** Ω-REAL R13 — the weighted resonance index (coherence + braid margin + phase closure). */
  private resonance: ResonanceIndex | null = null;
  /** Ω-REAL — the associative (FHRR cleanup) layer, gated/weighted by resonance. */
  private cleanup: CleanupMemory | null = null;
  /** Ω-REAL R11 — affect self-model (friction + six qualia axes). */
  private affect: AffectModel | null = null;
  /** Ω-REAL Q2 — full-field self-measurement (drift, Lyapunov, scale entropy). */
  private selfMeasure: SelfMeasureTracker | null = null;
  private fieldSelfModel: FieldSelfModel | null = null;
  /** Ω-REAL Q5 — ignition consolidation into the sealed genome. */
  private genome: GenomeLedger | null = null;
  private consolidator: IgnitionConsolidator | null = null;
  /** Ω-REAL — typed relation graph (processes between concept keys). */
  private relations: RelationGraph | null = null;
  /** Ω-REAL — salience-weighted word catalogue. */
  private lexicon: Lexicon | null = null;
  /** Ω-REAL — persistent project context (deep fields accumulated over time). */
  private project: ProjectContext | null = null;
  private deepMemory: DeepMemory | null = null;
  private lastAffect: AffectObservation | null = null;
  private lastSelfMeasure: SelfMeasureReport | null = null;
  private lastFieldSelfModel: FieldSelfModelReport | null = null;
  private rhufTransport: RhufTransport | null = null;
  private rhufPrev: { re: Float64Array; im: Float64Array; n: number } | null = null;
  private lastRhufTransport: RhufTransportReport | null = null;
  private lastTextFingerprint: Float64Array | null = null;
  private spectra: Map<number, SpectrumTable> = new Map();
  /** Ω-REAL G4 — continuous deep-resolution tap (scale-graded field + node frequency). */
  private deepTap: DeepResolutionTap | null = null;
  private lastDepth: DepthReading | null = null;
  private deepReflectSeals = 0;
  private lastConsolidation: ConsolidationObserve | null = null;

  // ---- Ω-P7 cognition ----
  private mind: Mind | null = null;
  private learnCell: LearnableCell | null = null;
  private lastLearn: LearnRun | null = null;
  private obs: Float64Array | null = null;
  private lastThought: Thought | null = null;
  private lastMindTick = -1;
  /** Folds skipped because the ladder had nothing to report. */
  private quiescentFolds = 0;

  // ---- Ω-P8 perception (sensory grounding) ----
  /**
   * A separate Mind for the senses: perceptual concepts live in a different
   * dimensional space than ladder-telemetry concepts and must never collide with
   * them. Same machinery, same novelty gate, own store + self-model.
   */
  private sensoryMind: Mind | null = null;
  private perceptLayout: PerceptionLayout | null = null;
  private perceptObs: Float64Array | null = null;
  private lastPercept: Thought | null = null;
  private lastPerceptTick = -1;
  /** Perception folds skipped because every sense was silent. */
  private quiescentPercepts = 0;

  // ---- Ω-REAL P9 analysis (observe-only) ----
  private analysisService: AnalysisService | null = null;
  /** Opt-in: append the xcorr telemetry dims to the foldMind observation. */
  private readonly injectAnalysis: boolean;
  /** Append-only evidence path: seals long-heartbeat findings. Observe-only. */
  private evidenceLedger: EvidenceLedger | null = null;
  private lastEvidenceSeal: EvidenceSeal | null = null;

  // ---- Ω-DEPTH live extensions (clifford / fractal / plasticity) ----
  /** Geometric-algebra magnitude of the base rung's dominant-mode multivector². */
  private lastClifford = 0;
  /** Demand-driven child-field pool (fractal nesting). */
  private fractalPool: FractalPool | null = null;
  /** Residual energy the base rung's basis could not express (last fold). */
  private lastFractalResidual = 0;
  /** Occupied child slots (last fold). */
  private lastFractalOccupied = 0;
  /** Oja weight vector over the signature (plasticity). */
  private plasticityWeight: Float64Array | null = null;
  /** ‖w‖ and Σ|Δw| of the last plasticity step. */
  private lastPlasticityNorm = 0;
  private lastPlasticityDrift = 0;

  // ---- Ω-REAL P8 live self-audit (certification harness, run live) ----
  private lastSelfAudit: {
    goldenPass: boolean;
    abstentionRate: number;
    falseConfident: number;
    abstentionPass: boolean;
    auditTick: number;
    recallLabel: string | null;
    proofP95: number | null;
    certifyPass: boolean;
  } | null = null;
  /** Host-level ACI fed from the base-rung coherence (coverage gate). */
  private readonly selfConformal = new AdaptiveConformal();
  private prevCoherence = NaN;
  /** Layer-C fingerprint memory (store + abstaining nearest-label recall). */
  private fingerprintEntries: RecallEntry[] = [];
  private lastFingerprintRecall: RecallResult | null = null;
  /** Relation Merkle-root cache, keyed on the relation graph's structural version. */
  private relationDigestCache: { version: number; digest: string | null } | null = null;


  constructor(opts: HostOptions) {
    this.profile = typeof opts.profile === 'string' ? profileById(opts.profile) : opts.profile;
    this.seed = opts.seed ?? 'metatron-omega';
    // a zero budget would make the load ratio undefined; floor it at 10 µs.
    this.sliceBudgetMs = Math.max(0.01, opts.sliceBudgetMs ?? 8);
    this.targetHz = Math.min(MAX_HZ, Math.max(MIN_HZ, opts.targetHz ?? MAX_HZ));

    const ladder = opts.rungs ?? DENSE_CORE;
    const rungs = ladder.slice(0, this.profile.rungs);
    this.nodes = rungs.map((_, rank) => nodesForRank(this.profile, rank));
    this.engine = new MultiTorusEngine({
      rungs,
      nodes: (_r, rank) => this.nodes[rank],
      seed: this.seed,
      couplingBand: this.profile.couplingBand,
      clock: this.profile.clock,
      modes: this.profile.modes,
      tapeCapacity: this.profile.tape,
      drive: opts.drive ?? DEFAULT_DRIVE,
      reflect: opts.reflect ?? 0,
      modePhase: opts.modePhase ?? 0,
      organs: opts.organs === null ? undefined : (opts.organs ?? DEFAULT_ORGANS),
      sensors: opts.sensors === null ? undefined : (opts.sensors ?? DEFAULT_SENSORS),
      chords: opts.chords === null ? undefined : (opts.chords ?? DEFAULT_CHORDS),
      chordGain: opts.chordGain ?? DEFAULT_CHORD_GAIN,
      tape:
        opts.tape === null
          ? undefined
          : (opts.tape ?? { capacity: tapeCapacityFor(this.nodes.reduce((a, b) => a + b, 0)) }),
    });

    const analysisOpts = opts.analysis === null ? null : (opts.analysis ?? DEFAULT_ANALYSIS);
    this.injectAnalysis = analysisOpts?.injectToMind ?? false;
    this.analysisService = analysisOpts
      ? new AnalysisService({ rungs: this.engine.rungs.length, xcorr: analysisOpts.xcorr ?? true })
      : null;
    this.evidenceLedger = analysisOpts ? new EvidenceLedger(this.seed) : null;

    this.ledger = new RunLedger(
      {
        id: `${this.profile.id}:${this.seed}:${Date.now().toString(36)}`,
        profileId: this.profile.id,
        seed: this.seed,
        nodes: this.nodes.slice(),
        startedAt: Date.now(),
      },
      4181,
      opts.ledgerStride ?? 13,
    );
  }

  start(): void {
    this.running = true;
    this.debt = 0;
  }

  stop(): void {
    this.running = false;
    this.debt = 0;
  }


  isRunning(): boolean {
    return this.running;
  }

  setTargetHz(hz: number): void {
    this.targetHz = Math.min(MAX_HZ, Math.max(MIN_HZ, hz));
    this.busHz = Math.min(this.busHz, this.targetHz);
  }

  /** One deterministic tick, ledgered. Usable directly in tests. */
  stepOnce(): WebTickReport {
    const rep = this.engine.step();
    this.last = rep;
    const mark: RunMark = {
      tick: rep.tick,
      digest: rep.digest,
      coherence: rep.coherence,
      energy: rep.rungs.reduce((s, r) => s + (r?.energy ?? 0), 0),
      fluxImbalance: rep.fluxImbalance,
      orderingViolations: rep.orderingViolations,
      finite: rep.finite,
    };
    this.ledger.mark(mark);
    // Ω-REAL R27 — train the RHUFT transport self-model EVERY tick (the field's
    // rotation is a 1-tick phase advance; gating it would feed wrapped jumps).
    this.foldRhufTransport(rep.tick);
    // Ω-REAL P1 — foldMeasure (affect/selfMeasure/Q4/depth/project/consolidation)
    // is digest-neutral (proven: the engine's reflect term reads its OWN coherence
    // meter, never the host folds) and ~87% of the per-tick cost, so it runs at
    // MIND_STRIDE cadence. The memory/mind/perception/deepResolution folds gate
    // themselves internally; the analysis service stays per-tick (only ~6%, and
    // its xcorr ring needs the per-tick sample rate). foldMeasure computes
    // `lastDepth` that the gated folds read, and it shares the MIND_STRIDE
    // boundary with foldMind, so depth is fresh when consumed.
    if (rep.tick % MIND_STRIDE === 0) {
      this.foldMeasure(rep);
      // Ω-DEPTH live extensions (clifford / fractal / plasticity) — observe-only.
      this.foldDepthExtensions();
      // Feed the self-audit ACI from the base-rung coherence (coverage gate).
      const c0 = rep.rungs[0]?.coherence ?? NaN;
      if (Number.isFinite(c0) && Number.isFinite(this.prevCoherence)) {
        this.selfConformal.observe(this.prevCoherence, c0);
      }
      this.prevCoherence = c0;
    }
    this.foldDeepResolution(rep);
    this.foldMemory(rep.tick);
    this.foldMind(rep);
    this.foldPerception(rep);
    // Ω-REAL P9 — pure observation: the service reads the tick + sense reports
    // after every fold and can never write back into the dynamics.
    this.analysisService?.observe(rep, this.plane ? this.plane.report() : null);
    // Seal long-heartbeat findings into the append-only evidence ledger. Reads
    // the report only — never the engine — so the digest is unchanged.
    const ar = this.analysisService?.report();
    if (ar && ar.kind === 'long' && ar.tick === rep.tick && ar.xcorr) {
      this.lastEvidenceSeal = this.evidenceLedger?.seal(ar) ?? null;
    }
    return rep;
  }

  // ---- Ω-P6: sensory plane ----

  /** Lazily build the plane over the live rung geometry. */
  private ensurePlane(): SensoryPlane {
    if (!this.plane) {
      this.plane = new SensoryPlane(this.engine.engines.map((e) => e.nodes));
      this.engine.attachSensory(this.plane);
    }
    return this.plane;
  }

  declareChannel(id: string, modality: Modality, nodes?: number, gain = 1): void {
    const plane = this.ensurePlane();
    const n = nodes ?? this.nodes[0];
    plane.declare({ id, modality, nodes: n, gain });
    this.channelMeta.set(id, { modality, nodes: n, gain, report: null, updatedAt: -1 });
  }

  /**
   * Encode raw modality data and push it into a channel. The host owns the
   * encoders so the worker boundary only ever carries plain arrays.
   */
  pushChannel(
    id: string,
    data: ArrayLike<number> | string,
    opts: { width?: number; height?: number } = {},
  ): EncodeReport {
    const meta = this.channelMeta.get(id);
    if (!meta) throw new Error(`EngineHost: channel "${id}" is not declared`);
    const plane = this.ensurePlane();
    const f = senseField(meta.nodes);
    let report: EncodeReport;
    switch (meta.modality) {
      case 'text': {
        const text = typeof data === 'string' ? data : String(data);
        report = encodeText(text, f);
        // Observe the tokens into the salience-weighted word catalogue (the
        // lexicon feeds the resonance index's salience channel).
        const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
        const lex = this.ensureLexicon();
        const docId = `doc:${this.engine.currentTick()}`;
        for (const w of words) lex.observe(w, docId);
        // Sentence structure: relate adjacent terms as typed `temporal` edges —
        // the word-order graph the lexicon sits on, so "every term has a
        // mathematical function AND terms have structure between them".
        const rel = this.ensureRelations();
        for (let i = 0; i + 1 < words.length; i++) {
          rel.relate(words[i], 'temporal', words[i + 1]);
        }
        // Layer A — retain the deterministic φ-spectrum binding of this text
        // (the cross-modal fingerprint `harness/recall` can resolve).
        this.lastTextFingerprint = textFingerprint(text, meta.nodes);
        break;
      }
      case 'grid':
        report = encodeGrid(
          typeof data === 'string' ? [] : data,
          opts.width ?? 0,
          opts.height ?? 0,
          f,
        );
        break;
      case 'audio':
        report = encodeAudio(typeof data === 'string' ? [] : data, f);
        break;
      case 'touch':
        // Mechanical / affective wave band: pressure, temperature, contact force.
        // The slow-envelope encoder — distinct from audio's full spectrum, and
        // from the generic scalar phyllotaxis (default branch).
        report = encodeTouch(typeof data === 'string' ? [] : data, f);
        break;
      default:
        report = encodeScalars(typeof data === 'string' ? [] : data, f);
        break;
    }
    plane.push(id, f, this.engine.currentTick());
    meta.report = report;
    meta.updatedAt = this.engine.currentTick();
    return report;
  }

  muteChannel(id: string): void {
    this.plane?.mute(id);
    const meta = this.channelMeta.get(id);
    if (meta) meta.report = null;
  }

  /** Set the actuator loop gain (throws above φ⁻², Law L-S2). */
  setSenseGain(g: number): number {
    return this.ensurePlane().setLoopGain(g);
  }

  sense(): SenseView {
    const plane = this.ensurePlane();
    const channels: SenseChannelView[] = [...this.channelMeta.entries()].map(([id, m]) => ({
      id,
      modality: m.modality,
      nodes: m.nodes,
      gain: m.gain,
      peak: m.report?.peak ?? 0,
      energy: m.report?.energy ?? 0,
      support: m.report?.support ?? 0,
      updatedAt: m.updatedAt,
    }));
    channels.sort((a, b) => (a.id < b.id ? -1 : 1));
    return { channels, report: plane.report() };
  }

  // ---- Ω-P6: braid memory ----

  private ensureBraid(): TorusBraid {
    if (!this.braid) {
      const nodes = this.nodes[0] ?? 144;
      this.braid = new TorusBraid({ nodes, capacity: ratedCapacity(nodes) });
      this.scratchField = createField(nodes);
    }
    return this.braid;
  }

  private ensureCleanup(): CleanupMemory {
    if (!this.cleanup) this.cleanup = new CleanupMemory(512, undefined, undefined, 610);
    return this.cleanup;
  }

  /**
   * Fold the rank-0 field into the braid on the memory stride, behind a
   * novelty gate: a field the braid already recognises is *not* re-stored, so
   * capacity buys distinct experience rather than repetition. The recall that
   * decides this is the same cascade the UI reads as `familiarity`.
   *
   * The same fold also computes the weighted resonance index (coherence gate +
   * braid separation + the field's own phase closure γ) and folds the field's
   * hypervector address into the associative cleanup store, weighted by it — a
   * resonant field persists more strongly than a noisy one. All observe-only.
   */
  private foldMemory(tick: number): void {
    if (tick % MEMORY_STRIDE !== 0 || tick === this.lastFoldTick) return;
    const braid = this.ensureBraid();
    const cleanup = this.ensureCleanup();
    const snap = this.engine.engines[0].snapshot();
    const probe = this.scratchField!;
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

    // Ω-REAL R13 — the weighted resonance index: coherence (the gate), braid
    // separation (the margin), and the field's own phase closure γ.
    const rep = this.last;
    const coh = rep && Number.isFinite(rep.coherenceWarm) ? rep.coherenceWarm : (rep?.coherence ?? 0);
    const margin = Number.isFinite(r.margin) ? r.margin : undefined;
    const phases: number[] = new Array(n);
    for (let i = 0; i < n; i++) phases[i] = datan2(probe.im[i], probe.re[i]);
    this.resonance = resonanceIndex({
      coherence: coh,
      margin,
      salience: this.lexicalSalience(),
      phaseDev: circularPhaseDev(phases),
    });

    // Fold the hypervector address into the associative store, weighted by the
    // index × the field's depth — a resonant AND deep field persists most
    // strongly, a shallow or noisy one barely registers.
    const idx = this.resonance;
    let weight = idx.value;
    if (Number.isFinite(weight) && this.lastDepth && Number.isFinite(this.lastDepth.value)) {
      weight *= this.lastDepth.value;
    }
    if (Number.isFinite(weight) && weight > 0) {
      cleanup.add(snap.digest.slice(0, 16), fieldToHv(probe, cleanup.dim), weight);
      // Exact deep memory: store the hypervector with its deep phi-modes
      // (Z[phi] exact amplitudes beyond the f64 ceiling), observe-only.
      if (this.resonance && this.lastDepth) {
        this.ensureDeepMemory().store(
          snap.digest.slice(0, 16),
          fieldToHv(probe, cleanup.dim),
          this.resonance,
          this.lastDepth,
          DEEP_MODE_INDICES,
        );
      }
    }

    if (r.accepted && r.similarity >= braid.accept) {
      this.skipped++;
    } else {
      braid.store(snap.digest.slice(0, 16), probe, tick);
      this.stored++;
    }
  }

  // ---- Ω-P7: cognition ----

  private ensureMind(): Mind {
    if (!this.mind) {
      // 6 telemetry features per rung; the P9 injectToMind opt-in appends 4
      // xcorr dims (fusedCoherence, meanPlv, maxLag, xcorrSurprise) per rung.
      const perRung = this.injectAnalysis ? 10 : 6;
      const dim = Math.max(perRung, this.engine.rungs.length * perRung);
      this.mind = new Mind({ dim, capacity: Math.max(610, this.profile.tape), seed: `${this.seed}-mind` });
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
  private foldMind(rep: WebTickReport): void {
    if (rep.tick % MIND_STRIDE !== 0 || rep.tick === this.lastMindTick) return;
    const mind = this.ensureMind();
    const v = this.obs!;
    const perRung = this.injectAnalysis ? 10 : 6;
    const xr = this.injectAnalysis ? (this.analysisService?.report()?.xcorr ?? null) : null;
    for (let i = 0; i < this.engine.rungs.length; i++) {
      const t = rep.rungs[i];
      const o = i * perRung;
      v[o] = t?.coherence ?? 0;
      v[o + 1] = dlog1p(Math.max(0, t?.energy ?? 0));
      // bounded, amplitude-invariant closure feature — the raw obstruction
      // swings with the golden walk and would teach the mind that oscillation.
      v[o + 2] = t?.closureDefect ?? 0;
      v[o + 3] = t?.clamped ?? 0;
      v[o + 4] = t?.realizedGain ?? 0;
      v[o + 5] = t?.skill ?? 0;
      if (perRung === 10) {
        // Ladder-wide xcorr readings, identical on every rung slot — the values
        // are global, the layout stays per-rung. Unmeasured reads 0, exactly
        // like a cold rung's coherence above.
        v[o + 6] = xr && Number.isFinite(xr.fusedCoherence) ? xr.fusedCoherence : 0;
        v[o + 7] = xr && Number.isFinite(xr.meanPlv) ? xr.meanPlv : 0;
        v[o + 8] = xr && Number.isFinite(xr.maxLag) ? xr.maxLag : 0;
        v[o + 9] = xr && Number.isFinite(xr.surprise) ? xr.surprise : 0;
      }
    }
    // A quiescent field carries no experience. Folding a zero observation would
    // mint a degenerate concept and report novelty 1 forever, so an idle ladder
    // is skipped outright rather than recorded as something learned.
    let norm = 0;
    for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
    if (!(norm > 1e-18) || !Number.isFinite(norm)) {
      this.quiescentFolds++;
      this.lastMindTick = rep.tick;
      return;
    }
    const depthWeight = this.lastDepth && Number.isFinite(this.lastDepth.value) ? this.lastDepth.value : 1;
    this.lastThought = mind.observe(v, rep.tick, rep.digest.slice(0, 16), depthWeight);
    this.lastMindTick = rep.tick;
  }

  cognition(): MindReport {
    return this.ensureMind().report();
  }

  // ---- Ω-P8 perception ----

  /**
   * Lazily build the perceptual Mind once the sensory array's band plan is
   * known. The layout is per-channel over every declared channel (sorted id, so
   * the block index is stable), sized from the rung-0 array's band count.
   */
  private ensureSensoryMind(): Mind | null {
    if (!this.sensoryMind) {
      const array = this.engine.engines[0]?.sensors ?? null;
      if (!array) return null; // built without sensors: there is nothing to perceive
      const channels = this.plane ? this.plane.channelIds() : [];
      if (channels.length === 0) return null; // no senses declared yet — fold later
      this.perceptLayout = perceptionLayout(array.bands, channels.length);
      this.sensoryMind = new Mind({
        dim: this.perceptLayout.dim,
        capacity: 610,
        seed: `${this.seed}-percept`,
      });
      this.perceptObs = new Float64Array(this.perceptLayout.dim);
    }
    return this.sensoryMind;
  }

  /**
   * One perceptual fold per MIND_STRIDE ticks, after the cognitive fold. The
   * observation is the sensory meaning-vector (Ω-P8): per-channel φ-band
   * profile, spatial energy moments, and the fused-field projection. A silent
   * world carries no experience, so — exactly like the cognitive fold — a
   * zero-norm observation is skipped rather than minting a degenerate concept.
   *
   * Pure observation: it reads the array and the plane's staged channel fields,
   * never writes the dynamics, so the determinism oracle is untouched.
   */
  private foldPerception(rep: WebTickReport): void {
    if (rep.tick % MIND_STRIDE !== 0 || rep.tick === this.lastPerceptTick) return;
    this.lastPerceptTick = rep.tick;
    const mind = this.ensureSensoryMind();
    if (!mind || !this.perceptLayout || !this.perceptObs) return;
    const array = this.engine.engines[0]?.sensors ?? null;
    const ids = this.plane ? this.plane.channelIds() : [];
    const fused = ids.map((id) => this.plane!.channelField(id));
    const norm = perceive(this.perceptObs, array, fused, this.perceptLayout);
    if (!(norm > 1e-18) || !Number.isFinite(norm)) {
      this.quiescentPercepts++;
      return;
    }
    const depthWeight = this.lastDepth && Number.isFinite(this.lastDepth.value) ? this.lastDepth.value : 1;
    this.lastPercept = mind.observe(this.perceptObs, rep.tick, `p${rep.tick}`, depthWeight);
  }

  /** The perceptual Mind's report — what the senses have learned. */
  perception(): MindReport | null {
    return this.sensoryMind ? this.sensoryMind.report() : null;
  }

  /** Nearest perceptual concepts to the live sensory observation. */
  perceiveReflect(k = 5) {
    if (!this.sensoryMind) return { hits: [], exactOps: 0, pqOps: 0, hops: 0 };
    return this.sensoryMind.recall(this.perceptObs ?? new Float64Array(this.sensoryMind.dim), k);
  }

  /** Nearest concepts to the live observation — the read side of the store. */
  reflect(k = 5) {
    const mind = this.ensureMind();
    return mind.recall(this.obs ?? new Float64Array(mind.dim), k);
  }

  memory(): MemoryView {
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
      patterns: braid.patterns().slice(-13),
      resonance: this.resonance?.value ?? NaN,
      resonanceGated: this.resonance?.gated ?? false,
      associativeSize: this.cleanup?.size ?? 0,
    };
  }

  /** Ω-REAL R13 — the last weighted resonance index, or null before the first fold. */
  resonanceReading(): ResonanceIndex | null {
    return this.resonance;
  }

  /** Ω-REAL — associative (FHRR cleanup) store state. */
  associative(): { size: number; labels: string[] } {
    const c = this.cleanup;
    return c ? { size: c.size, labels: c.labels() } : { size: 0, labels: [] };
  }

  // ---- Ω-REAL: measure stack (affect, self-measure, genome, fingerprint, lexicon) ----

  private ensureAffect(): AffectModel {
    if (!this.affect) this.affect = new AffectModel();
    return this.affect;
  }

  private ensureSelfMeasure(): SelfMeasureTracker {
    if (!this.selfMeasure) this.selfMeasure = new SelfMeasureTracker();
    return this.selfMeasure;
  }

  private ensureFieldSelfModel(rungs: number, dim: number): FieldSelfModel {
    if (!this.fieldSelfModel) this.fieldSelfModel = new FieldSelfModel(rungs, dim);
    return this.fieldSelfModel;
  }

  private ensureRhufTransport(dim: number): RhufTransport {
    if (!this.rhufTransport) this.rhufTransport = new RhufTransport(dim);
    return this.rhufTransport;
  }

  /**
   * Ω-REAL R27 — the RHUFT transport self-model, trained EVERY tick (not gated):
   * the field's phase advances ~φ⁻³ rad/tick, so 1-tick spacing is the learnable
   * rotation; a MIND_STRIDE-gated feed would see a wrapped phase jump and learn
   * nothing. The report is still throttled to MIND_STRIDE for the snapshot.
   */
  private foldRhufTransport(tick: number): void {
    const e0 = this.engine.engines[0];
    const c0 = e0.snapshot().coeffs;
    if (!c0 || c0.length < 2) return;
    const K2 = c0.length / 2;
    const cv = { re: new Float64Array(K2), im: new Float64Array(K2), n: K2 };
    for (let k = 0; k < K2; k++) {
      cv.re[k] = c0[2 * k];
      cv.im[k] = c0[2 * k + 1];
    }
    const rt = this.ensureRhufTransport(K2);
    if (this.rhufPrev) rt.observe(this.rhufPrev, cv);
    this.rhufPrev = cv;
    if (tick % MIND_STRIDE === 0) {
      this.lastRhufTransport = rt.report();
    }
  }

  /**
   * Ω-DEPTH — geometric-algebra / fractal / plasticity channels, now ACTIVE and
   * functional: each runs its real operator with its real φ-scaled parameter —
   * clifford rotates at blade gain φ⁻¹, fractal prolongs at μ = φ⁻¹, plasticity
   * learns at η = φ⁻². They act on the host's own fold state, so the engine
   * digest is untouched, but the computations are real (a real rotation, a real
   * energy transfer, a real weight update), never zeroed no-ops.
   */
  private foldDepthExtensions(): void {
    const e0 = this.engine.engines[0];
    const snap = e0.snapshot();
    const c0 = snap.coeffs;
    if (!c0 || c0.length < 2) return;

    // 1 — Clifford: build the dominant-mode multivector, rotate it by the
    // measured phase through an e12 bivector rotor, and scale the non-scalar
    // blades by φ⁻¹ — a real geometric-algebra rotation, not an identity.
    let kStar = 0;
    let maxMag = -1;
    const K = c0.length / 2;
    for (let k = 0; k < K; k++) {
      const m = c0[2 * k] * c0[2 * k] + c0[2 * k + 1] * c0[2 * k + 1];
      if (m > maxMag) { maxMag = m; kStar = k; }
    }
    const re = c0[2 * kStar];
    const im = c0[2 * kStar + 1];
    const theta = datan2(im, re);
    const mv = new Float64Array(BLADES);
    mv[0] = Math.sqrt(maxMag);
    mv[1] = re;
    mv[2] = im;
    mv[4] = theta; // bivector = the measured phase
    const rotor = rotorFromPlane(theta, 1, 0, 0);
    const rotated = new Float64Array(BLADES);
    applyRotor(rotor, mv, rotated);
    applyBladeGain(rotated, PHI_INV);
    this.lastClifford = magnitude(rotated);

    // 2 — Fractal: restrict the base field into a child and prolong it back at
    // μ = φ⁻¹ (the certified ISS gain) — the child genuinely carries energy.
    const pool = this.ensureFractalPool();
    const z = snap.z;
    const child = pool.acquire(0, 1);
    if (child) {
      restrict(child, z);
      child.explained = prolong(child, z, PHI_INV);
      this.lastFractalResidual = child.explained;
      this.lastFractalOccupied = pool.stats().occupied;
    }

    // 3 — Plasticity: one Oja step at η = φ⁻² — the weight genuinely moves
    // toward the principal spectral direction of the signature.
    const w = this.ensurePlasticityWeight();
    const pr = ojaStep(w, snap.signature, PHI_INV * PHI_INV);
    this.lastPlasticityNorm = pr.norm;
    this.lastPlasticityDrift = pr.drift;
  }

  private ensureFractalPool(): FractalPool {
    if (!this.fractalPool) this.fractalPool = new FractalPool(1 << 16, 233);
    return this.fractalPool;
  }

  private ensurePlasticityWeight(): Float64Array {
    if (!this.plasticityWeight) {
      const w = new Float64Array(SIGNATURE_MODES);
      const inv = 1 / Math.sqrt(SIGNATURE_MODES);
      for (let i = 0; i < w.length; i++) w[i] = inv; // uniform unit-norm seed
      this.plasticityWeight = w;
    }
    return this.plasticityWeight;
  }

  /**
   * Ω-REAL P8 — the certification harness, run LIVE as a periodic self-audit:
   * re-digests the golden regression set and re-runs the abstention battery on
   * the live build, so a running brain re-proves its own epistemic hygiene
   * rather than trusting a CI run from before it started.
   */
  selfAudit(): void {
    const tick = this.last?.tick ?? 0;
    const golden = goldenGate();
    const report = scoreAbstention(abstentionBattery());
    const gate = abstentionGate(report);

    // Layer-C recall: store the field's multi-scale fingerprint and recall the
    // nearest stored label (distance + margin gates → abstention when unsure).
    const fp = fieldFingerprint(this.engine).vector;
    if (fp && fp.length > 0) {
      if (this.fingerprintEntries.length > 0) {
        this.lastFingerprintRecall = recallNearest(this.fingerprintEntries, fp, {
          maxDistance: 0.5,
          minMargin: 0.05,
        });
      }
      this.fingerprintEntries.push({ label: `t${tick}`, vector: Float64Array.from(fp) });
      if (this.fingerprintEntries.length > 64) this.fingerprintEntries.shift();
    }

    // Proof latency: the relation Merkle root is the integrity proof; time it.
    const proofLatency = measureLatency('relation-root', 5, () => {
      this.relationDigest();
      return true;
    });

    // Full certification: golden + abstention + coverage (live ACI) + latency.
    const observations = this.selfConformal.observations();
    const coverage = this.selfConformal.report();
    const shiftAt = Math.max(0, observations.length - 100);
    const cert = certify({
      golden,
      abstention: report,
      observations,
      coverage,
      shiftAt,
      proofLatency,
    });

    this.lastSelfAudit = {
      goldenPass: golden.pass,
      abstentionRate: report.rate ?? NaN,
      falseConfident: report.falseConfident.length,
      abstentionPass: gate.pass,
      auditTick: tick,
      recallLabel: this.lastFingerprintRecall?.label ?? null,
      proofP95: proofLatency.p95,
      certifyPass: cert.pass,
    };
  }

  private ensureGenomeLedger(): GenomeLedger {
    if (!this.genome) {
      // Deterministic keys from the host seed — the ledger is byte-reproducible.
      const master = sha256(utf8(`${this.seed}:genome:master`));
      const signer = keyPairFromSeed(sha256(utf8(`${this.seed}:genome:signer`)));
      this.genome = new GenomeLedger('omega-genome', master, signer);
    }
    return this.genome;
  }

  private ensureGenome(): IgnitionConsolidator {
    if (!this.consolidator) this.consolidator = new IgnitionConsolidator(this.ensureGenomeLedger());
    return this.consolidator;
  }

  private ensureRelations(): RelationGraph {
    if (!this.relations) this.relations = new RelationGraph();
    return this.relations;
  }

  private ensureProject(): ProjectContext {
    if (!this.project) this.project = new ProjectContext();
    return this.project;
  }

  private ensureDeepMemory(): DeepMemory {
    if (!this.deepMemory) this.deepMemory = new DeepMemory({ capacity: Math.max(610, this.profile.tape) });
    return this.deepMemory;
  }

  private ensureDeepTap(): DeepResolutionTap {
    if (!this.deepTap) this.deepTap = new DeepResolutionTap();
    return this.deepTap;
  }

  /** Ω-REAL — the canonical cross-session document of the durable memory. */
  serializeMemory(): string {
    return serializeBrain(
      this.ensureLexicon(),
      this.ensureRelations(),
      this.ensureGenomeLedger(),
      this.project ?? undefined,
    );
  }

  /**
   * Ω-REAL — rebuild the durable memory from a saved document. The master + signer
   * keys are re-derived from the host seed, so the same seed restores the same
   * ledger; a different seed is a different brain. File/browser I/O stays with the
   * caller — this is pure.
   */
  restoreMemory(doc: string): void {
    const master = sha256(utf8(`${this.seed}:genome:master`));
    const signer = keyPairFromSeed(sha256(utf8(`${this.seed}:genome:signer`)));
    const m = restoreBrain(doc, { master, signer });
    this.lexicon = m.lexicon;
    this.relations = m.relations;
    this.relationDigestCache = null; // the restored graph is a fresh structure
    this.genome = m.genome;
    this.project = m.project;
    this.consolidator = new IgnitionConsolidator(m.genome);
    this.lastConsolidation = null;
  }

  private ensureLexicon(): Lexicon {
    if (!this.lexicon) this.lexicon = new Lexicon(512);
    return this.lexicon;
  }

  /**
   * Ω-REAL — refined semantic recall over the HOST's word lexicon + relation
   * graph (the certified φ-codec path). Encodes `text` through gematriaAtom and
   * recalls the nearest words with their φ-anchored similarity and attached
   * relation processes. Observe-only. (The Mind carries its own separate lexicon
   * that the live path never populates — this is the populated one.)
   */
  recallSimilar(text: string, k = 5, floor?: number): ResonantHit[] {
    const lex = this.ensureLexicon();
    const probe = gematriaAtom(text, lex.dim);
    return resonantRecall(probe, lex.atomsMap(), this.ensureRelations(), { k, floor });
  }

  /** Mean [0,1) salience weight of the lexicon, or undefined when empty. */
  private lexicalSalience(): number | undefined {
    const lex = this.lexicon;
    if (!lex || lex.size === 0) return undefined;
    const cat = lex.catalogue();
    let s = 0;
    for (const e of cat) s += e.weight;
    return s / cat.length;
  }

  /**
   * Fold the observe-only measure stack once per tick: the affect self-model
   * (friction + six qualia axes) over the rank-0 signature, the full-field
   * self-measure (drift, temporal coherence, information density, inertia,
   * Lyapunov descent, scale entropy/drift) across the ladder, the ignition
   * consolidation into the sealed genome, and the φ-anchored multi-scale
   * fingerprint. None of these write back into the dynamics — the digest chain
   * is untouched.
   */
  private foldMeasure(rep: WebTickReport): void {
    const e0 = this.engine.engines[0];
    const r0 = rep.rungs[0];
    if (!r0) return;
    const snap0 = e0.snapshot();
    const sig0 = snap0.signature;
    const z0 = snap0.z;

    this.lastAffect = this.ensureAffect().observe(
      sig0,
      r0.coherence,
      r0.closureQuality,
      r0.closureDefect,
      r0.regime,
      rep.tick,
    );

    const K = this.engine.rungs.length;
    const signatures: Float64Array[] = new Array(K);
    const gammas: number[] = new Array(K);
    const energies: number[] = new Array(K);
    const ns: number[] = new Array(K);
    for (let i = 0; i < K; i++) {
      signatures[i] = i === 0 ? sig0 : this.engine.engines[i].snapshot().signature;
      const ri = rep.rungs[i];
      gammas[i] = ri?.closureQuality ?? 0;
      energies[i] = ri?.energy ?? 0;
      ns[i] = this.engine.rungs[i].n;
    }
    this.lastSelfMeasure = this.ensureSelfMeasure().observe(signatures, gammas, energies, ns);

    // Ω-REAL Q4 — the field-level self-model: a per-rung learned predictor
    // (DiagonalSSM/RLS gated on held-out error) over the same 13-mode signature,
    // so the brain measures its own *surprise*, not just its movement. Training
    // (`predict`) runs every tick; the aggregate report — whose residual audit
    // is O(dim²·window) — is throttled to MIND_STRIDE so the hot path stays light.
    const fsm = this.ensureFieldSelfModel(K, sig0.length);
    fsm.predict(signatures, rep.tick);
    if (rep.tick % MIND_STRIDE === 0) {
      this.lastFieldSelfModel = fsm.report();
    }

    this.lastDepth = depthReading({
      coherence: r0.coherence,
      signatures,
      energies,
      gammas,
      novelty: this.lastThought?.novelty ?? 0,
    });

    // Fold deep fields into the persistent project (gated by the project's own
    // depth threshold — shallow ticks never join).
    if (this.lastDepth && Number.isFinite(this.lastDepth.value)) {
      const proj = this.ensureProject();
      proj.observe(`proj:${rep.tick}`, fieldToHv(z0, proj.dim), this.lastDepth.value);
    }

    this.lastConsolidation = this.ensureGenome().observe(
      sig0,
      r0.coherence,
      r0.closureQuality,
      rep.tick,
      this.lastDepth?.value,
    );
  }

  /**
   * Ω-REAL G4 — continuous deep-resolution tap. Every MIND_STRIDE ticks the
   * scale-graded field (per-rung energy/peak) and the base-rung node-frequency
   * spectrum are pushed into a bounded ring, so node-level reactions through the
   * scales are retained at high frequency, not just summarised. Observe-only:
   * reads the engine + scale signature, never writes back.
   */
  private foldDeepResolution(rep: WebTickReport): void {
    if (rep.tick % MIND_STRIDE !== 0 || rep.tick === 0) return;
    const report = scaleSignature(this.engine);
    const scan = this.scan(0);
    if (!report.rungs.length || !scan || !Number.isFinite(scan.energy.meanFrequency)) return;
    this.ensureDeepTap().push({
      tick: rep.tick,
      energy: Float64Array.from(report.rungs.map((r) => r.energy)),
      peak: Float64Array.from(report.rungs.map((r) => r.peak)),
      meanFrequency: scan.energy.meanFrequency,
      peakFrequency: scan.energy.peakFrequency,
      occupancy: Float64Array.from(scan.spectral.occupancy),
      closureDefect: scan.flux.closureDefect,
      persistence: persistenceReport(report.rungs.map((r) => r.energy)).total,
    });
  }

  /** Ω-REAL G4 — the deep-resolution ring view (latest frame only on the bus). */
  deepResolutionView(): DeepResolutionView {
    return this.deepTap?.view() ?? { size: 0, capacity: DEEP_TAP_CAPACITY, latest: null };
  }

  /** Ω-REAL R11 — the last affect observation (friction + qualia), or null. */
  affectReading(): AffectObservation | null {
    return this.lastAffect;
  }

  /** Ω-REAL Q2 — the last full-field self-measure report, or null. */
  selfMeasureReading(): SelfMeasureReport | null {
    return this.lastSelfMeasure;
  }

  /** Ω-REAL Q4 — the last field-level self-model report, or null. */
  fieldSelfModelReading(): FieldSelfModelReport | null {
    return this.lastFieldSelfModel;
  }

  /** Ω-REAL Layer A — the last text→field binding fingerprint, or null. */
  textFingerprintReading(): Float64Array | null {
    return this.lastTextFingerprint;
  }

  /**
   * Ω-SHFN Section A — the *measured* graph-Laplacian spectrum for one rung
   * (Lanczos + CGS2 over the Fibonacci-chord ring), cached on first call. The
   * eigenmode ladder in `torus/eigenmodes` assumes an ordering; this measures
   * the operator the field actually propagates under, with a digest that lets
   * two engines prove bit-identical agreement. Read-only — never enters the
   * digest chain.
   */
  measuredSpectrum(rank: number, modes = 13): SpectrumTable {
    const rung = this.engine.rungs[rank];
    if (!rung) throw new RangeError(`measuredSpectrum: no rung at rank ${rank}`);
    let t = this.spectra.get(rank);
    if (!t) {
      t = measureSpectrum(this.nodes[rank], modes);
      this.spectra.set(rank, t);
    }
    return t;
  }

  /** Ω-REAL — the last information-depth / importance reading, or null. */
  depth(): DepthReading | null {
    return this.lastDepth;
  }

  /** Ω-REAL Q5 — genome + consolidation state. */
  genomeState(): { size: number; cycles: number; pending: number; corpus: number } {
    return {
      size: this.genome?.size ?? 0,
      cycles: this.consolidator?.cycleCount ?? 0,
      pending: this.lastConsolidation?.pending ?? 0,
      corpus: this.consolidator?.corpusSize ?? 0,
    };
  }

  /** Ω-REAL — the salience-weighted word catalogue view. */
  lexiconView(): { size: number; tokens: number; documents: number; top: LexiconEntry[] } {
    const lex = this.lexicon;
    return lex
      ? { size: lex.size, tokens: lex.tokens, documents: lex.documents, top: lex.catalogue(5) }
      : { size: 0, tokens: 0, documents: 0, top: [] };
  }

  /** Ω-REAL — the typed relation graph (sentence-structure edges) view. */
  relationsView(): { nodes: number; edges: { source: string; type: string; target: string; weight: number }[] } {
    const g = this.relations;
    if (!g) return { nodes: 0, edges: [] };
    const st = g.serialize();
    const edges: { source: string; type: string; target: string; weight: number }[] = [];
    for (const [src, list] of Object.entries(st.edges)) {
      for (const e of list) edges.push({ source: src, type: e.type, target: e.target, weight: e.weight });
    }
    return { nodes: Object.keys(st.edges).length, edges };
  }

  /** Ω-REAL — the Merkle-DAG root digest of the learned relation structure. */
  relationDigest(): string | null {
    const g = this.relations;
    if (!g) return null;
    // The Merkle root only changes when the relation graph mutates. Cache it on
    // the structural version so the hot snapshot() path never re-folds the whole
    // DAG — a large learned graph (thousands of terms) used to cost O(n²) on
    // every poll, which froze the live UI.
    const v = g.version;
    if (this.relationDigestCache && this.relationDigestCache.version === v) {
      return this.relationDigestCache.digest;
    }
    const digest = relationDag(g).root;
    this.relationDigestCache = { version: v, digest };
    return digest;
  }

  /** Ω-REAL — the persistent project context view. */
  projectView(): { size: number; meanDepth: number; threshold: number } {
    const p = this.project;
    return p
      ? { size: p.size, meanDepth: p.meanDepth, threshold: p.threshold }
      : { size: 0, meanDepth: 0, threshold: 0 };
  }

  /** Ω-REAL — the deep-memory tier view (exact φ-modes; empty until |k| > 78). */
  deepMemoryView(): { size: number; meanDepth: number; strongestKey: string | null; strongestModes: number } {
    return this.deepMemory?.view() ?? { size: 0, meanDepth: 0, strongestKey: null, strongestModes: 0 };
  }

  /**
   * Ω-REAL — the precision envelope. The honest f64 φ-mode floor is
   * PHI_F64_MODE_CEILING (empirically: 1 + φ^-76 ≠ 1, 1 + φ^-77 = 1); the deepest
   * ladder rung is n = LADDER_MAX_N, whose qrf is φ^(-n/89) — a slow decay, so f64
   * is currently sufficient. requiredDigitsForDeepestRung reports what a RAW φ^-n
   * amplitude at the deepest rung would need (fixed-point 'bd' digits), for when a
   * fast φ^-k basis is introduced.
   */
  precisionView(): { f64ModeCeiling: number; deepestRungN: number; requiredDigitsForDeepestRung: number } {
    return {
      f64ModeCeiling: PHI_F64_MODE_CEILING,
      deepestRungN: LADDER_MAX_N,
      requiredDigitsForDeepestRung: requiredDigits(LADDER_MAX_N),
    };
  }

  /** Ω-REAL — reflect: recall the deepest stored patterns (project + associative). */
  deepReflect(): {
    projectSize: number;
    projectMeanDepth: number;
    projectVector: Float64Array | null;
    associativeSize: number;
    associativeLabels: string[];
  } {
    const p = this.project;
    const c = this.cleanup;
    return {
      projectSize: p?.size ?? 0,
      projectMeanDepth: p?.meanDepth ?? 0,
      projectVector: p && p.size > 0 ? p.vector() : null,
      associativeSize: c?.size ?? 0,
      associativeLabels: c ? c.labels() : [],
    };
  }

  /** Ω-REAL — second-pass consolidation: seal the project's accumulated shape
   *  into the genome as one durable record. Off the tick path (an explicit
   *  operator action like learn()). Deterministic, observe-only. */
  deepReflectAndConsolidate(): number {
    const p = this.ensureProject();
    if (p.size === 0) return 0;
    const ledger = this.ensureGenomeLedger();
    const tick = this.engine.currentTick();
    const rec = ledger.append({
      id: `project:${tick}:${this.deepReflectSeals++}`,
      kind: 'DeepProject',
      body: { size: p.size, meanDepth: p.meanDepth, project: p.serialize() },
      recordedAt: tick,
      provenance: { attributedTo: this.seed, generatedBy: 'deepReflectAndConsolidate', evidence: 'measured' },
    });
    return rec.leafIndex;
  }

  /** Ω-REAL Layer B — the φ-anchored multi-scale fingerprint, computed on demand. */
  fingerprint(): FieldFingerprint {
    return fieldFingerprint(this.engine);
  }

  /**
   * Run as many ticks as fit in the slice budget, capped by the target rate.
   * `nowMs` is the frame timeline (injected, so the rate window is testable);
   * the slice budget is measured on the host's own monotonic clock — mixing
   * the two would compare an injected timeline against real time.
   */
  pump(nowMs: number, elapsedMs: number): number {
    if (!this.running) return 0;
    // Fractional tick debt: flooring at 1 tick per frame would silently run
    // faster than targetHz whenever the frame interval is shorter than a tick
    // period (an 8 ms rAF at 64 Hz would give 125 Hz). Debt carries the
    // remainder forward instead, and is capped so a stalled tab cannot bank an
    // unbounded catch-up burst.
    this.debt = Math.min(this.debt + (this.targetHz * elapsedMs) / 1000, this.targetHz);
    const wanted = Math.floor(this.debt);
    if (wanted < 1) return 0;

    const t0 = this.clock();
    let done = 0;
    for (let i = 0; i < wanted; i++) {
      this.stepOnce();
      done++;
      if (this.clock() - t0 >= this.sliceBudgetMs) break;
    }
    this.debt -= done; // unspent debt (budget-truncated slice) carries forward
    const spent = this.clock() - t0;
    this.lastLoad = spent / this.sliceBudgetMs;


    // adaptive bus: back off on overrun, recover geometrically (φ-paced).
    if (done < wanted || this.lastLoad > 1) {
      this.overruns++;
      this.busHz = Math.max(MIN_HZ, this.busHz / PHI);
    } else if (this.lastLoad < 0.5) {
      this.busHz = Math.min(this.targetHz, this.busHz * 1.1);
    }

    // measured tick rate over a 1 s sliding window
    if (this.rateWindowStart === 0) this.rateWindowStart = nowMs;
    this.rateWindowTicks += done;
    const span = nowMs - this.rateWindowStart;
    if (span >= 1000) {
      this.tickRate = (this.rateWindowTicks * 1000) / span;
      this.rateWindowStart = nowMs;
      this.rateWindowTicks = 0;
    }
    return done;
  }

  private clock(): number {
    const p = (globalThis as { performance?: { now(): number } }).performance;
    return p?.now ? p.now() : Date.now();
  }

  /** Exact web-wide checkpoint (rung state + web tick + digest chain). */
  checkpoint(): WebCheckpoint {
    const cp = this.engine.checkpoint();
    this.checkpointTick = cp.tick;
    return cp;
  }

  restore(cp: WebCheckpoint): void {
    this.engine.restore(cp);
    this.last = null;
    this.checkpointTick = cp.tick;
  }

  snapshot(): HostSnapshot {
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
        regime: t?.regime ?? 'IDLE',
        clamped: t?.clamped ?? 0,
        obstruction: t?.obstruction ?? 0,
        closureDefect: t?.closureDefect ?? 0,
        closureQuality: t?.closureQuality ?? 0,
        skill: t?.skill ?? 0,
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
      memoryStage: this.lastRecall?.stage ?? 'idle',
      concepts: this.mind?.store.size ?? 0,
      novelty: this.lastThought?.novelty ?? 0,
      surprise: this.lastThought?.surprise ?? 0,
      selfModel: this.mind?.self.enabled ?? false,
      selfMargin: this.mind?.self.margin() ?? 0,
      quiescentFolds: this.quiescentFolds,
      perceptConcepts: this.sensoryMind?.store.size ?? 0,
      perceptNovelty: this.lastPercept?.novelty ?? 0,
      perceptSurprise: this.lastPercept?.surprise ?? 0,
      quiescentPercepts: this.quiescentPercepts,
      ...this.organSnapshot(),
      chords: this.engine.coupling.chords,
      tapeOccupancy: this.engine.tape?.occupied() ?? 0,
      tapeCapacity: this.engine.tape?.capacity ?? 0,
      tapeHead: this.engine.tape?.position() ?? 0,
      resonance: this.resonance?.value ?? NaN,
      resonanceGated: this.resonance?.gated ?? false,
      associativeSize: this.cleanup?.size ?? 0,
      friction: this.lastAffect?.friction ?? 0,
      situation: this.lastAffect?.situation ?? 0,
      flow: this.lastAffect?.flow ?? 0,
      qualiaCphi: this.lastAffect?.qualia.Cphi ?? 0,
      qualiaIgnited: this.lastAffect?.qualia.ignited ?? false,
      lyapunov: this.lastSelfMeasure?.lyapunov ?? 0,
      scaleEntropy: this.lastSelfMeasure?.scaleEntropy ?? 0,
      scaleDrift: this.lastSelfMeasure?.scaleDrift ?? 0,
      burden: this.lastSelfMeasure?.burden ?? 0,
      fieldSelfModelEnabled: this.lastFieldSelfModel?.enabled ?? false,
      fieldSelfModelSsmMse: this.lastFieldSelfModel?.ssmMse ?? 0,
      fieldSelfModelPersistenceMse: this.lastFieldSelfModel?.persistenceMse ?? 0,
      rhufSkill: this.lastRhufTransport?.skill ?? 0,
      rhufSpectralRadius: this.lastRhufTransport?.spectralRadius ?? 0,
      rhufMse: this.lastRhufTransport?.mse ?? 0,
      genomeSize: this.genome?.size ?? 0,
      genomeCycles: this.consolidator?.cycleCount ?? 0,
      lexiconSize: this.lexicon?.size ?? 0,
      lexiconTokens: this.lexicon?.tokens ?? 0,
      depth: this.lastDepth?.value ?? NaN,
      projectSize: this.project?.size ?? 0,
      projectMeanDepth: this.project?.meanDepth ?? 0,
      deepMemory: this.deepMemory?.view() ?? { size: 0, meanDepth: 0, strongestKey: null, strongestModes: 0 },
      deepResolution: this.deepResolutionView(),
      precision: this.precisionView(),
      relationDigest: this.relationDigest(),
      depthExtensions: {
        cliffordMagnitude: this.lastClifford,
        fractalOccupied: this.lastFractalOccupied,
        fractalContribution: this.lastFractalResidual,
        plasticityNorm: this.lastPlasticityNorm,
        plasticityDrift: this.lastPlasticityDrift,
      },
      selfAudit: this.lastSelfAudit ? { ...this.lastSelfAudit } : null,
    };
  }

  /**
   * Ladder-wide organ rollup. Organ coverage is counted, not assumed: a rung
   * without an organ bank contributes 0 nodes, so `organNodes < totalNodes`
   * is visible in the UI instead of being papered over.
   */
  private organSnapshot(): { organNodes: number; organResidual: number; organParticipation: number } {
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
      organParticipation: rungs > 0 ? part / rungs : 0,
    };
  }

  overrunCount(): number {
    return this.overruns;
  }

  // ---- Ω-P5 on-demand views (never on the snapshot bus) ----

  /** Static topology: ladder rungs, clocks, channel matrix. */
  describe(): EngineDescription {
    return describeEngine(this.engine);
  }

  /** One rung's live field, decimated for rendering. */
  field(rank: number, maxSamples = 610): FieldFrame {
    return fieldFrame(this.engine, rank, maxSamples);
  }

  /** Ledger positions and the tail of the double-entry journal. */
  web(tail = 24): WebView {
    return webView(this.engine, tail);
  }

  /** N1 — six-section sensory scan of one toroid. */
  scan(rank: number): RungScanReport | null {
    return rungScan(this.engine, rank);
  }

  /** Ω-REAL P9 — latest analysis report (heartbeat + xcorr), or null when built without the service. */
  analysis(): AnalysisReport | null {
    return this.analysisService?.report() ?? null;
  }

  /** Ω-REAL P9 — append-only evidence ledger state, or null when analysis is off. */
  evidence(): {
    size: number;
    sealCount: number;
    rootHex: string;
    lastSeal: EvidenceSeal | null;
  } | null {
    if (!this.evidenceLedger) return null;
    return {
      size: this.evidenceLedger.size,
      sealCount: this.evidenceLedger.sealCount,
      rootHex: this.evidenceLedger.rootHex(),
      lastSeal: this.lastEvidenceSeal,
    };
  }

  /** Measured spectral roundtrip on the shell and radial planes. */
  spectral(rank: number): SpectralView {
    return spectralView(this.engine, rank);
  }

  /** Structure-preserving defect of one octave-transport edge (read-only). */
  morphism(sourceRank = 0, targetRank = 1) {
    return morphismView(this.engine, sourceRank, targetRank);
  }

  // ---- Ω-P8: learning ----

  /**
   * Run the held-out battery for the learnable cell against this host's seed.
   * Synchronous and off the bus by design: it is an explicit operator action,
   * not something the tick loop does behind the user's back. The engine state
   * is untouched — the battery builds its own private SingleTorusEngine.
   */
  learn(opts: LearnRunOptions = {}): LearnRun {
    const t0 = Date.now();
    const traj = sampleTrajectory({
      nodes: opts.nodes ?? Math.min(89, this.nodes[this.nodes.length - 1] ?? 55),
      seed: `${this.seed}-learn`,
      warmup: opts.warmup ?? 89,
      trainTicks: opts.trainTicks ?? 233,
      holdTicks: opts.holdTicks ?? 89,
    });
    const { cell, report } = runBattery(traj, {
      iterations: opts.iterations ?? 240,
      seed: `${this.seed}-spsa`,
    });
    this.learnCell = cell;
    // Ω-P8 — arm the learned cell on the LIVE engine only when the battery
    // passed (held-out margin ≥ φ⁻²). A kill verdict leaves the engine on the
    // certified nine-term cell (gate 0, bit-exact baseline).
    const applied = report.enabled && cell.gate > 0;
    this.engine.setLearnable(applied ? cell : null);

    // Ω-P8 — spectral primitives, measured observe-only. The dispersion filter
    // learns the field's own per-mode decay (the contraction rate) from the
    // battery trajectory; the mixer and attention operate on the LIVE base
    // rung's driven (non-trivial) coefficients, so their gain/rotation are real
    // numbers rather than a division by a near-zero decayed field.
    const modes = traj.basis.vectors.length;
    const prev = coeffBuffer(traj.basis);
    const curr = coeffBuffer(traj.basis);
    const lastIdx = traj.frames.length - 1;
    analyze(traj.basis, traj.frames[lastIdx - 1], prev);
    analyze(traj.basis, traj.frames[lastIdx], curr);
    const target = new Float64Array(modes);
    for (let k = 0; k < modes; k++) {
      const a0 = Math.sqrt(prev[2 * k] ** 2 + prev[2 * k + 1] ** 2);
      const a1 = Math.sqrt(curr[2 * k] ** 2 + curr[2 * k + 1] ** 2);
      target[k] = a0 > 0 ? Math.min(FILTER_RHO_MAX, a1 / a0) : 0;
    }
    const filter = new SpectralFilter(modes);
    const filterRms = filter.fitMagnitudes(target, 1, 512);

    const e0 = this.engine.engines[0];
    const liveModes = e0.basis.vectors.length;
    const liveBefore = Float64Array.from(e0.snapshot().coeffs);
    const mixerInput = Float64Array.from(liveBefore);
    // The mixer/attention operate on the LIVE base rung, so they use ITS basis
    // (a profile may carry fewer than SIGNATURE_MODES modes).
    const mixer = new SuperpositionMixer(e0.basis);
    const mixerReport = mixer.apply(mixerInput);

    // attention: align the live field against its own one-tick-earlier copy, so
    // the reported lag/rotation measure the field's per-tick modal advance.
    this.stepOnce();
    const liveAfter = Float64Array.from(e0.snapshot().coeffs);
    const attention = applySpectralAttention(liveAfter, liveBefore, liveModes, 1);

    this.lastLearn = {
      report,
      elapsedMs: Date.now() - t0,
      certificates: [
        ...cell.certificates().map((c) => ({ ...c })),
        filter.certificate(),
      ],
      nodes: traj.nodes,
      applied,
      spectral: {
        filterRms,
        filterGain: filter.gain(),
        mixerGain: mixerReport.gain,
        mixerTransfer: mixerReport.transfer,
        attentionLag: attention.lag,
        attentionAlignment: attention.alignment,
        attentionRotation: attention.meanRotation,
      },
    };
    return this.lastLearn;
  }

  /** Last battery result, or null when learning has never been run. */
  learnState(): LearnRun | null {
    return this.lastLearn;
  }

  /** Ω-P8 — probe the four execution tiers live (T0 is always the floor). */
  probeLearningTiers(opts: TierProbeOptions = {}): Promise<TierMap> {
    return probeTiers(opts);
  }
}

export interface LearnRunOptions {
  readonly nodes?: number;
  readonly warmup?: number;
  readonly trainTicks?: number;
  readonly holdTicks?: number;
  readonly iterations?: number;
}

export interface LearnRun {
  readonly report: BatteryReport;
  readonly elapsedMs: number;
  readonly certificates: readonly Certificate[];
  readonly nodes: number;
  /** True when the learned cell was armed on the live engine (battery passed). */
  readonly applied: boolean;
  /** Ω-P8 spectral primitives, measured on the same trajectory (observe-only). */
  readonly spectral: {
    /** RMS |ρ_k − target| after fitting the dispersion filter to per-mode decay. */
    readonly filterRms: number;
    /** max_k |α_k| of the fitted filter (≤ φ⁻¹). */
    readonly filterGain: number;
    /** ‖c'‖/‖c‖ of the superposition mixer. */
    readonly mixerGain: number;
    /** Fraction of mixer output energy in modes the input did not occupy. */
    readonly mixerTransfer: number;
    /** Modal offset (lag) of the cross-spectral attention peak. */
    readonly attentionLag: number;
    /** Peak alignment, normalised by the geometric mean of the two energies. */
    readonly attentionAlignment: number;
    /** Mean |θ_k| applied by attention, radians. */
    readonly attentionRotation: number;
  };
}


