// Sandbox: bend the flow of energy and measure the resonance structure that emerges.
// Sweeps drive (vacuum setpoint), reflect (κ_r self-observation gain), modePhase
// (magnetic phase bend), and chords (long-range geometric coupling) — reads the
// LIVE engine's resonance readouts, never fabricates.
const O = require('../electron/omega-bundle.cjs');

const PHI = (1 + Math.sqrt(5)) / 2;
const phi = (n) => Math.pow(PHI, n);
const s = (x) => (typeof x !== 'number' || !Number.isFinite(x) ? '—' : x.toFixed(4));

// Peak signature mode (dominant resonance frequency) from the 13-mode signature.
function peakMode(sig) {
  let best = -1, bv = -Infinity;
  for (let i = 0; i < sig.length; i++) if (sig[i] > bv) { bv = sig[i]; best = i; }
  return best;
}

function run(opts) {
  const h = new O.EngineHost({ profile: 'NANO', seed: 'sandbox', drive: opts.drive ?? 0, ...opts });
  for (let i = 0; i < 1500; i++) h.stepOnce();
  const s0 = h.snapshot();
  const r0 = s0.rungs[0];
  return {
    coherence: s0.coherenceWarm,
    closure: r0 ? r0.closureQuality : NaN,
    energy: s0.energy,
    scaleEntropy: s0.scaleEntropy,
    scaleDrift: s0.scaleDrift,
    lyapunov: s0.lyapunov,
    resonance: s0.resonance,
    resonanceGated: s0.resonanceGated,
    ignitions: s0.qualiaCphi,
    depth: s0.depth,
    fieldSelfModelEnabled: s0.fieldSelfModelEnabled,
  };
}

function fmt(o, label) {
  console.log(
    `${label.padEnd(18)} coh=${s(o.coherence).padStart(9)} closure=${s(o.closure).padStart(9)} ` +
    `entropy=${s(o.scaleEntropy).padStart(9)} drift=${s(o.scaleDrift).padStart(9)} ` +
    `lyap=${s(o.lyapunov).padStart(9)} res=${s(o.resonance).padStart(9)} ` +
    `Cφ=${s(o.ignitions).padStart(9)} depth=${s(o.depth).padStart(9)} fsm=${o.fieldSelfModelEnabled}`
  );
}

console.log('=== SWEEP 1: drive (vacuum setpoint) — the energy flow knob ===');
for (const d of [0, phi(-3), phi(-2), phi(-1), phi(0)]) {
  fmt(run({ drive: d }), `drive=${s(d)}`);
}

console.log('\n=== SWEEP 2: reflect (κ_r self-observation) at drive=φ⁻¹ ===');
for (const r of [0, phi(-4), phi(-3), phi(-2)]) {
  fmt(run({ drive: phi(-1), reflect: r }), `reflect=${s(r)}`);
}

console.log('\n=== SWEEP 3: modePhase (magnetic bend) at drive=φ⁻¹ ===');
for (const mp of [0, phi(-3), phi(-2), phi(-1)]) {
  fmt(run({ drive: phi(-1), modePhase: mp }), `phase=${s(mp)}`);
}

console.log('\n=== SWEEP 4: chords (long-range geometric coupling) at drive=φ⁻¹ ===');
for (const ch of [[], ['fibonacci'], ['fibonacci', 'lucas'], ['fibonacci', 'lucas', 'spiral']]) {
  fmt(run({ drive: phi(-1), chords: ch, chordGain: 0.3 }), `chords=${ch.length ? ch.join('+') : 'none'}`);
}
