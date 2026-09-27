import * as THREE from 'three';
import source from '../../plateau_53395597.json';
import { westConnectionStudy } from './west-connection';
import { roofEquipmentStudy } from './roof-equipment';
import { interiorStudy } from './interior';

/** Exterior study, NOT a verified as-built model. Building outlines come from supplied
 * LOD1 rings. School floor levels / roof control heights come from 27901siryou.pdf p.9.
 * Openings, steps and roof curve are marked estimated in docs/exterior-study.md.
 * Coordinates: Three (east, up, south); JSON coordinates: (east, north).
 */
const ids = {
  south: 'bldg_4cf7907f-f7c3-4341-9b50-2d6a013032ba',
  membrane: 'bldg_44f5071e-59b1-41af-840e-03d9cd2bb6a9',
  north: 'bldg_2d60618f-f5c7-4f74-958b-e4b49cd172e3',
  arenaSouth: 'bldg_201a8894-473d-4e6a-9182-de27ee40ccf3',
  arenaNorthWest: 'bldg_0c732e20-c8b1-494c-b725-ad31674dfc8a',
  arenaNorthEast: 'bldg_b01d7688-a716-41e7-9147-91bbf9c042c7'
} as const;
const featureById = new Map(source.features.map(f => [f.id, f]));
const stage = new THREE.Group();
stage.name = 'Exterior study | plan-grounded, inferred openings';
const palette = {
  stone: new THREE.MeshStandardMaterial({ color: 0xe7e3d9, roughness: .91 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xb6b9b3, roughness: .94, side: THREE.DoubleSide }),
  parapet: new THREE.MeshStandardMaterial({ color: 0xeaece7, roughness: .82 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x3e4c54, metalness: .44, roughness: .44 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x243137, roughness: .77 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x54717b, metalness: .13, roughness: .27, transparent: true, opacity: .82, depthWrite: false, side: THREE.DoubleSide }),
  arena: new THREE.MeshStandardMaterial({ color: 0xdce0da, roughness: .83, side: THREE.DoubleSide }),
  paving: new THREE.MeshStandardMaterial({ color: 0x414f54, roughness: .93 }),
  rail: new THREE.MeshStandardMaterial({ color: 0x313d44, metalness: .55, roughness: .39 }),
  membrane: new THREE.MeshStandardMaterial({ color: 0xfafdf6, metalness: 0, roughness: .66, transparent: true, opacity: .87, side: THREE.DoubleSide, depthWrite: false }),
  step: new THREE.MeshStandardMaterial({ color: 0xa9ada8, roughness: .96 }),
  stairStripe: new THREE.MeshStandardMaterial({ color: 0xbb725d, roughness: .98 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x456c85, roughness: .87 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb45c52, roughness: .87 }),
  green: new THREE.MeshStandardMaterial({ color: 0x639171, roughness: .87 }),
  ochre: new THREE.MeshStandardMaterial({ color: 0xb5a35e, roughness: .87 }),
  bark: new THREE.MeshStandardMaterial({ color: 0x665b4d, roughness: .95 }),
  foliage: new THREE.MeshStandardMaterial({ color: 0x689a74, roughness: .95 })
};

function box(name: string, size: [number, number, number], at: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name; mesh.position.set(...at); stage.add(mesh);
  return mesh;
}
/** Open the long inner face of each teaching wing. The supplied LOD1 polygon
 * is a roof outline, not an as-built floor plate: repeating its footprint as
 * slabs is a schematic approximation. Unlike a closed extrusion, this lets
 * light and sightlines pass through the photographed galleries. */
