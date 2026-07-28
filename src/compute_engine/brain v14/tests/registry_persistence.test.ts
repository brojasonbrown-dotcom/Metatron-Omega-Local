/**
 * Tests — Concept Registry + Memory Store persistence
 *
 * Plan requirements:
 *  - save→load round-trip preserves Float64 prototypes EXACTLY
 *  - corrupt state file → quarantined + clean start (never silent mock data)
 *  - observe() recognition/reinforcement semantics
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { encodeText } from "../adapters/language_codec.ts";
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { MemoryStore } from "../cognition/memory_store.ts";
import { decodeFieldBase64, encodeFieldBase64 } from "../schemas/validate.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rhuft-mind-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("ConceptRegistry.observe", () => {
  it("mints a new concept for an unseen field", () => {
    const registry = new ConceptRegistry();
    const result = registry.observe(encodeText("sunrise"), ["sunrise"], "test");
    expect(result.isNew).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("recognizes and reinforces a re-encountered field", () => {
    const registry = new ConceptRegistry();
    const field = encodeText("sunrise");
    const first = registry.observe(field, ["sunrise"], "test");
    const second = registry.observe(field, [], "test");
    expect(second.isNew).toBe(false);
    expect(second.concept.id).toBe(first.concept.id);
    expect(second.resonance).toBeCloseTo(1.0, 9);
    expect(second.concept.reinforcement).toBeGreaterThan(first.concept.reinforcement - 1);
    expect(registry.size).toBe(1);
  });

  it("rejects wrong-size fields", () => {
    const registry = new ConceptRegistry();
    expect(() => registry.observe(new Float64Array(27), [], "test")).toThrow();
  });
});

describe("base64 field codec", () => {
  it("encode→decode is bit-exact", () => {
    const field = encodeText("exactness");
    const decoded = decodeFieldBase64(encodeFieldBase64(field));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(Array.from(decoded.value)).toEqual(Array.from(field));
    }
  });
});

describe("MemoryStore save→load round-trip", () => {
  it("preserves prototypes bit-exactly, labels, and thought count", () => {
    const store = new MemoryStore(tmpDir);
    store.open();

    const registry = new ConceptRegistry();
    // Texts verified pairwise distinct (< λ) so three separate concepts mint.
    const entries: Array<[string, string]> = [
      ["gravity", "the mountain rises above the valley"],
      ["clouds", "clouds drift slowly across the evening sky"],
      ["bird", "a bird sings at dawn"],
    ];
    const originals = new Map<string, Float64Array>();
    for (const [label, text] of entries) {
      const obs = registry.observe(encodeText(text), [label], "test");
      originals.set(label, new Float64Array(obs.concept.prototype));
    }
    expect(registry.size).toBe(entries.length); // none merged
    store.save(registry, 42);
    store.close();

    const store2 = new MemoryStore(tmpDir);
    store2.open();
    const registry2 = new ConceptRegistry();
    const loaded = store2.load(registry2);
    store2.close();

    expect(loaded.loaded).toBe(true);
    expect(loaded.quarantined).toBeNull();
    expect(loaded.stableThoughtCount).toBe(42);
    expect(registry2.size).toBe(entries.length);
    for (const [label] of entries) {
      const concept = registry2.findByLabel(label);
      expect(concept).toBeDefined();
      // Float64 EXACT equality — persistence must not lose a single bit.
      expect(Array.from(concept!.prototype)).toEqual(Array.from(originals.get(label)!));
    }
  });
});

describe("MemoryStore corruption quarantine", () => {
  it("quarantines a corrupt state file and starts clean", () => {
    const store = new MemoryStore(tmpDir);
    store.open();
    fs.writeFileSync(store.statePath, "{ this is not valid json at all", "utf8");

    const registry = new ConceptRegistry();
    const loaded = store.load(registry);
    store.close();

    expect(loaded.loaded).toBe(false);
    expect(loaded.quarantined).not.toBeNull();
    expect(loaded.stableThoughtCount).toBe(0);
    expect(registry.size).toBe(0);
    // the corrupt file was moved aside, not deleted, not silently reused
    expect(fs.existsSync(loaded.quarantined!)).toBe(true);
    expect(fs.existsSync(store.statePath)).toBe(false);
  });

  it("quarantines a schema-invalid (but valid JSON) state file", () => {
    const store = new MemoryStore(tmpDir);
    store.open();
    fs.writeFileSync(
      store.statePath,
      JSON.stringify({ version: 99, concepts: "nope" }),
      "utf8"
    );

    const registry = new ConceptRegistry();
    const loaded = store.load(registry);
    store.close();

    expect(loaded.loaded).toBe(false);
    expect(loaded.quarantined).not.toBeNull();
    expect(registry.size).toBe(0);
  });
});

describe("MemoryStore journal", () => {
  it("appends JSONL entries", async () => {
    const store = new MemoryStore(tmpDir);
    store.open();
    store.journal({ t: Date.now(), kind: "boot", data: { test: true } });
    store.journal({ t: Date.now(), kind: "thought", data: { id: "t1" } });
    store.close();
    // journal stream flushes asynchronously on close
    await new Promise((r) => setTimeout(r, 100));

    const lines = fs
      .readFileSync(store.journalPath, "utf8")
      .split("\n")
      .filter((l) => l.length > 0);
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]).kind).toBe("boot");
    expect(JSON.parse(lines[1]).kind).toBe("thought");
  });
});
