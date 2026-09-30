/**
 * r22 — Merkle-DAG relation store battery.
 *
 * Pins the content-addressable, hash-chained relation structure: deterministic
 * (same structure → same root), tamper-evident (any edge change alters the
 * root), hash-chaining (a leaf change cascades to its parent's digest), and
 * cycle-convergent (the fixpoint is deterministic).
 */

import { describe, expect, it } from 'vitest';
import { RelationGraph } from '../src/cognition/relations';
import { relationDag } from '../src/cognition/relationDag';

describe('R22 · Merkle-DAG relation store', () => {
  it('is deterministic — the same structure yields the same root', () => {
    const a = new RelationGraph();
    a.relate('the', 'temporal', 'golden');
    a.relate('golden', 'temporal', 'brain');
    const b = new RelationGraph();
    b.relate('the', 'temporal', 'golden');
    b.relate('golden', 'temporal', 'brain');
    expect(relationDag(a).root).toBe(relationDag(b).root);
  });

  it('is tamper-evident — any edge change alters the root', () => {
    const a = new RelationGraph();
    a.relate('the', 'temporal', 'golden');
    const b = new RelationGraph();
    b.relate('the', 'temporal', 'silver');
    expect(relationDag(a).root).not.toBe(relationDag(b).root);
  });

  it('hash-chains — a leaf change cascades to its parent digest and root', () => {
    const a = new RelationGraph();
    a.relate('the', 'temporal', 'golden');
    a.relate('golden', 'temporal', 'brain');
    const b = new RelationGraph();
    b.relate('the', 'temporal', 'golden');
    b.relate('golden', 'temporal', 'mind'); // leaf changed

    const da = relationDag(a);
    const db = relationDag(b);
    const theA = da.nodes.find((n) => n.term === 'the')!.digest;
    const theB = db.nodes.find((n) => n.term === 'the')!.digest;
    expect(theA).not.toBe(theB); // 'the'→'golden' is identical flat, but golden's digest changed
    expect(da.root).not.toBe(db.root);
  });

  it('converges deterministically on cyclic graphs', () => {
    const g = new RelationGraph();
    g.relate('a', 'temporal', 'b');
    g.relate('b', 'temporal', 'a'); // cycle
    const dag = relationDag(g);
    expect(dag.nodes.length).toBe(2);
    expect(relationDag(g).root).toBe(dag.root);
  });
});