function openWing(id: string, inner: [[number, number], [number, number]]) {
  const feature = featureById.get(id);
  if (!feature) throw new Error(`GIS footprint missing: ${id}`);
  const pts = feature.ring.slice(0, -1);
  const outline = new THREE.Shape(pts.map(([e, n]) => new THREE.Vector2(e, n)));
  for (const height of [0, 4, 7.6, 11.2, 14.8, 18.4]) {
    const geo = new THREE.ShapeGeometry(outline);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd8d9d2, roughness: .9, side: THREE.DoubleSide }));
    mesh.name = `${id} floor slab study +${height}`; mesh.position.y = height;
    stage.add(mesh);
  }
  const close = (a: [number, number], b: [number, number]) => Math.hypot(a[0]-b[0],a[1]-b[1]) < .15;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as [number, number], b = pts[(i + 1) % pts.length] as [number, number];
    if (close(a, inner[0]) && close(b, inner[1]) || close(a, inner[1]) && close(b, inner[0])) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      a[0], 0, -a[1], b[0], 0, -b[1], b[0], 18.4, -b[1],
      a[0], 0, -a[1], b[0], 18.4, -b[1], a[0], 18.4, -a[1]
    ], 3));
    geometry.computeVertexNormals();
    const longOutside = (id === ids.south && a[1] < 20 && b[1] < 20 || id === ids.north && a[1] > 65 && b[1] > 65) && Math.hypot(a[0]-b[0], a[1]-b[1]) > 18;
    const wall = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: longOutside ? 0x30383a : 0xe7e3d9, side: THREE.DoubleSide, roughness: .91 }));
    wall.name = `${id} opaque outer wall study`; stage.add(wall);
  }
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = inner[0][0] * (1-t) + inner[1][0] * t;
    const n = inner[0][1] * (1-t) + inner[1][1] * t;
    box('Open gallery structural pier | spacing inferred', [.5, 18.4, .5], [x, 9.2, -n], palette.concrete);
  }
}

function line(name: string, vertices: THREE.Vector3[], color: number, opacity = 1) {
  const obj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  obj.name = name; stage.add(obj);
}
function beam(name: string, start: THREE.Vector3, end: THREE.Vector3, thickness: number, material: THREE.Material) {
  const diff = new THREE.Vector3().subVectors(end, start);
  const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, diff.length()), material);
  beamMesh.position.copy(start).add(end).multiplyScalar(.5);
  beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), diff.normalize());
  beamMesh.name = name; stage.add(beamMesh);
}

/** Interior street facade: alternating coloured projecting classroom boxes and
 * dark open-gallery bands are visible in the city's photos. Number, rhythm,
 * sizes and openings below are NOT surveyed; rooms have no true openings.
 */
function streetFacades() {
  const colours = [palette.red, palette.stone, palette.green, palette.stone, palette.blue, palette.stone, palette.ochre];
  for (const northWing of [false, true]) {
    const inner = (x: number) => northWing ? 50.49 + .0797 * (x - 5.09) : 33.56 + .048 * (x - 6.25);
    const normal = northWing ? -1 : 1; // n positive toward north for the south wing
    for (let k = 0; k < 7; k++) {
      const x = 11 + k * 12.6;
      const n = inner(x);
      const z = -(n + normal * .6);
      // Contrasting balcony voids and railings within each level.
      for (const floor of [0, 1, 2, 3]) {
        const bottom = 4 + floor * 3.6;
        box('Open gallery dark recess | facade study', [8, 1.45, .16], [x, bottom + 1.35, z], palette.dark);
        box('Gallery guardrail | facade study', [8, .8, .12], [x, bottom + .95, z - normal * .18], palette.rail);
      }
      // Opposite-direction street photos concentrate colourful projection on
      // one long elevation; identifying its exact bay / wing still needs a
      // camera calibration, so the south side remains mostly neutral.
      const mat = northWing ? colours[k] : (k === 3 ? palette.red : palette.stone);
      const panelZ = z - normal * .33;
      box('Projecting classroom module | photo-derived colour / schematic layout', [7.3, 3.2, .6],
        [x + 1.9, 9.2 + (k % 2) * 3.6, panelZ], mat);
      // Recessed small windows against opaque panels (no through-hole yet).
      for (const [shift, dy, width] of [[-1.4, .4, 1.1], [1.1, -.3, .68]]) {
        box('Small square window | arrangement unverified', [width, width, .04],
          [x + 1.9 + shift, 9.2 + (k % 2) * 3.6 + dy, panelZ - normal * .34], palette.glass);
      }
    }
  }
}

/** School outer galleries: the city north-elevation photo and wide southern
 * stadium photo show deep dark recesses with continuous pale concrete floor
 * edges and metal guardrails, NOT a continuous pale facade with pasted glass.
 * Two actual GIS outer edges are used per wing (rather than a bounding line
 * that used to cut diagonally across the north roof polygon). Positions and
 * opening widths remain schematic because no as-built elevation was found. */
