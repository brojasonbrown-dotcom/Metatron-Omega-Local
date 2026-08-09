import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
const D=7, pool=12;
const root=build(D); strip(root);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:pool});
const seen=[];
// hook workers as they spawn
const origSpawn=pe._spawnWorkers.bind(pe);
pe._spawnWorkers=async function(){ const p=origSpawn(); for(const w of pe._workers){ w.on("message",(m)=>{ if(m?.type==="sentinel") seen.push(m); }); } return p; };
await pe.initialize(root);
await new Promise(r=>setTimeout(r,200));
console.log("orchestrator sentinel slot value:", pe._flat.fields[pe._flat.fields.length-1]);
const ok = seen.filter(m=>m.seen===424242.5).length;
console.log(`workers reporting sentinel 424242.5: ${ok}/${seen.length}`);
if(ok<seen.length) console.log("MISMATCH sample:", seen.slice(0,3).map(m=>m.seen));
await pe.shutdown();
