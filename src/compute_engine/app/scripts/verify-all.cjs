const O = require('../electron/omega-bundle.cjs');

const h = new O.EngineHost({ profile: 'MICRO', seed: 'live-all' });
h.start();
// Step far enough for MIND_STRIDE folds (depth extensions); the self-audit is now on-demand.
for (let i = 0; i < 3000; i++) h.stepOnce();
h.selfAudit();
const s = h.snapshot();

console.log('=== Ω-DEPTH channels (functional, non-zero params) ===');
const d = s.depthExtensions;
console.log('clifford magnitude   :', d.cliffordMagnitude.toExponential(3), '(rotor applied at blade gain φ⁻¹)');
console.log('fractal occupied     :', d.fractalOccupied, 'child slots (restrict/prolong at μ=φ⁻¹)');
console.log('fractal contribution :', d.fractalContribution.toExponential(3), '(energy prolonged back)');
console.log('plasticity norm      :', d.plasticityNorm.toFixed(4), '(Oja ‖w‖ → 1)');
console.log('plasticity drift     :', d.plasticityDrift.toExponential(3), '(Σ|Δw| at η=φ⁻²)');

console.log('=== live self-audit (certification harness) ===');
const a = s.selfAudit;
if (a) {
  console.log('golden pass          :', a.goldenPass);
  console.log('abstention rate      :', a.abstentionRate?.toFixed(4), '· false-confident =', a.falseConfident, '· pass =', a.abstentionPass);
  console.log('layer-C recall label :', a.recallLabel ?? 'abstained');
  console.log('proof latency p95    :', a.proofP95?.toFixed(2) + 'ms');
  console.log('certify (4 gates)    :', a.certifyPass);
} else {
  console.log('self-audit: not yet run (need more ticks)');
}

console.log('=== brain still healthy ===');
console.log('finite:', s.finite, '| coherence:', s.coherenceWarm.toFixed(4), '| rhufSkill:', (s.rhufSkill * 100).toFixed(1) + '%');
h.stop();
