// Topic validation shared by the generator and the PR->topic drafter. A topic that references
// unknown node ids in its edges or beats is a broken diagram, so we fail loudly before rendering.
import { readFileSync } from 'node:fs';
import type { Topic } from './types.js';

export function validateTopic(raw: Topic, label = 'topic'): Topic {
  const problems: string[] = [];
  if (!raw.slug || !raw.title) problems.push('missing slug/title');
  if (!Array.isArray(raw.nodes) || raw.nodes.length === 0) problems.push('no nodes');
  if (!Array.isArray(raw.beats) || raw.beats.length === 0) problems.push('no beats');
  const nodeIds = new Set((raw.nodes ?? []).map((n) => n.id));
  (raw.edges ?? []).forEach((e) => {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) problems.push(`edge ${e.from}>${e.to} references unknown node`);
  });
  (raw.beats ?? []).forEach((b, i) => {
    (b.visible ?? []).forEach((v) => {
      if (!nodeIds.has(v)) problems.push(`beat ${i + 1} shows unknown node "${v}"`);
    });
    (b.highlight ?? []).forEach((h) => {
      // highlight is a node id or an edge "from>to"; only check the plain-node form
      if (!h.includes('>') && !nodeIds.has(h)) problems.push(`beat ${i + 1} highlights unknown node "${h}"`);
    });
  });
  // em dashes are banned in every external-facing line
  (raw.beats ?? []).forEach((b, i) => {
    const text = [b.say, b.interviewee, b.interviewer, b.show].filter(Boolean).join(' ');
    if (text.includes('—')) problems.push(`beat ${i + 1} contains an em dash`);
    if (!b.interviewee && !b.say) problems.push(`beat ${i + 1} has no interviewee/say line`);
  });
  if (problems.length) throw new Error(`Invalid ${label}:\n  - ${problems.join('\n  - ')}`);
  return raw;
}

export function loadTopicFile(path: string): Topic {
  return validateTopic(JSON.parse(readFileSync(path, 'utf8')) as Topic, path);
}
