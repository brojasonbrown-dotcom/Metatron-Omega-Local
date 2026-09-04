/**
 * evidenceLedger — Ω-REAL P9 extension: the append-only transparency path, live.
 *
 * Until now `ledger/{canonical,merkle,sth}` and `genome/record` were certified
 * but never reached by the tick loop — the host used only `RunLedger` (a digest-
 * mark chain). This module closes that gap: on each LONG heartbeat it seals the
 * analysis service's report as a sealed Genome v2 record and publishes an
 * Ed25519 signed tree head. It runs beside `RunLedger` and only ever reads the
 * already-materialised `AnalysisReport`, so the engine digest is identical with
 * or without it.
 *
 * DESIGN RULES (identical to the rest of the substrate):
 *  • observe-only: never touches the engine — the report is a snapshot;
 *  • deterministic: the master key and signer are derived from the host seed, and
 *    the logical timestamp is the tick, never a wall clock, so two runs over the
 *    same seed produce byte-identical seals;
 *  • canonical-safe: non-finite telemetry (NaN from abstention) is mapped to null
 *    before sealing, because `canonicalJson` refuses non-finite numbers rather
 *    than corrupt them into null behind your back.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { GenomeLedger } from '../genome/record';
import { keyPairFromSeed, type SignedTreeHead } from '../ledger/sth';
import { utf8 } from '../ledger/canonical';
import type { AnalysisReport } from './service';

export interface EvidenceSeal {
  readonly recordId: string;
  readonly leafIndex: number;
  readonly treeSize: number;
  readonly rootHex: string;
  readonly sth: SignedTreeHead;
}

/** Non-finite → null, the one shape `canonicalJson` accepts for "no measurement". */
function finite(v: number | null | undefined): number | null {
  return v !== null && v !== undefined && Number.isFinite(v) ? v : null;
}

/**
 * The sealed body: the FULL analysis report at full resolution, canonical-safe.
 *
 * Resolution is the point: the genome must seal every measured reading — the
 * per-pair Level-1/2/3 stack, the full DMD mode set, and the conformal
 * half-width — not a lossy scalar summary. Abstained readings stay null (never
 * a manufactured 0), so a replayed audit can tell "measured 0.3" from
 * "not measured".
 */
export function summarize(report: AnalysisReport): Record<string, unknown> {
  const x = report.xcorr;
  const d = report.dmd;
  return {
    tick: report.tick,
    kind: report.kind,
    conformalHalfWidth: finite(report.conformalHalfWidth),
    xcorr: x
      ? {
          fusedCoherence: finite(x.fusedCoherence),
          meanPlv: finite(x.meanPlv),
          maxLag: finite(x.maxLag),
          surprise: finite(x.surprise),
          abstained: x.abstained,
          dominant: x.dominant,
          pairs: x.pairs.map((p) => ({
            a: p.a,
            b: p.b,
            msc: finite(p.msc),
            plv: finite(p.plv),
            lag: finite(p.lag),
            dcor: finite(p.dcor),
            hsic: finite(p.hsic),
            mi: finite(p.mi),
            directed: finite(p.directed),
            verdict: p.verdict,
          })),
        }
      : null,
    dmd: d
      ? {
          rank: d.rank,
          spectralRadius: finite(d.spectralRadius),
          relError: finite(d.relError),
          abstained: d.abstained,
          modes: d.modes.map((m) => ({
            lambdaRe: finite(m.lambdaRe),
            lambdaIm: finite(m.lambdaIm),
            magnitude: finite(m.magnitude),
            growth: finite(m.growth),
            frequency: finite(m.frequency),
            energy: finite(m.energy),
          })),
        }
      : null,
  };
}

export class EvidenceLedger {
  private readonly genome: GenomeLedger;
  private sealed = 0;

  constructor(seed: string) {
    const master = sha256(utf8(`${seed}:evidence:master`));
    const signer = keyPairFromSeed(sha256(utf8(`${seed}:evidence:signer`)));
    this.genome = new GenomeLedger(`omega-evidence:${seed}`, master, signer);
  }

  get size(): number {
    return this.genome.size;
  }

  get sealCount(): number {
    return this.sealed;
  }

  rootHex(): string {
    return this.genome.rootHex();
  }

  head(timestamp: number): SignedTreeHead {
    return this.genome.head(timestamp);
  }

  /** Full self-audit: every sealed record must verify against its own log. */
  audit(timestamp: number): { ok: boolean; checked: number; failures: string[] } {
    return this.genome.audit(timestamp);
  }

  /** Seal one long-heartbeat report. Returns null when there is nothing to seal. */
  seal(report: AnalysisReport): EvidenceSeal | null {
    if (!report.xcorr) return null;
    const id = `finding:${report.tick}`;
    const rec = this.genome.append({
      id,
      kind: 'AnalysisFinding',
      body: summarize(report),
      recordedAt: report.tick,
      provenance: {
        attributedTo: 'omega/analysis',
        generatedBy: 'analysis:long-heartbeat',
        evidence: 'measured',
      },
    });
    this.sealed++;
    return {
      recordId: id,
      leafIndex: rec.leafIndex,
      treeSize: this.genome.size,
      rootHex: this.genome.rootHex(),
      sth: this.genome.head(report.tick),
    };
  }
}
