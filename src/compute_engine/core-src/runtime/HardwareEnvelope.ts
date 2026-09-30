/**
 * METATRON V11 — HARDWARE ENVELOPE
 * =================================
 * Sovereign local probe. Reads only browser-exposed device capabilities
 * (navigator.hardwareConcurrency, navigator.deviceMemory, WebGPU adapter).
 * Never contacts a network. Returns honest R_max (RAM bytes), C_max
 * (logical cores), GPU presence, and a Planck-bounded carrier ceiling.
 */

import { PHI, PI, PLANCK_LENGTH_M, SPEED_OF_LIGHT_M_S } from '@/core/constants/WolframVerified';

export interface HardwareEnvelope {
  readonly cpuCores: number;          // logical threads
  readonly ramBytes: number;          // best-effort, conservative
  readonly gpu: 'none' | 'webgpu';
  readonly sharedArrayBuffer: boolean;
  readonly tickBudgetMs: number;      // recommended per-tick wall budget
  readonly carrierCeilingHz: number;  // f₀ = φ²/(2π·t_P), Planck-bounded
  readonly peakOpsPerSecond: number;  // self-bench (single-thread)
}

/** Planck time t_P = ℓ_P / c. */
const PLANCK_TIME_S = PLANCK_LENGTH_M / SPEED_OF_LIGHT_M_S;
/** RHUFT carrier ceiling f₀ = φ²/(2π·t_P) ≈ 7.729 × 10⁴² Hz. */
export const CARRIER_CEILING_HZ = (PHI * PHI) / (2 * PI * PLANCK_TIME_S);

let cached: HardwareEnvelope | null = null;

function selfBenchOps(): number {
  // Tiny f64 axpy to estimate baseline ops/s. Capped at 50 ms.
  if (typeof performance === 'undefined') return 1e8;
  const N = 1 << 16;
  const a = new Float64Array(N);
  const b = new Float64Array(N);
  for (let i = 0; i < N; i++) { a[i] = Math.sin(i); b[i] = Math.cos(i); }
  const start = performance.now();
  let iters = 0;
  let s = 0;
  while (performance.now() - start < 50) {
    for (let i = 0; i < N; i++) s += a[i] * b[i] + 1;
    iters++;
  }
  const elapsed = (performance.now() - start) / 1000;
  // 2 flops per element, plus loop overhead; round-trip honest estimate.
  const ops = (iters * N * 2) / elapsed;
  // anchor s so the JIT keeps the loop
  if (s === Infinity) console.log(s);
  return Math.max(1e7, ops);
}

async function probeGpu(): Promise<'none' | 'webgpu'> {
  if (typeof navigator === 'undefined') return 'none';
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return 'none';
  try {
    const adapter = await gpu.requestAdapter();
    return adapter ? 'webgpu' : 'none';
  } catch {
    return 'none';
  }
}

export async function probeHardware(): Promise<HardwareEnvelope> {
  if (cached) return cached;
  const cpuCores =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? Math.max(1, navigator.hardwareConcurrency)
      : 4;
  // navigator.deviceMemory is in GB, capped by browser at 8 for privacy.
  // We treat it as a *floor* — user can raise R_max via the governor.
  const reportedGB =
    typeof navigator !== 'undefined' && (navigator as unknown as { deviceMemory?: number }).deviceMemory
      ? (navigator as unknown as { deviceMemory: number }).deviceMemory
      : 4;
  const ramBytes = reportedGB * 1024 * 1024 * 1024;
  const gpu = await probeGpu();
  const sharedArrayBuffer =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as unknown as { SharedArrayBuffer?: unknown }).SharedArrayBuffer !== 'undefined' &&
    typeof globalThis.crossOriginIsolated === 'boolean' &&
    globalThis.crossOriginIsolated === true;
  const peakOpsPerSecond = selfBenchOps() * cpuCores;
  cached = {
    cpuCores,
    ramBytes,
    gpu,
    sharedArrayBuffer,
    tickBudgetMs: 1000 / 60, // 60 Hz default; governor can override
    carrierCeilingHz: CARRIER_CEILING_HZ,
    peakOpsPerSecond,
  };
  return cached;
}

export function getCachedEnvelope(): HardwareEnvelope | null {
  return cached;
}
