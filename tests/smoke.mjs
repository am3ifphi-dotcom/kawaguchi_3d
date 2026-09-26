// スモークテスト: ヘッドレスChromeでWebGL描画を確認しスクリーンショットを保存
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8123;

// 静的サーバー起動
const server = spawn('node', ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT } });
await new Promise(r => setTimeout(r, 1200));

const errors = [];
let browser;
try {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--window-size=1280,800',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text());
  });
  page.on('pageerror', (err) => errors.push('[pageerror] ' + err.message));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });

  // 準備完了を待つ
  await page.waitForFunction('window.__READY === true', { timeout: 90000 });
  console.log('READY: 3D scene built');

  // スプラッシュのスクショ
  await page.screenshot({ path: join(ROOT, 'tests', 'shot-splash.png') });

  // 探索開始（スタートボタンを押す → ポインタロックはヘッドレスで失敗してもスキップ）
  await page.click('#start-btn');
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: join(ROOT, 'tests', 'shot-gate.png') });

  // テレポート: ラーニングストリート
  await page.evaluate(() => {
    window.__APP.player.enabled = true;
    window.__APP.player.pos.set(95, 1.7, 1);
    window.__APP.camera.rotation.set(0, -Math.PI / 2, 0);
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: join(ROOT, 'tests', 'shot-ls.png') });

  // グラウンドから校舎
  await page.evaluate(() => {
    window.__APP.player.pos.set(70, 1.7, 90);
    window.__APP.camera.rotation.set(0.05, -Math.PI / 2, 0);
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: join(ROOT, 'tests', 'shot-field.png') });

  // 空から
  await page.evaluate(() => {
    window.__APP.player.fly = true;
    window.__APP.player.pos.set(30, 110, 170);
    window.__APP.camera.rotation.set(-0.55, Math.PI - 0.5, 0);
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: join(ROOT, 'tests', 'shot-aerial.png') });

  const ready = await page.evaluate('window.__READY');
  console.log('window.__READY =', ready);
  console.log('Screenshots saved to tests/');
} catch (e) {
  errors.push('[test] ' + e.message);
} finally {
  if (browser) await browser.close();
  server.kill();
}

if (errors.length) {
  console.log('\n=== ERRORS ===');
  for (const e of errors) console.log(e);
  process.exit(1);
} else {
  console.log('\nAll smoke checks passed.');
}
