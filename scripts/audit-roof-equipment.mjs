import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import * as THREE from 'three';
import site from '../plateau_53395597.json' with {type:'json'};
mkdirSync('.scratch',{recursive:true});
await build({entryPoints:['src/world/roof-equipment.ts'],outfile:'.scratch/roof-audit.mjs',bundle:true,platform:'node',format:'esm',external:['three'],logLevel:'silent'});
const {roofEquipmentStudy}=await import('../.scratch/roof-audit.mjs');
const bodies=roofEquipmentStudy.children.find(o=>o.name.includes('equipment housing'));
assert.ok(bodies?.isInstancedMesh,'machine cases are instanced');
assert.equal(roofEquipmentStudy.userData.zones,3);
assert.equal(roofEquipmentStudy.userData.asBuiltCount,null,'machine count is NOT as-built data');
assert.ok(bodies.count>12,'all three rooftop yards populated in study');
const membrane=site.features.find(f=>f.id.includes('44f5071e')).ring;
const wings=['4cf7907f','2d60618f'].map(id=>site.features.find(f=>f.id.includes(id)).ring);
const inside=(x,n,ring)=>{
 let hit=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>n)!==(b[1]>n) && x<(b[0]-a[0])*(n-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }
 return hit;
};
const instanceMatrix=new THREE.Matrix4(),position=new THREE.Vector3();
const perWing=[0,0];
for(let i=0;i<bodies.count;i++){
 bodies.getMatrixAt(i,instanceMatrix);position.setFromMatrixPosition(instanceMatrix);
 const n=-position.z;
 const wing=wings.findIndex(ring=>inside(position.x,n,ring));
 assert.ok(wing>=0,`roof equipment ${i} must stay inside a school-wing GIS roof`);
 perWing[wing]++;
 assert.equal(inside(position.x,n,membrane),false,`equipment ${i} must never stand on the membrane`);
 assert.ok(Math.abs(position.y-18.98)<.001,'roof study unit base near p.9 RF datum');
}
assert.ok(perWing.every(count=>count>0));
console.log(JSON.stringify({source:'2015 D1 p.7 R floor outdoor-equipment areas',asBuiltMachines:null,illustrativeMachines:bodies.count,withinSchoolRoof:perWing,outsideMembrane:true,status:'placement containment ONLY; count/type/finished state unverified'},null,2));
