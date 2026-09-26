// ============================================================
// sim.mjs — ヘッドレス統合テスト
// canvas シム + three のジオメトリ構築 + 衝突/床のウォークシミュレーション
// ============================================================
import { register } from 'node:module';

// ---- canvas shim (2D context は no-op) ----
const ctxProxy = () => new Proxy({}, {
  get(t, k) {
    if (k === 'canvas') return {};
    if (['measureText'].includes(k)) return () => ({ width: 10 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') {
      return () => ({ addColorStop() {} });
    }
    return typeof k === 'string' ? () => {} : undefined;
  },
  set() { return true; },
});

globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') {
      return { width: 300, height: 150, getContext: () => ctxProxy(), style: {} };
    }
    return { style: {}, appendChild() {}, addEventListener() {}, set innerHTML(v) {}, classList: { add() {}, remove() {}, toggle() {} } };
  },
  addEventListener() {},
  exitPointerLock() {},
  getElementById: () => null,
};
globalThis.window = { addEventListener() {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800 };

register('./node-loader.mjs', import.meta.url);

// ---- モジュール読み込み ----
const THREE = await import('three');
const { CFG } = await import('../js/config.js');
const { Batch, ColliderWorld, FloorWorld, Instancer } = await import('../js/util.js');
const { initMaterials } = await import('../js/materials.js');
const { createSignMats } = await import('../js/signs.js');
const { buildSchool } = await import('../js/build-school.js');
const { buildInterior } = await import('../js/build-interior.js');
const { buildArena } = await import('../js/build-arena.js');
const { buildCampus } = await import('../js/build-campus.js');

const fakeRenderer = { capabilities: { getMaxAnisotropy: () => 8 } };
const cols = new ColliderWorld(12);
const floors = new FloorWorld(14);
const ctx = {
  M: initMaterials(fakeRenderer),
  batch: new Batch(),
  inst: new Instancer(),
  colliders: cols,
  floors,
  signMats: createSignMats(),
  rng: (() => { let s = 20210901; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(),
  addCol: (x0, y0, z0, x1, y1, z1) => cols.add(x0, y0, z0, x1, y1, z1),
  addFloor: (x0, x1, z0, z1, y) => floors.add(x0, x1, z0, z1, y),
};

console.log('建築開始…');
buildSchool(ctx);
buildInterior(ctx);
buildArena(ctx);
buildCampus(ctx);

// マージしてジオメトリを検査
const scene = new THREE.Group();
ctx.batch.build(scene);
ctx.inst.build(scene);

let totalVerts = 0, meshes = 0;
scene.traverse(o => {
  if (o.isMesh || o.isInstancedMesh) {
    meshes++;
    const g = o.geometry;
    const pos = g.getAttribute('position');
    if (!pos) throw new Error('position attribute なし: ' + o.type);
    for (let i = 0; i < pos.array.length; i++) {
      if (Number.isNaN(pos.array[i])) throw new Error('NaN in geometry: ' + o.type);
    }
    totalVerts += pos.count * (o.isInstancedMesh ? o.count : 1);
  }
});
console.log(`メッシュ: ${meshes} / 頂点(インスタンス込み): ${(totalVerts / 1000 | 0)}k / コリダ: ${cols.boxes.length} / 床面: ${floors.planes.length}`);

// ============ ウォークシミュレーション ============
const EYE = 1.58, R = 0.32, STEP = 0.36, HEIGHT = 1.75;
const pos = new THREE.Vector3(110, 0, 13);
pos.y = floors.heightAt(pos.x, pos.z, 1e9) + EYE;
const boxes = [];

function collide(px, pz, footY) {
  cols.query(px - R, pz - R, px + R, pz + R, boxes);
  for (const b of boxes) {
    if (b.y1 <= footY + STEP + 0.001 || b.y0 >= footY + HEIGHT) continue;
    if (px + R > b.x0 && px - R < b.x1 && pz + R > b.z0 && pz - R < b.z1) return true;
  }
  return false;
}

function moveTo(tx, tz, maxSteps = 4000) {
  const startX = pos.x, startZ = pos.z;
  const dist = Math.hypot(tx - pos.x, tz - pos.z);
  if (dist < 0.05) return true;
  const dirX = (tx - pos.x) / dist, dirZ = (tz - pos.z) / dist;
  const stepLen = 0.12;
  let moved = 0;
  for (let i = 0; i < maxSteps; i++) {
    let nx = pos.x + dirX * stepLen;
    let nz = pos.z + dirZ * stepLen;
    const feet = pos.y - EYE;
    if (!collide(nx, nz, feet)) {
      pos.x = nx; pos.z = nz;
    } else {
      // ステップアップ
      const g1 = floors.heightAt(nx, pos.z, feet + STEP);
      if (g1 > -Infinity && g1 <= feet + STEP && !collide(nx, pos.z, g1)) {
        pos.x = nx; pos.y = g1 + EYE;
      } else {
        const g2 = floors.heightAt(pos.x, nz, feet + STEP);
        if (g2 > -Infinity && g2 <= feet + STEP && !collide(pos.x, nz, g2)) {
          pos.z = nz; pos.y = g2 + EYE;
        } else {
          // 壁: 少しずつ横へずる
          const side = ((i % 2) * 2 - 1);
          nx = pos.x + (-dirZ) * side * stepLen;
          nz = pos.z + (dirX) * side * stepLen;
          if (!collide(nx, nz, feet)) { pos.x = nx; pos.z = nz; }
        }
      }
    }
    // 重力/床スナップ
    const g = floors.heightAt(pos.x, pos.z, pos.y - EYE + STEP);
    const groundY = g === -Infinity ? -50 : g;
    if (pos.y - EYE > groundY + 0.01) {
      pos.y = Math.max(groundY, pos.y - EYE - 0.2) + EYE; // ゆっくり落下
    } else if (pos.y - EYE < groundY - 0.001) {
      pos.y = groundY + EYE;
    }
    moved = Math.hypot(pos.x - startX, pos.z - startZ);
    if (Math.hypot(tx - pos.x, tz - pos.z) < 0.55) return true;
  }
  console.log(`  ✗ 到達失敗: (${startX.toFixed(1)},${startZ.toFixed(1)}) → (${tx},${tz}) 現在 (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`);
  return false;
}

const walk = async (name, from, to) => {
  pos.set(from[0], 0, from[1]);
  pos.y = floors.heightAt(from[0], from[1], 1e9) + EYE;
  const ok = moveTo(to[0], to[1]);
  console.log(`${ok ? '✓' : '✗'} ${name}  (y=${pos.y.toFixed(2)})`);
  if (!ok) process.exitCode = 1;
  return ok;
};

await walk('正門 → 門前', [110, 13], [104, 0.5]);
await walk('門前 → 都市の門(LS東)', [104, 0.5], [97, 1]);
await walk('LS東 → LS西', [97, 1], [14, 1]);
await walk('LS 1F → 大ホール(通路)', [56, 1], [48, -1]);
await walk('大ホール通路 → 西側', [48, -1], [24, -8.5]);
await walk('LS → S棟東階段コア(1F)', [96, 4], [97.5, 21]);
// 1F階段を上って2Fへ（S棟東コア）
{
  pos.set(97.5, 0, 22.4);
  pos.y = floors.heightAt(97.5, 22.4, 20.0) + EYE;
  if (pos.y > 3) { pos.y = floors.heightAt(97.5, 22.4, 3) + EYE; }
  const startY = pos.y;
  moveTo(98.2, 13);   // 階段を南へ上る
  const climbed = pos.y > startY + 3.5;
  console.log(`${climbed ? '✓' : '✗'} 階段昇降 1F→2F (y=${pos.y.toFixed(2)})`);
  if (!climbed) process.exitCode = 1;
  const ok2 = moveTo(92, 1);
  console.log(`${ok2 ? '✓' : '✗'} 2F階段→ブリッジ方向`);
  if (!ok2) process.exitCode = 1;
}
// 屋上ルート（5F階段室→屋上）
{
  pos.set(97.6, 0, 8.4);
  pos.y = floors.heightAt(97.6, 8.4, 19.2) + EYE;   // 5F床
  const startY = pos.y;
  let okA = moveTo(97.6, 9.4);
  let okB = moveTo(97.6, 15.0);
  let okC = moveTo(97.6, 18);
  const onRoof = pos.y > 21.5;
  console.log(`${okA && okB && okC && onRoof ? '✓' : '✗'} 5F→屋上 (y=${pos.y.toFixed(2)}, startY=${startY.toFixed(2)}, A=${okA} B=${okB} C=${okC})`);
  if (!okA || !okB || !okC || !onRoof) process.exitCode = 1;
}
await walk('グラウンド移動', [20, 90], [95, 90]);
await walk('キャンパスロード → アリーナS入口', [-10, 41], [-16, -3]);
await walk('アリーナS入口 → コート際', [-16, -3], [-40, -10]);
await walk('門前 → プールサイド', [110, -10], [108, -60]);
await walk('プールへの経路', [108, -60], [30, -104]);
await walk('プール → テニスコート脇', [30, -104], [-50, -112]);

// テレポート地点の床チェック
const { TELEPORTS } = await import('../js/config.js');
let tpFail = 0;
for (const t of TELEPORTS) {
  if (!t.pos) continue;
  if (t.fly) continue;
  const feet = t.pos[1] - EYE;
  const g = floors.heightAt(t.pos[0], t.pos[2], feet + 0.6);
  if (g === -Infinity || Math.abs(g - feet) > 0.7) {
    console.log(`  ⚠ teleport「${t.name}」: 地面y=${g === -Infinity ? 'なし' : g.toFixed(2)} feet=${feet.toFixed(2)}`);
    tpFail++;
  }
}
if (tpFail === 0) console.log('✓ 全テレポート地点に床がある');

console.log(process.exitCode ? '\n=== FAIL ===' : '\n=== ALL PASS ===');
