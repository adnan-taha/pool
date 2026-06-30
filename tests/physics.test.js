import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { applyCueStrike, getContactSlip, PhysicsEngine } from '../src/engine/physics.js';

function createBall(x = 0, z = 0) {
  const mesh = new THREE.Object3D();
  mesh.position.set(x, 0.24, z);
  return {
    number: 0,
    mesh,
    velocity: new THREE.Vector2(),
    angularVelocity: new THREE.Vector3(),
    active: true,
    pocketing: false,
  };
}

test('a centered cue strike starts with linear sliding velocity', () => {
  const ball = createBall();
  applyCueStrike(ball, new THREE.Vector2(1, 0), 6);
  assert.equal(ball.velocity.x, 6);
  assert.equal(ball.angularVelocity.lengthSq(), 0);
  assert.equal(getContactSlip(ball).x, 6);
});

test('vertical cue offset creates follow or draw spin', () => {
  const follow = createBall();
  const draw = createBall();
  applyCueStrike(follow, new THREE.Vector2(1, 0), 6, { x: 0, y: 1 });
  applyCueStrike(draw, new THREE.Vector2(1, 0), 6, { x: 0, y: -1 });
  assert.ok(follow.angularVelocity.z < 0);
  assert.ok(draw.angularVelocity.z > 0);
});

test('horizontal cue offset creates side spin', () => {
  const ball = createBall();
  applyCueStrike(ball, new THREE.Vector2(1, 0), 6, { x: 0.7, y: 0 });
  assert.ok(ball.angularVelocity.y > 0);
});

test('sliding friction reduces contact-point slip toward rolling', () => {
  const ball = createBall();
  ball.velocity.set(5, 0);
  const engine = new PhysicsEngine([ball]);
  const initialSlip = getContactSlip(ball).length();
  engine.step(1 / 120);
  assert.ok(getContactSlip(ball).length() < initialSlip);
  assert.ok(ball.angularVelocity.z < 0);
});

test('cloth friction decays vertical-axis spin', () => {
  const ball = createBall();
  ball.angularVelocity.y = 10;
  const engine = new PhysicsEngine([ball]);
  engine.step(1 / 120);
  assert.ok(ball.angularVelocity.y > 0);
  assert.ok(ball.angularVelocity.y < 10);
});

test('remaining spin does not delay the end of a turn', () => {
  const ball = createBall();
  ball.angularVelocity.y = 10;
  const engine = new PhysicsEngine([ball]);
  assert.equal(engine.isSettled(), true);
});

test('frictionless ball collision does not transfer angular velocity', () => {
  const first = createBall(0, 0);
  const second = createBall(0.27, 0);
  first.velocity.set(2, 0);
  first.angularVelocity.set(1, 2, 3);
  second.angularVelocity.set(4, 5, 6);
  const engine = new PhysicsEngine([first, second]);
  engine.resolveCollision(first, second);
  assert.deepEqual(first.angularVelocity.toArray(), [1, 2, 3]);
  assert.deepEqual(second.angularVelocity.toArray(), [4, 5, 6]);
});
