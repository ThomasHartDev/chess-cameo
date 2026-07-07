# chess-cameo

Turn a real chess.com game into a board you can drop into a video series, one frame per
percentage of the game. Give it a percentage (0–100) and it renders the exact position the
game was in at that point. Progress the same game across a run of videos as a recurring cameo.

## How the percentage maps to a position

A game is a list of half-moves (plies). `chess-cameo` replays the PGN and records the board
after every ply. A percentage maps to an exact ply:

```
ply = round(pct / 100 * totalPlies)
```

So 0% is the starting position, 100% is the final position, and 42% is one specific,
deterministic board state. Same percentage in, same board out.

## Setup

```bash
pnpm install
pnpm fetch-pieces   # one-time: downloads the public-domain Cburnett piece set into assets/
```

## Pin a game (the series source)

Fetches a game from the chess.com public API and saves it to `chess-cameo.pin.json`. Every
render reads that file, so the whole series renders off one stable game with no network calls.

```bash
# the player's most recent game
pnpm cli pin --user hikaru --latest

# a specific game from a month's archive (0-based; negatives count from the end)
pnpm cli pin --user hikaru --month 2025/01 --index 0

# a specific game url (pair with --user)
pnpm cli pin --user hikaru --url https://www.chess.com/game/live/129688175007
```

## Render

```bash
# one board at 42% of the game
pnpm cli render --pct 42 --out out/board.png

# options
pnpm cli render --pct 60 --size 1080 --flip --transparent --no-caption --out out/b.png

# see what a percentage resolves to without rendering
pnpm cli info --pct 42
```

`--flip` orients Black at the bottom · `--transparent` drops the background (board squares
stay) for compositing · `--no-caption` / `--no-coords` strip the caption band / coordinates.

## Animated cameo (frame sequence)

```bash
pnpm cli frames --count 120 --dir out/frames --size 1080
# stitch to mp4 (needs ffmpeg on PATH)
ffmpeg -framerate 30 -i out/frames/frame-%04d.png -c:v libx264 -pix_fmt yuv420p out/cameo.mp4
```

## Data source

chess.com [Published-Data API](https://www.chess.com/news/view/published-data-api) — public,
no auth, just a User-Agent. Games carry full PGN, so any public game is fair game.

## System Design, Out Loud (video episodes)

The chess cameo exists to ride along in a video series. `src/episode/` turns a system-design
topic into a full business-day episode: a spoken script, Remotion-rendered 1920x1080 TV frames
(the architecture diagram builds up beat by beat), and the chess board cameo per frame. The game
advances continuously across every episode of the series, 0% to 100%.

```bash
pnpm exec tsx src/cli.ts pin --user hikaru --month 2025/01 --index 0   # pin the cameo game
pnpm exec tsx src/episode/generate.ts --start 2026-07-07 --count 5     # 5 business-day episodes
bash scripts/push-to-laptop.sh                                         # ship to the laptop Desktop
```

Each episode lands in `out/episodes/<date>/` with `script.md`, `frames/beat-NN.png`,
`chess/beat-NN.png`, and `episode.json`. Topics live in `src/episode/topics.ts`; the frame layout
is `remotion/TVFrame.tsx`. See the `system-design-cast` skill for the full workflow.

## Library use

```ts
import { parsePgn } from './src/game.js';
import { positionAtPercent } from './src/percent.js';
import { renderPng } from './src/render.js';

const game = parsePgn(pgn);
const { position, caption } = positionAtPercent(game, 42);
const png = renderPng(position, { size: 1080, caption });
```
