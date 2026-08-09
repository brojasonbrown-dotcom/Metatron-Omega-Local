/**
 * Integration — P6-E domain curriculum (business + software specialisation).
 *
 * The operator's mandate: the mind specialises in learning businesses and their
 * structures, how to use software systems, and to learn in any way it is
 * instructed. This suite proves the curriculum adapter feeds each corpus through
 * the verified P6-C codec into the sanctioned SensorBus door, and that "learned"
 * is a MEASUREMENT against the registry's mastery ledger — never a claim.
 *
 * What is proven:
 *   1. PROVENANCE — each corpus kind pushes a frame with the right bus source
 *      (doc.feed / ui.observe / text.feed), the door the loop already drains.
 *   2. NO-FABRICATION — an empty document / empty UI tree / blank instruction is
 *      rejected by the codec (throws) and surfaced, never smuggled as a field.
 *   3. MEASURED LEARNED — a corpus whose probes resolve to high-mastery concepts
 *      reports learned:true; mastery is read from the registry, not asserted.
 *   4. HONEST NOT-LEARNED — a corpus whose probes resolve to low mastery (or to
 *      nothing) reports learned:false with the measured mastery exposed.
 *   5. UNRESOLVED PROBES COUNT ZERO — a probe that lands on no concept drags the
 *      mean down (divided by full probe count), so gaps are not excused.
 *   6. COUNTERS — accepted/rejected frames and corporaRun are tallied truthfully.
 *   7. REAL BUS — frames pushed through the real SensorBus validate and queue.
 */
import { describe, expect, it } from "vitest";
import { DomainCurriculum, type Corpus, type CurriculumRegistry } from "../adapters/domain_curriculum.ts";
import { SensorBus } from "../adapters/sensors/sensor_bus.ts";
import { FIELD_SIZE } from "../adapters/language_codec.ts";

/** A registry fake over the structural CurriculumRegistry surface. [SPEC] */
function fakeRegistry(masteryByProbe: Record<string, number | null>): CurriculumRegistry {
  return {
    nearestText(text: string, _k: number) {
      const m = masteryByProbe[text];
      if (m === null || m === undefined) return []; // resolves to nothing
      return [{ concept: { id: `c:${text}` }, resonance: 0.9 }];
    },
    masteryOf(id: string) {
      const probe = id.slice(2);
      const m = masteryByProbe[probe];
      return { mastery: m === null || m === undefined ? 0 : m };
    },
  };
}

const UI_TREE = {
  role: "form",
  name: "customer",
  children: [
    { role: "textbox", name: "name" },
    { role: "button", name: "save", state: "enabled" },
  ],
};

