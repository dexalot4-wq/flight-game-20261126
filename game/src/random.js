// random.js — deterministic seeded noise. The same seed always builds the
// same valley, so every screenshot and every play session see one world.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashGrid(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/** Smooth 2D value noise in [-1, 1] at world coordinates (x, z). */
export function valueNoise2D(x, z, cell, seed) {
  const gx = x / cell;
  const gz = z / cell;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = smoothstep(gx - ix);
  const fz = smoothstep(gz - iz);
  const a = hashGrid(ix, iz, seed);
  const b = hashGrid(ix + 1, iz, seed);
  const c = hashGrid(ix, iz + 1, seed);
  const d = hashGrid(ix + 1, iz + 1, seed);
  return (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz);
}

/** Fractal noise: three octaves of value noise, still in roughly [-1, 1]. */
export function fractalNoise2D(x, z, seed) {
  return (
    valueNoise2D(x, z, 340, seed) * 0.55 +
    valueNoise2D(x, z, 150, seed + 7) * 0.3 +
    valueNoise2D(x, z, 64, seed + 13) * 0.15
  );
}

/** Deterministic pick of one item from a list by index. */
export function pickSeeded(random, list) {
  return list[Math.floor(random() * list.length)];
}
