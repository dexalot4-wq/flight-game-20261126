// main.ts — the hand-in program for Skyline Courier (Node 22, stdlib only).
// It copies this repository's game/ and screenshots/ into /output and writes
// /output/dossier.json with the kit's vendored library, exactly the summary
// the judge reads. The program runs twice in the grader and both runs must
// write the same bytes, so it does nothing time- or order-dependent: the
// copies are plain file copies and the dossier is built from those copies.
//
// Serve the game locally with `node serve.mjs`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Refuse to hand in a half-built entry: the game entrypoint and at least
// three screenshots must be present before anything is written.
const indexHtml = join(here, 'game', 'index.html');
if (!existsSync(indexHtml)) throw new Error('game/index.html is missing');
const shotDir = join(here, 'screenshots');
const shots = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => !name.startsWith('.') && statSync(join(shotDir, name)).isFile())
  : [];
if (shots.length < 3) throw new Error(`need at least 3 screenshots, found ${shots.length}`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
