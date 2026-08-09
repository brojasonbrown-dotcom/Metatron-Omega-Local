import { FractalNodeEngine } from "../fractal_node_engine.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
function mk(d){const e=new FractalNodeEngine({target_scale:292,hardware_adaptive:false,max_depth:d,target_resource_usage:0.9,governor_warmup_ticks:999});e.initialize();return e;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
function idx(r){const o=[r];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const D=7;
const eS=mk(D),rS=eS.get_state().root_node,nS=idx(rS);
const eP=mk(D),rP=eP.get_state().root_node;
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
await pe.initialize(rP);
sb(rS); await pe.computeTick();
let max=0, wi=-1, wk=-1;
for(let i=0;i<nS.length;i++){const sf=nS[i].state.field_state,b=i*28;
  for(let k=0;k<28;k++){const d=Math.abs(sf[k]-pe._flat.fields[b+k]); if(d>max){max=d;wi=i;wk=k;}}}
const node=nS[wi];
console.log(`WORST node ${wi} field[${wk}] serial=${node.state.field_state[wk].toExponential(6)} SAB=${pe._flat.fields[wi*28+wk].toExponential(6)} leaf=${node.children.length===0}`);
console.log(`  _previousField[${wk}] serial=${node._previousField?node._previousField[wk].toExponential(6):'null'}`);
// Is the SAB value == the PREVIOUS serial field (one tick stale)?
console.log(`  Is SAB == serial's PREVIOUS? diff=${node._previousField?Math.abs(node._previousField[wk]-pe._flat.fields[wi*28+wk]).toExponential(3):'n/a'}`);
// What's the node BEFORE any compute (the seeded SAB)?
console.log(`  node.state.field_state.length=${node.state.field_state.length}`);
await pe.shutdown();
