// ============================================================
// build-campus.js — 敷地・道路・グラウンド・プール・テニスコート・周辺
// ============================================================
import * as THREE from 'three';
import { CFG } from './config.js';
import { canvasTexture, mergeGeos } from './util.js';

const SITE = CFG.site;
const S = CFG.school;
const FL = CFG.field;
const CR = CFG.campusRoad;
const PL = CFG.pool;
const TN = CFG.tennis;
const KY = CFG.kyudo;
const BP = CFG.bikeParking;
const ER = CFG.eastRoad;
const SR = CFG.southRoad;

// サッカーグラウンドの白線
function fieldTex(w, d) {
  const px = 4;
  const cv = document.createElement('canvas');
  cv.width = w * px; cv.height = d * px;
  const ctx = cv.getContext('2d');
  // 人工芝
  ctx.fillStyle = '#3e7d36';
  ctx.fillRect(0, 0, cv.width, cv.height);
  let s = 9;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < w * d * 1.2; i++) {
    ctx.fillStyle = `rgba(${20 + rnd() * 40 | 0},${100 + rnd() * 70 | 0},${20 + rnd() * 30 | 0},0.45)`;
    ctx.fillRect(rnd() * cv.width, rnd() * cv.height, 2, 3);
  }
  // 横縞（刈り目）
  for (let y = 0; y < cv.height; y += px * 5) {
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fillRect(0, y, cv.width, px * 5);
  }
  // 白線（サッカー）
  ctx.strokeStyle = 'rgba(250,250,245,0.9)';
  ctx.lineWidth = px * 0.12;
  const mx = px * 3, my = px * 2.5;
  const fw = w - 6, fd = d - 5;
  ctx.strokeRect(mx * px, my * px, fw * px, fd * px);
  // ハーフライン
  ctx.beginPath();
  ctx.moveTo((mx + fw / 2) * px, my * px);
  ctx.lineTo((mx + fw / 2) * px, (my + fd) * px);
  ctx.stroke();
  // センターサークル
  ctx.beginPath();
  ctx.arc((mx + fw / 2) * px, (my + fd / 2) * px, 9.15 * px, 0, Math.PI * 2);
  ctx.stroke();
  // ペナルティエリア
  for (const gx of [mx, mx + fw]) {
    const dir = gx === mx ? 1 : -1;
    ctx.strokeRect((gx + (dir < 0 ? -16.5 : 0)) * px, (my + fd / 2 - 20.15) * px, 16.5 * px, 40.3 * px);
    ctx.strokeRect((gx + (dir < 0 ? -5.5 : 0)) * px, (my + fd / 2 - 9.16) * px, 5.5 * px, 18.32 * px);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// アスファルト
function asphaltTex(w, h, opts = {}) {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = opts.base || '#43464b';
    ctx.fillRect(0, 0, 256, 256);
    let s = 313;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 1800; i++) {
      const v = rnd();
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(rnd() * 256, rnd() * 256, 2, 2);
    }
  }, { repeat: opts.repeat });
}

