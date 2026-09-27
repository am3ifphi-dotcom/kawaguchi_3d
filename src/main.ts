import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'stats.js';
import { inspect, makeBuildings, type Accepted } from './world/lod1';
import { createTiles } from './world/tiles';
import { makeExteriorStudy } from './world/exterior';
import { roofEquipmentStudy } from './world/roof-equipment';
import { interiorStudy } from './world/interior';
import { createWalkMode } from './world/walk';
import { createQualityMode } from './world/quality';
import { ORIGIN } from './geo/coordinates';
import './style.css';

const mount = document.getElementById('scene')!;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dfe9e7');
scene.fog = new THREE.Fog('#dfe9e7', 430, 920);
const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 1800);
camera.position.set(136, 11, -46);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(mount.clientWidth, mount.clientHeight);
mount.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(72, 9, -46);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 25;
controls.maxDistance = 900;
controls.maxPolarAngle = Math.PI / 2 - 0.025;
controls.update();
const ambient = new THREE.HemisphereLight('#ffffff', '#b3bbc2', 2.0);
scene.add(ambient);
const sunlight = new THREE.DirectionalLight('#fff7e7', 1.75);
sunlight.position.set(-150, 300, 160);
scene.add(sunlight);

// y=0 is a provisional inspection plane, NOT a surveyed school-site GL or DEM.
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1300, 1300), new THREE.MeshLambertMaterial({ color: '#eaf0eb', side: THREE.DoubleSide }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.06;
scene.add(ground);
const grid = new THREE.GridHelper(1000, 100, '#c2cfd0', '#d4dfdc');
grid.position.y = 0.01;
const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
gridMaterials.forEach(m => { m.transparent = true; m.opacity = 0.42; });
scene.add(grid);

const circlePoints = Array.from({ length: 129 }, (_, i) => {
  const t = i / 128 * Math.PI * 2; return new THREE.Vector3(Math.cos(t) * 300, 0.09, Math.sin(t) * 300);
});
const circle = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePoints), new THREE.LineBasicMaterial({ color: '#a9b6b4', transparent: true, opacity: 0.55 }));
scene.add(circle);
const axes = new THREE.Group();
const axisMat = new THREE.LineBasicMaterial({ color: '#229eac', transparent: true, opacity: 0.75 });
axes.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-8, 0.13, 0), new THREE.Vector3(8, 0.13, 0)]), axisMat));
axes.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.13, -8), new THREE.Vector3(0, 0.13, 8)]), axisMat));
scene.add(axes);
const originMarker = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), new THREE.MeshBasicMaterial({ color: '#2a9aa7' }));
originMarker.position.y = 1.2; scene.add(originMarker);

const { accepted, rejected } = inspect();
const surrounding = makeBuildings(accepted, false);
const candidateMesh = makeBuildings(accepted, true);
scene.add(surrounding, candidateMesh);
surrounding.visible = false; // Massive LOD1 neighbors occlude the photographic facade views.
candidateMesh.visible = false; // Avoid z-fighting the geometry study with the same GIS footprints.
const exterior = makeExteriorStudy();
scene.add(exterior);
const quality = createQualityMode(scene,camera,renderer,exterior,ground,sunlight,ambient,
  document.getElementById('qualityButton') as HTMLButtonElement);
const walk = createWalkMode(camera,renderer.domElement,controls,exterior,
  document.getElementById('walkButton') as HTMLButtonElement,
  document.querySelector('.control-hint') as HTMLElement);
// Non-destructive presentation mode: hides only UI, never alters model data.
const presentationButton=document.getElementById('presentationButton') as HTMLButtonElement;
const presentationExit=document.getElementById('presentationExit') as HTMLButtonElement;
const presentation=(enabled:boolean)=>document.body.classList.toggle('presentation-mode',enabled);
presentationButton.addEventListener('click',()=>presentation(true));
presentationExit.addEventListener('click',()=>presentation(false));
window.addEventListener('keydown',e=>{
  if(e.code==='KeyH' && !(e.target instanceof HTMLInputElement))presentation(!document.body.classList.contains('presentation-mode'));
  if(e.code==='Escape')presentation(false);
});
const tiles = createTiles(scene);
const stats = new Stats();
stats.showPanel(0);
stats.dom.className += ' stats';
document.getElementById('app')!.appendChild(stats.dom);

