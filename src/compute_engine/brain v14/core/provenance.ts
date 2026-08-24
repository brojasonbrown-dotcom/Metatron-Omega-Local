/**
 * core/provenance.ts — A6 / P9: provenance-hashed model routing.
 * (MASTER_PLAN_V3 §1 row A6 + §P9 step 17.)
 *
 * Epistemic Status: [MATH/CRYPTO] — a deterministic, verifiable audit stamp. This
 * module answers ONE question honestly: *which exact model + prompt produced this
 * output?* The dog/cat class of hallucination (P1) becomes traceable to the exact
 * model and prompt that produced it — the audit trail v2 did not specify.
 *
 * THE LAW (plan A6): every routed LLM output is stamped
 *     sha1(model_id ‖ prompt_hash ‖ ts)
 * where:
 *   · model_id    — the resolved instrument+model that actually answered
 *                   (e.g. "ollama/phi:latest", "k3/kimi-k3"), never assumed;
 *   · prompt_hash — sha1 of the exact input string the model was given;
 *   · ts          — the wall-clock millisecond the stamp was minted.
 *
 * The stamp is an opaque, content-free fingerprint: it proves a specific output
 * came from a specific model+prompt at a specific time WITHOUT storing the prompt
 * text itself (privacy-preserving audit). It adds no truth and changes no routing
 * decision — it only WITNESSES them.
 *
 * Honesty: a provenance stamp is only as good as the model_id it carries. The
 * caller (the router) must pass the model that ACTUALLY served the call, read at
 * call time — never a cached or default value. This module cannot verify that
 * choice; it can only record it faithfully.
 */

import { createHash } from "node:crypto";

/** The field separator for the stamped payload (spec: model_id ‖ prompt ‖ ts). */
const SEP = "‖";

/** A provenance stamp witnessing one routed output. */
export interface Provenance {
  /** The resolved instrument+model that served the call (e.g. "ollama/phi:latest"). */
  readonly modelId: string;
  /** sha1 of the exact input string handed to the model (hex). */
  readonly promptHash: string;
  /** Wall-clock milliseconds when the stamp was minted. */
  readonly ts: number;
  /** sha1(modelId ‖ promptHash ‖ ts) — the compact audit fingerprint (hex). */
  readonly hash: string;
}

/** sha1 hex of a string. */
function sha1(s: string): string {
  return createHash("sha1").update(s, "utf8").digest("hex");
}

/**
 * Mint a provenance stamp for one routed output. `modelId` must be the model that
 * actually answered (instrument-qualified, e.g. "ollama/phi:latest"); `prompt` is
 * the exact input string the model consumed. `ts` defaults to now (injectable for
 * deterministic tests).
 */
export function stampProvenance(modelId: string, prompt: string, ts: number = Date.now()): Provenance {
  if (typeof modelId !== "string" || modelId.trim().length === 0) {
    throw new RangeError("stampProvenance: modelId must be a non-empty instrument-qualified id.");
  }
  const promptHash = sha1(prompt);
  const hash = sha1([modelId, promptHash, String(ts)].join(SEP));
  return { modelId, promptHash, ts, hash };
}

/**
 * Recompute a stamp's fingerprint from its parts and check it matches. This is the
 * "resolvable" half of Gate P9: a host can take `{ modelId, promptHash, ts, hash }`
 * and confirm the hash is genuine (not invented), without ever seeing the prompt.
 */
export function verifyProvenance(p: Provenance): boolean {
  const expected = sha1([p.modelId, p.promptHash, String(p.ts)].join(SEP));
  return expected === p.hash;
}
