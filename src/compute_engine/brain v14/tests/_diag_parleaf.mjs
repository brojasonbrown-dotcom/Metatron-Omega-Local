import { FractalNodeEngine } from "../fractal_node_engine.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
function makeEngine(depth){const e=new FractalNodeEngine({target_scale:292,hardware_adaptive:false,max_depth:depth,target_resource_usage:0.9,governor_warmup_ticks:999});e.initialize();return e;}
function serialBottomUp(n){for(const c of n.children)serialBottomUp(c);n.compute();}
function indexTree(r){const o=[r];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const DEPTH=7;
const engS=makeEngine(DEPTH),rS=engS.get_state().root_node,nS=indexTree(rS);
const engP=makeEngine(DEPTH),rP=engP.get_state().root_node,nP=indexTree(rP);
const pe=new ParallelEngine({targetScale:292,maxDepth:DEPTH,poolSize:12});
await pe.initialize(rP);
serialBottomUp(rS); await pe.computeTick();
// LEAF-ONLY max diff
let leafMax=0, leafWorst=-1, intMax=0, intWorst=-1;
for(let i=0;i<nS.length;i++){
  const sf=nS[i].state.field_state, base=i*28; let d=0;
  for(let k=0;k<28;k++) d=Math.max(d,Math.abs(sf[k]-pe._flat.fields[base+k]));
  if(nS[i].children.length===0){ if(d>leafMax){leafMax=d;leafWorst=i;} }
  else { if(d>intMax){intMax=d;intWorst=i;} }
}
console.log(`LEAF maxDiff=${leafMax.toExponential(3)} at node ${leafWorst}`);
console.log(`INTERNAL maxDiff=${intMax.toExponential(3)} at node ${intWorst} (children=${nS[intWorst].children.length})`);
// inspect the worst internal node's children: serial child field vs SAB child row
const w=nS[intWorst];
console.log(`worst internal node ${intWorst}: serial field[0]=${w.state.field_state[0].toExponential(6)}, SAB field[0]=${pe._flat.fields[intWorst*28].toExponential(6)}`);
for(let c=0;c<w.children.length;c++){
  const childIdx = nS.indexOf(w.children[c]);
  console.log(`  child ${c} (idx ${childIdx}): serial[0]=${w.children[c].state.field_state[0].toExponential(6)} SAB[0]=${pe._flat.fields[childIdx*28].toExponential(6)} diff=${Math.abs(w.children[c].state.field_state[0]-pe._flat.fields[childIdx*28+0]).toExponential(3)}`);
}
await pe.shutdown();
