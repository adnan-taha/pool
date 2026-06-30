import * as THREE from 'three';
import { PHYSICS, POCKET_POSITIONS, TABLE } from '../config/constants.js';

// Older ball data is upgraded lazily so every calculation can assume spin exists.
function angularVelocityOf(ball) {
  if (!ball.angularVelocity) ball.angularVelocity = new THREE.Vector3();
  return ball.angularVelocity;
}

// Rigid-body contact velocity: v_contact = v_center + omega x r.
export function getContactSlip(ball) {
  const angularVelocity = angularVelocityOf(ball);
  return new THREE.Vector2(
    ball.velocity.x + angularVelocity.z * TABLE.ballRadius,
    ball.velocity.y - angularVelocity.x * TABLE.ballRadius,
  );
}

// Cue impulse sets linear momentum; an off-center hit adds torque and angular velocity.
export function applyCueStrike(ball, direction, speed, spin = { x: 0, y: 0 }) {
  const shotDirection = direction.clone().normalize();
  const angularVelocity = angularVelocityOf(ball);
  ball.velocity.copy(shotDirection).multiplyScalar(speed);

  const spinRate = speed / TABLE.ballRadius * PHYSICS.cueSpinScale;
  angularVelocity.set(
    shotDirection.y * spin.y * spinRate,
    spin.x * spinRate,
    -shotDirection.x * spin.y * spinRate,
  );
}

export class PhysicsEngine {
  constructor(balls, events = {}) {
    this.balls = balls;
    this.events = events;
  }

  step(dt) {
    // Semi-implicit fixed-step simulation: integrate motion, then resolve contacts.
    for (const ball of this.balls) this.updateBall(ball, dt);
    for (let i = 0; i < this.balls.length; i += 1) {
      if (!this.balls[i].active || this.balls[i].pocketing) continue;
      for (let j = i + 1; j < this.balls.length; j += 1) {
        if (this.balls[j].active && !this.balls[j].pocketing) this.resolveCollision(this.balls[i], this.balls[j]);
      }
    }
  }

  isSettled() {
    // Turns depend on visible translation, not harmless spin around a fixed center.
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

    // Conservation of momentum with Newton's restitution law along the contact normal.
    // The contact is frictionless, so tangential velocity and spin are unchanged.
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
    // Linear kinematics: r(t + dt) = r(t) + v dt.
    ball.mesh.position.x += ball.velocity.x * dt;
    ball.mesh.position.z += ball.velocity.y * dt;

    this.applyClothFriction(ball, dt);
    this.rotateBall(ball, dt);
    if (this.checkPocket(ball)) return;

    const xLimit = TABLE.width / 2 - TABLE.ballRadius;
    const zLimit = TABLE.height / 2 - TABLE.ballRadius;
    let hitRail = false;
    if (ball.mesh.position.x > xLimit) {
      ball.mesh.position.x = xLimit;
      this.resolveRailCollision(ball, -1, 0);
      hitRail = true;
    } else if (ball.mesh.position.x < -xLimit) {
      ball.mesh.position.x = -xLimit;
      this.resolveRailCollision(ball, 1, 0);
      hitRail = true;
    }
    if (ball.mesh.position.z > zLimit) {
      ball.mesh.position.z = zLimit;
      this.resolveRailCollision(ball, 0, -1);
      hitRail = true;
    } else if (ball.mesh.position.z < -zLimit) {
      ball.mesh.position.z = -zLimit;
      this.resolveRailCollision(ball, 0, 1);
      hitRail = true;
    }
    if (hitRail) this.events.onRailContact?.(ball);
  }

