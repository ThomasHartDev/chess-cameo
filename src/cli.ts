#!/usr/bin/env node
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Command } from 'commander';
import { getLatestGame, getGameByIndex, getGameByUrl, type ChessComGame } from './chesscom.js';
import { parsePgn } from './game.js';
import { positionAtPercent, framePercents } from './percent.js';
import { renderPng, type RenderOptions } from './render.js';
import { savePin, loadPin, type PinnedGame } from './config.js';
import { startServer } from './server.js';

const program = new Command();
program
  .name('chess-cameo')
  .description('Turn a real chess.com game into a per-percentage board cameo for a video series.')
  .version('0.1.0');

function pinFrom(game: ChessComGame, selector: string): PinnedGame {
  const parsed = parsePgn(game.pgn);
  return {
    source: {
      provider: 'chess.com',
      username: game.white?.username,
      url: game.url,
      selector,
    },
    meta: parsed.meta,
    totalPlies: parsed.totalPlies,
    pgn: game.pgn,
    pinnedAt: new Date().toISOString(),
  };
}

function pinFromPgn(pgn: string, selector: string): PinnedGame {
  const parsed = parsePgn(pgn);
  return {
    source: { provider: 'chess.com', selector },
    meta: parsed.meta,
    totalPlies: parsed.totalPlies,
    pgn,
    pinnedAt: new Date().toISOString(),
  };
}

program
  .command('pin')
  .description('Fetch a game from chess.com and pin it as the series source.')
  .option('-u, --user <username>', 'chess.com username')
  .option('--latest', 'pin the player\'s most recent game')
  .option('--url <gameUrl>', 'pin a specific game url (requires --user)')
  .option('--month <YYYY/MM>', 'archive month for --index (e.g. 2025/01)')
  .option('--index <n>', 'game index within --month (0-based, negatives from end)', parseInt)
  .option('--file <path>', 'pin from a local PGN file (any source: lichess export, etc.)')
  .action(async (o) => {
    if (o.file) {
      const pgn = readFileSync(o.file, 'utf8');
      const pin = pinFromPgn(pgn, `file ${basename(o.file)}`);
      savePin(pin);
      console.log(`Pinned: ${pin.meta.white} vs ${pin.meta.black} (${pin.meta.result})`);
      console.log(`  ${pin.totalPlies} plies · from ${o.file}`);
      console.log(`  saved -> chess-cameo.pin.json`);
      return;
    }
    let game: ChessComGame;
    let selector: string;
    if (o.url) {
      game = await getGameByUrl(o.url);
      selector = `url ${o.url}`;
    } else if (o.month && o.index !== undefined) {
      const [y, m] = String(o.month).split('/').map(Number);
      game = await getGameByIndex(o.user, y, m, o.index);
      selector = `${o.user} ${o.month} #${o.index}`;
    } else {
      if (!o.user) throw new Error('Provide --user (with --latest, or --month + --index).');
      game = await getLatestGame(o.user);
      selector = `${o.user} latest`;
    }
    const pin = pinFrom(game, selector);
    savePin(pin);
    console.log(`Pinned: ${pin.meta.white} vs ${pin.meta.black} (${pin.meta.result})`);
    console.log(`  ${pin.totalPlies} plies · ECO ${pin.meta.eco ?? '?'} · ${game.url}`);
    console.log(`  saved -> chess-cameo.pin.json`);
  });

program
  .command('info')
  .description('Show the pinned game and what a given percentage resolves to.')
  .option('--pct <n>', 'preview the position at this percentage', parseFloat)
  .action((o) => {
    const pin = loadPin();
    const game = parsePgn(pin.pgn);
    console.log(`${pin.meta.white} vs ${pin.meta.black} — ${pin.meta.result}`);
    console.log(`${pin.totalPlies} plies (${Math.ceil(pin.totalPlies / 2)} moves) · ${pin.source.selector}`);
    if (o.pct !== undefined) {
      const r = positionAtPercent(game, o.pct);
      console.log(`\n${r.caption}`);
      console.log(`FEN: ${r.position.fen}`);
    }
  });

function renderOpts(o: Record<string, unknown>, caption: string | null, sub: string | null): RenderOptions {
  return {
    size: o.size ? Number(o.size) : 720,
    orientation: (o.flip ? 'black' : 'white') as 'white' | 'black',
    coordinates: o.coords !== false,
    caption,
    subCaption: sub,
    transparent: Boolean(o.transparent),
  };
}

program
  .command('render')
  .description('Render the board at one percentage to a PNG.')
  .requiredOption('--pct <n>', 'game progress percentage (0-100)', parseFloat)
  .option('-o, --out <file>', 'output png path', 'out/board.png')
  .option('--size <px>', 'board edge in px', '720')
  .option('--flip', 'orient with black at the bottom')
  .option('--no-coords', 'hide file/rank coordinates')
  .option('--no-caption', 'hide the caption band')
  .option('--transparent', 'transparent background')
  .action((o) => {
    const pin = loadPin();
    const game = parsePgn(pin.pgn);
    const r = positionAtPercent(game, o.pct);
    const caption = o.caption === false ? null : r.caption;
    const sub = o.caption === false ? null : `${pin.meta.white} vs ${pin.meta.black}`;
    const png = renderPng(r.position, renderOpts(o, caption, sub));
    mkdirSync(join(o.out, '..'), { recursive: true });
    writeFileSync(o.out, png);
    console.log(`${r.caption} -> ${o.out} (${png.length} bytes)`);
  });

program
  .command('frames')
  .description('Render an evenly spaced sequence of boards (for an animated cameo).')
  .requiredOption('--count <n>', 'number of frames (>= 2)', parseInt)
  .option('-d, --dir <dir>', 'output directory', 'out/frames')
  .option('--size <px>', 'board edge in px', '720')
  .option('--flip', 'orient with black at the bottom')
  .option('--no-coords', 'hide file/rank coordinates')
  .option('--no-caption', 'hide the caption band')
  .option('--transparent', 'transparent background')
  .action((o) => {
    const pin = loadPin();
    const game = parsePgn(pin.pgn);
    mkdirSync(o.dir, { recursive: true });
    const pcts = framePercents(o.count);
    pcts.forEach((pct, i) => {
      const r = positionAtPercent(game, pct);
      const caption = o.caption === false ? null : r.caption;
      const sub = o.caption === false ? null : `${pin.meta.white} vs ${pin.meta.black}`;
      const png = renderPng(r.position, renderOpts(o, caption, sub));
      const name = join(o.dir, `frame-${String(i).padStart(4, '0')}.png`);
      writeFileSync(name, png);
      console.log(`  ${r.caption} -> ${name}`);
    });
    console.log(`\n${pcts.length} frames -> ${o.dir}`);
  });

program
  .command('serve')
  .description('Start the local web scrubber: drag a percentage slider, preview + export frames.')
  .option('-p, --port <n>', 'port', (v) => parseInt(v, 10), 4180)
  .action((o) => {
    startServer(o.port);
  });

program.parseAsync().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
