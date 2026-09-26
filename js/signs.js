// ============================================================
// signs.js — 看板・標識テクスチャ（canvas描画）
// ============================================================
import * as THREE from 'three';
import { canvasTexture, textTexture } from './util.js';

// 学校名プレート（鋳物風ブロンズ）
function namePlateTex() {
  return canvasTexture(1024, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#8a6a35');
    g.addColorStop(0.5, '#a8823f');
    g.addColorStop(1, '#6e5426');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 128);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 74px "Hiragino Mincho ProN", "Yu Mincho", serif';
    ctx.fillStyle = '#f4e6c2';
    ctx.fillText('川 口 市 立 高 等 学 校', 512, 54);
    ctx.font = '600 26px Georgia, serif';
    ctx.fillStyle = 'rgba(244,230,194,0.85)';
    ctx.fillText('KAWAGUCHI CITY HIGH SCHOOL', 512, 104);
  });
}

// 部屋表示札（青系）
function roomSignTex() {
  return canvasTexture(256, 64, (ctx) => {
    ctx.fillStyle = '#275d92';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, 0, 256, 30);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 30px "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('教 室', 128, 34);
  });
}

// 階層吊り看板
function floorSignTex(building, floor) {
  const accent = ['#7c9eb8', '#c98d5a', '#7fae7c', '#b07ea6', '#8f86c9'][floor - 1] || '#7c9eb8';
  return canvasTexture(512, 148, (ctx) => {
    ctx.fillStyle = '#f4f6f8';
    ctx.fillRect(0, 0, 512, 148);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 20, 148);
    ctx.fillRect(492, 0, 20, 148);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 64px "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.fillStyle = '#22303e';
    ctx.fillText(`${building}棟  ${floor}F`, 256, 56);
    ctx.font = '600 30px "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(floor === 1 ? '1F' : `${floor}F FLOOR`, 256, 116);
  });
}

// キャンパス内案内図
function campusMapTex() {
  return canvasTexture(512, 344, (ctx) => {
    ctx.fillStyle = '#eef2f5';
    ctx.fillRect(0, 0, 512, 344);
    ctx.fillStyle = '#275d92';
    ctx.fillRect(0, 0, 512, 54);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 30px "Hiragino Sans", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('校 内 案 内 図', 256, 28);
    // 簡易配置図
    const ox = 30, oy = 74, sx = 452 / 260, sy = 250 / 330;
    const rect = (x, z, w, d, c, label) => {
      ctx.fillStyle = c;
      ctx.fillRect(ox + x * sx, oy + z * sy, w * sx, d * sy);
      if (label) {
        ctx.fillStyle = '#fff';
        ctx.font = '700 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, ox + (x + w / 2) * sx, oy + (z + d / 2) * sy);
      }
    };
    rect(-126, -165, 256, 330, '#d7e3d0', '');
    rect(4, -22, 96, 46, '#7c9eb8', '校舎棟');
    rect(-98, -34, 80, 62, '#c98d5a', 'アリーナS');
    rect(-98, -108, 80, 58, '#c9a45a', 'アリーナN');
    rect(12, 52, 94, 56, '#7fae7c', 'グラウンド');
    rect(-12, -146, 64, 34, '#6fa3c9', 'プール');
    rect(-104, -156, 76, 40, '#b07e6a', 'テニス');
    ctx.fillStyle = '#5a6b7a';
    ctx.font = '500 12px sans-serif';
    ctx.fillText('★ 現在地：校舎棟東エントランス', 256, 330);
  });
}

// エレベーター表示
function elevTex() {
  return canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#1a1e24';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#ffd76a';
    ctx.font = '900 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▲', 32, 24);
    ctx.fillStyle = '#7d8794';
    ctx.fillText('▼', 32, 52);
  });
}