function checkbox(id: string, cb: (enabled: boolean) => void) {
  const el = document.getElementById(id) as HTMLInputElement;
  el.addEventListener('change', () => cb(el.checked));
}
checkbox('buildingsToggle', enabled => surrounding.visible = enabled);
checkbox('candidatesToggle', enabled => candidateMesh.visible = enabled);
checkbox('exteriorToggle', enabled => exterior.visible = enabled);
checkbox('equipmentToggle', enabled => roofEquipmentStudy.visible = enabled);
checkbox('interiorToggle', enabled => interiorStudy.visible = enabled);
checkbox('tilesToggle', enabled => tiles.setEnabled(enabled));
type View = 'overview' | 'front' | 'gate' | 'top' | 'north' | 'south' | 'arena' | 'westStair' | 'roof' | 'equipment' | 'streetInterior' | 'classroom';
const buttons: Record<View, HTMLButtonElement> = {
  overview: document.getElementById('perspectiveButton') as HTMLButtonElement,
  gate: document.getElementById('gateButton') as HTMLButtonElement,
  front: document.getElementById('frontButton') as HTMLButtonElement,
  top: document.getElementById('topButton') as HTMLButtonElement,
  north: document.getElementById('northButton') as HTMLButtonElement,
  south: document.getElementById('southButton') as HTMLButtonElement,
  arena: document.getElementById('arenaButton') as HTMLButtonElement,
  westStair: document.getElementById('westStairButton') as HTMLButtonElement,
  roof: document.getElementById('roofButton') as HTMLButtonElement,
  equipment: document.getElementById('equipmentButton') as HTMLButtonElement,
  streetInterior: document.getElementById('streetInteriorButton') as HTMLButtonElement,
  classroom: document.getElementById('classroomButton') as HTMLButtonElement
};
// Reproducible *comparison directions*. These are NOT photographic camera
// calibration: no camera metadata, survey control, or image homography exists.
const views: Record<View, { camera: [number, number, number], target: [number, number, number] }> = {
  overview: { camera: [135, 92, 115], target: [0, 9, -44] },
  gate: { camera: [136, 11, -46], target: [72, 9, -46] },
  front: { camera: [156, 10, -104], target: [94, 10, -48] },
  top: { camera: [.01, 400, -25], target: [0, 0, -25] },
  north: { camera: [46, 32, -178], target: [46, 9, -65] },
  south: { camera: [50, 34, 122], target: [50, 9, -27] },
  arena: { camera: [-10, 12, -53], target: [-89, 8, -53] },
  westStair: { camera: [-34, 7.5, -48], target: [10, 5, -42] },
  roof: { camera: [-32, 28, -41], target: [-52, 14.5, -64] },
  equipment: { camera: [48, 90, 16], target: [48, 18, -45] },
  streetInterior: { camera: [32, 7.2, -41.3], target: [83, 4.8, -45] },
  classroom: { camera: [71.4, 9.45, -18.85], target: [71.4, 9.25, -26.6] }
};
function setView(mode: View) {
  const view = views[mode];
  controls.minDistance = mode === 'classroom' ? 0.6 : 25;
  controls.target.set(...view.target);
  camera.position.set(...view.camera);
  camera.up.set(0, 1, 0); controls.update();
  for (const [name, button] of Object.entries(buttons)) button.classList.toggle('selected', name === mode);
  const source = document.getElementById('referenceLink') as HTMLAnchorElement;
  const schoolPhotos = 'https://www.city.kawaguchi.lg.jp/soshiki/01120/050/2/46354.html';
  const arenaPhotos = 'https://www.city.kawaguchi.lg.jp/soshiki/01120/050/2/46357.html';
  const entrancePhotos = 'https://www.pref.saitama.lg.jp/a0109/sr-main/sr-townguide/townguide/school.html';
  source.hidden = mode === 'equipment'; // The supplied D1 PDF cannot be redistributed without city permission.
  source.href = mode === 'arena' || mode === 'south' || mode === 'westStair' || mode === 'roof' ? arenaPhotos
    : mode === 'streetInterior' || mode === 'classroom' ? schoolPhotos
    : mode === 'equipment' ? 'https://www.city.kawaguchi.lg.jp/material/files/group/3/47267235.pdf'
    : mode === 'gate' || mode === 'front' ? entrancePhotos
    : mode === 'north' ? schoolPhotos
    : 'https://jia-award.jia.or.jp/kenchikusen/2023/best-architecture/2443/';
}
for (const [mode, button] of Object.entries(buttons)) button.addEventListener('click', () => setView(mode as View));
document.getElementById('resetButton')!.addEventListener('click', () => setView('gate'));
const status = document.getElementById('status')!;
status.textContent = `LOD1 ${accepted.length}棟 / 高さ欠測 ${rejected.noHeight}件 / 不正輪郭 ${rejected.invalidRing}件`;

const map = document.getElementById('minimap') as HTMLCanvasElement;
const ctx = map.getContext('2d')!;
function drawMap(items: Accepted[]) {
  const w = map.width, s = w / 680;
  ctx.clearRect(0, 0, w, w);
  ctx.fillStyle = '#e9efec'; ctx.fillRect(0, 0, w, w);
  ctx.strokeStyle = '#c8d3d1'; ctx.lineWidth = 1;
  for (let i = -300; i <= 300; i += 100) {
    const q = w / 2 + i * s;
    ctx.beginPath(); ctx.moveTo(q, 0); ctx.lineTo(q, w); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, q); ctx.lineTo(w, q); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(w / 2, w / 2, 300 * s, 0, Math.PI * 2);
  ctx.lineWidth = 2; ctx.strokeStyle = '#aabbb5'; ctx.stroke();
  for (const { points, candidate } of items) {
    ctx.beginPath();
    points.forEach((p, i) => { const x = w / 2 + p.x * s, y = w / 2 - p.y * s; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.closePath(); ctx.fillStyle = candidate ? '#c79a51' : '#9baeb2'; ctx.fill();
  }
  ctx.fillStyle = '#168d9b'; ctx.beginPath(); ctx.arc(w / 2, w / 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#34474c'; ctx.font = 'bold 14px system-ui'; ctx.fillText('N', w / 2 - 5, 14);
  ctx.fillStyle = '#697d7d'; ctx.font = '12px system-ui'; ctx.fillText('300 m', w - 53, w / 2 - 4);
}
drawMap(accepted);
const resizeObserver = new ResizeObserver(() => {
  const w = mount.clientWidth, h = mount.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); quality.resize(w,h);
});
resizeObserver.observe(mount);
renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); status.textContent = 'WebGLコンテキストが失われました。ページを再読込してください。'; });
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  stats.begin();
  const dt=clock.getDelta();
  if(walk.active)walk.update(dt);else controls.update();
  quality.render();
  stats.end();
}
animate();
console.info('Origin (unverified):', ORIGIN, 'accepted:', accepted.length, 'rejected:', rejected);
