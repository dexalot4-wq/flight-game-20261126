// terrain.js — the valley itself: height field, lake, town, runway, trees.
// One function, terrainHeightAt(x, z), is the single source of truth for the
// mesh, the lake, the runway flattening and the flight collision checks.
import { WORLD } from './config.js';
import { fractalNoise2D, mulberry32 } from './random.js';

const TERRAIN_SEED = 20261126;

function distanceToRunway(x, z) {
  const cz = Math.max(WORLD.runwayStartZ, Math.min(WORLD.runwayEndZ, z));
  return Math.hypot(x, z - cz);
}

function distanceToLake(x, z) {
  return Math.hypot(x - WORLD.lakeCentre.x, z - WORLD.lakeCentre.z);
}

/** Ground height in metres at world (x, z). Deterministic, pure function. */
export function terrainHeightAt(x, z) {
  const edge = Math.max(Math.abs(x), Math.abs(z)) / WORLD.halfSize;
  const mountains = Math.max(0, edge - 0.55) / 0.45;
  let h = fractalNoise2D(x, z, TERRAIN_SEED) * 26;
  h += mountains * mountains * 150;
  h += Math.max(0, fractalNoise2D(x + 900, z - 500, TERRAIN_SEED + 3)) * mountains * 60;
  // Flatten the runway strip so take-off and landing read as a real strip.
  const runwayBlend = smoothClamp(1 - distanceToRunway(x, z) / 90, 0, 1);
  h = h * (1 - runwayBlend) + WORLD.runwayHeight * runwayBlend;
  // Flatten the lake bed below the water line.
  const lakeBlend = smoothClamp(1 - distanceToLake(x, z) / (WORLD.lakeRadius + 60), 0, 1);
  h = h * (1 - lakeBlend) + -3 * lakeBlend;
  return h;
}

function smoothClamp(t, lo, hi) {
  const c = Math.max(lo, Math.min(hi, t));
  return c * c * (3 - 2 * c);
}

/** Colour of one terrain quad, by height and slope, low-poly flat style. */
export function terrainColourAt(x, z, height, slope) {
  if (height > 135) return '#e8edf2'; // snow caps
  if (height > 85) return shade('#8a8f96', slope); // rock
  if (height < 4 && distanceToLake(x, z) < WORLD.lakeRadius + 40) return '#c9b078'; // shore sand
  const green = height > 34 ? '#5d8a4a' : height > 14 ? '#6fa055' : '#7fb069';
  return shade(green, slope);
}

function shade(hex, slope) {
  const n = parseInt(hex.slice(1), 16);
  const f = 1 - Math.min(0.35, Math.max(0, slope) * 0.5);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

/** Precompute the terrain grid once: vertices with heights and colours. */
export function buildTerrainGrid() {
  const seg = WORLD.terrainSegments;
  const cell = WORLD.terrainCell;
  const half = (seg * cell) / 2;
  const rows = [];
  for (let iz = 0; iz <= seg; iz += 1) {
    const row = [];
    for (let ix = 0; ix <= seg; ix += 1) {
      const x = -half + ix * cell;
      const z = -half + iz * cell;
      const h = terrainHeightAt(x, z);
      const slope = Math.abs(terrainHeightAt(x + cell, z) - h) / cell +
        Math.abs(terrainHeightAt(x, z + cell) - h) / cell;
      row.push({ x, y: h, z, colour: terrainColourAt(x, z, h, slope) });
    }
    rows.push(row);
  }
  return rows;
}

/** Town houses, trees and runway furniture, placed once with a fixed seed. */
export function buildValleyProps() {
  const random = mulberry32(77);
  const houses = [];
  for (let i = 0; i < 42; i += 1) {
    const x = WORLD.townCentre.x + (random() - 0.5) * 260;
    const z = WORLD.townCentre.z + (random() - 0.5) * 220;
    const w = 10 + random() * 14;
    const d = 10 + random() * 14;
    const h = 8 + random() * 16;
    houses.push({ x, z, y: terrainHeightAt(x, z), w, d, h, roof: random() > 0.5 });
  }
  const trees = [];
  for (let i = 0; i < 260; i += 1) {
    const x = (random() - 0.5) * 2200;
    const z = (random() - 0.5) * 2200;
    const h = terrainHeightAt(x, z);
    if (h < 6 || h > 90) continue;
    if (distanceToRunway(x, z) < 70) continue;
    if (distanceToLake(x, z) < WORLD.lakeRadius + 20) continue;
    trees.push({ x, z, y: h, size: 7 + random() * 9 });
  }
  return { houses, trees };
}

/** Runway corner posts and threshold markers, for the renderer to draw. */
export function runwayCorners() {
  const hw = WORLD.runwayHalfWidth;
  const a = WORLD.runwayStartZ;
  const b = WORLD.runwayEndZ;
  return [
    { x: -hw, y: 0.4, z: a }, { x: hw, y: 0.4, z: a },
    { x: hw, y: 0.4, z: b }, { x: -hw, y: 0.4, z: b },
  ];
}
