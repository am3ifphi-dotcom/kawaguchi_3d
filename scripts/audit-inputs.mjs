// Phase 0: source-file sanity checks only. No unverified geometry is generated.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFileSync(join(root, name));
const json = JSON.parse(read('plateau_53395597.json'));
const master = JSON.parse(read('data/facility-master.json'));
const counts = { total: json.features.length, uniqueIds: new Set(json.features.map(f => f.id)).size,
  noDataHeights: 0, nonClosed: 0, zeroArea: 0, selfIntersecting: 0, invalidRingUnion: 0, near300Vertex: 0 };
function intersects(a, b, c, d) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const u = cross(a, b, c), v = cross(a, b, d), w = cross(c, d, a), x = cross(c, d, b);
  return u * v < -1e-12 && w * x < -1e-12;
}
function isSelfIntersecting(ring) {
  const pts = ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring;
  for (let i = 0; i < pts.length; i++) for (let j = i + 2; j < pts.length; j++) {
    if (i === 0 && j === pts.length - 1) continue;
    if (intersects(pts[i], pts[(i + 1) % pts.length], pts[j], pts[(j + 1) % pts.length])) return true;
  }
  return false;
}
const extent = { east: [Infinity, -Infinity], north: [Infinity, -Infinity] };
for (const f of json.features) {
  if (f.kind !== 'bldg' || !Array.isArray(f.ring)) throw Error(`unexpected feature ${f.id}`);
  if (!Number.isFinite(f.h) || f.h <= 0) counts.noDataHeights++;
  const nonClosed = JSON.stringify(f.ring[0]) !== JSON.stringify(f.ring.at(-1));
  if (nonClosed) counts.nonClosed++;
  let twiceArea = 0;
  for (let i = 0; i < f.ring.length; i++) {
    const [x, y] = f.ring[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw Error(`invalid XY ${f.id}`);
    extent.east[0] = Math.min(extent.east[0], x); extent.east[1] = Math.max(extent.east[1], x);
    extent.north[0] = Math.min(extent.north[0], y); extent.north[1] = Math.max(extent.north[1], y);
    const [nx, ny] = f.ring[(i + 1) % f.ring.length];
    twiceArea += x * ny - nx * y;
  }
  const zeroArea = Math.abs(twiceArea) < 0.02;
  if (zeroArea) counts.zeroArea++;
  const crossed = !zeroArea && isSelfIntersecting(f.ring);
  if (crossed) counts.selfIntersecting++;
  if (nonClosed || zeroArea || crossed) counts.invalidRingUnion++;
  if (f.ring.some(([x, y]) => Math.hypot(x, y) <= 300)) counts.near300Vertex++;
}
if (json.count !== counts.total || counts.total !== counts.uniqueIds) throw Error('feature count/IDs mismatch');
if (master.coordinateSystem.origin.lat !== json.origin.lat || master.coordinateSystem.origin.lon !== json.origin.lon)
  throw Error('master / JSON origin mismatch');
function tileBounds(name) {
  const m = /^z(\d+)_(\d+)_(\d+)\.png$/.exec(name);
  if (!m) throw Error(`bad tile filename ${name}`);
  const [, zs, xs, ys] = m; const z = +zs, x = +xs, y = +ys;
  const lat = row => Math.atan(Math.sinh(Math.PI * (1 - 2 * row / 2 ** z))) * 180 / Math.PI;
  const lon = col => col / 2 ** z * 360 - 180;
  const b = read(name);
  // The supplied .png files are actually JFIF JPEG; detect bytes, not extensions.
  const format = b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG' ? 'PNG'
    : b[0] === 0xff && b[1] === 0xd8 ? 'JPEG' : 'unknown';
  if (format === 'unknown') throw Error(`unknown raster format: ${name}`);
  if (format === 'PNG' && (b.readUInt32BE(16) !== 256 || b.readUInt32BE(20) !== 256))
    throw Error(`not a 256px tile: ${name}`);
  return { name, encodedFormat: format, north: lat(y), south: lat(y + 1), west: lon(x), east: lon(x + 1) };
}
const tiles = ['z18_232811_103095.png', 'z18_232812_103095.png'].map(tileBounds);
const originInTiles = tiles.some(t => json.origin.lat <= t.north && json.origin.lat >= t.south &&
  json.origin.lon >= t.west && json.origin.lon <= t.east);
console.log(JSON.stringify({ origin: json.origin, counts, extent, tiles, originInTiles,
  masterElements: master.elements.length, unresolvedConflicts: master.conflicts.length }, null, 2));
