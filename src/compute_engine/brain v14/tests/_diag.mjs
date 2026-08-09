import { FractalNodeEngine } from "../fractal_node_engine.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE, OFF_COHERENCE, OFF_ENERGY } from "../parallel/layout.ts";

const DEPTH=7;
function mk(){const e=new FractalNodeEngine({target_scale:292,hardware_adaptive:false,max_depth:DEPTH,target_resource_usage:0.9,governor_warmup_ticks:999});e.initialize();return e;}
function serialBottomUp(n){for(const c of n.children)serialBottomUp(c);n.compute();}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}

const engS=mk(); const rootS=engS.get_state().root_node; const nodesS=idx(rootS);
const engP=mk(); const rootP=engP.get_state().root_node; const nodesP=idx(rootP);
const pe=new ParallelEngine({targetScale:292,maxDepth:DEPTH,poolSize:12});
await pe.initialize(rootP);

for(let i=0;i<6;i++){ serialBottomUp(rootS); await pe.computeTick(); }

// compare serial node field vs SAB row field
let maxF=0, wi=-1;
for(let i=0;i<nodesS.length;i++){
  const sf=nodesS[i].state.field_state;
  const base=i*ROW_SIZE;
  for(let k=0;k<FIELD_SIZE;k++){
    const d=Math.abs(sf[k]-pe._flat.fields[base+k]);
    if(d>maxF){maxF=d;wi=i;}
  }
}
console.log("SAB-field vs serial compute  maxDiff=",maxF,"at node",wi);

// Now test commitToNodes: commit then compare live node fields
pe.commitToNodes();
let maxC=0, wc=-1, maxCoh=0, maxEn=0;
for(let i=0;i<nodesS.length;i++){
  const sf=nodesS[i].state.field_state, cf=nodesP[i].state.field_state;
  for(let k=0;k<Math.min(sf.length,cf.length);k++){
    const d=Math.abs(sf[k]-cf[k]); if(d>maxC){maxC=d;wc=i;}
  }
  maxCoh=Math.max(maxCoh,Math.abs(nodesS[i].state.coherence-nodesP[i].state.coherence));
  maxEn=Math.max(maxEn,Math.abs(nodesS[i].state.energy_density-nodesP[i].state.energy_density));
}
console.log("after commitToNodes: field maxDiff=",maxC,"at",wc," coherence maxDiff=",maxCoh," energy maxDiff=",maxEn);
await pe.shutdown();
