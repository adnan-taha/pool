import * as THREE from 'three';
import { PHYSICS, POCKET_POSITIONS, TABLE } from '../config/constants.js';

export class PhysicsEngine {
  constructor(balls, events = {}) {
    this.balls = balls;
    this.events = events;
  }

  step(dt) {
    for (const ball of this.balls) this.updateBall(ball, dt);
    for (let i = 0; i < this.balls.length; i += 1) {
      if (!this.balls[i].active || this.balls[i].pocketing) continue;
      for (let j = i + 1; j < this.balls.length; j += 1) {
        if (this.balls[j].active && !this.balls[j].pocketing) this.resolveCollision(this.balls[i], this.balls[j]);
      }
    }
  }

  isSettled() {
    return !this.balls.some((ball) => ball.pocketing)
      && this.balls.every((ball) => !ball.active || ball.velocity.lengthSq() === 0);
  }

  resolveCollision(a, b) {
    const dx = b.mesh.position.x - a.mesh.position.x;
    const dz = b.mesh.position.z - a.mesh.position.z;
    const minDistance = TABLE.ballRadius * 2;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq >= minDistance * minDistance || distanceSq === 0) return;

    const distance = Math.sqrt(distanceSq);
    const nx = dx / distance;
    const nz = dz / distance;
    const overlap = minDistance - distance;
    a.mesh.position.x -= nx * overlap * 0.5;
    a.mesh.position.z -= nz * overlap * 0.5;
    b.mesh.position.x += nx * overlap * 0.5;
    b.mesh.position.z += nz * overlap * 0.5;

    const relativeSpeed = (b.velocity.x - a.velocity.x) * nx + (b.velocity.y - a.velocity.y) * nz;
    if (relativeSpeed >= 0) return;
    const impulse = -(1 + PHYSICS.ballRestitution) * relativeSpeed / 2;
    a.velocity.x -= impulse * nx;
    a.velocity.y -= impulse * nz;
    b.velocity.x += impulse * nx;
    b.velocity.y += impulse * nz;
    this.events.onBallCollision?.(a, b);
  }

  updateBall(ball, dt) {
    if (!ball.active || ball.pocketing) return;
    ball.mesh.position.x += ball.velocity.x * dt;
    ball.mesh.position.z += ball.velocity.y * dt;

    const speed = ball.velocity.length();
    if (speed > 0) {
      const nextSpeed = Math.max(0, speed - PHYSICS.rollingDeceleration * dt);
      ball.velocity.multiplyScalar(nextSpeed / speed);
      const axis = new THREE.Vector3(ball.velocity.y, 0, -ball.velocity.x).normalize();
      ball.mesh.rotateOnWorldAxis(axis, speed * dt / TABLE.ballRadius);
    }
    if (ball.velocity.length() < PHYSICS.stopSpeed) ball.velocity.set(0, 0);
    if (this.checkPocket(ball)) return;

    const xLimit = TABLE.width / 2 - TABLE.ballRadius;
    const zLimit = TABLE.height / 2 - TABLE.ballRadius;
    let hitRail = false;
    if (ball.mesh.position.x > xLimit) {
      ball.mesh.position.x = xLimit;
      ball.velocity.x = -Math.abs(ball.velocity.x) * PHYSICS.cushionRestitution;
      hitRail = true;
    } else if (ball.mesh.position.x < -xLimit) {
      ball.mesh.position.x = -xLimit;
      ball.velocity.x = Math.abs(ball.velocity.x) * PHYSICS.cushionRestitution;
      hitRail = true;
    }
    if (ball.mesh.position.z > zLimit) {
      ball.mesh.position.z = zLimit;
      ball.velocity.y = -Math.abs(ball.velocity.y) * PHYSICS.cushionRestitution;
      hitRail = true;
    } else if (ball.mesh.position.z < -zLimit) {
      ball.mesh.position.z = -zLimit;
      ball.velocity.y = Math.abs(ball.velocity.y) * PHYSICS.cushionRestitution;
      hitRail = true;
    }
    if (hitRail) this.events.onRailContact?.(ball);
  }

  checkPocket(ball) {
    for (const [x, z] of POCKET_POSITIONS) {
      const dx = ball.mesh.position.x - x;
      const dz = ball.mesh.position.z - z;
      if (dx * dx + dz * dz < TABLE.pocketRadius * TABLE.pocketRadius * 1.28) {
        this.pocketBall(ball, x, z);
        return true;
      }
    }
    return false;
  }

  pocketBall(ball, pocketX, pocketZ) {
    if (ball.pocketing) return;
    ball.pocketing = true;
    ball.velocity.set(0, 0);
    this.events.onPocket?.(ball);
    const start = ball.mesh.position.clone();
    const startTime = performance.now();
    const animate = (now) => {
      const t = Math.min((now - startTime) / 220, 1);
      ball.mesh.position.x = THREE.MathUtils.lerp(start.x, pocketX, t);
      ball.mesh.position.z = THREE.MathUtils.lerp(start.z, pocketZ, t);
      ball.mesh.position.y = THREE.MathUtils.lerp(start.y, -0.22, t);
      ball.mesh.scale.setScalar(1 - t * 0.45);
      if (t < 1) requestAnimationFrame(animate);
      else {
        ball.active = false;
        ball.mesh.visible = false;
        ball.pocketing = false;
        this.events.onPocketComplete?.(ball);
      }
    };
    requestAnimationFrame(animate);
  }
}
