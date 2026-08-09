import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(par){const e=new FractalNodeEngine({target_scale:292,hardware_adaptive:false,max_depth:7,target_resource_usage:0.9,governor_warmup_ticks:999,parallel:par,parallel_force_serial:!par});e.initialize();return e;}
function idx(r){const o=[r];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const s=mk(false),p=mk(true);
await s.tick();await p.tick();
for(const eng of [s,p]){eng._root_node.destroy_children();eng._buildTree(eng._root_node,6);eng._treeDepth=6;eng.hardware_governor.setMeasuredDepth(6);eng._emaTickMs=0;if(eng._parallel)await eng._parallel.reseed(eng._root_node,6);}
await s.tick();await p.tick();
// Which nodes differ, and do they have framework/memory computes?
const sn=idx(s.get_state().root_node), pn=idx(p.get_state().root_node);
let diffs=[];
for(let i=0;i<sn.length;i++){let d=0,wk=-1;for(let k=0;k<28;k++){const dd=Math.abs(sn[i].state.field_state[k]-pn[i].state.field_state[k]);if(dd>d){d=dd;wk=k;}}if(d>0)diffs.push({i,d,wk,nfw:sn[i]._frameworkComputes.length,nmem:sn[i]._memoryComputes.length,child:sn[i].children.length,depth:sn[i].get_depth()});}
console.log("nodes with nonzero diff:", diffs.length);
for(const x of diffs.slice(0,10)) console.log(`  node ${x.i} depth=${x.depth} children=${x.child} fw=${x.nfw} mem=${x.nmem} diff=${x.d.toExponential(2)} field[${x.wk}]`);
await p._parallel?.shutdown?.();
