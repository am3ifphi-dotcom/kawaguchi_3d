import * as THREE from 'three';
import raw from '../../plateau_53395597.json';

export type Feature = { kind: string; id: string; h: number; ring: number[][] };
// Matches to 2015 drawing's west arena/east classroom composition and approximate areas.
// NOT yet a verified building-to-ID mapping; render in amber only as a research overlay.
export const candidates = new Set([
  'bldg_201a8894-473d-4e6a-9182-de27ee40ccf3', // likely arena S
  'bldg_b01d7688-a716-41e7-9147-91bbf9c042c7', // likely arena N
  'bldg_0c732e20-c8b1-494c-b725-ad31674dfc8a', // likely arena N
  'bldg_677aa8fc-8951-4a20-a5a1-cc72ffa13409', // candidate connector
  'bldg_4cf7907f-f7c3-4341-9b50-2d6a013032ba', // likely school southern wing
  'bldg_44f5071e-59b1-41af-840e-03d9cd2bb6a9', // likely school middle
  'bldg_2d60618f-f5c7-4f74-958b-e4b49cd172e3', // likely school northern wing
]);
const features = raw.features as Feature[];
const radius = 300;
function distanceSegment([ax, ay]: number[], [bx, by]: number[]): number {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + t * dx, ay + t * dy);
}
function nearOrigin(ring: number[][]): boolean {
  for (let i = 0; i < ring.length - 1; i++) if (distanceSegment(ring[i], ring[i + 1]) <= radius) return true;
  return false;
}
function signedArea(points: THREE.Vector2[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]; sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}
function crosses(a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2, d: THREE.Vector2): boolean {
  const cross = (p: THREE.Vector2, q: THREE.Vector2, r: THREE.Vector2) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const u = cross(a, b, c), v = cross(a, b, d), w = cross(c, d, a), x = cross(c, d, b);
  return u * v < -1e-12 && w * x < -1e-12;
}
function selfIntersecting(pts: THREE.Vector2[]): boolean {
  for (let i = 0; i < pts.length; i++) for (let j = i + 2; j < pts.length; j++) {
    if (i === 0 && j === pts.length - 1) continue;
    if (crosses(pts[i], pts[(i + 1) % pts.length], pts[j], pts[(j + 1) % pts.length])) return true;
  }
  return false;
}
export type Accepted = { feature: Feature; points: THREE.Vector2[]; candidate: boolean };
export function inspect(): { accepted: Accepted[]; rejected: Record<string, number> } {
  const rejected = { noHeight: 0, invalidRing: 0, outside: 0 };
  const accepted: Accepted[] = [];
  for (const feature of features) {
    const ring = feature.ring;
    const noHeight = !Number.isFinite(feature.h) || feature.h <= 0;
    if (noHeight) rejected.noHeight++;
    if (ring.length < 4 || !ring.every(p => p.length === 2 && p.every(Number.isFinite)) ||
      ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) {
      rejected.invalidRing++; continue;
    }
    const points = ring.slice(0, -1).map(p => new THREE.Vector2(p[0], p[1]));
    const area = signedArea(points);
    if (Math.abs(area) < 0.01 || selfIntersecting(points)) { rejected.invalidRing++; continue; }
    if (noHeight) continue;
    if (!nearOrigin(ring)) { rejected.outside++; continue; }
    if (area < 0) points.reverse();
    accepted.push({ feature, points, candidate: candidates.has(feature.id) });
  }
  return { accepted, rejected };
}
function pushVertex(positions: number[], colors: number[], x: number, y: number, z: number, color: THREE.Color) {
  positions.push(x, y, z); colors.push(color.r, color.g, color.b);
}
function triangle(positions: number[], colors: number[], p: [number, number, number], q: [number, number, number], r: [number, number, number], color: THREE.Color) {
  pushVertex(positions, colors, ...p, color); pushVertex(positions, colors, ...q, color); pushVertex(positions, colors, ...r, color);
}
export function makeBuildings(items: Accepted[], isCandidate: boolean): THREE.Mesh {
  const positions: number[] = [], colors: number[] = [];
  const roof = new THREE.Color(isCandidate ? '#d8ac60' : '#849ba4');
  const wall = new THREE.Color(isCandidate ? '#aa824d' : '#728894');
  for (const { feature, points, candidate } of items) {
    if (candidate !== isCandidate) continue;
    // h is taken as a relative LOD1 display height from provisional y=0, NOT as measured GL.
    const h = feature.h;
    const triangles = THREE.ShapeUtils.triangulateShape(points, []);
    for (const [a, b, c] of triangles) {
      const p = points[a], q = points[b], r = points[c];
      triangle(positions, colors, [p.x, h, -p.y], [q.x, h, -q.y], [r.x, h, -r.y], roof);
    }
    for (let i = 0; i < points.length; i++) {
      const p = points[i], q = points[(i + 1) % points.length];
      triangle(positions, colors, [p.x, h, -p.y], [p.x, 0, -p.y], [q.x, h, -q.y], wall);
      triangle(positions, colors, [q.x, h, -q.y], [p.x, 0, -p.y], [q.x, 0, -q.y], wall);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: isCandidate ? 0.82 : 0.91, depthWrite: true }));
}
