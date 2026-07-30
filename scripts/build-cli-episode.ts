/**
 * Scaffold a Command Line, Out Loud episode (eval-swing + dialogue + loops).
 * Same chess contract as system-design: White = interviewee, White wins.
 *
 *   pnpm exec tsx scripts/build-cli-episode.ts --date 2026-07-31
 *   pnpm exec tsx scripts/build-cli-episode.ts --topic cli-rg-pipes --date 2026-07-31
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePgn } from '../src/game.js';
import { assertWhiteWin, evalSwingBeats } from '../src/eval-swings.js';
import { SERIES } from '../src/series.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SAMPLE_WHITE_WIN = `
[Event "CLI sample"]
[White "Interviewee"]
[Black "Interviewer"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
`;

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function main() {
  const date = arg('date', new Date().toISOString().slice(0, 10))!;
  const topicSlug = arg('topic', 'cli-rg-pipes')!;
  const topicPath = path.join(root, 'src/episode/projects', `${topicSlug}.json`);
  if (!fs.existsSync(topicPath)) {
    throw new Error(`Topic not found: ${topicPath}`);
  }
  const topic = JSON.parse(fs.readFileSync(topicPath, 'utf8')) as {
    slug: string;
    title: string;
    tagline: string;
    seriesId?: string;
    cliLevel?: number;
    tools?: string[];
    beats: Array<{
      interviewer?: string;
      interviewee?: string;
      show: string;
      loopMode?: 'work' | 'break';
      failTarget?: string;
    }>;
  };

  const series = SERIES['cli-tools'];
  const outDir = path.resolve(root, arg('out', `out/episodes/${date}`)!);
  fs.mkdirSync(path.join(outDir, 'loops'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'chess'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });

  const pgn = arg('pgn') ? fs.readFileSync(arg('pgn')!, 'utf8') : SAMPLE_WHITE_WIN;
  const game = parsePgn(pgn);
  assertWhiteWin(game);
  // Enough swings to cover every topic beat (sample plies across the game).
  const swings = evalSwingBeats(game, {
    maxBeats: Math.max(topic.beats.length + 2, 6),
    margin: 30,
  });
  const pickSwing = (i: number) => {
    if (swings.length === 0) throw new Error('no swings');
    if (swings.length === 1) return swings[0]!;
    const t = topic.beats.length <= 1 ? 0 : i / (topic.beats.length - 1);
    const idx = Math.min(swings.length - 1, Math.round(t * (swings.length - 1)));
    return swings[idx]!;
  };

  const frames = [];
  for (let i = 0; i < topic.beats.length; i++) {
    const beat = topic.beats[i]!;
    const swing = pickSwing(i);
    // Prefer topic’s explicit speaker from who has lines; align with swing when both empty.
    const speaker =
      beat.interviewer && !beat.interviewee
        ? 'interviewer'
        : beat.interviewee && !beat.interviewer
          ? 'interviewee'
          : swing.speaker;
    const loopMode = beat.loopMode ?? (speaker === 'interviewer' ? 'break' : 'work');
    frames.push({
      index: i + 1,
      speaker,
      interviewer: beat.interviewer,
      interviewee: beat.interviewee,
      show: beat.show,
      chessPly: swing.ply,
      evalScore: swing.score,
      favored: swing.favored,
      gameCaption: swing.caption,
      gamePct: Math.round((swing.ply / Math.max(1, game.totalPlies)) * 1000) / 10,
      chess: `chess/beat-${String(i + 1).padStart(2, '0')}.png`,
      frame: `frames/beat-${String(i + 1).padStart(2, '0')}.png`,
      loopMode,
      loop: `loops/${loopMode}.mp4`,
      failTarget: beat.failTarget,
    });
  }

  // Last beat must be interviewee if White-win contract.
  if (frames.length && frames[frames.length - 1]!.speaker !== 'interviewee') {
    const last = frames[frames.length - 1]!;
    last.speaker = 'interviewee';
    last.loopMode = 'work';
    last.loop = 'loops/work.mp4';
  }

  const episode = {
    seriesId: 'cli-tools' as const,
    series: series.seriesLabel,
    episodeNo: 1,
    date,
    dateLabel: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    topic: topic.slug,
    title: topic.title,
    tagline: topic.tagline,
    chessGame: `${game.meta.white} vs ${game.meta.black}`,
    chessResult: game.meta.result,
    format: 'eval-swing-v1',
    cliLevel: topic.cliLevel ?? 1,
    tools: topic.tools ?? [],
    frames,
  };

  fs.writeFileSync(path.join(outDir, 'episode.json'), JSON.stringify(episode, null, 2));

  const script = [
    `# ${episode.title}`,
    '',
    `Series: ${episode.series} (\`cli-tools\`)`,
    `Game: ${episode.chessGame} (${episode.chessResult})`,
    `Tools: ${(episode.tools as string[]).join(', ')}`,
    `Format: eval-swing-v1 — same dialogue + chess rules as system design.`,
    '',
    ...frames.map((f) => {
      const who = f.speaker === 'interviewer' ? 'Interviewer' : 'Interviewee';
      const line = f.interviewer || f.interviewee || '';
      return `## Beat ${f.index} — ${who} (${f.gameCaption})\n\n${line}\n\nLoop: ${f.loopMode} → ${f.loop}\n`;
    }),
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'script.md'), script);

  for (const mode of ['work', 'break'] as const) {
    const src = path.join(root, 'out/loops', `${mode}.mp4`);
    const dest = path.join(outDir, 'loops', `${mode}.mp4`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  console.log(
    JSON.stringify(
      { outDir, seriesId: episode.seriesId, beats: frames.length, tools: episode.tools },
      null,
      2,
    ),
  );
}

main();
