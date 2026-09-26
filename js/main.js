// ============================================================
// main.js — 起動・レンダラー・空・時間帯・ループ
// 川口市立高等学校 3D 探検シミュレーター
// ============================================================
import * as THREE from 'three';
import { CFG, TIMES } from './config.js';
import { Batch, ColliderWorld, FloorWorld, Instancer, canvasTexture, gradTex } from './util.js';
import { initMaterials } from './materials.js';
import { createSignMats } from './signs.js';
import { buildSchool } from './build-school.js';
import { buildInterior } from './build-interior.js';
import { buildArena } from './build-arena.js';
import { buildCampus } from './build-campus.js';
import { Player } from './player.js';
import * as HUD from './hud.js';

const splash = document.getElementById('splash');
const loadStatus = document.getElementById('load-status');
const startBtn = document.getElementById('start-btn');
const menuEl = document.getElementById('menu');

let renderer, scene, camera;
let player;
let ctx;
let skyMat, sunLight, hemiLight, stars, sunSprite, moonSprite;
let timeIdx = 0;
let photoMode = false;
const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, fpsT = 0;

// ============================================================
// 空のシェーダー
function makeSky() {
  skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x3f7fd2) },
      bottomColor: { value: new THREE.Color(0xdaecf8) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y;
        float t = smoothstep(-0.06, 0.42, h);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1600, 24, 14), skyMat);
  scene.add(sky);
}

// 星（夜）
function makeStars() {
  const n = 900;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(Math.random() * 0.9);
    const r = 1400;
    pos[i * 3] = r * Math.sin(b) * Math.cos(a);
    pos[i * 3 + 1] = r * Math.cos(b) + 60;
    pos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
  scene.add(stars);
}

// 太陽・月
function makeSunMoon() {
  const sunTex = canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,252,235,1)');
    g.addColorStop(0.35, 'rgba(255,244,200,0.95)');
    g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, fog: false }));
  sunSprite.scale.set(190, 190, 1);
  scene.add(sunSprite);

  const moonTex = canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(60, 60, 4, 60, 60, 54);
    g.addColorStop(0, 'rgba(235,240,250,1)');
    g.addColorStop(0.5, 'rgba(220,228,242,0.9)');
    g.addColorStop(1, 'rgba(200,215,235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(180,195,215,0.5)';
    ctx.beginPath(); ctx.arc(48, 48, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(70, 68, 6, 0, Math.PI * 2); ctx.fill();
  });
  moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false }));
  moonSprite.scale.set(110, 110, 1);
  scene.add(moonSprite);
}

// 雲
const clouds = [];
function makeClouds() {
  const tex = canvasTexture(256, 128, (ctx) => {
    ctx.clearRect(0, 0, 256, 128);
    const blob = (x, y, r, a) => {
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };
    blob(80, 70, 46, 0.85); blob(120, 60, 56, 0.9); blob(160, 72, 44, 0.8); blob(100, 82, 40, 0.7);
  });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(160 + Math.random() * 160, 70 + Math.random() * 50),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false })
    );
    m.position.set(-600 + Math.random() * 1200, 140 + Math.random() * 90, -500 + Math.random() * 1000);
    m.rotation.x = Math.PI / 2;
    m.userData.speed = 1.2 + Math.random() * 2;
    clouds.push(m);
    scene.add(m);
  }
}

