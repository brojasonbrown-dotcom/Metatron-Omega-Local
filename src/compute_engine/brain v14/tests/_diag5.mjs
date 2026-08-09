import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { computeNodeShared } from "../parallel/node_compute.ts";
import { flattenTree, FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";

const m=new ScaleMapper();
const leaf=FractalNode.createAtScale(270,null,m);
leaf._memoryComputes=[]; leaf._frameworkComputes=[];

// 1) serial compute() on the leaf
const before=new Float64Array(leaf.state.field_state);
leaf.compute();
const serialOut=new Float64Array(leaf.state.field_state);

// reset leaf to "before" and run computeNodeShared with same inputs
const leaf2=FractalNode.createAtScale(270,null,m);
leaf2._memoryComputes=[]; leaf2._frameworkComputes=[];
// force identical starting state: leaf2 fresh == leaf fresh (both computed once in ctor)
const ref={
  scale: leaf2.scale,
  _membrane: leaf2._membrane,
  _previousField: leaf2._previousField,
  _frameworkComputes: [],
  _memoryComputes: [],
  currentField: leaf2.state.field_state,
};
const out=computeNodeShared(ref, []);
let md=0; for(let k=0;k<FIELD_SIZE;k++) md=Math.max(md,Math.abs(serialOut[k]-out.field[k]));
console.log("compute() vs computeNodeShared (same fresh leaf): maxDiff=",md);
console.log("  serial[0..3]=",Array.from(serialOut.slice(0,4)).map(x=>x.toFixed(5)));
console.log("  shared [0..3]=",Array.from(out.field.slice(0,4)).map(x=>x.toFixed(5)));

// 2) check flattenTree seed == node field
const ft=flattenTree(leaf2);
let sd=0; for(let k=0;k<FIELD_SIZE;k++) sd=Math.max(sd,Math.abs(ft.fields[k]-leaf2.state.field_state[k]));
console.log("flattenTree seed vs node field: maxDiff=",sd);
