/**
 * RHUFT Mind — Schema Validators for External Payloads
 *
 * Epistemic Status: [SPEC] — Adapter-layer validation contracts, not RHUFT math.
 *
 * TRUTH_SOURCES policy: every payload that crosses the boundary from the outside
 * world (LLM responses, sensor frames, persisted state files) MUST be validated
 * here before it touches the engine or memories. On failure we reject loudly —
 * we never substitute mock/fabricated data.
 *
 * These validators are the executable counterparts of the JSON Schema documents
 * in this directory (llm_responses.schema.json, sensory_frame.schema.json,
 * mind_state.schema.json).
 */

/** Field size contract: 2 * (MASTER_EQUATION_N + 1) = 28. [SPEC] */
export const FIELD_SIZE = 28 as const;

/** Result of a validation: ok with typed value, or a precise failure reason. */
export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

// ─────────────────────────────────────────────────────────────────────────────
// 1. Primitive helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

export function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((s) => typeof s === "string");
}

/** Validate a Float64Array-shaped field: exact length, all finite. [SPEC] */
export function validateField(
  field: unknown,
  expectedLength: number = FIELD_SIZE
): ValidationResult<Float64Array> {
  if (!(field instanceof Float64Array)) {
    return { ok: false, reason: "field is not a Float64Array" };
  }
  if (field.length !== expectedLength) {
    return {
      ok: false,
      reason: `field length ${field.length} !== expected ${expectedLength}`,
    };
  }
  for (let i = 0; i < field.length; i++) {
    if (!Number.isFinite(field[i])) {
      return { ok: false, reason: `field[${i}] is not finite` };
    }
  }
  return { ok: true, value: field };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LLM response payloads (llm_responses.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

/** Response contract for the `nameThis` tool: labels for a stable percept. */
export interface NameThisResponse {
  readonly labels: string[];
  readonly confidence: number;
}

/** Response contract for the `define` tool: meaning + related words. */
export interface DefineResponse {
  readonly word: string;
  readonly definition: string;
  readonly related: string[];
}

/** Response contract for the `relate` tool: relation between two words. */
export interface RelateResponse {
  readonly relation: string;
  readonly strength: number;
}

/** Response contract for the `verifyStructure` tool (mathstral). */
export interface VerifyResponse {
  readonly verdict: "valid" | "invalid" | "uncertain";
  readonly reasoning: string;
}

export function validateNameThis(raw: unknown): ValidationResult<NameThisResponse> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "nameThis: payload is not an object" };
  }
  const o = raw as Record<string, unknown>;
  if (!isStringArray(o["labels"]) || (o["labels"] as string[]).length === 0) {
    return { ok: false, reason: "nameThis: labels must be a non-empty string array" };
  }
  const labels = (o["labels"] as string[])
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.length <= 64)
    .slice(0, 5);
  if (labels.length === 0) {
    return { ok: false, reason: "nameThis: no usable labels after normalization" };
  }
  const confidence = isFiniteNumber(o["confidence"])
    ? Math.min(1, Math.max(0, o["confidence"] as number))
    : 0.5;
  return { ok: true, value: { labels, confidence } };
}

export function validateDefine(raw: unknown): ValidationResult<DefineResponse> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "define: payload is not an object" };
  }
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o["definition"])) {
    return { ok: false, reason: "define: definition must be a non-empty string" };
  }
  const word = isNonEmptyString(o["word"]) ? (o["word"] as string).trim() : "";
  const related = isStringArray(o["related"])
    ? (o["related"] as string[]).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0).slice(0, 8)
    : [];
  return {
    ok: true,
    value: { word, definition: (o["definition"] as string).trim().slice(0, 2000), related },
  };
}

export function validateRelate(raw: unknown): ValidationResult<RelateResponse> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "relate: payload is not an object" };
  }
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o["relation"])) {
    return { ok: false, reason: "relate: relation must be a non-empty string" };
  }
  const strength = isFiniteNumber(o["strength"])
    ? Math.min(1, Math.max(0, o["strength"] as number))
    : 0.5;
  return { ok: true, value: { relation: (o["relation"] as string).trim().slice(0, 2000), strength } };
}