// ============================================================
// 時間帯適用
function applyTime(i) {
  timeIdx = ((i % TIMES.length) + TIMES.length) % TIMES.length;
  const t = TIMES[timeIdx];
  skyMat.uniforms.topColor.value.setHex(t.skyTop);
  skyMat.uniforms.bottomColor.value.setHex(t.skyBot);
  scene.fog.color.setHex(t.fog);
  scene.fog.density = t.fogDensity;
  renderer.toneMappingExposure = t.exposure;
  hemiLight.color.setHex(t.hemiSky);
  hemiLight.groundColor.setHex(t.hemiGnd);
  hemiLight.intensity = t.hemiI;
  sunLight.color.setHex(t.sunColor);
  sunLight.intensity = t.sunI;
  const sd = new THREE.Vector3(...t.sun).normalize();
  sunLight.position.set(sd.x * 220, sd.y * 220 + 30, sd.z * 220);
  sunSprite.position.set(sd.x * 900, sd.y * 900 + 60, sd.z * 900);
  sunSprite.material.opacity = t.id === 'night' ? 0 : 1;
  moonSprite.position.set(-sd.x * 900, Math.max(200, -sd.y * 700 + 300), -sd.z * 900);
  moonSprite.material.opacity = t.id === 'night' ? 1 : 0;
  stars.material.opacity = t.id === 'night' ? 0.9 : (t.id === 'evening' ? 0.35 : 0);
  // 影を一度だけ更新
  renderer.shadowMap.needsUpdate = true;
  HUD.setClock(timeIdx);
}

// ============================================================
async function build() {
  const steps = [
    ['素材を準備中…', () => { ctx.M = initMaterials(renderer); }],
    ['空と光を準備中…', () => { makeSky(); makeStars(); makeSunMoon(); makeClouds(); }],
    ['校舎棟を建設中…', () => { buildSchool(ctx); }],
    ['内装を配置中…', () => { buildInterior(ctx); }],
    ['アリーナ棟を建設中…', () => { buildArena(ctx); }],
    ['グラウンド・周辺を整備中…', () => { buildCampus(ctx); }],
    ['マージしています…', () => {
      ctx.batch.build(scene);
      ctx.inst.build(scene);
    }],
  ];
  for (const [msg, fn] of steps) {
    loadStatus.textContent = msg;
    await new Promise(r => setTimeout(r, 30));
    fn();
  }
}

