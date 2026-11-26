// hud.js — the cockpit instruments: altitude, speed, heading, throttle,
// fuel, damage, mission objective, ring counter and an artificial horizon.
// All of it is DOM + one small canvas so the text stays crisp in screenshots.
import { headingDegrees } from './physics.js';

export function createHudElements() {
  const get = (id) => document.getElementById(id);
  return {
    root: get('hud'),
    altitude: get('hud-altitude'),
    speed: get('hud-speed'),
    heading: get('hud-heading'),
    throttleFill: get('hud-throttle-fill'),
    throttleValue: get('hud-throttle-value'),
    fuelFill: get('hud-fuel-fill'),
    fuelValue: get('hud-fuel-value'),
    damageFill: get('hud-damage-fill'),
    score: get('hud-score'),
    objective: get('hud-objective'),
    message: get('hud-message'),
    compass: get('hud-compass'),
    horizon: get('hud-horizon'),
    title: get('hud-title'),
    vignette: get('hud-vignette'),
  };
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Refresh every instrument from the live flight and mission state. */
export function updateHud(hud, flight, mission, screenName) {
  const alt = Math.max(0, Math.round(flight.y));
  const spd = Math.round(flight.speed * 3.6); // km/h, as pilots read it
  const hdg = Math.round(headingDegrees(flight));
  setText(hud.altitude, `${alt} m`);
  setText(hud.speed, `${spd} km/h`);
  setText(hud.heading, `${String(hdg).padStart(3, '0')}°`);
  setText(hud.score, `SKOR ${mission.score}`);
  setText(hud.throttleValue, `${Math.round(flight.throttle * 100)}%`);
  setText(hud.fuelValue, `${Math.round(flight.fuel)}%`);
  hud.throttleFill.style.width = `${flight.throttle * 100}%`;
  hud.fuelFill.style.width = `${flight.fuel}%`;
  hud.fuelFill.classList.toggle('low', flight.fuel < 25);
  hud.damageFill.style.width = `${flight.damage}%`;
  hud.damageFill.classList.toggle('bad', flight.damage > 50);
  // Compass strip: the eight points scroll past a centre marker.
  const centre = hdg;
  let strip = '';
  for (let d = -60; d <= 60; d += 15) {
    const a = (centre + d + 360) % 360;
    const label = a % 90 === 0 ? COMPASS_POINTS[a / 45] : `${a}°`;
    strip += `<span class="${d === 0 ? 'compass-centre' : ''}">${label}</span>`;
  }
  hud.compass.innerHTML = strip;
  // Objective and message lines.
  setText(hud.objective, missionObjectiveLine(mission, screenName));
  const showMessage = mission.message && mission.flightTime < mission.messageUntil;
  hud.message.style.visibility = showMessage ? 'visible' : 'hidden';
  if (showMessage) setText(hud.message, mission.message);
  drawArtificialHorizon(hud.horizon, flight);
  // The overlay screens (title, landed, crashed, complete) carry their own
  // big title at the top; the objective line would collide with it, so the
  // stylesheet hides it there via this attribute.
  if (hud.root) hud.root.dataset.screen = screenName;
}

function missionObjectiveLine(mission, screenName) {
  if (screenName === 'title') return `Misi: ${mission.mission.name} — tekan Enter untuk terbang (1/2/3 ganti misi)`;
  if (screenName === 'crashed') return 'Pesawat jatuh — tekan R untuk terbang lagi';
  if (screenName === 'complete') return `MISI SELESAI — skor akhir ${mission.finalScore}. Tekan R untuk misi baru.`;
  if (screenName === 'landed') return `Mendarat — skor ${mission.score}. Tekan R untuk terbang lagi.`;
  const ring = mission.rings.rings[mission.rings.nextIndex];
  if (ring) return `Ring ${ring.index + 1}/${mission.rings.rings.length} — ${mission.mission.name}`;
  return 'Semua ring dilewati — mendarat di runway!';
}

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

/** Artificial horizon: a rolling, pitching disc, drawn on its own canvas. */
export function drawArtificialHorizon(canvas, flight) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - 2;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-flight.roll);
  const pitchPixels = flight.pitch * 60;
  ctx.translate(0, pitchPixels);
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-radius - 10, -radius - 10 - pitchPixels, radius * 2 + 20, radius + 10 + pitchPixels);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-radius - 10, 0, radius * 2 + 20, radius + 10);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(-radius - 10, -1, radius * 2 + 20, 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker in the centre.
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx - 4, cy);
  ctx.moveTo(cx + 4, cy);
  ctx.lineTo(cx + 16, cy);
  ctx.stroke();
}

/** Show or hide the title overlay and set its mission list. */
export function renderTitleOverlay(hud, mission, visible) {
  hud.title.style.display = visible ? 'block' : 'none';
  if (!visible) return;
  const list = hud.title.querySelector('.mission-list');
  if (list) {
    list.innerHTML = mission.missionListHtml || '';
  }
}
