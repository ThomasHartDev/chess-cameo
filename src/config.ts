// Persists the *pinned* game so a whole video series renders off one stable source.
// `pin` writes it; `render`/`frames`/`info` read it. No network at render time.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GameMeta } from './game.js';

export const PIN_FILE = join(process.cwd(), 'chess-cameo.pin.json');

export interface PinnedGame {
  source: {
    provider: 'chess.com';
    username?: string;
    url?: string;
    selector: string; // human description of how it was chosen
  };
  meta: GameMeta;
  totalPlies: number;
  pgn: string;
  pinnedAt: string;
}

export function savePin(pin: PinnedGame, file = PIN_FILE): void {
  writeFileSync(file, JSON.stringify(pin, null, 2) + '\n', 'utf8');
}

export function loadPin(file = PIN_FILE): PinnedGame {
  if (!existsSync(file)) {
    throw new Error(
      `No pinned game at ${file}. Run \`chess-cameo pin --user <name> --latest\` first.`,
    );
  }
  return JSON.parse(readFileSync(file, 'utf8')) as PinnedGame;
}
