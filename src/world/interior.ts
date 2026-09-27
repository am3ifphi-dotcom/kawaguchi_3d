import * as THREE from 'three';

/** Phase 3 selective interior study, NOT an as-built room reconstruction.
 * Sources: D1 pp.5–7 floor USES and p.9 levels; city 2017 completion photos
 * ra-ninngusutori-to1/2.jpg and kyousitu2.jpg (image pixels inspected);
 * school facility/building (classrooms, cafeteria, commons and lockers).
 * Footprints, furniture schedule and finishes are NOT measured; GL is not real.
 * E/N in metres; Three z=-north. Photographs are NOT distributed here.
 */
export const interiorStudy=new THREE.Group();
interiorStudy.name='Phase 3 selective interior | photo/plan-based and illustrative';
const matte=(color:number,roughness=.88,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness,side:THREE.DoubleSide});
const ink=matte(0x273238),white=matte(0xd7d8d1),concrete=matte(0x9fa9a6);
const steel=matte(0x3a4b50,.44,.35),wood=matte(0x9b7555,.83);
const soil=matte(0x384b39),foliage=matte(0x557f60),glass= new THREE.MeshStandardMaterial({color:0x7e9a9d,transparent:true,opacity:.34,roughness:.19,side:THREE.DoubleSide,depthWrite:false});
const accents=[matte(0xae5e4e),matte(0x6c8b5c),matte(0x587a99),matte(0xd8aa55),white];
function block(name:string,size:[number,number,number],xyz:[number,number,number],material:THREE.Material){
 const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.name=name;m.position.set(...xyz);interiorStudy.add(m);return m;
}
// City ra-ninngusutori-to1.jpg: graphite-colored floor with thin white
// rectangles/lanes and isolated colour pieces. Layout and line spacing remain
// illustrative. Details are laid 15mm above the existing WALKABLE 2F deck.
for(const n of [38.8,50.7])block('Learning Street white parallel floor guide | PHOTO motif / position inferred',
 [83,.018,.055],[52,4.022,-n],white);
for(const x of [18,35,52,69,86,96])block('Learning Street white floor transverse line | PHOTO motif / spacing inferred',
 [.055,.019,12.0],[x,4.023,-44.75],white);
