/**
 * METATRON V11 — RESOURCE GOVERNOR
 * =================================
 * Sovereign, browser-local. Holds the user's RAM/CPU/precision/carrier
 * choices and HARD-refuses anything that would violate Planck, host RAM,
 * or precision-floor invariants. State persists in localStorage.
 *
 * No telemetry. No network. The engine reads from this and from
 * HardwareEnvelope; nothing else.
 */

import { CARRIER_CEILING_HZ, type HardwareEnvelope } from './HardwareEnvelope';

export type PrecisionMode = 'auto' | 'f64' | 'dec50' | 'dec500' | 'mpfr';
export type CarrierMode = 'fixed' | 'auto-max';

export interface GovernorSettings {
  ramBytes: number;        // R_max
  ramCeilingBytes: number; // user-declared host RAM ceiling when browser underreports
  cpuThreads: number;      // C_max
  computePressure: number; // deterministic field-relaxation passes per tick
  coupling: boolean;       // ρ* lock
  rhoBytesPerCore: number; // ρ* (default 4 GB/core)
  precision: PrecisionMode;
  carrier: CarrierMode;
  carrierHz: number;       // active carrier when carrier='fixed'
  spiralEnabled: boolean;
  reflectEnabled: boolean;
}

export interface RefusalReason {
  code: 'planck' | 'ram' | 'precision' | 'alias';
  message: string;
}

const STORAGE_KEY = 'metatron-v11.governor.v1';

const DEFAULTS: GovernorSettings = {
  ramBytes: 4 * 1024 * 1024 * 1024,
  ramCeilingBytes: 4 * 1024 * 1024 * 1024,
  cpuThreads: 4,
  computePressure: 256,
  coupling: true,
  rhoBytesPerCore: 4 * 1024 * 1024 * 1024,
  precision: 'auto',
  carrier: 'fixed',
  carrierHz: 144,
  spiralEnabled: true,
  reflectEnabled: true,
};

/**
 * Required working digits to keep φ⁻ᴹ above ULP plus 16-digit safety:
 *   digits ≥ ⌈M · log10(φ)⌉ + 16 = ⌈0.20898 · M⌉ + 16
 */
export function requiredDigits(M: number): number {
  return Math.ceil(0.2089876402499087 * Math.max(0, M)) + 16;
}

/** Smallest precision class that satisfies requiredDigits(M). */
export function pickPrecision(M: number, mode: PrecisionMode): { kind: 'f64' | 'bd'; digits: number } {
  if (mode === 'f64') return { kind: 'f64', digits: 16 };
  const need = requiredDigits(M);
  if (mode === 'auto') {
    return need <= 16 ? { kind: 'f64', digits: 16 } : { kind: 'bd', digits: need };
  }
  if (mode === 'dec50') return { kind: 'bd', digits: Math.max(50, need) };
  if (mode === 'dec500') return { kind: 'bd', digits: Math.max(500, need) };
  // mpfr — unbounded; here we just use BigDecimal at need digits
  return { kind: 'bd', digits: need };
}

export class ResourceGovernor {
  private state: GovernorSettings;
  private subs = new Set<(s: GovernorSettings) => void>();

  constructor(private readonly hw: HardwareEnvelope) {
    this.state = this.load(hw);
  }

