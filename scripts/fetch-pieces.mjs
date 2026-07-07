// Downloads the Cburnett chess piece SVG set (public domain) into assets/pieces.
// Run once at setup: `node scripts/fetch-pieces.mjs`. Committed after, so runtime never fetches.
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, '..', 'assets', 'pieces');

// filename maps to chess.js piece codes: color (w/b) + type (K,Q,R,B,N,P)
const codes = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
const base = 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett';

await mkdir(dest, { recursive: true });
for (const code of codes) {
  const url = `${base}/${code}.svg`;
  const res = await fetch(url, { headers: { 'User-Agent': 'chess-cameo-setup' } });
  if (!res.ok) throw new Error(`${code}: HTTP ${res.status}`);
  const svg = await res.text();
  await writeFile(join(dest, `${code}.svg`), svg, 'utf8');
  console.log(`  ${code}  ${svg.length}b`);
}
console.log('done');
