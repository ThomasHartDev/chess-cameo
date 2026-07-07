// Generates N business-day "system design" episodes. Each episode = a dated folder with
// per-beat TV frames (Remotion), the isolated chess cameo per beat, a script.md, and metadata.
// The chess game steps forward continuously across ALL frames of ALL episodes (0% -> 100%).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill, openBrowser } from '@remotion/renderer';
import { loadPin } from '../config.js';
import { parsePgn, type ParsedGame } from '../game.js';
import { positionAtPercent } from '../percent.js';
import { renderPng } from '../render.js';
import { TOPICS } from './topics.js';
import type { TVFrameProps } from './types.js';

const SERIES = 'System Design, Out Loud';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dateLabel(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}
/** Next `count` business days starting at (and including, if a weekday) `start`. */
function businessDays(start: Date, count: number): Date[] {
  const out: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (out.length < count) {
    if (!isWeekend(cur)) out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function chessFor(game: ParsedGame, pct: number) {
  const r = positionAtPercent(game, pct);
  const png = renderPng(r.position, { size: 560, caption: null, coordinates: true });
  return { png, uri: `data:image/png;base64,${png.toString('base64')}`, caption: r.caption, pct: r.pct };
}

function parseArgs(argv: string[]): { start: Date; count: number; outDir: string } {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const startStr = get('--start');
  const start = startStr ? new Date(startStr + 'T12:00:00') : new Date();
  const count = Number(get('--count') ?? '5');
  const outDir = resolve(get('--out') ?? 'out/episodes');
  return { start, count, outDir };
}

async function main() {
  const { start, count, outDir } = parseArgs(process.argv.slice(2));
  const root = process.cwd();

  const pin = loadPin();
  const game = parsePgn(pin.pgn);
  const gameName = `${pin.meta.white} vs ${pin.meta.black}`;

  const days = businessDays(start, count);
  // pick topics for each episode (cycle if count > topics)
  const episodes = days.map((d, i) => ({ date: d, topic: TOPICS[i % TOPICS.length], episodeNo: i + 1 }));
  const totalFrames = episodes.reduce((n, e) => n + e.topic.beats.length, 0);

  console.log(`Bundling Remotion…`);
  const serveUrl = await bundle({ entryPoint: join(root, 'remotion/index.ts') });
  const browser = await openBrowser('chrome');

  let globalFrame = 0;
  const denom = Math.max(1, totalFrames - 1);

  for (const ep of episodes) {
    const key = dateKey(ep.date);
    const label = dateLabel(ep.date);
    const epDir = join(outDir, key);
    const framesDir = join(epDir, 'frames');
    const chessDir = join(epDir, 'chess');
    mkdirSync(framesDir, { recursive: true });
    mkdirSync(chessDir, { recursive: true });

    const beats = ep.topic.beats;
    const frameMeta: Array<Record<string, unknown>> = [];
    const startPct = (globalFrame / denom) * 100;

    for (let b = 0; b < beats.length; b++) {
      const beat = beats[b];
      const pct = (globalFrame / denom) * 100;
      const chess = chessFor(game, pct);
      const num = pad(b + 1);

      const props: TVFrameProps = {
        seriesTitle: SERIES,
        episodeNo: ep.episodeNo,
        dateLabel: label,
        topicTitle: ep.topic.title,
        tagline: ep.topic.tagline,
        nodes: ep.topic.nodes,
        edges: ep.topic.edges,
        visible: beat.visible,
        highlight: beat.highlight ?? [],
        show: beat.show,
        beatIndex: b,
        totalBeats: beats.length,
        chessDataUri: chess.uri,
        gamePct: chess.pct,
        gameCaption: chess.caption,
      };

      const framePath = join(framesDir, `beat-${num}.png`);
      // Select per-frame WITH this frame's props — selectComposition bakes props into
      // composition.props, and renderStill renders those (passing inputProps to a
      // pre-selected composition alone is ignored).
      const inputProps = props as unknown as Record<string, unknown>;
      const composition = await selectComposition({
        serveUrl,
        id: 'TVFrame',
        inputProps,
        puppeteerInstance: browser,
      });
      await renderStill({
        composition,
        serveUrl,
        output: framePath,
        inputProps,
        puppeteerInstance: browser,
      });
      writeFileSync(join(chessDir, `beat-${num}.png`), chess.png);

      frameMeta.push({
        index: b + 1,
        frame: `frames/beat-${num}.png`,
        chess: `chess/beat-${num}.png`,
        gamePct: Math.round(chess.pct * 10) / 10,
        gameCaption: chess.caption,
        say: beat.say,
        show: beat.show,
      });
      console.log(`  EP${ep.episodeNo} ${key} beat ${b + 1}/${beats.length} · game ${Math.round(pct)}%`);
      globalFrame++;
    }
    const endPct = ((globalFrame - 1) / denom) * 100;

    // script.md
    const lines: string[] = [];
    lines.push(`# ${ep.topic.title}`);
    lines.push('');
    lines.push(`**Episode ${ep.episodeNo} · ${label}** — Series: ${SERIES}`);
    lines.push(`_${ep.topic.tagline}_`);
    lines.push('');
    lines.push(
      `Chess cameo: this episode advances **${gameName}** from ${Math.round(startPct)}% to ${Math.round(endPct)}% of the game.`,
    );
    lines.push('');
    lines.push('---');
    lines.push('');
    frameMeta.forEach((f) => {
      lines.push(`## Beat ${f.index} — \`${f.frame}\` — game ${f.gamePct}% (${f.gameCaption})`);
      lines.push('');
      lines.push(`**Say:** ${f.say}`);
      lines.push('');
      lines.push(`**On screen:** ${f.show}`);
      lines.push('');
    });
    writeFileSync(join(epDir, 'script.md'), lines.join('\n'));

    writeFileSync(
      join(epDir, 'episode.json'),
      JSON.stringify(
        {
          series: SERIES,
          episodeNo: ep.episodeNo,
          date: key,
          dateLabel: label,
          topic: ep.topic.slug,
          title: ep.topic.title,
          tagline: ep.topic.tagline,
          chessGame: gameName,
          gameStartPct: Math.round(startPct * 10) / 10,
          gameEndPct: Math.round(endPct * 10) / 10,
          frames: frameMeta,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(`EP${ep.episodeNo} -> ${epDir}`);
  }

  await browser.close({ silent: true });
  console.log(`\nDone: ${episodes.length} episodes, ${totalFrames} frames -> ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
