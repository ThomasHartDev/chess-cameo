/**
 * Render a short SystemLoop mp4 for work or break mode.
 * Usage:
 *   pnpm exec tsx scripts/render-system-loop.ts --mode work --out out/loops/work.mp4
 *   pnpm exec tsx scripts/render-system-loop.ts --mode break --fail api>kv --out out/loops/break.mp4
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { SystemLoopProps } from '../remotion/SystemLoop';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

async function main() {
  const mode = (arg('mode', 'work') === 'break' ? 'break' : 'work') as 'work' | 'break';
  const failTarget = arg('fail', mode === 'break' ? 'api>kv' : undefined);
  const out = path.resolve(root, arg('out', `out/loops/${mode}.mp4`)!);

  const inputProps: SystemLoopProps = {
    mode,
    failTarget,
    title: mode === 'work' ? 'Happy path' : 'What breaks',
    caption:
      mode === 'work'
        ? 'Client → API → KV. Green path, data flowing.'
        : 'Same system: KV saturates. Fail-open vs fail-closed is the tradeoff.',
    nodes: [
      { id: 'client', label: 'Client', x: 60, y: 180, shape: 'client' },
      { id: 'api', label: 'API', sub: 'shorten + resolve', x: 340, y: 180, shape: 'service' },
      { id: 'kv', label: 'KV', sub: 'code → url', x: 620, y: 180, shape: 'db', tech: 'amazondynamodb' },
    ],
    edges: [
      { from: 'client', to: 'api', label: 'GET /s' },
      { from: 'api', to: 'kv', label: 'lookup' },
    ],
  };

  console.log(`bundling Remotion… mode=${mode}`);
  const serveUrl = await bundle({
    entryPoint: path.join(root, 'remotion/index.ts'),
    webpackOverride: (c) => c,
  });
  const composition = await selectComposition({
    serveUrl,
    id: 'SystemLoop',
    inputProps,
  });
  console.log(`rendering ${out}`);
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: out,
    inputProps,
    // Keep files small for OBS / Film.
    crf: 28,
    // @ts-expect-error remotion version may not type this
    jpegQuality: 60,
  });
  console.log('done', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
