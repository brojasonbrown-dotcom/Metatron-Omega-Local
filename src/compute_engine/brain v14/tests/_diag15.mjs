import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
const D=7, pool=12;
const root=build(D); strip(root);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:pool});
await pe.initialize(root);
const logs=[];
for(const w of pe._workers){ w.on("message",(m)=>{ if(m?.type==="dbg") logs.push(m); }); }
const base2=2*ROW_SIZE;
await pe.computeTick();
console.log("after tick0: SAB node2[0]=",pe._flat.fields[base2].toFixed(5));
for(const m of logs) console.log(`  idx=${m.index} d=${m.depth} prev0=${m.prev0===null?'null':m.prev0.toFixed(5)} out0=${m.out0.toFixed(5)} readBack0=${m.readBack0.toFixed(5)}`);
await pe.shutdown();
