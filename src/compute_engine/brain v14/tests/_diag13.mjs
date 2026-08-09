import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { flattenTree } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}

// Simulate BOTH the main flattenTree order AND the worker's buildAndOwnTree order
function mainOrder(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const D=7;
const r1=build(D); strip(r1);
const o1=mainOrder(r1);
// Record scale sequence + child counts per index for main
const sig1 = o1.map(n=>`${n.get_depth()}:${n.scale}:${n.children.length}`);
// worker rebuild (identical code path)
const r2=build(D); strip(r2);
const o2=mainOrder(r2);
const sig2 = o2.map(n=>`${n.get_depth()}:${n.scale}:${n.children.length}`);
let firstDiff=-1;
for(let i=0;i<Math.max(sig1.length,sig2.length);i++){ if(sig1[i]!==sig2[i]){firstDiff=i;break;} }
console.log("nodeCount main",sig1.length,"worker",sig2.length,"firstDiff idx",firstDiff);
if(firstDiff>=0){console.log("main:",sig1[firstDiff],"worker:",sig2[firstDiff]);}
// also print first 8 signatures to eyeball
console.log("main first8:",sig1.slice(0,8).join(" "));
console.log("work first8:",sig2.slice(0,8).join(" "));
