// ============================================================
// build-interior.js — 校舎内装（教室・特別教室・大ホール・食堂・図書館…）
// ============================================================
import * as THREE from 'three';
import { CFG } from './config.js';
import { canvasTexture, textTexture, mergeGeos } from './util.js';

const S = CFG.school;
const LY = S.levelY;
const F = S.floorH;

// ベイ
const bayX = (i) => ({ x0: S.x0 + i * S.bay, x1: S.x0 + (i + 1) * S.bay, cx: S.x0 + (i + 0.5) * S.bay });

// 部屋テーブル
// type: classroom/cafeteria/library/hall/office/infirmary/music/art/lab/seminar/
//       presentation/commons/study/washoku/locked
const ROOMS = [
  // ---- 1F ----
  { f: 1, s: 'S', b0: 1, b1: 4, type: 'multispace', name: '多目的スペース' },
  { f: 1, s: 'S', b0: 5, b1: 7, type: 'commons', name: 'エントランスホール' },
  { f: 1, s: 'S', b0: 8, b1: 10, type: 'multispace', name: 'ゆとりスペース' },
  { f: 1, s: 'N', b0: 0, b1: 0, type: 'halllobby', name: 'ホールロビー' },
  { f: 1, s: 'N', b0: 1, b1: 5, type: 'hall', name: '大ホール' },
  { f: 1, s: 'N', b0: 6, b1: 6, type: 'staircore', name: '階段' },
  { f: 1, s: 'N', b0: 7, b1: 7, type: 'locked', name: '機械室' },
  { f: 1, s: 'N', b0: 8, b1: 9, type: 'office', name: '職員室・事務室' },
  { f: 1, s: 'N', b0: 10, b1: 10, type: 'infirmary', name: '保健室' },
  { f: 1, s: 'N', b0: 11, b1: 11, type: 'locked', name: '被服室' },
  // ---- 2F ----
  { f: 2, s: 'S', b0: 1, b1: 4, type: 'cafeteria', name: '食堂' },
  { f: 2, s: 'S', b0: 5, b1: 5, type: 'study', name: '自習室' },
  { f: 2, s: 'S', b0: 6, b1: 7, type: 'commons', name: '生徒ホール' },
  { f: 2, s: 'S', b0: 8, b1: 10, type: 'study', name: '自習室' },
  { f: 2, s: 'N', b0: 0, b1: 0, type: 'seminar', name: '小教室' },
  { f: 2, s: 'N', b0: 1, b1: 2, type: 'music', name: '音楽室' },
  { f: 2, s: 'N', b0: 3, b1: 3, type: 'locked', name: '音楽準備室' },
  { f: 2, s: 'N', b0: 4, b1: 9, type: 'library', name: 'ラーニングコモンズ' },
  { f: 2, s: 'N', b0: 10, b1: 11, type: 'seminar', name: '会議室・生徒会室' },
  // ---- 3F ----
  { f: 3, s: 'S', b0: 1, b1: 10, type: 'classroom', name: '普通教室' },
  { f: 3, s: 'N', b0: 0, b1: 0, type: 'seminar', name: '小教室' },
  { f: 3, s: 'N', b0: 1, b1: 2, type: 'lab', name: '理科実験室' },
  { f: 3, s: 'N', b0: 3, b1: 4, type: 'lab', name: '理科実験室' },
  { f: 3, s: 'N', b0: 5, b1: 5, type: 'locked', name: '理科準備室' },
  { f: 3, s: 'N', b0: 6, b1: 7, type: 'commons', name: 'コモンロビー' },
  { f: 3, s: 'N', b0: 8, b1: 9, type: 'seminar', name: 'セミナー室' },
  { f: 3, s: 'N', b0: 10, b1: 11, type: 'office', name: '職員室' },
  // ---- 4F ----
  { f: 4, s: 'S', b0: 1, b1: 10, type: 'classroom', name: '普通教室' },
  { f: 4, s: 'N', b0: 0, b1: 0, type: 'seminar', name: '小教室' },
  { f: 4, s: 'N', b0: 1, b1: 2, type: 'art', name: '美術室' },
  { f: 4, s: 'N', b0: 3, b1: 3, type: 'locked', name: '美術準備室' },
  { f: 4, s: 'N', b0: 4, b1: 5, type: 'seminar', name: 'セミナー室' },
  { f: 4, s: 'N', b0: 6, b1: 8, type: 'presentation', name: 'プレゼンテーションルーム' },
  { f: 4, s: 'N', b0: 9, b1: 10, type: 'study', name: '小教室' },
  { f: 4, s: 'N', b0: 11, b1: 11, type: 'locked', name: '印刷室' },
  // ---- 5F ----
  { f: 5, s: 'S', b0: 1, b1: 10, type: 'classroom', name: '普通教室' },
  { f: 5, s: 'N', b0: 0, b1: 0, type: 'seminar', name: '小教室' },
  { f: 5, s: 'N', b0: 1, b1: 2, type: 'washoku', name: '和室・書道室' },
  { f: 5, s: 'N', b0: 3, b1: 5, type: 'seminar', name: 'セミナー室' },
  { f: 5, s: 'N', b0: 6, b1: 9, type: 'study', name: '自習室・ラーニングコモンズ分室' },
  { f: 5, s: 'N', b0: 10, b1: 10, type: 'seminar', name: '部室' },
  { f: 5, s: 'N', b0: 11, b1: 11, type: 'locked', name: '倉庫' },
];