// 黑板（チョーク文字つき）
function chalkboardTex() {
  return canvasTexture(512, 160, (ctx) => {
    ctx.fillStyle = '#2e5d45';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    // 数式っぽい落書き
    ctx.font = '28px Georgia, serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('x² + y² = r²', 40, 44);
    ctx.fillText('本日の値: 25℃', 40, 88);
    ctx.fillText('HR: LHR集会 14:30〜', 40, 130);
    ctx.beginPath();
    ctx.moveTo(300, 40); ctx.lineTo(430, 40); ctx.lineTo(430, 70); ctx.lineTo(300, 70); ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(310, 120); ctx.quadraticCurveTo(370, 95, 420, 125);
    ctx.stroke();
  });
}

// 掲示板
function boardTex() {
  return canvasTexture(256, 192, (ctx) => {
    ctx.fillStyle = '#6b5138';
    ctx.fillRect(0, 0, 256, 192);
    const papers = ['#f2ead8', '#dce8f2', '#f2dcdc', '#e2f2dc', '#f2e8dc'];
    let s = 42;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = papers[i % papers.length];
      const x = 12 + (i % 3) * 82 + rnd() * 6, y = 12 + Math.floor(i / 3) * 60 + rnd() * 6;
      ctx.fillRect(x, y, 68, 50);
      ctx.fillStyle = 'rgba(60,60,60,0.6)';
      for (let l = 0; l < 4; l++) ctx.fillRect(x + 6, y + 10 + l * 9, 40 + rnd() * 16, 2);
    }
  });
}

// 時計（針の位置違い）
function clockTex(t) {
  return canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#f4f4f0';
    ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(32 + 16 * Math.sin(t * Math.PI / 6), 32 - 16 * Math.cos(t * Math.PI / 6)); ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(32 + 24 * Math.sin(t * Math.PI / 30), 32 - 24 * Math.cos(t * Math.PI / 30)); ctx.stroke();
  });
}

// 本棚（背表紙）
function bookshelfTex() {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#8a7458';
    ctx.fillRect(0, 0, 256, 256);
    let s = 99;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const cols = ['#a04848', '#4868a0', '#48a068', '#a08a48', '#7a48a0', '#c9c9c9', '#48a0a0'];
    for (let row = 0; row < 4; row++) {
      const y = row * 64;
      ctx.fillStyle = '#6e5a42';
      ctx.fillRect(0, y + 58, 256, 6);
      let x = 6;
      while (x < 244) {
        const w = 8 + rnd() * 14;
        ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
        ctx.fillRect(x, y + 8, w, 50);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x + 2, y + 12, 2, 40);
        x += w + 2 + rnd() * 4;
      }
    }
  });
}

// 自販機
function vendingTex(kind) {
  return canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = kind === 1 ? '#c0392b' : '#1565c0';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(10, 16, 78, 150);
    const cols = ['#e74c3c', '#f39c12', '#27ae60', '#8e44ad'];
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      ctx.fillStyle = cols[Math.floor(rnd() * 4)];
      ctx.fillRect(16 + c * 24, 24 + r * 34, 16, 26);
    }
    ctx.fillStyle = 'rgba(20,20,20,0.85)';
    ctx.fillRect(94, 16, 24, 150);
    ctx.fillStyle = '#fff';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('飲料', 40, 200);
  });
}

// 横断幕（アリーナ）
function bannerTex(text, bg, fg) {
  return canvasTexture(512, 96, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, 512, 14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 44px "Hiragino Sans", sans-serif';
    ctx.fillStyle = fg;
    ctx.fillText(text, 256, 52);
  });
}

// アリーナ看板
function arenaSignTex(text, sub) {
  return canvasTexture(512, 64, (ctx) => {
    ctx.fillStyle = '#1f3c5e';
    ctx.fillRect(0, 0, 512, 64);
    ctx.strokeStyle = '#cfd8e2';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 506, 58);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 34px "Hiragino Sans", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, 256, 26);
    ctx.font = '600 16px sans-serif';
    ctx.fillStyle = '#a8bcd0';
    ctx.fillText(sub, 256, 50);
  });
}

// プール看板
function poolSignTex() {
  return canvasTexture(256, 96, (ctx) => {
    ctx.fillStyle = '#f0f4f6';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(0, 0, 256, 30);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '900 20px sans-serif';
    ctx.fillText('25m プール', 128, 21);
    ctx.fillStyle = '#0d3b66';
    ctx.font = '900 30px sans-serif';
    ctx.fillText('最大深さ 1.35m', 128, 62);
    ctx.font = '500 14px sans-serif';
    ctx.fillText('監視員の指示に従ってください', 128, 84);
  });
}

