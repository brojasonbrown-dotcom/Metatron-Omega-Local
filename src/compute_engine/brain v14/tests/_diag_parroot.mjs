// Isolate: is the divergence (a) stateful framework/memory drift, or (b) a
// wavefront/child-row timing race? Compare ONE tick, leaf-only vs root.
import { FractalNodeEngine } from "../fractal_node_engine.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";

function makeEngine(depth) {
  const e = new FractalNodeEngine({ target_scale: 292, hardware_adaptive: false, max_depth: depth, target_resource_usage: 0.9, governor_warmup_ticks: 999 });
  e.initialize(); return e;
}
function serialBottomUp(node){ for (const c of node.children) serialBottomUp(c); node.compute(); }
function indexTree(root){ const o=[root]; for(let h=0;h<o.length;h++) for(const c of o[h].children) o.push(c); return o; }

const DEPTH=7;
const engS=makeEngine(DEPTH); const rS=engS.get_state().root_node; const nS=indexTree(rS);
const engP=makeEngine(DEPTH); const rP=engP.get_state().root_node; const nP=indexTree(rP);
const pe=new ParallelEngine({targetScale:292,maxDepth:DEPTH,poolSize:12});
await pe.initialize(rP);

for (let tick=1; tick<=4; tick++){
  serialBottomUp(rS);
  await pe.computeTick();
  // find max diff + WHERE (leaf vs root) and WHICH channel
  let maxD=0, worst=-1, worstK=-1;
  for(let i=0;i<nS.length;i++){
    const sf=nS[i].state.field_state; const base=i*28;
    for(let k=0;k<28;k++){ const d=Math.abs(sf[k]-pe._flat.fields[base+k]); if(d>maxD){maxD=d;worst=i;worstK;} }
  }
  const isLeaf = nS[worst] ? nS[worst].children.length===0 : false;
  console.log(`tick ${tick}: maxDiff=${maxD.toExponential(3)} at node ${worst} (leaf=${isLeaf}, children=${nS[worst]?nS[worst].children.length:'?'})`);
}
await pe.shutdown();
