import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}

// depth 1, strip frameworks/memory. Leaf = node 1. Force parallel via poolSize=1 AND nodeCount>=threshold trick:
// We can't force isParallel below threshold, so instead compare worker-leaf vs a worker-equivalent serial:
// emulate EXACTLY what the worker does on the live serial tree (computeNodeShared + SAB-style prevField update).
import { computeNodeShared } from "../parallel/node_compute.ts";
import { nodeRow } from "../parallel/layout.ts";

const D=1;
const rootS=build(D); strip(rootS);
const nodesS=idx(rootS);
// serial-equivalent using computeNodeShared with SAB semantics
const leaf=nodesS[1];
let prevField = leaf._previousField;   // Float64Array|null
let curField = new Float64Array(leaf.state.field_state); // committed
// ALSO run the actual engine compute() on a twin leaf
const rootT=build(D); strip(rootT);
const leafT=idx(rootT)[1];

for(let t=1;t<=4;t++){
  // worker-emulation on leaf
  const ref={scale:leaf.scale,_membrane:leaf._membrane,_previousField:prevField,_frameworkComputes:[],_memoryComputes:[],currentField:curField};
  const out=computeNodeShared(ref,[]);
  prevField=new Float64Array(curField);
  curField=new Float64Array(out.field);
  // real compute() on twin
  leafT.compute();
  let md=0; for(let k=0;k<FIELD_SIZE;k++) md=Math.max(md,Math.abs(curField[k]-leafT.state.field_state[k]));
  console.log(`tick ${t}: worker-emul vs compute() leaf maxDiff=${md}`);
}
