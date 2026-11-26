// missions.js — the sortie state machine: title, flying, landed, crashed,
// complete. It owns the score, the mission clock and the message line the
// pilot reads; the flight model itself lives in physics.js.
import { MISSIONS, SCORE } from './config.js';
import { createRingSet, nextRing } from './rings.js';

export const SCREENS = {
  TITLE: 'title',
  FLYING: 'flying',
  LANDED: 'landed',
  CRASHED: 'crashed',
  COMPLETE: 'complete',
};

export function createMissionState(missionIndex = 0) {
  const mission = MISSIONS[missionIndex];
  return {
    missionIndex,
    mission,
    rings: createRingSet(mission),
    screen: SCREENS.TITLE,
    score: 0,
    message: '',
    messageUntil: 0,
    flightTime: 0,
    ringsPassed: 0,
    landingQuality: null,
    finalScore: 0,
  };
}

export function missionObjectiveText(state) {
  const ring = nextRing(state.rings);
  if (state.screen === SCREENS.TITLE) return `Misi: ${state.mission.name} — ${state.mission.blurb}`;
  if (ring) return `Ring ${ring.index + 1}/${state.rings.rings.length} — terbang melewati ring oranye`;
  if (state.screen === SCREENS.FLYING) return 'Semua ring dilewati — mendarat di runway (garis putih di utara)';
  return '';
}

export function showMessage(state, text, seconds = 4) {
  state.message = text;
  state.messageUntil = state.flightTime + seconds;
}

export function onRingPassed(state) {
  state.ringsPassed += 1;
  state.score += SCORE.ringPoints;
  const left = state.rings.rings.length - state.ringsPassed;
  showMessage(
    state,
    left > 0 ? `Ring dilewati! +${SCORE.ringPoints} poin — ${left} ring lagi` : `Semua ring dilewati! Mendarat di runway untuk menyelesaikan misi`,
    4,
  );
}

/** Called when the flight model reports a landing; returns the final score. */
export function onLanded(state, flight) {
  const soft = -flight.verticalSpeed < 2.5;
  state.landingQuality = soft ? 'perfect' : 'ok';
  let bonus = SCORE.landingPoints;
  if (soft) bonus += SCORE.perfectLandingBonus;
  bonus += Math.round(flight.fuel * SCORE.fuelBonusPerUnit);
  bonus += Math.max(0, Math.round((300 - state.flightTime) * SCORE.timeBonusPerSecond));
  state.score += bonus;
  state.finalScore = state.score;
  state.screen = state.ringsPassed >= state.rings.rings.length ? SCREENS.COMPLETE : SCREENS.LANDED;
  showMessage(
    state,
    state.screen === SCREENS.COMPLETE
      ? `MISI SELESAI! Bonus pendaratan +${bonus} — skor akhir ${state.score}`
      : `Mendarat — tapi ${state.rings.rings.length - state.ringsPassed} ring belum dilewati. Bonus +${bonus}`,
    8,
  );
  return state.score;
}

export function onCrashed(state) {
  state.screen = SCREENS.CRASHED;
  state.finalScore = state.score;
  showMessage(state, 'PESAWAT JATUH! Tekan R untuk terbang lagi.', 10);
}

/** Switch to another mission (keys 1-3 on the title screen). */
export function selectMission(state, index) {
  if (index < 0 || index >= MISSIONS.length) return state;
  return createMissionState(index);
}
