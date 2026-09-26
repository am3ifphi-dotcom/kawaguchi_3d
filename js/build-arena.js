// ============================================================
// build-arena.js — アリーナ棟S（大アリーナ）・アリーナ棟N（中小アリーナ・武道場）
// ============================================================
import * as THREE from 'three';
import { CFG } from './config.js';
import { canvasTexture } from './util.js';

const A1 = CFG.arenaS;
const A2 = CFG.arenaN;

// スポーツ床（木目 + バスケットコート3面）テクスチャ
function courtTex(courts, w, d) {
  // w×dメートルの面を 128px/m で描画（さらに縮小するので実質64px/m）
  const px = 8; // px per m
  const cw = Math.min(1024, w * px), cd = Math.min(1024, d * px);
  return canvasTexture(cw, cd, (ctx) => {
    // 木目
    ctx.fillStyle = '#c49a62';
    ctx.fillRect(0, 0, cw, cd);
    let s = 55;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let y = 0; y < cd; y += 4) {
      ctx.fillStyle = `rgba(120,80,40,${0.05 + rnd() * 0.08})`;
      ctx.fillRect(0, y + rnd() * 2, cw, 2);
    }
    const sx = cw / w, sy = cd / d;
    // コート
    for (let c = 0; c < courts; c++) {
      const cx0 = (w / courts) * (c + 0.5);
      const courtW = 15, courtL = 26;
      const x0 = (cx0 - courtW / 2) * sx, y0 = (d / 2 - courtL / 2) * sy;
      ctx.strokeStyle = '#e8e4da';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0, y0, courtW * sx, courtL * sy);
      // センター
      ctx.beginPath();
      ctx.arc(x0 + courtW * sx / 2, y0 + courtL * sy / 2, 1.8 * sx, 0, Math.PI * 2);
      ctx.stroke();
      // ゴール下
      const rimY1 = y0 + (courtL / 2 - 5.575) * sy, rimY2 = y0 + (courtL / 2 + 5.575) * sy;
      for (const ry of [rimY1, rimY2]) {
        ctx.strokeRect(x0 + courtW * sx / 2 - 2.45 * sx, Math.min(ry, ry + (ry === rimY1 ? 1 : -1) * 4.9 * sy * (ry === rimY1 ? 1 : 1)) - (ry === rimY1 ? 0 : 0), 4.9 * sx, 4.9 * sy);
      }
      // 3P
      ctx.beginPath();
      ctx.arc(x0 + courtW * sx / 2, rimY1, 6.75 * sx, 0, Math.PI, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x0 + courtW * sx / 2, rimY2, 6.75 * sx, Math.PI, 0, false);
      ctx.stroke();
      // センターライン
      ctx.beginPath();
      ctx.moveTo(x0, y0 + courtL * sy / 2); ctx.lineTo(x0 + courtW * sx, y0 + courtL * sy / 2);
      ctx.stroke();
    }
  });
}

function hoop(batch, M, addCol, x, z, rotY, yBase = 0) {
  const cos = Math.cos(rotY), sin = Math.sin(rotY);
  const loc = (dx, dz) => [x + dx * cos - dz * sin, z + dx * sin + dz * cos];
  // 土台
  let [px, pz] = loc(0, 1.2);
  batch.box('steelD', M.steelDark, px, yBase + 0.05, pz, 1.2, 0.1, 0.8, 0, 3);
  // ポール
  [px, pz] = loc(0, 0.9);
  batch.box('steelD', M.steelDark, px, yBase + 1.9, pz, 0.16, 3.8, 0.16, 0, 3);
  // アーム
  [px, pz] = loc(0, 0.15);
  batch.box('steelD', M.steelDark, px, yBase + 3.6, pz, 0.12, 0.12, 1.3, 0, 0);
  // バックボード
  [px, pz] = loc(0, -0.5);
  batch.box('glassD', M.white, px, yBase + 3.35, pz, 1.8, 1.05, 0.05, 0, 0);
  batch.box('dark', M.dark, px, yBase + 3.05, pz - Math.sin(rotY) * 0.04, 0.6, 0.45, 0.02, 0, 0);
  // リング
  [px, pz] = loc(0, -0.85);
  batch.cyl('hoop', M.steelDark, px, yBase + 3.05, pz, 0.225, 0.225, 0.03, 12, Math.PI / 2, 0, 0);
  addCol(x - 0.4, yBase, z + 0.4, x + 0.4, yBase + 3.6, z + 1.6);
}

