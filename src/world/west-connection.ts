import * as THREE from 'three';

/** School west end / central plaza study, not a surveyed circulation model.
 * D1 (27901siryou.pdf) pp.3–5 locates the central plaza and exterior
 * stairs; p.9 gives school 2F=+4. The user corrected the earlier false
 * lateral attachment: the direct street entry must face west along the
 * Learning Street axis. Number/outline/planting are still provisional.
 * GIS has only building outlines: horizontal bounds below are approximate.
 * Coordinates: Three[x=east,y=up,z=-north], local y=0 is NOT measured GL.
 */
export const westConnectionStudy = new THREE.Group();
westConnectionStudy.name = 'West school / arena ground-to-2F circulation | plan and photo study';

const concrete = new THREE.MeshStandardMaterial({ color: 0xaeb4ae, roughness: .93, side: THREE.DoubleSide });
const tread = new THREE.MeshStandardMaterial({ color: 0x878e8c, roughness: .96, side: THREE.DoubleSide });
const paving = new THREE.MeshStandardMaterial({ color: 0x394447, roughness: .96, side: THREE.DoubleSide });
const nosing = new THREE.MeshStandardMaterial({ color: 0xa7aaa5, metalness: .12, roughness: .82 });
const riserShade = new THREE.MeshStandardMaterial({ color: 0x6e7776, roughness: .96 });
const rail = new THREE.MeshStandardMaterial({ color: 0x3d4848, metalness: .4, roughness: .44 });

function block(name: string, dimensions: [number, number, number], position: [number, number, number], material: THREE.Material) {
  const result = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
  result.name = name; result.position.set(...position); westConnectionStudy.add(result);
  return result;
}
/** A vertical prism in the school's E/N coordinate plane; the treads are
 * structural solids, not floating textures. Height is from the shared y=0.
 */
function solid(name: string, footprint: [number, number][], top: number, material: THREE.Material) {
  const coordinates: number[] = [];
  const add = (a: [number, number], b: [number, number], c: [number, number], ya: number, yb: number, yc: number) =>
    coordinates.push(a[0],ya,-a[1], b[0],yb,-b[1], c[0],yc,-c[1]);
  for (let i=1;i<footprint.length-1;i++) add(footprint[0],footprint[i],footprint[i+1],top,top,top);
  for (let i=0;i<footprint.length;i++) {
    const a=footprint[i], b=footprint[(i+1)%footprint.length];
    add(a,b,b,0,0,top); add(a,b,a,0,top,top);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
  geometry.computeVertexNormals();
  const result = new THREE.Mesh(geometry,material);result.name=name;westConnectionStudy.add(result);
  return result;
}
/** Shallow tread and riser. The former full-height prisms formed an
 * obviously false four-metre-high serrated wall along the stair side. */
function shallowTread(name:string, footprint:[number,number][], top:number, material:THREE.Material) {
  const coordinates:number[]=[];
  const tri=(p:[number,number],q:[number,number],r:[number,number],py:number,qy:number,ry:number)=>
    coordinates.push(p[0],py,-p[1],q[0],qy,-q[1],r[0],ry,-r[1]);
  const bottom=Math.max(0,top-.21);
  for(let k=1;k<footprint.length-1;k++)tri(footprint[0],footprint[k],footprint[k+1],top,top,top);
  for(let k=0;k<footprint.length;k++){
    const p=footprint[k],q=footprint[(k+1)%footprint.length];
    tri(p,q,q,bottom,bottom,top);tri(p,q,p,bottom,top,top);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));geometry.computeVertexNormals();
  const treadMesh=new THREE.Mesh(geometry,material);treadMesh.name=name;westConnectionStudy.add(treadMesh);
}
function member(name: string, a: [number, number, number], b: [number, number, number], thickness: number, material = rail) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const v = end.clone().sub(start), result = new THREE.Mesh(new THREE.BoxGeometry(thickness,thickness,v.length()),material);
  result.position.copy(start).add(end).multiplyScalar(.5);
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v.normalize());
  result.name=name;westConnectionStudy.add(result);
}
function handrail(name: string, start: [number,number,number], end: [number,number,number], posts: number) {
  const [ax,ay,az]=start,[bx,by,bz]=end;
  member(`${name} / continuous top`,[ax,ay+.95,az],[bx,by+.95,bz],.055);
  for (let i=0;i<=posts;i++) {
    const t=i/posts, x=ax+(bx-ax)*t, y=ay+(by-ay)*t, z=az+(bz-az)*t;
    member(`${name} / post`,[x,y,z],[x,y+.95,z],.045);
  }
}