describe("P6-E — domain curriculum (business + software)", () => {
  it("feeds each corpus kind through its codec onto the bus with the right provenance", () => {
    const bus = new SensorBus();
    const curr = new DomainCurriculum(bus, fakeRegistry({}));
    const corpus: Corpus = {
      name: "acme",
      probes: [],
      items: [
        { kind: "business.doc", doc: { invoice: 1, total: 1290.5, customer: "acme" }, provenance: "invoice" },
        { kind: "software.ui", tree: UI_TREE, provenance: "crm-app" },
        { kind: "instruction.text", text: "learn the onboarding workflow" },
      ],
    };
    curr.teach(corpus);
    const frames = bus.drain(10);
    expect(frames.length).toBe(3);
    expect(frames.map((f) => f.source)).toEqual(["doc.feed", "ui.observe", "text.feed"]);
    for (const f of frames) {
      expect(f.field).toBeInstanceOf(Float64Array);
      expect(f.field.length).toBe(FIELD_SIZE);
      expect(f.meta.origin).toBe("curriculum");
    }
  });

  it("never fabricates: empty document / UI tree / blank instruction throws and is surfaced", () => {
    const bus = new SensorBus();
    const curr = new DomainCurriculum(bus, fakeRegistry({}));
    const r1 = curr.teach({
      name: "bad-doc",
      probes: [],
      items: [{ kind: "business.doc", doc: {}, provenance: "invoice" }],
    });
    expect(r1.framesAccepted).toBe(0);
    expect(curr.stats().lastError).toMatch(/bad-doc/);
    const r2 = curr.teach({
      name: "bad-ui",
      probes: [],
      items: [{ kind: "software.ui", tree: { role: "", name: "" }, provenance: "app" }],
    });
    expect(r2.framesAccepted).toBe(0);
    const r3 = curr.teach({ name: "bad-text", probes: [], items: [{ kind: "instruction.text", text: "   " }] });
    expect(r3.framesAccepted).toBe(0);
    expect(bus.drain(10).length).toBe(0); // nothing reached the door
  });

  it("reports learned:true only when measured mastery clears the λ floor", () => {
    const bus = new SensorBus();
    const curr = new DomainCurriculum(bus, fakeRegistry({ "acme crm": 0.8, "acme onboarding": 0.6 }));
    const out = curr.teach({
      name: "acme",
      probes: ["acme crm", "acme onboarding"],
      items: [{ kind: "instruction.text", text: "acme crm onboarding flow" }],
    });
    expect(out.probesResolved).toBe(2);
    expect(out.mastery).toBeCloseTo((0.8 + 0.6) / 2, 6);
    expect(out.learned).toBe(true);
  });

  it("reports learned:false honestly when mastery is below the floor", () => {
    const bus = new SensorBus();
    const curr = new DomainCurriculum(bus, fakeRegistry({ "acme crm": 0.2, "acme onboarding": 0.1 }));
    const out = curr.teach({
      name: "acme",
      probes: ["acme crm", "acme onboarding"],
      items: [{ kind: "instruction.text", text: "acme crm onboarding flow" }],
    });
    expect(out.learned).toBe(false);
    expect(out.mastery).toBeCloseTo(0.15, 6);
  });

  it("counts an unresolved probe as zero rather than excusing it", () => {
    const bus = new SensorBus();
    // "known" resolves to mastery 1.0; "unknown" resolves to nothing.
    const curr = new DomainCurriculum(bus, fakeRegistry({ known: 1.0, unknown: null }));
    const out = curr.teach({
      name: "half",
      probes: ["known", "unknown"],
      items: [{ kind: "instruction.text", text: "teach the known half" }],
    });
    expect(out.probesResolved).toBe(1);
    // mean over BOTH probes: (1.0 + 0) / 2 = 0.5 — the gap is not excused.
    expect(out.mastery).toBeCloseTo(0.5, 6);
  });

  it("tallies accepted/rejected frames and corporaRun truthfully", () => {
    const bus = new SensorBus();
    const curr = new DomainCurriculum(bus, fakeRegistry({}));
    curr.teach({
      name: "ok",
      probes: [],
      items: [
        { kind: "instruction.text", text: "first" },
        { kind: "instruction.text", text: "second" },
      ],
    });
    curr.teach({ name: "empty", probes: [], items: [{ kind: "instruction.text", text: "" }] });
    const s = curr.stats();
    expect(s.corporaRun).toBe(2);
    expect(s.framesAccepted).toBe(2);
    expect(s.lastError).toMatch(/empty/);
  });

  it("teaches a whole curriculum and returns one verdict per corpus", () => {
    const bus = new SensorBus();
    const curr = new DomainCurriculum(bus, fakeRegistry({ crm: 0.9, erp: 0.1 }));
    const results = curr.teachAll([
      { name: "crm", probes: ["crm"], items: [{ kind: "instruction.text", text: "crm corpus" }] },
      { name: "erp", probes: ["erp"], items: [{ kind: "instruction.text", text: "erp corpus" }] },
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.learned).toBe(true);
    expect(results[1]!.learned).toBe(false);
  });
});
