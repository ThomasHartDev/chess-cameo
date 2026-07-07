import { describe, it, expect } from 'vitest';
import { parsePgn } from '../src/game.js';
import { positionAtPercent, framePercents } from '../src/percent.js';

// Scholar's mate: 7 plies, ends in checkmate.
const PGN = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

describe('parsePgn', () => {
  const game = parsePgn(PGN);

  it('counts plies and builds positions + 1', () => {
    expect(game.totalPlies).toBe(7);
    expect(game.positions).toHaveLength(8);
  });

  it('reads headers', () => {
    expect(game.meta.white).toBe('Alice');
    expect(game.meta.black).toBe('Bob');
    expect(game.meta.result).toBe('1-0');
  });

  it('ply 0 is the standard start with no last move', () => {
    expect(game.positions[0].fen.startsWith('rnbqkbnr/pppppppp')).toBe(true);
    expect(game.positions[0].lastMove).toBeNull();
    expect(game.positions[0].san).toBeNull();
  });

  it('records SAN, side, and last-move squares per ply', () => {
    expect(game.positions[1].san).toBe('e4');
    expect(game.positions[1].moved).toBe('w');
    expect(game.positions[1].lastMove).toEqual({ from: 'e2', to: 'e4' });
    expect(game.positions[7].san).toBe('Qxf7#');
    expect(game.positions[7].moved).toBe('w');
  });
});

describe('positionAtPercent', () => {
  const game = parsePgn(PGN);

  it('0% is the start, 100% is the final position', () => {
    expect(positionAtPercent(game, 0).position.ply).toBe(0);
    expect(positionAtPercent(game, 100).position.ply).toBe(7);
  });

  it('maps deterministically: ply = round(pct/100 * total)', () => {
    // 50% of 7 plies = 3.5 -> rounds to 4
    expect(positionAtPercent(game, 50).position.ply).toBe(4);
    // 25% of 7 = 1.75 -> 2
    expect(positionAtPercent(game, 25).position.ply).toBe(2);
  });

  it('clamps out-of-range percentages', () => {
    expect(positionAtPercent(game, -20).position.ply).toBe(0);
    expect(positionAtPercent(game, 250).position.ply).toBe(7);
  });

  it('captions use … only for Black moves', () => {
    expect(positionAtPercent(game, 100).caption).toContain('Qxf7#');
    expect(positionAtPercent(game, 100).caption).not.toContain('…');
    // ply 2 is Black's e5
    const black = positionAtPercent(game, 100 * (2 / 7));
    expect(black.caption).toContain('…');
  });
});

describe('framePercents', () => {
  it('is inclusive of 0 and 100 and evenly spaced', () => {
    expect(framePercents(5)).toEqual([0, 25, 50, 75, 100]);
    expect(framePercents(1)).toEqual([100]);
  });
});
