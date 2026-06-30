import * as THREE from 'three';
import { BALL_COLORS, TABLE } from '../config/constants.js';

const RACK_NUMBERS = [1, 10, 3, 5, 8, 12, 14, 2, 7, 15, 9, 6, 4, 11, 13];

// Paint each numbered solid/stripe onto a canvas used as a sphere texture.
function createNumberTexture(number, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const striped = number > 8;
  ctx.fillStyle = striped ? '#f4efe3' : `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 256, 128);
  if (striped) {
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 33, 256, 62);
  }
  if (number > 0) {
    ctx.fillStyle = '#f5f0e6';
    ctx.beginPath();
    ctx.arc(128, 64, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#151515';
    ctx.font = '700 31px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), 128, 66);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBalls(scene) {
  // Reuse one sphere geometry; each ball gets its own numbered material and state.
  const geometry = new THREE.SphereGeometry(TABLE.ballRadius, 32, 24);
  const balls = [];

  function addBall(number, x, z) {
    const color = number === 0 ? 0xf4efe3 : BALL_COLORS[number - 1];
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ map: createNumberTexture(number, color), roughness: 0.23, metalness: 0.02 }),
    );
    mesh.position.set(x, TABLE.ballRadius + 0.1, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const ball = {
      number,
      mesh,
      velocity: new THREE.Vector2(),
      angularVelocity: new THREE.Vector3(),
      active: true,
      pocketing: false,
    };
    balls.push(ball);
    return ball;
  }

  // Place the cue ball and build the standard five-row triangular rack.
  const cueBall = addBall(0, -2.6, 0);
  const spacing = TABLE.ballRadius * 2.04;
  let rackIndex = 0;
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      addBall(RACK_NUMBERS[rackIndex], 2.05 + row * spacing * 0.87, (column - row / 2) * spacing);
      rackIndex += 1;
    }
  }

  return { balls, cueBall };
}
