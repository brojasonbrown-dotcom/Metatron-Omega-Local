import { FractalNodeEngine } from "../fractal_node_engine.ts";
import { ROW_SIZE } from "../parallel/layout.ts";
function mk(par){const e=new FractalNodeEngine({target_scale:292,hardware_adaptive:false,max_depth:d7, target_resource_usage:0.9,governor_warmup_ticks:999,parallel:par,parallel_force_serial:!par});e.initialize();return e;}
const d7=7;
function idx(r){const o=[r];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const s=mk(false),p=mk(true);
await s.tick();await p.tick();
for(const eng of [s,p]){eng._root_node.destroy_children();eng._buildTree(eng._root_node,6);eng._treeDepth=6;eng.hardware_governor.setMeasuredDepth(6);eng._emaTickMs=0;if(eng._parallel)await eng._parallel.reseed(eng._root_node,6);}
// BEFORE post-transition tick: compare each node's live field_state vs its SAB seed row (parallel side)
const pn=idx(p.get_state().root_node);
const fields=p._parallel._flat.fields;
let maxSeed=0,wSeed=-1;
for(let i=0;i<pn.length;i++){const sf=pn[i].state.field_state; for(let k=0;k<28;k++){const dd=Math.abs(sf[k]-fields[i*ROW_SIZE+k]); if(dd>maxSeed){maxSeed=dd;wSeed=i;}}}
console.log("SAB-seed vs live-node (parallel, pre-tick): maxDiff", maxSeed.toExponential(3), "at node", wSeed);
// ALSO: serial live vs parallel live (should be 0 from last diag)
let mn=0; for(let i=0;i<pn.length;i++){const sf=pn[i].state.field_state, ss=idx(s.get_state().root_node)[i].state.field_state; for(let k=0;k<28;k++) mn=Math.max(mn,Math.abs(sf[k]-ss[k]));}
console.log("serial-live vs parallel-live (pre-tick):", mn.toExponential(3));
await p._parallel?.shutdown?.();