// ---------- プロトタイプジオメトリ ----------
function deskGeo() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(0.62, 0.035, 0.42).translate(0, 0.72, 0));
  for (const [lx, lz] of [[-0.27, -0.16], [0.27, -0.16], [-0.27, 0.16], [0.27, 0.16]]) {
    parts.push(new THREE.BoxGeometry(0.035, 0.72, 0.035).translate(lx, 0.36, lz));
  }
  parts.push(new THREE.BoxGeometry(0.6, 0.2, 0.02).translate(0, 0.52, -0.2)); // フック板
  return mergeGeos(parts);
}
function chairGeo() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(0.38, 0.045, 0.36).translate(0, 0.43, 0));
  parts.push(new THREE.BoxGeometry(0.36, 0.42, 0.035).translate(0, 0.65, -0.17));
  for (const [lx, lz] of [[-0.16, -0.14], [0.16, -0.14], [-0.16, 0.14], [0.16, 0.14]]) {
    parts.push(new THREE.BoxGeometry(0.032, 0.43, 0.032).translate(lx, 0.215, lz));
  }
  return mergeGeos(parts);
}
function lockerGeo() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(0.36, 0.92, 0.48));
  parts.push(new THREE.BoxGeometry(0.3, 0.008, 0.012).translate(0, 0.55, 0.245));
  parts.push(new THREE.BoxGeometry(0.3, 0.008, 0.012).translate(0, 0.3, 0.245));
  return mergeGeos(parts);
}
function seatGeo() {
  // ホール固定椅子上部（脚は省略、支持柱を別で）
  const parts = [];
  parts.push(new THREE.BoxGeometry(0.48, 0.05, 0.42).translate(0, 0.44, 0));
  parts.push(new THREE.BoxGeometry(0.48, 0.5, 0.05).translate(0, 0.68, -0.2));
  parts.push(new THREE.BoxGeometry(0.06, 0.42, 0.4).translate(0, 0.21, 0));
  return mergeGeos(parts);
}
function shelfGeo() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(1.8, 2.0, 0.44));
  return mergeGeos(parts);
}
function table8Geo() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(1.7, 0.05, 0.95).translate(0, 0.73, 0));
  for (const lx of [-0.75, 0.75]) parts.push(new THREE.BoxGeometry(0.06, 0.72, 0.06).translate(lx, 0.36, 0));
  for (const lz of [-0.62, 0.62]) parts.push(new THREE.BoxGeometry(1.7, 0.04, 0.3).translate(0, 0.45, lz));
  return mergeGeos(parts);
}
function stoolGeo() {
  const parts = [];
  parts.push(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 10).translate(0, 0.62, 0));
  parts.push(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 8).translate(0, 0.31, 0));
  parts.push(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 10).translate(0, 0.01, 0));
  return mergeGeos(parts);
}
function pianoGeo() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(1.5, 0.35, 1.05).translate(0, 0.85, 0));
  parts.push(new THREE.BoxGeometry(1.45, 0.08, 0.3).translate(0, 0.74, 0.35)); // 鍵盤
  parts.push(new THREE.BoxGeometry(1.4, 0.015, 0.9).rotateX(-0.5).translate(0, 1.25, -0.25)); // 蓋
  for (const [lx, lz] of [[-0.62, -0.4], [0.62, -0.4], [-0.62, 0.4], [0.62, 0.4]]) {
    parts.push(new THREE.BoxGeometry(0.09, 0.68, 0.09).translate(lx, 0.34, lz));
  }
  parts.push(new THREE.BoxGeometry(1.3, 0.06, 0.25).translate(0, 0.28, 0.75)); // ペダル台
  return mergeGeos(parts);
}
function easelGeo() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(0.05, 1.6, 0.05).rotateX(0.12).translate(0, 0.8, -0.18));
  parts.push(new THREE.BoxGeometry(0.05, 1.7, 0.05).rotateX(-0.12).translate(-0.3, 0.85, 0.1));
  parts.push(new THREE.BoxGeometry(0.05, 1.7, 0.05).rotateX(-0.12).translate(0.3, 0.85, 0.1));
  parts.push(new THREE.BoxGeometry(0.7, 0.9, 0.03).rotateX(-0.12).translate(0, 1.05, 0.02)); // カンヴァス
  return mergeGeos(parts);
}
function bedGeo() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(0.95, 0.18, 2.0).translate(0, 0.4, 0));
  parts.push(new THREE.BoxGeometry(0.9, 0.1, 1.75).translate(0, 0.54, 0.05)); // マットレス
  parts.push(new THREE.BoxGeometry(0.55, 0.09, 0.32).translate(0, 0.62, -0.72)); // 枕
  parts.push(new THREE.BoxGeometry(0.88, 0.06, 1.0).translate(0, 0.6, 0.4)); // ブランケット
  return mergeGeos(parts);
}
function sofaGeo() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(1.9, 0.22, 0.75).translate(0, 0.32, 0));
  parts.push(new THREE.BoxGeometry(1.9, 0.45, 0.18).translate(0, 0.62, -0.29));
  for (const lx of [-0.88, 0.88]) parts.push(new THREE.BoxGeometry(0.14, 0.32, 0.7).translate(lx, 0.56, 0));
  return mergeGeos(parts);
}

