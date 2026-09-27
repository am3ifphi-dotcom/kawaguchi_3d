import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** Numeric GIS-plane regression test for the Phase 2 study, NOT a survey check.
 * Validates that our selected rings share the intended membrane edge and that
 * bilinear membrane coordinates never leave the supplied quadrilateral.
 */
const features = JSON.parse(readFileSync(new URL('../plateau_53395597.json', import.meta.url), 'utf8')).features;
const feature = id => {
  const matches = features.filter(f => f.id === `bldg_${id}`);
  assert.equal(matches.length, 1, `${id} must identify exactly one feature`);
  return matches[0];
};
const membrane = feature('44f5071e-59b1-41af-840e-03d9cd2bb6a9');
const south = feature('4cf7907f-f7c3-4341-9b50-2d6a013032ba');
const north = feature('2d60618f-f5c7-4f74-958b-e4b49cd172e3');
const arenaS = feature('201a8894-473d-4e6a-9182-de27ee40ccf3');
const arenaNW = feature('0c732e20-c8b1-494c-b725-ad31674dfc8a');
const arenaNE = feature('b01d7688-a716-41e7-9147-91bbf9c042c7');
const near = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1]) < .001;
const hasEdge = (ring, a, b) => ring.slice(0, -1).some((p, i) =>
  (near(p, a) && near(ring[i + 1], b)) || (near(p, b) && near(ring[i + 1], a)));
const [se, ne, nw, sw] = membrane.ring;
assert.equal(membrane.ring.length, 5);
assert(near(se, membrane.ring[4]));
assert(hasEdge(south.ring, sw, se), 'school south edge should border membrane');
assert(hasEdge(north.ring, nw, ne), 'school north edge should border membrane');
// Photo-corrected outer facades must be real GIS boundary segments. The old
// north elevation used a guessed straight chord THROUGH the building polygon.
for (const [ring, a, b, label] of [
  [south.ring, [-2.25, 13.57], [49.39, 16], 'school south west'],
  [south.ring, [56.26, 16.34], [107.65, 18.74], 'school south east'],
  [north.ring, [-4.98, 70.1], [70.04, 73.63], 'school north west'],
  [north.ring, [70.37, 66.69], [97.38, 67.96], 'school north east'],
  [arenaS.ring, [-114.11, 40.56], [-53, 43.87], 'arena south street'],
  [arenaNW.ring, [-92.34, 63.07], [-55.47, 64.67], 'arena north street west'],
  [arenaNE.ring, [-32.06, 65.77], [-12.44, 66.62], 'arena north street east']
]) assert(hasEdge(ring, a, b), `${label} facade no longer on GIS boundary`);
const signedArea = ring => ring.slice(0, -1).reduce((sum, p, i) =>
  sum + p[0] * ring[i + 1][1] - ring[i + 1][0] * p[1], 0) / 2;
assert(Math.abs(Math.abs(signedArea(membrane.ring)) - 1722.8) < .1);
const cross = (p, a, b) => (b[0]-a[0]) * (p[1]-a[1]) - (b[1]-a[1]) * (p[0]-a[0]);
let maxPlanOvershootM = 0;
for (let i = 0; i <= 40; i++) for (let j = 0; j <= 14; j++) {
  const u = i / 40, t = j / 14;
  const p = [
    (1-t) * (sw[0] * (1-u) + se[0] * u) + t * (nw[0] * (1-u) + ne[0] * u),
    (1-t) * (sw[1] * (1-u) + se[1] * u) + t * (nw[1] * (1-u) + ne[1] * u)
  ];
  for (const [a, b] of [[se, ne], [ne, nw], [nw, sw], [sw, se]]) {
    const side = cross(p, a, b), orientation = Math.sign(signedArea(membrane.ring));
    const outside = Math.max(0, -orientation * side / Math.hypot(b[0]-a[0], b[1]-a[1]));
    maxPlanOvershootM = Math.max(maxPlanOvershootM, outside);
  }
}
assert(maxPlanOvershootM < 1e-7, 'roof surface projected outside GIS quadrilateral');
// Arena N/S are separated by a physical street; do not interchange their ids.
assert(Math.max(...arenaS.ring.map(p => p[1])) < Math.min(...arenaNW.ring.map(p => p[1])));
assert(Math.max(...arenaS.ring.map(p => p[1])) < Math.min(...arenaNE.ring.map(p => p[1])));
console.log(JSON.stringify({ gisMembraneAreaM2: Math.abs(signedArea(membrane.ring)), maxRoofPlanOvershootM: maxPlanOvershootM, arenaStreetOrientation: 'Arena S south; Arena N north', status: 'GIS anchoring only, not as-built accuracy' }, null, 2));
