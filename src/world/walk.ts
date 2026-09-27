import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Explicit outdoor prototype, NOT a verified accessible-route simulator.
 * The geometry determines stair/platform height, and wall meshes stop the
 * camera. The model's y=0 is still an unmeasured reference level.
 */
export function createWalkMode(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement,
  orbit: OrbitControls, exterior: THREE.Group, button: HTMLButtonElement, hint: HTMLElement) {
  const pointer = new PointerLockControls(camera, canvas);
  const keys = new Set<string>();
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0,-1,0);
  const up = new THREE.Vector3(0,1,0);
  const forward = new THREE.Vector3(), right = new THREE.Vector3(), step = new THREE.Vector3();
  const walkable: THREE.Object3D[] = [], walls: THREE.Object3D[] = [];
  exterior.traverse(obj=>{
    if (!(obj instanceof THREE.Mesh)) return;
    const name=obj.name;
    if (/stair \||stair flight|East gateway landing|2F landing|Upper plaza dark walkable|Learning street 2F deck/.test(name)) walkable.push(obj);
    if (/opaque outer wall|Arena S external enclosure|Arena N outer wall|suspended pale upper cladding|glazed central recessed tower|Arena N dojo-to-road glazing|East end vertical glazing/.test(name)) walls.push(obj);
  });
  const eye=1.67, radius=.38, gravity=9.81;
  let active=false, grounded=true, riseVelocity=0;
  const readout=document.getElementById('walkReadout')!;
  let readoutTime=0;
  let savedPosition = new THREE.Vector3(), savedTarget = new THREE.Vector3();
  const floorAt=(x:number,foot:number,z:number)=>{
    // A 0.25 m step-up limit permits each illustrated tread, not a jump
    // onto a four-metre platform or through a flat wall. Read actual mesh tops.
    ray.set(new THREE.Vector3(x,foot+.25,z),down);ray.far=8;
    const hit=ray.intersectObjects(walkable,false).find(h=>h.point.y <= foot+.24 && h.point.y>=-0.03);
    return Math.max(0,hit?.point.y ?? 0);
  };
  const blocked=(from:THREE.Vector3,to:THREE.Vector3)=>{
    const delta=to.clone().sub(from);delta.y=0;
    if(delta.lengthSq()<1e-8)return false;
    for(const y of [-.75,-.15]){
      const source=from.clone();source.y+=y;
      ray.set(source,delta.clone().normalize());ray.far=delta.length()+radius;
      if(ray.intersectObjects(walls,false).length)return true;
    }
    return false;
  };
  const stop=()=>{
    if(!active)return;
    active=false;keys.clear();riseVelocity=0;orbit.enabled=true;document.body.classList.remove('walk-mode');
    if(pointer.isLocked)pointer.unlock();
    camera.position.copy(savedPosition);orbit.target.copy(savedTarget);orbit.update();
    button.classList.remove('selected');button.textContent='一人称で歩く';
    hint.textContent='ドラッグで回転 · ホイールで拡大 · 右ドラッグで移動';
  };
  pointer.addEventListener('unlock',stop);
  pointer.addEventListener('lock',()=>{
    // OrbitControls may still update while the browser processes pointer.lock().
    // Move to the ground-level spawn only AFTER the lock has actually arrived.
    camera.position.set(-32,eye,-47);camera.lookAt(10,eye,-42);
    grounded=true;riseVelocity=0;
    active=true;document.body.classList.add('walk-mode');button.classList.add('selected');button.textContent='歩行中 · Escで戻る';
    hint.textContent='WASD:移動 · マウス:視線 · Shift:速歩 · Space:ジャンプ · Esc:戻る／位置とGLは推定';
  });
  button.addEventListener('click',()=>{
    if(active){stop();return;}
    savedPosition=camera.position.clone();savedTarget=orbit.target.clone();orbit.enabled=false;
    try {pointer.lock();}catch {orbit.enabled=true;camera.position.copy(savedPosition);orbit.target.copy(savedTarget);orbit.update();hint.textContent='この環境ではポインターロックが許可されていません';}
  });
  const prevent=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  window.addEventListener('keydown',e=>{if(!active && !pointer.isLocked)return;if(e.code==='Escape'){e.preventDefault();stop();return;}keys.add(e.code);if(prevent.has(e.code))e.preventDefault();});
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>keys.clear());
  return {
    get active(){return active;},
    stop,
    update(dt:number){
      if(!active || !pointer.isLocked)return;
      const duration=Math.min(dt,.05);
      const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?4.6:2.7;
      camera.getWorldDirection(forward);forward.y=0;forward.normalize();
      right.crossVectors(forward,up).normalize();
      step.set(0,0,0);
      if(keys.has('KeyW')||keys.has('ArrowUp'))step.add(forward);
      if(keys.has('KeyS')||keys.has('ArrowDown'))step.sub(forward);
      if(keys.has('KeyD')||keys.has('ArrowRight'))step.add(right);
      if(keys.has('KeyA')||keys.has('ArrowLeft'))step.sub(right);
      if(step.lengthSq()>0){
        step.normalize().multiplyScalar(speed*duration);
        const next=camera.position.clone().add(step);
        if(next.x>-125&&next.x<155&&next.z>-104&&next.z<37&&!blocked(camera.position,next)){
          const floor=floorAt(next.x,camera.position.y-eye,next.z);
          if(floor<=camera.position.y-eye+.24 || !grounded){camera.position.x=next.x;camera.position.z=next.z;}
        }
      }
      if(grounded&&keys.has('Space')){riseVelocity=4.15;grounded=false;}
      riseVelocity-=gravity*duration;
      camera.position.y+=riseVelocity*duration;
      const floor=floorAt(camera.position.x,camera.position.y-eye,camera.position.z);
      if(camera.position.y-eye<=floor){camera.position.y=floor+eye;riseVelocity=0;grounded=true;}
      else grounded=false;
      readoutTime+=duration;
      if(readoutTime>.16){readoutTime=0;readout.textContent=`現在地：東 ${camera.position.x.toFixed(1)}m / 北 ${(-camera.position.z).toFixed(1)}m / モデル床高 ${Math.max(0,camera.position.y-eye).toFixed(1)}m（測量GLではありません）`; }
    }
  };
}
