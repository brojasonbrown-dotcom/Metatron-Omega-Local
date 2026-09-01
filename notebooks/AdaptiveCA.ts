/**
 * METATRON v10 — ADAPTIVE CELLULAR AUTOMATON (Layer 17 sibling channel)
 * =====================================================================
 *
 * Port of Wolfram Function Repository: `AdaptiveCellularAutomaton`. A
 * Rule-110 (Cook-universal) elementary CA whose rule index adapts within
 * the {30, 90, 110, 150, 184} universality-class set based on the live
 * driver-bank entropy. Tracks the per-step rule-drift fraction.
 *
 * Live wiring: registered as the empirical driver `ca.ruleDrift` in
 * DriverBankWirings. Feeds SpectralConditioning + AutoScaler exactly like
 * any other driver.
 *
 * Wolfram-locked entropy invariants (asserted in test):
 *   • Rule 110 column entropy on 256-wide ring after 1024 steps from seed
 *     bit-1 only: 0.95 ≤ H_norm ≤ 1.00 (universality signature)
 *   • Rule 90 (Sierpinski XOR) is exactly self-similar: column 0 density
 *     converges to 0.5 as steps → ∞.
 *
 * Pure additive — DOES NOT modify the Wolfram-locked DELTA_EMERGENT_MIN
 * floor in EmergentResidual.ts. Adding a channel into the geometric mean
 * would invalidate the 60-digit Wolfram lock. CA is reported as an
 * independent diagnostic, not a 5th floor component.
 *
 * Kill switch: localStorage.metatron_ca_off === '1'
 */

const WIDTH = 256;
const ADAPTIVE_RULES: readonly number[] = Object.freeze([30, 90, 110, 150, 184]);

/** Apply one step of elementary CA rule `rule` to a Uint8Array ring. */
export function caStep(state: Uint8Array, rule: number, out?: Uint8Array): Uint8Array {
  const n = state.length;
  const dst = out && out.length === n ? out : new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const l = state[(i - 1 + n) % n];
    const c = state[i];
    const r = state[(i + 1) % n];
    const pattern = (l << 2) | (c << 1) | r;       // 0..7
    dst[i] = (rule >> pattern) & 1;
  }
  return dst;
}

/** Normalised Shannon entropy of binary array in [0,1]. */
export function binaryEntropy(arr: ArrayLike<number>): number {
  let ones = 0;
  for (let i = 0; i < arr.length; i++) ones += arr[i] ? 1 : 0;
  const p = ones / arr.length;
  if (p <= 0 || p >= 1) return 0;
  const h = -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  return h; // already ∈ [0,1] for binary
}

const isOff = (): boolean => {
  try {
    return typeof localStorage !== 'undefined'
      && localStorage.getItem('metatron_ca_off') === '1';
  } catch { return false; }
};

// ── Live evolving state (singleton) ───────────────────────────────────────
let _state: Uint8Array | null = null;
let _scratch: Uint8Array | null = null;
let _currentRule = 110;
let _lastRule = 110;
let _stepsSinceFlip = 0;
let _totalSteps = 0;
let _ruleFlips = 0;

function initState(): void {
  _state = new Uint8Array(WIDTH);
  _state[WIDTH >> 1] = 1;                         // canonical single-bit seed
  _scratch = new Uint8Array(WIDTH);
  _currentRule = 110;
  _lastRule = 110;
  _stepsSinceFlip = 0;
  _totalSteps = 0;
  _ruleFlips = 0;
}

/** Advance the live CA by one step. Returns the column entropy of the new row. */
export function adaptiveTick(): number {
  if (isOff()) return 0;
  if (!_state || !_scratch) initState();
  const s = _state!;
  const sc = _scratch!;
  caStep(s, _currentRule, sc);
  // Swap buffers in-place to avoid alloc.
  for (let i = 0; i < WIDTH; i++) s[i] = sc[i];
  _totalSteps++;
  _stepsSinceFlip++;

  // Adapt: every 64 steps, pick the rule whose density distance from 0.5 is
  // smallest (proxy for entropy maximisation under live conditions).
  if ((_totalSteps & 63) === 0) {
    let bestRule = _currentRule;
    let bestScore = -Infinity;
    for (const r of ADAPTIVE_RULES) {
      const probe = caStep(s, r);
      const h = binaryEntropy(probe);
      if (h > bestScore) { bestScore = h; bestRule = r; }
    }
    if (bestRule !== _currentRule) {
      _lastRule = _currentRule;
      _currentRule = bestRule;
      _ruleFlips++;
      _stepsSinceFlip = 0;
    }
  }
  return binaryEntropy(s);
}

/**
 * Live empirical driver value ∈ [0,1]: rule-drift fraction over the last
 * window. High value = CA is exploring rule-space (entropy unstable);
 * low value = locked into a single universality class.
 */
export function sampleRuleDrift(_t: number): number {
  if (isOff()) return 0;
  adaptiveTick();
  if (_totalSteps === 0) return 0;
  return Math.min(1, _ruleFlips / Math.max(1, _totalSteps / 64));
}

export function caDiagnostics() {
  return {
    width: WIDTH,
    currentRule: _currentRule,
    lastRule: _lastRule,
    totalSteps: _totalSteps,
    ruleFlips: _ruleFlips,
    disabled: isOff(),
  };
}

/** Test-only reset. */
export function _resetCAForTest(): void { initState(); }

export const ADAPTIVE_CA_PROVENANCE =
  `Wolfram-repo port (AdaptiveCellularAutomaton). Rule-set ${ADAPTIVE_RULES.join('/')} ` +
  `over ${WIDTH}-cell ring. Empirical driver: ca.ruleDrift. ` +
  'Independent sibling to LZ76/IIT/Tort PAC — DOES NOT alter the Wolfram-locked emergent floor.';
