/**
 * Chess → interview beats via evaluation swings (not series percentages).
 * Interviewee = White; Interviewer = Black.
 * Only White-win games so the last spoken beat can be an interviewee answer.
 */
import { Chess } from 'chess.js';
import type { ParsedGame, Position } from './game.js';

export type Speaker = 'interviewer' | 'interviewee';

export interface EvalSwingBeat {
  /** Index into game.positions */
  ply: number;
  position: Position;
  /** Rough centipawn-ish material score: White positive. */
  score: number;
  /** Side currently favored (score > 0 → white). */
  favored: 'w' | 'b' | 'equal';
  speaker: Speaker;
  caption: string;
}

const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

/** Material score in "centipawns" (White − Black). */
export function materialScore(fen: string): number {
  const board = fen.split(' ')[0] ?? '';
  let score = 0;
  for (const ch of board) {
    if (ch === '/' || ch >= '1' && ch <= '8') continue;
    const lower = ch.toLowerCase();
    const v = PIECE_VALUE[lower];
    if (v == null) continue;
    score += ch === lower ? -v : v;
  }
  return score;
}

function favoredOf(score: number, margin = 80): 'w' | 'b' | 'equal' {
  if (score > margin) return 'w';
  if (score < -margin) return 'b';
  return 'equal';
}

/**
 * Walk plies and emit beats when the favored side flips, or at start/end.
 * Equal stretches inherit the previous speaker so we don't spam.
 */
export function evalSwingBeats(
  game: ParsedGame,
  opts: { maxBeats?: number; margin?: number } = {},
): EvalSwingBeat[] {
  const maxBeats = opts.maxBeats ?? 12;
  const margin = opts.margin ?? 80;
  if (game.meta.result && game.meta.result !== '1-0' && game.meta.result !== '*') {
    // Soft allow '*" for drafts; hard prefer 1-0 at generate time.
  }

  const scored = game.positions.map((position) => ({
    position,
    score: materialScore(position.fen),
  }));

  const raw: EvalSwingBeat[] = [];
  let lastFav: 'w' | 'b' | 'equal' = 'equal';

  for (let i = 0; i < scored.length; i++) {
    const { position, score } = scored[i]!;
    const favored = favoredOf(score, margin);
    const isEnd = i === scored.length - 1;
    const isStart = i === 0;
    const flipped = favored !== 'equal' && favored !== lastFav;

    if (isStart || isEnd || flipped) {
      const speaker: Speaker =
        favored === 'b' ? 'interviewer' : 'interviewee'; // white or equal → interviewee
      const moveLabel = position.san
        ? `${position.moved === 'b' ? '…' : ''}${position.san}`
        : 'start';
      raw.push({
        ply: position.ply,
        position,
        score,
        favored,
        speaker,
        caption: `ply ${position.ply} · m${position.moveNumber} · ${moveLabel} · ${
          favored === 'w' ? 'White+' : favored === 'b' ? 'Black+' : '='
        }${score >= 0 ? '+' : ''}${score}`,
      });
      if (favored !== 'equal') lastFav = favored;
    }
  }

  // Ensure last beat is interviewee (White wins narrative).
  if (raw.length && raw[raw.length - 1]!.speaker !== 'interviewee') {
    const lastPos = game.positions[game.positions.length - 1]!;
    raw.push({
      ply: lastPos.ply,
      position: lastPos,
      score: materialScore(lastPos.fen),
      favored: 'w',
      speaker: 'interviewee',
      caption: `final · White wins · ${game.meta.result}`,
    });
  }

  // Thin to maxBeats keeping first, last, and evenly spaced middle.
  if (raw.length <= maxBeats) return raw;
  const out: EvalSwingBeat[] = [raw[0]!];
  const mid = raw.slice(1, -1);
  const need = maxBeats - 2;
  for (let k = 0; k < need; k++) {
    const idx = Math.round((k / Math.max(1, need - 1)) * (mid.length - 1));
    const b = mid[idx];
    if (b && out[out.length - 1]!.ply !== b.ply) out.push(b);
  }
  const last = raw[raw.length - 1]!;
  if (out[out.length - 1]!.ply !== last.ply) out.push(last);
  return out;
}

/** Reject games that are not White wins (strict). */
export function assertWhiteWin(game: ParsedGame): void {
  if (game.meta.result !== '1-0') {
    throw new Error(
      `Need a White-win game (1-0); got result=${game.meta.result} (${game.meta.white} vs ${game.meta.black})`,
    );
  }
}

/** Tiny sanity: parse PGN and require at least one swing beat. */
export function swingsFromPgn(pgn: string, maxBeats = 8): EvalSwingBeat[] {
  // Lazy import parse via chess replay here to avoid circular deps in tests —
  // callers pass ParsedGame. This helper is for scripts only.
  const chess = new Chess();
  chess.loadPgn(pgn, { strict: false });
  // Re-parse through positions list
  const moves = chess.history({ verbose: true });
  const replay = new Chess();
  const positions: Position[] = [
    { ply: 0, moveNumber: 1, fen: replay.fen(), san: null, lastMove: null, moved: null },
  ];
  moves.forEach((m, i) => {
    replay.move(m.san);
    positions.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      fen: replay.fen(),
      san: m.san,
      lastMove: { from: m.from, to: m.to },
      moved: m.color,
    });
  });
  const header = chess.header();
  const game: ParsedGame = {
    meta: {
      white: header.White ?? 'White',
      black: header.Black ?? 'Black',
      result: header.Result ?? '*',
      date: header.Date ?? null,
      eco: header.ECO ?? null,
      event: header.Event ?? null,
    },
    positions,
    totalPlies: moves.length,
  };
  return evalSwingBeats(game, { maxBeats });
}
