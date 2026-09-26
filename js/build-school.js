// ============================================================
// build-school.js — 校舎棟（S棟 + ラーニングストリート + N棟）
// 外殻・膜屋根・階段コア（スラブ開口つき）・都市の門・屋上まで
// ============================================================
import * as THREE from 'three';
import { CFG } from './config.js';
import { canvasTexture } from './util.js';

const S = CFG.school;
const LS_Z_S = S.sZ0;   // 8  (LS南端 = S棟側ガラス面)
const LS_Z_N = S.nZ1;   // -6 (LS北端 = N棟側ガラス面)

// ベイ(柱モジュール 8m)
export const bays = [];
for (let x = S.x0; x < S.x1 - 0.01; x += S.bay) bays.push({ x0: x, x1: x + S.bay, cx: x + S.bay / 2 });

// 扉のあるベイ（S棟は全ベイに教室扉、N棟はところどころ）
const DOOR_BAYS_S = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const DOOR_BAYS_N = [1, 3, 5, 6, 7, 9, 11];

// 階段コア定義（S棟東=校舎東端 / S棟西 / N棟中央）
export const CORES = [
  { id: 'sE', x0: 92.2, x1: 99.8, z0: 8, z1: 24 },
  { id: 'sW', x0: 4.2, x1: 12, z0: 8, z1: 24 },
  { id: 'nC', x0: 52.2, x1: 59.8, z0: -22, z1: -6 },
];
// 各コアのスラブ開口（階段が抜ける穴）とレーン
const coreHole = (c) => {
  const laneC = c.x1 - 1.6;
  const zA = c.z1 - 1.4, zB = c.z1 - 7.9;   // 開口のz範囲（北側…z1側から南へ）
  return { x0: laneC - 0.95, x1: laneC + 0.95, z0: Math.min(zA, zB), z1: Math.max(zA, zB), laneC };
};

