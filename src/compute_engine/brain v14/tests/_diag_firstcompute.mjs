import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(par){const e=new FractalNodeEngine({target_scale:292,hardware_adaptive:false,max_depth:7,target_resource_usage:0.9,governor_warmup_ticks:999,parallel:par,parallel_force_serial:!par});e.initialize();return e;}
function idx(r){const o=[r];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
function snap(e){return idx(e.get_state().root_node).map(n=>({f:Array.from(n.state.field_state),c:n.state.coherence,e:n.state.energy_density,pf:n._previousField?Array.from(n._previousField):null}));}
const s=mk(false),p=mk(true);
await s.tick();await p.tick(); // settle at depth 7
for(const eng of [s,p]){eng._root_node.destroy_children();eng._buildTree(eng._root_node,6);eng._treeDepth=6;eng.hardware_governor.setMeasuredDepth(6);eng._emaTickMs=0;if(eng._parallel)await eng._parallel.reseed(eng._root_node,6);}
// BEFORE any post-transition tick: compare freshly-built node state (should be identical initial conditions)
const a=snap(s), b=snap(p);
let dPre=0,wPre=""; for(let i=0;i<a.length;i++){for(let k=0;k<28;k++){const dd=Math.abs(a[i].f[k]-b[i].f[k]);if(dd>dPre){dPre=dd;wPre=`n${i}f${k}`;}} if((a[i].pf===null)!==(b[i].pf===null)){wPre=`n${i} prevMismatch`;dPre=1;}}
console.log("PRE-tick (fresh trees) maxDiff:", dPre.toExponential(3), wPre);
await s.tick();await p.tick();
const c=snap(s),d=snap(p); let dPost=0,wPost=""; for(let i=0;i<c.length;i++){for(let k=0;k<28;k++){const dd=Math.abs(c[i].f[k]-d[i].f[k]);if(dd>dPost){dPost=dd;wPost=`n${i}f${k}`;}}}
console.log("POST-tick maxDiff:", dPost.toExponential(3), wPost);
// node0 specifically: what is field[19] pre vs post
console.log("node0 field[19] serial post:", c[0].f[19].toExponential(10), "parallel post:", d[0].f[19].toExponential(10));
await p._parallel?.shutdown?.();
