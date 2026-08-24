/**
 * Tests — Telemetry Tape: the engine's readouts as an internal sense (ADR-001).
 *
 * Guarantees under test:
 *   1. The tape field honours the locked 28-element contract and validates on
 *      the SensorBus (source "engine.fourier" is a first-class sense).
 *   2. The encoding is honest: a pure tone's energy lands on a φ-graded channel;
 *      the field is L2-normalised; a flat field yields the honest zero field.
 *   3. DISABLED by default → emit() is a no-op (zero regression).
 *   4. Bounded + deferred: anti-thrash interval and bus-busy both defer; a
 *      degenerate field is never pushed.
 *   5. The continuity invariants ride the frame's meta (provenance).
 */

import { describe, expect, it } from "vitest";
import {
  TelemetryTape,
  tapeFieldFromSpectrum,
  spectralEnrichmentFromLattice,
  TAPE_FIELD_SIZE,
  TAPE_MIN_INTERVAL_TICKS,
  CODE_CAP_DEFAULT,
  CODE_CAP_MAX,
  CODE_CAP_MIN,
  type TapeSample,
} from "../cognition/telemetry_tape.ts";
import { SensorBus } from "../adapters/sensors/sensor_bus.ts";
import { validateSensoryFrame } from "../schemas/validate.ts";

/** A deterministic [nodes][28] lattice: node n carries a tone at field-bin (n mod 7)+1. */
function makeLattice(nodes: number, phase = 0): Float64Array {
  const out = new Float64Array(nodes * TAPE_FIELD_SIZE);
  for (let n = 0; n < nodes; n++) {
    const m = (n % 7) + 1;
    for (let i = 0; i < TAPE_FIELD_SIZE; i++) {
      out[n * TAPE_FIELD_SIZE + i] = Math.sin((TWO_PI * m * i) / TAPE_FIELD_SIZE + phase + n * 0.1);
    }
  }
  return out;
}

const TWO_PI = 2 * Math.PI;

/** A deterministic N-node ring field: a pure spatial tone at bin m. */
function makeToneField(n: number, m: number): Float64Array {
  const f = new Float64Array(n);
  for (let i = 0; i < n; i++) f[i] = Math.sin((TWO_PI * m * i) / n);
  return f;
}

function sample(field: Float64Array, coherence = 0.9): TapeSample {
  return { field, invariants: { coherence, closure: 1e-3, drift: 1e-4, burden: 32 } };
}

describe("TelemetryTape — the 28-field contract", () => {
  it("produces exactly 28 finite, L2-normalised elements", () => {
    const f = tapeFieldFromSpectrum(makeToneField(144, 3));
    expect(f.length).toBe(TAPE_FIELD_SIZE);
    for (const v of f) expect(Number.isFinite(v)).toBe(true);
    let norm = 0;
    for (const v of f) norm += v * v;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 6);
  });

  it("a flat field yields the honest zero field (no invented structure)", () => {
    const f = tapeFieldFromSpectrum(new Float64Array(144).fill(0.5));
    for (const v of f) expect(v).toBe(0);
  });

  it("rejects a degenerate field honestly", () => {
    expect(() => tapeFieldFromSpectrum(new Float64Array(1))).toThrow(RangeError);
  });
});

