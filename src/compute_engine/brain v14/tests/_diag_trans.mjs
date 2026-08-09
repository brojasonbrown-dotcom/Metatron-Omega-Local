import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(par){const e=new FractalNodeEngine({target_scale:292,hardware_adaptive:false,max_depth:7,target_resource_usage:0.9,governor_warmup_ticks:999,parallel:par,parallel_force_serial:!par});e.initialize();return e;}
function idx(r){const o=[r];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
function snap(e){return idx(e.get_state().root_node).map(n=>({f:n.state.field_state,c:n.state.coherence,e:n.state.energy_density}));}
function diff(a,b){let d=0,w="";for(let i=0;i<a.length;i++){for(let k=0;k<28;k++){const dd=Math.abs(a[i].f[k]-b[i].f[k]);if(dd>d){d=dd;w=`n${i}f${k}`;}}const dc=Math.abs(a[i].c-b[i].c);if(dc>d){d=dc;w=`n${i}coh`;}}return{d,w};}
const s=mk(false),p=mk(true);
// tick a few at depth 7 (no transition)
for(let i=0;i<2;i++){await s.tick();await p.tick();}
console.log("after 2 ticks @ depth7:", JSON.stringify(diff(snap(s),snap(p))));
// ONE transition to depth 6, then tick
for(const eng of [s,p]){eng._root_node.destroy_children();eng._buildTree(eng._root_node,6);eng._treeDepth=6;eng.hardware_governor.setMeasuredDepth(6);eng._emaTickMs=0;if(eng._parallel)await eng._parallel.reseed(eng._root_node,6);}
await s.tick();await p.tick();
console.log("after transition 7->6 + 1 tick:", JSON.stringify(diff(snap(s),snap(p))));
// another tick at fixed depth 6 (does it converge back?)
await s.tick();await p.tick();
console.log("after another tick @ depth6:", JSON.stringify(diff(snap(s),snap(p))));
await p._parallel?.shutdown?.();
