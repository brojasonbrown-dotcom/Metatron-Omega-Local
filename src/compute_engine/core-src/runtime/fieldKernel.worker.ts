const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;
const KAPPA = 1 / (PHI * Math.PI);
const KAPPA_REFLECT = 1 / (PHI * PHI * Math.PI);

type InitMessage = {
  id: number;
  type: 'init';
  kStart: number;
  kEnd: number;
  carrierHz: number;
};

type ComputeMessage = {
  id: number;
  type: 'compute';
  tSeconds: number;
  qScalar: number;
  reflectEnabled: boolean;
  computePressure: number;
};

type KernelMessage = InitMessage | ComputeMessage;

const workerSelf = self as unknown as {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<KernelMessage>) => void) | null;
};

let kStart = 0;
let kEnd = -1;
let carrierHz = 144;
let prev = new Float64Array(0);

function amplitudeAt(k: number): number {
  return Math.pow(PHI, -Math.abs(k));
}

function initShard(message: InitMessage) {
  kStart = message.kStart;
  kEnd = message.kEnd;
  carrierHz = message.carrierHz;
  prev = new Float64Array(Math.max(0, kEnd - kStart + 1));
  workerSelf.postMessage({ id: message.id, type: 'ready', nodes: prev.length });
}

function computeShard(message: ComputeMessage) {
  const started = performance.now();
  const n = prev.length;
  const amplitudes = new Float64Array(n);
  const reflectK = message.reflectEnabled ? KAPPA_REFLECT * message.qScalar : 0;
  const passes = Math.max(1, Math.floor(message.computePressure));
  let term1 = 0;
  let term2 = 0;
  let term3 = 0;
  let term4 = 0;
  let energy = 0;
  let coherenceNum = 0;
  let coherenceDen = 0;

  for (let pass = 0; pass < passes; pass++) {
    const phase = message.tSeconds + pass * PHI_INV * 0.000001;
    for (let i = 0; i < n; i++) {
      const k = kStart + i;
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
    }
  }

  workerSelf.postMessage(
    {
      id: message.id,
      type: 'result',
      nodes: n,
      term1,
      term2,
      term3,
      term4,
      energy,
      coherenceNum,
      coherenceDen,
      elapsedMs: performance.now() - started,
      amplitudes: amplitudes.buffer,
    },
    [amplitudes.buffer],
  );
}

workerSelf.onmessage = (event: MessageEvent<KernelMessage>) => {
  if (event.data.type === 'init') initShard(event.data);
  else computeShard(event.data);
};

export {};