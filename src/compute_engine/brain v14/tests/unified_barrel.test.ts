import { describe, it, expect } from "vitest";
import { core, mind } from "../../index.js";

describe("unified barrel (compute_engine/index.ts)", () => {
  it("exposes the engine core namespaced layers", () => {
    expect(typeof core.getScale).toBe("function");
    expect(typeof core.scaleLengthAt).toBe("function");
    expect(core.getScale(13)).toBeDefined();
  });
  it("exposes the mind layer as a distinct namespace", () => {
    expect(mind).toBeDefined();
    expect(Object.keys(mind).length).toBeGreaterThan(0);
    expect(core).not.toBe(mind);
  });
});
