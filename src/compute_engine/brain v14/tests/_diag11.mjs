import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}

const D=7;
const rootS=build(D),rootP=build(D);
strip(rootS);strip(rootP);
const nodesS=idx(rootS);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
await pe.initialize(rootP);
// seed row for node 2
const base2=2*ROW_SIZE;
console.log("SAB node2 seed[0] before any tick:", pe._flat.fields[base2].toFixed(5));
for(let t=0;t<3;t++){
  sb(rootS);
  await pe.computeTick();
  console.log(`tick ${t}: serial node2[0]=${nodesS[2].state.field_state[0].toFixed(5)}  SAB node2[0]=${pe._flat.fields[base2].toFixed(5)}  SAB node2[1]=${pe._flat.fields[base2+1].toFixed(5)}`);
}
await pe.shutdown();
