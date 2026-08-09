import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}

const D=1;
const rootS=build(D), rootP=build(D);
strip(rootS); strip(rootP);
const nodesS=idx(rootS);
console.log("serial tree: root children =", rootS.children.length, " root scale=",rootS.scale, " child scale=", rootS.children[0]?.scale);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
await pe.initialize(rootP);
console.log("parallel flat levels:", pe._flat.levels.map((l,d)=>`d${d}:${l?l.length:0}`).join(" "));

// ONE tick
for(const c of rootS.children) c.compute(); rootS.compute();
await pe.computeTick();

// leaf (node 1)
for (const i of [1,0]) {
  const sf=nodesS[i].state.field_state; const base=i*ROW_SIZE;
  let md=0; for(let k=0;k<FIELD_SIZE;k++){md=Math.max(md,Math.abs(sf[k]-pe._flat.fields[base+k]));}
  console.log(`node ${i} (depth ${nodesS[i].get_depth()}): field maxDiff=${md}`);
  console.log(`   serial field[0..3]=${Array.from(sf.slice(0,4)).map(x=>x.toFixed(4))}`);
  console.log(`   sab    field[0..3]=${Array.from(pe._flat.fields.slice(base,base+4)).map(x=>x.toFixed(4))}`);
}
await pe.shutdown();