// ============================================================
export function buildCampus(ctx) {
  const { M, batch, addCol, addFloor, inst, rng } = ctx;

  // ============ 地面（土+植栽ベース） ============
  {
    const g = new THREE.PlaneGeometry(900, 900);
    g.rotateX(-Math.PI / 2);
    batch.add('gnd', M.grass, g, null, 2);
    addFloor(-450, 450, -450, 450, 0);
  }

  // ============ 市道（東: 南北 / 南: 東西） ============
  const roadMatE = new THREE.MeshStandardMaterial({ map: asphaltTex(0, 0, { repeat: [1, 24] }), roughness: 0.98 });
  const roadMatS = new THREE.MeshStandardMaterial({ map: asphaltTex(0, 0, { repeat: [24, 1] }), roughness: 0.98 });
  {
    const g1 = new THREE.PlaneGeometry(ER.x1 - ER.x0, 460);
    g1.rotateX(-Math.PI / 2);
    g1.translate((ER.x0 + ER.x1) / 2, 0.02, -30);
    batch.add('road', roadMatE, g1, null, 2);
    addFloor(ER.x0, ER.x1, -260, 200, 0.04);
    const g2 = new THREE.PlaneGeometry(560, SR.z1 - SR.z0);
    g2.rotateX(-Math.PI / 2);
    g2.translate(-60, 0.02, (SR.z0 + SR.z1) / 2);
    batch.add('road', roadMatS, g2, null, 2);
    addFloor(-340, 220, SR.z0, SR.z1, 0.04);
    // 中央線
    for (let z = -250; z < 190; z += 8) {
      batch.box('lineW', M.roadLine, (ER.x0 + ER.x1) / 2, 0.055, z, 0.16, 0.01, 4, 0, 0);
    }
    for (let x = -330; x < 210; x += 8) {
      batch.box('lineW', M.roadLine, x, 0.055, (SR.z0 + SR.z1) / 2, 4, 0.01, 0.16, 0, 0);
    }
    // 横断歩道（校門前）
    for (let x = ER.x0 + 1; x < ER.x1 - 1; x += 1.2) {
      batch.box('zibra', M.roadLine, x, 0.06, 12, 0.7, 0.012, 5.6, 0, 0);
    }
    for (let x = ER.x0 + 1; x < ER.x1 - 1; x += 1.2) {
      batch.box('zibra', M.roadLine, x, 0.06, -44, 0.7, 0.012, 5.6, 0, 0);
    }
  }
  // 歩道
  for (const [bx, bz, sx, sz] of [
    [ER.x0 - 1.8, -30, 3.6, 460],
    [ER.x1 + 1.8, -30, 3.6, 460],
    [-60, SR.z0 - 1.8, 560, 3.6],
    [-60, SR.z1 + 1.8, 560, 3.6],
  ]) {
    batch.box('walk', M.sidewalk, bx, 0.06, bz, sx, 0.12, sz, 0, 2);
    addFloor(bx - sx / 2, bx + sx / 2, bz - sz / 2, bz + sz / 2, 0.12);
  }

  // ============ 学校塀・門（東側） ============
  {
    // 塀 (土間側 z -80..40 と 46..140)
    const fenceRun = (z0, z1) => {
      const len = z1 - z0;
      // 基部
      batch.box('wallB', M.concreteDark, ER.x0 - 0.15, 0.5, (z0 + z1) / 2, 0.3, 1.0, len, 0, 3);
      addCol(ER.x0 - 0.35, 0, z0, ER.x0 + 0.05, 1.0, z1);
      // 鋼製フェンス
      for (let z = z0 + 0.15; z < z1; z += 0.18) {
        batch.box('fen', M.steelDark, ER.x0 - 0.15, 1.75, z, 0.05, 1.5, 0.05, 0, 0);
      }
      batch.box('fen2', M.steelDark, ER.x0 - 0.15, 2.45, (z0 + z1) / 2, 0.06, 0.08, len, 0, 0);
      batch.box('fen2', M.steelDark, ER.x0 - 0.15, 1.1, (z0 + z1) / 2, 0.06, 0.08, len, 0, 0);
    };
    fenceRun(-150, -3);
    fenceRun(27, 140);
    // 門（z -3..27 開口 30m…派手すぎ: 正門 8m + 通用門）
    // 正門 (z 6..20)
    for (const gz of [6, 20]) {
      batch.box('gateP', M.concreteWhite, ER.x0 - 0.4, 1.4, gz, 0.8, 2.8, 0.8, 0, 3);
      addCol(ER.x0 - 0.9, 0, gz - 0.5, ER.x0 + 0.1, 2.8, gz + 0.5);
    }
    // 門扉（開いた状態: 内側へ）
    const gate1 = new THREE.BoxGeometry(0.08, 2.2, 6.4);
    gate1.rotateY(0.6);
    gate1.translate(ER.x0 - 0.4, 1.15, 10.4);
    batch.add('gate', M.steelDark, gate1, null, 3);
    // 門柱校名プレート
    const ng = new THREE.PlaneGeometry(3.4, 0.62);
    ng.rotateY(-Math.PI / 2);
    ng.translate(ER.x0 - 0.85, 2.35, 13);
    batch.add('ngate', ctx.signMats.namePlate, ng, null, 0);
    // 通用門 (z -3..2)
    for (const gz of [-3, 2]) {
      batch.box('gateP', M.concreteWhite, ER.x0 - 0.4, 1.2, gz, 0.7, 2.4, 0.7, 0, 3);
      addCol(ER.x0 - 0.85, 0, gz - 0.45, ER.x0 + 0.05, 2.4, gz + 0.45);
    }
    // アプローチ（門から校舎東玄関へ）
    batch.box('ap', M.sidewalk, 109, 0.05, 13, 18, 0.1, 12, 0, 2);
    addFloor(100, 118, 7, 19, 0.1);
  }

  // ============ キャンパスロード（敷地内 東西） ============
  {
    const cz = (CR.z0 + CR.z1) / 2;
    const rm = new THREE.MeshStandardMaterial({ map: asphaltTex(0, 0, { repeat: [30, 1] }), roughness: 0.98 });
    const g = new THREE.PlaneGeometry(236, CR.z1 - CR.z0);
    g.rotateX(-Math.PI / 2);
    g.translate(-10, 0.05, cz);
    batch.add('road', rm, g, null, 2);
    addFloor(-128, 108, CR.z0, CR.z1, 0.05);
    for (let x = -124; x < 104; x += 10) {
      batch.box('lineW', M.roadLine, x, 0.075, cz, 5, 0.012, 0.16, 0, 0);
    }
  }

  // ============ 第1グラウンド（人工芝サッカー） ============
  {
    const cx = (FL.x0 + FL.x1) / 2, cz = (FL.z0 + FL.z1) / 2;
    const tx = fieldTex(FL.x1 - FL.x0, FL.z1 - FL.z0);
    const g = new THREE.PlaneGeometry(FL.x1 - FL.x0, FL.z1 - FL.z0);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, 0.08, cz);
    batch.add('field', new THREE.MeshStandardMaterial({ map: tx, roughness: 0.95 }), g, null, 2);
    addFloor(FL.x0, FL.x1, FL.z0, FL.z1, 0.08);
    // 外周土
    batch.box('track', M.dirt, cx, 0.03, cz, FL.x1 - FL.x0 + 6, 0.06, FL.z1 - FL.z0 + 6, 0, 2);
    // ゴール
    const goal = (gx, rot) => {
      const m = new THREE.Matrix4();
      batch.box('goalW', M.white, gx, 1.1, cz, 0.09, 2.2, 0.09, 0, 3);
      batch.box('goalW', M.white, gx, 2.2, cz - 3.65, 0.09, 0.09, 7.3, 0, 3);
      batch.box('goalW', M.white, gx, 1.1, cz - 7.3, 0.09, 2.2, 0.09, 0, 3);
      // ネット（半透明）
      const netTex = canvasTexture(64, 64, (ctx) => {
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 64; i += 6) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 64); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(64, i); ctx.stroke();
        }
      });
      const netMat = new THREE.MeshStandardMaterial({ map: netTex, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
      const n1 = new THREE.PlaneGeometry(7.3, 2.1);
      n1.rotateY(rot > 0 ? 0 : Math.PI);
      n1.translate(gx + (rot > 0 ? -1.4 : 1.4), 1.1, cz - 3.65);
      batch.add('net', netMat, n1, null, 0);
      const n2 = new THREE.PlaneGeometry(1.9, 2.1);
      n2.rotateY(Math.PI / 2);
      n2.translate(gx + (rot > 0 ? -0.6 : 0.6), 1.1, cz - 7.25);
      batch.add('net', netMat, n2, null, 0);
      const n3 = new THREE.PlaneGeometry(7.3, 1.9);
      n3.rotateX(-Math.PI / 2);
      n3.translate(gx + (rot > 0 ? -1.35 : 1.35), 0.15, cz - 3.65);
      batch.add('net', netMat, n3, null, 0);
      addCol(gx - 0.15, 0, cz - 7.5, gx + 0.15, 2.3, cz + 0.1);
    };
    goal(FL.x0 + 3, 1);
    goal(FL.x1 - 3, -1);
    // 照明塔4
    for (const [lx, lz] of [[FL.x0 - 2, FL.z0 - 2], [FL.x1 + 2, FL.z0 - 2], [FL.x0 - 2, FL.z1 + 2], [FL.x1 + 2, FL.z1 + 2]]) {
      batch.cyl('pole', M.steel, lx, 9, lz, 0.16, 0.24, 18, 8);
      batch.box('lampF', M.dark, lx, 18.3, lz, 2.6, 0.9, 0.5, 0, 0);
      addCol(lx - 0.3, 0, lz - 0.3, lx + 0.3, 18, lz + 0.3);
    }
    // ベンチ・スタンド
    for (const bz of [FL.z0 - 3.5, FL.z1 + 3.5]) {
      batch.box('bench', M.steelDark, FL.x0 + 10, 0.45, bz, 8, 0.9, 0.5, 0, 3);
      addCol(FL.x0 + 6, 0, bz - 0.3, FL.x0 + 14, 0.9, bz + 0.3);
      batch.box('roofB', M.steelDark, FL.x0 + 10, 2.3, bz + (bz > 0 ? -1.2 : 1.2), 8, 0.1, 2.4, 0, 3);
    }
  }

  // ============ プール ============
  {
    const cx = (PL.x0 + PL.x1) / 2, cz = (PL.z0 + PL.z1) / 2;
    // 機械室（北端に小屋）
    batch.box('poolHouse', M.wallPaintWarm, cx - 18, 1.6, PL.z0 - 2.2, 8, 3.2, 5, 0, 3);
    batch.box('poolRoof', M.dark, cx - 18, 3.35, PL.z0 - 2.2, 8.6, 0.3, 5.6, 0, 3);
    addCol(cx - 22, 0, PL.z0 - 4.7, cx - 14, 3.5, PL.z0 + 0.3);
    // プール本体（25m × 15m、深さ1.35）
    const pw = 25, pd = 15;
    const px = cx + 6, pz = cz + 2;
    batch.box('poolIn', M.poolWall, px, -0.55, pz, pw, 1.7, pd, 0, 3);
    // 水
    const waterTex = canvasTexture(256, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 256, 256);
      g.addColorStop(0, '#3fa8c8'); g.addColorStop(1, '#2a7fa8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      let s = 77;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 40; i++) {
        ctx.lineWidth = 1 + rnd() * 1.5;
        ctx.beginPath();
        const y0 = rnd() * 256;
        ctx.moveTo(0, y0);
        ctx.bezierCurveTo(60, y0 + rnd() * 8 - 4, 180, y0 + rnd() * 8 - 4, 256, y0);
        ctx.stroke();
      }
    });
    waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
    waterTex.repeat.set(6, 4);
    const wg = new THREE.PlaneGeometry(pw - 0.3, pd - 0.3);
    wg.rotateX(-Math.PI / 2);
    wg.translate(px, -0.18, pz);
    batch.add('water', new THREE.MeshStandardMaterial({ map: waterTex, transparent: true, opacity: 0.82, roughness: 0.15, metalness: 0.1 }), wg, null, 0);
    // プールサイド
    batch.box('deck', M.sidewalk, px, 0.03, pz, pw + 8, 0.06, pd + 8, 0, 2);
    addFloor(px - pw / 2 - 4, px + pw / 2 + 4, pz - pd / 2 - 4, pz + pd / 2 + 4, 0.06);
    // コースロープ
    const floatGeo = new THREE.TorusGeometry(0.09, 0.045, 6, 10);
    const floatMat = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.6 });
    inst.register('float', floatGeo, floatMat);
    for (let l = 0; l < 6; l++) {
      const lz = pz - pd / 2 + 2.2 + l * 2.2;
      for (let i = 0; i < 50; i++) {
        inst.add('float', px - pw / 2 + 0.4 + i * 0.5, -0.05, lz, 0);
      }
    }
    // 出発台
    for (let l = 0; l < 6; l++) {
      batch.box('block', M.white, px - pw / 2 - 0.5, 0.28, pz - pd / 2 + 2.2 + l * 2.2, 0.5, 0.55, 0.5, 0, 3);
      addCol(px - pw / 2 - 0.8, 0, pz - pd / 2 + 1.9 + l * 2.2, px - pw / 2 - 0.2, 0.6, pz - pd / 2 + 2.5 + l * 2.2);
    }
    // 深さ表示・看板
    const dg = new THREE.PlaneGeometry(1.4, 0.5);
    dg.rotateY(-Math.PI / 2);
    dg.translate(px - pw / 2 - 0.05, 0.4, pz);
    batch.add('depth', ctx.signMats.poolSign, dg, null, 0);
    // フェンス
    for (let x = px - pw / 2 - 4; x <= px + pw / 2 + 4; x += 0.2) {
      for (const fz of [pz - pd / 2 - 4, pz + pd / 2 + 4]) {
        batch.box('fen', M.steelDark, x, 0.62, fz, 0.04, 1.2, 0.04, 0, 0);
      }
    }
    for (const fz of [pz - pd / 2 - 4, pz + pd / 2 + 4]) {
      batch.box('fen2', M.steelDark, px, 1.2, fz, pw + 8, 0.06, 0.05, 0, 0);
    }
    // 飛び込み防止の高さ表示
  }

  // ============ テニスコート2面 ============
  {
    const cx = (TN.x0 + TN.x1) / 2, cz = (TN.z0 + TN.z1) / 2;
    const courtTex2 = canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = '#3a7a52';
      ctx.fillRect(0, 0, 512, 512);
      // 2面（オールウェザー: 青緑）
      for (const c of [0, 1]) {
        const x0 = 20 + c * 246, y0 = 40;
        ctx.fillStyle = '#46705a';
        ctx.fillRect(x0, y0, 226, 400);
        ctx.fillStyle = '#3f8868';
        ctx.fillRect(x0 + 12, y0 + 24, 202, 352);
        ctx.strokeStyle = '#e8e8e0';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x0 + 12, y0 + 24, 202, 352);
        ctx.beginPath(); ctx.moveTo(x0 + 12, y0 + 200); ctx.lineTo(x0 + 214, y0 + 200); ctx.stroke();
        ctx.strokeRect(x0 + 12 + 60, y0 + 24 + 90, 82, 172);
      }
    });
    const g = new THREE.PlaneGeometry(TN.x1 - TN.x0, TN.z1 - TN.z0);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, 0.07, cz);
    batch.add('tennis', new THREE.MeshStandardMaterial({ map: courtTex2, roughness: 0.9 }), g, null, 2);
    addFloor(TN.x0, TN.x1, TN.z0, TN.z1, 0.07);
    // ネット
    const netTex = canvasTexture(64, 64, (ctx) => {
      ctx.strokeStyle = 'rgba(20,20,20,0.8)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 64; i += 5) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 64); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(64, i); ctx.stroke();
      }
    });
    const netMat = new THREE.MeshStandardMaterial({ map: netTex, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    for (const c of [0, 1]) {
      const nx = TN.x0 + 5 + c * 20.5 + 10;
      const np = new THREE.PlaneGeometry(11, 1.1);
      np.rotateY(Math.PI / 2);
      np.translate(nx, 0.6, cz);
      batch.add('netT', netMat, np, null, 0);
      for (const nz of [cz - 5.5, cz + 5.5]) {
        batch.cyl('netP', M.steelDark, nx, 0.6, nz, 0.04, 0.04, 1.2, 6);
        addCol(nx - 0.1, 0, nz - 0.1, nx + 0.1, 1.2, nz + 0.1);
      }
    }
    // ライト
    for (const [lx, lz] of [[TN.x0 + 2, TN.z0 + 2], [TN.x0 + 2, TN.z1 - 2], [TN.x1 - 2, TN.z0 + 2], [TN.x1 - 2, TN.z1 - 2]]) {
      batch.cyl('pole', M.steel, lx, 4, lz, 0.12, 0.18, 8, 8);
      batch.box('lampF', M.dark, lx, 8.4, lz, 1.6, 0.6, 0.4, 0, 0);
      addCol(lx - 0.2, 0, lz - 0.2, lx + 0.2, 8, lz + 0.2);
    }
    // フェンス（周囲）
    const fx0 = TN.x0 - 3, fx1 = TN.x1 + 3, fz0 = TN.z0 - 3, fz1 = TN.z1 + 3;
    for (let x = fx0; x <= fx1; x += 0.22) {
      for (const fz of [fz0, fz1]) batch.box('fen', M.steelDark, x, 1.55, fz, 0.04, 3.0, 0.04, 0, 0);
    }
    for (let z = fz0; z <= fz1; z += 0.22) {
      for (const fx of [fx0, fx1]) batch.box('fen', M.steelDark, fx, 1.55, z, 0.04, 3.0, 0.04, 0, 0);
    }
    for (const [bx, bz, sx, sz] of [[cx, fz0, fx1 - fx0, 0.05], [cx, fz1, fx1 - fx0, 0.05], [fx0, cz, 0.05, fz1 - fz0], [fx1, cz, 0.05, fz1 - fz0]]) {
      batch.box('fen2', M.steelDark, bx, 3.0, bz, sx, 0.07, sz, 0, 0);
      addCol(bx - sx / 2, 0, bz - 0.15, bx + sx / 2, 3.1, bz + 0.15);
    }
  }

  // ============ 弓道場 ============
  {
    const cx = (KY.x0 + KY.x1) / 2, cz = (KY.z0 + KY.z1) / 2;
    batch.box('kyudo', M.wallPaintWarm, cx, 2.0, cz, KY.x1 - KY.x0, 4.0, KY.z1 - KY.z0, 0, 3);
    batch.box('kyudoR', M.dark, cx, 4.25, cz, KY.x1 - KY.x0 + 0.8, 0.4, KY.z1 - KY.z0 + 0.8, 0, 3);
    addCol(KY.x0, 0, KY.z0, KY.x1, 4.4, KY.z1);
    // 入口（南）
    const dg = new THREE.BoxGeometry(1.8, 2.2, 0.08);
    dg.translate(cx + 3, 1.1, KY.z1);
    batch.add('kDoor', M.doorWood, dg, null, 0);
    addCol(cx + 2, 0, KY.z1 - 0.2, cx + 4, 2.3, KY.z1 + 0.2);
  }

  // ============ 駐輪場 ============
  {
    const cx = (BP.x0 + BP.x1) / 2, cz = (BP.z0 + BP.z1) / 2;
    // 屋根
    batch.box('bikeRoof', M.steelDark, cx, 2.35, cz, BP.x1 - BP.x0, 0.12, BP.z1 - BP.z0, 0, 3);
    for (const px of [BP.x0 + 1, BP.x1 - 1]) {
      batch.cyl('steelW', M.steelWhite, px, 1.15, cz, 0.06, 0.06, 2.3, 8);
    }
    for (let z = BP.z0 + 1; z < BP.z1; z += 5.2) {
      batch.box('steelW', M.steelWhite, cx, 2.3, z, BP.x1 - BP.x0, 0.08, 0.08, 0, 0);
    }
    addFloor(BP.x0, BP.x1, BP.z0, BP.z1, 0.05);
    // 自転車（簡易: 車輪2+フレーム）
    const bikeGeo = (() => {
      const parts = [];
      const wheel = new THREE.TorusGeometry(0.32, 0.035, 6, 16);
      wheel.rotateY(Math.PI / 2);
      const w1 = wheel.clone(); w1.translate(0, 0.33, -0.52);
      const w2 = wheel.clone(); w2.translate(0, 0.33, 0.52);
      parts.push(w1, w2);
      parts.push(new THREE.BoxGeometry(0.08, 0.05, 1.0).translate(0, 0.55, 0));
      parts.push(new THREE.BoxGeometry(0.08, 0.4, 0.05).rotateX(0.3).translate(0, 0.85, 0.42));
      parts.push(new THREE.BoxGeometry(0.05, 0.35, 0.05).translate(0, 0.85, -0.4));
      parts.push(new THREE.BoxGeometry(0.35, 0.06, 0.14).translate(0, 1.02, 0.44));
      return parts;
    })();
    // mergeせずBATCHに直接
    let bi = 0;
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 26; i++) {
        const bx = BP.x0 + 1.2 + (i % 13) * 1.0;
        const bz = BP.z0 + 2 + row * 4.2 + Math.floor(i / 13) * 2;
        if (rng() < 0.15) continue; // 空き
        for (const part of bikeGeo) {
          const g = part.clone();
          g.rotateY((rng() - 0.5) * 0.16);
          g.translate(bx, 0.05, bz);
          batch.add('bike', M.bike, g, null, 3);
        }
        bi++;
      }
    }
  }

  // ============ 植栽（街路樹・生垣） ============
  // プロトタイプ先に登録
  {
    const trunk = new THREE.CylinderGeometry(0.14, 0.22, 2.6, 7);
    trunk.translate(0, 1.3, 0);
    inst.register('treeTrunk', trunk, M.trunk);
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const s = 1.6 - i * 0.3;
      const b = new THREE.SphereGeometry(s, 8, 6);
      b.translate((rng() - 0.5) * 1.2, 3.2 + i * 1.1, (rng() - 0.5) * 1.2);
      parts.push(b);
    }
    inst.register('treeLeaf', mergeGeos(parts), M.leaf);
  }
  {
    // 街路樹（東道路沿い）
    for (let z = -140; z < 130; z += 13) {
      if (Math.abs(z - 13) < 9 || Math.abs(z + 44) < 9) continue; // 横断歩道
      inst.add('treeTrunk', ER.x1 + 3.2, 0, z, rng() * Math.PI, 1 + rng() * 0.35);
      inst.add('treeLeaf', ER.x1 + 3.2, 0, z, rng() * Math.PI, 1 + rng() * 0.3);
    }
    for (let z = -140; z < 130; z += 17) {
      if (Math.abs(z - 13) < 9) continue;
      inst.add('treeTrunk', ER.x0 - 3.4, 0, z, rng() * Math.PI, 0.9 + rng() * 0.3);
      inst.add('treeLeaf', ER.x0 - 3.4, 0, z, rng() * Math.PI, 0.85 + rng() * 0.3);
    }
    // 南道路沿い
    for (let x = -320; x < 200; x += 15) {
      if (Math.abs(x - ER.x0 + 30) < 20) continue;
      inst.add('treeTrunk', x, 0, SR.z1 + 3.4, rng() * Math.PI, 0.9 + rng() * 0.35);
      inst.add('treeLeaf', x, 0, SR.z1 + 3.4, rng() * Math.PI, 0.9 + rng() * 0.35);
    }
    // 敷地内
    const spots = [
      [-110, 60], [-110, 100], [-70, 55], [-40, 40], [0, 40], [40, 40], [80, 40],
      [0, 120], [40, 125], [90, 120], [-120, -20], [-110, -70], [90, -30], [90, -80],
      [70, -100], [10, -100], [70, -150], [0, -155], [-60, -160],
    ];
    for (const [tx, tz] of spots) {
      inst.add('treeTrunk', tx, 0, tz, rng() * Math.PI, 1 + rng() * 0.4);
      inst.add('treeLeaf', tx, 0, tz, rng() * Math.PI, 1 + rng() * 0.35);
    }
    // 生垣（校舎周り・アプローチ）
    const hedgeRun = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 0.5);
      for (let i = 0; i <= n; i++) {
        const hx = x0 + (x1 - x0) * i / n, hz = z0 + (z1 - z0) * i / n;
        batch.box('hedge', M.hedge, hx, 0.55, hz, 0.55, 1.1, 0.55, 0, 3);
      }
      addCol(Math.min(x0, x1) - 0.3, 0, Math.min(z0, z1) - 0.3, Math.max(x0, x1) + 0.3, 1.1, Math.max(z0, z1) + 0.3);
    };
    hedgeRun(100, -20, 100, -6);
    hedgeRun(100, 24, 100, 34);
    hedgeRun(4, 28, 60, 28);
  }

  // ============ バス停・街路家具 ============
  {
    // バス停（東道路・門の北）
    batch.cyl('pole', M.steel, ER.x1 - 2, 1.4, -6, 0.05, 0.07, 2.8, 8);
    const bs = new THREE.PlaneGeometry(1.1, 2.9);
    bs.rotateY(-Math.PI / 2);
    bs.translate(ER.x1 - 1.85, 2.6, -6);
    batch.add('bus', ctx.signMats.busStop, bs, null, 0);
    addCol(ER.x1 - 2.15, 0, -6.2, ER.x1 - 1.85, 2.8, -5.8);
    // ベンチ
    batch.box('bench', M.wood, ER.x1 - 2.2, 0.45, -3, 0.5, 0.08, 1.8, 0, 3);
    // 街灯
    for (let z = -150; z < 140; z += 32) {
      batch.cyl('pole', M.steel, ER.x1 + 3.4, 4.5, z, 0.08, 0.12, 9, 8);
      batch.box('lampA', M.steelWhite, ER.x1 + 2.6, 8.9, z, 1.8, 0.16, 0.3, 0, 0);
      batch.box('lampL', M.lightPanel, ER.x1 + 2.0, 8.8, z, 0.7, 0.08, 0.24, 0, 0);
      addCol(ER.x1 + 3.2, 0, z - 0.15, ER.x1 + 3.6, 9, z + 0.15);
    }
    // 信号機（門前交差点 z=12付近・南東角）
    const signal = (x, z, rot) => {
      batch.cyl('pole', M.steel, x, 2.6, z, 0.09, 0.12, 5.2, 8);
      batch.box('sgB', M.dark, x, 5.0, z, 0.4, 1.1, 0.35, rot, 0);
      const lights = new THREE.PlaneGeometry(0.28, 0.85);
      lights.rotateY(rot + Math.PI / 2);
      lights.translate(x + Math.sin(rot + Math.PI / 2) * 0.2, 5.0, z + Math.cos(rot + Math.PI / 2) * 0.2);
      batch.add('sgL', ctx.signMats.traffic, lights, null, 0);
      addCol(x - 0.15, 0, z - 0.15, x + 0.15, 5.2, z + 0.15);
    };
    signal(ER.x0 - 2.2, 12, Math.PI);
    signal(ER.x1 + 2.2, 12, 0);
    // 川口市の看板（交差点角）
    const kg = new THREE.PlaneGeometry(3.6, 0.9);
    kg.rotateY(-Math.PI / 2);
    kg.translate(ER.x1 + 1.5, 2.6, 20);
    batch.add('ksign', ctx.signMats.citySign, kg, null, 0);
    batch.cyl('pole', M.steel, ER.x1 + 1.5, 1.3, 20, 0.06, 0.08, 2.6, 8);
  }

  // ============ 周辺街区（簡易ビル） ============
  {
    const bld = (x, z, sx, sy, sz, mat, winMat) => {
      batch.box('nb', mat, x, sy / 2, z, sx, sy, sz, 0, 3);
      // 窓帯
      const floors = Math.floor(sy / 3.2);
      for (let f = 1; f <= floors; f++) {
        batch.box('nbw', winMat, x, f * 3.2 - 0.9, z, sx * 0.92, 1.3, sz + 0.06, 0, 0);
        batch.box('nbw', winMat, x, f * 3.2 - 0.9, z, sx + 0.06, 1.3, sz * 0.92, 0, 0);
      }
      addCol(x - sx / 2, 0, z - sz / 2, x + sx / 2, sy, z + sz / 2);
    };
    const wm = M.glassDark;
    // 東側（道路の向こう）
    bld(155, -20, 26, 14, 20, M.wallPaintWarm, wm);   // SKIPシティ風
    bld(150, 30, 18, 9, 14, M.wallPaint, wm);
    bld(158, 80, 22, 11, 16, M.wallPaintWarm, wm);
    bld(152, -90, 20, 8, 18, M.wallPaint, wm);
    bld(160, -140, 24, 6, 22, M.wallPaint, wm);
    // 南側（住宅街）
    for (let x = -300; x < 190; x += 34) {
      if (x > ER.x0 - 40 && x < ER.x1 + 30) continue;
      bld(x, SR.z1 + 22, 18 + rng() * 8, 6 + rng() * 7, 12, rng() > 0.5 ? M.wallPaint : M.wallPaintWarm, wm);
    }
    // 北側（SKIPシティ方面の大型施設）
    bld(-20, -230, 90, 18, 50, M.wallPaint, wm);
    bld(90, -225, 50, 12, 36, M.wallPaintWarm, wm);
    // 西側（団地）
    for (let z = -140; z < 130; z += 42) {
      bld(-175, z, 20, 22, 14, M.wallPaintWarm, wm);
    }
    // 遠景の高層（川口方面のシルエット）
    bld(-260, -60, 26, 55, 22, M.concreteDark, wm);
    bld(-250, 100, 30, 42, 26, M.concreteDark, wm);
    bld(230, 130, 24, 38, 20, M.concreteDark, wm);
    bld(120, -260, 40, 30, 34, M.concreteDark, wm);
  }

  return {};
}
