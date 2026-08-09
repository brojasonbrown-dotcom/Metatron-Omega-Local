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
const base2=2*ROW_SIZE;
// read via the fields view AND via a fresh view on fieldSAB
await pe.computeTick();
const viaFields = pe._flat.fields[base2];
const fresh = new Float64Array(pe._flat.fieldSAB);
const viaFresh = fresh[base2];
console.log("via pe._flat.fields:", viaFields.toFixed(5));
console.log("via fresh view on fieldSAB:", viaFresh.toFixed(5));
console.log("fields.buffer===fieldSAB:", pe._flat.fields.buffer===pe._flat.fieldSAB);
await pe.shutdown();
