// ============================================================
// config.js — 全体寸法・座標定数（単位: メートル）
// 座標系: +X = 東, +Z = 南, +Y = 上（1unit = 1m）
// ============================================================

export const CFG = {
  // ---------- 敷地 ----------
  site: { x0: -130, x1: 118, z0: -165, z1: 150 },        // 第1校地の範囲(概ね)

  // ---------- 校舎棟 (S棟 + ラーニングストリート + N棟) ----------
  school: {
    x0: 4, x1: 100,          // 東西 96m
    sZ0: 8,  sZ1: 24,        // S棟(HR教室) 南側, 深さ16m
    lsZ0: -6, lsZ1: 8,       // ラーニングストリート 幅14m
    nZ0: -22, nZ1: -6,       // N棟(特別教室) 北側, 深さ16m
    floorH: [5.0, 4.0, 4.0, 4.0, 4.0],  // 各階の高さ
    slab: 0.35,              // 床スラブ厚
    bay: 8.0,                // 柱モジュール
    roofH: 0,                // 計算で設定
    levelY: [],              // 各階の床面Y (計算で設定)
  },

  // ---------- アリーナ棟 ----------
  arenaS: { x0: -98, x1: -18, z0: -34, z1: 28, h: 15.5 },   // 大アリーナ
  arenaN: { x0: -98, x1: -18, z0: -108, z1: -50, h: 11.0 }, // 中小アリーナ(1F武道場/2F小アリーナ)

  // ---------- 屋外 ----------
  field:   { x0: 12, x1: 106, z0: 52, z1: 108 },   // 人工芝グラウンド(サッカー)
  campusRoad: { z0: 36, z1: 46 },                  // キャンパスロード(東西)
  pool:    { x0: -12, x1: 52, z0: -146, z1: -112 },// プール
  tennis:  { x0: -104, x1: -28, z0: -156, z1: -116 }, // テニスコート2面
  kyudo:   { x0: 18, x1: 46, z0: -142, z1: -122 }, // 弓道場
  bikeParking: { x0: 102, x1: 116, z0: 24, z1: 66 }, // 駐輪場(東門そば)

  // ---------- 外部道路 ----------
  eastRoad: { x0: 118, x1: 134 },   // 東側の市道(南北)
  southRoad: { z0: 150, z1: 166 },  // 南側の市道(東西)

  // ---------- プレイヤー ----------
  player: {
    eye: 1.58, radius: 0.32, height: 1.75,
    walk: 3.6, run: 7.2, fly: 14,
    gravity: -16, jump: 4.6, stepUp: 0.36,
  },
};

// 階高を計算
(() => {
  const s = CFG.school;
  let y = 0;
  s.levelY = [0];
  for (let i = 0; i < s.floorH.length - 1; i++) {
    y += s.floorH[i] + s.slab;
    s.levelY.push(y);
  }
  s.roofH = y + s.floorH[4];
})();

// ---------- ゾーン判定 (場所名表示用) ----------
export const ZONES = [
  { name: 'ラーニングストリート', sub: 'LEARNING STREET', x0: CFG.school.x0, x1: CFG.school.x1, z0: CFG.school.lsZ0, z1: CFG.school.lsZ1, y0: 0, y1: 40 },
  { name: 'S棟（HR教室）', sub: 'S BUILDING', x0: CFG.school.x0, x1: CFG.school.x1, z0: CFG.school.sZ0, z1: CFG.school.sZ1, y0: 0, y1: 40 },
  { name: 'N棟（特別教室）', sub: 'N BUILDING', x0: CFG.school.x0, x1: CFG.school.x1, z0: CFG.school.nZ0, z1: CFG.school.nZ1, y0: 0, y1: 40 },
  { name: '校舎屋上', sub: 'ROOFTOP', x0: CFG.school.x0 - 2, x1: CFG.school.x1 + 2, z0: CFG.school.nZ0 - 2, z1: CFG.school.sZ1 + 2, y0: CFG.school.roofH - 0.5, y1: 40 },
  { name: '大アリーナ', sub: 'ARENA S', x0: CFG.arenaS.x0, x1: CFG.arenaS.x1, z0: CFG.arenaS.z0, z1: CFG.arenaS.z1, y0: 0, y1: 20 },
  { name: '中小アリーナ・武道場', sub: 'ARENA N', x0: CFG.arenaN.x0, x1: CFG.arenaN.x1, z0: CFG.arenaN.z0, z1: CFG.arenaN.z1, y0: 0, y1: 20 },
  { name: '第1グラウンド（人工芝）', sub: 'GROUND', x0: CFG.field.x0 - 4, x1: CFG.field.x1 + 4, z0: CFG.field.z0 - 4, z1: CFG.field.z1 + 4, y0: -1, y1: 8 },
  { name: 'プール', sub: 'POOL', x0: CFG.pool.x0 - 3, x1: CFG.pool.x1 + 3, z0: CFG.pool.z0 - 3, z1: CFG.pool.z1 + 3, y0: -1, y1: 8 },
  { name: 'テニスコート', sub: 'TENNIS COURTS', x0: CFG.tennis.x0 - 3, x1: CFG.tennis.x1 + 3, z0: CFG.tennis.z0 - 3, z1: CFG.tennis.z1 + 3, y0: -1, y1: 8 },
  { name: '弓道場', sub: 'ARCHERY RANGE', x0: CFG.kyudo.x0 - 3, x1: CFG.kyudo.x1 + 3, z0: CFG.kyudo.z0 - 3, z1: CFG.kyudo.z1 + 3, y0: -1, y1: 8 },
  { name: 'キャンパスロード', sub: 'CAMPUS ROAD', x0: -120, x1: 118, z0: CFG.campusRoad.z0 - 2, z1: CFG.campusRoad.z1 + 2, y0: -1, y1: 6 },
  { name: '正門・玄関アプローチ', sub: 'MAIN GATE', x0: 96, x1: 130, z0: -30, z1: 30, y0: -1, y1: 8 },
  { name: '駐輪場', sub: 'BIKE PARKING', x0: CFG.bikeParking.x0 - 3, x1: CFG.bikeParking.x1 + 3, z0: CFG.bikeParking.z0 - 3, z1: CFG.bikeParking.z1 + 3, y0: -1, y1: 8 },
  { name: '川口市上青木三丁目', sub: 'KAMI-AOKI 3-CHOME, KAWAGUCHI', x0: -400, x1: 400, z0: -400, z1: 400, y0: -1, y1: 200 },
];

