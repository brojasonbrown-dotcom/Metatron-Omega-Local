import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { ROW_SIZE, FIELD_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
const D=7, pool=12;
const root=build(D); strip(root);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:pool});
await pe.initialize(root);
console.log("ROW_SIZE const =", ROW_SIZE, " FIELD_SIZE =", FIELD_SIZE);
console.log("flat.fields.length =", pe._flat.fields.length, " nodeCount =", pe._flat.nodeCount, " expected len =", pe._flat.nodeCount*ROW_SIZE);
// read slot for idx2 both ways
console.log("idx2 slot via 2*ROW_SIZE =", 2*ROW_SIZE, "value:", pe._flat.fields[2*ROW_SIZE].toFixed(5));
// Actually check what flattenTree wrote for node 2: read order[2].state? we can't; check seed consistency across first 3 rows
for(let i=0;i<3;i++) console.log(`row ${i} seed[0]=`, pe._flat.fields[i*ROW_SIZE].toFixed(5));
await pe.shutdown();