// ============================================================
async function main() {
  // レンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.getElementById('app').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xcfe2f0, 0.0011);

  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 2400);
  camera.rotation.order = 'YXZ';
  camera.position.set(126, 1.7, 12);

  // ライト
  hemiLight = new THREE.HemisphereLight(0xbdd9f2, 0x8f9a8a, 0.75);
  scene.add(hemiLight);
  sunLight = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(4096, 4096);
  sunLight.shadow.camera.left = -220;
  sunLight.shadow.camera.right = 220;
  sunLight.shadow.camera.top = 220;
  sunLight.shadow.camera.bottom = -220;
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 620;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.05;
  sunLight.target.position.set(10, 0, -20);
  scene.add(sunLight);
  scene.add(sunLight.target);

  // コンテキスト
  const cols = new ColliderWorld(12);
  const floors = new FloorWorld(14);
  ctx = {
    M: null,
    batch: new Batch(),
    inst: new Instancer(),
    colliders: cols,
    floors,
    signMats: createSignMats(),
    rng: (() => { let s = 20210901; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(),
    addCol: (x0, y0, z0, x1, y1, z1) => cols.add(x0, y0, z0, x1, y1, z1),
    addFloor: (x0, x1, z0, z1, y) => floors.add(x0, x1, z0, z1, y),
  };

  // プレイヤー
  player = new Player(camera, renderer.domElement, cols, floors);

  // 構築
  await build();

  // HUD
  HUD.initHud(player, (t) => {
    const fly = t.fly || false;
    player.fly = fly;
    player.pos.set(t.pos[0], t.pos[1], t.pos[2]);
    if (t.yaw !== undefined) camera.rotation.set(t.pitch || 0, t.yaw, 0);
    player.vel.set(0, 0, 0);
    if (!isTouch && !player.locked) player.lock();
  });
  applyTime(0);

  // UI イベント
  startBtn.addEventListener('click', () => {
    splash.classList.add('hidden');
    player.enabled = true;
    HUD.showHud(true);
    if (!isTouch) player.lock();
  });

  window.addEventListener('keydown', (e) => {
    if (!player.enabled) return;
    if (e.code === 'KeyT') applyTime(timeIdx + 1);
    if (e.code === 'KeyP') { photoMode = HUD.photoMode(); }
    if (e.code === 'KeyM') {
      if (HUD.menuIsOpen()) { HUD.closeMenu(); if (!isTouch) player.lock(); }
      else { HUD.openMenu(); document.exitPointerLock?.(); }
    }
  });
  menuEl.addEventListener('click', (e) => {
    if (e.target === menuEl) { HUD.closeMenu(); if (!isTouch) player.lock(); }
  });
  // ポインタロック解除→メニュー表示（ゲーム中のみ）
  document.addEventListener('pointerlockchange', () => {
    if (player.enabled && !player.locked && !isTouch && !HUD.menuIsOpen() && splash.classList.contains('hidden')) {
      HUD.openMenu();
    }
  });

  // リサイズ
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setupTouch();

  loadStatus.textContent = '準備完了！「探索をはじめる」を押してください';
  {
    const btn = document.getElementById('start-btn');
    btn.textContent = '探索をはじめる';
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
  }
  window.__APP = { player, camera, renderer, scene, applyTime };
  window.__READY = true;
  requestAnimationFrame(loop);
}

// ============================================================
// タッチ操作
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
function setupTouch() {
  if (!isTouch) return;
  document.getElementById('touch-ui').classList.add('on');
  const stick = document.getElementById('stick');
  const knob = document.getElementById('stick-knob');
  let stickId = null, stickCX = 0, stickCY = 0;
  stick.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    stickId = t.identifier;
    const r = stick.getBoundingClientRect();
    stickCX = r.left + r.width / 2; stickCY = r.top + r.height / 2;
    e.preventDefault();
  });
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = (t.clientX - stickCX) / 44, dy = (t.clientY - stickCY) / 44;
        const l = Math.hypot(dx, dy);
        if (l > 1) { dx /= l; dy /= l; }
        player.touchMove.x = dx;
        player.touchMove.y = dy;
        knob.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
      } else if (t.identifier === lookId) {
        camera.rotation.y -= (t.clientX - lookX) * 0.005;
        camera.rotation.x = Math.max(-1.45, Math.min(1.45, camera.rotation.x - (t.clientY - lookY) * 0.005));
        lookX = t.clientX; lookY = t.clientY;
      }
    }
  }, { passive: false });
  window.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        stickId = null;
        player.touchMove.x = player.touchMove.y = 0;
        knob.style.transform = '';
      }
      if (t.identifier === lookId) lookId = null;
    }
  });
  let lookId = null, lookX = 0, lookY = 0;
  renderer.domElement.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    lookId = t.identifier;
    lookX = t.clientX; lookY = t.clientY;
  });
  const runBtn = document.getElementById('btn-run');
  runBtn.addEventListener('touchstart', (e) => { player.touchRun = true; e.preventDefault(); });
  runBtn.addEventListener('touchend', () => { player.touchRun = false; });
  const jumpBtn = document.getElementById('btn-jump');
  jumpBtn.addEventListener('touchstart', (e) => { player.touchJump = true; e.preventDefault(); });
  jumpBtn.addEventListener('touchend', () => { player.touchJump = false; });
}

// ============================================================
// メインループ
let zoneTick = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  player.update(dt);

  // HUD更新（軽量化のため間引き）
  zoneTick += dt;
  if (zoneTick > 0.25) {
    zoneTick = 0;
    if (!photoMode) {
      HUD.updateZone(player);
      HUD.updateHotspots(player);
      HUD.drawMinimap(player);
    }
  }

  // 雲の drift
  for (const c of clouds) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 700) c.position.x = -700;
  }

  // FPS
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) {
    HUD.setFps(Math.round(fpsN / fpsAcc));
    fpsAcc = 0; fpsN = 0;
  }

  renderer.render(scene, camera);
}

main().catch(err => {
  console.error(err);
  loadStatus.textContent = 'エラー: ' + err.message;
});
