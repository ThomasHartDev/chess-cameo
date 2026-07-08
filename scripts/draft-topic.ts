// Draft an episode Topic from a real GitHub PR: pull the PR + its load-bearing source files,
// then have the `claude` CLI (NOT an API key — per the inference rule) write the topic JSON.
// You review the draft against the code, then render with `generate.ts --topic-file`.
//
// Usage: tsx scripts/draft-topic.ts --repo owner/name --pr 2 [--out path] [--files a.ts,b.ts] [--model ...]
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { validateTopic } from '../src/episode/validate.js';
import type { Topic } from '../src/episode/types.js';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

const CODE_RE = /\.(ts|tsx|js|jsx|mjs|py|go|rs|java|rb|php)$/;
const SKIP_RE = /(lock|\.test\.|\.spec\.|\.d\.ts$|\.json$|\.md$)/;
const MAX_FILES = 6;
const MAX_BYTES_PER_FILE = 5000;

function gh(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function fileContent(repo: string, path: string): string | null {
  try {
    const b64 = gh(['api', `repos/${repo}/contents/${path}`, '--jq', '.content']).trim();
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

const PROMPT_SCHEMA = `You are drafting a diagram spec for a short explainer video about ONE code change.
Output ONLY a single JSON object (no prose, no markdown fences) matching this TypeScript type:

interface Topic {
  slug: string;               // kebab-case
  title: string;              // e.g. "Building an Agent Loop"
  tagline: string;            // one short line, no em dashes
  interviewPrompt: string;    // the interviewer's opening ask, e.g. "build an LLM agent loop from scratch"
  nodes: { id: string; label: string; sub?: string; x: number; y: number }[];
  edges: { from: string; to: string; label?: string; dashed?: boolean }[];
  beats: { interviewer: string; interviewee: string; show: string; visible: string[]; highlight?: string[] }[];
}

The whole thing is framed as a SOFTWARE ENGINEERING INTERVIEW. Each beat has two spoken lines:
- "interviewer": the interviewer's question or prompt for this beat. Beat 1's interviewer line
  MUST start with "For today's software engineering interview:" and pose the challenge.
- "interviewee": the candidate (the developer) answering, first person, casual senior-dev voice.
- "show": the on-screen caption (short).

Rules:
- The diagram MUST reflect the ACTUAL code below. Nodes = the real components/modules. Edges =
  the real data flow, labeled with the real function or message names from the code.
- 5-7 nodes, laid out left-to-right. x in 0..1080, y in 0..640. Spread them out; don't overlap
  (nodes are ~208 wide, ~78 tall, so keep centers >= 320 apart horizontally and >= 150 vertically).
  Put the entry point on the left.
- Do NOT create two edges between the same pair of nodes (no A->B AND B->A) — their labels collide.
  Model a request/response as ONE edge. Keep edge labels under ~22 characters.
- Exactly 6 beats. Each beat reveals more of the diagram: "visible" is the cumulative list of node
  ids shown so far (beat 1 shows 1-2 nodes, the last beat shows all). "highlight" lists node ids
  and/or edges as "from>to" to emphasize this beat.
- "say" = what the developer says out loud (first person, casual senior-dev voice, "I just merged...").
  "show" = the on-screen caption (short, punchy).
- NO em dashes anywhere. Use periods, commas, or colons. Every id in edges/visible/highlight MUST
  exist in nodes.
- Return JSON only.`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('no JSON object found in model output');
  return body.slice(start, end + 1);
}

function main() {
  let repo = arg('--repo');
  const pr = arg('--pr');
  if (!repo || !pr) {
    console.error('usage: tsx scripts/draft-topic.ts --repo owner/name --pr <n> [--out path] [--files a.ts,b.ts] [--model ...]');
    process.exit(1);
  }
  if (!repo.includes('/')) repo = `ThomasHartDev/${repo}`;

  const meta = JSON.parse(gh(['pr', 'view', pr, '--repo', repo, '--json', 'title,body,files']));
  const prFiles: string[] = (meta.files ?? []).map((f: { path: string }) => f.path);
  const chosen = (arg('--files')?.split(',') ?? prFiles.filter((p) => CODE_RE.test(p) && !SKIP_RE.test(p))).slice(0, MAX_FILES);

  console.error(`PR ${repo}#${pr}: ${meta.title}`);
  console.error(`Reading ${chosen.length} source file(s): ${chosen.join(', ')}`);

  const sources = chosen
    .map((p) => {
      const c = fileContent(repo, p);
      return c ? `--- ${p} ---\n${c.slice(0, MAX_BYTES_PER_FILE)}` : null;
    })
    .filter(Boolean)
    .join('\n\n');

  const prompt = `${PROMPT_SCHEMA}

## PR: ${meta.title}
${meta.body ?? ''}

## Source files
${sources}
`;

  const model = arg('--model');
  // --setting-sources "" skips the global CLAUDE.md, hooks, and plugins (so the doctrine/Stop-hooks
  // don't hijack the output) while auth still resolves. A clean system prompt keeps it to raw JSON.
  const cliArgs = [
    '-p',
    '--setting-sources',
    '',
    '--system-prompt',
    'You are a precise JSON generator for a diagramming tool. Output ONLY a single JSON object. No prose, no explanation, no markdown code fences, no status lines.',
    ...(model ? ['--model', model] : []),
  ];
  console.error(`Drafting via claude CLI${model ? ` (${model})` : ''}…`);
  const res = spawnSync('claude', cliArgs, { input: prompt, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (res.status !== 0) {
    console.error(res.stderr || 'claude CLI failed');
    process.exit(1);
  }

  let topic: Topic;
  try {
    topic = JSON.parse(extractJson(res.stdout)) as Topic;
  } catch (e) {
    console.error('Could not parse model output as JSON:', (e as Error).message);
    console.error('--- raw output ---\n' + res.stdout.slice(0, 2000));
    process.exit(1);
  }
  if (!topic.slug) topic.slug = slugify(`${basename(repo)}-${meta.title}`);

  validateTopic(topic, `drafted topic for ${repo}#${pr}`);

  const out = arg('--out') ?? join('src/episode/projects', `${topic.slug}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(topic, null, 2) + '\n');
  console.error(`\n✓ drafted -> ${out}`);
  console.error(`Review it against the code, then:`);
  console.error(`  pnpm exec tsx src/episode/generate.ts --topic-file ${out} --start <date>`);
}

main();
