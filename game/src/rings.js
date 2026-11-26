// rings.js — the target rings of a sortie: glowing hoops the plane must
// fly through in order. A ring is passed when the plane crosses its plane
// inside its radius; the next ring lights up and the passed one turns green.
import { RING } from './config.js';

export function createRingSet(mission) {
  return {
    rings: mission.rings.map((r, i) => ({
      index: i,
      x: r.x,
      y: r.y,
      z: r.z,
      passed: false,
      // Rings face along the route: toward the next ring, last one faces home.
      facing: ringFacing(mission.rings, i),
    })),
    nextIndex: 0,
    passedCount: 0,
  };
}

function ringFacing(rings, i) {
  const from = rings[i];
  const to = rings[i + 1] || { x: 0, y: 30, z: 120 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / len, y: dy / len, z: dz / len };
}

/** The ring the pilot must fly through next, or null when all are passed. */
export function nextRing(ringSet) {
  return ringSet.nextIndex < ringSet.rings.length
    ? ringSet.rings[ringSet.nextIndex]
    : null;
}

/**
 * Check a flight step for a ring pass. A ring is passed when the plane is
 * inside the hoop's cylinder: within its radius sideways from the centre
 * and close to the hoop's plane. A pure plane-crossing test misses the
 * pass whenever the approach is not aligned with the ring's normal, so the
 * cylinder test is what the game uses.
 */
export function checkRingPass(ringSet, prev, pos) {
  const ring = nextRing(ringSet);
  if (!ring) return null;
  const n = ring.facing;
  const dx = pos.x - ring.x;
  const dy = pos.y - ring.y;
  const dz = pos.z - ring.z;
  const along = dx * n.x + dy * n.y + dz * n.z;
  const lx = dx - n.x * along;
  const ly = dy - n.y * along;
  const lz = dz - n.z * along;
  const lateral = Math.hypot(lx, ly, lz);
  if (lateral <= RING.radius && Math.abs(along) <= 25) {
    ring.passed = true;
    ringSet.nextIndex += 1;
    ringSet.passedCount += 1;
    return ring;
  }
  return null;
}

/** Points of a ring's circle in world space, for the renderer to stroke. */
export function ringCirclePoints(ring, segments = RING.segments) {
  const n = ring.facing;
  // Two perpendicular axes spanning the ring's plane.
  const up = Math.abs(n.y) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const a = normalise3(cross3(n, up));
  const b = cross3(n, a);
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    points.push({
      x: ring.x + (a.x * Math.cos(t) + b.x * Math.sin(t)) * RING.radius,
      y: ring.y + (a.y * Math.cos(t) + b.y * Math.sin(t)) * RING.radius,
      z: ring.z + (a.z * Math.cos(t) + b.z * Math.sin(t)) * RING.radius,
    });
  }
  return points;
}

function cross3(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function normalise3(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
