import * as THREE from 'three';
import '../styles/main.css';
import { PHYSICS, TABLE } from '../config/constants.js';
import { applyCueStrike, PhysicsEngine } from '../engine/physics.js';
import {
  createShotRecord,
  evaluateShot,
  getBallGroup,
  recordCueContact,
  recordPocket,
  recordBallRailContact,
} from '../rules/eight-ball.js';
import { createAimGuide } from '../rendering/aim-guide.js';
import { createBalls } from '../rendering/balls.js';
import { createScene } from '../rendering/scene.js';
import { createTable } from '../rendering/table.js';
import {
  bindPlayerNames,
  dom,
  loadPlayerState,
  savePlayerState,
  showFoul,
  showWinner,
  updateScoreboard,
  updateTurn,
} from '../ui/dom.js';

// Build the Three.js world and create the persistent game objects once.
const world = createScene(dom.canvas);
createTable(world.scene);
const { balls, cueBall } = createBalls(world.scene);
const aimGuide = createAimGuide(world.scene);

let currentPlayer = 1;
let groups = { 1: null, 2: null };
let breakComplete = false;
let shotActive = false;
let gameOver = false;
let placingCueBall = false;
let shot = createShotRecord();
let accumulator = 0;
let lastTime = performance.now();
let dragging = false;
let spinDragging = false;
const playerState = loadPlayerState();
const cueSpin = new THREE.Vector2();

// Physics events feed the rule tracker and scoreboard without coupling either module.
const physics = new PhysicsEngine(balls, {
  onBallCollision: (a, b) => {
    if (shotActive) recordCueContact(shot, a, b);
  },
  onRailContact: (ball) => {
    if (shotActive) recordBallRailContact(shot, ball.number);
  },
  onPocket: (ball) => {
    if (shotActive) recordPocket(shot, ball.number);
  },
  onPocketComplete: () => updateScoreboard(balls, groups, playerState),
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const intersection = new THREE.Vector3();
const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.24);
const aimDirection = new THREE.Vector2(1, 0);

// Translate rule state into the short status shown above the table.
function getTurnStatus() {
  if (!breakComplete) return 'BREAK';
  if (!groups[currentPlayer]) return 'OPEN TABLE';
  return 'YOUR SHOT';
}

function hasPlayerGroupBalls(player) {
  const group = groups[player];
  if (!group) return false;
  return balls.some((ball) => ball.active && getBallGroup(ball.number) === group);
}

function getTablePoint(clientX, clientY) {
  // Ray-plane intersection converts a screen pointer into table coordinates.
  const rect = world.renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, world.camera);
  if (!raycaster.ray.intersectPlane(tablePlane, intersection)) return null;
  return intersection;
}

function isLegalCueBallPosition(x, z) {
  // Ball-in-hand placement must stay inside the rails and avoid ball overlap.
  const xLimit = TABLE.width / 2 - TABLE.ballRadius;
  const zLimit = TABLE.height / 2 - TABLE.ballRadius;
  if (Math.abs(x) > xLimit || Math.abs(z) > zLimit) return false;
  return balls.every((ball) => {
    if (!ball.active || ball.number === 0) return true;
    const dx = ball.mesh.position.x - x;
    const dz = ball.mesh.position.z - z;
    return dx * dx + dz * dz > (TABLE.ballRadius * 2.08) ** 2;
  });
}

function moveCueBallToPointer(clientX, clientY) {
  const point = getTablePoint(clientX, clientY);
  if (!point) return false;
  const xLimit = TABLE.width / 2 - TABLE.ballRadius;
  const zLimit = TABLE.height / 2 - TABLE.ballRadius;
  const x = THREE.MathUtils.clamp(point.x, -xLimit, xLimit);
  const z = THREE.MathUtils.clamp(point.z, -zLimit, zLimit);
  if (!isLegalCueBallPosition(x, z)) return false;
  cueBall.mesh.position.set(x, TABLE.ballRadius + 0.1, z);
  cueBall.velocity.set(0, 0);
  return true;
}