// ---------- テレポート地点 ----------
export const TELEPORTS = [
  { cat: '校舎棟' },
  { id: 'gate',  icon: '🚪', name: '正門前', desc: '東側市道から校門を望む', pos: [126, 1.6, 12], yaw: Math.PI, pitch: 0 },
  { id: 'ls1e',  icon: '🌅', name: 'ラーニングストリート 東（都市の門）', desc: 'ガラスのカーテンウォールと鋳物の校章', pos: [95, 1.6, 1], yaw: -Math.PI / 2, pitch: 0 },
  { id: 'ls1w',  icon: '-west', name: 'ラーニングストリート 西', desc: '1F大ホール前の吹き抜け下', pos: [12, 1.6, 1], yaw: Math.PI / 2, pitch: 0 },
  { id: 'ls3',   icon: '🏛️', name: 'ラーニングストリート 3F', desc: '膜屋根とブリッジを見上げる', pos: [68, 0.45 + CFG.school.levelY[2] + 1.4, 1], yaw: -Math.PI / 2, pitch: 0.15 },
  { id: 'hall',  icon: '🎬', name: '大ホール（500席）', desc: '1F 固定席のホール', pos: [44, 1.7, -8], yaw: -Math.PI / 2, pitch: 0 },
  { id: 'cafeteria', icon: '🍽️', name: '食堂（2F）', desc: 'S棟2F の生徒ホール', pos: [24, 1.6 + CFG.school.levelY[1], 16], yaw: -Math.PI / 2, pitch: 0 },
  { id: 'library', icon: '📚', name: 'ラーニングコモンズ（2F）', desc: '図書館・自習空間', pos: [60, 1.6 + CFG.school.levelY[1], -14], yaw: -Math.PI / 2, pitch: 0 },
  { id: 'class3', icon: '🧑‍🏫', name: '普通教室（3F）', desc: 'S棟3F のHR教室', pos: [28, 1.6 + CFG.school.levelY[2], 16], yaw: -Math.PI / 2, pitch: 0 },
  { id: 'presen', icon: '📽️', name: 'プレゼンテーションルーム（4F）', desc: 'N棟4F 発表室', pos: [56, 1.6 + CFG.school.levelY[3], -14], yaw: -Math.PI / 2, pitch: 0 },
  { id: 'roof',  icon: '🌤️', name: '校舎屋上', desc: '設備機器と遠望', pos: [60, 1.8 + CFG.school.roofH, 16], yaw: -Math.PI / 2, pitch: 0 },
  { cat: 'アリーナ棟・運動施設' },
  { id: 'arenaS', icon: '🏀', name: '大アリーナ', desc: 'バスケット3面・観客席480', pos: [-60, 1.6, -3], yaw: Math.PI / 2, pitch: 0 },
  { id: 'arenaN2', icon: '🏐', name: '小アリーナ（2F）', desc: '中小アリーナ棟の2F', pos: [-58, 1.6 + 5.2, -79], yaw: Math.PI / 2, pitch: 0 },
  { id: 'judo', icon: '🥋', name: '柔道場（1F）', desc: 'アリーナN棟', pos: [-78, 1.6, -70], yaw: Math.PI / 2, pitch: 0 },
  { id: 'field', icon: '⚽', name: '第1グラウンド', desc: '人工芝サッカーグラウンド', pos: [60, 1.6, 95], yaw: -Math.PI / 2, pitch: 0 },
  { id: 'pool', icon: '🏊', name: 'プールサイド', desc: '25mプール', pos: [30, 1.6, -108], yaw: Math.PI, pitch: 0 },
  { id: 'tennis', icon: '🎾', name: 'テニスコート', desc: '2面', pos: [-66, 1.6, -122], yaw: Math.PI / 2, pitch: 0 },
  { cat: '周辺' },
  { id: 'road', icon: '🚌', name: '市道・バス停「川口市立高校」', desc: '通学路の交差点', pos: [126, 1.6, -40], yaw: Math.PI, pitch: 0 },
  { id: 'sky', icon: '🚁', name: '空から全景（飛行モード）', desc: 'キャンパス全体を俯瞰', pos: [40, 90, 160], yaw: Math.PI - 0.5, pitch: -0.62, fly: true },
];

