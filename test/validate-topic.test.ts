import { describe, expect, it } from 'vitest';
import { validateTopic } from '../src/episode/validate.js';
import { TOPICS } from '../src/episode/topics.js';
import { loadTopicFile } from '../src/episode/validate.js';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Topic } from '../src/episode/types.js';

const PROJECTS = join(process.cwd(), 'src/episode/projects');

describe('complete-system law', () => {
  it('accepts every built-in topic', () => {
    for (const t of TOPICS) {
      expect(() => validateTopic(t, t.slug)).not.toThrow();
    }
  });

  it('accepts every project topic JSON', () => {
    for (const f of readdirSync(PROJECTS).filter((n) => n.endsWith('.json'))) {
      expect(() => loadTopicFile(join(PROJECTS, f))).not.toThrow();
    }
  });

  it('rejects a progressive-reveal fragment (client+api, no store)', () => {
    const bad: Topic = {
      slug: 'bad',
      title: 'Bad',
      tagline: 'fragment',
      nodes: [
        { id: 'client', label: 'Client', x: 0, y: 0 },
        { id: 'api', label: 'API', x: 1, y: 0 },
        { id: 'kv', label: 'KV', x: 2, y: 0 },
      ],
      edges: [
        { from: 'client', to: 'api' },
        { from: 'api', to: 'kv' },
      ],
      beats: [
        {
          say: 'only two boxes',
          show: 'incomplete',
          visible: ['client', 'api'],
        },
      ],
    };
    expect(() => validateTopic(bad)).toThrow(/complete system/i);
  });

  it('rejects orphan visible nodes', () => {
    const bad: Topic = {
      slug: 'orphan',
      title: 'Orphan',
      tagline: 'floating',
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 1, y: 0 },
        { id: 'c', label: 'C', x: 2, y: 0 },
        { id: 'lonely', label: 'Lonely', x: 3, y: 0 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
      beats: [
        {
          say: 'full path plus floater',
          show: 'orphan',
          visible: ['a', 'b', 'c', 'lonely'],
        },
      ],
    };
    expect(() => validateTopic(bad)).toThrow(/orphan/i);
  });

  it('allows code slides that would otherwise fail the node minimum', () => {
    const ok: Topic = {
      slug: 'codey',
      title: 'Codey',
      tagline: 'snippet',
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 1, y: 0 },
      ],
      edges: [{ from: 'a', to: 'b' }],
      beats: [
        {
          say: 'here is the code',
          show: 'orchestrator loop',
          visible: ['a'],
          code: {
            file: 'x.ts',
            code: 'const x = 1;',
            tree: [{ text: 'x.ts', active: true }],
          },
        },
      ],
    };
    expect(() => validateTopic(ok)).not.toThrow();
  });
});
