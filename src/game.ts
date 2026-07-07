// PGN -> a flat list of positions, one per half-move (ply), plus game metadata.
// Everything downstream (percentage -> board) works off this positions array.
import { Chess } from 'chess.js';

export interface Position {
  /** 0 = starting position, 1 = after White's first move, ... up to total plies. */
  ply: number;
  /** Full-move number this ply belongs to (1-based). */
  moveNumber: number;
  fen: string;
  /** SAN of the move that produced this position (null for ply 0). */
  san: string | null;
  /** Squares of the last move, for highlighting (null for ply 0). */
  lastMove: { from: string; to: string } | null;
  /** Side that just moved: 'w' | 'b' (null for ply 0). */
  moved: 'w' | 'b' | null;
}

export interface GameMeta {
  white: string;
  black: string;
  result: string;
  date: string | null;
  eco: string | null;
  event: string | null;
}

export interface ParsedGame {
  meta: GameMeta;
  positions: Position[];
  /** Total number of plies (half-moves). positions has totalPlies + 1 entries. */
  totalPlies: number;
}

export function parsePgn(pgn: string): ParsedGame {
  const loader = new Chess();
  loader.loadPgn(pgn, { strict: false });
  const header = loader.header();
  const moves = loader.history({ verbose: true });

  const replay = new Chess();
  const positions: Position[] = [
    { ply: 0, moveNumber: 1, fen: replay.fen(), san: null, lastMove: null, moved: null },
  ];

  moves.forEach((m, i) => {
    replay.move(m.san);
    const ply = i + 1;
    positions.push({
      ply,
      moveNumber: Math.floor(i / 2) + 1,
      fen: replay.fen(),
      san: m.san,
      lastMove: { from: m.from, to: m.to },
      moved: m.color,
    });
  });

  return {
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
}
