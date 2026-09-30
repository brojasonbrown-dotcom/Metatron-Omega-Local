import { describe, expect, it } from 'vitest';
import { SingleTorusEngine } from '../src/engine/SingleTorusEngine';
import { EngineHost } from '../src/runtime/host';
import { LearnableCell } from '../src/learn/cell';

describe('R29 — learning activation (learnable cell + spectral primitives + M2 wave)', () => {
  it('learnable gate 0 is bit-identical to the certified nine-term cell', () => {
    const a = new SingleTorusEngine({ nodes: 89, seed: 'r29' });
    const b = new SingleTorusEngine({ nodes: 89, seed: 'r29', learnable: new LearnableCell({ gate: 0 }) });
    expect(a.run(96).digest).toBe(b.run(96).digest);
  });

  it('learnable gate 1 bends the trajectory while staying finite', () => {
    const a = new SingleTorusEngine({ nodes: 89, seed: 'r29-bend' });
    const b = new SingleTorusEngine({
      nodes: 89,
      seed: 'r29-bend',
      learnable: new LearnableCell({ gate: 1, mixRaw: [1, 0, 0, 0, 0], lambdaRaw: 0.5 }),
    });
    const ra = a.run(128);
    const rb = b.run(128);
    expect(rb.finite).toBe(true);
    expect(rb.digest).not.toBe(ra.digest);
  });

  it('host.learn() runs the full suite and reports spectral + applied', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r29-host' });
    for (let i = 0; i < 150; i++) h.stepOnce();
    const run = h.learn({ iterations: 40, warmup: 55, trainTicks: 89, holdTicks: 55 });
    expect(run.report).toBeTruthy();
    expect(typeof run.applied).toBe('boolean');
    expect(Number.isFinite(run.spectral.filterRms)).toBe(true);
    expect(Number.isFinite(run.spectral.filterGain)).toBe(true);
    expect(Number.isFinite(run.spectral.mixerGain)).toBe(true);
    expect(Number.isFinite(run.spectral.attentionAlignment)).toBe(true);
    expect(run.certificates.length).toBeGreaterThan(0);
  });

  it('analysis service emits the M2 wave field on a long heartbeat', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r29-wave' });
    for (let i = 0; i < 1200; i++) h.stepOnce();
    const a = h.analysis();
    expect(a).not.toBeNull();
    expect(a!.wave).not.toBeNull();
    expect(typeof a!.wave!.waveletAbstained).toBe('boolean');
    expect(typeof a!.wave!.emdAbstained).toBe('boolean');
  });
});
