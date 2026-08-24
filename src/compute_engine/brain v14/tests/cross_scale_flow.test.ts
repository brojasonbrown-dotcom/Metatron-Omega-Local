/**
 * Tests — L1 Cross-Scale Flow: the toroidal octave lane.
 *
 * Guarantees under test:
 *   1. ROUTING — a scale's measured residual is routed through the engine's
 *      File-11 FluxLedger to its ladder neighbours AND its ±13 octave partners.
 *   2. CONSERVATION — the ledger's own double-entry certificate holds (flux
 *      neither created nor destroyed) across many ticks.
 *   3. HONESTY — a perfectly-closed scale (zero residual) routes NOTHING.
 *   4. DETERMINISM — the same tree yields the same ledger, bit-for-bit.
 *   5. ZERO REGRESSION — disabled by default → observe() is a no-op.
 *   6. RECONCILIATION — the mind's canonical scales route via their nearest
 *      stable engine rung (L0), never conflated.
 */

import { describe, expect, it } from "vitest";
import { CrossScaleFlow, measureScaleResidual, type FlowNode } from "../cognition/cross_scale_flow.ts";
import { ScaleMapper } from "../scale_mapper.ts";

const KAPPA_CC = 0.1967263286200249 * 0.3819660112501051; // CLOSURE_COUPLING × curvature_coupling

/** A minimal deterministic tree: a scale with a field offset from its boundary. */
function makeNode(scale: number, fieldVal: number, boundaryVal: number, children: FlowNode[] = []): FlowNode {
  return {
    scale,
    membrane: { boundary_field: new Float64Array(28).fill(boundaryVal) },
    state: { field_state: new Float64Array(28).fill(fieldVal) },
    children,
  };
}

describe("L1 — measureScaleResidual (the honest closure read)", () => {
  it("a perfectly-closed scale (field = boundary) has zero residual", () => {
    const nodes = [makeNode(192, 0.5, 0.5)];
    expect(measureScaleResidual(nodes, KAPPA_CC)).toBe(0);
  });

  it("a boundary mismatch yields a positive residual ∝ the mismatch", () => {
    const nodes = [makeNode(192, 0.0, 1.0)]; // |b−f| = 1 over 28 elements
    const r = measureScaleResidual(nodes, KAPPA_CC);
    expect(r).toBeCloseTo(KAPPA_CC * 28, 9);
  });

  it("residual sums across multiple nodes at the same scale", () => {
    const one = measureScaleResidual([makeNode(192, 0, 1)], KAPPA_CC);
    const two = measureScaleResidual([makeNode(192, 0, 1), makeNode(192, 0, 1)], KAPPA_CC);
    expect(two).toBeCloseTo(2 * one, 9);
  });
});

describe("L1 — CrossScaleFlow observer (gated, conservative, deterministic)", () => {
  const mapper = new ScaleMapper();

  it("disabled by default: observe() is a no-op", () => {
    const flow = new CrossScaleFlow(mapper); // disabled
    expect(flow.enabled).toBe(false);
    flow.observe(makeNode(192, 0, 1), KAPPA_CC);
    expect(flow.stats().ticks).toBe(0);
    expect(flow.stats().routed).toBe(0);
  });

  it("enabled: routes a scale's residual to ladder + octave channels", () => {
    const flow = new CrossScaleFlow(mapper, true);
    // scale 192 → rung 183 (L0). 183's ladder neighbours + ±13 octave partners.
    flow.observe(makeNode(192, 0, 1), KAPPA_CC);
    const s = flow.stats();
    expect(s.ticks).toBe(1);
    expect(s.routed).toBeGreaterThan(0); // real transfers happened
    expect(s.fluxConserved).toBe(true);  // the ledger balances
    expect(s.totalFlux).toBeGreaterThan(0);
  });

  it("flux is conserved across many ticks (double-entry certificate)", () => {
    const flow = new CrossScaleFlow(mapper, true);
    const tree = makeNode(292, 0, 0.3, [
      makeNode(270, 0, 0.5, [makeNode(250, 0, 0.7)]),
      makeNode(235, 0, 0.9),
    ]);
    for (let t = 0; t < 13; t++) flow.observe(tree, KAPPA_CC);
    expect(flow.stats().fluxConserved).toBe(true);
  });

  it("a perfectly-closed tree routes nothing (honest zero)", () => {
    const flow = new CrossScaleFlow(mapper, true);
    flow.observe(makeNode(192, 0.5, 0.5), KAPPA_CC); // field == boundary
    expect(flow.stats().routed).toBe(0);
    expect(flow.stats().skippedZero).toBe(1);
  });

  it("deterministic: identical trees produce identical ledgers", () => {
    const a = new CrossScaleFlow(new ScaleMapper(), true);
    const b = new CrossScaleFlow(new ScaleMapper(), true);
    const treeA = makeNode(292, 0, 0.3, [makeNode(270, 0, 0.5)]);
    const treeB = makeNode(292, 0, 0.3, [makeNode(270, 0, 0.5)]);
    for (let t = 0; t < 5; t++) { a.observe(treeA, KAPPA_CC); b.observe(treeB, KAPPA_CC); }
    expect(a.stats().totalFlux).toBe(b.stats().totalFlux);
    expect(a.stats().routed).toBe(b.stats().routed);
  });

  it("octave partners receive flux (the ±13 channel is real)", () => {
    const flow = new CrossScaleFlow(mapper, true);
    // scale 96 → rung 97; its octave partners are 84 and 110.
    flow.observe(makeNode(96, 0, 1), KAPPA_CC);
    // At least one octave partner must show influx (the ±13 lane carried flux).
    const oct = [84, 110];
    const octaveInflux = oct.reduce((s, r) => s + flow.influx(r), 0);
    expect(octaveInflux).toBeGreaterThan(0);
  });

  it("setEnabled flips live and reports previous state", () => {
    const flow = new CrossScaleFlow(mapper, false);
    expect(flow.setEnabled(true)).toBe(false);
    expect(flow.enabled).toBe(true);
    expect(flow.setEnabled(false)).toBe(true);
  });
});