// ============================================================
export function buildArena(ctx) {
  const { M, batch, addCol, addFloor, inst } = ctx;

  // ================= 大アリーナ (S) =================
  {
    const { x0, x1, z0, z1, h } = A1;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // 床（コート3面）
    const ct = courtTex(3, x1 - x0, z1 - z0);
    const fg = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    fg.rotateX(-Math.PI / 2);
    fg.translate(cx, 0.05, cz);
    batch.add('court', new THREE.MeshStandardMaterial({ map: ct, roughness: 0.45 }), fg, null, 2);
    addFloor(x0 + 0.5, x1 - 0.5, z0 + 0.5, z1 - 0.5, 0.1);
    batch.box('found', M.concreteDark, cx, -0.15, cz, x1 - x0 + 1.2, 0.3, z1 - z0 + 1.2, 0, 3);

    // 壁（外壁 15.5m、Upperに窓帯）
    const wallMat = M.concreteWhite;
    // 南・北壁
    for (const wz of [z0, z1]) {
      batch.box('wallA', wallMat, cx, h / 2, wz, x1 - x0, h, 0.5, 0, 3);
      addCol(x0, 0, wz - 0.3, x1, h, wz + 0.3);
    }
    // 西壁
    batch.box('wallA', wallMat, x0, h / 2, cz, 0.5, h, z1 - z0, 0, 3);
    addCol(x0 - 0.3, 0, z0, x0 + 0.3, h, z1);
    // 東壁（入口開口: 中央 8m × 3.5m）
    const segs = [[z0 + 0.3, cz - 4.5], [cz + 4.5, z1 - 0.3]];
    for (const [sa, sb] of segs) {
      batch.box('wallA', wallMat, x1, h / 2, (sa + sb) / 2, 0.5, h, sb - sa, 0, 3);
      addCol(x1 - 0.3, 0, sa, x1 + 0.3, h, sb);
    }
    // 入口開口上枠
    batch.box('wallA', wallMat, x1, 3.5 + (h - 3.5) / 2, cz, 0.5, h - 3.5, 9, 0, 3);
    addCol(x1 - 0.3, 3.5, cz - 4.5, x1 + 0.3, h, cz + 4.5);
    // ガラスドア
    for (const dz of [-1.1, 1.1]) {
      const dg = new THREE.BoxGeometry(0.08, 2.6, 1.9);
      dg.translate(x1 - 0.15, 1.3, cz + dz);
      batch.add('gDoor', M.glassDark, dg, null, 0);
    }
    batch.box('aluF', M.aluminum, x1 - 0.2, 2.65, cz, 0.2, 0.1, 4.6, 0, 0);
    batch.box('aluF', M.aluminum, x1 - 0.2, 1.3, cz - 2.25, 0.2, 2.7, 0.12, 0, 0);
    batch.box('aluF', M.aluminum, x1 - 0.2, 1.3, cz + 2.25, 0.2, 2.7, 0.12, 0, 0);
    // 上部窓帯（東西南北の上部 9..13m）
    for (const [wx, wz, sx, sz] of [[cx, z0 + 0.2, x1 - x0 - 2, 0.1], [cx, z1 - 0.2, x1 - x0 - 2, 0.1], [x0 + 0.2, cz, 0.1, z1 - z0 - 2], [x1 - 0.2, cz, 0.1, z1 - z0 - 2]]) {
      batch.box('glB', M.glassDark, wx, 11, wz, sx, 4.0, sz, 0, 0);
    }
    // 玄関庇・看板
    batch.box('aluF', M.aluminum, x1 + 2.2, 3.7, cz, 4.4, 0.16, 10, 0, 3);
    for (const dz of [-4.4, 4.4]) batch.cyl('steelW', M.steelWhite, x1 + 4.1, 1.85, cz + dz, 0.07, 0.07, 3.7, 8);
    const signG = new THREE.PlaneGeometry(6.5, 0.75);
    signG.rotateY(-Math.PI / 2);
    signG.translate(x1 + 0.4, 4.6, cz);
    batch.add('aSign', ctx.signMats.arenaName, signG, null, 0);

    // 屋根（平屋根+パラペット+設備）
    batch.box('roofA', M.dark, cx, h + 0.15, cz, x1 - x0, 0.3, z1 - z0, 0, 3);
    for (const [wx, wz, sx, sz] of [[cx, z0 + 0.15, x1 - x0, 0.3], [cx, z1 - 0.15, x1 - x0, 0.3], [x0 + 0.15, cz, 0.3, z1 - z0], [x1 - 0.15, cz, 0.3, z1 - z0]]) {
      batch.box('para', wallMat, wx, h + 0.75, wz, sx, 0.9, sz, 0, 3);
    }
    for (let i = 0; i < 4; i++) {
      batch.box('ahu', M.steelDark, x0 + 12 + i * 18, h + 1.4, cz + (i % 2 ? 12 : -12), 7, 2.2, 5, 0, 3);
      addCol(x0 + 8.5 + i * 18, h, cz + (i % 2 ? 12 : -12) - 2.5, x0 + 15.5 + i * 18, h + 2.6, cz + (i % 2 ? 12 : -12) + 2.5);
    }

    // 内部: 天井タス構造
    const ceilY = 12.5;
    batch.add('ceilA', M.dark, new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate(cx, ceilY, cz), null, 0);
    for (let x = x0 + 5; x < x1 - 4; x += 8) {
      // トラス（上下弦+斜）
      batch.box('truss', M.steelWhite, x, ceilY - 0.5, cz, 0.2, 0.2, z1 - z0 - 2, 0, 0);
      batch.box('truss', M.steelWhite, x, ceilY - 2.1, cz, 0.16, 0.16, z1 - z0 - 2, 0, 0);
      for (let z = z0 + 2; z < z1 - 2; z += 4) {
        batch.box('truss', M.steelWhite, x, ceilY - 1.3, z, 0.1, 1.8, 0.1, 0, 0);
      }
      // ハイベイ照明
      for (let z = z0 + 6; z < z1 - 5; z += 10) {
        batch.box('lamp', M.lightPanel, x, ceilY - 2.5, z, 1.6, 0.1, 0.4, 0, 0);
      }
    }
    // 2F観客席（北・南、8段）
    for (const side of [0, 1]) {
      const wz = side === 0 ? z0 + 2.2 : z1 - 2.2;
      const dir = side === 0 ? 1 : -1;
      for (let r2 = 0; r2 < 8; r2++) {
        const py = 3.4 + r2 * 0.85;
        const pz = wz + dir * (r2 * 0.85);
        // 床段
        batch.box('stand', M.concrete, cx, py - 0.42, pz, x1 - x0 - 6, 0.16, 0.85, 0, 0);
        addFloor(x0 + 3, x1 - 3, pz - 0.4, pz + 0.4, py - 0.34);
        // 席
        for (let sx = x0 + 4; sx < x1 - 4; sx += 0.56) {
          inst.add('seat', sx, py - 0.34, pz, dir > 0 ? 0 : Math.PI);
        }
        // 手摺
        batch.box('aluR', M.aluminum, cx, py + 0.55, pz - dir * 0.42, x1 - x0 - 6, 0.06, 0.06, 0, 0);
        addCol(x0 + 3, py - 1.2, pz - dir * 0.5, x1 - 3, py + 0.6, pz - dir * 0.34);
      }
      // 席下の躯体（壁）
      batch.box('standB', M.concrete, cx, 1.7, wz + dir * 0.4, x1 - x0 - 6, 3.4, 0.9, 0, 3);
      addCol(x0 + 3, 0, wz, x1 - 3, 3.4, wz + dir * 0.9);
    }
    // バスケットゴール6
    for (let c = 0; c < 3; c++) {
      const ccx = x0 + 13.3 + c * 26.7;
      hoop(batch, M, addCol, ccx, z0 + 6.5, 0);
      hoop(batch, M, addCol, ccx, z1 - 6.5, Math.PI);
    }
    // バナー・スコアボード
    const bn = ctx.signMats.banners;
    for (let i = 0; i < 4; i++) {
      const bg = new THREE.PlaneGeometry(7, 1.3);
      bg.translate(x0 + 12 + i * 17, 9.5, z0 + 0.6);
      batch.add('ban' + i, bn[i], bg, null, 0);
      const bg2 = new THREE.PlaneGeometry(7, 1.3);
      bg2.rotateY(Math.PI);
      bg2.translate(x0 + 12 + i * 17, 9.5, z1 - 0.6);
      batch.add('ban2' + i, bn[(i + 1) % 4], bg2, null, 0);
    }
    // スコアボード（西壁）
    batch.box('score', M.dark, x0 + 0.8, 8.5, cz, 0.4, 3.2, 7, 0, 3);
    const sg = new THREE.PlaneGeometry(6.6, 2.8);
    sg.rotateY(Math.PI / 2);
    sg.translate(x0 + 1.05, 8.5, cz);
    batch.add('scr', new THREE.MeshStandardMaterial({ color: 0x101820, emissive: 0x30ff60, emissiveIntensity: 0.25, roughness: 0.4 }), sg, null, 0);
    // 記録台
    batch.box('desk', M.dark, cx, 0.5, z0 + 2.8, 6, 1.0, 1.2, 0, 3);
    addCol(cx - 3, 0, z0 + 2.2, cx + 3, 1.0, z0 + 3.4);
  }

  // ================= 中小アリーナ (N) =================
  {
    const { x0, x1, z0, z1, h } = A2;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    batch.box('found', M.concreteDark, cx, -0.15, cz, x1 - x0 + 1.2, 0.3, z1 - z0 + 1.2, 0, 3);

    // ---- 1F: 柔道場（西） + 剣道場（東） + ロビー（東端） ----
    const divX = -58; // 柔剣の仕切
    const lobbyX0 = -26;
    // 床: 柔道場=畳、剣道場=板
    const tatami = canvasTexture(128, 256, (ctx) => {
      ctx.fillStyle = '#7a9a5a';
      ctx.fillRect(0, 0, 128, 256);
      ctx.strokeStyle = 'rgba(40,60,25,0.5)';
      ctx.lineWidth = 3;
      for (let y = 0; y <= 256; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
      for (let y = 0; y < 256; y += 8) { ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
    });
    const tg = new THREE.PlaneGeometry(divX - x0 - 1, z1 - z0 - 2);
    tg.rotateX(-Math.PI / 2);
    tg.translate((x0 + divX) / 2, 0.16, cz);
    batch.add('tatami', new THREE.MeshStandardMaterial({ map: tatami, roughness: 0.95 }), tg, null, 2);
    addFloor(x0 + 1, divX, z0 + 1, z1 - 1, 0.16);
    // 剣道場床
    const kt = courtTex(0, lobbyX0 - divX, z1 - z0);
    const kg = new THREE.PlaneGeometry(lobbyX0 - divX, z1 - z0);
    kg.rotateX(-Math.PI / 2);
    kg.translate((divX + lobbyX0) / 2, 0.06, cz);
    batch.add('kfloor', new THREE.MeshStandardMaterial({ map: kt, roughness: 0.5 }), kg, null, 2);
    addFloor(divX, lobbyX0, z0 + 1, z1 - 1, 0.1);
    // ロビー床
    addFloor(lobbyX0, x1, z0 + 8, z1 - 8, 0.05);
    batch.box('found2', M.concreteDark, (lobbyX0 + x1) / 2, 0.02, cz, x1 - lobbyX0, 0.1, 16, 0, 2);

    // 1F天井
    batch.add('ceilN', M.ceiling, new THREE.PlaneGeometry(x1 - x0 - 1, z1 - z0 - 1).rotateX(Math.PI / 2).translate(cx, 4.6, cz), null, 0);
    for (let x = x0 + 3; x < x1 - 3; x += 7) {
      batch.box('lightP', M.lightPanel, x, 4.5, cz, 1.4, 0.06, 0.35, 0, 0);
    }
    // 仕切壁
    batch.box('wallN', M.wallPaint, divX, 2.3, cz, 0.3, 4.6, z1 - z0 - 1, 0, 3);
    addCol(divX - 0.2, 0, z0 + 0.5, divX + 0.2, 4.6, z1 - 0.5);
    // 武具棚
    for (let i = 0; i < 6; i++) {
      inst.add('locker', x0 + 2 + i * 0.45, 0.16, z0 + 0.9, 0, 1.3, 2.0);
      inst.add('locker', lobbyX0 - 2.5 - i * 0.45, 0.1, z0 + 0.9, 0, 1.3, 2.0);
    }
    // 剣道の的…ではなく、稽通用の避難? 垂
    for (let i = 0; i < 3; i++) {
      batch.box('mune', M.dark, x0 + 8 + i * 14, 0.55, cz, 1.0, 1.1, 0.3, 0, 0);
      addCol(x0 + 7.5 + i * 14, 0, cz - 0.2, x0 + 8.5 + i * 14, 1.1, cz + 0.2);
    }
    // 壁
    for (const [wx, wz, sx, sz] of [[cx, z0, x1 - x0, 0.5], [cx, z1, x1 - x0, 0.5], [x0, cz, 0.5, z1 - z0]]) {
      batch.box('wallN', M.concreteWhite, wx, h / 2, wz, sx, h, sz, 0, 3);
    }
    addCol(x0, 0, z0 - 0.3, x1, h, z0 + 0.3);
    addCol(x0, 0, z1 - 0.3, x1, h, z1 + 0.3);
    addCol(x0 - 0.3, 0, z0, x0 + 0.3, h, z1);
    // 東壁（ロビー: 入口）z -62..-52 だけ壁高く、入口開口
    batch.box('wallN', M.concreteWhite, x1, h / 2, z0 + 0.3 + (cz - 6 - (z0 + 0.3)) / 2, 0.5, h, cz - 6 - (z0 + 0.3), 0, 3);
    addCol(x1 - 0.3, 0, z0 + 0.3, x1 + 0.3, h, cz - 6);
    batch.box('wallN', M.concreteWhite, x1, h / 2, cz + 6 + (z1 - 0.3 - (cz + 6)) / 2, 0.5, h, z1 - 0.3 - (cz + 6), 0, 3);
    addCol(x1 - 0.3, 0, cz + 6, x1 + 0.3, h, z1 - 0.3);
    batch.box('wallN', M.concreteWhite, x1, 3.2 + (h - 3.2) / 2, cz, 0.5, h - 3.2, 12, 0, 3);
    addCol(x1 - 0.3, 3.2, cz - 6, x1 + 0.3, h, cz + 6);
    for (const dz of [-1.2, 1.2]) {
      const dg = new THREE.BoxGeometry(0.08, 2.6, 2.1);
      dg.translate(x1 - 0.15, 1.3, cz + dz);
      batch.add('gDoor', M.glassDark, dg, null, 0);
    }
    // 玄関庇
    batch.box('aluF', M.aluminum, x1 + 2, 3.5, cz, 4, 0.16, 12, 0, 3);
    const signG = new THREE.PlaneGeometry(6, 0.7);
    signG.rotateY(-Math.PI / 2);
    signG.translate(x1 + 0.4, 4.4, cz);
    batch.add('aSignN', ctx.signMats.arenaNName, signG, null, 0);
    // 上部窓帯
    for (const wz of [z0 + 0.2, z1 - 0.2]) batch.box('glB', M.glassDark, cx, 8.6, wz, x1 - x0 - 2, 2.6, 0.1, 0, 0);
    for (const wz of [z0 + 0.2, z1 - 0.2]) batch.box('glB', M.glassDark, x0 + 0.2, 8.6, cz, 0.1, 2.6, z1 - z0 - 2, 0, 0);

    // 1F→2F階段（ロビー北側）
    {
      const sx0 = lobbyX0 + 2, sz0 = z0 + 2;
      const rise = 5.3, steps = 28, r2 = rise / steps, tread = 0.27;
      for (let s = 0; s < steps; s++) {
        const sy = (s + 1) * r2;
        const szz = z0 + 1.2 + s * tread;
        batch.box('step', M.floorSchool, sx0 + 3, sy - r2 * 0.35, szz, 3.4, r2 * 0.7, tread + 0.02, 0, 2);
        addFloor(sx0 + 1.3, sx0 + 4.7, szz - tread / 2 - 0.01, szz + tread / 2 + 0.01, sy);
      }
      addCol(sx0 + 1.1, 0, z0 + 1.0, sx0 + 1.3, rise - 0.4, z0 + 1.2 + steps * tread);
      addCol(sx0 + 4.7, 0, z0 + 1.0, sx0 + 4.9, rise - 0.4, z0 + 1.2 + steps * tread);
    }

    // ---- 2F: 小アリーナ ----
    const y2 = 5.3;
    const h2 = 7.2;
    const ct2 = courtTex(1, x1 - x0 - 2, z1 - z0 - 2);
    const f2 = new THREE.PlaneGeometry(x1 - x0 - 2, z1 - z0 - 2);
    f2.rotateX(-Math.PI / 2);
    f2.translate(cx, y2 + 0.05, cz);
    batch.add('court2', new THREE.MeshStandardMaterial({ map: ct2, roughness: 0.45 }), f2, null, 2);
    addFloor(x0 + 1.2, x1 - 1.2, z0 + 1.2, z1 - 1.2, y2 + 0.1);
    // 2F壁
    for (const wz of [z0, z1]) {
      batch.box('wallN2', M.concreteWhite, cx, y2 + h2 / 2, wz, x1 - x0, h2, 0.5, 0, 3);
      addCol(x0, y2, wz - 0.3, x1, y2 + h2, wz + 0.3);
    }
    batch.box('wallN2', M.concreteWhite, x0, y2 + h2 / 2, cz, 0.5, h2, z1 - z0, 0, 3);
    addCol(x0 - 0.3, y2, z0, x0 + 0.3, y2 + h2, z1);
    batch.box('wallN2', M.concreteWhite, x1, y2 + h2 / 2, cz, 0.5, h2, z1 - z0, 0, 3);
    addCol(x1 - 0.3, y2, z0, x1 + 0.3, y2 + h2, z1);
    // 2F窓帯
    for (const wz of [z0 + 0.2, z1 - 0.2]) batch.box('glB2', M.glassDark, cx, y2 + 3.6, wz, x1 - x0 - 2, 2.8, 0.1, 0, 0);
    // 2F天井
    batch.add('ceilN2', M.dark, new THREE.PlaneGeometry(x1 - x0 - 1, z1 - z0 - 1).rotateX(Math.PI / 2).translate(cx, y2 + h2, cz), null, 0);
    for (let x = x0 + 4; x < x1 - 3; x += 7) {
      batch.box('truss', M.steelWhite, x, y2 + h2 - 0.4, cz, 0.16, 0.16, z1 - z0 - 2, 0, 0);
      for (let z = z0 + 5; z < z1 - 4; z += 9) batch.box('lamp', M.lightPanel, x, y2 + h2 - 0.8, z, 1.4, 0.08, 0.35, 0, 0);
    }
    hoop(batch, M, addCol, cx, z0 + 5, 0, y2);
    hoop(batch, M, addCol, cx, z1 - 5, Math.PI, y2);
    // 2F手摺（階段抜け口 x lobbyX0..x1 はロビー上…簡易に全域手摺+階段口)
    addCol(x1 - 8, y2, z0 + 0.6, x1 - 1.2, y2 + 1.1, z0 + 0.9);
    addCol(x1 - 8, y2, z1 - 0.9, x1 - 1.2, y2 + 1.1, z1 - 0.6);
    // 2F屋根
    batch.box('roofN', M.dark, cx, y2 + h2 + 0.15, cz, x1 - x0, 0.3, z1 - z0, 0, 3);
    for (const [wx, wz, sx, sz] of [[cx, z0 + 0.15, x1 - x0, 0.3], [cx, z1 - 0.15, x1 - x0, 0.3], [x0 + 0.15, cz, 0.3, z1 - z0], [x1 - 0.15, cz, 0.3, z1 - z0]]) {
      batch.box('para', M.concreteWhite, wx, y2 + h2 + 0.75, wz, sx, 0.9, sz, 0, 3);
    }
    addCol(x0, y2 + h2, z0, x1, y2 + h2 + 1.2, z0 + 0.3);
    addCol(x0, y2 + h2, z1 - 0.3, x1, y2 + h2 + 1.2, z1);
    addCol(x0, y2 + h2, z0, x0 + 0.3, y2 + h2 + 1.2, z1);
    addCol(x1 - 0.3, y2 + h2, z0, x1, y2 + h2 + 1.2, z1);
    addFloor(x0 + 0.3, x1 - 0.3, z0 + 0.3, z1 - 0.3, y2 + h2 + 0.3);
  }
}
