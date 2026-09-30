/**
 * METATRON V11 — IN-BROWSER FALLBACK ENGINE (Phase 2c)
 * =====================================================
 * Sovereign, local-only. Uses the ResourceGovernor to scale the active field
 * across real browser workers so allocated CPU threads do actual work.
 */

import {
  PROTOCOL_VERSION,
  type EngineCapabilities,
  type FieldSnapshot,
  type DriverInfo,
  type ScalerSnapshot,
} from './protocol';
import { PHI, PHI_INV } from '@/core/constants/WolframVerified';
import { probeHardware, CARRIER_CEILING_HZ, type HardwareEnvelope } from '@/core/runtime/HardwareEnvelope';
import { ResourceGovernor, requiredDigits, pickPrecision, type GovernorSettings } from '@/core/runtime/ResourceGovernor';
import { QualiaTracker, zeroQualia, type QualiaVector } from '@/core/field/Qualia';
import { qualiaScalar } from '@/core/field/Reflect';
import { FieldWorkerPool, type FieldShardSpec, type FieldShardResult } from '@/core/runtime/WorkerPool';

const INWARD_DEFAULT = 13;
const DRIVER_SAMPLE_LIMIT = 512;

export interface FallbackEngineHandle {
  capabilities(): EngineCapabilities;
  snapshot(): FieldSnapshot;
  setTargetM(m: number): void;
  governor: ResourceGovernor;
  start(intervalMs?: number): void;
  stop(): void;
  onSnapshot(cb: (s: FieldSnapshot) => void): () => void;
}

interface State {
  m: number;
  kMin: number;
  kMax: number;
  drivers: DriverInfo[];
  startedUs: number;
  lastQualia: QualiaVector;
  pool: FieldWorkerPool;
  poolReady: Promise<void>;
  lastSnapshot: FieldSnapshot | null;
  epoch: number;
}

function nowUs(): number { return Math.round(performance.now() * 1000); }

function planckLimitedKMax(requestedM: number, carrierHz: number): number {
  if (carrierHz <= 0) return requestedM;
  const maxByCarrier = Math.floor(Math.log(CARRIER_CEILING_HZ / carrierHz) / Math.log(PHI));
  return Math.max(1, Math.min(requestedM, maxByCarrier));
}

function makeDrivers(kMin: number, kMax: number): DriverInfo[] {
  const nodes = Math.max(0, kMax - kMin + 1);
  const limit = Math.min(DRIVER_SAMPLE_LIMIT, nodes);
  if (limit <= 0) return [];
  const step = Math.max(1, Math.floor(nodes / limit));
  const out: DriverInfo[] = [];
  for (let i = 0; i < nodes && out.length < limit; i += step) {
    const k = kMin + i;
    out.push({
      id: `phi-${k >= 0 ? '+' : ''}${k}`,
      kind: 'synthetic',
      source: k < 0 ? 'phi-conjugate' : 'phyllotactic-seed',
      variance: Math.pow(PHI, -Math.abs(k)),
      modeIndex: k,
    });
  }
  return out;
}

function shardRange(kMin: number, kMax: number, workers: number): FieldShardSpec[] {
  const nodes = Math.max(0, kMax - kMin + 1);
  const count = Math.max(1, Math.min(workers, nodes || 1));
  const base = Math.floor(nodes / count);
  const rem = nodes % count;
  const shards: FieldShardSpec[] = [];
  let cursor = kMin;
  for (let i = 0; i < count; i++) {
    const size = base + (i < rem ? 1 : 0);
    const end = cursor + size - 1;
    shards.push({ kStart: cursor, kEnd: end });
    cursor = end + 1;
  }
  return shards;
}

export async function createFallbackEngineAsync(): Promise<FallbackEngineHandle> {
  const { getGovernor } = await import('@/core/runtime/governorSingleton');
  const { hw, gov } = await getGovernor();
  return createFallbackEngine(hw, gov);
}

