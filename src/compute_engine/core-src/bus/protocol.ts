/**
 * METATRON V11 — ENGINE BUS PROTOCOL
 * ===================================
 *
 * Shared TypeScript contract between the web client (this repo) and the
 * native Rust engine daemon (sibling repo, Phase 2b+). Mirrors what the
 * Rust `bus` crate will emit/consume. Single source of truth for both
 * sides — when the Rust side ships, this file is regenerated from the
 * Rust types via a one-shot `ts-rs` export and diffed.
 *
 * Transport: WebSocket at ws://127.0.0.1:7777 by default.
 * Wire format: length-prefixed JSON-RPC 2.0.
 *
 * No mock numerics. All snapshots reflect actual engine state — the
 * fallback engine is honest about its M ceiling and labels itself.
 */

export const ENGINE_WS_DEFAULT_URL = 'ws://127.0.0.1:7777';
export const PROTOCOL_VERSION = '11.0.0';

// ───────────────────────── Engine identity ─────────────────────────

export type PrecisionMode = 'f64' | 'f128' | 'dec50';
export type EngineKind = 'native' | 'wasm-fallback' | 'offline';

export interface EngineCapabilities {
  /** Engine implementation kind. */
  readonly kind: EngineKind;
  /** Protocol version the engine speaks. */
  readonly protocol: string;
  /** Engine build version. */
  readonly version: string;
  /** Highest M (φ-mode index) the engine will attempt at each precision. */
  readonly maxModeByPrecision: Record<PrecisionMode, number>;
  /** GPU backend if any. */
  readonly gpu: 'none' | 'wgpu' | 'cuda' | 'metal' | 'vulkan';
  /** CPU SIMD set actually used at runtime. */
  readonly simd: 'none' | 'sse2' | 'avx2' | 'avx512' | 'neon' | 'wasm-simd';
  /** Logical CPU count seen by the engine. */
  readonly cpuThreads: number;
  /** Realistic peak ops/s the engine self-benched at startup. */
  readonly peakOpsPerSecond: number;
  /** Whether Wolfram verification is wired in this build. */
  readonly wolframVerified: boolean;
}

// ───────────────────────── Field state snapshots ─────────────────────────

export interface DriverInfo {
  readonly id: string;
  readonly kind: 'empirical' | 'synthetic';
  readonly source: string;
  /** Welford running variance, used by the NodeGrower gate. */
  readonly variance: number;
  /** Mode index this driver currently feeds. */
  readonly modeIndex: number;
}

export interface ScalerSnapshot {
  /** Current φ-mode count actually evaluated this tick. */
  readonly currentM: number;
  /** Honest ceiling discovered for this device + precision. */
  readonly honestCeiling: number;
  /** [0,1] — how much of the per-tick budget the engine used. */
  readonly utilisation: number;
  /** [0,1] — headroom remaining before ULP collapse. */
  readonly headroom: number;
  /** Promote / hold / demote suggestion from the controller. */
  readonly decision: 'promote' | 'hold' | 'demote';
}

export interface QualiaVectorWire {
  readonly C: number; readonly N: number; readonly S: number; readonly V: number; readonly I: number;
}

export interface SpiralRangeWire { readonly kMin: number; readonly kMax: number; }

export interface RuntimeSnapshot {
  /** Actual field nodes evaluated this tick, including inward spiral nodes. */
  readonly nodesEvaluated: number;
  /** Worker lanes allocated by the current governor settings. */
  readonly activeWorkers: number;
  /** True when real Web Workers are executing the field shards. */
  readonly workerBacked: boolean;
  /** Deterministic relaxation passes per node per tick. */
  readonly computePressure: number;
  /** Slowest shard wall time for the latest tick. */
  readonly tickMs: number;
  /** Estimated local numeric operations per second for this tick. */
  readonly effectiveOps: number;
  /** Effective ops divided by the startup local hardware self-bench. */
  readonly pressureUtilisation: number;
}

export interface FieldSnapshot {
  /** Wall-clock micros at the time this snapshot was taken. */
  readonly tUs: number;
  /** Coherence C(t) = |⟨Ψ(t)|Ψ(t−φτ)⟩|² . Threshold λ = 1/φ². */
  readonly coherence: number;
  /** Energy proxy ⟨Ψ|Ψ⟩. */
  readonly energy: number;
  /** Ψ_lattice/memory/closure/reflect magnitudes for sanity. */
  readonly term1Magnitude: number;
  readonly term2Magnitude: number;
  readonly term3Magnitude: number;
  /** Ψ_reflect magnitude — added in V11 (Ψ-of-Ψ). Optional for old clients. */
  readonly term4Magnitude?: number;
  readonly precision: PrecisionMode;
  readonly scaler: ScalerSnapshot;
  readonly drivers: ReadonlyArray<DriverInfo>;
  /** True if Ψ_closure flux satisfies the 13-node Metatron boundary. */
  readonly metatronClosed: boolean;
  /** Live qualia vector — added in V11. */
  readonly qualia?: QualiaVectorWire;
  /** Active spiral range — added in V11. */
  readonly spiral?: SpiralRangeWire;
  /** Active carrier in Hz — added in V11. */
  readonly carrierHz?: number;
  /** Active working digits — added in V11. */
  readonly workingDigits?: number;
  /** Live local compute utilization — added in V11 Phase 2c. */
  readonly runtime?: RuntimeSnapshot;
}

// ───────────────────────── RPC surface ─────────────────────────

export type RpcMethod =
  | 'engine.hello'
  | 'engine.capabilities'
  | 'field.snapshot'
  | 'field.subscribe'
  | 'field.setPrecision'
  | 'field.setTargetM'
  | 'field.start'
  | 'field.stop'
  | 'verify.identity'
  | 'verify.runAll';

export interface RpcRequest<P = unknown> {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly method: RpcMethod;
  readonly params?: P;
}

export interface RpcSuccess<R = unknown> {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly result: R;
}

export interface RpcError {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly error: { readonly code: number; readonly message: string };
}

export type RpcResponse<R = unknown> = RpcSuccess<R> | RpcError;

export interface FieldSubscriptionEvent {
  readonly jsonrpc: '2.0';
  readonly method: 'field.snapshot.event';
  readonly params: FieldSnapshot;
}

export const isRpcError = <R>(r: RpcResponse<R>): r is RpcError =>
  (r as RpcError).error !== undefined;