function schoolGallery(name: string, start: [number, number], end: [number, number], northFace: boolean) {
  const dx = end[0] - start[0], dn = end[1] - start[1];
  const length = Math.hypot(dx, dn), ux = dx / length, un = dn / length;
  const normalN = northFace ? 1 : -1;
  const count = Math.max(2, Math.round(length / 7.8));
  for (const y of [4, 7.6, 11.2, 14.8, 18.4]) {
    beam(`${name} pale slab and fascia | photo interpretation`,
      new THREE.Vector3(start[0], y, -start[1] - normalN * .26),
      new THREE.Vector3(end[0], y, -end[1] - normalN * .26), .36, palette.parapet);
  }
  for (let level = 0; level < 5; level++) {
    const h = level === 0 ? 1.35 : [4, 7.6, 11.2, 14.8][level - 1] + 1.05;
    if (level > 0) {
      beam(`${name} open balcony guardrail | inferred spacing`,
        new THREE.Vector3(start[0], h, -start[1] - normalN * .42),
        new THREE.Vector3(end[0], h, -end[1] - normalN * .42), .075, palette.rail);
    }
    for (let bay = 0; bay < count; bay++) {
      const dist = (bay + .5) * length / count;
      const x = start[0] + ux * dist;
      const n = start[1] + un * dist;
      // Windows rest behind the balcony rail. The width/rhythm are not a schedule.
      const width = Math.min(length / count * .7, 5.8);
      const window = box(`${name} recessed window | photographic study`, [width, northFace ? 1.5 : (level === 0 ? 2.4 : 2.65), .055],
        [x, h + (level === 0 ? .65 : .56), -n - normalN * .07], palette.glass);
      window.rotation.y = Math.atan2(un, ux);
      if (level > 0) for (const offset of [-width / 2, width / 2]) {
        box(`${name} balcony post | inferred`, [.055, 1, .055],
          [x + ux * offset, h - .46, -n - un * offset - normalN * .42], palette.rail);
      }
    }
  }
}

