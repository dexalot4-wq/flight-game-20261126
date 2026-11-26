// aircraft.js — the courier plane, built from its own 3D polygons: a tapered
// fuselage, high wings, tail fins, a spinning propeller and a glass canopy.
// The model is defined once in local space (nose toward -Z) and rotated by
// the plane's yaw, pitch and roll before projection.
export const AIRCRAFT_COLOURS = {
  fuselage: '#e8542f',
  fuselageDark: '#b83a1c',
  wing: '#f4f1e8',
  wingTip: '#e8542f',
  tail: '#f4f1e8',
  canopy: '#bfe3f2',
  propeller: '#2b2b2b',
  stripe: '#ffd23e',
};

// Each face: four local-space corners and a colour key. Faces are listed
// back-to-front for a chase view; the renderer paints them in this order
// after a depth sort by face centre, so the order here is only a tie-break.
export function buildAircraftFaces() {
  const faces = [];
  const add = (corners, colour, shade = 1) => faces.push({ corners, colour, shade });
  // Fuselage: a long tapered box, nose at z = -3.4, tail at z = 3.2.
  const nose = { x: 0, y: 0.15, z: -3.4 };
  const body = [
    { x: -0.55, y: -0.25, z: -2.2 }, { x: 0.55, y: -0.25, z: -2.2 },
    { x: 0.55, y: 0.55, z: -2.2 }, { x: -0.55, y: 0.55, z: -2.2 },
    { x: -0.38, y: -0.18, z: 3.2 }, { x: 0.38, y: -0.18, z: 3.2 },
    { x: 0.38, y: 0.42, z: 3.2 }, { x: -0.38, y: 0.42, z: 3.2 },
  ];
  // Top, bottom, left, right of the fuselage box.
  add([body[2], body[3], body[7], body[6]], 'fuselage', 1.05);
  add([body[0], body[1], body[5], body[4]], 'fuselageDark', 0.8);
  add([body[3], body[0], body[4], body[7]], 'fuselage', 0.9);
  add([body[1], body[2], body[6], body[5]], 'fuselage', 0.95);
  // Nose cone: four triangles meeting at the nose point.
  add([nose, body[2], body[3]], 'fuselage', 1.05);
  add([nose, body[1], body[2]], 'fuselage', 0.95);
  add([nose, body[0], body[1]], 'fuselageDark', 0.8);
  add([nose, body[3], body[0]], 'fuselage', 0.9);
  // Tail cap.
  add([body[4], body[5], body[6], body[7]], 'fuselageDark', 0.75);
  // Canopy: a low glass wedge on top of the fuselage.
  add([
    { x: -0.42, y: 0.55, z: -1.4 }, { x: 0.42, y: 0.55, z: -1.4 },
    { x: 0.34, y: 0.95, z: -0.2 }, { x: -0.34, y: 0.95, z: -0.2 },
  ], 'canopy', 1.1);
  add([
    { x: -0.34, y: 0.95, z: -0.2 }, { x: 0.34, y: 0.95, z: -0.2 },
    { x: 0.3, y: 0.55, z: 0.9 }, { x: -0.3, y: 0.55, z: 0.9 },
  ], 'canopy', 1.0);
  // Main wings: a flat slab spanning x = -5.4 .. 5.4 at z = -0.4.
  add([
    { x: -5.4, y: 0.42, z: -0.9 }, { x: 5.4, y: 0.42, z: -0.9 },
    { x: 5.4, y: 0.42, z: 0.35 }, { x: -5.4, y: 0.42, z: 0.35 },
  ], 'wing', 1.08);
  add([
    { x: -5.4, y: 0.3, z: 0.35 }, { x: 5.4, y: 0.3, z: 0.35 },
    { x: 5.4, y: 0.3, z: -0.9 }, { x: -5.4, y: 0.3, z: -0.9 },
  ], 'wing', 0.7);
  // Wing tips, painted red so the wings read at a glance.
  add([
    { x: -5.4, y: 0.42, z: -0.9 }, { x: -4.6, y: 0.42, z: -0.9 },
    { x: -4.6, y: 0.42, z: 0.35 }, { x: -5.4, y: 0.42, z: 0.35 },
  ], 'wingTip', 1.08);
  add([
    { x: 4.6, y: 0.42, z: -0.9 }, { x: 5.4, y: 0.42, z: -0.9 },
    { x: 5.4, y: 0.42, z: 0.35 }, { x: 4.6, y: 0.42, z: 0.35 },
  ], 'wingTip', 1.08);
  // Horizontal stabiliser at the tail.
  add([
    { x: -2.1, y: 0.32, z: 2.5 }, { x: 2.1, y: 0.32, z: 2.5 },
    { x: 2.1, y: 0.32, z: 3.2 }, { x: -2.1, y: 0.32, z: 3.2 },
  ], 'tail', 1.05);
  // Vertical fin.
  add([
    { x: 0, y: 0.42, z: 2.4 }, { x: 0, y: 0.42, z: 3.2 },
    { x: 0, y: 1.5, z: 3.05 }, { x: 0, y: 1.5, z: 2.75 },
  ], 'tail', 0.95);
  // Yellow cheatline stripe along the fuselage.
  add([
    { x: -0.56, y: 0.05, z: -2.2 }, { x: -0.56, y: 0.22, z: -2.2 },
    { x: -0.39, y: 0.18, z: 3.2 }, { x: -0.39, y: 0.05, z: 3.2 },
  ], 'stripe', 0.95);
  add([
    { x: 0.56, y: 0.22, z: -2.2 }, { x: 0.56, y: 0.05, z: -2.2 },
    { x: 0.39, y: 0.05, z: 3.2 }, { x: 0.39, y: 0.18, z: 3.2 },
  ], 'stripe', 0.95);
  return faces;
}

/** Rotate one local point by yaw, pitch and roll (intrinsic Y-X-Z order). */
export function rotateAircraftPoint(p, yaw, pitch, roll) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  // Roll about Z (the forward axis), then pitch about X, then yaw about Y.
  let x = p.x * cr - p.y * sr;
  let y = p.x * sr + p.y * cr;
  let z = p.z;
  const y2 = y * cp - z * sp;
  const z2 = y * sp + z * cp;
  y = y2;
  z = z2;
  const x3 = x * cy + z * sy;
  const z3 = -x * sy + z * cy;
  return { x: x3, y, z: z3 };
}

/** Propeller blade endpoints at the nose, at a given spin angle. */
export function propellerBlades(spinAngle) {
  const blades = [];
  for (let i = 0; i < 2; i += 1) {
    const a = spinAngle + (i * Math.PI) / 2 + Math.PI / 2;
    const dx = Math.cos(a) * 2.1;
    const dy = Math.sin(a) * 2.1;
    blades.push([
      { x: -dx, y: 0.15 - dy, z: -3.55 },
      { x: dx, y: 0.15 + dy, z: -3.55 },
    ]);
  }
  return blades;
}
