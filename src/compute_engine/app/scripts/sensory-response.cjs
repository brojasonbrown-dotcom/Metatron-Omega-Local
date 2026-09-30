// Sensory-coupling calibration: does real input bend the field AT ALL?
// The rigorous test is digest divergence — run two identical hosts from the same
// seed, one with sensory input and one without, and find the first tick their
// digests differ (i.e. the first tick the sensory injection measurably moved the
// field). Never diverging (−1) means the input is below the field's float grain.
const O = require('../electron/omega-bundle.cjs');
const PHI = (1 + Math.sqrt(5)) / 2;
const phi = (n) => Math.pow(PHI, n);

const PATTERN = Array.from({ length: 89 }, (_, i) => (i % 5 === 0 ? 1 : 0));

function divergenceTick(drive, reflect) {
  const a = new O.EngineHost({ profile: 'NANO', seed: 'div', drive, reflect });
  const b = new O.EngineHost({ profile: 'NANO', seed: 'div', drive, reflect });
  b.declareChannel('sig', 'scalar', 89, 1);
  for (let t = 0; t < 4000; t++) {
    a.stepOnce();
    b.pushChannel('sig', PATTERN);
    b.stepOnce();
    if (a.snapshot().digest !== b.snapshot().digest) return t;
  }
  return -1;
}

console.log('drive            reflect        first divergence tick (input bends the flow)');
for (const drive of [phi(-1), phi(-2), phi(-3), phi(-4), phi(-5)]) {
  for (const reflect of [0, phi(-3)]) {
    const t = divergenceTick(drive, reflect);
    console.log(`${drive.toExponential(2).padStart(10)}   ${reflect.toExponential(2).padStart(10)}   ${t === -1 ? 'NEVER (−1)' : t}`);
  }
}
