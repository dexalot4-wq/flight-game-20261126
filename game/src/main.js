// main.js — Skyline Courier: a 3D flight game over a procedural valley,
// rendered with a software projector on a 2D canvas (no WebGL needed).
// Chase camera, three sorties, ring runs, fuel, damage and runway landings.
import { CAMERA, MISSIONS, STEP, WORLD } from './config.js';
import { buildTerrainGrid, buildValleyProps, runwayCorners, terrainHeightAt } from './terrain.js';
import { buildAircraftFaces, propellerBlades, rotateAircraftPoint, AIRCRAFT_COLOURS } from './aircraft.js';
import { createFlightState, forwardVector, stepFlight } from './physics.js';
import { checkRingPass, nextRing, ringCirclePoints } from './rings.js';
import { SCREENS, createMissionState, missionObjectiveText, onCrashed, onLanded, onRingPassed, selectMission, showMessage } from './missions.js';
import { attachInputListeners, applyMouseSteering, createInputState, takePressedKeys } from './input.js';
import { createAudioEngine, playRingChime, playThud, startAudio, toggleMute, updateAudio } from './audio.js';
import { createCamera, cameraBasis, cross, dot, drawLake, drawSky, fillProjectedQuad, hazeColour, normalise, projectPoint, strokeProjectedLoop } from './renderer.js';
import { createHudElements, updateHud } from './hud.js';
import { stageShot } from './shots.js';

const SKY_HAZE = [207, 230, 245];

class SkylineCourierGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.terrainGrid = buildTerrainGrid();
    this.props = buildValleyProps();
    this.aircraftFaces = buildAircraftFaces();
    this.input = createInputState();
    this.audio = createAudioEngine();
    this.hud = createHudElements();
    this.flight = createFlightState();
    this.mission = createMissionState(0);
    this.paused = false;
    this.cameraEye = { x: 26, y: 16, z: 300 };
    this.cameraTarget = { x: 0, y: 4, z: 240 };
    this.propellerAngle = 0;
    this.shotMode = null;
    this.time = 0;
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayBody = document.getElementById('overlay-body');
    attachInputListeners(this.input, canvas);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.camera = createCamera(this.canvas.width, this.canvas.height, CAMERA.fovDegrees);
  }

  resetMission(index) {
    this.flight = createFlightState();
    this.mission = createMissionState(index);
    this.cameraEye = { x: 26, y: 16, z: 300 };
    this.cameraTarget = { x: 0, y: 4, z: 240 };
  }

  startMission() {
    this.mission.screen = SCREENS.FLYING;
    showMessage(this.mission, 'W untuk throttle — panah untuk terbang. Ring pertama di depan!', 5);
  }

  /** One physics step with ring checks and event handling. */
  stepWithInput(input, dt) {
    const prev = { x: this.flight.x, y: this.flight.y, z: this.flight.z };
    const event = stepFlight(this.flight, input, dt);
    this.mission.flightTime = this.flight.time;
    if (this.mission.screen === SCREENS.FLYING) {
      const passed = checkRingPass(this.mission.rings, prev, this.flight);
      if (passed) {
        onRingPassed(this.mission);
        playRingChime(this.audio);
      }
    }
    this.afterFlightStep(event);
    return event;
  }

  afterFlightStep(event) {
    if (event === 'takeoff') {
      showMessage(this.mission, 'Lepas landas! Ikuti ring oranye.', 4);
    } else if (event === 'landed') {
      playThud(this.audio);
      onLanded(this.mission, this.flight);
    } else if (event === 'crashed') {
      playThud(this.audio);
      onCrashed(this.mission);
    }
  }

  handleKeys(pressed) {
    for (const code of pressed) {
      if (code === 'Enter') {
        startAudio(this.audio);
        if (this.mission.screen === SCREENS.TITLE) this.startMission();
      } else if (code === 'KeyR') {
        this.resetMission(this.mission.missionIndex);
        this.startMission();
      } else if (code === 'KeyP') {
        this.paused = !this.paused;
      } else if (code === 'KeyM') {
        toggleMute(this.audio);
      } else if (this.mission.screen === SCREENS.TITLE) {
        if (code === 'Digit1') this.resetMission(0);
        if (code === 'Digit2') this.resetMission(1);
        if (code === 'Digit3') this.resetMission(2);
      }
    }
    if (pressed.has('Enter') || pressed.has('KeyR')) startAudio(this.audio);
  }

  update(dt) {
    this.time += dt;
    const pressed = takePressedKeys(this.input);
    this.handleKeys(pressed);
    if (this.paused || this.shotMode) return;
    if (this.mission.screen !== SCREENS.FLYING) return;
    applyMouseSteering(this.input);
    this.stepWithInput(
      {
        pitch: this.input.pitch,
        roll: this.input.roll,
        yaw: this.input.yaw,
        throttleDelta: this.input.throttleDelta,
      },
      dt,
    );
    this.propellerAngle += dt * (4 + this.flight.throttle * 40);
    updateAudio(this.audio, this.flight);
  }

  // ---- Camera ------------------------------------------------------------
  updateCamera(dt) {
    const f = forwardVector(this.flight);
    const flat = normalise({ x: f.x, y: 0, z: f.z });
    if (this.mission.screen === SCREENS.TITLE) {
      // Cinematic parked view: low, off the runway's side, plane in frame.
      // Screenshots snap straight to it; live play eases toward it.
      const snap = this.shotMode ? 1 : Math.min(1, dt * 2);
      this.cameraEye = lerp3(this.cameraEye, { x: 24, y: 9, z: 296 }, snap);
      this.cameraTarget = lerp3(this.cameraTarget, { x: 0, y: 3, z: 232 }, snap);
      return;
    }
    const desiredEye = {
      x: this.flight.x - flat.x * CAMERA.chaseDistance + flat.z * 0,
      y: this.flight.y + CAMERA.chaseHeight,
      z: this.flight.z - flat.z * CAMERA.chaseDistance,
    };
    // Keep the camera above the ground it flies over.
    desiredEye.y = Math.max(desiredEye.y, terrainHeightAt(desiredEye.x, desiredEye.z) + 3);
    // Screenshots render a single frame: snap the camera, never ease it.
    const rate = this.shotMode ? 1 : Math.min(1, dt * CAMERA.smoothing);
    this.cameraEye = lerp3(this.cameraEye, desiredEye, rate);
    this.cameraTarget = {
      x: this.flight.x + f.x * CAMERA.lookAhead,
      y: this.flight.y + f.y * CAMERA.lookAhead,
      z: this.flight.z + f.z * CAMERA.lookAhead,
    };
  }

  // ---- Rendering ---------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    this.updateCamera(1 / 60);
    drawSky(ctx, width, height, this.time, this.flight.yaw);
    const eye = this.cameraEye;
    const look = normalise({
      x: this.cameraTarget.x - eye.x,
      y: this.cameraTarget.y - eye.y,
      z: this.cameraTarget.z - eye.z,
    });
    const basis = cameraBasis(look);
    this.drawTerrain(ctx, eye, basis);
    this.drawLakeAndRunway(ctx, eye, basis);
    this.drawProps(ctx, eye, basis);
    this.drawRings(ctx, eye, basis);
    this.drawAircraft(ctx, eye, basis);
    this.renderOverlay();
    updateHud(this.hud, this.flight, this.mission, this.mission.screen);
  }

  drawTerrain(ctx, eye, basis) {
    const quads = [];
    const grid = this.terrainGrid;
    for (let iz = 0; iz < grid.length - 1; iz += 1) {
      for (let ix = 0; ix < grid[iz].length - 1; ix += 1) {
        const a = grid[iz][ix];
        const b = grid[iz][ix + 1];
        const c = grid[iz + 1][ix + 1];
        const d = grid[iz + 1][ix];
        const cx = (a.x + c.x) / 2;
        const cz = (a.z + c.z) / 2;
        const depth = Math.hypot(cx - eye.x, cz - eye.z);
        if (depth > 1500) continue;
        quads.push({ corners: [a, b, c, d], colour: a.colour, depth });
      }
    }
    quads.sort((p, q) => q.depth - p.depth);
    for (const q of quads) {
      fillProjectedQuad(ctx, this.camera, eye, basis, q.corners, hazeColour(q.colour, q.depth, SKY_HAZE));
    }
  }

  drawLakeAndRunway(ctx, eye, basis) {
    const lc = WORLD.lakeCentre;
    const r = WORLD.lakeRadius;
    const lakeCorners = [];
    for (let i = 0; i < 24; i += 1) {
      const t = (i / 24) * Math.PI * 2;
      lakeCorners.push({ x: lc.x + Math.cos(t) * r, y: WORLD.lakeWaterY, z: lc.z + Math.sin(t) * r });
    }
    drawLake(ctx, this.camera, eye, basis, lakeCorners);
    // Runway: dark asphalt strip with white dashes and threshold bars.
    const corners = runwayCorners();
    fillProjectedQuad(ctx, this.camera, eye, basis, corners, '#3a3f46');
    const hw = WORLD.runwayHalfWidth;
    for (let z = WORLD.runwayStartZ + 12; z < WORLD.runwayEndZ - 8; z += 24) {
      fillProjectedQuad(ctx, this.camera, eye, basis, [
        { x: -1.1, y: 0.55, z }, { x: 1.1, y: 0.55, z },
        { x: 1.1, y: 0.55, z: z + 12 }, { x: -1.1, y: 0.55, z: z + 12 },
      ], '#f4f1e8');
    }
    for (const dz of [0, 1]) {
      const z = dz === 0 ? WORLD.runwayStartZ + 4 : WORLD.runwayEndZ - 8;
      fillProjectedQuad(ctx, this.camera, eye, basis, [
        { x: -hw + 1, y: 0.55, z }, { x: hw - 1, y: 0.55, z },
        { x: hw - 1, y: 0.55, z: z + 4 }, { x: -hw + 1, y: 0.55, z: z + 4 },
      ], '#f4f1e8');
    }
  }

  drawProps(ctx, eye, basis) {
    // Town houses: boxes with coloured walls and pitched or flat roofs.
    const houseFaces = [];
    for (const h of this.props.houses) {
      const depth = Math.hypot(h.x - eye.x, h.z - eye.z);
      if (depth > 900) continue;
      const y0 = h.y;
      const y1 = h.y + h.h;
      const hw = h.w / 2;
      const hd = h.d / 2;
      const wall = '#e8dcc0';
      const roof = h.roof ? '#b0503a' : '#7a7f85';
      houseFaces.push(
        { corners: [{ x: h.x - hw, y: y1, z: h.z - hd }, { x: h.x + hw, y: y1, z: h.z - hd }, { x: h.x + hw, y: y1, z: h.z + hd }, { x: h.x - hw, y: y1, z: h.z + hd }], colour: roof, depth },
        { corners: [{ x: h.x - hw, y: y0, z: h.z - hd }, { x: h.x + hw, y: y0, z: h.z - hd }, { x: h.x + hw, y: y1, z: h.z - hd }, { x: h.x - hw, y: y1, z: h.z - hd }], colour: wall, depth },
        { corners: [{ x: h.x + hw, y: y0, z: h.z - hd }, { x: h.x + hw, y: y0, z: h.z + hd }, { x: h.x + hw, y: y1, z: h.z + hd }, { x: h.x + hw, y: y1, z: h.z - hd }], colour: '#d8cbb0', depth },
      );
    }
    houseFaces.sort((a, b) => b.depth - a.depth);
    for (const f of houseFaces) {
      fillProjectedQuad(ctx, this.camera, eye, basis, f.corners, hazeColour(f.colour, f.depth, SKY_HAZE));
    }
    // Trees: dark green triangles standing on the terrain.
    for (const t of this.props.trees) {
      const depth = Math.hypot(t.x - eye.x, t.z - eye.z);
      if (depth > 700) continue;
      const p = { x: 0, y: 0, depth: 0 };
      const top = projectPoint(this.camera, eye, basis, { x: t.x, y: t.y + t.size, z: t.z }, p);
      if (!top) continue;
      const left = projectPoint(this.camera, eye, basis, { x: t.x - t.size * 0.45, y: t.y, z: t.z }, { x: 0, y: 0, depth: 0 });
      const right = projectPoint(this.camera, eye, basis, { x: t.x + t.size * 0.45, y: t.y, z: t.z }, { x: 0, y: 0, depth: 0 });
      if (!left || !right) continue;
      ctx.fillStyle = hazeColour('#2f6b2f', depth, SKY_HAZE);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawRings(ctx, eye, basis) {
    const rings = this.mission.rings.rings;
    const ordered = rings
      .map((ring) => ({ ring, depth: Math.hypot(ring.x - eye.x, ring.y - eye.y, ring.z - eye.z) }))
      .sort((a, b) => b.depth - a.depth);
    for (const { ring, depth } of ordered) {
      if (depth > 1400) continue;
      const points = ringCirclePoints(ring);
      const isNext = ring === nextRing(this.mission.rings);
      const colour = ring.passed ? '#37c978' : isNext ? '#ff7a1a' : '#ffb37a';
      const width = Math.max(1.5, Math.min(10, 900 / depth));
      strokeProjectedLoop(ctx, this.camera, eye, basis, points, colour, isNext ? width * 1.6 : width);
      if (isNext) {
        // A white inner ring makes the next target read at any distance.
        strokeProjectedLoop(ctx, this.camera, eye, basis, points, 'rgba(255,255,255,0.85)', Math.max(1, width * 0.5));
        this.drawRingLabel(ctx, eye, basis, ring, depth);
      }
    }
  }

  drawRingLabel(ctx, eye, basis, ring, depth) {
    const p = { x: 0, y: 0, depth: 0 };
    if (!projectPoint(this.camera, eye, basis, { x: ring.x, y: ring.y + 22, z: ring.z }, p)) return;
    const size = Math.max(13, Math.min(30, 2600 / depth));
    ctx.font = `bold ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(`RING ${ring.index + 1}`, p.x + 2, p.y + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`RING ${ring.index + 1}`, p.x, p.y);
  }

  drawAircraft(ctx, eye, basis) {
    const f = this.flight;
    const faces = [];
    for (const face of this.aircraftFaces) {
      const world = face.corners.map((c) => {
        const r = rotateAircraftPoint(c, f.yaw, f.pitch, f.roll);
        return { x: r.x + f.x, y: r.y + f.y, z: r.z + f.z };
      });
      const centre = world.reduce((acc, p) => ({ x: acc.x + p.x / 4, y: acc.y + p.y / 4, z: acc.z + p.z / 4 }), { x: 0, y: 0, z: 0 });
      const depth = Math.hypot(centre.x - eye.x, centre.y - eye.y, centre.z - eye.z);
      faces.push({ world, colour: AIRCRAFT_COLOURS[face.colour], shade: face.shade, depth });
    }
    faces.sort((a, b) => b.depth - a.depth);
    for (const face of faces) {
      const shaded = shadeColour(face.colour, face.shade);
      fillProjectedQuad(ctx, this.camera, eye, basis, face.world, shaded);
    }
    // Spinning propeller: two blurred blades at the nose.
    const nose = rotateAircraftPoint({ x: 0, y: 0.15, z: -3.55 }, f.yaw, f.pitch, f.roll);
    const noseWorld = { x: nose.x + f.x, y: nose.y + f.y, z: nose.z + f.z };
    for (const blade of propellerBlades(this.propellerAngle)) {
      const a = rotateAircraftPoint(blade[0], f.yaw, f.pitch, f.roll);
      const b = rotateAircraftPoint(blade[1], f.yaw, f.pitch, f.roll);
      const pa = projectPoint(this.camera, eye, basis, { x: a.x + f.x, y: a.y + f.y, z: a.z + f.z }, { x: 0, y: 0, depth: 0 });
      const pb = projectPoint(this.camera, eye, basis, { x: b.x + f.x, y: b.y + f.y, z: b.z + f.z }, { x: 0, y: 0, depth: 0 });
      if (!pa || !pb) continue;
      ctx.strokeStyle = 'rgba(43,43,43,0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    // Navigation lights: red left wingtip, green right wingtip.
    this.drawNavLight(ctx, eye, basis, { x: -5.4, y: 0.42, z: -0.4 }, '#ff3b30');
    this.drawNavLight(ctx, eye, basis, { x: 5.4, y: 0.42, z: -0.4 }, '#35e065');
    void noseWorld;
  }

  drawNavLight(ctx, eye, basis, local, colour) {
    const r = rotateAircraftPoint(local, this.flight.yaw, this.flight.pitch, this.flight.roll);
    const p = projectPoint(this.camera, eye, basis, { x: r.x + this.flight.x, y: r.y + this.flight.y, z: r.z + this.flight.z }, { x: 0, y: 0, depth: 0 });
    if (!p) return;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  renderOverlay() {
    const screen = this.mission.screen;
    if (screen === SCREENS.TITLE) {
      this.overlay.style.display = 'flex';
      this.overlayTitle.textContent = 'SKYLINE COURIER';
      this.overlayBody.innerHTML =
        'Terbang di atas Lembah Biru: lewati ring oranye, hemat bahan bakar, ' +
        'dan mendarat di runway.<br><br>' +
        MISSIONS.map((m, i) => `<b>${i + 1}. ${m.name}</b> — ${m.blurb}`).join('<br>') +
        '<br><br><b>Enter</b> mulai &nbsp;·&nbsp; <b>W/S</b> throttle &nbsp;·&nbsp; <b>Panah</b> pitch &amp; roll &nbsp;·&nbsp; <b>A/D</b> rudder &nbsp;·&nbsp; <b>Mouse</b> drag untuk belok &nbsp;·&nbsp; <b>R</b> ulang &nbsp;·&nbsp; <b>P</b> jeda &nbsp;·&nbsp; <b>M</b> suara';
      return;
    }
    if (screen === SCREENS.CRASHED || screen === SCREENS.COMPLETE || screen === SCREENS.LANDED) {
      this.overlay.style.display = 'flex';
      if (screen === SCREENS.CRASHED) {
        this.overlayTitle.textContent = 'PESAWAT JATUH';
        this.overlayBody.innerHTML = `Skor ${this.mission.finalScore} — tekan <b>R</b> untuk terbang lagi.`;
      } else if (screen === SCREENS.COMPLETE) {
        this.overlayTitle.textContent = 'MISI SELESAI!';
        this.overlayBody.innerHTML = `Semua ring dilewati dan mendarat dengan selamat.<br>Skor akhir <b>${this.mission.finalScore}</b> — tekan <b>R</b> untuk misi baru.`;
      } else {
        this.overlayTitle.textContent = 'MENDARAT';
        this.overlayBody.innerHTML = `Skor ${this.mission.score} — tekan <b>R</b> untuk terbang lagi.`;
      }
      return;
    }
    this.overlay.style.display = 'none';
  }

  frame(dt) {
    this.update(dt);
    this.render();
  }
}

function lerp3(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

function shadeColour(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((n & 255) * factor));
  return `rgb(${r},${g},${b})`;
}

/** Boot the game, honouring ?shot=<name> for deterministic screenshots. */
function bootSkylineCourier() {
  const canvas = document.getElementById('game');
  const game = new SkylineCourierGame(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    game.shotMode = shot;
    const screen = stageShot(shot, game);
    game.render();
    document.title = `Skyline Courier — shot ${shot}`;
    window.__skylineCourierShot = {
      shot,
      screen,
      ringsPassed: game.mission.ringsPassed,
      ringsTotal: game.mission.rings.rings.length,
      score: game.mission.score,
      fuel: Math.round(game.flight.fuel),
      altitude: Math.round(game.flight.y),
      speed: Math.round(game.flight.speed * 3.6),
      position: { x: Math.round(game.flight.x), y: Math.round(game.flight.y), z: Math.round(game.flight.z) },
      flightTime: Math.round(game.flight.time),
    };
    return game;
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.frame(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return game;
}

bootSkylineCourier();