for(const [x,n] of [[23,41.1],[30,48.4],[38,40.9],[55,49.1],[67,39.8],[80,50.1],[88,42.5]]){
 block('Learning Street small white paving tick | PHOTO motif / locations estimated',
 [1.2,.019,.07],[x,4.026,-n],white);
}
// Photo-based planter/seat TYPE, not a count or the photo's metric location.
// x=25/52/77 is illustrative and not used as a structural element.
for(const [i,x,n] of [[0,27,45.2],[1,52,45.5],[2,77,44.4]] as const){
 const y=4.12,w=3.7,d=2.55,t=.23;
 block('2F Learning Street planted seat / north curb | photo-confirmed type, unmeasured',
   [w,.46,t],[x,y+.23,-n-d/2+t/2],concrete);
 block('2F Learning Street planted seat / south curb | study',
   [w,.46,t],[x,y+.23,-n+d/2-t/2],concrete);
 for(const shift of [-1,1])block('2F Learning Street planted seat / end curb | study',
   [t,.46,d-2*t],[x+shift*(w/2-t/2),y+.23,-n],concrete);
 block('2F Learning Street planter soil | photo-confirmed trees, unmeasured footprint',
   [w-2*t,.05,d-2*t],[x,y+.24,-n],soil);
 // Seat planks frame the planter; the exact product and species are unknown.
 block('2F Learning Street planter timber-look seat | PHOTO integrated seating, finish inferred',
   [w+.85,.075,.66],[x,y+.51,-n+d/2+.26],wood);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.08,.13,2.4,8),wood);
 trunk.name='2F Learning Street planter tree | PHOTO vegetation, species/height unverified';
 trunk.position.set(x,5.55,-n);interiorStudy.add(trunk);
 const lobes:[[number,number,number],number][]= [ [[0,2.6,0],1.08], [[-.59,2.13,.12],.85], [[.63,2.08,-.14],.82] ];
 for(const [offset,radius] of lobes){
   const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(radius,1),foliage);
   crown.name='2F Learning Street canopy | PHOTO vegetation, stylised form';
   crown.position.set(x+offset[0],5.55+offset[1],-n+offset[2]);interiorStudy.add(crown);
 }
 if(i===0 || i===2)for(let j=0;j<4;j++){
   const cx=x-4+(j%2)*1.15, cn=n-3+Math.floor(j/2)*1.05;
   block('Learning Street colourful movable seating | PHOTO cube motif, position/count inferred',
     [.72,.57,.72],[cx,4.3,-cn],accents[(i+j)%accents.length]);
 }
}
// D1 p.5 puts library/learning commons on the north-west 2F and cafeteria
// on the south-west 2F. Do NOT present these as accessible public routes or
// precise partitions: only representative furniture within the GIS wing roofs.
// North 2F reading tables and book cases are plausible typology, not a library inventory.
for(const [x,n] of [[15,63],[20,63],[26,63],[31,63]]){
 block('2F learning commons low bookcase | D1 p.5 function; geometry unverified',
   [3.1,1.18,.48],[x,4.67,-n],wood);
 for(const h of [4.38,4.75,5.13])block('2F learning commons shelf line | illustrative',
   [3.12,.045,.54],[x,h,-n],steel);
}
for(const [x,n] of [[18,58.2],[25,58.2],[32,58.2]]){
 block('2F learning commons group table | function confirmed / positions inferred',
   [2.2,.075,1],[x,4.76,-n],wood);
 for(const sx of [-.85,.85])for(const sn of [-.35,.35])block('2F reading table support | illustrative',
   [.055,.7,.055],[x+sx,4.4,-n+sn],steel);
}
// South-west 2F cafeteria; loose furniture is displayed only in an inset
// part of the plan-marked zone, without asserting its product or seating plan.
for(let row=0;row<2;row++)for(let col=0;col<4;col++){
 const x=10+col*5.5,n=20.8+row*4.0;
 block('2F cafeteria table | D1 p.5 and SCHOOL; seating schedule unverified',
   [1.65,.065,.78],[x,4.78,-n],wood);
 block('2F cafeteria table pedestal | schematic', [.09,.7,.09],[x,4.4,-n],steel);
 for(const dz of [-.9,.9]){
   block('2F cafeteria loose bench | illustrative', [1.55,.08,.36],[x,4.46,-n+dz],wood);
   for(const dx of [-.65,.65])block('2F cafeteria bench leg | illustrative',
     [.055,.4,.055],[x+dx,4.23,-n+dz],steel);
 }
}
// A single annotated *sample* classroom on S 3F, based on D1 p.6 and the
// CITY photo kyousitu2.jpg: pale floor, charcoal board, red side panels,
// wood desks, grey-blue chairs. Bay/register/wall geometry is not surveyed.
const c={west:67.5,east:75.3,south:19.3,north:27.2,floor:7.6,top:11.13};
block('S 3F sample classroom inner floor finish | proposed bay, not measured',
 [c.east-c.west,.024,c.north-c.south],[(c.west+c.east)/2,c.floor+.015,-(c.south+c.north)/2],white);
for(const x of [c.west,c.east])block('S 3F sample classroom side partition | plan function, outline inferred',
 [.09,c.top-c.floor,c.north-c.south],[x,(c.floor+c.top)/2,-(c.south+c.north)/2],white);
block('S 3F classroom teaching wall | inferred partition',
 [c.east-c.west,c.top-c.floor,.12],[(c.west+c.east)/2,(c.floor+c.top)/2,-c.north],white);
block('S 3F classroom blackboard | CITY kyousitu2.jpg, length inferred',
 [5.45,1.2,.06],[(c.west+c.east)/2,9.65,-c.north+.1],ink);
