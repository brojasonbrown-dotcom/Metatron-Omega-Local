/**
 * P1 — Quarantine the dog/cat poisoned legacy.
 *
 * Root cause (journal t=1785240418285): the mind's first boot triggered
 * `nameThis` on a description carrying ONLY abstract scores
 * (signal/coherence/persistence/relation). A 3B model asked to name a
 * perception from bare numbers invented "dog"/"cat". That hallucination
 * self-reinforced into 5 concepts + a glossary entry.
 *
 * P1's gate (debiased_naming.test.ts) makes the class structurally impossible
 * going forward. This script quarantines the EXISTING poison: it renames the
 * poisoned state files aside (AUDITABLE — never deleted) and records the
 * archaeology in testresults.md. After quarantine the mind boots clean.
 *
 * Run:  node scripts/quarantine_poisoned_state.mjs
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const brainDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = path.join(brainDir, "mind_state");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const archiveDir = path.join(stateDir, `quarantine-dogcat-${stamp}`);

// Labels that mark the hallucination (the dog/cat cluster invented from scores).
const POISON_LABELS = new Set(["dog", "cat", "puppy", "kitten", "canine", "feline"]);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function conceptIsPoisoned(labels) {
  if (!Array.isArray(labels) || labels.length === 0) return false;
  const lower = labels.map((l) => String(l).toLowerCase());
  // A concept is poisoned when its PRIMARY identity is the hallucinated cluster.
  return lower.some((l) => POISON_LABELS.has(l));
}

const results = { quarantinedConcepts: [], quarantinedGlossary: [], archivedFiles: [], keptConcepts: 0 };

// ── 1. mind_state.json — strip poisoned concepts (kept in archive) ────────────
const stateFile = path.join(stateDir, "mind_state.json");
const state = readJson(stateFile);
if (state && Array.isArray(state.concepts)) {
  const kept = [];
  for (const c of state.concepts) {
    if (conceptIsPoisoned(c.labels)) {
      results.quarantinedConcepts.push({ id: c.id, labels: c.labels });
    } else {
      kept.push(c);
    }
  }
  results.keptConcepts = kept.length;
  state.concepts = kept;
  // Back up the original, then write the cleaned state.
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.copyFileSync(stateFile, path.join(archiveDir, "mind_state.json"));
  results.archivedFiles.push("mind_state.json");
  fs.writeFileSync(stateFile, JSON.stringify(state));
}

// ── 2. glossary.json — strip poisoned meanings ────────────────────────────────
const glossaryFile = path.join(stateDir, "glossary.json");
const glossary = readJson(glossaryFile);
if (glossary && Array.isArray(glossary.entries)) {
  const keptEntries = [];
  for (const e of glossary.entries) {
    const related = Array.isArray(e.related) ? e.related.map((r) => String(r).toLowerCase()) : [];
    if (related.some((r) => POISON_LABELS.has(r))) {
      results.quarantinedGlossary.push({ conceptId: e.conceptId, related: e.related });
    } else {
      keptEntries.push(e);
    }
  }
  glossary.entries = keptEntries;
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.copyFileSync(glossaryFile, path.join(archiveDir, "glossary.json"));
  results.archivedFiles.push("glossary.json");
  fs.writeFileSync(glossaryFile, JSON.stringify(glossary));
}

// ── 3. journal.jsonl — copy aside (the audit trail is PRESERVED, not cleaned) ─
const journalFile = path.join(stateDir, "journal.jsonl");
if (fs.existsSync(journalFile)) {
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.copyFileSync(journalFile, path.join(archiveDir, "journal.jsonl"));
  results.archivedFiles.push("journal.jsonl (audit trail preserved verbatim)");
}

// ── 4. archaeology report ─────────────────────────────────────────────────────
const report = [
  `# P1 dog/cat quarantine — ${new Date().toISOString()}`,
  "",
  `Archive: \`${path.relative(brainDir, archiveDir)}\` (originals preserved, auditable — nothing deleted).`,
  "",
  `## Root cause`,
  `journal t=1785240418285: first-boot \`nameThis\` received only abstract scores`,
  `(signal/coherence/persistence/relation). phi invented ["dog","cat"] (conf 0.9)`,
  `in 587 ms. The hallucination self-reinforced into the concepts + glossary below.`,
  "",
  `## Quarantined concepts (${results.quarantinedConcepts.length})`,
  ...results.quarantinedConcepts.map((c) => `- ${c.id}: ${JSON.stringify(c.labels)}`),
  "",
  `## Quarantined glossary entries (${results.quarantinedGlossary.length})`,
  ...results.quarantinedGlossary.map((g) => `- ${g.conceptId}: ${JSON.stringify(g.related)}`),
  "",
  `## State after quarantine`,
  `- concepts kept: ${results.keptConcepts}`,
  `- archived files: ${results.archivedFiles.join(", ")}`,
  `- going forward: P1 gate (tests/debiased_naming.test.ts) suppresses naming`,
  `  from non-perceptual sources, so this class cannot recur.`,
  "",
].join("\n");

fs.mkdirSync(archiveDir, { recursive: true });
fs.writeFileSync(path.join(archiveDir, "ARCHAEOLOGY.md"), report);

console.log(report);
console.log(`\n[quarantine] DONE — poison archived to ${archiveDir}`);