function school() {
  openWing(ids.south, [[6.25, 33.56], [99.7, 38.07]]);
  openWing(ids.north, [[5.09, 50.49], [98.19, 57.91]]);
  // Photo-aligned gallery elevations follow the actual GIS edges in separate spans.
  schoolGallery('S outer south gallery west', [-2.25, 13.57], [49.39, 16.0], false);
  schoolGallery('S outer south gallery east', [56.26, 16.34], [107.65, 18.74], false);
  schoolGallery('N outer north gallery west', [-4.98, 70.1], [70.04, 73.63], true);
  schoolGallery('N outer north gallery east', [70.37, 66.69], [97.38, 67.96], true);
  // The 2015 south elevation p.8 and city okugaikaidann.jpg show a tall
  // recessed glazed bay between the school's two long gallery spans. GIS
  // captures this south-side notch, but the previous rendering left it blank.
  // These are schematic overlays onto the GIS wall, not surveyed mullions.
  const coreWest: [number,number]=[49.11,22.06], coreEast: [number,number]=[55.98,22.39];
  for (const [bottom,top] of [[.4,3.4],[4.35,7.2],[7.95,10.8],[11.55,14.4],[15.15,18]]) {
    panel('South facade glazed central recessed tower | 2015 p.8 and city photo',
      [coreWest[0],coreWest[1]-.08],[coreEast[0],coreEast[1]-.08],bottom,top,palette.glass);
  }
  for (const t of [0,.34,.68,1]) {
    const x=coreWest[0]*(1-t)+coreEast[0]*t;
    const n=coreWest[1]*(1-t)+coreEast[1]*t;
    box('South recessed glazed bay mullion | spacing inferred',[.065,18,.065],[x,9,-n+.08],palette.steel);
  }
  streetFacades();
  // At the centre of the school's south-elevation roof line (D1 p.8), the
  // crossed lines indicate a small framed crown. Show two thin X members,
  // intentionally isolated from the membrane's GIS-controlled footprint.
  for(const n of [22.18,22.55]){
    beam('School rooftop crossed frame | D1 p.8 silhouette, detail unverified',
      new THREE.Vector3(49.15,18.45,-n),new THREE.Vector3(55.95,20.8,-n),.1,palette.steel);
    beam('School rooftop crossed frame | D1 p.8 silhouette, detail unverified',
      new THREE.Vector3(49.15,20.8,-n),new THREE.Vector3(55.95,18.45,-n),.1,palette.steel);
  }
  // Roof over the 2F–5F open street. The GIS central polygon is 1,722.8 m²,
  // close to historical membrane supplier listing of 1,730 m² (unverified old record).
  // Width / rising arch are approximate; 18.486m eave is printed on p.9 section.
  const membraneFootprint = featureById.get(ids.membrane);
  if (!membraneFootprint) throw new Error(`GIS membrane ring missing: ${ids.membrane}`);
  // GIS ring is ordered SE, NE, NW, SW, SE. A bilinear surface stays EXACTLY
  // within that quadrilateral in plan. Earlier constant-X sections overhung
  // the actual NW/NE boundary: do not extrapolate a trapezoid as a rectangle.
  const [se, ne, nw, sw] = membraneFootprint.ring;
  const roofXY = (u: number, t: number) => {
    const east = (1-t) * (sw[0] * (1-u) + se[0] * u) + t * (nw[0] * (1-u) + ne[0] * u);
    const north = (1-t) * (sw[1] * (1-u) + se[1] * u) + t * (nw[1] * (1-u) + ne[1] * u);
    return new THREE.Vector3(east, 0, -north);
  };
  const roofY = (t: number) => 18.486 + 3.3 * 4 * t * (1 - t);
  const nx = 40, nv = 14, vertices: number[] = [], indices: number[] = [];
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nv; j++) {
      const t = j / nv, p = roofXY(i / nx, t);
      vertices.push(p.x, roofY(t), p.z);
    }
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  surface.setIndex(indices); surface.computeVertexNormals();
  const roof = new THREE.Mesh(surface, palette.membrane);
  roof.name = 'Membrane roof | sectional-height study (A-class PTFE / glass fibre)';
  roof.renderOrder = 3; stage.add(roof);
  // Cross ribs and longitudinal seams, measured curvature NOT available.
  for (let i = 0; i <= 12; i++) {
    const pts = Array.from({ length: 18 }, (_, j) => {
      const t = j / 17, p = roofXY(i / 12, t);
      p.y = roofY(t) - .12; return p;
    });
    line('Membrane transverse rib | visual estimate', pts, 0x8e9b98, .83);
  }
  for (const t of [0, .25, .5, .75, 1]) {
    const pts = Array.from({ length: 40 }, (_, i) => {
      const p = roofXY(i / 39, t);
      p.y = roofY(t) - .11; return p;
    });
    line('Membrane lengthwise seam | visual estimate', pts, 0x9aa4a1, .72);
  }
  // East entrance: prefectural school_02_01.jpg (inspected pixels) shows a
  // broad grey terraced approach, metal handrails and trees growing from a
  // central planted strip. Only their EXISTENCE/composition is confirmed.
  // The step schedule, strip and siting below are explicitly unmeasured.
  const stairSouth = 36, stairNorth = 58, count = 24;
  const medianSouth = 45.5, medianNorth = 48.3;
  const runs: [number, number][] = [[stairSouth, medianSouth], [medianNorth, stairNorth]];
  const flights = [
    { east: 120, west: 114.5, low: 0, high: 1.35 },
    { east: 112.5, west: 107, low: 1.35, high: 2.7 },
    { east: 105, west: 99.5, low: 2.7, high: 4 }
  ];
  const heightAt = (x: number) => {
    for (const f of flights) if (x <= f.east && x >= f.west)
      return f.low + (f.east - x) * (f.high - f.low) / (f.east - f.west);
    if (x > 120) return 0;
    if (x < 99.5) return 4;
    return x < 106 ? 2.7 : 1.35;
  };
  for (let flight = 0; flight < flights.length; flight++) {
    const f = flights[flight];
    for (let i = 0; i < count / 3; i++) {
      const h = f.low + (i + 1) * (f.high - f.low) / (count / 3);
      const x = f.east - (i + .5) * (f.east - f.west) / (count / 3);
      for (const [s, n] of runs) {
        const tread = box('East gateway stair | split flights / tree median; PHOTO confirms features, schedule unmeasured',
          [(f.east - f.west) / (count / 3), h, n - s],
          [x, h / 2, -(s+n)/2], palette.step);
        tread.userData.estimate = true;
      }
    }
    if (flight < flights.length - 1) {
      const next = flights[flight + 1];
      for (const [s, n] of runs) {
        box('East gateway concrete landing | PHOTO grey, size unmeasured',
          [f.west - next.east, f.high, n-s],
          [(f.west + next.east)/2, f.high/2, -(s+n)/2], palette.step);
        box('Gateway landing joint | schematic',
          [f.west - next.east, .018, n-s],
          [(f.west + next.east)/2, f.high + .016, -(s+n)/2], palette.concrete);
      }
    }
  }
  // Each railing follows the rising tread line rather than hovering across
  // landings. Two middle railings enclose the planted median; none is surveyed.
  for (const n of [stairSouth, medianSouth, medianNorth, stairNorth]) {
    for (const f of flights) {
      beam('Gateway stair steel handrail | photo-observed type, alignment inferred',
        new THREE.Vector3(f.east, f.low + .95, -n),
        new THREE.Vector3(f.west, f.high + .95, -n), .055, palette.rail);
      for (let j = 0; j <= 3; j++) {
        const x = f.east - (f.east - f.west) * j / 3;
        beam('Gateway stair handrail post | study',
          new THREE.Vector3(x, heightAt(x), -n),
          new THREE.Vector3(x, heightAt(x) + .95, -n), .042, palette.rail);
      }
    }
  }
  // Planter treads follow the stair heights; a single elevated slab here
  // would hover over the lower steps in a ground-level comparison photo.
  for (const f of flights) {
    for (let i = 0; i < count / 3; i++) {
      const x = f.east - (i + .5) * (f.east - f.west) / (count / 3);
      const h = f.low + (i + 1) * (f.high - f.low) / (count / 3);
      box('Gateway tree median stepped curb | photo-observed motif / unmeasured',
        [(f.east-f.west) / (count/3), h + .27, medianNorth-medianSouth],
        [x, (h+.27)/2, -(medianNorth+medianSouth)/2], palette.concrete);
      box('Gateway tree median low green planting | illustrative',
        [(f.east-f.west) / (count/3) - .015, .06, medianNorth-medianSouth-.2],
        [x, h+.31, -(medianNorth+medianSouth)/2], palette.foliage);
    }
  }
  for (const [x, n, scale] of [[116.2, 46.7, .86], [109.2, 47, 1.15], [102.7, 46.9, .75]] as const) {
    const h = heightAt(x) + .45;
    box('Gateway planted tree trunk | photo-confirmed trees, locations inferred',
      [.22, 2.8 * scale, .22], [x, h + 1.4 * scale, -n], palette.bark);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45 * scale, 1), palette.foliage);
    crown.name = 'Gateway planted deciduous crown | simplified photo study';
    crown.position.set(x, h + 3.6 * scale, -n); stage.add(crown);
  }
  // A short paving apron bridges the modeled stair foot to the site approach.
  // Not a claim about public road widths or surveyed property lines.
  box('Gateway approach paving | footprint unmeasured', [16, .045, 26], [128, .03, -47], palette.concrete);
  // Prefectural wide entrance photograph shows slim, brightly coloured
  // boundary pickets and a road in front. Length/road width here are schematic.
  box('East gate roadside path | extent inferred', [6, .042, 73], [137, .04, -45], palette.concrete);
  box('East road dark asphalt | PHOTO confirms foreground road, width unmeasured',
    [17, .034, 73], [148, .025, -45], palette.paving);
  for (const [start, end] of [[15, 35], [59, 77]]) {
    const colours = [palette.blue, palette.red, palette.ochre, palette.green, palette.dark, palette.parapet];
    const pickets = Math.round((end-start)/.33);
    for (let k = 0; k <= pickets; k++) {
      const n = start + (end-start)*k/pickets;
      box('Entrance colour picket fence | photo-confirmed colours, location/spacing unmeasured',
        [.1, 1.35, .11], [133.8, .73, -n], colours[k % colours.length]);
    }
    for (const y of [.28, 1.16]) {
      box('East gate fence horizontal rail | approximate', [.09, .05, end-start],
        [133.8, y, -(start+end)/2], palette.dark);
    }
  }
  box('Learning street 2F deck | extent inferred', [93.5, .2, 17], [52.4, 3.9, -46], palette.paving);
  for (const [x, height] of [[23, 7.6], [53, 11.2], [84, 14.8]]) {
    const u = (x - sw[0]) / (se[0] - sw[0]);
    const zSouth = roofXY(u, 0).z, zNorth = roofXY(u, 1).z;
    box('Cross-gallery bridge | location inferred', [3.4, .26, zSouth - zNorth],
      [x, height - .13, (zSouth + zNorth) / 2], palette.concrete);
    for (const side of [-1.7, 1.7]) {
      beam('Bridge handrail | inferred', new THREE.Vector3(x + side, height + .9, zSouth),
        new THREE.Vector3(x + side, height + .9, zNorth), .065, palette.rail);
    }
  }
  // City gate end: bright solid wall and slender full-height glazed strips seen in exterior photo.
  // These are representational, not counted/located from window schedule.
  for (const [east, north] of [[106.9, 22], [97.6, 65.5]]) {
    box('East end vertical glazing | photo-derived location approximate', [.12, 15.9, 2.1], [east, 10.2, -north], palette.glass);
  }
  // Prefectural east-elevation photograph shows a narrow full-height
  // reflective vertical panel on the south end mass and fine horizontal wall
  // coursing. Their repetition and material are not documented in the PDF.
  box('East south end vertical sign recess | image-observed, width inferred',
    [.09, 14, 1.2], [107.52, 10.5, -22.5], palette.steel);
  box('East south end pale vertical sign panel | photo-observed, blank because temporary competition banner differs by date',
    [.1, 13.6, .96], [107.61, 10.5, -22.5], palette.parapet);
  for (let y = 1.3; y < 18; y += .68) {
    line('East south end faint horizontal facade joint | photo study',
      [new THREE.Vector3(107.69, y, -18.85), new THREE.Vector3(106.78, y, -38.3)], 0xc9ccc4, .36);
  }
  // The city / prefectural photographs show the school's name high on the
  // pale east-facing end mass. Text itself is factual, its precise font,
  // kerning and position here are not copied from architectural signage plans.
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const drawName = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#25363a'; context.font = '700 62px \"Noto Sans JP\", sans-serif';
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText('川口市立高等学校', canvas.width / 2, canvas.height / 2);
    };
    drawName();
    const name = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 1.45),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    name.name = 'East school name | approximate signage placement';
    name.rotation.y = Math.PI / 2 + .0468; // follow the GIS end-wall slope
    name.position.set(107.32, 17.5, -27.5); stage.add(name);
    document.fonts.load('700 62px \"Noto Sans JP\"').then(() => {
      drawName(); (name.material as THREE.MeshBasicMaterial).map!.needsUpdate = true;
    });
  }
}

