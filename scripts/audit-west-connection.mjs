import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import * as THREE from 'three';

mkdirSync('.scratch',{recursive:true});
await build({entryPoints:['src/world/west-connection.ts'],outfile:'.scratch/west-connection-audit.mjs',bundle:true,platform:'node',format:'esm',external:['three'],logLevel:'silent'});
const {westConnectionStudy:scene}=await import('../.scratch/west-connection-audit.mjs');
scene.updateMatrixWorld(true);
const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o)});
const find=(name)=>meshes.filter(o=>o.name.includes(name));
const bbox=o=>new THREE.Box3().setFromObject(o);
const stairs=find('West front stair | Learning Street axial entry; tread dimensions estimated');
const link=find('West 2F landing / learning street continuous connector |');
const ground=find('Central plaza ground |');
assert.equal(new Set(stairs.map(o=>bbox(o).max.y.toFixed(5))).size,24,'24 modeled step levels');
assert.equal(link.length,1);assert.equal(ground.length,1);
// Regression: two separate north/south side-attached flights were incorrectly
// marked as the main route. The direct stair must approach from the WEST.
assert.equal(find('South central-plaza fan stair |').length,0);
assert.equal(find('North central-plaza stair |').length,0);
const bounds=bbox(link[0]);
assert.ok(Math.abs(bounds.min.x+8)<.001 && bounds.max.x>5.65,'landing joins the school 2F deck head-on');
assert.ok(bounds.min.z<-49.9 && bounds.max.z>-34.1,'landing spans the learning-street axis');
assert.ok(bbox(ground[0]).min.x<-40,'plaza ground reaches the Physical Street');
const ray=new THREE.Raycaster();
const west=-29,east=-8;
const samples=[1,11,22].map(k=>{
  const t=(k+.5)/24,x=west+(east-west)*t;
  ray.set(new THREE.Vector3(x,5,-37),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObjects(stairs,false)[0];
  assert.ok(hit,`front-on walk ray hits tread ${k}`);
  return {x,height:hit.point.y};
});
assert.ok(samples[0].x<samples[1].x && samples[1].x<samples[2].x,'ascent runs west to east');
assert.ok(samples[0].height<samples[1].height && samples[1].height<samples[2].height,'height rises toward school');
const first=bbox(stairs[0]),last=bbox(stairs.at(-1));
assert.ok(Math.abs(first.min.x-west)<.001 && Math.abs(first.min.y)<.001);
assert.ok(Math.abs(last.max.x-east)<.001 && Math.abs(last.max.y-4)<.001);
console.log(JSON.stringify({directApproach:'west → east / head-on to Learning Street',modelStairLevels:24,modelDeckTopM:4,raySamples:samples,sideConnectedFlights:0,status:'model geometry continuity; plan dimensions and as-built GL unverified'},null,2));
