import { describe, expect, it } from 'vitest';
import { materialScore, evalSwingBeats, swingsFromPgn } from '../src/eval-swings.js';
import { parsePgn } from '../src/game.js';

// Scholar's mate style short game ending 1-0 (White wins).
const WHITE_WIN_PGN = `
[Event "Test"]
[White "Interviewee"]
[Black "Interviewer"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
`;

// Fool's mate Black wins — should still parse swings but result is 0-1.
const BLACK_WIN_PGN = `
[Event "Test"]
[White "W"]
[Black "B"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1
`;

describe('materialScore', () => {
  it('is zero at start', () => {
    expect(materialScore('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(0);
  });

  it('goes positive when Black is down material', () => {
    // White queen, Black no queen
    const fen = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(materialScore(fen)).toBeGreaterThan(500);
  });
});

describe('evalSwingBeats', () => {
  it('assigns interviewee on white-favored / equal and interviewer on black-favored', () => {
    const game = parsePgn(WHITE_WIN_PGN);
    const beats = evalSwingBeats(game, { maxBeats: 10, margin: 50 });
    expect(beats.length).toBeGreaterThanOrEqual(2);
    expect(beats[0]!.ply).toBe(0);
    // Final beat must be interviewee for the “White wins last word” contract.
    expect(beats[beats.length - 1]!.speaker).toBe('interviewee');
  });

  it('swingsFromPgn returns beats for a white-win miniature', () => {
    const beats = swingsFromPgn(WHITE_WIN_PGN, 8);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats.every((b) => b.caption.length > 0)).toBe(true);
  });

  it('still produces beats for black-win games (caller filters result)', () => {
    const game = parsePgn(BLACK_WIN_PGN);
    const beats = evalSwingBeats(game, { maxBeats: 6 });
    expect(beats.length).toBeGreaterThan(0);
  });
});
