import type { FieldShardResult, FieldShardSpec } from './WorkerPool';

const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;
const KAPPA = 1 / (PHI * Math.PI);
const KAPPA_REFLECT = 1 / (PHI * PHI * Math.PI);

function amplitudeAt(k: number): number {
  return Math.pow(PHI, -Math.abs(k));
}

export function computeShardOnMainThread(
  spec: FieldShardSpec,
  carrierHz: number,
  tSeconds: number,
  qScalar: number,
  reflectEnabled: boolean,
  computePressure: number,
  previous?: Float64Array,
): FieldShardResult & { readonly nextPrev: Float64Array } {
  const started = performance.now();
  const nodes = Math.max(0, spec.kEnd - spec.kStart + 1);
  const prev = previous && previous.length === nodes ? previous : new Float64Array(nodes);
  const nextPrev = new Float64Array(nodes);
  const amplitudes = new Float64Array(nodes);
  const reflectK = reflectEnabled ? KAPPA_REFLECT * qScalar : 0;
  const passes = Math.max(1, Math.floor(computePressure));
  let term1 = 0, term2 = 0, term3 = 0, term4 = 0, energy = 0, coherenceNum = 0, coherenceDen = 0;

  for (let pass = 0; pass < passes; pass++) {
    const phase = tSeconds + pass * PHI_INV * 0.000001;
    for (let i = 0; i < nodes; i++) {
      const k = spec.kStart + i;
      const amp = amplitudeAt(k);
      const omega = 2 * Math.PI * carrierHz * Math.pow(PHI, k);
      const psiL = amp * Math.cos(omega * phase);
      const psiM = PHI_INV * PHI_INV * prev[i];
      const psiC = KAPPA * (amplitudeAt(k + 1) - amp);
      const psiR = reflectK * psiL;
      const psi = psiL + psiM + psiC + psiR;
      if (pass === passes - 1) {
        amplitudes[i] = psi;
        coherenceNum += psi * prev[i];
        coherenceDen += prev[i] * prev[i];
        term1 += Math.abs(psiL);
        term2 += Math.abs(psiM);
        term3 += Math.abs(psiC);
        term4 += Math.abs(psiR);
        energy += psi * psi;
      }
      prev[i] = psi;
      nextPrev[i] = psi;
    }
  }

  return { nodes, amplitudes, term1, term2, term3, term4, energy, coherenceNum, coherenceDen, elapsedMs: performance.now() - started, nextPrev };
}