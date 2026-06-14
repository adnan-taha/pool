import * as THREE from 'three';
import { POCKET_POSITIONS, TABLE } from '../config/constants.js';

export function createTable(scene) {
  const group = new THREE.Group();
  scene.add(group);

  function box(width, height, depth, color, x, y, z, roughness = 0.6) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  box(TABLE.width + 1.18, 0.32, TABLE.height + 1.18, 0x3a1d0e, 0, -0.25, 0, 0.48);
  box(TABLE.width + 0.45, 0.18, TABLE.height + 0.45, 0x8b4e20, 0, -0.04, 0, 0.38);
  box(TABLE.width, 0.12, TABLE.height, 0x08704e, 0, 0.02, 0, 0.95);

  const longRail = TABLE.width + 0.65;
  const shortRail = TABLE.height - 0.45;
  box(longRail, 0.3, TABLE.rail, 0x593017, 0, 0.13, TABLE.height / 2 + 0.28, 0.34);
  box(longRail, 0.3, TABLE.rail, 0x593017, 0, 0.13, -TABLE.height / 2 - 0.28, 0.34);
  box(TABLE.rail, 0.3, shortRail, 0x593017, TABLE.width / 2 + 0.28, 0.13, 0, 0.34);
  box(TABLE.rail, 0.3, shortRail, 0x593017, -TABLE.width / 2 - 0.28, 0.13, 0, 0.34);

  box(TABLE.width - 0.45, 0.16, 0.15, 0x095d41, 0, 0.17, TABLE.height / 2 + 0.02, 0.8);
  box(TABLE.width - 0.45, 0.16, 0.15, 0x095d41, 0, 0.17, -TABLE.height / 2 - 0.02, 0.8);
  box(0.15, 0.16, TABLE.height - 0.45, 0x095d41, TABLE.width / 2 + 0.02, 0.17, 0, 0.8);
  box(0.15, 0.16, TABLE.height - 0.45, 0x095d41, -TABLE.width / 2 - 0.02, 0.17, 0, 0.8);

  const pocketGeometry = new THREE.CylinderGeometry(TABLE.pocketRadius, TABLE.pocketRadius * 1.12, 0.11, 32);
  const pocketMaterial = new THREE.MeshStandardMaterial({ color: 0x040604, roughness: 1 });
  for (const [x, z] of POCKET_POSITIONS) {
    const pocket = new THREE.Mesh(pocketGeometry, pocketMaterial);
    pocket.position.set(x, 0.11, z);
    group.add(pocket);
  }

  const diamondMaterial = new THREE.MeshStandardMaterial({ color: 0xe8d8b4, roughness: 0.35 });
  const diamondGeometry = new THREE.BoxGeometry(0.07, 0.025, 0.07);
  for (const x of [-3.75, -2.5, -1.25, 1.25, 2.5, 3.75]) {
    for (const z of [-TABLE.height / 2 - 0.43, TABLE.height / 2 + 0.43]) {
      const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial);
      diamond.position.set(x, 0.31, z);
      diamond.rotation.y = Math.PI / 4;
      group.add(diamond);
    }
  }

  return group;
}
