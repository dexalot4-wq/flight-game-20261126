// physics.js — the arcade flight model. One step per frame: throttle sets a
// target speed, pitch and roll steer, bank turns the plane, and the wing
// only flies above its stall speed. Ground contact is a landing or a crash.
import { PLANE, WORLD } from './config.js';
import { terrainHeightAt } from './terrain.js';

export function createFlightState() {
  return {
    x: 0,
    y: WORLD.runwayHeight + PLANE.groundClearance,
    z: 240,
    yaw: 0, // facing north (-Z): yaw 0 turns local -Z into world -Z
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: PLANE.fuelCapacity,
    damage: 0,
    airborne: false,
    crashed: false,
    landed: false,
    verticalSpeed: 0,
    time: 0,
  };
}

/** Forward direction from yaw and pitch (unit vector, world space). */
export function forwardVector(state) {
  const cp = Math.cos(state.pitch);
  return {
    x: -Math.sin(state.yaw) * cp,
    y: Math.sin(state.pitch),
    z: -Math.cos(state.yaw) * cp,
  };
}

/** Heading in degrees, 0 = north, 90 = east, as the HUD shows it. */
export function headingDegrees(state) {
  const fwd = forwardVector(state);
  const deg = ((Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI + 360) % 360;
  return deg;
}

/**
 * Advance the flight state by dt seconds under `input`
 * { pitch: -1..1, roll: -1..1, yaw: -1..1, throttleDelta: -1..1 }.
 * Returns an event string: 'takeoff' | 'landed' | 'crashed' | null.
 */
export function stepFlight(state, input, dt) {
  const prevY = state.y;
  // Throttle, with fuel as the hard limit.
  state.throttle = clamp(state.throttle + input.throttleDelta * dt * 0.9, 0, 1);
  if (state.fuel <= 0) state.throttle = 0;
  state.fuel = Math.max(0, state.fuel - state.throttle * PLANE.fuelBurnPerSecond * dt);
  // Attitude follows the stick, easing back toward level when released.
  const targetPitch = input.pitch * PLANE.maxPitch;
  const targetRoll = input.roll * PLANE.maxRoll;
  state.pitch += (targetPitch - state.pitch) * Math.min(1, dt * 3.2);
  state.roll += (targetRoll - state.roll) * Math.min(1, dt * 3.2);
  // Bank turns the plane; the rudder adds a little direct yaw.
  const turnRate = -state.roll * PLANE.turnFromBank * (0.4 + state.speed / PLANE.maxSpeed) +
    input.yaw * PLANE.rudderRate;
  state.yaw += turnRate * dt;
  // Speed chases the throttle's target; drag grows with the square of speed.
  const targetSpeed = PLANE.minSpeed + state.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  const drag = 0.02 * state.speed * state.speed * dt;
  state.speed += clamp(targetSpeed - state.speed, -PLANE.accel * dt, PLANE.accel * dt) - drag * 0.2;
  state.speed = Math.max(0, state.speed);
  // Climb from pitch and lift; below stall speed the wing gives up and sinks.
  const fwd = forwardVector(state);
  let climb = fwd.y * state.speed;
  if (state.speed < 22 && state.airborne) climb -= PLANE.stallSink * (1 - state.speed / 22);
  if (!state.airborne && state.speed > 26 && state.pitch > 0.08) {
    state.airborne = true;
    return 'takeoff';
  }
  state.x += fwd.x * state.speed * dt;
  state.z += fwd.z * state.speed * dt;
  state.y += climb * dt;
  state.verticalSpeed = (state.y - prevY) / dt;
  state.time += dt;
  // Keep the plane inside the valley; the edge mountains push it back.
  const edge = Math.max(Math.abs(state.x), Math.abs(state.z));
  if (edge > WORLD.halfSize - 40) {
    state.yaw += Math.PI * dt * 0.4;
  }
  // Ground contact.
  const ground = terrainHeightAt(state.x, state.z);
  const onRunway = Math.abs(state.x) < WORLD.runwayHalfWidth + 2 &&
    state.z > WORLD.runwayStartZ - 10 && state.z < WORLD.runwayEndZ + 10;
  if (state.y <= ground + PLANE.groundClearance) {
    state.y = ground + PLANE.groundClearance;
    if (!state.airborne) return null; // still taxiing on the runway
    const sink = -state.verticalSpeed;
    const level = Math.abs(state.roll) < PLANE.safeLandingRoll;
    if (sink > PLANE.crashSink || !level || !onRunway) {
      // Any hard hit, any wing-low hit, and any touchdown off the runway
      // ends the sortie: a hillside is not a runway.
      state.crashed = true;
      state.damage = 100;
      return 'crashed';
    }
    if (onRunway && sink < PLANE.safeLandingSink && state.speed < 40) {
      state.landed = true;
      state.airborne = false;
      state.speed = Math.max(0, state.speed - 30 * dt);
      return 'landed';
    }
    // A hard-but-survivable bounce on the runway: damage, keep rolling.
    state.damage = Math.min(100, state.damage + 25);
    state.airborne = false;
    state.speed = Math.max(0, state.speed - 20 * dt);
    return 'landed';
  }
  return null;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
