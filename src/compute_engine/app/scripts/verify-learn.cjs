// Live verification: learning is now ACTIVE end-to-end.
const O = require('../electron/omega-bundle.cjs');

const h = new O.EngineHost({ profile: 'MICRO', seed: 'live-learn' });
h.start();
for (let i = 0; i < 300; i++) h.stepOnce();

const t0 = Date.now();
const run = h.learn({ iterations: 120, warmup: 89, trainTicks: 144, holdTicks: 89 });
const ms = Date.now() - t0;

console.log('=== learn() full-suite result ===');
console.log('verdict        :', run.report.verdict);
console.log('held-out margin:', run.report.margin.toFixed(4), '(ship if >= φ⁻² =', run.report.required.toFixed(4) + ')');
console.log('applied to live:', run.applied);
console.log('elapsed        :', ms + 'ms');
console.log('--- spectral primitives (measured on trajectory) ---');
console.log('filter rms     :', run.spectral.filterRms.toExponential(3));
console.log('filter gain    :', run.spectral.filterGain.toFixed(4), '(≤ φ⁻¹ = 0.618)');
console.log('mixer gain     :', run.spectral.mixerGain.toFixed(4));
console.log('mixer transfer :', run.spectral.mixerTransfer.toFixed(4));
console.log('attention lag  :', run.spectral.attentionLag);
console.log('attention align:', run.spectral.attentionAlignment.toFixed(4));
console.log('certificates   :', run.certificates.length);

// step further and confirm the brain still runs finite + coherent after learn()
for (let i = 0; i < 500; i++) h.stepOnce();
const s = h.snapshot();
console.log('--- after learning, brain still healthy ---');
console.log('finite         :', s.finite, '| coherence:', s.coherenceWarm.toFixed(4), '| rhufSkill:', (s.rhufSkill * 100).toFixed(1) + '%');

// M2 wave analysis (needs a long heartbeat after the 233-deep ring fills)
for (let i = 0; i < 1200; i++) h.stepOnce();
const a = h.analysis();
console.log('--- M2 wave analysis ---');
console.log('analysis report:', a ? ('wave=' + (a.wave ? `levels=${a.wave.waveletLevels}, imfs=${a.wave.emdImfs}` : 'null')) : 'null');
console.log('evidence seals :', h.evidence() ? h.evidence().sealCount : 0);
h.stop();
