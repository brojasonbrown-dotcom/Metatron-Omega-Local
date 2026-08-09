/**
 * Integration — P6-C structured perception codec: any observed object → a field.
 *
 * The unification this proves: a business DOCUMENT and a software UI element
 * tree are brought into the SAME 28-element interleaved-complex field space as
 * words and images, through the SAME verified φ-DFT language codec — so a
 * "business" concept and a "screen" concept can resonate in one manifold. The
 * discipline is the no-fabrication law: canonicalization is deterministic
 * (sorted keys, type-tagged values), never LLM-paraphrased, so the field is a
 * faithful function of what was observed.
 *
 * What is proven:
 *   1. DETERMINISM — the same logical document yields the identical field on
 *      repeated encoding (a stable attractor).
 *   2. ORDER-INVARIANCE — object key order does not change the field (canonical
 *      sort), so two serializations of the SAME record resonate at 1.0.
 *   3. CONTENT SENSITIVITY — semantically different documents yield different
 *      fields (resonance strictly below identity), so content is carried.
 *   4. NO-FABRICATION — an empty/perception-less document throws rather than
 *      smuggle in a field for content that was never observed.
 *   5. UI TREE — a software element tree encodes to a unit field, deterministically,
 *      and a structurally different app state yields a different field.
 *   6. SHARED SPACE — a document and a UI tree both land in the same FIELD_SIZE
 *      space (so cross-modal resonance is at least well-typed), and every field
 *      is unit-norm (normalizeField invariant).
 */
import { describe, expect, it } from "vitest";
import { encodeDocument, encodeUiTree, type UiElement } from "../adapters/structured_codec.ts";
import { resonance } from "../adapters/language_codec.ts";
import { FIELD_SIZE } from "../schemas/validate.ts";
import { at } from "../core/indexing.ts";

function norm(f: Float64Array): number {
  let s = 0;
  for (let i = 0; i < f.length; i++) s += at(f, i) * at(f, i);
  return Math.sqrt(s);
}

describe("P6-C structured perception codec", () => {
  it("is deterministic: the same document yields the identical field", () => {
    const doc = { type: "invoice", id: 1042, total: 1290.5, currency: "USD", customer: "acme" };
    const a = encodeDocument(doc, "doc.feed");
    const b = encodeDocument(doc, "doc.feed");
    expect(a.length).toBe(FIELD_SIZE);
    expect(resonance(a, b)).toBeCloseTo(1.0, 10);
    // Bit-identical (determinism is exact, not merely high-resonance).
    for (let i = 0; i < FIELD_SIZE; i++) expect(a[i]).toBe(b[i]);
  });

  it("is order-invariant: object key order does not change the field", () => {
    const d1 = { alpha: 1, beta: "two", gamma: true, nested: { x: 1, y: 2 } };
    const d2 = { nested: { y: 2, x: 1 }, gamma: true, beta: "two", alpha: 1 };
    const a = encodeDocument(d1, "doc.feed");
    const b = encodeDocument(d2, "doc.feed");
    expect(resonance(a, b)).toBeCloseTo(1.0, 10);
  });

  it("carries content: semantically different documents yield different fields", () => {
    const invoice = encodeDocument({ type: "invoice", total: 1290.5, customer: "acme" }, "doc.feed");
    const ticket = encodeDocument({ type: "support-ticket", severity: "high", status: "open" }, "doc.feed");
    const r = resonance(invoice, ticket);
    // Different content must NOT collapse to the same attractor.
    expect(r).toBeLessThan(1.0 - 1e-9);
    expect(Number.isFinite(r)).toBe(true);
  });

  it("never fabricates: an empty document throws", () => {
    expect(() => encodeDocument({}, "doc.feed")).toThrow();
    expect(() => encodeDocument(null, "doc.feed")).toThrow();
    expect(() => encodeDocument(undefined, "doc.feed")).toThrow();
    // An array of only nulls has no keys AND no values → nothing observed → throw.
    expect(() => encodeDocument([null, null], "doc.feed")).toThrow();
  });

  it("treats keys-with-null-values as observed structure (does not throw)", () => {
    // The keys ARE observed content even when their values are null; only a doc
    // with NO tokens at all is a fabrication. This pins the honest contract.
    const f = encodeDocument({ a: null, b: undefined }, "doc.feed");
    expect(f.length).toBe(FIELD_SIZE);
  });

  it("encodes a UI element tree deterministically and unit-norm", () => {
    const tree: UiElement = {
      role: "window",
      name: "crm",
      children: [
        { role: "menu", name: "file" },
        { role: "grid", name: "customers", state: "rows:128" },
        { role: "button", name: "save", state: "enabled" },
      ],
    };
    const a = encodeUiTree(tree, "crm-app");
    const b = encodeUiTree(tree, "crm-app");
    expect(a.length).toBe(FIELD_SIZE);
    expect(resonance(a, b)).toBeCloseTo(1.0, 10);
    expect(norm(a)).toBeCloseTo(1.0, 9);

    // A structurally different app state is a different field.
    const changed: UiElement = {
      role: "window",
      name: "crm",
      children: [
        { role: "dialog", name: "confirm-delete", state: "modal" },
        { role: "button", name: "cancel" },
      ],
    };
    const c = encodeUiTree(changed, "crm-app");
    expect(resonance(a, c)).toBeLessThan(1.0 - 1e-9);
  });

  it("never fabricates: a perception-less UI tree throws", () => {
    // No role/name/state anywhere → nothing was observed.
    expect(() => encodeUiTree({ role: "", name: "" }, "crm-app")).toThrow();
    expect(() => encodeUiTree({ role: "  ", name: " ", children: [{ role: "", name: "" }] }, "crm-app")).toThrow();
  });

  it("lands document and UI tree in the SAME field space, both unit-norm", () => {
    const doc = encodeDocument({ record: "customer", name: "acme", region: "emea" }, "doc.feed");
    const ui = encodeUiTree({ role: "form", name: "customer", children: [{ role: "textbox", name: "name" }] }, "crm-app");
    expect(doc.length).toBe(FIELD_SIZE);
    expect(ui.length).toBe(FIELD_SIZE);
    expect(norm(doc)).toBeCloseTo(1.0, 9);
    expect(norm(ui)).toBeCloseTo(1.0, 9);
    // Cross-modal resonance is well-defined (finite, in [0,1]) — the point of the
    // unification is that the comparison TYPECHECKS in one manifold.
    const r = resonance(doc, ui);
    expect(r).toBeGreaterThanOrEqual(0.0);
    expect(r).toBeLessThanOrEqual(1.0);
  });
});