/** Double-sided vertical panel along a local GIS edge. */
function panel(name: string, a: [number, number], b: [number, number], low: number, high: number, material: THREE.Material) {
  const vertices = [a[0], low, -a[1], b[0], low, -b[1], b[0], high, -b[1],
    a[0], low, -a[1], b[0], high, -b[1], a[0], high, -a[1]];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; stage.add(mesh);
}

/** In the completed Physical Street photographs the S arena is NOT a solid
 * cuboid. A tall off-white upper hanging wall floats above a colonnade. The
 * street-facing GIS edge is therefore left open below the upper cladding.
 * Wall heights/pier rhythm/seam triangles below are only photo interpretations. */
function arenaSouthShell() {
  const feature = featureById.get(ids.arenaSouth);
  if (!feature) throw new Error(`GIS footprint missing: ${ids.arenaSouth}`);
  const ring = feature.ring.slice(0, -1) as [number, number][];
  const top = new THREE.ShapeGeometry(new THREE.Shape(ring.map(([e, n]) => new THREE.Vector2(e, n))));
  top.rotateX(-Math.PI / 2);
  const roof = new THREE.Mesh(top, new THREE.MeshStandardMaterial({ color: 0xdce0da, roughness: .82, side: THREE.DoubleSide }));
  roof.name = 'Arena S flat supporting roof | GIS footprint study'; roof.position.y = 16.7; stage.add(roof);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const street = a[1] > 40 && b[1] > 40 && a[0] >= -114.2 && b[0] >= -114.2;
    if (!street) { panel('Arena S external enclosure | GIS edge', a, b, 0, 16.7, palette.arena); continue; }
    panel('Arena S suspended pale upper cladding | city completion photo', a, b, 8.4, 16.7, palette.arena);
    // Translucent upper band, visible under the corrugated raised roof lip.
    panel('Arena S street-facing clerestory | photo-derived, height inferred',
      [a[0], a[1] + .065], [b[0], b[1] + .065], 16.75, 18.15, palette.glass);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const bays = Math.max(1, Math.round(len / 7.5));
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays;
      const x = a[0] + (b[0] - a[0]) * t, n = a[1] + (b[1] - a[1]) * t;
      box('Arena S colonnade | study spacing', [.44, 8.4, .44], [x, 4.2, -n], palette.concrete);
    }
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays;
      const point = (t: number, y: number) => new THREE.Vector3(a[0] + (b[0]-a[0])*t,
        y, -(a[1] + (b[1]-a[1])*t + .09));
      // Visible shallow triangular joint / brace lines. They are seams, not a
      // claim about construction or the number of structural braces.
      line('Arena S upper wall triangular joints | photographic interpretation',
        [point(t0, 8.5), point((t0+t1)/2, 16.55), point(t1, 8.5)], 0xaab2ae, .7);
    }
    panel('Arena S open lobby dark recess | photo-derived, no interior modeled',
      [a[0], a[1] - .55], [b[0], b[1] - .55], 1.25, 5.1, palette.dark);
    beam('Arena S broad street-side eave | inferred depth',
      new THREE.Vector3(a[0], 18.4, -a[1]), new THREE.Vector3(b[0], 18.4, -b[1]), .32, palette.parapet);
  }
}