for(const x of [68.35,74.45])block('S 3F classroom red teaching-wall accent | CITY photo, inferred',
 [.58,1.23,.063],[x,9.65,-c.north+.115],accents[0]);
block('S 3F classroom board tray | image type, not measured',
 [5.5,.045,.18],[(c.west+c.east)/2,9.03,-c.north+.2],steel);
// Completion photo shows narrow linear ceiling lights and a ceiling-mounted
// projector. Their placement here is only a scene-level representation.
const ceilingLight=new THREE.MeshBasicMaterial({color:0xf6f5e7});
for(const x of [69.2,73.65]){
  block('S 3F classroom linear ceiling luminaire | CITY photo, position/length unverified',
    [.065,.012,5.6],[x,11.06,-23],ceilingLight);
}
block('S 3F classroom projector housing | CITY photo, approximate',
 [.36,.18,.28],[71.4,10.68,-25.7],white);
block('S 3F classroom teacher lectern | CITY photo, model size estimated',
 [1,.07,.46],[71.4,8.41,-26.15],wood);
block('S 3F classroom lectern pedestal | study',
 [.09,.73,.09],[71.4,8.01,-26.15],steel);
// Class photo desks are repeated; instancing keeps the trial display cheap.
const positions: [number,number][]=[];
for(let row=0;row<4;row++)for(let col=0;col<4;col++)positions.push([68.5+col*1.84,20.2+row*1.45]);
const deskTop=new THREE.InstancedMesh(new THREE.BoxGeometry(.96,.055,.53),wood,positions.length);
const deskFrame=new THREE.InstancedMesh(new THREE.BoxGeometry(.048,.66,.048),steel,positions.length*4);
const chairSeat=new THREE.InstancedMesh(new THREE.BoxGeometry(.44,.06,.42),matte(0x80959a),positions.length);
const chairBack=new THREE.InstancedMesh(new THREE.BoxGeometry(.47,.37,.055),matte(0x80959a),positions.length);
for(const [m,name] of [[deskTop,'desk wood top'],[deskFrame,'desk legs'],[chairSeat,'chair seat'],[chairBack,'chair back']] as const){m.name=`S 3F sample classroom ${name} | photo-derived type; count/spacing unverified`;interiorStudy.add(m)}
const dummy=new THREE.Object3D();
for(const [i,[x,n]] of positions.entries()){
 dummy.position.set(x,8.35,-n);dummy.updateMatrix();deskTop.setMatrixAt(i,dummy.matrix);
 for(const [k,[dx,dn]] of [[-.41,-.2],[.41,-.2],[-.41,.2],[.41,.2]].entries()){
  dummy.position.set(x+dx,7.98,-n+dn);dummy.updateMatrix();deskFrame.setMatrixAt(i*4+k,dummy.matrix);
 }
 dummy.position.set(x,8.08,-n+.65);dummy.updateMatrix();chairSeat.setMatrixAt(i,dummy.matrix);
 dummy.position.set(x,8.29,-n+.88);dummy.updateMatrix();chairBack.setMatrixAt(i,dummy.matrix);
}
for(const mesh of [deskTop,deskFrame,chairSeat,chairBack])mesh.instanceMatrix.needsUpdate=true;
// Sample classroom is deliberately closed to movement: no doors, fire-safety,
// wheelchair paths or actual room wall opening data have been established.
block('S 3F sample classroom glass observation zone | not a confirmed entry',
 [c.east-c.west,2.18,.035],[(c.west+c.east)/2,8.72,-c.south],glass);
interiorStudy.userData={
  evidence:['D1 p.5 2F areas','D1 p.6 S 3F classroom layout','D1 p.9 2F=+4, 3F=+7.6',
    'CITY 2017 ra-ninngusutori-to1/2.jpg','CITY kyousitu2.jpg','SCHOOL facility/building'],
  photoAssetsBundled:false,exactFurnitureCountKnown:false,studyClassroomDesks:positions.length,
  asBuiltAccuracy:false,interiorEntryValidated:false
};
