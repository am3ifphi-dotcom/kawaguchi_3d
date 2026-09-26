// ============================================================
// hud.js — ミニマップ・ゾーン表示・情報カード・テレポートメニュー
// ============================================================
import { ZONES, TELEPORTS, HOTSPOTS, TIMES } from './config.js';

// ミニマップの範囲
const MAP = { x0: -150, x1: 180, z0: -180, z1: 160 };

let els = {};
let mapBase = null;   // 静的レイヤーのcanvas
let bannerTimer = null;
let curZone = '';
let visible = true;

export function initHud(player, onTeleport) {
  els = {
    hud: document.getElementById('hud'),
    crosshair: document.getElementById('crosshair'),
    banner: document.getElementById('zone-banner'),
    info: document.getElementById('info-card'),
    place: document.getElementById('place'),
    floor: document.getElementById('floor-label'),
    clock: document.getElementById('clock'),
    fps: document.getElementById('fps'),
    minimap: document.getElementById('minimap'),
    menu: document.getElementById('menu'),
    tpGrid: document.getElementById('tp-grid'),
  };
  els.mmCtx = els.minimap.getContext('2d');
  buildMapBase();
  buildTeleportMenu(onTeleport);

  // クリックでテレポート
  els.tpGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.tp-btn');
    if (!btn) return;
    const t = TELEPORTS[+btn.dataset.idx];
    onTeleport(t);
    closeMenu();
  });
}

export function showHud(v) {
  visible = v;
  els.hud.classList.toggle('on', v);
}

export function photoMode() {
  const off = els.hud.style.display === 'none';
  els.hud.style.display = off ? '' : 'none';
  return !off;
}

export function openMenu() {
  els.menu.classList.add('open');
}
export function closeMenu() {
  els.menu.classList.remove('open');
}
export function menuIsOpen() {
  return els.menu.classList.contains('open');
}

function buildTeleportMenu(onTeleport) {
  els.tpGrid.innerHTML = '';
  for (let i = 0; i < TELEPORTS.length; i++) {
    const t = TELEPORTS[i];
    if (t.cat) {
      const h = document.createElement('div');
      h.className = 'menu-cat';
      h.style.gridColumn = '1 / -1';
      h.textContent = '── ' + t.cat;
      els.tpGrid.appendChild(h);
      continue;
    }
    const b = document.createElement('button');
    b.className = 'tp-btn';
    b.dataset.idx = i;
    b.innerHTML = `<span class="ic">${t.icon || '📍'}</span><span class="nm">${t.name}</span><div class="ds">${t.desc || ''}</div>`;
    els.tpGrid.appendChild(b);
  }
}

// ---------- ミニマップ静的レイヤー ----------
function buildMapBase() {
  const cv = document.createElement('canvas');
  cv.width = els.minimap.width;
  cv.height = els.minimap.height;
  const c = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  const sx = w / (MAP.x1 - MAP.x0), sy = h / (MAP.z1 - MAP.z0);
  const px = (x) => (x - MAP.x0) * sx;
  const pz = (z) => (z - MAP.z0) * sy;

  c.fillStyle = '#22301f';
  c.fillRect(0, 0, w, h);
  // 道路
  c.fillStyle = '#4a4f56';
  c.fillRect(px(118), pz(-260), (134 - 118) * sx, 460 * sy);
  c.fillRect(px(-340), pz(150), 560 * sx, 16 * sy);
  c.fillStyle = '#5a5f66';
  c.fillRect(px(-128), pz(36), 236 * sx, 10 * sy);
  // 水系・グランド
  c.fillStyle = '#3e7d36';
  c.fillRect(px(12), pz(52), 94 * sx, 56 * sy);
  c.fillStyle = '#2e6ea8';
  c.fillRect(px(-12), pz(-146), 64 * sx, 34 * sy);
  c.fillStyle = '#4a7a58';
  c.fillRect(px(-104), pz(-156), 76 * sx, 40 * sy);
  // 建物
  c.fillStyle = '#c8c2b2';
  c.fillRect(px(4), pz(-22), 96 * sx, 46 * sy);
  c.fillStyle = '#b8967a';
  c.fillRect(px(-98), pz(-34), 80 * sx, 62 * sy);
  c.fillStyle = '#a88a6a';
  c.fillRect(px(-98), pz(-108), 80 * sx, 58 * sy);
  c.fillStyle = '#9a948a';
  c.fillRect(px(18), pz(-142), 28 * sx, 20 * sy);
  // ラベル
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.font = '700 8px sans-serif';
  c.textAlign = 'center';
  c.fillText('校舎棟', px(52), pz(2));
  c.fillText('大アリーナ', px(-58), pz(-2));
  c.fillText('グラウンド', px(59), pz(80));
  // 枠
  c.strokeStyle = 'rgba(140,180,220,0.35)';
  c.strokeRect(0.5, 0.5, w - 1, h - 1);
  mapBase = cv;
}