// 校章テクスチャ（鋳物風）
export function emblemTexture(size = 256) {
  return canvasTexture(size, size, (ctx) => {
    ctx.clearRect(0, 0, size, size);
    const c = size / 2;
    ctx.strokeStyle = '#a8823f';
    ctx.lineWidth = size * 0.07;
    ctx.beginPath(); ctx.arc(c, c, c * 0.82, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,220,160,0.7)';
    ctx.lineWidth = size * 0.015;
    ctx.beginPath(); ctx.arc(c, c, c * 0.86, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#a8823f';
    ctx.beginPath();
    ctx.moveTo(c * 0.45, c * 1.28);
    ctx.quadraticCurveTo(c, c * 1.12, c * 1.55, c * 1.28);
    ctx.lineTo(c * 1.55, c * 1.14);
    ctx.quadraticCurveTo(c, c * 0.98, c * 0.45, c * 1.14);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(c, c * 0.45);
    ctx.quadraticCurveTo(c * 1.35, c * 0.55, c * 1.42, c * 0.95);
    ctx.quadraticCurveTo(c * 1.12, c * 0.82, c, c * 1.05);
    ctx.quadraticCurveTo(c * 0.88, c * 0.82, c * 0.58, c * 0.95);
    ctx.quadraticCurveTo(c * 0.65, c * 0.55, c, c * 0.45);
    ctx.fill();
  });
}

// ============================================================
export function buildSchool(ctx) {
  const { M, batch, addCol, addFloor } = ctx;
  const roofH = S.roofH;
  const LY = S.levelY;

  // 開口つきスラブ生成（矩形を穴でスライスして箱に分ける）
  const slabWithHoles = (x0, x1, z0, z1, y, thickness, mat, holes) => {
    // z方向のエッジを集める
    const zs = [z0, z1];
    for (const h of holes) { zs.push(h.z0, h.z1); }
    zs.sort((a, b) => a - b);
    for (let i = 0; i < zs.length - 1; i++) {
      const za = zs[i], zb = zs[i + 1];
      if (zb - za < 0.01) continue;
      const zc = (za + zb) / 2;
      const inHoles = holes.filter(h => h.z0 <= zc && zc <= h.z1);
      if (inHoles.length === 0) {
        batch.box('slab', mat, (x0 + x1) / 2, y - thickness / 2, zc, x1 - x0, thickness, zb - za, 0, 2);
        addFloor(x0, x1, za, zb, y);
      } else {
        // x方向に分割
        const xs = [x0, x1];
        for (const h of inHoles) { xs.push(h.x0, h.x1); }
        xs.sort((a, b) => a - b);
        for (let j = 0; j < xs.length - 1; j++) {
          const xa = xs[j], xb = xs[j + 1];
          if (xb - xa < 0.01) continue;
          const xc = (xa + xb) / 2;
          const covered = inHoles.some(h => h.x0 <= xc && xc <= h.x1);
          if (!covered) {
            batch.box('slab', mat, xc, y - thickness / 2, zc, xb - xa, thickness, zb - za, 0, 2);
            addFloor(xa, xb, za, zb, y);
          }
        }
      }
    }
  };

  const holesS = CORES.filter(c => c.z0 === 8).map(coreHole);
  const holesN = [coreHole(CORES[2])];

  // ============ 1. 基礎・床スラブ ============
  batch.box('concDark', M.concreteDark, (S.x0 + S.x1) / 2, 0.15, (S.nZ0 + S.sZ1) / 2, S.x1 - S.x0 + 1.6, 0.3, (S.sZ1 - S.nZ0) + 1.6, 0, 3);
  for (let f = 1; f < 5; f++) {
    const y = LY[f];
    slabWithHoles(S.x0, S.x1, S.sZ0, S.sZ1, y, S.slab, M.floorSchool, holesS);
    slabWithHoles(S.x0, S.x1, S.nZ0, S.nZ1, y, S.slab, M.floorSchool, holesN);
    // LS側スラブ端の梁
    batch.box('conc', M.concrete, (S.x0 + S.x1) / 2, y + 0.35, LS_Z_S + 0.15, S.x1 - S.x0, 0.7, 0.3, 0, 3);
    batch.box('conc', M.concrete, (S.x0 + S.x1) / 2, y + 0.35, LS_Z_N - 0.15, S.x1 - S.x0, 0.7, 0.3, 0, 3);
  }
  // 1F床
  batch.box('slab', M.floorSchool, (S.x0 + S.x1) / 2, -0.1, (S.sZ0 + S.sZ1) / 2, S.x1 - S.x0, 0.2, S.sZ1 - S.sZ0, 0, 2);
  batch.box('slab', M.floorSchool, (S.x0 + S.x1) / 2, -0.1, (S.nZ0 + S.nZ1) / 2, S.x1 - S.x0, 0.2, S.nZ1 - S.nZ0, 0, 2);
  batch.box('slabLS', M.floorLS, (S.x0 + S.x1) / 2, -0.1, (LS_Z_N + LS_Z_S) / 2, S.x1 - S.x0, 0.2, LS_Z_S - LS_Z_N, 0, 2);
  addFloor(S.x0, S.x1, S.nZ0, S.sZ1, 0);

  // ============ 2. LS大柱 ============
  for (let x = S.x0; x <= S.x1 + 0.01; x += S.bay) {
    for (const z of [LS_Z_S + 0.3, LS_Z_N - 0.3]) {
      batch.cyl('col', M.concreteWhite, x, roofH / 2, z, 0.34, 0.4, roofH, 10);
      addCol(x - 0.42, 0, z - 0.42, x + 0.42, roofH, z + 0.42);
    }
  }

  // ============ 3. 外壁ファサード ============
  const wallH = roofH;
  batch.add('facS', M.facadeSouth, new THREE.PlaneGeometry(S.x1 - S.x0, wallH).translate((S.x0 + S.x1) / 2, wallH / 2, S.sZ1 - 0.08), null, 3);
  batch.add('facN', M.facadeNorth, new THREE.PlaneGeometry(S.x1 - S.x0, wallH).rotateY(Math.PI).translate((S.x0 + S.x1) / 2, wallH / 2, S.nZ0 + 0.08), null, 3);
  addCol(S.x0, 0, S.sZ1 - 0.45, S.x1, wallH, S.sZ1 + 0.2);
  addCol(S.x0, 0, S.nZ0 - 0.2, S.x1, wallH, S.nZ0 + 0.45);

  const endWall = (xe, face) => {
    batch.box('concW', M.concreteWhite, xe, wallH / 2, (S.sZ0 + S.sZ1) / 2, 0.5, wallH, S.sZ1 - S.sZ0, 0, 3);
    batch.box('concW', M.concreteWhite, xe, wallH / 2, (S.nZ0 + S.nZ1) / 2, 0.5, wallH, S.nZ1 - S.nZ0, 0, 3);
    for (let f = 0; f < 5; f++) {
      const y = LY[f] + S.floorH[f] * 0.55;
      for (const zc of [(S.sZ0 + S.sZ1) / 2, (S.nZ0 + S.nZ1) / 2]) {
        batch.box('glassD', M.glassDark, xe + face * 0.28, y, zc, 0.06, 1.5, 2.4, 0, 0);
      }
    }
    for (const zc of [S.sZ0 + 0.5, S.sZ1 - 0.5, S.nZ0 + 0.5, S.nZ1 - 0.5]) {
      batch.box('concW', M.concreteWhite, xe + face * 0.34, wallH / 2, zc, 0.28, wallH, 0.6, 0, 3);
    }
    addCol(xe - 0.45, 0, S.nZ0, xe + 0.45, wallH, S.nZ1);
    addCol(xe - 0.45, 0, S.sZ0, xe + 0.45, wallH, S.sZ1);
  };
  endWall(S.x1, +1);
  endWall(S.x0, -1);

  // ============ 4. LS面のガラス壁（2F〜5F、扉付き） ============
  for (let f = 1; f < 5; f++) {
    const y0 = LY[f], h = S.floorH[f];
    bays.forEach((b, i) => {
      for (const [zWall, side, doorBays] of [[LS_Z_S, 1, DOOR_BAYS_S], [LS_Z_N, -1, DOOR_BAYS_N]]) {
        const hasDoor = doorBays.includes(i);
        const segs = hasDoor
          ? [[b.x0 + 0.15, b.cx - 0.95], [b.cx + 0.95, b.x1 - 0.15]]
          : [[b.x0 + 0.15, b.x1 - 0.15]];
        for (const [sx0, sx1] of segs) {
          const w = sx1 - sx0;
          if (w <= 0.02) continue;
          batch.add('glsR', M.glassRailing, new THREE.PlaneGeometry(w, 1.0).translate((sx0 + sx1) / 2, y0 + 0.5, zWall + side * 0.02), null, 0);
          addCol(sx0, y0, zWall - 0.08, sx1, y0 + 1.0, zWall + 0.08);
          batch.add('glsC', M.glassClear, new THREE.PlaneGeometry(w, h - 1.0 - 0.2).translate((sx0 + sx1) / 2, y0 + 1.0 + (h - 1.2) / 2, zWall + side * 0.02), null, 0);
          addCol(sx0, y0 + 1.0, zWall - 0.08, sx1, y0 + h - 0.2, zWall + 0.08);
          batch.box('alu', M.aluminum, sx0, y0 + h / 2, zWall + side * 0.04, 0.1, h, 0.12, 0, 0);
          batch.box('alu', M.aluminum, sx1, y0 + h / 2, zWall + side * 0.04, 0.1, h, 0.12, 0, 0);
        }
        if (hasDoor) {
          batch.box('alu', M.aluminum, b.cx, y0 + 1.1, zWall + side * 0.04, 2.1, 0.12, 0.12, 0, 0);
          batch.box('alu', M.aluminum, b.cx - 1.0, y0 + 1.1, zWall + side * 0.04, 0.1, 2.2, 0.12, 0, 0);
          batch.box('alu', M.aluminum, b.cx + 1.0, y0 + 1.1, zWall + side * 0.04, 0.1, 2.2, 0.12, 0, 0);
          const dg = new THREE.BoxGeometry(0.9, 2.05, 0.05);
          dg.rotateY(side * 0.55);
          dg.translate(b.cx - 0.42, y0 + 1.03, zWall + side * 0.14);
          batch.add('door', M.glassDark, dg, null, 0);
          const sg = new THREE.PlaneGeometry(0.66, 0.17);
          if (side < 0) sg.rotateY(Math.PI);
          sg.translate(b.cx + 1.45, y0 + 2.4, zWall + side * 0.09);
          batch.add('rsign', ctx.signMats.roomSign, sg, null, 0);
        }
      }
    });
  }

  // ============ 5. ブリッジ（2〜5F） ============
  const bridgeXs = [20, 44, 68, 92];
  for (let f = 1; f < 5; f++) {
    const y = LY[f];
    for (const bx of bridgeXs) {
      batch.box('brg', M.floorSchool, bx, y + 0.08, (LS_Z_N + LS_Z_S) / 2, 3.4, 0.16, LS_Z_S - LS_Z_N, 0, 3);
      addFloor(bx - 1.7, bx + 1.7, LS_Z_N + 0.25, LS_Z_S - 0.25, y + 0.16);
      batch.box('steel', M.steel, bx, y - 0.35, (LS_Z_N + LS_Z_S) / 2, 0.3, 0.55, LS_Z_S - LS_Z_N, 0, 0);
      for (const rz of [LS_Z_N + 0.2, LS_Z_S - 0.2]) {
        batch.add('glsR', M.glassRailing, new THREE.PlaneGeometry(3.4, 1.1).translate(bx, y + 0.71, rz), null, 0);
        batch.box('alu', M.aluminum, bx, y + 1.27, rz, 3.4, 0.06, 0.06, 0, 0);
        addCol(bx - 1.7, y, rz - 0.07, bx + 1.7, y + 1.3, rz + 0.07);
      }
    }
  }

  // ============ 6. 階段コア ============
  for (const c of CORES) {
    const hole = coreHole(c);
    // 隔壁（全高）
    for (const wx of [c.x0, c.x1]) {
      batch.box('conc', M.concrete, wx, roofH / 2, (c.z0 + c.z1) / 2, 0.4, roofH, c.z1 - c.z0, 0, 3);
      addCol(wx - 0.2, 0, c.z0, wx + 0.2, roofH, c.z1);
    }
    for (let f = 0; f < 4; f++) {
      const yBase = LY[f], rise = LY[f + 1] - LY[f];
      const r2 = 0.191;
      const tread = 0.234;   // 開口長に収まる踏面
      const zStart = c.z1 - 1.2 - tread / 2;
      // 踏段: 開口の南端(z0側)がスラブに接するまで敷き詰める（到達部はフラット化）
      for (let s = 0; ; s++) {
        const sz = zStart - s * tread;
        if (sz < hole.z0 - 0.1) break;
        const sy = Math.min(yBase + (s + 1) * r2, LY[f + 1]);
        batch.box('step', M.floorSchool, hole.laneC, sy - r2 * 0.35, sz, 1.9, r2 * 0.7, tread + 0.02, 0, 2);
        addFloor(hole.x0, hole.x1, sz - tread / 2 - 0.01, sz + tread / 2 + 0.01, sy);
      }
      // 開口の保護手摺（北端 z1側のみ。南端は階段の到達口なので開放）
      const yUp = LY[f + 1];
      addCol(hole.x0 - 0.25, yUp, hole.z0 + 0.3, hole.x0, yUp + 1.05, hole.z1);   // 西手摺
      addCol(hole.x1, yUp, hole.z0 + 0.3, hole.x1 + 0.25, yUp + 1.05, hole.z1);   // 東手摺
      addCol(hole.x0, yUp, hole.z1, hole.x1, yUp + 1.05, hole.z1 + 0.25);         // 北端手摺
      batch.box('alu', M.aluminum, hole.x0 - 0.12, yUp + 1.0, (hole.z0 + hole.z1) / 2 + 0.2, 0.07, 0.07, hole.z1 - hole.z0 - 0.4, 0, 0);
      batch.box('alu', M.aluminum, hole.x1 + 0.12, yUp + 1.0, (hole.z0 + hole.z1) / 2 + 0.2, 0.07, 0.07, hole.z1 - hole.z0 - 0.4, 0, 0);
      batch.box('alu', M.aluminum, (hole.x0 + hole.x1) / 2, yUp + 1.0, hole.z1 + 0.12, hole.x1 - hole.x0, 0.07, 0.07, 0, 0);
      for (let pz = hole.z0 + 1.4; pz < hole.z1; pz += 2.2) {
        batch.box('alu', M.aluminum, hole.x0 - 0.12, yUp + 0.5, pz, 0.06, 1.05, 0.06, 0, 0);
        batch.box('alu', M.aluminum, hole.x1 + 0.12, yUp + 0.5, pz, 0.06, 1.05, 0.06, 0, 0);
      }
    }
  }

  // ============ 7. 膜屋根 ============
  const R = 7.3;
  const springY = roofH;
  const czL = (LS_Z_N + LS_Z_S) / 2;
  const archGeo = new THREE.CylinderGeometry(R, R, S.x1 - S.x0 - 0.8, 28, 1, true, 0, Math.PI);
  archGeo.rotateZ(Math.PI / 2);
  archGeo.translate((S.x0 + S.x1) / 2, springY, czL);
  batch.add('memb', M.membrane, archGeo, null, 2);
  for (let x = S.x0 + 0.8; x <= S.x1 - 0.7; x += 9.6) {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI;
      pts.push(new THREE.Vector3(x, springY + R * Math.sin(a), czL + R * Math.cos(a)));
    }
    batch.add('steelW', M.steelWhite, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.14, 8), null, 2);
  }
  for (const a of [Math.PI * 0.22, Math.PI * 0.5, Math.PI * 0.78]) {
    const p1 = new THREE.Vector3(S.x0 + 0.4, springY + R * Math.sin(a), czL + R * Math.cos(a));
    const p2 = new THREE.Vector3(S.x1 - 0.4, springY + R * Math.sin(a), czL + R * Math.cos(a));
    batch.add('steelW', M.steelWhite, new THREE.TubeGeometry(new THREE.LineCurve3(p1, p2), 2, 0.07, 6), null, 0);
  }
  const endCap = (xe, face) => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, R, 0, Math.PI, false);
    shape.lineTo(-R, 0);
    const geo = new THREE.ShapeGeometry(shape, 24);
    geo.rotateY(face > 0 ? Math.PI / 2 : -Math.PI / 2);
    geo.translate(xe, springY, czL);
    batch.add('memb', M.membrane, geo, null, 0);
  };
  endCap(S.x1 - 0.4, 1);
  endCap(S.x0 + 0.4, -1);

  // ============ 8. 都市の門（東端ガラスカーテンウォール） ============
  const glassH = springY;
  batch.add('glsC', M.glassClear, new THREE.PlaneGeometry(LS_Z_S - LS_Z_N - 0.4, glassH).rotateY(Math.PI / 2).translate(S.x1 - 0.25, glassH / 2, czL), null, 0);
  for (let z = LS_Z_N + 1; z < LS_Z_S - 0.4; z += 2) {
    batch.box('alu', M.aluminum, S.x1 - 0.25, glassH / 2, z, 0.16, glassH, 0.18, 0, 0);
  }
  for (let y = 3.4; y < glassH - 1; y += 3.4) batch.box('alu', M.aluminum, S.x1 - 0.25, y, czL, 0.16, 0.14, LS_Z_S - LS_Z_N - 0.4, 0, 0);
  addCol(S.x1 - 0.6, 0, LS_Z_N + 0.2, S.x1, glassH, -2.3);
  addCol(S.x1 - 0.6, 0, 2.3, S.x1, glassH, LS_Z_S - 0.2);
  addCol(S.x1 - 0.6, 2.7, -2.3, S.x1, glassH, 2.3);
  batch.box('aluD', M.aluminum, S.x1 - 0.25, 1.35, -2.42, 0.3, 2.7, 0.35, 0, 0);
  batch.box('aluD', M.aluminum, S.x1 - 0.25, 1.35, 2.42, 0.3, 2.7, 0.35, 0, 0);
  batch.box('aluD', M.aluminum, S.x1 - 0.25, 2.78, 0, 0.3, 0.25, 4.85, 0, 0);
  {
    const eg = new THREE.PlaneGeometry(2.3, 2.3);
    eg.rotateY(-Math.PI / 2);
    eg.translate(S.x1 - 0.42, glassH - 3.0, czL);
    batch.add('emb', new THREE.MeshStandardMaterial({ map: emblemTexture(), transparent: true, metalness: 0.75, roughness: 0.35, side: THREE.DoubleSide }), eg, null, 0);
    const pg = new THREE.PlaneGeometry(7.5, 0.8);
    pg.rotateY(-Math.PI / 2);
    pg.translate(S.x1 - 0.42, glassH - 1.45, czL);
    batch.add('plat', ctx.signMats.namePlate, pg, null, 0);
  }
  batch.box('aluD', M.aluminum, S.x1 + 2.3, 3.4, czL, 5.0, 0.18, 6.8, 0, 3);
  for (const dz of [-2.9, 2.9]) batch.cyl('steelW', M.steelWhite, S.x1 + 4.5, 1.7, czL + dz, 0.07, 0.07, 3.4, 8);

  // 西端ガラス
  batch.add('glsC', M.glassClear, new THREE.PlaneGeometry(LS_Z_S - LS_Z_N - 0.4, glassH).rotateY(Math.PI / 2).translate(S.x0 + 0.25, glassH / 2, czL), null, 0);
  for (let z = LS_Z_N + 1; z < LS_Z_S - 0.4; z += 2) batch.box('alu', M.aluminum, S.x0 + 0.25, glassH / 2, z, 0.16, glassH, 0.18, 0, 0);
  addCol(S.x0, 0, LS_Z_N + 0.2, S.x0 + 0.6, glassH, -2.3);
  addCol(S.x0, 0, 2.3, S.x0 + 0.6, glassH, LS_Z_S - 0.2);
  addCol(S.x0, 2.7, -2.3, S.x0 + 0.6, glassH, 2.3);

  // ============ 9. 屋根・屋上 ============
  // 屋上階段室（S棟東コア上）のため x 92..100, z 8..15.6 を開口にする
  const roofHole = { x0: 91.9, x1: 100.1, z0: 7.9, z1: 15.45 };
  slabWithHoles(S.x0, S.x1, S.sZ0, S.sZ1, roofH + 0.3, 0.3, M.dark, [roofHole]);
  slabWithHoles(S.x0, S.x1, S.nZ0, S.nZ1, roofH + 0.3, 0.3, M.dark, []);
  batch.box('concW', M.concreteWhite, (S.x0 + S.x1) / 2, roofH + 0.75, S.sZ1 - 0.15, S.x1 - S.x0, 0.9, 0.3, 0, 3);
  batch.box('concW', M.concreteWhite, (S.x0 + S.x1) / 2, roofH + 0.75, S.nZ0 + 0.15, S.x1 - S.x0, 0.9, 0.3, 0, 3);
  for (const xe of [S.x0 + 0.15, S.x1 - 0.15]) {
    batch.box('concW', M.concreteWhite, xe, roofH + 0.75, (S.sZ0 + S.sZ1) / 2, 0.3, 0.9, S.sZ1 - S.sZ0, 0, 3);
    batch.box('concW', M.concreteWhite, xe, roofH + 0.75, (S.nZ0 + S.nZ1) / 2, 0.3, 0.9, S.nZ1 - S.nZ0, 0, 3);
  }
  addCol(S.x0, roofH, S.sZ1 - 0.3, S.x1, roofH + 1.2, S.sZ1);
  addCol(S.x0, roofH, S.nZ0, S.x1, roofH + 1.2, S.nZ0 + 0.3);
  for (const zr of [S.sZ0 + 0.12, S.nZ1 - 0.12]) {
    batch.box('alu', M.aluminum, (S.x0 + S.x1) / 2, roofH + 0.85, zr, S.x1 - S.x0, 0.08, 0.08, 0, 0);
    addCol(S.x0, roofH + 0.3, zr - 0.06, S.x1, roofH + 1.1, zr + 0.06);
  }
  // 屋上開口の回り手摺
  addCol(roofHole.x0 - 0.15, roofH + 0.3, roofHole.z0, roofHole.x0, roofH + 1.4, roofHole.z1);
  addCol(roofHole.x1, roofH + 0.3, roofHole.z0, roofHole.x1 + 0.15, roofH + 1.4, roofHole.z1);
  // 北端手摺は階段出口(x 96.5..98.7)を開ける
  addCol(roofHole.x0, roofH + 0.3, roofHole.z1, 96.5, roofH + 1.4, roofHole.z1 + 0.15);
  addCol(98.7, roofH + 0.3, roofHole.z1, roofHole.x1, roofH + 1.4, roofHole.z1 + 0.15);
  batch.box('alu', M.aluminum, roofHole.x0 - 0.08, roofH + 1.35, (roofHole.z0 + roofHole.z1) / 2, 0.07, 0.07, roofHole.z1 - roofHole.z0, 0, 0);
  batch.box('alu', M.aluminum, roofHole.x1 + 0.08, roofH + 1.35, (roofHole.z0 + roofHole.z1) / 2, 0.07, 0.07, roofHole.z1 - roofHole.z0, 0, 0);

  // 屋上設備
  const ahu = (x, z, w, d) => {
    batch.box('ahu', M.steelDark, x, roofH + 1.3, z, w, 2.0, d, 0, 3);
    batch.box('ahu2', M.steel, x, roofH + 2.45, z, w * 0.7, 0.4, d * 0.7, 0, 3);
    batch.box('duct', M.steel, x + w / 2 + 1.3, roofH + 1.1, z, 2.4, 0.7, 0.7, 0, 0);
    addCol(x - w / 2, roofH, z - d / 2, x + w / 2, roofH + 2.6, z + d / 2);
  };
  ahu(24, S.nZ0 + 4, 6, 4); ahu(70, S.nZ0 + 4, 6, 4);
  ahu(36, S.sZ1 - 4, 6, 4); ahu(72, S.sZ1 - 4, 6, 4);
  for (const x of [18, 84]) {
    batch.cyl('ct', M.steel, x, roofH + 1.6, S.nZ0 + 3.5, 1.5, 1.5, 3.2, 14);
    addCol(x - 1.5, roofH, S.nZ0 + 2.0, x + 1.5, roofH + 3.2, S.nZ0 + 5.0);
  }
  for (let i = 0; i < 5; i++) {
    const px = 32 + i * 6;
    const pg2 = new THREE.BoxGeometry(5.4, 0.08, 3.2);
    pg2.rotateX(-0.42);
    pg2.translate(px, roofH + 1.35, S.sZ1 - 4.8);
    batch.add('pv', M.solar, pg2, null, 0);
    batch.box('steel', M.steel, px, roofH + 0.75, S.sZ1 - 4.8, 5.2, 0.1, 0.1, 0, 0);
  }
  batch.cyl('steelW', M.steelWhite, S.x1 - 6, roofH + 3.5, S.nZ0 + 3, 0.05, 0.09, 6, 6);
  addCol(S.x1 - 6.2, roofH, S.nZ0 + 2.8, S.x1 - 5.8, roofH + 6.5, S.nZ0 + 3.2);

  // ---- 屋上階段室（5F→屋上、S棟東コア上） ----
  {
    const hx0 = 92.0, hx1 = 100, hz0 = 8, hz1 = 15.6;
    const ph = 3.2;
    const wallY = roofH + 0.3 + ph / 2;
    // 西壁
    batch.box('concW', M.concreteWhite, hx0 + 0.15, wallY, (hz0 + hz1) / 2, 0.3, ph, hz1 - hz0, 0, 3);
    addCol(hx0, roofH + 0.3, hz0, hx0 + 0.3, roofH + 0.3 + ph, hz1);
    // 東壁
    batch.box('concW', M.concreteWhite, hx1 - 0.15, wallY, (hz0 + hz1) / 2, 0.3, ph, hz1 - hz0, 0, 3);
    addCol(hx1 - 0.3, roofH + 0.3, hz0, hx1, roofH + 0.3 + ph, hz1);
    // 南壁
    batch.box('concW', M.concreteWhite, (hx0 + hx1) / 2, wallY, hz0 + 0.15, hx1 - hx0, ph, 0.3, 0, 3);
    addCol(hx0, roofH + 0.3, hz0, hx1, roofH + 0.3 + ph, hz0 + 0.3);
    // 北壁（出口開口 x 96.2..99.2 = 階段上端側）
    batch.box('concW', M.concreteWhite, (hx0 + 96.2) / 2, wallY, hz1 - 0.15, 96.2 - hx0, ph, 0.3, 0, 3);
    addCol(hx0, roofH + 0.3, hz1 - 0.3, 96.2, roofH + 0.3 + ph, hz1);
    batch.box('concW', M.concreteWhite, (99.2 + hx1) / 2, wallY, hz1 - 0.15, hx1 - 99.2, ph, 0.3, 0, 3);
    addCol(99.2, roofH + 0.3, hz1 - 0.3, hx1, roofH + 0.3 + ph, hz1);
    batch.box('concW', M.concreteWhite, 97.7, wallY + ph / 2 - 0.35, hz1 - 0.15, 3.0, 0.7, 0.3, 0, 3);
    addCol(96.2, roofH + 0.3 + ph - 0.7, hz1 - 0.3, 99.2, roofH + 0.3 + ph, hz1);
    // 屋根
    batch.box('concW', M.concreteWhite, (hx0 + hx1) / 2, roofH + 0.3 + ph + 0.15, (hz0 + hz1) / 2, hx1 - hx0 + 0.7, 0.3, hz1 - hz0 + 0.7, 0, 3);
    // 5F→屋上の階段（北向きに上る、xレーン 97.6）
    const rise = (roofH + 0.3) - LY[4];
    const steps = Math.round(rise / 0.19);
    const r2 = rise / steps;
    const laneX = 97.6;
    for (let s = 0; ; s++) {
      const sz = hz0 + 1.0 + s * 0.27;
      if (sz > hz1 + 0.15) break;
      const sy = Math.min(LY[4] + (s + 1) * r2, roofH + 0.3);
      batch.box('step', M.floorSchool, laneX, sy - r2 * 0.35, sz, 1.9, r2 * 0.7, 0.29, 0, 2);
      addFloor(laneX - 0.95, laneX + 0.95, sz - 0.15, sz + 0.15, sy);
    }
    // 階段サイドの側面手摺Collider
    addCol(laneX - 1.05, LY[4], hz0 + 0.8, laneX - 0.95, roofH - 0.2, hz0 + 1.0 + steps * 0.27);
    addCol(laneX + 0.95, LY[4], hz0 + 0.8, laneX + 1.05, roofH - 0.2, hz0 + 1.0 + steps * 0.27);
  }

  // ============ 10. LS共用インテリア ============
  for (let f = 1; f < 5; f++) {
    const y = LY[f];
    for (const bx of bridgeXs) {
      for (const [zWall, side, mat] of [[LS_Z_S - 1.3, 1, ctx.signMats.floorS[f]], [LS_Z_N + 1.3, -1, ctx.signMats.floorN[f]]]) {
        const g = new THREE.PlaneGeometry(2.0, 0.58);
        if (side < 0) g.rotateY(Math.PI);
        g.translate(bx, y + 3.2, zWall);
        batch.add('fsign' + f + (side > 0 ? 's' : 'n'), mat, g, null, 0);
        batch.box('steelW', M.steelWhite, bx - 0.85, y + 3.6, zWall, 0.04, 0.62, 0.04, 0, 0);
        batch.box('steelW', M.steelWhite, bx + 0.85, y + 3.6, zWall, 0.04, 0.62, 0.04, 0, 0);
      }
    }
    for (let x = S.x0 + 14; x < S.x1 - 6; x += 16) {
      for (const zWall of [LS_Z_S - 0.18, LS_Z_N + 0.18]) {
        batch.box('febox', M.concreteDark, x, y + 0.85, zWall, 0.26, 0.72, 0.38, 0, 0);
      }
    }
    for (const bx of bridgeXs) {
      for (const zc of [LS_Z_S - 1.15, LS_Z_N + 1.15]) {
        batch.cyl('pot', M.pot, bx + 5.4, y + 0.3, zc, 0.42, 0.32, 0.6, 10);
        batch.cyl('leafB', M.leaf2, bx + 5.4, y + 1.1, zc, 0.06, 0.44, 1.0, 8);
        addCol(bx + 5.05, y, zc - 0.45, bx + 5.75, y + 1.3, zc + 0.45);
      }
    }
  }
  for (const bz of [86, 20]) {
    batch.box('benchW', M.wood, bz, 0.45, 6.3, 3.4, 0.1, 0.6, 0, 3);
    batch.box('benchW', M.wood, bz, 0.45, -6.3, 3.4, 0.1, 0.6, 0, 3);
    for (const dx of [-1.4, 1.4]) {
      batch.box('steel', M.steel, bz + dx, 0.2, 6.3, 0.12, 0.4, 0.55, 0, 0);
      batch.box('steel', M.steel, bz + dx, 0.2, -6.3, 0.12, 0.4, 0.55, 0, 0);
    }
    addCol(bz - 1.8, 0, 6.0, bz + 1.8, 0.5, 6.6);
    addCol(bz - 1.8, 0, -6.6, bz + 1.8, 0.5, -6.0);
  }
  {
    const g = new THREE.PlaneGeometry(2.3, 1.55);
    g.translate(S.x1 - 6, 1.8, 4.6);
    batch.add('map', ctx.signMats.campusMap, g, null, 0);
    batch.box('steel', M.steel, S.x1 - 6, 0.5, 4.6, 0.12, 1.0, 0.12, 0, 0);
    addCol(S.x1 - 6.15, 0, 4.45, S.x1 - 5.85, 1.0, 4.75);
  }

  // ============ 11. エレベーター（x=36） ============
  const evX = 36;
  for (const zWall of [LS_Z_S, LS_Z_N]) {
    const side = zWall > 0 ? -1 : 1;
    batch.box('ev', M.steelDark, evX, roofH / 2, zWall + side * 0.2, 3.4, roofH, 0.45, 0, 3);
    for (let f = 0; f < 5; f++) {
      const y = LY[f];
      const dg = new THREE.PlaneGeometry(2.0, 2.2);
      if (zWall > 0) dg.rotateY(Math.PI);
      dg.translate(evX, y + 1.1, zWall + side * 0.46);
      batch.add('evd', M.evDoor, dg, null, 0);
      const sg = new THREE.PlaneGeometry(0.42, 0.42);
      if (zWall > 0) sg.rotateY(Math.PI);
      sg.translate(evX, y + 2.5, zWall + side * 0.46);
      batch.add('evs', ctx.signMats.elev, sg, null, 0);
    }
    addCol(evX - 1.7, 0, Math.min(zWall, zWall + side * 0.5), evX + 1.7, roofH, Math.max(zWall, zWall + side * 0.5));
  }

  return { roofH, LY, bays, CORES };
}
