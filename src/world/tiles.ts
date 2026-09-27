import * as THREE from 'three';
import { tileExtent } from '../geo/coordinates';
// Existing user-supplied files are JPEG bytes with .png suffix. No copied assets.
// OFF by default; fetch only on explicit opt-in while provenance/reuse terms are checked.
import westUrl from '../../z18_232811_103095.png?url';
import eastUrl from '../../z18_232812_103095.png?url';

export function createTiles(scene: THREE.Scene) {
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();
  let loaded = false;
  group.visible = false;
  scene.add(group);
  function setEnabled(enabled: boolean) {
    if (enabled && !loaded) {
      loaded = true;
      ([[232811, westUrl], [232812, eastUrl]] as const).forEach(([x, url]) => {
        const t = tileExtent(18, x, 103095);
        const texture = loader.load(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(t.east - t.west, t.north - t.south),
          new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.90, depthWrite: false, side: THREE.DoubleSide }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set((t.east + t.west) / 2, 0.055, -(t.north + t.south) / 2);
        mesh.renderOrder = 2;
        group.add(mesh);
      });
    }
    group.visible = enabled;
  }
  return { group, setEnabled };
}
