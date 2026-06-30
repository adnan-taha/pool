import * as THREE from 'three';

export function createAimGuide(scene) {
  // One group keeps the line, prediction, marker, and cue in the same local frame.
  const group = new THREE.Group();
  scene.add(group);

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(3.6, 0, 0)]),
    new THREE.LineDashedMaterial({ color: 0xf6ebcc, dashSize: 0.13, gapSize: 0.09, transparent: true, opacity: 0.72 }),
  );
  line.computeLineDistances();
  group.add(line);

  const preview = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0.8, 0, 0)]),
    new THREE.LineBasicMaterial({ color: 0x69d6ff, transparent: true, opacity: 0.62 }),
  );
  preview.position.y = 0.012;
  group.add(preview);

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.18, 28),
    new THREE.MeshBasicMaterial({ color: 0x69d6ff, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.02;
  group.add(marker);

  const cue = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.045, 4.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xc79554, roughness: 0.35 }),
  );
  cue.rotation.z = Math.PI / 2;
  cue.position.y = 0.05;
  group.add(cue);

  function setLineLength(target, distance) {
    // Rebuild the two-point geometry to match the latest predicted distance.
    target.geometry.dispose();
    target.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(distance, 0, 0),
    ]);
    target.computeLineDistances?.();
  }

  function position(cueBall, direction, power, aimPreview) {
    // Rotate local +X onto the shot direction and pull the cue back with power.
    group.position.copy(cueBall.mesh.position);
    group.position.y += 0.04;
    group.rotation.y = -Math.atan2(direction.y, direction.x);
    cue.position.x = -2.28 - power * 0.6;
    setLineLength(line, aimPreview?.primaryDistance ?? 3.6);
    marker.visible = Boolean(aimPreview?.primaryDistance);
    preview.visible = Boolean(aimPreview?.secondaryDistance);
    if (aimPreview?.primaryDistance) marker.position.x = aimPreview.primaryDistance;
    if (aimPreview?.secondaryDistance) {
      preview.position.x = aimPreview.secondaryStartX ?? aimPreview.primaryDistance;
      preview.position.z = aimPreview.secondaryStartZ ?? 0;
      preview.rotation.y = -aimPreview.secondaryAngle;
      setLineLength(preview, aimPreview.secondaryDistance);
    }
  }

  return { group, position };
}
