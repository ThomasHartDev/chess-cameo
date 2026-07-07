// Maps a 0-100 progress percentage onto an exact position in the game.
import type { ParsedGame, Position } from './game.js';

export interface PercentResult {
  pct: number;
  position: Position;
  totalPlies: number;
  /** Human caption e.g. "42% · move 14 · Nf3". */
  caption: string;
}

/** Clamp helper. */
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * pct -> ply -> position. 0% is the starting board, 100% is the final position.
 * The mapping is deterministic: ply = round(pct/100 * totalPlies).
 */
export function positionAtPercent(game: ParsedGame, pct: number): PercentResult {
  const p = clamp(pct, 0, 100);
  const ply = Math.round((p / 100) * game.totalPlies);
  const position = game.positions[ply];
  const moveLabel = position.san
    ? `${position.moved === 'b' ? '…' : ''}${position.san}`
    : 'start';
  return {
    pct: p,
    position,
    totalPlies: game.totalPlies,
    caption: `${Math.round(p)}% · move ${position.moveNumber} · ${moveLabel}`,
  };
}

/** Evenly spaced percentages for a frame sequence, inclusive of 0 and 100. */
export function framePercents(count: number): number[] {
  if (count < 2) return [100];
  return Array.from({ length: count }, (_, i) => (i / (count - 1)) * 100);
}