export function createFallbackEngine(hw: HardwareEnvelope, sharedGovernor?: ResourceGovernor): FallbackEngineHandle {
  const governor = sharedGovernor ?? new ResourceGovernor(hw);
  const tracker = new QualiaTracker(16);
  const subs = new Set<(s: FieldSnapshot) => void>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let ticking = false;
  let epoch = 0;

  function ceilingForMode(_mode: GovernorSettings['precision']): number {
    return governor.computeMaxM();
  }

  function build(m: number): State {
    epoch++;
    const settings = governor.settings;
    const kMin = settings.spiralEnabled ? -INWARD_DEFAULT : 0;
    const kMax = planckLimitedKMax(m, settings.carrierHz);
    const pool = new FieldWorkerPool(settings.cpuThreads);
    const shards = shardRange(kMin, kMax, settings.cpuThreads);
    const poolReady = pool.configure(shards, settings.carrierHz).catch(() => { /* swallowed: rebuilds during slider drag are expected */ });
    return {
      m: kMax,
      kMin,
      kMax,
      drivers: makeDrivers(kMin, kMax),
      startedUs: nowUs(),
      lastQualia: zeroQualia(),
      pool,
      poolReady,
      lastSnapshot: null,
      epoch,
    };
  }

  let state: State = build(13);

  governor.subscribe(() => {
    const previous = state;
    state = build(Math.min(previous.m, ceilingForMode(governor.settings.precision)));
    previous.pool.destroy();
  });

  function coldSnapshot(): FieldSnapshot {
    const settings = governor.settings;
    const ceiling = ceilingForMode(settings.precision);
    const p = pickPrecision(state.m, settings.precision);
    return {
      tUs: nowUs(),
      coherence: 0,
      energy: 0,
      term1Magnitude: 0,
      term2Magnitude: 0,
      term3Magnitude: 0,
      term4Magnitude: 0,
      precision: p.kind === 'f64' ? 'f64' : 'dec50',
      scaler: { currentM: state.m, honestCeiling: ceiling, utilisation: state.m / ceiling, headroom: Math.max(0, 1 - state.m / ceiling), decision: 'hold' },
      drivers: state.drivers,
      metatronClosed: false,
      qualia: state.lastQualia,
      spiral: { kMin: state.kMin, kMax: state.kMax },
      carrierHz: settings.carrierHz,
      workingDigits: p.digits,
      runtime: {
        nodesEvaluated: Math.max(0, state.kMax - state.kMin + 1),
        activeWorkers: state.pool.stats.size,
        workerBacked: state.pool.stats.workerBacked,
        computePressure: settings.computePressure,
        tickMs: 0,
        effectiveOps: 0,
        pressureUtilisation: 0,
      },
    };
  }

  function combine(results: FieldShardResult[]): { amplitudes: Float64Array; nodes: number; term1: number; term2: number; term3: number; term4: number; energy: number; coherenceNum: number; coherenceDen: number; tickMs: number } {
    const nodes = results.reduce((sum, r) => sum + r.nodes, 0);
    const amplitudes = new Float64Array(nodes);
    let offset = 0;
    let term1 = 0, term2 = 0, term3 = 0, term4 = 0, energy = 0, coherenceNum = 0, coherenceDen = 0, tickMs = 0;
    for (const r of results) {
      amplitudes.set(r.amplitudes, offset);
      offset += r.amplitudes.length;
      term1 += r.term1;
      term2 += r.term2;
      term3 += r.term3;
      term4 += r.term4;
      energy += r.energy;
      coherenceNum += r.coherenceNum;
      coherenceDen += r.coherenceDen;
      tickMs = Math.max(tickMs, r.elapsedMs);
    }
    return { amplitudes, nodes, term1, term2, term3, term4, energy, coherenceNum, coherenceDen, tickMs };
  }

  async function tick(): Promise<FieldSnapshot> {
    const tickEpoch = state.epoch;
    const settings = governor.settings;
    await state.poolReady;
    if (tickEpoch !== state.epoch) return state.lastSnapshot ?? coldSnapshot();

    const t = (nowUs() - state.startedUs) / 1e6;
    const qScalar = settings.reflectEnabled ? qualiaScalar(state.lastQualia) : 0;
    const results = await state.pool.compute(t, qScalar, settings.reflectEnabled, settings.computePressure);
    if (tickEpoch !== state.epoch) return state.lastSnapshot ?? coldSnapshot();
    // If the pool was destroyed mid-flight (slider rebuild race), some shard slots may be void.
    if (!Array.isArray(results) || results.some((r) => !r || !(r.amplitudes instanceof Float64Array))) {
      return state.lastSnapshot ?? coldSnapshot();
    }

    const merged = combine(results as FieldShardResult[]);
    const coherence = merged.coherenceDen > 0
      ? Math.min(1, (merged.coherenceNum * merged.coherenceNum) / Math.max(1e-30, merged.energy * merged.coherenceDen))
      : 0;
    const qualia = tracker.compute(merged.amplitudes, coherence, merged.term1, merged.term3, merged.energy);
    state.lastQualia = qualia;

    const ceiling = ceilingForMode(settings.precision);
    const utilisation = state.m / ceiling;
    const headroom = Math.max(0, 1 - utilisation);
    const decision: ScalerSnapshot['decision'] =
      state.m < ceiling && qualia.C >= PHI_INV * PHI_INV ? 'promote'
      : state.m > 13 && qualia.C < (PHI_INV * PHI_INV) * 0.5 ? 'demote'
      : 'hold';
    const p = pickPrecision(state.m, settings.precision);
    const effectiveOps = merged.nodes * settings.computePressure * 14 / Math.max(0.001, merged.tickMs / 1000);
    const snapshot: FieldSnapshot = {
      tUs: nowUs(),
      coherence,
      energy: merged.energy,
      term1Magnitude: merged.term1,
      term2Magnitude: merged.term2,
      term3Magnitude: merged.term3,
      term4Magnitude: merged.term4,
      precision: p.kind === 'f64' ? 'f64' : 'dec50',
      scaler: { currentM: state.m, honestCeiling: ceiling, utilisation, headroom, decision },
      drivers: state.drivers,
      metatronClosed: merged.term3 < 1e-3,
      qualia,
      spiral: { kMin: state.kMin, kMax: state.kMax },
      carrierHz: settings.carrierHz,
      workingDigits: p.digits,
      runtime: {
        nodesEvaluated: merged.nodes,
        activeWorkers: state.pool.stats.size,
        workerBacked: state.pool.stats.workerBacked,
        computePressure: settings.computePressure,
        tickMs: merged.tickMs,
        effectiveOps,
        pressureUtilisation: Math.min(1, effectiveOps / Math.max(1, hw.peakOpsPerSecond)),
      },
    };
    state.lastSnapshot = snapshot;
    return snapshot;
  }

  return {
    capabilities(): EngineCapabilities {
      const settings = governor.settings;
      const m = governor.computeMaxM();
      return {
        kind: 'wasm-fallback',
        protocol: PROTOCOL_VERSION,
        version: 'fallback-worker-0.3.0',
        maxModeByPrecision: { f64: m, f128: 0, dec50: m },
        gpu: hw.gpu === 'webgpu' ? 'wgpu' : 'none',
        simd: 'none',
        cpuThreads: settings.cpuThreads,
        peakOpsPerSecond: hw.peakOpsPerSecond,
        wolframVerified: true,
      };
    },
    snapshot(): FieldSnapshot { return state.lastSnapshot ?? coldSnapshot(); },
    setTargetM(m: number): void {
      const ceiling = ceilingForMode(governor.settings.precision);
      const refusal = governor.validateTarget(m);
      const clamped = refusal ? Math.min(state.m, ceiling) : Math.max(1, Math.min(ceiling, Math.floor(m)));
      if (clamped !== state.m) {
        const need = requiredDigits(clamped);
        if (governor.settings.precision !== 'f64' && need > 16) {
          import('@/core/numerics/Real').then(({ setWorkingPrecision }) => setWorkingPrecision(need));
        }
        const previous = state;
        state = build(clamped);
        previous.pool.destroy();
      }
    },
    governor,
    start(intervalMs = 250): void {
      if (timer) return;
      timer = setInterval(() => {
        if (ticking) return;
        ticking = true;
        tick()
          .then((s) => { for (const cb of subs) { try { cb(s); } catch (e) { console.error('fallback subscriber threw', e); } } })
          .catch((e) => console.error('fallback tick failed', e))
          .finally(() => { ticking = false; });
      }, intervalMs);
    },
    stop(): void { if (timer) clearInterval(timer); timer = null; state.pool.destroy(); },
    onSnapshot(cb: (s: FieldSnapshot) => void): () => void { subs.add(cb); return () => subs.delete(cb); },
  };
}

export async function probeFallbackCapabilities(): Promise<EngineCapabilities> {
  const hw = await probeHardware();
  const engine = createFallbackEngine(hw);
  return engine.capabilities();
}
