import { describe, it, expect } from 'vitest';
import { parsePgn } from '../src/game.js';
import { positionAtPercent } from '../src/percent.js';
import { renderPng, buildSvg } from '../src/render.js';

const PGN = `[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('renderPng', () => {
  const game = parsePgn(PGN);

  it('produces a valid PNG buffer', () => {
    const png = renderPng(positionAtPercent(game, 100).position, { size: 240, caption: '100%' });
    expect(png.length).toBeGreaterThan(1000);
    expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
  });

  it('emits highlight rects only when there is a last move', () => {
    const start = buildSvg(game.positions[0], { size: 240 });
    const afterMove = buildSvg(game.positions[1], { size: 240 });
    const highlightCount = (svg: string) =>
      (svg.match(/rgba\(255, 214, 92/g) || []).length;
    expect(highlightCount(start)).toBe(0);
    expect(highlightCount(afterMove)).toBe(2); // from + to
  });

  it('renders both orientations without throwing', () => {
    expect(() => renderPng(game.positions[4], { size: 200, orientation: 'black' })).not.toThrow();
  });
});