function getAimPreview() {
  // Ray-circle intersection predicts the cue ball's first object-ball contact.
  const origin = cueBall.mesh.position;
  let bestDistance = Infinity;
  let secondaryDistance = 0;
  let secondaryAngle = 0;
  let secondaryStartX = 0;
  let secondaryStartZ = 0;

  for (const ball of balls) {
    if (!ball.active || ball.number === 0) continue;
    const dx = ball.mesh.position.x - origin.x;
    const dz = ball.mesh.position.z - origin.z;
    const along = dx * aimDirection.x + dz * aimDirection.y;
    if (along <= TABLE.ballRadius * 2 || along >= bestDistance) continue;
    const perpendicularSq = dx * dx + dz * dz - along * along;
    const hitRadius = TABLE.ballRadius * 2;
    if (perpendicularSq > hitRadius * hitRadius) continue;
    const hitDistance = Math.max(0.25, along - Math.sqrt(hitRadius * hitRadius - perpendicularSq));
    bestDistance = hitDistance;
    const cueImpactX = origin.x + aimDirection.x * hitDistance;
    const cueImpactZ = origin.z + aimDirection.y * hitDistance;
    const objectDirection = new THREE.Vector2(
      ball.mesh.position.x - cueImpactX,
      ball.mesh.position.z - cueImpactZ,
    ).normalize();
    secondaryDistance = 0.9;
    secondaryAngle = Math.atan2(objectDirection.y, objectDirection.x) - Math.atan2(aimDirection.y, aimDirection.x);
    secondaryStartX = along;
    secondaryStartZ = -dx * aimDirection.y + dz * aimDirection.x;
  }

  // Ray-boundary intersection predicts the first cushion contact and reflection.
  const xLimit = TABLE.width / 2 - TABLE.ballRadius;
  const zLimit = TABLE.height / 2 - TABLE.ballRadius;
  const railDistances = [];
  if (aimDirection.x > 0) railDistances.push((xLimit - origin.x) / aimDirection.x);
  if (aimDirection.x < 0) railDistances.push((-xLimit - origin.x) / aimDirection.x);
  if (aimDirection.y > 0) railDistances.push((zLimit - origin.z) / aimDirection.y);
  if (aimDirection.y < 0) railDistances.push((-zLimit - origin.z) / aimDirection.y);
  const railDistance = Math.min(...railDistances.filter((distance) => distance > 0));
  if (railDistance < bestDistance) {
    bestDistance = railDistance;
    const hitX = origin.x + aimDirection.x * railDistance;
    const hitZ = origin.z + aimDirection.y * railDistance;
    const reflected = aimDirection.clone();
    if (Math.abs(Math.abs(hitX) - xLimit) < 0.03) reflected.x *= -1;
    if (Math.abs(Math.abs(hitZ) - zLimit) < 0.03) reflected.y *= -1;
    secondaryDistance = 0.9;
    secondaryAngle = Math.atan2(reflected.y, reflected.x) - Math.atan2(aimDirection.y, aimDirection.x);
    secondaryStartX = bestDistance;
    secondaryStartZ = 0;
  }

  return { primaryDistance: bestDistance, secondaryDistance, secondaryAngle, secondaryStartX, secondaryStartZ };
}

function positionAimGuide() {
  aimGuide.position(cueBall, aimDirection, Number(dom.slider.value) / 100, getAimPreview());
}

function updateAim(clientX, clientY) {
  // The normalized vector from cue ball to pointer is the shot direction.
  if (shotActive || gameOver || placingCueBall || !cueBall.active) return;
  const point = getTablePoint(clientX, clientY);
  if (!point) return;
  aimDirection.set(point.x - cueBall.mesh.position.x, point.z - cueBall.mesh.position.z);
  if (aimDirection.lengthSq() < 0.001) return;
  aimDirection.normalize();
  positionAimGuide();
}

