// ============================================================
// materials.js — 共有マテリアル & テクスチャ
// ============================================================
import * as THREE from 'three';
import { canvasTexture, concreteTex } from './util.js';

const M = {};   // マテリアル（夜間windowLitで一部差し替え）

// ---------- テクスチャ ----------
export const TEX = {};

// 校舎南・北ファサード（帯窓 + 手摺 + 白ピア）を描く
// タイル = 1モジュール 8m × 1階分 4.48m → 256x144px で描き、縦に5回繰り返す
function facadeTexture(opts) {
  const w = 256, h = 144;
  return canvasTexture(w, h, (ctx) => {
    // 下地: 打放し風コンクリ
    ctx.fillStyle = opts.base;
    ctx.fillRect(0, 0, w, h);
    let s = 12345;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 500; i++) {
      const v = (rnd() - 0.5) * 14;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v / 70})` : `rgba(40,38,32,${-v / 70})`;
      ctx.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
    }
    // 白ピア（タイル両端）
    ctx.fillStyle = opts.pier;
    ctx.fillRect(0, 0, w * 0.055, h);
    ctx.fillRect(w * 0.945, 0, w * 0.055, h);
    // サッシ窓帯（横長リブン窓）
    const wy0 = h * 0.20, wy1 = h * 0.62;
    const g = ctx.createLinearGradient(0, wy0, 0, wy1);
    g.addColorStop(0, '#a8bfcc');
    g.addColorStop(0.45, '#33454f');
    g.addColorStop(1, '#1d2b34');
    ctx.fillStyle = g;
    ctx.fillRect(w * 0.055, wy0, w * 0.89, wy1 - wy0);
    // 窓桟(縦マリオン)
    ctx.fillStyle = 'rgba(22,28,32,0.9)';
    for (let i = 1; i < 6; i++) ctx.fillRect(w * 0.055 + (w * 0.89 / 6) * i - 1.2, wy0, 2.4, wy1 - wy0);
    // 手摺(外面)
    ctx.fillStyle = opts.rail;
    ctx.fillRect(w * 0.04, wy1 + 1, w * 0.92, 2.4);
    for (let x = w * 0.06; x < w * 0.94; x += 9) ctx.fillRect(x, wy1 + 3.4, 1.4, h * 0.14);
    ctx.fillRect(w * 0.04, wy1 + 3.4 + h * 0.14, w * 0.92, 1.8);
    // スパンドレル(床廻り腰壁)
    ctx.fillStyle = opts.spandrel;
    ctx.fillRect(w * 0.055, h * 0.80, w * 0.89, h * 0.20);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(w * 0.055, h - 3, w * 0.89, 3);
  }, { repeat: opts.repeat });
}

export function initMaterials(renderer) {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // --- 空用（ダミー） ---
  M.sky = null; // skyはシェーダーで直接

  // --- コンクリート・外装 ---
  const conc = concreteTex('#c9c4bb', 12);
  conc.wrapS = conc.wrapT = THREE.RepeatWrapping;

  M.concrete = new THREE.MeshStandardMaterial({ map: conc, roughness: 0.92, metalness: 0.0 });
  M.concreteDark = new THREE.MeshStandardMaterial({ color: 0x8e8a82, roughness: 0.95 });
  M.concreteWhite = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.9 });

  // --- 校舎ファサード（南: 濃いグリーングレーの帯 / 北: グレー帯） ---
  // タイル = 8m×4.48m(1階分) → 横12×縦5リピート
  TEX.facadeSouth = facadeTexture({
    base: '#b9b5aa', spandrel: '#687874', rail: '#c9c5bb', pier: '#d6d2c8',
    repeat: [12, 5],
  });
  TEX.facadeNorth = facadeTexture({
    base: '#c4c0b6', spandrel: '#74787a', rail: '#d0cdc3', pier: '#d9d6cc',
    repeat: [12, 5],
  });
  M.facadeSouth = new THREE.MeshStandardMaterial({ map: TEX.facadeSouth, roughness: 0.85 });
  M.facadeNorth = new THREE.MeshStandardMaterial({ map: TEX.facadeNorth, roughness: 0.85 });

  // --- ガラス（外用: 反射する暗色。透過はわずか） ---
  M.glassDark = new THREE.MeshStandardMaterial({
    color: 0x2a3d4a, roughness: 0.12, metalness: 0.75,
    envMapIntensity: 1.2, transparent: true, opacity: 0.94,
  });

  // --- LSの内側ガラス（見通せる透明ガラス） ---
  M.glassClear = new THREE.MeshPhysicalMaterial({
    color: 0xcfe4ee, roughness: 0.06, metalness: 0,
    transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    depthWrite: false,
  });
  M.glassRailing = new THREE.MeshPhysicalMaterial({
    color: 0xd6e8f0, roughness: 0.05, transparent: true, opacity: 0.22,
    side: THREE.DoubleSide, depthWrite: false,
  });

  // --- 膜屋根 ---
  M.membrane = new THREE.MeshStandardMaterial({
    color: 0xf4f7fa, roughness: 0.6, metalness: 0,
    transparent: true, opacity: 0.82, side: THREE.DoubleSide,
    emissive: 0xbfd4e6, emissiveIntensity: 0.18,
  });

  // --- 床・内装 ---
  const floorCol = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#b9b2a6';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(70,64,58,0.35)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
    for (let y = 0; y <= 256; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
    let s = 555;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(60,55,48,${rnd() * 0.08})`;
      ctx.fillRect(rnd() * 256, rnd() * 256, 2, 2);
    }
  });
  floorCol.wrapS = floorCol.wrapT = THREE.RepeatWrapping;
  M.floorSchool = new THREE.MeshStandardMaterial({ map: floorCol, roughness: 0.55, metalness: 0.05 });

  // LSのカラフルな床パタン（グラフィカル）
  M.floorLS = null; // build-interior でテクスチャ生成

  M.wallPaint = new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.95 });
  M.wallPaintWarm = new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: 0.95 });
  M.wallGreen = new THREE.MeshStandardMaterial({ color: 0x9fb4a8, roughness: 0.95 });
  M.ceiling = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.95 });

  // LSのカラフルな床（グラフィカルなパタン）
  const floorLS = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#b6b0a4';
    ctx.fillRect(0, 0, 512, 128);
    const cols = ['#c9803a', '#4e8fae', '#c9b13a', '#6aa06a', '#a05a8a', '#5a6ac0'];
    let s = 31337;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
      ctx.globalAlpha = 0.75;
      const w = 24 + rnd() * 90, h2 = 10 + rnd() * 26;
      ctx.fillRect(rnd() * 512, rnd() * (128 - h2), w, h2);
    }
    ctx.globalAlpha = 1;
    // 通路ライン
    ctx.fillStyle = 'rgba(240,238,230,0.5)';
    ctx.fillRect(0, 56, 512, 14);
    ctx.strokeStyle = 'rgba(70,64,58,0.25)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
  });
  floorLS.wrapS = floorLS.wrapT = THREE.RepeatWrapping;
  floorLS.repeat.set(12, 2);
  M.floorLS = new THREE.MeshStandardMaterial({ map: floorLS, roughness: 0.5, metalness: 0.05 });

  // その他
  M.solar = new THREE.MeshStandardMaterial({ color: 0x18243c, roughness: 0.25, metalness: 0.6 });
  M.pot = new THREE.MeshStandardMaterial({ color: 0x9a5a3a, roughness: 0.9 });
  M.steelWhite = new THREE.MeshStandardMaterial({ color: 0xdfe2e4, roughness: 0.4, metalness: 0.6 });
  M.evDoor = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.3, metalness: 0.85 });
  M.doorWood = new THREE.MeshStandardMaterial({ color: 0xb08d5f, roughness: 0.7 });
  M.bike = new THREE.MeshStandardMaterial({ color: 0x3a6ea8, roughness: 0.5, metalness: 0.4 });
  M.poolWall = new THREE.MeshStandardMaterial({ color: 0xbfd8dc, roughness: 0.6 });

  // --- 屋外地面 ---
  M.asphalt = new THREE.MeshStandardMaterial({ color: 0x3d4045, roughness: 0.98 });
  M.roadLine = new THREE.MeshBasicMaterial({ color: 0xe8e8e0 });
  M.sidewalk = new THREE.MeshStandardMaterial({ color: 0xa8a6a0, roughness: 0.95 });
  M.turf = new THREE.MeshStandardMaterial({ color: 0x3f7d38, roughness: 0.95 });
  const grass = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#4a8a3f';
    ctx.fillRect(0, 0, 128, 128);
    let s = 77;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(${30 + rnd() * 40 | 0},${110 + rnd() * 60 | 0},${25 + rnd() * 30 | 0},0.5)`;
      ctx.fillRect(rnd() * 128, rnd() * 128, 1.5, 1.5);
    }
  });
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
  grass.repeat.set(24, 18);
  M.grass = new THREE.MeshStandardMaterial({ map: grass, roughness: 0.98 });
  M.dirt = new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 1 });

  // --- 金属 ---
  M.steel = new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.35, metalness: 0.8 });
  M.steelDark = new THREE.MeshStandardMaterial({ color: 0x4a5258, roughness: 0.5, metalness: 0.7 });
  M.aluminum = new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.3, metalness: 0.85 });
  M.bronze = new THREE.MeshStandardMaterial({ color: 0x8c6b3d, roughness: 0.45, metalness: 0.7 });

  // --- 木 ---
  const wood = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#b98d5a';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(90,60,30,${0.08 + Math.random() * 0.1})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, i * 3.2 + Math.random() * 3);
      ctx.bezierCurveTo(40, i * 3.2 + Math.random() * 6, 90, i * 3.2 - Math.random() * 6, 128, i * 3.2);
      ctx.stroke();
    }
  });
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  M.wood = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 });
  M.woodSports = new THREE.MeshStandardMaterial({ color: 0xc49a62, roughness: 0.5 });

  // --- 植栽 ---
  M.trunk = new THREE.MeshStandardMaterial({ color: 0x6b5138, roughness: 1 });
  M.leaf = new THREE.MeshStandardMaterial({ color: 0x4d7c3a, roughness: 0.95 });
  M.leaf2 = new THREE.MeshStandardMaterial({ color: 0x5f8f43, roughness: 0.95 });
  M.leaf3 = new THREE.MeshStandardMaterial({ color: 0x3e6c33, roughness: 0.95 });
  M.hedge = new THREE.MeshStandardMaterial({ color: 0x446e34, roughness: 1 });

  // --- ネオン・発光 ---
  M.lightPanel = new THREE.MeshBasicMaterial({ color: 0xfff8e8 });
  M.lightPanelOff = new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.4 });
  M.windowLit = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });   // 夜の窓（置換用）
  M.dark = new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.9 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.95 });

  // 汎用カラー（ロー彩度）
  M.white = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.9 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x1e2125, roughness: 0.85 });
  M.chalk = new THREE.MeshStandardMaterial({ color: 0x2e5d45, roughness: 0.9 }); // 黒板(緑)
  M.fabric = new THREE.MeshStandardMaterial({ color: 0x51627c, roughness: 1 });
  M.fabric2 = new THREE.MeshStandardMaterial({ color: 0x8a4a4a, roughness: 1 });

  for (const k of ['facadeSouth', 'facadeNorth']) if (M[k] && M[k].map) M[k].map.anisotropy = maxAniso;
  return M;
}

export function getM() { return M; }

// 夜間の窓発光マテリアル差し替え用: facadeテクスチャの夜版を返す
export function facadeNightTexture(kind) {
  const w = 256, h = 256;
  return canvasTexture(w, h, (ctx) => {
    const base = kind === 'south' ? '#5c6660' : '#62665f';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const wy0 = h * 0.16, wy1 = h * 0.62;
    // 一部の窓だけ灯り
    let s = 424242;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 6; i++) {
      const lit = rnd() > 0.45;
      ctx.fillStyle = lit ? (rnd() > 0.5 ? '#ffd98c' : '#fff2cf') : '#1c2830';
      ctx.fillRect(w * 0.06 + (w * 0.88 / 6) * i, wy0, w * 0.88 / 6, wy1 - wy0);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, wy1 + h * 0.16, w, h);
  });
}