describe("TelemetryTape — emission gating (opt-in, bounded, deferred)", () => {
  it("disabled by default: emit() is a no-op, nothing reaches the bus", () => {
    const bus = new SensorBus();
    const tape = new TelemetryTape(bus); // disabled
    expect(tape.enabled).toBe(false);
    expect(tape.emit(0, sample(makeToneField(144, 3)))).toBe(false);
    expect(bus.stats().accepted).toBe(0);
  });

  it("enabled: pushes a validated engine.fourier frame carrying the invariants", () => {
    const bus = new SensorBus();
    const tape = new TelemetryTape(bus, true);
    const ok = tape.emit(0, sample(makeToneField(144, 3), 0.91));
    expect(ok).toBe(true);
    expect(bus.stats().accepted).toBe(1);

    const frame = bus.drain(1)[0]!;
    expect(frame.source).toBe("engine.fourier");
    expect(frame.field.length).toBe(TAPE_FIELD_SIZE);
    expect(frame.meta.origin).toBe("engine.telemetry");
    expect(Number(frame.meta.coherence)).toBeCloseTo(0.91, 6);
    expect(frame.meta.burden).toBe("32.0000");
  });

  it("anti-thrash: a second emit within the interval defers", () => {
    const bus = new SensorBus();
    const tape = new TelemetryTape(bus, true);
    expect(tape.emit(0, sample(makeToneField(144, 3)))).toBe(true);
    // Within TAPE_MIN_INTERVAL_TICKS — but the bus is now non-empty too, so
    // drain first to isolate the interval gate.
    bus.drain(89);
    expect(tape.emit(1, sample(makeToneField(144, 3)))).toBe(false);
    // After the interval (and a drained bus) it emits again.
    expect(tape.emit(TAPE_MIN_INTERVAL_TICKS, sample(makeToneField(144, 3)))).toBe(true);
    expect(tape.stats().emitted).toBe(2);
    expect(tape.stats().deferredInterval).toBe(1);
  });

  it("bus-busy: defers rather than compete with live perception", () => {
    const bus = new SensorBus();
    // Occupy the bus with one live frame so queued > 0.
    bus.push({ source: "audio.mic", timestamp: Date.now(), meta: {}, field: makeToneField(28, 1) });
    const tape = new TelemetryTape(bus, true);
    expect(tape.emit(0, sample(makeToneField(144, 3)))).toBe(false);
    expect(tape.stats().deferredBusy).toBe(1);
  });

  it("setEnabled flips live and reports the previous state", () => {
    const tape = new TelemetryTape(new SensorBus(), false);
    expect(tape.setEnabled(true)).toBe(false);
    expect(tape.enabled).toBe(true);
    expect(tape.setEnabled(false)).toBe(true);
  });
});

describe("ADR-003 — spectral codes (top-k coefficient retention)", () => {
  it("retains the dominant modes, bounded by rank99 and the cap", () => {
    const e = spectralEnrichmentFromLattice(makeLattice(41))!;
    expect(e.codes).toBeDefined();
    const codes = e.codes!;
    // k honours the cap, the field's own rank99, and the spectrum length.
    expect(codes.topK).toBeGreaterThanOrEqual(CODE_CAP_MIN);
    expect(codes.topK).toBeLessThanOrEqual(CODE_CAP_DEFAULT);
    expect(codes.topK).toBeLessThanOrEqual(e.complexity.rank99);
    expect(codes.re.length).toBe(codes.topK);
    expect(codes.im.length).toBe(codes.topK);
    expect(codes.indices.length).toBe(codes.topK);
    // Self-describing: dims anchor the flat indices back onto the [nodes][28] grid.
    expect(Array.from(codes.dims)).toEqual([41, TAPE_FIELD_SIZE]);
    const grid = 41 * TAPE_FIELD_SIZE;
    for (let m = 0; m < codes.topK; m++) {
      expect(Number.isFinite(codes.re[m])).toBe(true);
      expect(Number.isFinite(codes.im[m])).toBe(true);
      expect(codes.indices[m]).toBeLessThan(grid);
    }
    // Coefficients are retained descending by power: the first is a strongest mode.
    const p0 = codes.re[0]! * codes.re[0]! + codes.im[0]! * codes.im[0]!;
    const pLast = codes.re[codes.topK - 1]! ** 2 + codes.im[codes.topK - 1]! ** 2;
    expect(p0).toBeGreaterThanOrEqual(pLast);
  });

  it("the cap is adjustable: a smaller cap retains fewer codes", () => {
    const wide = spectralEnrichmentFromLattice(makeLattice(41), CODE_CAP_DEFAULT)!;
    const narrow = spectralEnrichmentFromLattice(makeLattice(41), 3)!;
    expect(narrow.codes!.topK).toBeLessThanOrEqual(3);
    expect(narrow.codes!.topK).toBeLessThanOrEqual(wide.codes!.topK);
    // The retained coefficients are the SAME leading modes, just truncated.
    expect(Array.from(narrow.codes!.re)).toEqual(Array.from(wide.codes!.re.slice(0, narrow.codes!.topK)));
  });

  it("codeCap <= 0 disables retention (legacy whitened-only frame)", () => {
    const e = spectralEnrichmentFromLattice(makeLattice(41), 0)!;
    expect(e.codes).toBeUndefined();
    expect(e.whitened.length).toBe(41 * TAPE_FIELD_SIZE);
  });

  it("whitened identity + complexity are byte-identical with and without retention", () => {
    const withCodes = spectralEnrichmentFromLattice(makeLattice(41), CODE_CAP_DEFAULT)!;
    const without = spectralEnrichmentFromLattice(makeLattice(41), 0)!;
    expect(Array.from(withCodes.whitened)).toEqual(Array.from(without.whitened));
    expect(withCodes.complexity).toEqual(without.complexity);
    expect(withCodes.parsevalResidual).toBe(without.parsevalResidual);
  });

  it("the retained codes validate on the bus contract end-to-end", () => {
    const e = spectralEnrichmentFromLattice(makeLattice(41))!;
    const res = validateSensoryFrame({
      source: "engine.fourier",
      timestamp: Date.now(),
      meta: {},
      field: makeToneField(28, 1),
      spectral: e,
    });
    expect(res.ok).toBe(true);
    expect(res.ok && res.value.spectral?.codes?.topK).toBe(e.codes!.topK);
  });
});

