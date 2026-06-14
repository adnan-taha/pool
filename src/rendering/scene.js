import * as THREE from 'three';

export function createScene(canvasHost) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07110e);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 8.5, 8.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  canvasHost.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe9f4ed, 0x142218, 2.35));
  const keyLight = new THREE.DirectionalLight(0xfff3d6, 4.4);
  keyLight.position.set(-2, 8, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  Object.assign(keyLight.shadow.camera, { left: -7, right: 7, top: 5, bottom: -5 });
  scene.add(keyLight);

  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  return { scene, camera, renderer, resize };
}
