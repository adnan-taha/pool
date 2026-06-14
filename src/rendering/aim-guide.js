import * as THREE from 'three';

export function createAimGuide(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(3.6, 0, 0)]),
    new THREE.LineDashedMaterial({ color: 0xf6ebcc, dashSize: 0.13, gapSize: 0.09, transparent: true, opacity: 0.72 }),
  );
  line.computeLineDistances();
  group.add(line);

  const cue = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.045, 4.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xc79554, roughness: 0.35 }),
  );
  cue.rotation.z = Math.PI / 2;
  cue.position.y = 0.05;
  group.add(cue);

  function position(cueBall, direction, power) {
    group.position.copy(cueBall.mesh.position);
    group.position.y += 0.04;
    group.rotation.y = -Math.atan2(direction.y, direction.x);
    cue.position.x = -2.28 - power * 0.6;
  }

  return { group, position };
}