export function drawMinimap(player) {
  if (!mapBase) return;
  const c = els.mmCtx;
  const w = els.minimap.width, h = els.minimap.height;
  c.clearRect(0, 0, w, h);
  c.drawImage(mapBase, 0, 0);
  const sx = w / (MAP.x1 - MAP.x0), sy = h / (MAP.z1 - MAP.z0);
  const mx = (player.pos.x - MAP.x0) * sx;
  const mz = (player.pos.z - MAP.z0) * sy;
  // 視線
  const e = player.camera.rotation;
  const fx = -Math.sin(e.y), fz = -Math.cos(e.y);
  c.strokeStyle = 'rgba(255,220,120,0.8)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(mx, mz);
  c.lineTo(mx + fx * 12, mz + fz * 12);
  c.stroke();
  // プレイヤー
  c.fillStyle = '#ffd76a';
  c.beginPath();
  c.arc(mx, mz, 4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.6)';
  c.lineWidth = 1.5;
  c.stroke();
}

// ---------- ゾーン検出 ----------
export function updateZone(player) {
  const x = player.pos.x, y = player.pos.y, z = player.pos.z;
  let found = null;
  for (const zn of ZONES) {
    if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1 && y >= zn.y0 && y <= zn.y1) {
      found = zn;
      break;
    }
  }
  if (found && found.name !== curZone) {
    curZone = found.name;
    els.place.textContent = found.name;
    els.banner.innerHTML = `${found.name}<small>${found.sub}</small>`;
    els.banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => els.banner.classList.remove('show'), 2600);
  } else if (!found && curZone !== '') {
    curZone = '';
  }

  // 階表示
  let fl = '地上';
  const S = { levelY: [0, 5.35, 9.7, 14.05, 18.4], roofH: 22.4, x0: 4, x1: 100, nZ0: -22, sZ1: 24 };
  if (x >= S.x0 && x <= S.x1 && z >= S.nZ0 && z <= S.sZ1) {
    if (y >= S.roofH - 0.3) fl = '屋上';
    else {
      let f = 1;
      for (let i = 0; i < S.levelY.length; i++) if (y >= S.levelY[i] - 0.3) f = i + 1;
      fl = `${f}F`;
    }
  } else if (x >= -98 && x <= -18 && z >= -34 && z <= 28) {
    fl = y >= 5 ? '2F 観客席' : '1F アリーナ';
  } else if (x >= -98 && x <= -18 && z >= -108 && z <= -50) {
    fl = y >= 5 ? '2F 小アリーナ' : '1F 武道場';
  }
  els.floor.textContent = fl;
}

// ---------- 情報カード ----------
let curHot = -1;
export function updateHotspots(player) {
  let best = -1, bestD = 1e9;
  for (let i = 0; i < HOTSPOTS.length; i++) {
    const hsp = HOTSPOTS[i];
    const d = Math.hypot(player.pos.x - hsp.pos[0], player.pos.y - hsp.pos[1], player.pos.z - hsp.pos[2]);
    if (d < hsp.r && d < bestD) { best = i; bestD = d; }
  }
  if (best !== curHot) {
    curHot = best;
    if (best >= 0) {
      const hsp = HOTSPOTS[best];
      els.info.innerHTML = `<h3>📍 ${hsp.name}</h3><p>${hsp.text}</p>`;
      els.info.classList.add('show');
      els.crosshair.classList.add('hot');
    } else {
      els.info.classList.remove('show');
      els.crosshair.classList.remove('hot');
    }
  }
}

export function setClock(t) {
  els.clock.textContent = TIMES[t].clock;
}

export function setFps(v) {
  els.fps.textContent = `${v} FPS`;
}
