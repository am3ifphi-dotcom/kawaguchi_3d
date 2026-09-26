// ============================================================
// util.js — ジオメトリバッチ・コリダー・canvasテクスチャ等の共通ユーティリティ
// ============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- シード付き乱数 ----------
export function makeRng(seed = 1234) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------- canvas テクスチャ ----------
export function canvasTexture(w, h, drawFn, opts = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  drawFn(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (opts.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(opts.repeat[0], opts.repeat[1]); }
  return tex;
}

// 縦長グラデーション（空など）
export function gradTex(w, h, stops) {
  return canvasTexture(w, h, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [p, c] of stops) g.addColorStop(p, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// コンクリート風ノイズ
export function concreteTex(base = '#cfcac2', noise = 10, w = 256, h = 256) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    let s = 98765;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < w * h * 0.06; i++) {
      const v = (rnd() - 0.5) * noise;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v / 60})` : `rgba(30,25,20,${-v / 60})`;
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    // 目地
    ctx.strokeStyle = 'rgba(60,55,50,0.16)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let x = 0; x <= w; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  }, { repeat: [1, 1] });
}

// ---------- ジオメトリバッチ（同一マテリアルでマージしてドローコール削減） ----------
export class Batch {
  constructor() {
    this.groups = new Map(); // key -> {mat, geoms:[], shadows}
  }
  add(key, mat, geom, matrix = null, shadows = 1) {
    let g = this.groups.get(key);
    if (!g) { g = { mat, geoms: [], shadows }; this.groups.set(key, g); }
    const geo = geom.clone();
    if (matrix) geo.applyMatrix4(matrix);
    else if (geom.userData.noClone) { /* noop */ }
    g.geoms.push(geo);
    return geo;
  }
  // box を追加（x,y,z = 中心, sx,sy,sz = サイズ, rotY = Y回転）
  box(key, mat, x, y, z, sx, sy, sz, rotY = 0, shadows = 1) {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    if (rotY) geo.rotateY(rotY);
    geo.translate(x, y, z);
    return this.add(key, mat, geo, null, shadows);
  }
  cyl(key, mat, x, y, z, rTop, rBot, h, seg = 12, rotX = 0, rotZ = 0, shadows = 1) {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    if (rotX) geo.rotateX(rotX);
    if (rotZ) geo.rotateZ(rotZ);
    geo.translate(x, y, z);
    return this.add(key, mat, geo, null, shadows);
  }
  build(parent, opts = {}) {
    for (const [, g] of this.groups) {
      const merged = mergeGeometries(g.geoms, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, g.mat);
      mesh.castShadow = !!(g.shadows & 1) && opts.cast !== false;
      mesh.receiveShadow = !!(g.shadows & 2);
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.groups.clear();
  }
}

// ---------- コリダー（AABB + 空間ハッシュ） ----------
export class ColliderWorld {
  constructor(cell = 10) {
    this.cell = cell;
    this.boxes = [];      // {x0,x1,z0,z1,y0,y1}
    this.hash = new Map();
  }
  add(x0, y0, z0, x1, y1, z1) {
    const b = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
    const id = this.boxes.push(b) - 1;
    const c = this.cell;
    for (let gx = Math.floor(b.x0 / c); gx <= Math.floor(b.x1 / c); gx++)
      for (let gz = Math.floor(b.z0 / c); gz <= Math.floor(b.z1 / c); gz++) {
        const k = gx + ':' + gz;
        let arr = this.hash.get(k);
        if (!arr) { arr = []; this.hash.set(k, arr); }
        arr.push(id);
      }
    return b;
  }
  // box追加ヘルパー（中心+サイズ）
  addBox(cx, cy, cz, sx, sy, sz) {
    return this.add(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2);
  }
  query(x0, z0, x1, z1, out) {
    out.length = 0;
    const c = this.cell;
    const seen = new Set();
    for (let gx = Math.floor(x0 / c); gx <= Math.floor(x1 / c); gx++)
      for (let gz = Math.floor(z0 / c); gz <= Math.floor(z1 / c); gz++) {
        const arr = this.hash.get(gx + ':' + gz);
        if (!arr) continue;
        for (const id of arr) if (!seen.has(id)) { seen.add(id); out.push(this.boxes[id]); }
      }
    return out;
  }
}

// 水平面の高さサンプラ（床・地面の歩行面）: {x0,x1,z0,z1,y} のリストから最大Yを返す
export class FloorWorld {
  constructor(cell = 12) {
    this.cell = cell;
    this.planes = [];
    this.hash = new Map();
  }
  add(x0, x1, z0, z1, y) {
    const p = { x0, x1, z0, z1, y };
    const id = this.planes.push(p) - 1;
    const c = this.cell;
    for (let gx = Math.floor(x0 / c); gx <= Math.floor(x1 / c); gx++)
      for (let gz = Math.floor(z0 / c); gz <= Math.floor(z1 / c); gz++) {
        const k = gx + ':' + gz;
        let arr = this.hash.get(k);
        if (!arr) { arr = []; this.hash.set(k, arr); }
        arr.push(id);
      }
  }
  // (x,z) で yLimit 以下の最も高い床のYを返す（無ければ -Infinity）
  heightAt(x, z, yLimit) {
    const arr = this.hash.get(Math.floor(x / this.cell) + ':' + Math.floor(z / this.cell));
    let best = -Infinity;
    if (arr) {
      for (const id of arr) {
        const p = this.planes[id];
        if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && p.y <= yLimit + 0.001 && p.y > best) best = p.y;
      }
    }
    return best;
  }
}

// 複数ジオメトリをマージ（プロトタイプ用）
export function mergeGeos(geos) {
  const g = mergeGeometries(geos, false);
  for (const x of geos) x.dispose();
  return g;
}

// 矩形からBoxGeometry（上面のみuv調整用に plane も併用可）
export function boxGeo(sx, sy, sz, cx = 0, cy = 0, cz = 0) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(cx, cy, cz);
  return g;
}

// 平面ジオメトリ(XZ平面, y=0)
export function groundGeo(sx, sz, cx = 0, cz = 0) {
  const g = new THREE.PlaneGeometry(sx, sz);
  g.rotateX(-Math.PI / 2);
  g.translate(cx, 0, cz);
  return g;
}

// テキストをcanvasに描いてテクスチャ化（看板・標示用）
export function textTexture(lines, opt = {}) {
  const w = opt.w || 512, h = opt.h || 256;
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = opt.bg || '#1c2b3d';
    ctx.fillRect(0, 0, w, h);
    if (opt.border) { ctx.strokeStyle = opt.border; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12); }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((ln, i) => {
      ctx.font = `${ln.bold ? '900' : '500'} ${ln.size || h / (n + 1.2)}px "Hiragino Sans", "Yu Gothic", sans-serif`;
      ctx.fillStyle = ln.color || '#fff';
      ctx.fillText(ln.text, w / 2, (h / n) * (i + 0.5));
    });
  });
}

// ---------- インスタンサー（机・椅子・席等の反復配置） ----------
export class Instancer {
  constructor() {
    this.defs = new Map();   // key -> {geo, mat}
    this.items = new Map();  // key -> {mats:[], count}
  }
  register(key, geo, mat) {
    this.defs.set(key, { geo, mat });
    this.items.set(key, []);
  }
  add(key, x, y, z, rotY = 0, s = 1, sy = null) {
    const arr = this.items.get(key);
    if (!arr) return;
    arr.push({ x, y, z, rotY, s, sy: sy === null ? s : sy });
  }
  build(parent, shadows = true) {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eu = new THREE.Euler();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    for (const [key, list] of this.items) {
      if (!list.length) continue;
      const def = this.defs.get(key);
      const inst = new THREE.InstancedMesh(def.geo, def.mat, list.length);
      list.forEach((it, i) => {
        eu.set(0, it.rotY, 0);
        q.setFromEuler(eu);
        p.set(it.x, it.y, it.z);
        sc.set(it.s, it.sy, it.s);
        m4.compose(p, q, sc);
        inst.setMatrixAt(i, m4);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = shadows;
      inst.receiveShadow = true;
      parent.add(inst);
    }
    this.items.clear();
  }
}
