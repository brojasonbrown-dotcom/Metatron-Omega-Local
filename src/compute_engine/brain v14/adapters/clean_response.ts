/**
 * adapters/clean_response.ts — P8: clean responses (no metric dumps).
 * (MASTER_PLAN_V3 §P8 + Gate P8.)
 *
 * Epistemic Status: [SPEC] — presentation layer. This module changes HOW an
 * answer is framed for a human, NEVER what the mind measured. It is a pure
 * function over the already-verified parts (the deterministic facts-spine and the
 * LLM commentary that survived the M5 resonance + mathstral gates). It adds no
 * truth and removes none — it only decides what leads and what waits one tap away.
 *
 * THE LAW (plan P8):
 *   · Answers are short & human. The default surface is ONE clean sentence (the
 *     verified commentary), or an honest refusal when there is no commentary.
 *   · Numbers appear only when they ARE the answer — i.e. when there is no
 *     separate commentary and the measured facts are the whole reply. A metric
 *     dump is never pasted above a sentence that already says it.
 *   · Depth is one tap away: the deterministic spine + certificate + grounded
 *     concepts are returned in `details`, rendered by the host behind a
 *     "details" affordance (or the word "details"). Default clean; depth on
 *     request. Nothing is discarded — it is deferred.
 *
 * HONESTY: when there is no verified commentary AND no facts, the response is an
 * explicit, human refusal — never an empty bubble and never a fabricated line.
 */

/** The already-verified parts of one answer, as the bridge has them. */
export interface ResponseParts {
  /** The deterministic measured facts-spine ("" when nothing was measured). */
  facts: string;
  /**
   * The LLM commentary that survived stabilization, or null when it did not.
   * When null, `fallbackNote` (if any) carries the honest "why" (e.g. "phrasing
   * didn't stabilize", "numeric verification failed").
   */
  commentary: string | null;
  /** Honest note for the no-commentary case (why the sentence is absent). */
  fallbackNote?: string | undefined;
  /** Grounded concept labels (deduped by the caller). */
  grounded: readonly string[];
  /** The M5 resonance certificate for the commentary, when computed. */
  certificate?: number | undefined;
  /** The mathstral verdict on the commentary's numerics, when checked. */
  verification?: string | null | undefined;
}

/** The clean, presentable answer: a short surface plus deferred depth. */
export interface CleanResponse {
  /**
   * The default surface — one short human line. This is the ONLY thing a host
   * shows unless the user asks for details. Bounded to a single sentence.
   */
  text: string;
  /**
   * The one-tap depth: the deterministic spine + provenance. Present whenever
   * there is anything measured to show; null only when there is genuinely
   * nothing (the bare-refusal case). The host renders this behind "details".
   */
  details: string | null;
  /** Grounded concept labels (chips the host may show). */
  grounded: readonly string[];
}

/** A short, human, honest refusal line when there is nothing verified to say. */
const REFUSAL = "I don't have a verified answer for that yet.";

/**
 * The maximum length of the clean surface sentence. The commentary is already a
 * single phrased sentence; we bound it so a runaway line can never become a wall
 * of text. The full measured content is always preserved in `details`.
 */
const MAX_SURFACE_CHARS = 200;

/**
 * Compose the clean response. The decision is purely presentational:
 *   · commentary present → it leads; facts (if any) go to details.
 *   · no commentary but facts → the measured facts ARE the answer (numbers only
 *     when they are the answer) → facts lead; details null (they're shown).
 *   · neither → an honest human refusal; details null.
 * The M5 gates run in the bridge BEFORE this is ever called; this function trusts
 * `commentary` to be already-verified and never re-judges it.
 */
export function cleanResponse(parts: ResponseParts): CleanResponse {
  const facts = parts.facts.trim();
  const commentary = parts.commentary?.trim() ?? "";

  // Case 3 — nothing measured, nothing phrased: an honest, human refusal.
  if (commentary.length === 0 && facts.length === 0) {
    const note = parts.fallbackNote?.trim();
    return {
      text: note && note.length > 0 ? `${REFUSAL} (${note})` : REFUSAL,
      details: null,
      grounded: parts.grounded,
    };
  }

  // Case 1 — verified commentary exists: it is the clean surface. Numbers stay
  // out of the surface (they live in details) UNLESS they ride inside the
  // verified sentence itself. The facts block becomes the one-tap depth.
  if (commentary.length > 0) {
    const surface = boundSurface(commentary);
    const details = buildDetails(facts, parts);
    return { text: surface, details, grounded: parts.grounded };
  }

  // Case 2 — no commentary, but real measured facts: the numbers ARE the answer.
  // Lead with them (compactly); there is no separate "details" because the
  // measured block is the whole reply.
  const note = parts.fallbackNote?.trim();
  return {
    text: note && note.length > 0 ? `${facts}\n\n(${note})` : facts,
    details: null,
    grounded: parts.grounded,
  };
}

/**
 * Bound the surface to one short line: take the first sentence and cap it at
 * MAX_SURFACE_CHARS on a word boundary (never mid-word). The full commentary is
 * preserved in details by the caller when it differs.
 */
function boundSurface(commentary: string): string {
  // First sentence only (split on a sentence terminator followed by space/EOL).
  const m = commentary.match(/^(.+?[.!?])(?:\s|$)/s);
  let surface = (m ? m[1]! : commentary).trim();
  if (surface.length <= MAX_SURFACE_CHARS) return surface;
  // Hard cap on a word boundary.
  const cut = surface.slice(0, MAX_SURFACE_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/**
 * Build the one-tap details block: the deterministic spine plus its provenance
 * (resonance certificate, mathstral verdict, grounded concepts). Returns null
 * when there is nothing measured to show.
 */
function buildDetails(facts: string, parts: ResponseParts): string | null {
  const lines: string[] = [];
  if (facts.length > 0) lines.push(facts);
  const prov: string[] = [];
  if (typeof parts.certificate === "number") {
    prov.push(`resonance ${parts.certificate.toFixed(3)}`);
  }
  if (parts.verification) prov.push(`numerics ${parts.verification}`);
  if (parts.grounded.length > 0) prov.push(`grounded: ${parts.grounded.join(", ")}`);
  if (prov.length > 0) lines.push(`[${prov.join(" · ")}]`);
  return lines.length > 0 ? lines.join("\n\n") : null;
}
