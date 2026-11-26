// config.js — every tunable number of Skyline Courier in one place.
// The world is a 2400 x 2400 metre valley. North is -Z. The runway lies
// along the Z axis at x = 0, from z = -40 (threshold) to z = 300.
export const WORLD = {
  halfSize: 1200,
  terrainCell: 60,
  terrainSegments: 40,
  runwayHalfWidth: 12,
  runwayStartZ: -40,
  runwayEndZ: 300,
  runwayHeight: 0,
  lakeCentre: { x: -480, z: -420 },
  lakeRadius: 190,
  lakeWaterY: 1.5,
  townCentre: { x: 330, z: 120 },
};

export const PLANE = {
  maxSpeed: 72, // m/s at full throttle
  minSpeed: 14, // below this the wing stops flying
  cruiseSpeed: 46,
  accel: 14, // m/s^2 toward the throttle's target speed
  pitchRate: 0.9, // rad/s
  rollRate: 1.9, // rad/s
  maxPitch: 0.62,
  maxRoll: 1.15,
  turnFromBank: 0.85, // yaw rate per radian of bank, scaled by speed
  rudderRate: 0.35,
  stallSink: 9, // extra m/s of sink when stalled
  groundClearance: 1.4, // metres of gear above the terrain when landed
  safeLandingSink: 4.5, // m/s: touch down softer than this to survive
  safeLandingRoll: 0.28, // rad: wings this level to survive
  crashSink: 9, // m/s: hit the ground harder than this and it is a crash
  fuelCapacity: 100,
  fuelBurnPerSecond: 0.35, // at full throttle; scales with throttle
};

export const CAMERA = {
  chaseDistance: 15,
  chaseHeight: 4.5,
  lookAhead: 26,
  fovDegrees: 62,
  smoothing: 6.5, // lerp rate per second for the chase camera
};

export const RING = {
  radius: 15,
  tube: 1.6,
  segments: 28,
};

export const MISSIONS = [
  {
    id: 'courier',
    name: 'Kurir Lembah',
    blurb: 'Delapan ring menyusuri lembah, lalu mendarat di runway.',
    rings: [
      { x: 0, y: 55, z: -180 },
      { x: -190, y: 70, z: -420 },
      { x: -430, y: 60, z: -430 },
      { x: -520, y: 75, z: -120 },
      { x: -260, y: 65, z: 180 },
      { x: 140, y: 80, z: 330 },
      { x: 330, y: 70, z: 60 },
      { x: 180, y: 55, z: -160 },
    ],
  },
  {
    id: 'lake',
    name: 'Patroli Danau',
    blurb: 'Lima ring rendah di atas Danau Biru, lalu mendarat.',
    rings: [
      { x: -260, y: 45, z: -260 },
      { x: -480, y: 38, z: -420 },
      { x: -640, y: 45, z: -240 },
      { x: -420, y: 50, z: -80 },
      { x: -180, y: 48, z: -300 },
    ],
  },
  {
    id: 'peaks',
    name: 'Lintas Puncak',
    blurb: 'Enam ring tinggi melewati pegunungan timur, lalu mendarat.',
    rings: [
      { x: 320, y: 110, z: -260 },
      { x: 620, y: 140, z: -480 },
      { x: 880, y: 150, z: -180 },
      { x: 760, y: 130, z: 220 },
      { x: 480, y: 115, z: 420 },
      { x: 200, y: 90, z: 120 },
    ],
  },
];

export const SCORE = {
  ringPoints: 100,
  landingPoints: 500,
  fuelBonusPerUnit: 4,
  timeBonusPerSecond: 2,
  perfectLandingBonus: 250,
};

export const SHOT_SECONDS = { start: 0, play: 16, rings: 0, end: 0 };
export const STEP = 1 / 60;
