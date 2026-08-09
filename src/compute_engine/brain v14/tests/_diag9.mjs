// Reproduce the WORKER's exact Term-3 input: currentField = SAB row, mutated in place.
// vs serial: currentField = private _state.field_state.
// If a worker reads the SAB row AFTER it wrote the new field (same tick, next level? no—same node once)
// the real question: does computeNodeShared Term3 read the row BEFORE or AFTER row.set?
import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { computeNodeShared } from "../parallel/node_compute.ts";
import { FIELD_SIZE } from "../parallel/layout.ts";

const m=new ScaleMapper();
function mkleaf(){const l=FractalNode.createAtScale(270,null,m);l._memoryComputes=[];l._frameworkComputes=[];return l;}

// Simulate the SAB-row aliasing: currentField is a VIEW that row.set mutates.
const leaf=mkleaf();
let prevField=leaf._previousField;
// SAB row holds the committed field (Float64Array we mutate in place)
let sabRow=new Float64Array(leaf.state.field_state);

for(let t=1;t<=3;t++){
  const ref={scale:leaf.scale,_membrane:leaf._membrane,_previousField:prevField,_frameworkComputes:[],_memoryComputes:[],currentField:sabRow};
  const out=computeNodeShared(ref,[]);
  prevField=new Float64Array(sabRow);   // worker: prevField = copy of row (OLD)
  sabRow.set(out.field);                // worker: row = new field
  // twin serial
}
// twin: serial compute() with PRIVATE field_state
const leafT=mkleaf();
for(let t=1;t<=3;t++) leafT.compute();

let md=0; for(let k=0;k<FIELD_SIZE;k++) md=Math.max(md,Math.abs(sabRow[k]-leafT.state.field_state[k]));
console.log("worker-emul (SAB-row currentField) vs serial compute(): maxDiff=",md);
console.log("If 0 → Term-3 SAB aliasing is NOT the bug. If >0 → it IS.");