/** Arena N, opposite the white S upper enclosure: official completion and JIA
 * dojo photos show ground-floor glazing opened to the Campus Road and an upper
 * railing/glazing level. These are NOT surveyed bay counts or finished rooms. */
function arenaNorthShell(id: string) {
  const feature = featureById.get(id);
  if (!feature) throw new Error(`GIS footprint missing: ${id}`);
  const ring = feature.ring.slice(0, -1) as [number, number][];
  const roofGeo = new THREE.ShapeGeometry(new THREE.Shape(ring.map(([e, n]) => new THREE.Vector2(e, n))));
  roofGeo.rotateX(-Math.PI / 2);
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0xe2e3de, side: THREE.DoubleSide, roughness: .84 }));
  roof.name = 'Arena N GIS roof cap | study'; roof.position.y = 12.9; stage.add(roof);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const facingStreet = a[1] >= 63 && b[1] >= 63 && a[1] < 67 && b[1] < 67
      && Math.abs(a[0] - b[0]) > .3;
    if (!facingStreet) { panel('Arena N outer wall | GIS edge', a, b, 0, 12.9, palette.concrete); continue; }
    panel('Arena N dojo-to-road glazing | photo-derived, no surveyed mullions', a, b, .4, 5.8, palette.glass);
    panel('Arena N upper public gallery glazing | photo-derived', a, b, 6.6, 11.85, palette.glass);
    const span = Math.hypot(b[0]-a[0], b[1]-a[1]);
    const bays = Math.max(1, Math.round(span / 5.4));
    for (let k = 0; k <= bays; k++) {
      const t = k / bays, x = a[0] * (1-t) + b[0] * t, n = a[1] * (1-t) + b[1] * t;
      box('Arena N dojo storefront column | bay width estimated', [.15, 11.8, .15], [x, 5.9, -n], palette.steel);
    }
    for (const y of [6.1, 12.0]) beam('Arena N gallery slab edge | estimated',
      new THREE.Vector3(a[0], y, -a[1]), new THREE.Vector3(b[0], y, -b[1]), .28, palette.parapet);
    beam('Arena N public gallery guardrail | photo observed',
      new THREE.Vector3(a[0], 7.1, -a[1] + .16), new THREE.Vector3(b[0], 7.1, -b[1] + .16), .07, palette.rail);
  }
}

