/**
 * Build a single eval-swing interview episode (White = interviewee, White wins).
 * Writes episode.json + script.md under out/episodes/<date>/ (or --out).
 *
 * Chess: PGN of a White-win miniature (default Scholar's mate sample).
 * Diagram loops: points at pre-rendered loops/work.mp4 + loops/break.mp4 if present.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePgn } from '../src/game.js';
import { assertWhiteWin, evalSwingBeats } from '../src/eval-swings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SAMPLE_WHITE_WIN = `
[Event "Interview sample"]
[White "Interviewee"]
[Black "Interviewer"]
[Result "1-0"]
[ECO "C20"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
`;

// Script templates keyed by speaker — generation will replace via AI voice later.
const INTERVIEWER_LINES = [
  'Design a URL shortener. Walk me through a request end to end.',
  'It gets popular overnight. What breaks first under write pressure?',
  'How do you keep redirects under 50ms p99 when the store is far away?',
  'CAP: if the region partitions, do you fail open or closed on reads?',
  'Latency budget is 20ms in-region. Where do you spend it?',
];

const INTERVIEWEE_LINES = [
  'Complete naive path first: Client hits API, we mint a code, store code→URL in a KV, resolve with a 302. Three boxes, end to end.',
  'Same full path under pressure. The hot write and the hot key set become the ceiling — so we rework ID gen and add a cache on the read path without dropping the sink.',
  'Read-through cache in front of KV for hot codes. Redirect stays a lookup + 302; click counting is off the hot path on a queue.',
  'I fail open on cache miss to the primary for short links — availability over perfect click stats. Click pipeline can lag.',
  'Budget: ~5ms edge, ~8ms cache, ~7ms headroom. If KV is in the path at all, we missed the SLO — cache is mandatory for p99.',
];

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function main() {
  const date = arg('date', new Date().toISOString().slice(0, 10))!;
  const outDir = path.resolve(root, arg('out', `out/episodes/${date}`)!);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'loops'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'chess'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });

  const pgnPath = arg('pgn');
  const pgn = pgnPath ? fs.readFileSync(pgnPath, 'utf8') : SAMPLE_WHITE_WIN;
  const game = parsePgn(pgn);
  assertWhiteWin(game);
  const swings = evalSwingBeats(game, { maxBeats: 8, margin: 50 });

  const frames = swings.map((s, i) => {
    const speaker = s.speaker;
    const linePool = speaker === 'interviewer' ? INTERVIEWER_LINES : INTERVIEWEE_LINES;
    const text = linePool[i % linePool.length]!;
    const loopMode = speaker === 'interviewer' ? 'break' : 'work';
    return {
      index: i + 1,
      speaker,
      interviewer: speaker === 'interviewer' ? text : undefined,
      interviewee: speaker === 'interviewee' ? text : undefined,
      show: text.slice(0, 96),
      chessPly: s.ply,
      evalScore: s.score,
      favored: s.favored,
      gameCaption: s.caption,
      // Legacy fields Film panel still reads:
      gamePct: Math.round((s.ply / Math.max(1, game.totalPlies)) * 1000) / 10,
      chess: `chess/beat-${String(i + 1).padStart(2, '0')}.png`,
      frame: `frames/beat-${String(i + 1).padStart(2, '0')}.png`,
      // New: looping diagram video for OBS / Film
      loopMode,
      loop: `loops/${loopMode}.mp4`,
    };
  });

  const episode = {
    series: 'Software Engineering Interview',
    episodeNo: 1,
    date,
    dateLabel: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    topic: 'url-shortener-eval-swing',
    title: 'URL Shortener — one game, eval swings',
    tagline: 'White answers when winning; Black pressures when winning',
    chessGame: `${game.meta.white} vs ${game.meta.black}`,
    chessResult: game.meta.result,
    format: 'eval-swing-v1',
    frames,
  };

  fs.writeFileSync(path.join(outDir, 'episode.json'), JSON.stringify(episode, null, 2));

  const script = [
    `# ${episode.title}`,
    '',
    `Game: ${episode.chessGame} (${episode.chessResult})`,
    `Format: eval-swing-v1 — interviewee=White, interviewer=Black, White wins.`,
    '',
    ...frames.map((f) => {
      const who = f.speaker === 'interviewer' ? 'Interviewer' : 'Interviewee';
      const line = f.interviewer || f.interviewee || '';
      return `## Beat ${f.index} — ${who} (${f.gameCaption})\n\n${line}\n\nLoop: ${f.loopMode} → ${f.loop}\n`;
    }),
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'script.md'), script);

  // Copy sample loops if rendered at repo out/loops/
  for (const mode of ['work', 'break'] as const) {
    const src = path.join(root, 'out/loops', `${mode}.mp4`);
    const dest = path.join(outDir, 'loops', `${mode}.mp4`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  console.log(JSON.stringify({ outDir, beats: frames.length, game: episode.chessGame }, null, 2));
}

main();
