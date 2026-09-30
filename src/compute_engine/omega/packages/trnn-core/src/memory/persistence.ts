/**
 * persistence — the cross-session save/load orchestrator.
 *
 * Combines the semantic memory (lexicon + relation graph) and the archive /
 * provenance tier (genome ledger) into one canonical JSON document, and rebuilds
 * them. File / browser I/O is the caller's job — this module is pure, so the
 * same document round-trips through disk, localStorage, or a network message.
 */

import { canonicalJson } from '../ledger/canonical';
import { Lexicon, type LexiconState } from '../cognition/lexicon';
import { RelationGraph, type RelationGraphState } from '../cognition/relations';
import { GenomeLedger, type GenomeState } from '../genome/record';
import { ProjectContext, type ProjectState } from '../cognition/project';
import type { LogKeyPair } from '../ledger/sth';

export interface BrainMemoryState {
  /** Schema version (backward-compatible: missing → v1). */
  readonly version?: number;
  readonly lexicon: LexiconState;
  readonly relations: RelationGraphState;
  readonly genome: GenomeState;
  /** Present only when a project context was serialised (backward-compatible). */
  readonly project?: ProjectState;
}

export const PERSIST_VERSION = 2 as const;

export interface RestoreKeys {
  readonly master: Uint8Array;
  readonly signer: LogKeyPair;
}

/** One canonical document for the durable memory (deterministic byte-for-byte). */
export function serializeBrain(
  lexicon: Lexicon,
  relations: RelationGraph,
  genome: GenomeLedger,
  project?: ProjectContext,
): string {
  const doc: Record<string, unknown> = {
    version: PERSIST_VERSION,
    lexicon: lexicon.serialize(),
    relations: relations.serialize(),
    genome: genome.serialize(),
  };
  if (project) doc.project = project.serialize();
  return canonicalJson(doc);
}

/** Rebuild the durable memory from a saved document. */
export function restoreBrain(
  doc: string,
  keys: RestoreKeys,
): { lexicon: Lexicon; relations: RelationGraph; genome: GenomeLedger; project: ProjectContext | null } {
  const s = JSON.parse(doc) as BrainMemoryState;
  return {
    lexicon: Lexicon.restore(s.lexicon),
    relations: RelationGraph.restore(s.relations),
    genome: GenomeLedger.restore(s.genome, keys.master, keys.signer),
    project: s.project ? ProjectContext.restore(s.project) : null,
  };
}
