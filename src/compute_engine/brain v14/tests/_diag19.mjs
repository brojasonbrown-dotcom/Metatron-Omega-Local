import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { CTRL } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
const D=7, pool=12;
const root=build(D); strip(root);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:pool});
await pe.initialize(root);
// Track PENDING going negative = stale ack race
let minPending=Infinity;
const ctrl=pe._flat.ctrl;
const obs=setInterval(()=>{ const p=Atomics.load(ctrl,CTRL.PENDING); if(p<minPending)minPending=p; },0);
await pe.computeTick();
clearInterval(obs);
console.log("min PENDING observed during tick:", minPending, "(negative => stale/double ack race confirmed)");
await pe.shutdown();
