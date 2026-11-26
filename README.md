# Skyline Courier — Terbang di atas Lembah Biru

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/dexalot4-wq/flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/dexalot4-wq/flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete 3D flight game built for the [make.fun bounty "Make the best flight game"](https://make.fun/bounty/best-flight-game-20261126-0057) ($500 pool, 50 paid places).

Fly a red courier plane over the Blue Valley: pass the orange rings in order, mind your fuel, and land back on the runway. The valley is procedural — snowy peaks around the rim, a lake, a small town, pine forests — and the plane is a real flight model: throttle, pitch, roll and rudder, stall below flying speed, and landings that read as landings (or crashes).

## Play

Three sorties, picked with **1 / 2 / 3** on the title screen:

1. **Kurir Lembah** — eight rings through the valley, then land.
2. **Patroli Danau** — five low rings over the Blue Lake, then land.
3. **Lintas Puncak** — six high rings over the eastern peaks, then land.

Each ring is worth 100 points. A landing pays 500, plus a perfect-landing bonus, a fuel bonus and a time bonus. Landing off the runway, or hitting the ground hard or wing-low, ends the sortie.

Open `game/index.html` in a desktop browser (or serve `game/` with any static server — `node serve.mjs`), no network needed. All art is drawn by the game's own software 3D renderer on a 2D canvas (no WebGL required); all sounds are synthesized with WebAudio. No assets are loaded.

- **W / S:** throttle up / down
- **Arrow Up / Down:** pitch (nose up / down)
- **Arrow Left / Right:** roll (bank to turn)
- **A / D:** rudder
- **Mouse drag:** steer like the arrow keys
- **Enter:** start · **R:** fly again · **P:** pause · **M:** mute

## Layout

- `game/index.html` — page + HUD (altitude, speed, heading, throttle, fuel, damage, compass, artificial horizon)
- `game/style.css` — cockpit chrome
- `game/src/main.js` — scene assembly, frame loop, chase camera, rendering
- `game/src/renderer.js` — software 3D projector: sky, terrain, lake, runway, rings, aircraft
- `game/src/terrain.js` — the valley: height field, lake, town, runway, trees
- `game/src/aircraft.js` — the courier plane, built from its own 3D polygons
- `game/src/physics.js` — arcade flight model: throttle, pitch, roll, rudder, stall, landing/crash
- `game/src/rings.js` — target rings and the pass check
- `game/src/missions.js` — sortie state machine, scoring, messages
- `game/src/shots.js` — deterministic screenshot scenes (real rules, autopilot)
- `game/src/input.js` — keyboard + mouse
- `game/src/hud.js` — instruments
- `game/src/audio.js` — synthesized engine, wind, chimes
- `game/src/config.js` — every tunable number in one place
- `main.ts` — hand-in program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json` (Node 22, stdlib only)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## Verify locally

```sh
node serve.mjs            # game/ on http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```

Screenshots in `screenshots/` are real renders of the game's own code, taken in a
browser with `?shot=start|play|rings|end` (see `shots.json`).
