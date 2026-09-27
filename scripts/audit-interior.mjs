import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import * as THREE from 'three';
import site from '../plateau_53395597.json' with {type:'json'};
mkdirSync('.scratch',{recursive:true});
await build({entryPoints:['src/world/interior.ts'],outfile:'.scratch/interior-audit.mjs',bundle:true,platform:'node',format:'esm',external:['three'],logLevel:'silent'});
const {interiorStudy:scene}=await import('../.scratch/interior-audit.mjs');
const mesh=[];scene.traverse(o=>{if(o.isMesh)mesh.push(o)});
const named=s=>mesh.filter(o=>o.name.includes(s));
assert.equal(scene.userData.asBuiltAccuracy,false);
assert.equal(scene.userData.photoAssetsBundled,false);
assert.equal(named('2F Learning Street planted seat / north curb').length,3);
assert.equal(named('2F cafeteria table |').length,8);
assert.equal(named('2F learning commons low bookcase |').length,4);
const desk=named('S 3F sample classroom desk wood top');
assert.equal(desk.length,1);assert.equal(desk[0].count,16);
const outline=id=>site.features.find(f=>f.id.includes(id)).ring;
const inside=(x,n,ring)=>{
 let result=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>n)!==(b[1]>n)&&x<(b[0]-a[0])*(n-a[1])/(b[1]-a[1])+a[0])result=!result;
 }return result;
};
for(const [name,x,n,id] of [
 ['school 2F north commons',20,63,'2d60618f'],
 ['school 2F south cafeteria',20,24,'4cf7907f'],
 ['school S 3F classroom',71.4,23.25,'4cf7907f'],
 ['2F Learning Street planting',52,45.5,'44f5071e']
]) assert.ok(inside(x,n,outline(id)),`${name}: GIS candidate footprint`);
const firstDesk=desk[0],m=new THREE.Matrix4(),pos=new THREE.Vector3();
for(let k=0;k<firstDesk.count;k++){
 firstDesk.getMatrixAt(k,m);pos.setFromMatrixPosition(m);
 assert.ok(pos.x>67.5&&pos.x<75.3&&-pos.z>19.3&&-pos.z<27.2);
 assert.ok(Math.abs(pos.y-8.35)<.001);
}
console.log(JSON.stringify({phase:'3 / selective prototype',streetPlanters:3,cafeteriaTables:8,commonsBookcases:4,sampleClassroomDesks:16,floorLevels:{two:4,three:7.6},status:'plan/photo motif placement only, NOT complete rooms or as-built survey'},null,2));
