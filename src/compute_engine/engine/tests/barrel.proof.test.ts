/**
 * Barrel resolution proof — verifies src/index.ts re-exports every layer and
 * that a consumer can reach a representative symbol from each, at RUNTIME.
 */
import { describe, it, expect } from "vitest";
import { core, geometry, dynamics, information, analysis, refinement, engine } from "../src/index.js";

describe("engine barrel (src/index.ts)", () => {
  it("re-exports all seven layers with reachable symbols", () => {
    // core
    expect(typeof core.getScale).toBe("function");
    expect(core.getScale(13)).toBeDefined();
    // geometry
    expect(typeof geometry.torusForScale).toBe("function");
    expect(geometry.torusForScale(13)).toBeDefined();
    // the remaining layers resolve to non-empty namespaces
    for (const ns of [dynamics, information, analysis, refinement, engine]) {
      expect(typeof ns).toBe("object");
      expect(Object.keys(ns).length).toBeGreaterThan(0);
    }
  });

  it("core + refinement constants namespaces are distinct (no collision)", () => {
    expect(core).toBeDefined();
    expect(refinement).toBeDefined();
    expect(core).not.toBe(refinement);
  });
});
