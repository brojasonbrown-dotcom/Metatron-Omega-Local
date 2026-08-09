import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";

const DEPTH=7;
// monkeypatch to strip memory computes (isolate memory feedback)
const orig = FractalNode.prototype;
function stripMemory(root){ const o=[root]; for(let h=0;h<o.length;h++){for(const c of o[h].children)o.push(c);} for(const n of o){ n._memoryComputes=[]; n._frameworkComputes=[]; } }
function build(){ const m=new ScaleMapper(); const r=FractalNode.createAtScale(292,null,m);
  const b=(n)=>{ if(n.get_depth()>=DEPTH)return; n.create_children(); for(const c of n.children)b(c);}; b(r); return r; }
function serialBottomUp(n){for(const c of n.children)serialBottomUp(c);n.compute();}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}

const rootS=build(); const rootP=build();
stripMemory(rootS); stripMemory(rootP);
const nodesS=idx(rootS);
const pe=new ParallelEngine({targetScale:292,maxDepth:DEPTH,poolSize:12});
await pe.initialize(rootP);
for(let i=0;i<6;i++){ serialBottomUp(rootS); await pe.computeTick(); }
let maxF=0,wi=-1;
for(let i=0;i<nodesS.length;i++){const sf=nodesS[i].state.field_state;const base=i*ROW_SIZE;
  for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(sf[k]-pe._flat.fields[base+k]);if(d>maxF){maxF=d;wi=i;}}}
console.log("NO-memory/framework: SAB vs serial maxDiff=",maxF,"at node",wi,"depth",nodesS[wi]?.get_depth());
await pe.shutdown();
