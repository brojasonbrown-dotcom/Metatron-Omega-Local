import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { CTRL, ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
const D=7, pool=12;
const root=build(D); strip(root);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:pool});
await pe.initialize(root);
const base2=2*ROW_SIZE;
// Monkey-patch _awaitLevel to log PENDING at entry/exit per level
const origAwait = pe._awaitLevel.bind(pe);
let curLevel=-1;
// wrap computeTick loop by observing LEVEL changes
await pe.computeTick();
console.log("after tick0: SAB node2[0]=",pe._flat.fields[base2].toFixed(5)," PENDING=",Atomics.load(pe._flat.ctrl,CTRL.PENDING)," LEVEL=",Atomics.load(pe._flat.ctrl,CTRL.LEVEL));
// Now step manually: drive one level at a time and check
await pe.computeTick();
console.log("after tick1: SAB node2[0]=",pe._flat.fields[base2].toFixed(5));
await pe.shutdown();
