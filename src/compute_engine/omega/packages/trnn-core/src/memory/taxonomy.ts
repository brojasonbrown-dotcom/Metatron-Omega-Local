/**
 * memoryTaxonomy — the brain's own map of its memory systems (Ω-REAL: self-knowledge).
 *
 * Metatron holds ~14 stores that are all *the same substrate* — the complex
 * torus field / FHRR phase algebra — but with different retention policies,
 * addressing schemes, and learning techniques. Until this module, no code
 * declared which memory is which, so the brain could not *realise* it has
 * working, associative, episodic, semantic, procedural and archival memory.
 *
 * This is a pure, serialisable declaration (code-as-documentation): it reflects
 * the live module tree (see DORMANT_REGISTER) and never invents a store that is
 * not there. `live` marks whether the store is reachable from the tick path.
 *
 * Layer model (database layering over a field substrate):
 *   0 register  — the sensory plane buffers + the transient field z itself
 *   1 working   — braid (attractor) + memory kernel m + transcription ring
 *   2 episodic  — crossSection write path + concept store + project bundle
 *   3 semantic  — lexicon (TF-IDF_φ) + relation graph
 *   4 procedural— Zeckendorf tape (permanent, returnable store)
 *   5 archival  — deepMemory (Z[φ] sub-float64) + genome ledger (Merkle)
 *   6 audit     — evidence ledger (RFC-6962) + STH
 */

/** Cognitive-science category of a memory store. */
export type MemoryType =
  | 'register'
  | 'working'
  | 'associative'
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'archival'
  | 'audit';

/** Retention policy, database-style. */
export type RetentionPolicy = 'volatile' | 'ttl' | 'durable' | 'immutable';

export interface MemoryTier {
  readonly id: string;
  readonly module: string;
  readonly type: MemoryType;
  /** Layer in [0, 6] — higher is deeper/slower/durable. */
  readonly layer: number;
  readonly retention: RetentionPolicy;
  /** The φ-aligned learning/recall technique this store uses. */
  readonly technique: string;
  /** How the store is addressed / indexed. */
  readonly addressing: string;
  /** Reachable from EngineHost.stepOnce() (consumer-trace verified). */
  readonly live: boolean;
}

export const MEMORY_TAXONOMY: readonly MemoryTier[] = [
  {
    id: 'field',
    module: 'engine/SingleTorusEngine (z) + core/complex',
    type: 'register',
    layer: 0,
    retention: 'volatile',
    technique: 'nine-term cell contraction (Jury g < 1) + φ⁴ clamp',
    addressing: 'Fibonacci torus lattice index',
    live: true,
  },
  {
    id: 'kernel',
    module: 'cell/memory',
    type: 'working',
    layer: 1,
    retention: 'ttl',
    technique: 'exponential memory kernel, λ = φ⁻² (forgetting at φ rate)',
    addressing: 'per-node recurrence',
    live: true,
  },
  {
    id: 'braid',
    module: 'memory/braid',
    type: 'associative',
    layer: 1,
    retention: 'ttl',
    technique: 'modern dense Hopfield: softmax(β·s), β = φ²√(G/28)',
    addressing: 'per-pattern normalised overlap (attractor)',
    live: true,
  },
  {
    id: 'transcription',
    module: 'measure/transcription',
    type: 'working',
    layer: 1,
    retention: 'ttl',
    technique: 'fixed-depth telemetry ring (overwrites itself)',
    addressing: 'ring index',
    live: true,
  },
  {
    id: 'crossSection',
    module: 'memory/crossSection',
    type: 'episodic',
    layer: 2,
    retention: 'durable',
    technique: 'one write → braid + tape + cleanup, gated by coherence ≥ φ⁻²',
    addressing: 'unit-normalised complex field (unified substrate)',
    live: true,
  },
  {
    id: 'concepts',
    module: 'cognition/concepts',
    type: 'episodic',
    layer: 2,
    retention: 'durable',
    technique: 'kNN novelty gate (HNSW + product quantisation), novelty ≥ φ⁻³',
    addressing: 'approximate kNN index',
    live: true,
  },
  {
    id: 'project',
    module: 'cognition/project',
    type: 'episodic',
    layer: 2,
    retention: 'durable',
    technique: 'depth-weighted phasor bundle, gated by depth ≥ φ⁻¹',
    addressing: 'phasor-sum hypervector (cleanup recall)',
    live: true,
  },
  {
    id: 'lexicon',
    module: 'cognition/lexicon',
    type: 'semantic',
    layer: 3,
    retention: 'durable',
    technique: 'TF-IDF in base φ: salience = tf·idf, weight = 1 − φ^(−salience)',
    addressing: '512-dim FHRR gematria atom',
    live: true,
  },
  {
    id: 'relations',
    module: 'cognition/relations',
    type: 'semantic',
    layer: 3,
    retention: 'durable',
    technique: 'typed relation graph (resonant recall over φ-anchored similarity)',
    addressing: 'edge-typed graph (temporal/causal/…)',
    live: true,
  },
  {
    id: 'tape',
    module: 'memory/turingTape',
    type: 'procedural',
    layer: 4,
    retention: 'durable',
    technique: 'Zeckendorf-addressed read/write tape, head driven by field phase',
    addressing: 'Fibonacci (Zeckendorf) cell addresses',
    live: true,
  },
  {
    id: 'deepMemory',
    module: 'memory/deepMemory',
    type: 'archival',
    layer: 5,
    retention: 'durable',
    technique: 'exact Z[φ] representation for modes below float64 half-ULP (|k| > 76)',
    addressing: 'Z[φ] coefficient pairs',
    live: true,
  },
  {
    id: 'genome',
    module: 'genome/record',
    type: 'archival',
    layer: 5,
    retention: 'immutable',
    technique: 'append-only sealed records (AES-GCM + Merkle inclusion + Ed25519 STH)',
    addressing: 'hash-chained leaf index',
    live: true,
  },
  {
    id: 'evidence',
    module: 'analysis/evidenceLedger',
    type: 'audit',
    layer: 6,
    retention: 'immutable',
    technique: 'RFC-6962 transparency log (append-only, signed tree heads)',
    addressing: 'Merkle tree leaf + STH',
    live: true,
  },
  {
    id: 'persistence',
    module: 'memory/persistence',
    type: 'audit',
    layer: 6,
    retention: 'durable',
    technique: 'canonical JSON round-trip (lexicon + relations + genome + project)',
    addressing: 'serialisable document',
    live: true,
  },
];

/** The declared memory taxonomy, keyed by store id (self-knowledge readout). */
export function memoryTaxonomy(): readonly MemoryTier[] {
  return MEMORY_TAXONOMY;
}
