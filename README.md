# Umbra

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/bshemphang/umbra/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/bshemphang/umbra/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game that runs entirely offline in a desktop browser.
You are Wren, a shadow-thief in the moonlit Lantern Archive. Slip past the
lantern wardens, lift the Ember Codex, and reach the green exit door unseen.
Built for the [make.fun bounty](https://make.fun/bounty/best-stealth-game-20261121-1759).

## How to play

Open `game/index.html` in desktop Chrome (or serve `game/` with
`node serve.ts` and visit http://localhost:8080).

- **WASD / arrow keys** — move
- **Shift** — run (fast, but loud: wardens hear it)
- **Ctrl / C** — crouch (slow, quiet, harder to see)
- **Mouse click** — throw a pebble to pull a guard away (3 per room)
- **P** — pause · **M** — mute · **R** — retry the room

Wardens patrol with visible vision cones. A glimpse fills their suspicion
meter; a full meter raises the alarm and they chase. Break line of sight
behind shelves, crates and statues, hide inside hedges, and stay in shadow
and out of lantern light — light decides how far they can see. Running
makes noise they can hear. Get caught and the room restarts.

Three rooms, each harder than the last: the Archive, the Gilded Gallery
(two wax seals bar the vault), and the Ember Vault (three seals, four
wardens). Finish unseen for the GHOST rank.

## What's inside

- `game/index.html` + `game/style.css` — the page and HUD
- `game/src/config.js` — constants and the three hand-designed levels
- `game/src/vision.js` — vision cones, line of sight, and light rules
- `game/src/guards.js` — patrol / suspicious / alarm / search AI
- `game/src/player.js` — movement, crouch/run, pebble throws
- `game/src/level.js` — tile maps, collision, objectives
- `game/src/render.js` — canvas drawing: floor, cones, lanterns, darkness
- `game/src/audio.js` — all sound synthesised live with WebAudio
- `game/src/main.js` — game states, loop, input, HUD, screenshot modes

No libraries, no network requests, no build step. All art is drawn on
canvas and all sound is synthesised; everything is original.

## Hand-in

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes
`/output/dossier.json` with `vendor/makefun-game.ts`.

Built for the make.fun competition "Make the best stealth game"
(`best-stealth-game-20261121-1759`).
