import * as THREE from 'three';
import source from '../../plateau_53395597.json';

/** D1 = 27901siryou.pdf p.7 R階平面図: 北翼に1つ、南翼に2つの
 * 「屋外機置場」が描かれている。下記の機器の外装、個数、向き、
 * 寸法、高さ、配管は同図から読み取れないため、全て展示用の仮表現。
 * GISの校舎平面をはみ出さないよう置き、膜屋根の上には置かない。
 */
export const roofEquipmentStudy = new THREE.Group();
roofEquipmentStudy.name = 'ROOF EQUIPMENT STUDY | D1 p.7 areas / machine form provisional';
const pale = new THREE.MeshStandardMaterial({color:0xc2c9c4,metalness:.38,roughness:.57});
const edge = new THREE.MeshStandardMaterial({color:0x5a696b,metalness:.58,roughness:.43});
const grille = new THREE.MeshStandardMaterial({color:0x273c41,metalness:.42,roughness:.65,side:THREE.DoubleSide});
const foot = new THREE.MeshStandardMaterial({color:0x828b88,metalness:.18,roughness:.85});
const northId='bldg_2d60618f-f5c7-4f74-958b-e4b49cd172e3';
const southId='bldg_4cf7907f-f7c3-4341-9b50-2d6a013032ba';
const byId=new Map(source.features.map(f=>[f.id,f]));
const within=(e:number,n:number,polygon:number[][])=>{
  let inside=false;
  for(let j=0,k=polygon.length-1;j<polygon.length;k=j++){
    const a=polygon[j],b=polygon[k];
    if((a[1]>n)!==(b[1]>n) && e < (b[0]-a[0])*(n-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
};
// Two rows in each of the three indicated outdoor-equipment areas. The
// long-axis count/spacing are PRESENTATION VALUES and not an equipment schedule.
const zones=[
  {id:northId, label:'北翼', range:[12,60], n:(x:number)=>[64.2+.047*(x-12),67+.047*(x-12)]},
  {id:southId, label:'南翼西', range:[12,42], n:(x:number)=>[20.4+.047*(x-12),23+.047*(x-12)]},
  {id:southId, label:'南翼東', range:[63,91], n:(x:number)=>[21.8+.047*(x-63),24.4+.047*(x-63)]}
];
const machines:{x:number,n:number,zone:string}[]=[];
for(const z of zones){
  const ring=byId.get(z.id)?.ring;
  if(!ring)throw new Error(`missing roof wing: ${z.id}`);
  for(let x=z.range[0];x<z.range[1];x+=3.05){
    for(const n of z.n(x)){
      // Test the footprint corners, not just the centre, against GIS outline.
      if([[-.58,-.48],[.58,-.48],[.58,.48],[-.58,.48]]
        .every(([dx,dn])=>within(x+dx,n+dn,ring)))machines.push({x,n,zone:z.label});
    }
  }
}
// A group of repeated small silhouettes: 4 instanced draw calls, not hundreds
// of meshes. The housing / dark side slot / raised feet / circular top are
// deliberately schematic. Neither fan type nor fan position is a claim.
const casings=new THREE.InstancedMesh(new THREE.BoxGeometry(1.12,.92,.86),pale,machines.length);
const feet=new THREE.InstancedMesh(new THREE.BoxGeometry(1.03,.1,.75),foot,machines.length);
const slots=new THREE.InstancedMesh(new THREE.BoxGeometry(.79,.49,.018),grille,machines.length);
const louvers=new THREE.InstancedMesh(new THREE.BoxGeometry(.7,.024,.025),edge,machines.length*4);
louvers.name='Roof p.7 outdoor-equipment side louver fins | presentation detail only';
const tops=new THREE.InstancedMesh(new THREE.TorusGeometry(.285,.035,7,18),edge,machines.length);
for(const [mesh,label] of [[casings,'housing'],[feet,'foot'],[slots,'louver silhouette'],[tops,'top ring']] as const){
  mesh.name=`Roof p.7 outdoor-equipment ${label} | illustrative machinery; quantity and type unverified`;
  mesh.userData.evidence='D1 p.7 labels outdoor-equipment yards; shape and quantities are provisional';
  mesh.castShadow=mesh===casings;mesh.receiveShadow=mesh===feet;
}
const dummy=new THREE.Object3D();
for(let i=0;i<machines.length;i++){
  const {x,n}=machines[i];
  dummy.position.set(x,18.98,-n);dummy.rotation.set(0,0,0);dummy.updateMatrix();casings.setMatrixAt(i,dummy.matrix);
  dummy.position.y=18.46;dummy.updateMatrix();feet.setMatrixAt(i,dummy.matrix);
  dummy.position.set(x,19.02,-n+.44);dummy.updateMatrix();slots.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<4;j++){
    dummy.position.set(x,18.84+j*.12,-n+.462);dummy.updateMatrix();
    louvers.setMatrixAt(i*4+j,dummy.matrix);
  }
  dummy.position.set(x,19.47,-n);dummy.rotation.set(-Math.PI/2,0,0);dummy.updateMatrix();tops.setMatrixAt(i,dummy.matrix);
}
for(const mesh of [casings,feet,slots,louvers,tops])mesh.instanceMatrix.needsUpdate=true;
roofEquipmentStudy.add(feet,casings,slots,louvers,tops);
roofEquipmentStudy.userData={source:'27901siryou.pdf p.7 (2015 R階平面図)',zones:3,illustrativeMachines:machines.length,asBuiltCount:null};