  applyClothFriction(ball, dt) {
    const angularVelocity = angularVelocityOf(ball);
    const slip = getContactSlip(ball);
    const slipSpeed = slip.length();

    if (slipSpeed > PHYSICS.slipThreshold) {
      // Coulomb sliding friction: |a| = mu_s g, opposite contact-point slip.
      const accelerationMagnitude = PHYSICS.slidingFriction * PHYSICS.gravity;
      const speedChange = Math.min(accelerationMagnitude * dt, slipSpeed);
      const appliedAcceleration = speedChange / dt;
      const accelerationX = -slip.x / slipSpeed * appliedAcceleration;
      const accelerationZ = -slip.y / slipSpeed * appliedAcceleration;
      ball.velocity.x += accelerationX * dt;
      ball.velocity.y += accelerationZ * dt;
      // Friction torque uses I = 2/5 mR^2 for a solid sphere.
      angularVelocity.x += (-2.5 * accelerationZ / TABLE.ballRadius) * dt;
      angularVelocity.z += (2.5 * accelerationX / TABLE.ballRadius) * dt;

      if (speedChange === slipSpeed) {
        angularVelocity.x = ball.velocity.y / TABLE.ballRadius;
        angularVelocity.z = -ball.velocity.x / TABLE.ballRadius;
      }
    } else {
      // Pure rolling constraint: omega x R matches linear speed.
      const speed = ball.velocity.length();
      if (speed > 0) {
        // Rolling resistance gives constant deceleration mu_r g.
        const deceleration = PHYSICS.rollingFriction * PHYSICS.gravity;
        const nextSpeed = Math.max(0, speed - deceleration * dt);
        ball.velocity.multiplyScalar(nextSpeed / speed);
        angularVelocity.x = ball.velocity.y / TABLE.ballRadius;
        angularVelocity.z = -ball.velocity.x / TABLE.ballRadius;
      } else {
        angularVelocity.x = 0;
        angularVelocity.z = 0;
      }
    }

    const sideSpin = angularVelocity.y;
    if (sideSpin !== 0) {
      // Rotational friction decays vertical-axis spin independently.
      const spinDeceleration = 2.5 * PHYSICS.spinningFriction * PHYSICS.gravity / TABLE.ballRadius;
      angularVelocity.y = Math.sign(sideSpin) * Math.max(0, Math.abs(sideSpin) - spinDeceleration * dt);
    }

    if (ball.velocity.length() < PHYSICS.stopSpeed && getContactSlip(ball).length() < PHYSICS.slipThreshold) {
      ball.velocity.set(0, 0);
      angularVelocity.x = 0;
      angularVelocity.z = 0;
    }
    if (Math.abs(angularVelocity.y) < PHYSICS.spinStopSpeed) angularVelocity.y = 0;
  }

  rotateBall(ball, dt) {
    const angularVelocity = angularVelocityOf(ball);
    const angularSpeed = angularVelocity.length();
    if (angularSpeed === 0) return;
    // Angular kinematics: delta angle = |omega| dt around the omega axis.
    const axis = angularVelocity.clone().multiplyScalar(1 / angularSpeed);
    ball.mesh.rotateOnWorldAxis(axis, angularSpeed * dt);
  }

  resolveRailCollision(ball, normalX, normalZ) {
    const normalSpeed = ball.velocity.x * normalX + ball.velocity.y * normalZ;
    if (normalSpeed >= 0) return;

    // Newton restitution reverses and damps the normal velocity.
    ball.velocity.x -= (1 + PHYSICS.cushionRestitution) * normalSpeed * normalX;
    ball.velocity.y -= (1 + PHYSICS.cushionRestitution) * normalSpeed * normalZ;

    // Tangential cushion friction couples side spin and rebound direction.
    const angularVelocity = angularVelocityOf(ball);
    const tangentX = -normalZ;
    const tangentZ = normalX;
    const tangentSpeed = ball.velocity.x * tangentX + ball.velocity.y * tangentZ;
    const cushionSlip = tangentSpeed + angularVelocity.y * TABLE.ballRadius;
    const tangentChange = cushionSlip * PHYSICS.cushionFriction;
    ball.velocity.x -= tangentChange * tangentX;
    ball.velocity.y -= tangentChange * tangentZ;
    angularVelocity.y -= 2.5 * tangentChange / TABLE.ballRadius;
  }

  checkPocket(ball) {
    // Pocket capture uses a circular overlap test in table coordinates.
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
    angularVelocityOf(ball).set(0, 0, 0);
    this.events.onPocket?.(ball);
    // This interpolation is a visual sink animation, not part of the rigid-body solver.
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
