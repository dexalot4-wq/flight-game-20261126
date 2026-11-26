// renderer.js — a small software 3D renderer on a 2D canvas. No WebGL is
// needed: every world point is projected with a pinhole camera, terrain is
// painted far-to-near as flat-shaded quads, and the aircraft is drawn from
// its own 3D polygons. The same code renders the game and the screenshots.
import { WORLD } from './config.js';

export function createCamera(width, height, fovDegrees) {
  const focal = (height / 2) / Math.tan(((fovDegrees / 2) * Math.PI) / 180);
  return { width, height, focal, cx: width / 2, cy: height / 2 };
}

/** Build an orthonormal camera basis from a look direction. */
export function cameraBasis(forward) {
  const f = normalise(forward);
  const worldUp = { x: 0, y: 1, z: 0 };
  const r = normalise(cross(f, worldUp));
  const u = cross(r, f);
  return { f, r, u };
}

export function normalise(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Project a world point into screen space. Returns null behind the camera.
 * `out` is reused to avoid garbage in the frame loop.
 */
export function projectPoint(camera, eye, basis, p, out) {
  const dx = p.x - eye.x;
  const dy = p.y - eye.y;
  const dz = p.z - eye.z;
  const z = dx * basis.f.x + dy * basis.f.y + dz * basis.f.z;
  if (z < 0.6) return null;
  const x = dx * basis.r.x + dy * basis.r.y + dz * basis.r.z;
  const y = dx * basis.u.x + dy * basis.u.y + dz * basis.u.z;
  const scale = camera.focal / z;
  out.x = camera.cx + x * scale;
  out.y = camera.cy - y * scale;
  out.depth = z;
  return out;
}

/** Mix a terrain colour toward the sky haze colour with distance. */
export function hazeColour(colour, depth, sky) {
  const t = Math.min(0.75, Math.max(0, (depth - 350) / 1100));
  if (t <= 0) return colour;
  const m = colour.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!m) return colour;
  const r = Math.round(+m[1] + (sky[0] - +m[1]) * t);
  const g = Math.round(+m[2] + (sky[1] - +m[2]) * t);
  const b = Math.round(+m[3] + (sky[2] - +m[3]) * t);
  return `rgb(${r},${g},${b})`;
}

/** Paint the sky: gradient, sun, and drifting clouds in screen space. */
export function drawSky(ctx, width, height, time, heading) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#2f6fb8');
  sky.addColorStop(0.45, '#7fb2e0');
  sky.addColorStop(0.62, '#cfe6f5');
  sky.addColorStop(1, '#e8f2f8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  // Sun, fixed in the west so the light direction never changes.
  const sunX = width * 0.78;
  const sunY = height * 0.16;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  glow.addColorStop(0, 'rgba(255,244,200,0.95)');
  glow.addColorStop(0.25, 'rgba(255,232,160,0.55)');
  glow.addColorStop(1, 'rgba(255,232,160,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
  ctx.fill();
  // Clouds drift slowly with the heading so turning feels like turning.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 9; i += 1) {
    const baseX = ((i * 317 + heading * 220) % (width + 320)) - 160;
    const y = 40 + ((i * 97) % 190);
    const s = 34 + ((i * 53) % 46);
    ctx.beginPath();
    ctx.ellipse(baseX + time * 2, y, s, s * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(baseX + s * 0.7 + time * 2, y + 8, s * 0.7, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Paint the lake as one flat blue polygon on the terrain. */
export function drawLake(ctx, camera, eye, basis, corners) {
  ctx.fillStyle = '#3f8fd2';
  ctx.beginPath();
  let started = false;
  const p = { x: 0, y: 0, depth: 0 };
  for (const c of corners) {
    if (!projectPoint(camera, eye, basis, c, p)) return;
    if (!started) { ctx.moveTo(p.x, p.y); started = true; }
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Fill one projected quad; returns false when any corner is behind us. */
export function fillProjectedQuad(ctx, camera, eye, basis, corners, fill) {
  const pts = [];
  const p = { x: 0, y: 0, depth: 0 };
  let depth = 0;
  for (const c of corners) {
    if (!projectPoint(camera, eye, basis, c, p)) return false;
    pts.push({ x: p.x, y: p.y });
    depth += p.depth;
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  return depth / corners.length;
}

/** Stroke a projected polyline (used for ring circles and runway edges). */
export function strokeProjectedLoop(ctx, camera, eye, basis, points, stroke, width) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.beginPath();
  const p = { x: 0, y: 0, depth: 0 };
  let started = false;
  for (const pt of points) {
    if (!projectPoint(camera, eye, basis, pt, p)) { started = false; continue; }
    if (!started) { ctx.moveTo(p.x, p.y); started = true; }
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();
}