// 黒板用チョークテクスチャ
let chalkTexCache = null;
function chalkTex() {
  if (chalkTexCache) return chalkTexCache;
  chalkTexCache = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#2e5d45';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.font = '24px Georgia, serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('f(x) = ax² + bx + c', 24, 40);
    ctx.fillText('提出: 月曜まで', 24, 78);
    ctx.fillText('日直: 当番', 24, 112);
    ctx.beginPath();
    ctx.moveTo(280, 30); ctx.lineTo(430, 30); ctx.lineTo(430, 60); ctx.lineTo(280, 60); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(300, 95); ctx.quadraticCurveTo(360, 70, 420, 100); ctx.stroke();
    // 古いチョーク痕
    let s = 8;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.08})`;
      ctx.fillRect(rnd() * 512, rnd() * 128, 3 + rnd() * 8, 1);
    }
  });
  return chalkTexCache;
}

// 室内壁（窓帯つき）テクスチャ
let interiorWallTexCache = null;
function interiorWallTex() {
  if (interiorWallTexCache) return interiorWallTexCache;
  interiorWallTexCache = canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = '#edeae2';
    ctx.fillRect(0, 0, 512, 256);
    // カーテンボックス
    ctx.fillStyle = '#d8d4c8';
    ctx.fillRect(0, 54, 512, 12);
    // 窓帯
    const g = ctx.createLinearGradient(0, 66, 0, 156);
    g.addColorStop(0, '#b8ccd8');
    g.addColorStop(0.5, '#54707e');
    g.addColorStop(1, '#33454f');
    ctx.fillStyle = g;
    ctx.fillRect(10, 66, 492, 90);
    // カーテン（両端）
    ctx.fillStyle = 'rgba(230,225,210,0.92)';
    ctx.fillRect(10, 66, 52, 90);
    ctx.fillRect(450, 66, 52, 90);
    ctx.fillStyle = 'rgba(190,185,170,0.5)';
    for (let x = 14; x < 62; x += 8) ctx.fillRect(x, 66, 2, 90);
    for (let x = 454; x < 502; x += 8) ctx.fillRect(x, 66, 2, 90);
    // 壁
    ctx.fillStyle = '#edeae2';
    ctx.fillRect(0, 156, 512, 100);
    ctx.fillStyle = '#ddd8cc';
    ctx.fillRect(0, 246, 512, 10);
  });
  return interiorWallTexCache;
}

// 部屋名の看板マテリアル（キャッシュ）
const nameMatCache = new Map();
function nameMat(text) {
  if (nameMatCache.has(text)) return nameMatCache.get(text);
  const tex = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#f4f6f8';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#275d92';
    ctx.fillRect(0, 0, 512, 22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 52px "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.fillStyle = '#1c2b3d';
    ctx.fillText(text, 256, 78);
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  nameMatCache.set(text, m);
  return m;
}

// ============================================================
export function buildInterior(ctx) {
  const { M, batch, addCol, addFloor, inst } = ctx;

  // プロトタイプ登録
  inst.register('desk', deskGeo(), M.wood);
  inst.register('chair', chairGeo(), M.fabric);
  inst.register('locker', lockerGeo(), M.steelDark);
  inst.register('seat', seatGeo(), M.fabric2);
  inst.register('shelf', shelfGeo(), ctx.signMats.bookshelf);
  inst.register('table8', table8Geo(), M.wood);
  inst.register('stool', stoolGeo(), M.steel);
  inst.register('piano', pianoGeo(), M.black);
  inst.register('easel', easelGeo(), M.wood);
  inst.register('bed', bedGeo(), M.white);
  inst.register('sofa', sofaGeo(), M.fabric);

  const chalkMat = new THREE.MeshStandardMaterial({ map: chalkTex(), roughness: 0.9 });
  const interiorWallMat = new THREE.MeshStandardMaterial({ map: interiorWallTex(), roughness: 0.95 });

  // 壁（x走り: z一定）
  const wallX = (z, x0, x1, y0, h, mat, gaps = [], thick = 0.14, key = 'wallIn') => {
    let cur = x0;
    const segs = [];
    for (const [g0, g1] of gaps.sort((a, b) => a[0] - b[0])) {
      if (g0 > cur) segs.push([cur, g0]);
      cur = Math.max(cur, g1);
    }
    if (cur < x1) segs.push([cur, x1]);
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.02) continue;
      batch.box(key, mat, (s0 + s1) / 2, y0 + h / 2, z, s1 - s0, h, thick, 0, 3);
      addCol(s0, y0, z - thick / 2 - 0.02, s1, y0 + h, z + thick / 2 + 0.02);
    }
    return segs;
  };
  // 壁（z走り: x一定）
  const wallZ = (x, z0, z1, y0, h, mat, gaps = [], thick = 0.14, key = 'wallIn') => {
    let cur = z0;
    const segs = [];
    for (const [g0, g1] of gaps.sort((a, b) => a[0] - b[0])) {
      if (g0 > cur) segs.push([cur, g0]);
      cur = Math.max(cur, g1);
    }
    if (cur < z1) segs.push([cur, z1]);
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.02) continue;
      batch.box(key, mat, x, y0 + h / 2, (s0 + s1) / 2, thick, h, s1 - s0, 0, 3);
      addCol(x - thick / 2 - 0.02, y0, s0, x + thick / 2 + 0.02, y0 + h, s1);
    }
    return segs;
  };
  // 室内灯
  const roomLights = (x0, x1, z0, z1, y, nX = 2, nZ = 3) => {
    for (let i = 0; i < nX; i++) for (let j = 0; j < nZ; j++) {
      const lx = x0 + ((x1 - x0) * (i + 0.5)) / nX;
      const lz = z0 + ((z1 - z0) * (j + 0.5)) / nZ;
      batch.box('lightP', M.lightPanel, lx, y - 0.06, lz, 1.3, 0.05, 0.34, 0, 0);
    }
  };
  // 天井
  const roomCeil = (x0, x1, z0, z1, y) => {
    batch.add('ceil', M.ceiling, new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), null, 2);
  };
  // 背面（ファサード側）内装壁
  const roomBackWall = (side, x0, x1, y0, h) => {
    const z = side === 'S' ? S.sZ1 - 0.12 : S.nZ0 + 0.12;
    const g = new THREE.PlaneGeometry(x1 - x0, h);
    if (side === 'S') g.rotateY(Math.PI);
    g.translate((x0 + x1) / 2, y0 + h / 2, z);
    batch.add('wallIn', interiorWallMat, g, null, 0);
  };
  // 部屋名札（1F・廊下側）
  const doorPlate = (side, x, y, z, name) => {
    const g = new THREE.PlaneGeometry(1.15, 0.3);
    if (side === 'S') g.rotateY(Math.PI);
    g.translate(x, y, z);
    batch.add('plate_' + name, nameMat(name), g, null, 0);
  };

  // 部屋ごとの境界（隣接同type部屋は壁を skipping しない: 教室は毎ベイ区切る）
  const roomBounds = (r) => {
    const x0 = bayX(r.b0).x0, x1 = bayX(r.b1).x1;
    const z0 = r.s === 'S' ? S.sZ0 : S.nZ0;
    const z1 = r.s === 'S' ? S.sZ1 : S.nZ1;
    return { x0, x1, z0, z1 };
  };

  for (const r of ROOMS) {
    if (r.type === 'staircore') continue;
    const { x0, x1, z0, z1 } = roomBounds(r);
    const y = LY[r.f - 1];
    const h = F[r.f - 1] - 0.2;
    const ceilY = y + F[r.f - 1] - 0.12;
    const corridorZ = r.s === 'S' ? S.sZ0 : S.nZ1;   // 廊下(LS)側の壁位置
    const doorZ = corridorZ + (r.s === 'S' ? 0 : 0); // 扉はこの壁
    const inward = r.s === 'S' ? 1 : -1;

    // ---- 隔壁（東西） ----
    for (const wx of [x0, x1]) {
      // bay0/bay11の外側は端壁があるので外側は不要…だが内側は必要
      if ((r.b0 === 0 && wx === S.x0) || (r.b1 === 11 && wx === S.x1)) continue;
      // 隣の部屋が同typeの教室なら仕切りを細くする（同じでOK）
      wallZ(wx, z0 + 0.2, z1 - 0.2, y, h, M.wallPaint, [], 0.14);
    }
    // ---- 背面内装壁 ----
    roomBackWall(r.s, x0, x1, y, h);
    // ---- 廊下側の壁 ----
    if (r.f === 1) {
      // 1F: 壁 + 扉開口（ドアベイ）
      const gaps = [];
      for (let b = r.b0; b <= r.b1; b++) {
        const doors = r.s === 'S' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [1, 3, 5, 6, 7, 9, 11];
        if (doors.includes(b)) {
          const cx = bayX(b).cx;
          if (r.type !== 'locked') gaps.push([cx - 0.9, cx + 0.9]);
        }
      }
      wallX(corridorZ, x0, x1, y, h, M.wallPaintWarm, gaps, 0.18);
      // 扉（開口枠＋開いた扉）
      for (let b = r.b0; b <= r.b1; b++) {
        const doors = r.s === 'S' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [1, 3, 5, 6, 7, 9, 11];
        if (!doors.includes(b)) continue;
        const cx = bayX(b).cx;
        if (r.type === 'locked') {
          // 閉まった扉
          const dg = new THREE.PlaneGeometry(1.8, 2.3);
          if (r.s === 'S') dg.rotateY(Math.PI);
          dg.translate(cx, y + 1.15, corridorZ - inward * 0.12);
          batch.add('doorC', M.doorWood, dg, null, 0);
          addCol(cx - 0.95, y, corridorZ - 0.18, cx + 0.95, y + 2.4, corridorZ + 0.18);
        } else {
          const dg = new THREE.BoxGeometry(0.86, 2.2, 0.05);
          dg.rotateY(inward * 0.5);
          dg.translate(cx - 0.4, y + 1.1, corridorZ - inward * 0.14);
          batch.add('doorO', M.doorWood, dg, null, 0);
        }
        doorPlate(r.s, cx + 1.25, y + 2.35, corridorZ - inward * 0.1, r.name);
      }
    } else {
      // 2F以上: ガラス壁の腰壁は build-school 済み。室内側に薄いカーテン表现は省略
    }

    // ---- キット ----
    const kit = r.type;
    if (kit === 'classroom') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 3);
      // 黒板（西壁内側）
      const bb = new THREE.PlaneGeometry(4.4, 1.25);
      bb.rotateY(Math.PI / 2);
      bb.translate(x0 + 0.1, y + 1.75, (z0 + z1) / 2 - 2);
      batch.add('bb', chalkMat, bb, null, 0);
      batch.box('wood', M.wood, x0 + 0.16, y + 1.02, (z0 + z1) / 2 - 2, 0.09, 0.09, 4.5, 0, 0);
      // 時計
      const cg = new THREE.PlaneGeometry(0.42, 0.42);
      cg.rotateY(Math.PI / 2);
      cg.translate(x0 + 0.12, y + 2.95, (z0 + z1) / 2 + 0.5);
      batch.add('clk', ctx.signMats.clock[(r.f + r.b0) % 4], cg, null, 0);
      // 教卓
      inst.add('desk', x0 + 1.7, y, z0 + 4.5, Math.PI / 2, 1.25);
      inst.add('chair', x0 + 2.5, y, z0 + 4.5, -Math.PI / 2);
      // 生徒机・椅子（4列×6列）
      for (let rx = 0; rx < 4; rx++) {
        for (let cz = 0; cz < 6; cz++) {
          const dx = x0 + 3.1 + rx * 1.15;
          const dz = z0 + 1.8 + cz * 1.9;
          inst.add('desk', dx, y, dz, Math.PI / 2);
          inst.add('chair', dx + 0.62, y, dz, -Math.PI / 2);
        }
      }
      // ロッカー（廊下側ガラスの腰壁に沿って）
      for (let l = 0; l < 7; l++) {
        inst.add('locker', x0 + 5.6 + l * 0.4, y, corridorZ + inward * 0.36, 0);
      }
      // 掲示板（背面壁）
      const bg = new THREE.PlaneGeometry(1.6, 1.2);
      if (r.s === 'S') bg.rotateY(Math.PI);
      bg.translate((x0 + x1) / 2 + 1.5, y + 1.9, r.s === 'S' ? z1 - 0.16 : z0 + 0.16);
      batch.add('bd', ctx.signMats.board, bg, null, 0);
    } else if (kit === 'hall') {
      // 大ホール（天井高く…1Fなので5m）
      roomCeil(x0, x1, z0, z1, ceilY);
      // 音響パネル（背面壁に色とりどり）
      const cols = [M.fabric, M.fabric2, M.wallGreen, M.concreteDark];
      for (let i = 0; i < 10; i++) {
        const pz = z0 + 1 + i * 1.5;
        batch.box('ac', cols[i % 4], x0 + 3 + (i % 2) * 26, y + 2.6, pz, 0.1, 2.2, 1.3, 0, 0);
      }
      // ステージ（西端、高さ0.75）
      batch.box('stage', M.woodSports, x0 + 0.2, y + 0.38, (z0 + z1) / 2, 6.4, 0.75, z1 - z0 - 1.0, 0, 3);
      addCol(x0, y, z0 + 0.5, x0 + 6.4, y + 0.76, z1 - 0.5);
      addFloor(x0 + 0.4, x0 + 6.0, z0 + 0.7, z1 - 0.7, y + 0.76);
      // ステージ前の階段（3段）
      for (let st = 0; st < 3; st++) {
        batch.box('stage', M.woodSports, x0 + 6.4 + st * 0.4 + 0.2, y + 0.12 * (3 - st), (z0 + z1) / 2, 0.42, 0.25 * (3 - st), 3.4, 0, 3);
        addFloor(x0 + 6.4 + st * 0.4, x0 + 6.8 + st * 0.4, (z0 + z1) / 2 - 1.7, (z0 + z1) / 2 + 1.7, y + 0.25 * (3 - st));
      }
      // 緞帳（赤いドレープ）
      const drapeTex = canvasTexture(256, 128, (ctx) => {
        for (let x = 0; x < 256; x += 16) {
          const g = ctx.createLinearGradient(x, 0, x + 16, 0);
          g.addColorStop(0, '#7a1a1a'); g.addColorStop(0.5, '#a82828'); g.addColorStop(1, '#5e1414');
          ctx.fillStyle = g;
          ctx.fillRect(x, 0, 16, 128);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, 256, 14);
      });
      const drape = new THREE.PlaneGeometry(z1 - z0 - 1.0, 4.3);
      drape.rotateY(Math.PI / 2);
      drape.translate(x0 + 6.6, y + 2.9, (z0 + z1) / 2);
      batch.add('drape', new THREE.MeshStandardMaterial({ map: drapeTex, roughness: 0.9 }), drape, null, 0);
      // 客席（12行×20、南側に通路を残す）
      const seatZ0 = z0 + 1.6, seatZ1 = z1 - 4.6;
      for (let row = 0; row < 12; row++) {
        const sx = x0 + 8.4 + row * 2.35;
        // 行ごとの支持梁
        batch.box('steelD', M.steelDark, sx, y + 0.28, (seatZ0 + seatZ1) / 2, 0.12, 0.55, seatZ1 - seatZ0, 0, 0);
        const nSeats = Math.floor((seatZ1 - seatZ0) / 0.52);
        for (let c2 = 0; c2 < nSeats; c2++) {
          const sz = seatZ0 + 0.3 + c2 * 0.52;
          inst.add('seat', sx, y + 0.55, sz, Math.PI / 2);
        }
        // 行のコリダ（座席範囲のみ）
        addCol(sx - 0.3, y, seatZ0, sx + 0.3, y + 0.5, seatZ1);
      }
      roomLights(x0 + 8, x1, z0, z1, ceilY, 2, 3);
    } else if (kit === 'halllobby') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 1, 2);
      inst.add('sofa', x0 + 3, y, z0 + 8, Math.PI / 2);
      const bg = new THREE.PlaneGeometry(1.8, 1.3);
      bg.rotateY(Math.PI / 2);
      bg.translate(x1 - 0.14, y + 1.7, z0 + 8);
      batch.add('bd2', ctx.signMats.board, bg, null, 0);
    } else if (kit === 'cafeteria') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 3, 4);
      // カウンター（背面）
      batch.box('cnt', M.steel, (x0 + x1) / 2, y + 0.47, z1 - 0.8, x1 - x0 - 3, 0.94, 0.7, 0, 3);
      addCol(x0 + 1.5, y, z1 - 1.2, x1 - 1.5, y + 0.95, z1 - 0.4);
      // メニューボード
      const mb = new THREE.PlaneGeometry(6.5, 1.1);
      mb.rotateY(Math.PI);
      mb.translate((x0 + x1) / 2, y + 2.3, z1 - 0.18);
      batch.add('menu', nameMat('本日のメニュー A定食 380円'), mb, null, 0);
      // テーブル
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        inst.add('table8', x0 + 2.2 + i * 3.2, y, z0 + 3 + j * 4.4, 0);
        addCol(x0 + 1.2 + i * 3.2, y, z0 + 2.4 + j * 4.4, x0 + 3.2 + i * 3.2, y + 0.9, z0 + 3.6 + j * 4.4);
      }
      // 卓上の水ピッチャー風
    } else if (kit === 'library') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 4, 3);
      // 書架（2列×11連）
      for (let row = 0; row < 3; row++) {
        const sx = x0 + 2.2 + row * 3.4;
        for (let u = 0; u < 10; u++) {
          const sz = z0 + 1.6 + u * 1.85;
          inst.add('shelf', sx, y, sz, 0);
        }
        addCol(sx - 0.95, y, z0 + 1.0, sx + 0.95, y + 2.0, z1 - 0.8);
      }
      // 閲覧テーブル
      for (let i = 0; i < 3; i++) {
        inst.add('table8', x0 + 13 + i * 3.4, y, z0 + 5 + (i % 2) * 7, 0);
        for (let c2 = 0; c2 < 3; c2++) {
          inst.add('chair', x0 + 12.2 + i * 3.4, y, z0 + 4 + c2 * 2.2, -Math.PI / 2);
          inst.add('chair', x0 + 13.8 + i * 3.4, y, z0 + 4 + c2 * 2.2, Math.PI / 2);
        }
      }
      // カウンター
      batch.box('cnt', M.wood, x1 - 3, y + 0.55, corridorZ + inward * 2.2, 3.6, 1.1, 0.6, 0, 3);
      addCol(x1 - 4.8, y, corridorZ + inward * 1.8, x1 - 1.2, y + 1.1, corridorZ + inward * 2.6);
    } else if (kit === 'office') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 3);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const dx = x0 + 1.6 + i * 2.2, dz = z0 + 3 + j * 6;
        inst.add('desk', dx, y, dz, Math.PI / 2, 1.15);
        inst.add('chair', dx - 0.7, y, dz, Math.PI / 2);
        batch.box('panel', M.wallGreen, dx + 1.05, y + 0.75, dz, 0.06, 1.1, 1.6, 0, 0);
        addCol(dx + 0.95, y, dz - 0.85, dx + 1.15, y + 1.3, dz + 0.85);
      }
      // ロッカー・キャビネット
      for (let l = 0; l < 6; l++) inst.add('locker', x0 + 1 + l * 0.42, y, z1 - 0.5, 0, 1.4, 2.1);
      const bg = new THREE.PlaneGeometry(2.2, 1.4);
      if (r.s === 'N') bg.rotateY(0);
      bg.translate((x0 + x1) / 2, y + 2.2, r.s === 'S' ? z1 - 0.16 : z0 + 0.16);
      batch.add('bd3', ctx.signMats.board, bg, null, 0);
    } else if (kit === 'infirmary') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 1, 2);
      for (let i = 0; i < 3; i++) {
        inst.add('bed', x0 + 1.4, y, z0 + 2 + i * 2.6, Math.PI / 2);
        addCol(x0 + 0.9, y, z0 + 1.1 + i * 2.6, x0 + 1.9, y + 0.7, z0 + 2.9 + i * 2.6);
      }
      batch.box('cab', M.white, x1 - 1.5, y + 1.0, corridorZ + inward * 0.5, 2.4, 2.0, 0.5, 0, 3);
      addCol(x1 - 2.7, y, corridorZ, x1 - 0.3, y + 2.0, corridorZ + inward * 0.8);
    } else if (kit === 'music') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 2);
      inst.add('piano', x0 + 2, y, (z0 + z1) / 2 + 3, -Math.PI / 2);
      addCol(x0 + 1.1, y, (z0 + z1) / 2 + 1.4, x0 + 3.2, y + 1.3, (z0 + z1) / 2 + 4.6);
      // 合唱椅子
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        inst.add('chair', x0 + 4 + i * 1.0, y, z0 + 3.5 + j * 1.4, Math.PI / 2);
      }
    } else if (kit === 'art') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 2);
      for (let i = 0; i < 5; i++) {
        inst.add('easel', x0 + 2 + (i % 3) * 2.0, y, z0 + 2.5 + Math.floor(i / 3) * 6, Math.PI / 2 + (i - 2) * 0.14);
      }
      for (let i = 0; i < 2; i++) {
        batch.box('bench', M.wood, x1 - 3.4, y + 0.4, z0 + 3 + i * 7, 3.2, 0.08, 0.9, 0, 3);
        for (const lz of [z0 + 2.7 + i * 7, z0 + 3.3 + i * 7]) batch.box('bench', M.wood, x1 - 3.4, y + 0.2, lz, 3.2, 0.4, 0.08, 0, 0);
        addCol(x1 - 5.0, y, z0 + 2.5 + i * 7, x1 - 1.8, y + 0.5, z0 + 3.5 + i * 7);
      }
      // 作品（壁に色紙）
      const artCols = ['#c85a54', '#5a8ac8', '#c8a94e', '#6ab08a', '#9a6ab8'];
      for (let i = 0; i < 5; i++) {
        const ag = new THREE.PlaneGeometry(0.7, 0.7);
        if (r.s === 'N') ag.rotateY(0);
        ag.translate(x0 + 1.5 + i * 1.4, y + 2.2, r.s === 'S' ? z1 - 0.18 : z0 + 0.18);
        batch.add('art' + i, new THREE.MeshStandardMaterial({ color: artCols[i], roughness: 0.9 }), ag, null, 0);
      }
    } else if (kit === 'lab') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 3);
      // 島型実験台
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const bx = x0 + 2.6 + i * 3.2, bz = z0 + 3.5 + j * 5.5;
        batch.box('bench', M.dark, bx, y + 0.45, bz, 2.6, 0.9, 1.1, 0, 3);
        addCol(bx - 1.3, y, bz - 0.55, bx + 1.3, y + 0.9, bz + 0.55);
        for (const so of [-0.8, 0.8]) inst.add('stool', bx + so, y, bz + 1.0, 0);
        // 薬品瓶
        for (let b2 = 0; b2 < 4; b2++) {
          batch.box('btl', [M.leaf2, M.fabric2, M.steel, M.chalk][(i + j + b2) % 4], bx - 0.9 + b2 * 0.55, y + 1.0, bz, 0.12, 0.2, 0.12, 0, 0);
        }
      }
      const bb2 = new THREE.PlaneGeometry(4.4, 1.25);
      bb2.rotateY(Math.PI / 2);
      bb2.translate(x0 + 0.1, y + 1.75, (z0 + z1) / 2);
      batch.add('bb2', chalkMat, bb2, null, 0);
    } else if (kit === 'seminar') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 3);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const dx = x0 + 2 + i * 1.8, dz = z0 + 3 + j * 2.6;
          inst.add('table8', dx, y, dz, Math.PI / 2);
          inst.add('chair', dx - 0.65, y, dz, Math.PI / 2);
          inst.add('chair', dx + 0.65, y, dz, -Math.PI / 2);
        }
      }
    } else if (kit === 'presentation') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 4);
      // スクリーン（西壁）
      const scr = new THREE.PlaneGeometry(4.6, 2.6);
      scr.rotateY(Math.PI / 2);
      scr.translate(x0 + 0.14, y + 2.2, (z0 + z1) / 2);
      batch.add('scr', M.white, scr, null, 0);
      batch.box('scrF', M.steelDark, x0 + 0.1, y + 3.6, (z0 + z1) / 2, 0.12, 0.1, 4.8, 0, 0);
      // ロングテーブル
      for (let i = 0; i < 4; i++) {
        const dz = z0 + 2.5 + i * 3.2;
        batch.box('bench', M.wood, (x0 + x1) / 2 + 1, y + 0.38, dz, 5.0, 0.08, 0.75, 0, 3);
        addCol((x0 + x1) / 2 - 1.5, y, dz - 0.4, (x0 + x1) / 2 + 3.5, y + 0.45, dz + 0.4);
        for (let c2 = 0; c2 < 5; c2++) {
          inst.add('chair', x0 + 2 + c2 * 1.2, y, dz + 0.75, Math.PI);
        }
      }
    } else if (kit === 'commons') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 3);
      // 自販機
      const vg = new THREE.BoxGeometry(1.0, 1.9, 0.75);
      vg.rotateY(Math.PI / 2);
      vg.translate(x1 - 1.4, y + 0.95, z1 - 2.5);
      batch.add('vA', ctx.signMats.vendingA, vg, null, 3);
      const vg2 = new THREE.BoxGeometry(1.0, 1.9, 0.75);
      vg2.rotateY(Math.PI / 2);
      vg2.translate(x1 - 1.4, y + 0.95, z1 - 3.7);
      batch.add('vB', ctx.signMats.vendingB, vg2, null, 3);
      addCol(x1 - 1.9, y, z1 - 4.2, x1 - 0.9, y + 1.9, z1 - 2.0);
      // ソファ・テーブル
      inst.add('sofa', x0 + 3, y, z0 + 5, Math.PI / 2);
      inst.add('sofa', x0 + 6, y, z0 + 5, Math.PI / 2);
      inst.add('table8', x0 + 4.5, y, z0 + 5, Math.PI / 2);
      // 掲示板
      const bg = new THREE.PlaneGeometry(2.4, 1.5);
      if (r.s === 'S') bg.rotateY(Math.PI);
      bg.translate((x0 + x1) / 2, y + 2.0, r.s === 'S' ? z1 - 0.18 : z0 + 0.18);
      batch.add('bd4', ctx.signMats.board, bg, null, 0);
    } else if (kit === 'study') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 3);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
        const dx = x0 + 1.8 + i * 2.2, dz = z0 + 2.5 + j * 2.8;
        inst.add('desk', dx, y, dz, Math.PI / 2);
        inst.add('chair', dx - 0.65, y, dz, Math.PI / 2);
      }
      // 本棚
      for (let u = 0; u < 6; u++) inst.add('shelf', x0 + 1, y, z0 + 1.4 + u * 1.85, Math.PI / 2);
    } else if (kit === 'multispace') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 3);
      // 備え付けロッカー + 長椅子
      for (let l = 0; l < 10; l++) inst.add('locker', x0 + 0.8 + l * 0.4, y, z1 - 0.5, 0);
      for (let i = 0; i < 3; i++) inst.add('sofa', x0 + 2.5 + i * 2.1, y, z0 + 4, Math.PI / 2);
    } else if (kit === 'washoku') {
      roomCeil(x0, x1, z0, z1, ceilY);
      roomLights(x0, x1, z0, z1, ceilY, 2, 2);
      // 畳
      const tatami = canvasTexture(128, 256, (ctx) => {
        ctx.fillStyle = '#9aa86a';
        ctx.fillRect(0, 0, 128, 256);
        ctx.strokeStyle = 'rgba(50,60,30,0.35)';
        for (let y = 0; y < 256; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
        ctx.strokeStyle = '#2a3220'; ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 124, 252);
      });
      const tg = new THREE.PlaneGeometry(x1 - x0 - 0.6, z1 - z0 - 1.0);
      tg.rotateX(-Math.PI / 2);
      tg.translate((x0 + x1) / 2, y + 0.03, (z0 + z1) / 2);
      batch.add('tatami', new THREE.MeshStandardMaterial({ map: tatami, roughness: 0.95 }), tg, null, 2);
      // 低い机
      for (let i = 0; i < 4; i++) {
        batch.box('lowT', M.wood, x0 + 2.5 + (i % 2) * 3.2, y + 0.32, z0 + 4 + Math.floor(i / 2) * 6, 1.8, 0.06, 0.9, 0, 3);
        addCol(x0 + 1.6 + (i % 2) * 3.2, y, z0 + 3.5 + Math.floor(i / 2) * 6, x0 + 3.4 + (i % 2) * 3.2, y + 0.4, z0 + 4.5 + Math.floor(i / 2) * 6);
      }
    } else if (kit === 'locked') {
      // 閉鎖: 暗い空間
      roomCeil(x0, x1, z0, z1, ceilY);
    }
  }

  // ---------- 1F 玄関ホール内の追加要素 ----------
  // 受付カウンター(東玄関内)
  batch.box('cnt', M.wood, 92, 0.55, -4.5, 3.6, 1.1, 0.5, 0, 3);
  addCol(90.2, 0, -4.8, 93.8, 1.1, -4.2);
  const plate = new THREE.PlaneGeometry(1.4, 0.4);
  plate.rotateY(Math.PI);
  plate.translate(92, 1.35, -4.2);
  batch.add('plate_recep', nameMat('受付'), plate, null, 0);

  // ---------- 2F〜5F の廊下側カーテン（省略） ----------
  return {};
}