// 信号機ライト
function trafficTex() {
  return canvasTexture(64, 192, (ctx) => {
    ctx.fillStyle = '#14181d';
    ctx.fillRect(0, 0, 64, 192);
    const cols = ['#d0342c', '#e8c832', '#2e9e4f'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = cols[i];
      ctx.globalAlpha = i === 2 ? 1 : 0.22;
      ctx.beginPath(); ctx.arc(32, 34 + i * 62, 20, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// 川口市の看板
function citySignTex() {
  return canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#0f4c81';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '900 44px "Hiragino Sans", sans-serif';
    ctx.fillText('川口市 KAWAGUCHI CITY', 256, 56);
    ctx.font = '600 24px sans-serif';
    ctx.fillText('鋳物のまち・植木のまち', 256, 100);
  });
}

// バス停サイン
function busStopTex() {
  return canvasTexture(160, 420, (ctx) => {
    ctx.fillStyle = '#f4c520';
    ctx.fillRect(0, 0, 160, 420);
    ctx.fillStyle = '#0f4c81';
    ctx.fillRect(0, 0, 160, 90);
    ctx.fillStyle = '#fff';
    ctx.font = '900 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('バス', 80, 40);
    ctx.font = '700 18px sans-serif';
    ctx.fillText('Kawaguchi City HS', 80, 72);
    ctx.fillStyle = '#111';
    ctx.font = '900 26px sans-serif';
    ctx.fillText('川口市立高校', 80, 140);
    ctx.font = '500 15px sans-serif';
    ctx.fillText('上青木循環 / SKIPシティ', 80, 180);
    ctx.fillText('川口駅東口 行き', 80, 210);
    ctx.fillStyle = '#333';
    ctx.font = '600 14px sans-serif';
    [' 6:42', ' 7:05', ' 7:28', ' 7:51', ' 8:15', ' 8:40'].forEach((t, i) => {
      ctx.fillText(t, 80, 250 + i * 24);
    });
  });
}

// ============================================================
export function createSignMats() {
  const mat = (tex, opts = {}) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, ...opts });
  return {
    namePlate: mat(namePlateTex(), { metalness: 0.6, roughness: 0.35 }),
    roomSign: mat(roomSignTex()),
    floorS: [null, 1, 2, 3, 4].map(f => f ? mat(floorSignTex('S', f)) : null),
    floorN: [null, 1, 2, 3, 4].map(f => f ? mat(floorSignTex('N', f)) : null),
    campusMap: mat(campusMapTex()),
    elev: mat(elevTex(), { emissive: 0x554400, emissiveIntensity: 0.4 }),
    chalkboard: mat(chalkboardTex(), { roughness: 0.85 }),
    board: mat(boardTex()),
    clock: [10, 11, 13, 15].map(t => mat(clockTex(t))),
    bookshelf: mat(bookshelfTex()),
    vendingA: mat(vendingTex(1)),
    vendingB: mat(vendingTex(2)),
    banners: [
      mat(bannerTex('春季大会 ベスト４！', '#1a5c9e', '#fff')),
      mat(bannerTex('インターハイ 出場決定', '#b03030', '#fff')),
      mat(bannerTex('合唱コンクール 金賞', '#2e7d52', '#fff')),
      mat(bannerTex('球技大会 開催', '#c98d1a', '#fff')),
    ],
    busStop: mat(busStopTex()),
    arenaName: mat(arenaSignTex('大アリーナ', 'ARENA S — KAWAGUCHI CITY HS')),
    arenaNName: mat(arenaSignTex('中小アリーナ・武道場', 'ARENA N / MARTIAL ARTS')),
    poolSign: mat(poolSignTex()),
    traffic: mat(trafficTex(), { emissive: 0x224422, emissiveIntensity: 0.3 }),
    citySign: mat(citySignTex()),
  };
}
