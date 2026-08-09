import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { flattenTree, partitionTree } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}

const D=7, pool=12;
const root=build(D); strip(root);
const flat=flattenTree(root);
const assignments=partitionTree(flat,pool);
// For each worker, list owned indices per level
for(let w=0;w<pool;w++){
  const byLevel={};
  for(const fn of assignments[w]) (byLevel[fn.depth]??=[]).push(fn.index);
  console.log(`worker ${w}:`, Object.entries(byLevel).map(([d,a])=>`L${d}:${a.length}`).join(" "));
}
// node 2 (idx 2) is at depth 2; which worker owns it?
const node2owner = assignments.findIndex(a=>a.some(fn=>fn.index===2));
console.log("node idx=2 depth=2 owner worker:", node2owner);
// how many nodes at each level total
flat.levels.forEach((lv,d)=>console.log(`level ${d}: ${lv.length} nodes, first idx ${lv[0]?.index}`));
