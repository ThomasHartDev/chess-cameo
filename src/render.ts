// FEN -> SVG board -> PNG. Squares + pieces need no fonts; coordinates/caption use a
// system font when one is available (they degrade gracefully if not).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { Position } from './game.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PIECES_DIR = join(MODULE_DIR, '..', 'assets', 'pieces');

export interface Theme {
  light: string;
  dark: string;
  highlight: string; // last-move overlay (rgba)
  boardBg: string; // margin/coordinate strip
  text: string;
  captionBg: string;
}

export const DEFAULT_THEME: Theme = {
  light: '#efe7d3',
  dark: '#9a7b5b',
  highlight: 'rgba(255, 214, 92, 0.55)',
  boardBg: '#16130f',
  text: '#efe7d3',
  captionBg: '#16130f',
};

export interface RenderOptions {
  size?: number; // board edge in px (excludes caption band)
  orientation?: 'white' | 'black';
  coordinates?: boolean;
  highlightLastMove?: boolean;
  caption?: string | null;
  subCaption?: string | null; // e.g. "White v Black"
  theme?: Partial<Theme>;
  transparent?: boolean; // no background fill (board squares still drawn)
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// FEN piece char -> asset filename code.
function pieceCode(ch: string): string {
  const color = ch === ch.toUpperCase() ? 'w' : 'b';
  return `${color}${ch.toUpperCase()}`;
}

const pieceCache = new Map<string, string>();
function pieceInner(code: string): string {
  if (pieceCache.has(code)) return pieceCache.get(code)!;
  const raw = readFileSync(join(PIECES_DIR, `${code}.svg`), 'utf8');
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  pieceCache.set(code, inner);
  return inner;
}

/** Parse the placement field of a FEN into an 8x8 grid [rank0=8th rank][file0=a]. */
function parsePlacement(fen: string): (string | null)[][] {
  const placement = fen.split(' ')[0];
  const rows = placement.split('/');
  return rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}

let fontWarned = false;
function systemFontDirs(): string[] {
  return ['/usr/share/fonts', '/usr/local/share/fonts', `${process.env.HOME}/.fonts`].filter(
    (d) => d && existsSync(d),
  );
}

export function buildSvg(position: Position, opts: RenderOptions = {}): string {
  const size = opts.size ?? 720;
  const orientation = opts.orientation ?? 'white';
  const coords = opts.coordinates ?? true;
  const highlight = opts.highlightLastMove ?? true;
  const theme = { ...DEFAULT_THEME, ...(opts.theme ?? {}) };
  const cell = size / 8;

  const captionH = opts.caption ? Math.round(size * 0.11) : 0;
  const totalH = size + captionH;

  const grid = parsePlacement(position.fen);

  // Map a board square (file 0-7 a..h, rank 0-7 where 0 is rank 1) to px, honoring orientation.
  const toXY = (fileIdx: number, rankIdx: number) => {
    const col = orientation === 'white' ? fileIdx : 7 - fileIdx;
    const row = orientation === 'white' ? 7 - rankIdx : rankIdx;
    return { x: col * cell, y: row * cell, col, row };
  };

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${totalH}" viewBox="0 0 ${size} ${totalH}">`,
  );
  if (!opts.transparent) {
    parts.push(`<rect width="${size}" height="${totalH}" fill="${theme.boardBg}"/>`);
  }

  const hi = highlight && position.lastMove ? position.lastMove : null;
  const fs = Math.max(10, Math.round(cell * 0.19));

  // Squares + pieces + edge coordinates in one pass. grid[r][f]: r=0 is 8th rank
  // (top of FEN), f=0 is a-file. Coordinates are drawn on the actual bottom display
  // row / left display column so their contrast colour is always correct in either
  // orientation (a label sits on a square whose colour we already know here).
  for (let r = 0; r < 8; r++) {
    const rankIdx = 7 - r; // 0-based rank where 0 == rank 1
    for (let f = 0; f < 8; f++) {
      const { x, y, col, row } = toXY(f, rankIdx);
      const isLight = (rankIdx + f) % 2 === 1;
      parts.push(
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${isLight ? theme.light : theme.dark}"/>`,
      );
      const squareName = `${FILES[f]}${rankIdx + 1}`;
      if (hi && (hi.from === squareName || hi.to === squareName)) {
        parts.push(
          `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${theme.highlight}"/>`,
        );
      }
      const piece = grid[r][f];
      if (piece) {
        const pad = cell * 0.04;
        const s = cell - pad * 2;
        parts.push(
          `<svg x="${x + pad}" y="${y + pad}" width="${s}" height="${s}" viewBox="0 0 45 45">${pieceInner(
            pieceCode(piece),
          )}</svg>`,
        );
      }
      if (coords) {
        const labelColor = isLight ? theme.dark : theme.light;
        if (row === 7) {
          // file letter, bottom-right corner of the bottom display row
          parts.push(
            `<text x="${x + cell - fs * 0.55}" y="${y + cell - fs * 0.35}" font-family="DejaVu Sans, sans-serif" font-size="${fs}" fill="${labelColor}" font-weight="700">${FILES[f]}</text>`,
          );
        }
        if (col === 0) {
          // rank number, top-left corner of the left display column
          parts.push(
            `<text x="${x + fs * 0.28}" y="${y + fs * 1.05}" font-family="DejaVu Sans, sans-serif" font-size="${fs}" fill="${labelColor}" font-weight="700">${rankIdx + 1}</text>`,
          );
        }
      }
    }
  }

  // Caption band.
  if (opts.caption) {
    const cy = size;
    parts.push(`<rect x="0" y="${cy}" width="${size}" height="${captionH}" fill="${theme.captionBg}"/>`);
    const mainFs = Math.round(captionH * 0.4);
    const subFs = Math.round(captionH * 0.26);
    const baseY = opts.subCaption ? cy + captionH * 0.42 : cy + captionH * 0.62;
    parts.push(
      `<text x="${size * 0.03}" y="${baseY}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${mainFs}" fill="${theme.text}" font-weight="700">${escapeXml(
        opts.caption,
      )}</text>`,
    );
    if (opts.subCaption) {
      parts.push(
        `<text x="${size * 0.03}" y="${cy + captionH * 0.78}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${subFs}" fill="${theme.text}" opacity="0.7">${escapeXml(
          opts.subCaption,
        )}</text>`,
      );
    }
  }

  parts.push('</svg>');
  return parts.join('');
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  );
}

export function renderPng(position: Position, opts: RenderOptions = {}): Buffer {
  const svg = buildSvg(position, opts);
  const fontDirs = systemFontDirs();
  if (!fontDirs.length && (opts.coordinates ?? true) && !fontWarned) {
    fontWarned = true;
    process.stderr.write('chess-cameo: no system fonts found; coordinate/caption text may be blank.\n');
  }
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: opts.size ?? 720 },
    background: opts.transparent ? 'rgba(0,0,0,0)' : undefined,
    font: {
      loadSystemFonts: true,
      fontDirs,
      defaultFontFamily: 'DejaVu Sans',
    },
  });
  return Buffer.from(resvg.render().asPng());
}
