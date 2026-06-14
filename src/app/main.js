import * as THREE from 'three';
import '../styles/main.css';
import { PHYSICS, TABLE } from '../config/constants.js';
import { PhysicsEngine } from '../engine/physics.js';
import {
  createShotRecord,
  evaluateShot,
  recordCueContact,
  recordPocket,
  recordRailContact,
} from '../rules/eight-ball.js';
import { createAimGuide } from '../rendering/aim-guide.js';
import { createBalls } from '../rendering/balls.js';
import { createScene } from '../rendering/scene.js';
import { createTable } from '../rendering/table.js';
import { dom, showFoul, showWinner, updateScoreboard, updateTurn } from '../ui/dom.js';

const world = createScene(dom.canvas);
createTable(world.scene);
const { balls, cueBall } = createBalls(world.scene);
const aimGuide = createAimGuide(world.scene);

let currentPlayer = 1;
let shotActive = false;
let gameOver = false;
let shot = createShotRecord();
let accumulator = 0;
let lastTime = performance.now();
let dragging = false;

const physics = new PhysicsEngine(balls, {
  onBallCollision: (a, b) => {
    if (shotActive) recordCueContact(shot, a, b);
  },
  onRailContact: () => {
    if (shotActive) recordRailContact(shot);
  },
  onPocket: (ball) => {
    if (shotActive) recordPocket(shot, ball.number);
  },
  onPocketComplete: () => updateScoreboard(balls),
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const intersection = new THREE.Vector3();
const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.24);
const aimDirection = new THREE.Vector2(1, 0);

function positionAimGuide() {
  aimGuide.position(cueBall, aimDirection, Number(dom.slider.value) / 100);
}

function updateAim(clientX, clientY) {
  if (shotActive || gameOver || !cueBall.active) return;
  const rect = world.renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, world.camera);
  if (!raycaster.ray.intersectPlane(tablePlane, intersection)) return;
  aimDirection.set(intersection.x - cueBall.mesh.position.x, intersection.z - cueBall.mesh.position.z);
  if (aimDirection.lengthSq() < 0.001) return;
  aimDirection.normalize();
  positionAimGuide();
}

function shoot() {
  if (shotActive || gameOver || !cueBall.active) return;
  const ownBallsRemaining = balls.some((ball) => ball.active && (
    currentPlayer === 1
      ? ball.number >= 1 && ball.number <= 7
      : ball.number >= 9 && ball.number <= 15
  ));
  shot = createShotRecord(!ownBallsRemaining);
  const speed = 3.2 + Number(dom.slider.value) / 100 * 8.8;
  cueBall.velocity.copy(aimDirection).multiplyScalar(speed);
  shotActive = true;
  aimGuide.group.visible = false;
  dom.shoot.disabled = true;
  updateTurn(currentPlayer, 'BALLS IN MOTION');
}

function findCueBallPosition() {
  const candidates = [];
  for (let x = -3.5; x <= -0.5; x += 0.35) {
    for (let z = -1.8; z <= 1.8; z += 0.35) candidates.push([x, z]);
  }
  return candidates.find(([x, z]) => balls.every((ball) => {
    if (!ball.active || ball.number === 0) return true;
    const dx = ball.mesh.position.x - x;
    const dz = ball.mesh.position.z - z;
    return dx * dx + dz * dz > (TABLE.ballRadius * 2.2) ** 2;
  })) ?? [-2.6, 0];
}

function respawnCueBall() {
  const [x, z] = findCueBallPosition();
  cueBall.active = true;
  cueBall.pocketing = false;
  cueBall.mesh.visible = true;
  cueBall.mesh.scale.setScalar(1);
  cueBall.mesh.position.set(x, TABLE.ballRadius + 0.1, z);
  cueBall.velocity.set(0, 0);
}

function endTurn() {
  shotActive = false;
  const result = evaluateShot({ shot, player: currentPlayer, balls });
  if (result.winner) {
    gameOver = true;
    dom.shoot.disabled = true;
    aimGuide.group.visible = false;
    if (result.foul) showFoul(result.foul);
    showWinner(result.winner);
    return;
  }

  if (result.foul) {
    showFoul(result.foul);
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    respawnCueBall();
    updateTurn(currentPlayer, 'BALL IN HAND');
  } else {
    if (!result.keepTurn) currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateTurn(currentPlayer);
  }

  aimGuide.group.visible = true;
  dom.shoot.disabled = false;
  positionAimGuide();
}

function resize() {
  world.resize(dom.wrap.clientWidth, dom.wrap.clientHeight);
}

function animate(now) {
  requestAnimationFrame(animate);
  const frameTime = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  accumulator += frameTime;
  while (accumulator >= PHYSICS.fixedStep) {
    physics.step(PHYSICS.fixedStep);
    accumulator -= PHYSICS.fixedStep;
  }
  if (shotActive && physics.isSettled()) endTurn();
  world.renderer.render(world.scene, world.camera);
}

function resetGame() {
  window.location.reload();
}

dom.slider.addEventListener('input', () => {
  const value = dom.slider.value;
  dom.powerValue.textContent = `${value}%`;
  dom.slider.style.background = `linear-gradient(90deg, var(--gold) ${value}%, #26342e ${value}%)`;
  positionAimGuide();
});
dom.shoot.addEventListener('click', shoot);
dom.reset.addEventListener('click', resetGame);
dom.playAgain.addEventListener('click', resetGame);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    shoot();
  }
});
world.renderer.domElement.addEventListener('pointerdown', (event) => {
  dragging = true;
  world.renderer.domElement.setPointerCapture(event.pointerId);
  updateAim(event.clientX, event.clientY);
});
world.renderer.domElement.addEventListener('pointermove', (event) => updateAim(event.clientX, event.clientY));
world.renderer.domElement.addEventListener('pointerup', (event) => {
  if (dragging && event.pointerType === 'touch') shoot();
  dragging = false;
});
window.addEventListener('resize', resize);

resize();
positionAimGuide();
updateTurn(currentPlayer);
updateScoreboard(balls);
requestAnimationFrame(animate);