function shoot() {
  // Create the rule record first, then apply the cue's linear impulse and torque.
  if (shotActive || gameOver || placingCueBall || !cueBall.active) return;
  shot = createShotRecord({
    mustHitEight: groups[currentPlayer] !== null && !hasPlayerGroupBalls(currentPlayer),
    isBreak: !breakComplete,
  });
  const speed = 3.2 + Number(dom.slider.value) / 100 * 8.8;
  applyCueStrike(cueBall, aimDirection, speed, { x: cueSpin.x, y: cueSpin.y });
  resetSpinControl();
  shotActive = true;
  aimGuide.group.visible = false;
  dom.shoot.disabled = true;
  updateTurn(currentPlayer, 'BALLS IN MOTION', playerState.names);
}

function findCueBallPosition() {
  // Search deterministic free positions for the initial ball-in-hand location.
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
  cueBall.angularVelocity.set(0, 0, 0);
}

function beginCuePlacement() {
  // A foul blocks shooting until the incoming player confirms a legal position.
  placingCueBall = true;
  respawnCueBall();
  dom.shoot.disabled = true;
  aimGuide.group.visible = false;
  updateTurn(currentPlayer, 'PLACE CUE BALL', playerState.names);
}

function finishCuePlacement() {
  if (!placingCueBall) return;
  placingCueBall = false;
  dom.shoot.disabled = false;
  aimGuide.group.visible = true;
  updateTurn(currentPlayer, getTurnStatus(), playerState.names);
  positionAimGuide();
}

