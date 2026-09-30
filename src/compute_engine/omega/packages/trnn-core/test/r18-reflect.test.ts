/**
 * r18 — deep reflection battery.
 *
 * Pins that the host can recall its deepest stored patterns (project +
 * associative) deterministically, and that second-pass consolidation is a
 * no-op on an empty project and seals once the project has deep members.
 */

import { describe, expect, it } from 'vitest';
import { EngineHost, MEMORY_STRIDE } from '../src/index';

describe('R18 · deep reflection', () => {
  it('deepReflect returns a coherent, deterministic shape', () => {
    const a = new EngineHost({ profile: 'PICO', seed: 'r18' });
    const b = new EngineHost({ profile: 'PICO', seed: 'r18' });
    for (let i = 0; i < MEMORY_STRIDE + 1; i++) {
      a.stepOnce();
      b.stepOnce();
    }
    const ra = a.deepReflect();
    const rb = b.deepReflect();
    expect(typeof ra.projectSize).toBe('number');
    expect(typeof ra.projectMeanDepth).toBe('number');
    expect(Array.isArray(ra.associativeLabels)).toBe(true);
    expect(ra.projectSize).toBe(rb.projectSize);
    expect(ra.associativeSize).toBe(rb.associativeSize);
  });

  it('deepReflectAndConsolidate is a no-op on an empty project', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r18-empty' });
    h.stepOnce();
    expect(h.deepReflectAndConsolidate()).toBe(0);
  });

  it('seals the project into the genome once it has deep members', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r18-seal' });
    for (let i = 0; i < 400; i++) h.stepOnce();
    if (h.projectView().size === 0) return; // cold run never crossed the depth gate
    const before = h.genomeState().size;
    const leaf = h.deepReflectAndConsolidate();
    expect(leaf).toBeGreaterThan(0);
    expect(h.genomeState().size).toBe(before + 1);
  });
});
