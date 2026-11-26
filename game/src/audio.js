// audio.js — all sound is synthesized with WebAudio: engine hum, wind and
// chimes. No audio files are loaded, so the game stays fully offline.
export function createAudioEngine() {
  return {
    ctx: null,
    engineOsc: null,
    engineGain: null,
    windGain: null,
    muted: false,
    started: false,
  };
}

/** Start the audio graph on the first user gesture (browsers require it). */
export function startAudio(engine) {
  if (engine.started) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    engine.ctx = ctx;
    // Engine: two detuned sawtooth oscillators through a low-pass filter.
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 70;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 105;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    // Wind: looped filtered noise from a generated buffer.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 500;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.0;
    noise.connect(noiseFilter);
    noiseFilter.connect(windGain);
    windGain.connect(ctx.destination);
    noise.start();
    engine.engineOsc = osc1;
    engine.engineOsc2 = osc2;
    engine.engineGain = gain;
    engine.windGain = windGain;
    engine.started = true;
  } catch {
    engine.started = false;
  }
}

/** Follow the flight state: louder and higher with throttle and speed. */
export function updateAudio(engine, flight) {
  if (!engine.started || engine.muted) {
    if (engine.engineGain) engine.engineGain.gain.value = 0;
    if (engine.windGain) engine.windGain.gain.value = 0;
    return;
  }
  const t = engine.ctx.currentTime;
  engine.engineOsc.frequency.setTargetAtTime(55 + flight.throttle * 90, t, 0.1);
  engine.engineOsc2.frequency.setTargetAtTime(82 + flight.throttle * 130, t, 0.1);
  engine.engineGain.gain.setTargetAtTime(0.03 + flight.throttle * 0.05, t, 0.1);
  engine.windGain.gain.setTargetAtTime(Math.min(0.09, flight.speed * 0.0012), t, 0.2);
}

/** A short two-note chime when a ring is passed. */
export function playRingChime(engine) {
  if (!engine.started || engine.muted) return;
  const ctx = engine.ctx;
  [880, 1318].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + i * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.09 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.09);
    osc.stop(ctx.currentTime + i * 0.09 + 0.55);
  });
}

/** A low thud when the plane crashes or lands hard. */
export function playThud(engine) {
  if (!engine.started || engine.muted) return;
  const ctx = engine.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.45);
}

export function toggleMute(engine) {
  engine.muted = !engine.muted;
  return engine.muted;
}
