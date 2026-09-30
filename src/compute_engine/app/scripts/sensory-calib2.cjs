// Sensory-coupling calibration: measure the injection the field actually feels.
// sensePeak = peak per-rung injection (≤ φ), senseGain = loop gain (≤ φ⁻²),
// energy = total field energy, perceptNovelty = did the perceptual mind register
// the input, surprise = did the cognitive fold see something new.
const O = require('../electron/omega-bundle.cjs');
const PHI = (1 + Math.sqrt(5)) / 2;
const phi = (n) => Math.pow(PHI, n);

const PATTERN = Array.from({ length: 89 }, (_, i) => (i % 5 === 0 ? 1 : 0));

function run(drive, withInput) {
  const h = new O.EngineHost({ profile: 'NANO', seed: 'calib2', drive, reflect: phi(-3) });
  if (withInput) h.declareChannel('sig', 'scalar', 89, 1);
  let noveltySum = 0, surpriseSum = 0, ignitions = 0, wasIgn = false;
  const N = 2000;
  for (let t = 0; t < N; t++) {
    if (withInput) h.pushChannel('sig', PATTERN);
    h.stepOnce();
    const s = h.snapshot();
    if (t > 500) { noveltySum += s.perceptNovelty; surpriseSum += s.surprise; }
    if (s.qualiaIgnited && !wasIgn) ignitions++;
    wasIgn = s.qualiaIgnited;
  }
  const s = h.snapshot();
  return {
    energy: s.energy, sensePeak: s.sensePeak, senseGain: s.senseGain,
    senseChannels: s.senseChannels, perceptNovelty: noveltySum / (N - 501),
    surprise: surpriseSum / (N - 501), ignitions, perceptConcepts: s.perceptConcepts,
    qualiaCphi: s.qualiaCphi,
  };
}

console.log('drive    input?   energy        sensePeak     senseGain    perceptNovelty  surprise      ignitions');
for (const drive of [phi(-1), phi(-2), phi(-3)]) {
  for (const w of [false, true]) {
    const r = run(drive, w);
    console.log(
      `${drive.toExponential(2).padStart(7)}  ${w ? 'yes ' : 'no  '}  ` +
      `${r.energy.toExponential(2).padStart(10)}  ${r.sensePeak.toExponential(2).padStart(10)}  ` +
      `${r.senseGain.toExponential(2).padStart(10)}  ${r.perceptNovelty.toExponential(2).padStart(13)}  ` +
      `${r.surprise.toExponential(2).padStart(12)}  ${r.ignitions}`
    );
  }
}