export function validateVerify(raw: unknown): ValidationResult<VerifyResponse> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "verify: payload is not an object" };
  }
  const o = raw as Record<string, unknown>;
  const verdictRaw = isNonEmptyString(o["verdict"]) ? (o["verdict"] as string).trim().toLowerCase() : "";
  const verdict: VerifyResponse["verdict"] =
    verdictRaw === "valid" ? "valid" : verdictRaw === "invalid" ? "invalid" : "uncertain";
  const reasoning = isNonEmptyString(o["reasoning"])
    ? (o["reasoning"] as string).trim().slice(0, 2000)
    : "";
  if (verdictRaw !== "valid" && verdictRaw !== "invalid" && verdictRaw !== "uncertain") {
    return { ok: false, reason: `verify: verdict "${verdictRaw}" not in {valid,invalid,uncertain}` };
  }
  return { ok: true, value: { verdict, reasoning } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sensory frames (sensory_frame.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

/** All sensory sources known to the mind. [SPEC] */
export type SensorySource =
  | "vision.screen"
  | "vision.file"
  | "audio.mic"
  | "audio.file"
  | "text.feed"
  | "llm.answer";

const SENSORY_SOURCES: readonly string[] = [
  "vision.screen",
  "vision.file",
  "audio.mic",
  "audio.file",
  "text.feed",
  "llm.answer",
];

/** A single validated sensory frame entering the engine. */
export interface SensoryFrame {
  readonly source: SensorySource;
  readonly timestamp: number;
  /** Free-form provenance metadata (file path, text excerpt, capture info). */
  readonly meta: Record<string, string>;
  /** The 28-element interleaved-complex geometric field. */
  readonly field: Float64Array;
}

export function validateSensoryFrame(raw: unknown): ValidationResult<SensoryFrame> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "frame: payload is not an object" };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o["source"] !== "string" || !SENSORY_SOURCES.includes(o["source"] as string)) {
    return { ok: false, reason: `frame: unknown source "${String(o["source"])}"` };
  }
  if (!isFiniteNumber(o["timestamp"]) || (o["timestamp"] as number) <= 0) {
    return { ok: false, reason: "frame: timestamp must be a positive finite number" };
  }
  const fieldCheck = validateField(o["field"]);
  if (!fieldCheck.ok) {
    return { ok: false, reason: `frame: ${fieldCheck.reason}` };
  }
  const metaRaw = o["meta"];
  const meta: Record<string, string> = {};
  if (typeof metaRaw === "object" && metaRaw !== null) {
    for (const [k, v] of Object.entries(metaRaw as Record<string, unknown>)) {
      if (typeof v === "string") meta[k] = v.slice(0, 500);
    }
  }
  return {
    ok: true,
    value: {
      source: o["source"] as SensorySource,
      timestamp: o["timestamp"] as number,
      meta,
      field: fieldCheck.value,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Persisted mind state (mind_state.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

/** Serialized concept as stored on disk (Float64 payload base64-encoded). */
export interface SerializedConcept {
  readonly id: string;
  readonly labels: string[];
  /** base64 of the raw Float64Array(28) bytes (little-endian). */
  readonly prototype: string;
  /**
   * Optional base64 of the semantic prototype (the fused word-geometry).
   * Absent in older saves and for unnamed concepts; rebuilt from labels on
   * restore when missing. [SPEC]
   */
  readonly semantic?: string;
  readonly reinforcement: number;
  readonly firstSeen: number;
  readonly lastSeen: number;
  readonly sourceTrace: string[];
}

/** Full persisted snapshot of the mind's learned state. */
export interface SerializedMindState {
  readonly version: 1;
  readonly savedAt: number;
  readonly stableThoughtCount: number;
  readonly concepts: SerializedConcept[];
}

/** Decode base64 → Float64Array and validate shape. */
export function decodeFieldBase64(b64: string): ValidationResult<Float64Array> {
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    return { ok: false, reason: "prototype: invalid base64" };
  }
  if (buf.byteLength !== FIELD_SIZE * 8) {
    return { ok: false, reason: `prototype: byte length ${buf.byteLength} !== ${FIELD_SIZE * 8}` };
  }
  const copy = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const field = new Float64Array(copy);
  return validateField(field);
}

/** Encode Float64Array → base64 (little-endian raw bytes). */
export function encodeFieldBase64(field: Float64Array): string {
  return Buffer.from(field.buffer, field.byteOffset, field.byteLength).toString("base64");
}

export function validateMindState(raw: unknown): ValidationResult<SerializedMindState> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "mind_state: payload is not an object" };
  }
  const o = raw as Record<string, unknown>;
  if (o["version"] !== 1) {
    return { ok: false, reason: `mind_state: unsupported version ${String(o["version"])}` };
  }
  if (!isFiniteNumber(o["savedAt"])) {
    return { ok: false, reason: "mind_state: savedAt must be a finite number" };
  }
  if (!isFiniteNumber(o["stableThoughtCount"]) || (o["stableThoughtCount"] as number) < 0) {
    return { ok: false, reason: "mind_state: stableThoughtCount must be >= 0" };
  }
  if (!Array.isArray(o["concepts"])) {
    return { ok: false, reason: "mind_state: concepts must be an array" };
  }
  const concepts: SerializedConcept[] = [];
  for (let i = 0; i < (o["concepts"] as unknown[]).length; i++) {
    const c = (o["concepts"] as unknown[])[i];
    if (typeof c !== "object" || c === null) {
      return { ok: false, reason: `mind_state: concepts[${i}] is not an object` };
    }
    const co = c as Record<string, unknown>;
    if (!isNonEmptyString(co["id"])) {
      return { ok: false, reason: `mind_state: concepts[${i}].id missing` };
    }
    if (!isStringArray(co["labels"])) {
      return { ok: false, reason: `mind_state: concepts[${i}].labels must be a string array` };
    }
    if (!isNonEmptyString(co["prototype"])) {
      return { ok: false, reason: `mind_state: concepts[${i}].prototype missing` };
    }
    const protoCheck = decodeFieldBase64(co["prototype"] as string);
    if (!protoCheck.ok) {
      return { ok: false, reason: `mind_state: concepts[${i}].${protoCheck.reason}` };
    }
    // Optional semantic prototype: validate only if present (older saves omit it).
    let semantic: string | undefined;
    if (co["semantic"] !== undefined) {
      if (!isNonEmptyString(co["semantic"])) {
        return { ok: false, reason: `mind_state: concepts[${i}].semantic must be a non-empty string when present` };
      }
      const semCheck = decodeFieldBase64(co["semantic"] as string);
      if (!semCheck.ok) {
        return { ok: false, reason: `mind_state: concepts[${i}].${semCheck.reason}` };
      }
      semantic = co["semantic"] as string;
    }
    if (!isFiniteNumber(co["reinforcement"]) || (co["reinforcement"] as number) < 0) {
      return { ok: false, reason: `mind_state: concepts[${i}].reinforcement invalid` };
    }
    if (!isFiniteNumber(co["firstSeen"]) || !isFiniteNumber(co["lastSeen"])) {
      return { ok: false, reason: `mind_state: concepts[${i}] timestamps invalid` };
    }
    concepts.push({
      id: co["id"] as string,
      labels: co["labels"] as string[],
      prototype: co["prototype"] as string,
      ...(semantic !== undefined ? { semantic } : {}),
      reinforcement: co["reinforcement"] as number,
      firstSeen: co["firstSeen"] as number,
      lastSeen: co["lastSeen"] as number,
      sourceTrace: isStringArray(co["sourceTrace"]) ? (co["sourceTrace"] as string[]) : [],
    });
  }
  return {
    ok: true,
    value: {
      version: 1,
      savedAt: o["savedAt"] as number,
      stableThoughtCount: o["stableThoughtCount"] as number,
      concepts,
    },
  };
}
