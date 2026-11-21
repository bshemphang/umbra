// Umbra — the hand-in program (Node 22, standard library only).
//
// It gathers the entry's pieces from beside this file and lays them out in
// the output directory the grader reads: the playable game under game/, the
// screenshots under screenshots/, and a dossier.json that summarises both,
// written by make.fun's own library so the scorer can check it byte for byte.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used instead.
// The run is deterministic: the same repository always writes the same bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean slate so a stale file from an earlier run can never
// leak into this one.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// The game: plain static files, no build step.
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

// The screenshots, when they exist. The dossier step below refuses an
// entry with none, so a missing folder fails loudly here instead of
// silently handing in a screenshot-less entry.
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
} else {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
}

// The dossier: the judge's view of the game, capped to the bounty's limits.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
