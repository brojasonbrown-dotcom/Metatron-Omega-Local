/**
 * r25 — the memory taxonomy (self-knowledge): the brain's own map of its
 * memory systems. Pins that the declared taxonomy is well-formed and honest:
 * every store has a unique id, a valid type/layer/retention, layers are
 * non-decreasing (register → audit), and every declared store is live
 * (mirrors scripts/consumer-trace.mjs — no invented memory).
 */

import { describe, expect, it } from 'vitest';
import { memoryTaxonomy, MEMORY_TAXONOMY, type MemoryType, type RetentionPolicy } from '../src/memory/taxonomy';

const TYPES: readonly MemoryType[] = [
  'register', 'working', 'associative', 'episodic', 'semantic', 'procedural', 'archival', 'audit',
];
const RETENTIONS: readonly RetentionPolicy[] = ['volatile', 'ttl', 'durable', 'immutable'];

describe('R25 · memory taxonomy (self-knowledge)', () => {
  it('declares a unique, well-formed store per memory system', () => {
    expect(MEMORY_TAXONOMY.length).toBeGreaterThanOrEqual(10);
    const ids = new Set<string>();
    for (const t of MEMORY_TAXONOMY) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(TYPES).toContain(t.type);
      expect(RETENTIONS).toContain(t.retention);
      expect(t.layer).toBeGreaterThanOrEqual(0);
      expect(t.layer).toBeLessThanOrEqual(6);
      expect(t.technique.length).toBeGreaterThan(0);
      expect(t.addressing.length).toBeGreaterThan(0);
      expect(t.live).toBe(true);
    }
  });

  it('orders layers non-decreasing (register → audit) and covers every tier', () => {
    for (let i = 1; i < MEMORY_TAXONOMY.length; i++) {
      expect(MEMORY_TAXONOMY[i].layer).toBeGreaterThanOrEqual(MEMORY_TAXONOMY[i - 1].layer);
    }
    // the deepest (audit) tier is present and immutable
    const audit = MEMORY_TAXONOMY.filter((t) => t.type === 'audit');
    expect(audit.length).toBeGreaterThanOrEqual(1);
    expect(audit.some((t) => t.retention === 'immutable')).toBe(true);
  });

  it('memoryTaxonomy() returns the same array (stable readout)', () => {
    expect(memoryTaxonomy()).toBe(MEMORY_TAXONOMY);
  });
});
