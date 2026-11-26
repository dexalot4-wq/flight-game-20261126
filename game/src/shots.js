// shots.js — deterministic screenshot scenes. Each scene plays the real
// rules forward from a fresh world with a fixed autopilot, so the same seed
// always gives the same frame. No screenshot is staged by hand-placing the
// plane, except the title screen, which starts parked on the runway.
import { STEP } from './config.js';
import { nextRing } from './rings.js';
import { SCREENS } from './missions.js';

const PLAY_SECONDS = 16;
const MAX_SIM_SECONDS = 300;

/** Steer toward a target point: returns stick inputs for one step. */
export function autopilotInput(flight, target, wantSpeed) {
  const dx = target.x - flight.x;
  const dy = target.y - flight.y;
  const dz = target.z - flight.z;
  const dist = Math.hypot(dx, dy, dz) || 1;
  // Desired heading from the bearing to the target.
  const desiredYaw = Math.atan2(-dx, -dz);
  let yawError = desiredYaw - flight.yaw;
  while (yawError > Math.PI) yawError -= Math.PI * 2;
  while (yawError < -Math.PI) yawError += Math.PI * 2;
  // Desired pitch from the altitude error, limited so the climb stays sane.
  const desiredPitch = Math.max(-0.4, Math.min(0.45, (dy / Math.max(30, dist)) * 1.4));
  const pitchError = desiredPitch - flight.pitch;
  // Roll the wings toward the target: banking right (positive roll) turns
  // the nose right, which is a DECREASING yaw, so the roll target is the
  // negative of the yaw error.
  // Slow down for the final approach to a ring so the turn stays tight
  // enough to cross inside the hoop instead of sweeping past it.
  const approachSpeed = dist < 120 ? Math.min(wantSpeed, 34) : wantSpeed;
  // Close in, fly straight at the hoop: level the wings and steer with the
  // rudder only, so a banked turn cannot carry the plane past the ring.
  if (dist < 150) {
    return {
      pitch: Math.max(-1, Math.min(1, pitchError * 2.2)),
      roll: Math.max(-1, Math.min(1, (0 - flight.roll) * 2.6)),
      yaw: Math.max(-1, Math.min(1, yawError * 2.0)),
      throttleDelta: flight.speed < approachSpeed ? 1 : -1,
    };
  }
  const rollTarget = Math.max(-1.0, Math.min(1.0, -yawError * 1.1));
  return {
    pitch: Math.max(-1, Math.min(1, pitchError * 2.2)),
    roll: Math.max(-1, Math.min(1, (rollTarget - flight.roll) * 2.6)),
    yaw: 0,
    throttleDelta: flight.speed < approachSpeed ? 1 : -1,
  };
}

/** Run the flight model forward for `seconds` with the autopilot. */
export function simulateFlight(game, seconds, targetFor) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const target = targetFor(game);
    if (!target) break;
    const input = autopilotInput(game.flight, target, 58);
    const event = game.stepWithInput(input, STEP);
    if (event === 'crashed') break;
    if (event === 'landed' && !targetFor.keepFlying) break;
  }
}

function ringTarget(game) {
  const ring = nextRing(game.mission.rings);
  if (ring) return { x: ring.x, y: ring.y, z: ring.z };
  // All rings passed: land on the runway. Aim at its far end from whichever
  // side the plane is on, on a shallow 3% glide slope, so the plane lines
  // up with the strip and flies straight down it instead of orbiting a
  // point above its middle.
  const f = game.flight;
  const farEndZ = f.z < 120 ? 280 : -40;
  const dist = Math.hypot(f.x, f.z - farEndZ);
  return { x: 0, y: Math.max(2, dist * 0.03), z: farEndZ };
}

/**
 * Final approach: aim the banked autopilot at a point just below the
 * runway's surface in its middle, at landing speed. The autopilot's pitch
 * control shallows as the plane nears the point, so the descent flattens
 * into a touchdown on the strip instead of a dive; its close-in mode
 * levels the wings and steers with the rudder for the last 150 metres.
 */
export function finalApproachInput(flight) {
  return autopilotInput(flight, { x: 0, y: -2, z: 100 }, 26);
}

/**
 * Stage a named scene on a fresh game: 'start' (title, parked), 'play'
 * (mid-flight after the first rings), 'rings' (closing on the third ring)
 * or 'end' (mission flown to a landing). Returns the screen to show.
 */
export function stageShot(name, game) {
  game.resetMission(0);
  if (name === 'start') {
    game.mission.screen = SCREENS.TITLE;
    return SCREENS.TITLE;
  }
  game.mission.screen = SCREENS.FLYING;
  game.flight.throttle = 0.85;
  game.flight.speed = 46;
  if (name === 'play') {
    simulateFlight(game, PLAY_SECONDS, ringTarget);
    return SCREENS.FLYING;
  }
  if (name === 'rings') {
    // Fly until the plane is about to cross the third ring, then freeze.
    const steps = Math.round(MAX_SIM_SECONDS / STEP);
    for (let i = 0; i < steps; i += 1) {
      const ring = nextRing(game.mission.rings);
      if (!ring) break;
      if (ring.index >= 2) {
        const dist = Math.hypot(game.flight.x - ring.x, game.flight.y - ring.y, game.flight.z - ring.z);
        if (dist < 70) break;
      }
      const input = autopilotInput(game.flight, ring, 58);
      const event = game.stepWithInput(input, STEP);
      if (event === 'crashed') break;
    }
    return SCREENS.FLYING;
  }
  // 'end': fly the whole sortie, then the landing approach.
  const steps = Math.round(MAX_SIM_SECONDS / STEP);
  for (let i = 0; i < steps; i += 1) {
    const ringsDone = !nextRing(game.mission.rings);
    const input = ringsDone
      ? finalApproachInput(game.flight)
      : autopilotInput(game.flight, ringTarget(game), 58);
    const event = game.stepWithInput(input, STEP);
    if (event === 'crashed') break;
    if (event === 'landed') break;
  }
  return game.mission.screen;
}
