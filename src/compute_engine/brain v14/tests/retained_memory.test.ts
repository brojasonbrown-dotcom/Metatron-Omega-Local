/**
 * Tests — Retained Memory: the measured-coherence retention gate (ADR-001).
 *
 * Guarantees under test:
 *   1. DISABLED by default → admit-everything, byte-for-byte today's behaviour
 *      (zero regression by construction).
 *   2. Enabled → coherence ≥ 0.66 is retained; < 0.66 is deferred.
 *   3. A redundant (non-novel) coherent candidate is NOT re-stored.
 *   4. Governor headroom: retention DEFERS when the budget is saturated —
 *      the resource law is READ, never overridden.
 *   5. A non-finite / out-of-range coherence is never retained (measurement
 *      defect reported honestly).
 *   6. Counters are honest (admitted vs each deferral class sums correctly).
 */

import { describe, expect, it } from "vitest";
import {
  RetainedMemory,
  DEFAULT_RETENTION_THRESHOLD,
  PHI_HIGH_MARGIN_FLOOR,
} from "../cognition/retained_memory.ts";

/** A minimal governor stub exposing ONLY the two reads the gate performs. */
function makeGovernor(opts: { targetRamBytes: number; ramPerNode: number }) {
  return {
    compute_budget: () => ({
      max_ram_bytes: opts.targetRamBytes,
      max_cpu_percent: 100,
      target_ram_bytes: opts.targetRamBytes,
      target_cpu_percent: 61.8,
      max_nodes: 1000,
      max_depth: 8,
    }),
    estimate_usage: (totalNodes: number) => ({
      ram_bytes: totalNodes * opts.ramPerNode,
      cpu_percent: 0,
    }),
  } as never;
}

describe("RetainedMemory — disabled default (zero regression)", () => {
  it("constructed disabled: admits everything, regardless of coherence", () => {
    const gate = new RetainedMemory();
    expect(gate.enabled).toBe(false);
    expect(gate.threshold).toBeCloseTo(DEFAULT_RETENTION_THRESHOLD, 12);

    // Even a zero-coherence candidate is admitted when disabled (today's behaviour).
    const v = gate.admit({ source: "audio.mic", coherence: 0, novel: false });
    expect(v.retain).toBe(true);
    expect(v.reason).toBe("disabled");
  });

  it("the φ⁻¹ high-margin floor is exported for A/B measurement", () => {
    expect(PHI_HIGH_MARGIN_FLOOR).toBeCloseTo(0.6180339887498949, 15);
  });
});

describe("RetainedMemory — the coherence rule", () => {
  it("retains coherence ≥ 0.66; defers below it", () => {
    const gate = new RetainedMemory(null, null, true);
    expect(gate.admit({ source: "vision.screen", coherence: 0.66, novel: true }).retain).toBe(true);
    expect(gate.admit({ source: "vision.screen", coherence: 0.99, novel: true }).retain).toBe(true);

    const below = gate.admit({ source: "vision.screen", coherence: 0.659, novel: true });
    expect(below.retain).toBe(false);
    expect(below.reason).toBe("below-coherence");
  });

  it("a coherent but redundant candidate is not re-stored", () => {
    const gate = new RetainedMemory(null, null, true);
    const v = gate.admit({ source: "engine.fourier", coherence: 0.9, novel: false });
    expect(v.retain).toBe(false);
    expect(v.reason).toBe("redundant");
  });

  it("never retains a non-finite or out-of-range coherence", () => {
    const gate = new RetainedMemory(null, null, true);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.01]) {
      const v = gate.admit({ source: "llm.answer", coherence: bad, novel: true });
      expect(v.retain).toBe(false);
      expect(v.reason).toBe("bad-coherence");
    }
  });
});

describe("RetainedMemory — governor headroom (read, never overridden)", () => {
  it("defers when the budget is saturated; admits with headroom", () => {
    // target 1000 B, 10 B/node. HEADROOM_FLOOR_RATIO ≈ 0.618 → saturated at ≥ 62 nodes.
    const gov = makeGovernor({ targetRamBytes: 1000, ramPerNode: 10 });
    const gate = new RetainedMemory(gov, null, true);

    // 70 nodes → usedRatio 0.70 ≥ 0.618 → defer (no headroom).
    const full = gate.admit({ source: "engine.fourier", coherence: 0.9, novel: true }, 70);
    expect(full.retain).toBe(false);
    expect(full.reason).toBe("governor-defer");

    // 30 nodes → usedRatio 0.30 < 0.618 → admit (headroom present).
    const roomy = gate.admit({ source: "engine.fourier", coherence: 0.9, novel: true }, 30);
    expect(roomy.retain).toBe(true);
    expect(roomy.reason).toBe("retained");
  });

  it("no governor wired → headroom never blocks retention", () => {
    const gate = new RetainedMemory(null, null, true);
    const v = gate.admit({ source: "audio.mic", coherence: 0.9, novel: true }, 99999);
    expect(v.retain).toBe(true);
  });
});

describe("RetainedMemory — honest counters", () => {
  it("admitted + each deferral class sums to total attempts", () => {
    const gov = makeGovernor({ targetRamBytes: 1000, ramPerNode: 10 });
    const gate = new RetainedMemory(gov, null, true);

    gate.admit({ source: "a", coherence: 0.9, novel: true }, 10);   // retained
    gate.admit({ source: "b", coherence: 0.5, novel: true }, 10);   // below-coherence
    gate.admit({ source: "c", coherence: 0.9, novel: false }, 10);  // redundant
    gate.admit({ source: "d", coherence: 0.9, novel: true }, 70);   // governor-defer

    const s = gate.stats();
    expect(s.enabled).toBe(true);
    expect(s.admitted).toBe(1);
    expect(s.deferredCoherence).toBe(1);
    expect(s.deferredRedundant).toBe(1);
    expect(s.deferredHeadroom).toBe(1);
    expect(s.admitted + s.deferredCoherence + s.deferredRedundant + s.deferredHeadroom).toBe(4);
  });

  it("setEnabled flips live and reports the previous state", () => {
    const gate = new RetainedMemory(null, null, false);
    expect(gate.setEnabled(true)).toBe(false);
    expect(gate.enabled).toBe(true);
    expect(gate.admit({ source: "x", coherence: 0.5, novel: true }).retain).toBe(false);
    expect(gate.setEnabled(false)).toBe(true);
    expect(gate.admit({ source: "x", coherence: 0.5, novel: true }).retain).toBe(true);
  });
});