  private load(hw: HardwareEnvelope): GovernorSettings {
    let stored: Partial<GovernorSettings> = {};
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) stored = JSON.parse(raw) as Partial<GovernorSettings>;
      } catch { /* corrupt — ignore */ }
    }
    const ramCeilingBytes = Math.max(hw.ramBytes, stored.ramCeilingBytes ?? stored.ramBytes ?? hw.ramBytes);
    const loaded: GovernorSettings = {
      ...DEFAULTS,
      ramCeilingBytes,
      ramBytes: Math.min(ramCeilingBytes, stored.ramBytes ?? hw.ramBytes / 2),
      cpuThreads: Math.min(hw.cpuCores, stored.cpuThreads ?? Math.max(1, Math.floor(hw.cpuCores / 2))),
      ...stored,
    };
    return {
      ...loaded,
      ramCeilingBytes: Math.max(hw.ramBytes, loaded.ramCeilingBytes),
      ramBytes: Math.min(Math.max(hw.ramBytes, loaded.ramCeilingBytes), loaded.ramBytes),
      computePressure: Math.max(1, loaded.computePressure),
    };
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* quota */ }
  }

  get settings(): GovernorSettings { return this.state; }

  update(patch: Partial<GovernorSettings>): GovernorSettings {
    const next: GovernorSettings = { ...this.state, ...patch };
    next.ramCeilingBytes = Math.max(this.hw.ramBytes, Math.min(2 * 1024 ** 4, next.ramCeilingBytes));
    if (next.coupling) {
      // Snap RAM/CPU to ρ* if either side moved.
      if (patch.cpuThreads !== undefined) next.ramBytes = Math.min(next.ramCeilingBytes, next.cpuThreads * next.rhoBytesPerCore);
      else if (patch.ramBytes !== undefined) next.cpuThreads = Math.max(1, Math.min(this.hw.cpuCores, Math.round(next.ramBytes / next.rhoBytesPerCore)));
    }
    next.ramBytes = Math.max(64 * 1024 * 1024, Math.min(next.ramCeilingBytes, next.ramBytes));
    next.cpuThreads = Math.max(1, Math.min(this.hw.cpuCores, next.cpuThreads));
    next.computePressure = Math.max(1, Math.min(8192, Math.floor(next.computePressure)));
    if (next.carrierHz > CARRIER_CEILING_HZ) next.carrierHz = CARRIER_CEILING_HZ;
    if (next.carrierHz < 1) next.carrierHz = 1;
    this.state = next;
    this.persist();
    for (const cb of this.subs) cb(next);
    return next;
  }

  subscribe(cb: (s: GovernorSettings) => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }

  /** Estimated banded-Gram RAM at given M (3 dense bands × 8 bytes). */
  estimateRamBytes(M: number, precisionDigits: number): number {
    const band = Math.max(1, Math.floor(Math.log(Math.max(2, M)) / Math.log(1.6180339887)));
    const bytesPerScalar = precisionDigits <= 16 ? 8 : Math.ceil(precisionDigits / 2);
    return 3 * M * band * bytesPerScalar;
  }

  /**
   * Honest M ceiling for current settings — min of:
   *   - precision-bound: how far φ⁻ᴹ stays above ULP at chosen digits
   *   - RAM-bound:       largest M whose banded-Gram fits in ramBytes
   *   - hard floor:      1
   * Returns Infinity if mode='mpfr' and ramBytes are unrealistic — never used,
   * caller still clamps via validateTarget().
   */
  computeMaxM(): number {
    const mode = this.state.precision;
    // Probe digits at a large M to see what 'auto' would request — we invert the relation.
    // requiredDigits(M) = ceil(0.20898·M) + 16  ⇒  M_struct(d) = floor((d − 16) / 0.20898)
    let structuralDigits: number;
    if (mode === 'f64') structuralDigits = 16;
    else if (mode === 'dec50') structuralDigits = Math.max(50, 16);
    else if (mode === 'dec500') structuralDigits = 500;
    else if (mode === 'mpfr') structuralDigits = 10000;
    else structuralDigits = Number.POSITIVE_INFINITY; // 'auto' — grows as needed
    const M_struct = mode === 'auto'
      ? 1_000_000  // arbitrary very-large; RAM will bite first
      : Math.max(1, Math.floor((structuralDigits - 16) / 0.2089876402499087));

    // RAM bound: binary-search the largest M whose estimateRamBytes fits.
    let lo = 1, hi = M_struct;
    while (lo < hi) {
      const mid = Math.min(hi, lo + Math.ceil((hi - lo + 1) / 2));
      const p = pickPrecision(mid, mode);
      const need = this.estimateRamBytes(mid, p.digits);
      if (need <= this.state.ramBytes) lo = mid; else hi = mid - 1;
    }
    return Math.max(1, lo);
  }

  /** Refuse if any invariant would be violated; null = OK. */
  validateTarget(M: number): RefusalReason | null {
    if (M < 1) return { code: 'alias', message: 'M must be ≥ 1' };
    const p = pickPrecision(M, this.state.precision);
    const need = requiredDigits(M);
    if (p.kind === 'f64' && need > 16) return { code: 'precision', message: `M=${M} needs ${need} digits; f64 has 16. Use precision=auto.` };
    const ramNeed = this.estimateRamBytes(M, p.digits);
    if (ramNeed > this.state.ramBytes) return { code: 'ram', message: `M=${M} @ ${p.digits}d needs ${(ramNeed / 1e9).toFixed(2)} GB; budget ${(this.state.ramBytes / 1e9).toFixed(2)} GB.` };
    if (this.state.carrierHz > CARRIER_CEILING_HZ) return { code: 'planck', message: 'carrier exceeds Planck ceiling' };
    return null;
  }
}