describe("ADR-003 — event-driven gate (opt-in)", () => {
  it("default off: a novel field within the interval still defers (byte-identical)", () => {
    const bus = new SensorBus();
    const tape = new TelemetryTape(bus, true);
    expect(tape.eventDriven).toBe(false);
    expect(tape.emit(0, sample(makeToneField(144, 3)), makeLattice(41))).toBe(true);
    bus.drain(89);
    // A clearly different lattice, one tick later — with the gate OFF it defers.
    expect(tape.emit(1, sample(makeToneField(144, 3)), makeLattice(41, 1.7))).toBe(false);
    expect(tape.stats().deferredInterval).toBe(1);
    expect(tape.stats().emittedEarly).toBe(0);
  });

  it("enabled: a moved spectral identity emits early and is counted", () => {
    const bus = new SensorBus();
    const tape = new TelemetryTape(bus, true);
    tape.setEventDriven(true, 0.05);
    expect(tape.emit(0, sample(makeToneField(144, 3)), makeLattice(41))).toBe(true);
    bus.drain(89);
    // A DIFFERENT-frequency lattice → a genuinely different power spectrum → a
    // moved whitened identity → early emit. (A pure PHASE shift would leave the
    // power spectrum invariant — the whitened signature reads power, not phase —
    // so it is honest that a phase-only change does NOT trip the gate.)
    const shifted = new Float64Array(41 * TAPE_FIELD_SIZE);
    for (let n = 0; n < 41; n++) {
      const m = (n % 5) + 3; // different spatial bins than makeLattice's (n%7)+1
      for (let i = 0; i < TAPE_FIELD_SIZE; i++) {
        shifted[n * TAPE_FIELD_SIZE + i] = Math.sin((TWO_PI * m * i) / TAPE_FIELD_SIZE + n * 0.3);
      }
    }
    expect(tape.emit(1, sample(makeToneField(144, 3)), shifted)).toBe(true);
    expect(tape.stats().emitted).toBe(2);
    expect(tape.stats().emittedEarly).toBe(1);
    expect(tape.stats().deferredInterval).toBe(0);
  });

  it("enabled but unchanged field still defers (the interval still gates the quiet mind)", () => {
    const bus = new SensorBus();
    const tape = new TelemetryTape(bus, true);
    tape.setEventDriven(true, 0.05);
    expect(tape.emit(0, sample(makeToneField(144, 3)), makeLattice(41))).toBe(true);
    bus.drain(89);
    // IDENTICAL lattice → no spectral move → the fixed interval still defers.
    expect(tape.emit(1, sample(makeToneField(144, 3)), makeLattice(41))).toBe(false);
    expect(tape.stats().emittedEarly).toBe(0);
    expect(tape.stats().deferredInterval).toBe(1);
  });

  it("setCodeCap / setEventDriven report previous state and clamp honestly", () => {
    const tape = new TelemetryTape(new SensorBus(), true);
    expect(tape.setCodeCap(5)).toBe(CODE_CAP_DEFAULT); // returns prior
    expect(tape.codeCap).toBe(5);
    tape.setCodeCap(10_000); // clamped to the max
    expect(tape.codeCap).toBe(CODE_CAP_MAX);
    tape.setCodeCap(0); // disables retention
    expect(tape.codeCap).toBe(0);
    expect(tape.setEventDriven(true)).toBe(false); // returns prior
    expect(tape.eventDriven).toBe(true);
  });
});