// The two arena-side stair marks on the small-scale 2015 plans cannot be
// used to infer that either enters the school from its SIDE. Previous model
// attached both lateral flights to the north/south sides of the upper deck:
// that contradicted the user-observed west-facing learning-street entry.
// Withdraw those unverified side attachments. The DIRECT connection runs
// west -> east, on the same axis as the Learning Street.
block('Central plaza ground | D1 pp.3–4 confirms place, perimeter inferred',
  [48,.085,54],[-17,.06,-37],paving);
const deckHeight=4.0; // D1 p.9: 2015 school 2F relative to 1F, NOT surveyed GL.
const stairCount=24; // visual study only; the stair schedule is not published.
const west=-29,east=-8;
const edges=(t:number)=>({
  x:west+(east-west)*t,
  south:32.5+1.5*t,
  north:51.5-1.5*t
});
// The elevated school deck begins at x≈5.65m. Short frontal landing joins
// it on the central axis without any side-entry (north/south) stair touching.
solid('West 2F landing / learning street continuous connector | frontal west-to-east entry, footprint estimated',
  [[east,34],[5.9,34],[5.9,50],[east,50]],deckHeight,concrete);
block('Frontal upper landing dark surfacing | study', [13.8,.04,15.85],[-1.05,4.03,-42],paving);
// Fine neutral edge and shadow reveal at each MODELED tread. These are
// material/lighting cues, not yellow safety tape or measured nosing products.
const edgesLight=new THREE.InstancedMesh(new THREE.BoxGeometry(.085,.017,1),nosing,stairCount);
const shadowReveals=new THREE.InstancedMesh(new THREE.BoxGeometry(.026,.045,1),riserShade,stairCount);
edgesLight.name='Axial front-step edge highlights | illustrative finish, not measured';
shadowReveals.name='Axial front-step riser shadow reveals | illustrative finish, not measured';
const detail=new THREE.Object3D();
for(let k=0;k<stairCount;k++){
  const lo=edges(k/stairCount),hi=edges((k+1)/stairCount);
  const midNorth=(lo.south+lo.north)/2;
  const width=lo.north-lo.south-.24;
  const y=(k+1)*deckHeight/stairCount;
  detail.position.set(lo.x+.075,y+.012,-midNorth);detail.scale.set(1,1,width);
  detail.updateMatrix();edgesLight.setMatrixAt(k,detail.matrix);
  detail.position.set(lo.x+.012,y-.075,-midNorth);detail.scale.set(1,1,width);
  detail.updateMatrix();shadowReveals.setMatrixAt(k,detail.matrix);
}
edgesLight.instanceMatrix.needsUpdate=true;
shadowReveals.instanceMatrix.needsUpdate=true;
westConnectionStudy.add(edgesLight,shadowReveals);
// The city photograph showing red bands and planted islands depicts a different
// exterior stair whose relation to this direct axial entry is unverified.
// Do NOT transfer those distinctive features to this stair by association.
for(let k=0;k<stairCount;k++){
  const low=edges(k/stairCount),high=edges((k+1)/stairCount);
  const y=(k+1)*deckHeight/stairCount;
  shallowTread('West front stair | Learning Street axial entry; tread dimensions estimated',
    [[low.x,low.south],[high.x,high.south],[high.x,high.north],[low.x,low.north]],y,tread);
}
for(const edge of ['south','north'] as const){
  for(let part=0;part<3;part++){
    const t0=part/3,t1=(part+1)/3,a=edges(t0),b=edges(t1);
    handrail(`West front stair | ${edge} continuous side rail, study`,
      [a.x,deckHeight*t0,-a[edge]],[b.x,deckHeight*t1,-b[edge]],7);
  }
  const foot=edges(0),head=edges(1);
  member(`West front stair | ${edge} shallow supporting stringer`,
    [foot.x,.02,-foot[edge]],[head.x,deckHeight-.12,-head[edge]],.31,concrete);
  handrail(`2F frontal terrace | ${edge} edge rail, study`,
    [east,deckHeight,-head[edge]],[5.55,deckHeight,-head[edge]],7);
}