// ---------- 視点情報ホットスポット ----------
export const HOTSPOTS = [
  { name: '膜屋根', text: 'ラーニングストリート上部の膜屋根。柔らかな自然光を採り入れ、風が抜ける全天候型の居空間。2〜5Fまでの吹き抜けとあわせて、校舎のシンボルとなっている。', pos: [52, 26, 1], r: 14 },
  { name: '都市の門', text: '校舎東端のガラスカーテンウォール。キャンパスと街を地続きにつなぐ「門」として設計された。', pos: [98, 4, 1], r: 7 },
  { name: '鋳物の校章', text: '川口の地場産業「鋳物」による校章・サイン。市産品(鋳物・植木)や県産ヒノキが随所に使われている。', pos: [97, 3.4, 1], r: 8 },
  { name: '大ホール', text: '1F にある固定椅子500席のホール。式典や講演、音楽部の練習にも使われる。', pos: [32, 2, -14], r: 9 },
  { name: '地中熱・井戸水利用', text: '校舎は地中熱空調や井戸水を利用した放射冷暖房を備え、環境教材としての側面も持つ。', pos: [70, 2, -14], r: 9 },
  { name: '大アリーナ', text: 'バスケットコート3面分の大空間。2Fに観客席480席。合宿所・部室を併設する。', pos: [-58, 3, -3], r: 12 },
  { name: '人工芝グラウンド', text: '2021年8月完成の第1グラウンド。校舎南側に広がるサッカー・陸上等の戦場。', pos: [60, 1, 80], r: 18 },
];

// キー: タイムオブデイ設定
export const TIMES = [
  { id: 'noon',  label: '昼 12:00', clock: '12:00', sun: [0.35, 0.85, 0.4],  sunColor: 0xfff4e0, sunI: 2.6, hemiSky: 0xbdd9f2, hemiGnd: 0x8f9a8a, hemiI: 0.75, fog: 0xcfe2f0, fogDensity: 0.0011, exposure: 1.05, skyTop: 0x3f7fd2, skyBot: 0xdaecf8, windowLit: 0 },
  { id: 'morning', label: '朝 8:00', clock: '8:00',  sun: [0.85, 0.42, 0.28], sunColor: 0xffe0b8, sunI: 2.3, hemiSky: 0xc4d9ec, hemiGnd: 0x8f9a8a, hemiI: 0.7, fog: 0xd8e4ee, fogDensity: 0.0016, exposure: 1.0, skyTop: 0x4a86d4, skyBot: 0xf2e3cf, windowLit: 0.25 },
  { id: 'evening', label: '夕 17:00', clock: '17:00', sun: [0.9, 0.16, 0.42], sunColor: 0xff9c54, sunI: 1.9, hemiSky: 0x9aa8c8, hemiGnd: 0x77705f, hemiI: 0.5, fog: 0xe4b48c, fogDensity: 0.0022, exposure: 1.0, skyTop: 0x36589e, skyBot: 0xf0b27a, windowLit: 0.6 },
  { id: 'night', label: '夜 21:00', clock: '21:00', sun: [-0.4, 0.5, -0.6], sunColor: 0x93aede, sunI: 0.35, hemiSky: 0x1d2c48, hemiGnd: 0x11151c, hemiI: 0.32, fog: 0x0c1322, fogDensity: 0.003, exposure: 1.15, skyTop: 0x050a18, skyBot: 0x101d33, windowLit: 1 },
];