function endTurn() {
  // Rules consume the completed shot and return all state transitions in one result.
  shotActive = false;
  const result = evaluateShot({ shot, player: currentPlayer, balls, groups });
  groups = result.groups;
  if (result.breakComplete) breakComplete = true;
  updateScoreboard(balls, groups, playerState);
  if (result.winner) {
    gameOver = true;
    dom.shoot.disabled = true;
    aimGuide.group.visible = false;
    playerState.wins[result.winner] += 1;
    savePlayerState(playerState);
    updateScoreboard(balls, groups, playerState);
    if (result.foul) showFoul(result.foul);
    showWinner(result.winner, playerState.names);
    return;
  }

  if (result.foul) {
    showFoul(result.foul);
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    beginCuePlacement();
    return;
  } else {
    if (!result.keepTurn) currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateTurn(currentPlayer, getTurnStatus(), playerState.names);
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
  // A fixed timestep keeps collision and friction behavior independent of frame rate.
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

function updatePowerControl() {
  // Normalize the range because its minimum is 15 rather than zero.
  const value = Number(dom.slider.value);
  const min = Number(dom.slider.min);
  const max = Number(dom.slider.max);
  const progress = ((value - min) / (max - min)) * 100;
  dom.powerValue.textContent = `${value}%`;
  dom.slider.style.background = `linear-gradient(90deg, var(--gold) ${progress}%, #26342e ${progress}%)`;
}

function adjustPower(delta) {
  const min = Number(dom.slider.min);
  const max = Number(dom.slider.max);
  const nextValue = THREE.MathUtils.clamp(Number(dom.slider.value) + delta, min, max);
  dom.slider.value = nextValue;
  updatePowerControl();
  positionAimGuide();
}

function spinLabel() {
  const parts = [];
  if (cueSpin.y > 0.18) parts.push('FOLLOW');
  else if (cueSpin.y < -0.18) parts.push('DRAW');
  if (cueSpin.x > 0.18) parts.push('RIGHT');
  else if (cueSpin.x < -0.18) parts.push('LEFT');
  return parts.join(' + ') || 'CENTER';
}

function updateSpinControl() {
  // Map normalized cue offsets to the marker's circular control area.
  dom.spinMarker.style.left = `${50 + cueSpin.x * 38}%`;
  dom.spinMarker.style.top = `${50 - cueSpin.y * 38}%`;
  dom.spinValue.textContent = spinLabel();
  dom.spinPad.setAttribute('aria-valuetext', spinLabel());
}

function setSpin(x, y) {
  // Clamp cue contact to the face of the ball to prevent impossible offsets.
  cueSpin.set(x, y);
  if (cueSpin.lengthSq() > 1) cueSpin.normalize();
  updateSpinControl();
}

function setSpinFromPointer(clientX, clientY) {
  const rect = dom.spinPad.getBoundingClientRect();
  const radius = Math.min(rect.width, rect.height) / 2;
  setSpin(
    (clientX - (rect.left + rect.width / 2)) / radius,
    -((clientY - (rect.top + rect.height / 2)) / radius),
  );
}

function resetSpinControl() {
  setSpin(0, 0);
}

dom.slider.addEventListener('input', () => {
  updatePowerControl();
  positionAimGuide();
});
dom.shoot.addEventListener('click', shoot);
dom.reset.addEventListener('click', resetGame);
dom.playAgain.addEventListener('click', resetGame);
dom.spinReset.addEventListener('click', resetSpinControl);
dom.spinPad.addEventListener('pointerdown', (event) => {
  spinDragging = true;
  dom.spinPad.setPointerCapture(event.pointerId);
  setSpinFromPointer(event.clientX, event.clientY);
});
dom.spinPad.addEventListener('pointermove', (event) => {
  if (spinDragging) setSpinFromPointer(event.clientX, event.clientY);
});
dom.spinPad.addEventListener('pointerup', (event) => {
  setSpinFromPointer(event.clientX, event.clientY);
  spinDragging = false;
});
window.addEventListener('keydown', (event) => {
  if (event.target === dom.spinPad) {
    const step = event.shiftKey ? 0.2 : 0.1;
    if (event.code === 'ArrowUp') setSpin(cueSpin.x, cueSpin.y + step);
    else if (event.code === 'ArrowDown') setSpin(cueSpin.x, cueSpin.y - step);
    else if (event.code === 'ArrowLeft') setSpin(cueSpin.x - step, cueSpin.y);
    else if (event.code === 'ArrowRight') setSpin(cueSpin.x + step, cueSpin.y);
    else if (event.code === 'Home') resetSpinControl();
    else return;
    event.preventDefault();
    return;
  }
  if (event.target instanceof HTMLInputElement && event.target !== dom.slider) return;
  if (event.code === 'Space') {
    event.preventDefault();
    shoot();
  } else if (event.code === 'ArrowUp' || event.code === 'ArrowRight' || event.code === 'Equal') {
    event.preventDefault();
    adjustPower(event.shiftKey ? 10 : 5);
  } else if (event.code === 'ArrowDown' || event.code === 'ArrowLeft' || event.code === 'Minus') {
    event.preventDefault();
    adjustPower(event.shiftKey ? -10 : -5);
  }
});
world.renderer.domElement.addEventListener('pointerdown', (event) => {
  dragging = true;
  world.renderer.domElement.setPointerCapture(event.pointerId);
  if (placingCueBall) {
    moveCueBallToPointer(event.clientX, event.clientY);
    return;
  }
  updateAim(event.clientX, event.clientY);
});
world.renderer.domElement.addEventListener('pointermove', (event) => {
  if (placingCueBall && dragging) {
    moveCueBallToPointer(event.clientX, event.clientY);
    return;
  }
  updateAim(event.clientX, event.clientY);
});
world.renderer.domElement.addEventListener('pointerup', (event) => {
  if (placingCueBall) {
    moveCueBallToPointer(event.clientX, event.clientY);
    finishCuePlacement();
    dragging = false;
    return;
  }
  if (dragging && event.pointerType === 'touch') shoot();
  dragging = false;
});
window.addEventListener('resize', resize);

resize();
bindPlayerNames(playerState, () => {
  updateTurn(currentPlayer, placingCueBall ? 'PLACE CUE BALL' : getTurnStatus(), playerState.names);
  updateScoreboard(balls, groups, playerState);
});
updatePowerControl();
updateSpinControl();
positionAimGuide();
updateTurn(currentPlayer, getTurnStatus(), playerState.names);
updateScoreboard(balls, groups, playerState);
requestAnimationFrame(animate);
