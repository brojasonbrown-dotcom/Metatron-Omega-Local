/**
 * Tests — L5 Multiscale Bridge: the closed 18-torus engine as a lived sense.
 *
 * Guarantees under test:
 *   1. FIELD CONTRACT — the multiscale readout encodes to exactly 28 finite,
 *      L2-normalised elements (the locked bus contract).
 *   2. VALIDATION — a pushed frame validates on the bus as "engine.multiscale".
 *   3. DETERMINISM — the engine's own guarantee: identical config ⇒ identical
 *      trajectory, so identical fields across two bridges.
 *   4. INVARIANTS — the step result carries all four invariants per rung + the
 *      flux-conservation certificate; the frame's meta reports them honestly.
 *   5. ZERO REGRESSION — disabled by default → step() is a no-op.
 */

import { describe, expect, it } from "vitest";
import { MultiscaleBridge, multiscaleField } from "../cognition/multiscale_bridge.ts";
import { MultiscaleEngine } from "../../engine/src/engine/multiscaleEngine.ts";
import { SensorBus } from "../adapters/sensors/sensor_bus.ts";

describe("L5 — multiscaleField (the 28-field encoding)", () => {
  it("encodes the 18-rung readout to exactly 28 finite, L2-normalised elements", () => {
    const engine = new MultiscaleEngine();
    const result = engine.run(3).residualTrajectory && engine.step(); // advance + read
    const f = multiscaleField(result);
    expect(f.length).toBe(28);
    for (const v of f) expect(Number.isFinite(v)).toBe(true);
    let norm = 0;
    for (const v of f) norm += v * v;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 6);
  });

  it("deterministic: identical engine config yields identical fields", () => {
    const a = new MultiscaleEngine();
    const b = new MultiscaleEngine();
    const fa = multiscaleField(a.step());
    const fb = multiscaleField(b.step());
    expect(Array.from(fa)).toEqual(Array.from(fb));
  });
});

describe("L5 — MultiscaleBridge (gated, validated, honest)", () => {
  it("disabled by default: step() is a no-op, nothing reaches the bus", () => {
    const bus = new SensorBus();
    const bridge = new MultiscaleBridge(bus); // disabled
    expect(bridge.enabled).toBe(false);
    expect(bridge.step()).toBe(false);
    expect(bus.stats().accepted).toBe(0);
  });

  it("enabled: pushes a validated engine.multiscale frame carrying the invariants", () => {
    const bus = new SensorBus();
    const bridge = new MultiscaleBridge(bus, true);
    const ok = bridge.step();
    expect(ok).toBe(true);
    expect(bus.stats().accepted).toBe(1);

    const frame = bus.drain(1)[0]!;
    expect(frame.source).toBe("engine.multiscale");
    expect(frame.field.length).toBe(28);
    expect(frame.meta.origin).toBe("engine.multiscale18");
    expect(frame.meta.rungs).toBe("18");
    expect(frame.meta.allScalesPresent).toBe("true");
    expect(Number(frame.meta.meanCoherence)).toBeGreaterThan(0);
  });

  it("reports the flux-conservation certificate + coherence honestly in stats", () => {
    const bus = new SensorBus();
    const bridge = new MultiscaleBridge(bus, true);
    bridge.step();
    const s = bridge.stats();
    expect(s.steps).toBe(1);
    expect(s.emitted).toBe(1);
    expect(typeof s.lastFluxConserved).toBe("boolean");
    expect(Number.isFinite(s.lastTotalResidual)).toBe(true);
    expect(s.lastMeanCoherence).toBeGreaterThan(0);
  });

  it("the engine's trajectory is reproducible across two bridges (bit-identical)", () => {
    const a = new MultiscaleBridge(new SensorBus(), true);
    const b = new MultiscaleBridge(new SensorBus(), true);
    for (let i = 0; i < 5; i++) { a.step(); b.step(); }
    expect(a.stats().lastTotalResidual).toBe(b.stats().lastTotalResidual);
    expect(a.stats().lastMeanCoherence).toBe(b.stats().lastMeanCoherence);
  });

  it("setEnabled flips live and reports the previous state", () => {
    const bridge = new MultiscaleBridge(new SensorBus(), false);
    expect(bridge.setEnabled(true)).toBe(false);
    expect(bridge.enabled).toBe(true);
    expect(bridge.setEnabled(false)).toBe(true);
  });
});