function arena() {
  arenaSouthShell();
  arenaNorthShell(ids.arenaNorthWest);
  arenaNorthShell(ids.arenaNorthEast);
  // The 2015 south elevation p.8 draws conspicuous crossed members at
  // the break between the two Arena N roof volumes. Photo silhouettes show
  // the break, but member depth/attachment remains a design-stage estimate.
  for (const n of [64.5, 66.0]) {
    const xLeft=-55.55,xRight=-49.15,low=12.96,high=16.1;
    // Four rails close the cross-braced panel, visibly bearing on the two
    // Arena N roof edges rather than floating above the Physical Street.
    for(const y of [low,high]) beam('Arena N roof crossing horizontal chord | D1 p.8 study',
      new THREE.Vector3(xLeft,y,-n),new THREE.Vector3(xRight,y,-n),.14,palette.parapet);
    for(const x of [xLeft,xRight]) beam('Arena N roof crossing end post | D1 p.8 study',
      new THREE.Vector3(x,low,-n),new THREE.Vector3(x,high,-n),.14,palette.parapet);
    beam('Arena N rooftop X brace | 2015 south elevation p.8, location estimated',
      new THREE.Vector3(xLeft,low,-n),new THREE.Vector3(xRight,high,-n),.11,palette.parapet);
    beam('Arena N rooftop X brace | 2015 south elevation p.8, location estimated',
      new THREE.Vector3(xLeft,high,-n),new THREE.Vector3(xRight,low,-n),.11,palette.parapet);
  }
  // The south arena section in p.9 has ~19.871 m overall height. The low curved
  // roof is a sectional silhouette study, not a measured beam/truss system.
  const x0 = -120, x1 = -49, zSouth = 6, zNorth = -39;
  const y = (t: number) => 16.7 + 2.9 * 4 * t * (1 - t);
  const positions: number[] = [], indices: number[] = [], nx = 24, nv = 16;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nv; j++) {
    const x = x0 + (x1 - x0) * i / nx, t = j / nv;
    positions.push(x, y(t), zSouth * (1 - t) + zNorth * t);
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc9d1d0, side: THREE.DoubleSide, metalness: .18, roughness: .77 }));
  roof.name = 'South arena low arched roof | study'; stage.add(roof);
  for (let x = -119; x <= -51; x += 5) {
    const pts = Array.from({ length: 20 }, (_, i) => {
      const t = i / 19; return new THREE.Vector3(x, y(t) + .04, zSouth * (1 - t) + zNorth * t);
    });
    line('South arena roof seams | inferred pitch', pts, 0xaebdbc, .8);
  }
  // The city photographs show a segmented light canopy in front of the N
  // gallery. This white rib sequence is inferred from the images, not a survey.
  for (const [west, east, nWest, nEast] of [[-92.3, -55.5, 63.1, 64.7], [-49.4, -13, 65.05, 66.6]]) {
    const nAt = (x: number) => nWest + (nEast - nWest) * (x - west) / (east - west);
    for (let x = west + 2.5; x < east - 1; x += 5) {
      const canopyN = nAt(x) - 1.55;
      box('Arena N covered walkway light canopy | span approximate', [4.75, .09, 3.6],
        [x, 4.15, -canopyN], palette.parapet);
      beam('Covered walkway transverse rib | photo study',
        new THREE.Vector3(x - 2.35, 4.23, -(canopyN - 1.8)),
        new THREE.Vector3(x - 2.35, 4.23, -(canopyN + 1.8)), .05, palette.steel);
    }
  }
  box('Physical Street ground | inferred extents', [78, .06, 21], [-53, .06, -52], palette.paving);
  // JIA's竣工photo/caption shows a tree-lined, rubber-chip campus road. Tree
  // counts, planting positions, graphic markings and canopy sizes are studies.
  const trees = 9;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.14, .18, 4.5, 7), palette.bark, trees);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.65, 1), palette.foliage, trees);
  trunks.name = 'Physical Street trees | alignment / count inferred';
  crowns.name = 'Physical Street tree crowns | stylised Katsura from JIA caption';
  const tree = new THREE.Object3D();
  for (let i = 0; i < trees; i++) {
    const x = -86 + i * 8.5;
    tree.position.set(x, 2.25, -53); tree.rotation.set(0, 0, 0); tree.scale.set(1, 1, 1);
    tree.updateMatrix(); trunks.setMatrixAt(i, tree.matrix);
    tree.position.y = 5.1; tree.scale.set(1.04, 1.28, 1.04);
    tree.updateMatrix(); crowns.setMatrixAt(i, tree.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true; crowns.instanceMatrix.needsUpdate = true;
  stage.add(trunks, crowns);
  for (const x of [-74, -48, -22]) {
    box('Physical Street raised planter curb | photo reference; unmeasured', [20, .42, 3.4], [x, .23, -53], palette.concrete);
    box('Physical Street planter green | study', [19.6, .05, 3.1], [x, .48, -53], palette.foliage);
  }
  // Small rectangular ground graphics in irregular bands; photo confirms the
  // graphic language but not the precise number, size or GIS registration.
  const patches = new THREE.InstancedMesh(new THREE.BoxGeometry(.7, .014, .52), palette.parapet, 90);
  patches.name = 'Physical Street white ground dashes | illustrative layout';
  const dash = new THREE.Object3D();
  for (let i = 0; i < 90; i++) {
    const x = -88 + (i % 18) * 4.2;
    const n = 43 + Math.floor(i / 18) * 4.5 + (i % 3) * .45;
    dash.position.set(x, .11, -n); dash.updateMatrix(); patches.setMatrixAt(i, dash.matrix);
  }
  patches.instanceMatrix.needsUpdate = true; stage.add(patches);
  for (const x of [-73, -52, -31]) {
    box('Physical Street orange-red ground graphic | inferred placement', [2.2, .015, 17], [x, .11, -52], palette.stairStripe);
  }
}
export function makeExteriorStudy() {
  school(); arena(); stage.add(westConnectionStudy,roofEquipmentStudy,interiorStudy);
  return stage;
}
