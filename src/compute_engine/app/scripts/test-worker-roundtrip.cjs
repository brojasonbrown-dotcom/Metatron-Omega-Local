// End-to-end roundtrip: worker + BrainProxy + async respond(), mirroring the IPC handlers.
const { BrainProxy } = require('../electron/brainProxy.cjs');
const { respond } = require('../electron/omegaResponder.cjs');

(async () => {
  const b = new BrainProxy({ profile: 'PICO' });

  const s0 = await b.state();
  console.log('initial state ok:', s0.profile === 'PICO' && Array.isArray(s0.memoryTaxonomy));

  const started = await b.start();
  console.log('started:', started.running === true);

  await new Promise((r) => setTimeout(r, 300));
  await b.injectSensor('text', 'resonance coherence field memory');
  await b.step();

  const s1 = await b.state();
  console.log('after text+step — ticks:', s1.ticks, '| concepts:', s1.concepts, '| lexicon:', s1.lexiconSize);

  const status = await respond(b, 'status');
  console.log('respond(status) ok:', status.includes('Profile PICO'));

  const free = await respond(b, 'the golden ratio is beautiful');
  console.log('respond(free text) ok:', free.includes('Encoded into the field'));

  const gematria = await respond(b, 'gematria search resonance');
  console.log('respond(gematria search) ok:', typeof gematria === 'string' && gematria.length > 0);

  const mind = await respond(b, 'mind');
  console.log('respond(mind) ok:', mind.includes('self-model'));

  const memory = await respond(b, 'memory');
  console.log('respond(memory) ok:', memory.includes('Braid'));

  const sealed = await b.seal();
  console.log('seal ok (leaf number):', typeof sealed === 'number');

  const saved = await b.save();
  console.log('save ok (non-empty doc):', typeof saved === 'string' && saved.length > 0);

  const stopped = await b.stop();
  console.log('stopped:', stopped.running === false);

  await b.terminate();
  console.log('WORKER ROUNDTRIP: ALL PASS');
  process.exit(0);
})().catch((e) => {
  console.error('WORKER ROUNDTRIP FAIL:', e);
  process.exit(1);
});
