/**
 * RHUFT Mind — Structured Perception Codec (P6-C): any observed object → a field
 *
 * Epistemic Status: [SPEC] — Adapter/cognition bridge. The generalization of the
 * vision path to EVERY modality the mind can be instructed about.
 *
 * THE UNIFICATION
 * The engine only ever ingests 28-element geometric fields through the
 * L4_Sensory door. Vision gets there via the luminance-DCT codec; text via the
 * φ-DFT language codec. This module is the door for STRUCTURED observations —
 * the things the operator actually wants the mind to master: business documents,
 * records, org charts, software/SaaS UI element trees, API payloads, workflows.
 *
 * The discipline is the same no-fabrication law as the rest of the brain:
 *   - A structured observation is CANONICALIZED to a deterministic token stream
 *     (sorted keys, type-tagged values, provenance labels) — never paraphrased
 *     by an LLM, so the field is a faithful function of what was observed.
 *   - That stream is encoded through the SAME verified φ-DFT language codec, so
 *     structured percepts inherit every proven property (unit-norm, golden-phase
 *     mode separation, memoized determinism) and sit in the SAME field space as
 *     words and images — which is exactly what lets a "business" concept and a
 *     "screen" concept resonate in one manifold.
 *
 * Two codecs are provided:
 *   encodeDocument  — JSON/CSV/text records, business docs, structured payloads.
 *   encodeUiTree    — a software UI element tree (role/name/state per element),
 *                     so the mind perceives an application's STRUCTURE, not a
 *                     pixel-hash of its screenshot.
 */

import { encodeText } from "./language_codec.ts";

/** Max scalar values carried into a document encoding (bounded perception). [SPEC] */
const MAX_DOC_FIELDS = 89; // F_11 — matches the visual grid width.
/** Max UI elements carried into a tree encoding. [SPEC] */
const MAX_UI_ELEMENTS = 144; // F_12.
/** Max characters of a single scalar value (bounded, provenance-safe). [SPEC] */
const MAX_VALUE_LEN = 64;

/** A software-UI element as the mind perceives it (role + name + state). [SPEC] */
export interface UiElement {
  readonly role: string; // "button", "textbox", "grid", "menu", …
  readonly name: string; // the accessible label / caption
  readonly state?: string; // "enabled", "checked", "value:…", optional
  readonly children?: readonly UiElement[];
}

/**
 * Canonicalize an arbitrary JSON-like value to a deterministic token stream.
 * Object keys are SORTED (order-invariant), values are type-tagged, numbers are
 * precision-bounded. The same logical document ALWAYS yields the same stream —
 * which is what makes its field a stable attractor. [SPEC]
 */
function canonicalize(value: unknown, out: string[], depth: number): void {
  if (out.length >= MAX_DOC_FIELDS || depth > 8) return;
  if (value === null || value === undefined) return;
  const t = typeof value;
  if (t === "string") {
    const v = (value as string).trim().toLowerCase().slice(0, MAX_VALUE_LEN);
    if (v.length > 0) out.push(v);
    return;
  }
  if (t === "number" && Number.isFinite(value as number)) {
    out.push("n" + (value as number).toPrecision(4));
    return;
  }
  if (t === "boolean") {
    out.push(value ? "true" : "false");
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) canonicalize(item, out, depth + 1);
    return;
  }
  if (t === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const k of keys) {
      if (out.length >= MAX_DOC_FIELDS) break;
      out.push(k.trim().toLowerCase().slice(0, MAX_VALUE_LEN));
      canonicalize((value as Record<string, unknown>)[k], out, depth + 1);
    }
  }
}

/**
 * Encode a structured document (JSON object, parsed CSV row, record) into a
 * 28-field. `source` labels the provenance ("invoice", "crm-record", …) so the
 * field carries what KIND of thing it is as well as its content. [SPEC]
 */
export function encodeDocument(doc: unknown, source: string = "doc.feed"): Float64Array {
  const provenance = source.trim().toLowerCase().slice(0, MAX_VALUE_LEN);
  const content: string[] = [];
  canonicalize(doc, content, 0);
  // The source label is PROVENANCE, not observed content. If the document itself
  // carried nothing, there is no percept — refuse rather than fabricate a field.
  if (content.filter((t) => t.length > 0).length === 0) {
    throw new Error("encodeDocument: no perceivable content (empty document)");
  }
  const text = [provenance, ...content].filter((t) => t.length > 0).join(" ");
  return encodeText(text);
}

/**
 * Flatten a UI element tree to a deterministic token stream in DOCUMENT order
 * (depth-first), each element contributing role + name + state. The tree's
 * structure is carried by the sequence of role/name tokens. [SPEC]
 */
function flattenUi(el: UiElement, out: string[], depth: number): void {
  if (out.length >= MAX_UI_ELEMENTS * 3 || depth > 12) return;
  const role = (el.role || "").trim().toLowerCase().slice(0, MAX_VALUE_LEN);
  const name = (el.name || "").trim().toLowerCase().slice(0, MAX_VALUE_LEN);
  if (role.length > 0) out.push(role);
  if (name.length > 0) out.push(name);
  if (el.state) {
    const st = el.state.trim().toLowerCase().slice(0, MAX_VALUE_LEN);
    if (st.length > 0) out.push(st);
  }
  if (el.children) for (const c of el.children) flattenUi(c, out, depth + 1);
}

/**
 * Encode a software UI element tree into a 28-field, so the mind perceives an
 * application's STRUCTURE (what controls exist, what they're called) rather than
 * a pixel-hash. Two runs of the same app state yield the same field. [SPEC]
 */
export function encodeUiTree(root: UiElement, appName: string = "ui.observe"): Float64Array {
  const provenance = appName.trim().toLowerCase().slice(0, MAX_VALUE_LEN);
  const content: string[] = [];
  flattenUi(root, content, 0);
  // The app name is PROVENANCE, not observed structure. An empty/perception-less
  // tree (no role, name, or state anywhere) has no percept — refuse to fabricate.
  if (content.filter((t) => t.length > 0).length === 0) {
    throw new Error("encodeUiTree: no perceivable content (empty UI tree)");
  }
  const text = [provenance, ...content].filter((t) => t.length > 0).join(" ");
  return encodeText(text);
}
