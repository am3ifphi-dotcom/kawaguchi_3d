/** WGS84 local tangent approximation in metres, for locating supplied z/x/y tiles.
 * For cadastral/architectural control use a surveyed tie point and EPSG:6677 instead.
 */
export const ORIGIN = { lat: 35.8261337, lon: 139.7191328 } as const;
const toRad = Math.PI / 180;
const phi = ORIGIN.lat * toRad;
const sin = Math.sin(phi);
const a = 6378137; // WGS84 semi-major axis (m)
const e2 = 6.69437999014e-3;
const n = a / Math.sqrt(1 - e2 * sin * sin);
const m = a * (1 - e2) / (1 - e2 * sin * sin) ** 1.5;
export function lonLatToEastNorth(lon: number, lat: number): [number, number] {
  return [(lon - ORIGIN.lon) * toRad * n * Math.cos(phi), (lat - ORIGIN.lat) * toRad * m];
}
export function tileExtent(z: number, x: number, y: number) {
  const lon = (col: number) => col / 2 ** z * 360 - 180;
  const lat = (row: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * row / 2 ** z))) / toRad;
  const [west, north] = lonLatToEastNorth(lon(x), lat(y));
  const [east, south] = lonLatToEastNorth(lon(x + 1), lat(y + 1));
  return { west, east, north, south };
}
