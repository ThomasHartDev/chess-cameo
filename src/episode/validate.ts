// Topic validation shared by the generator and the PR->topic drafter. A topic that references
// unknown node ids in its edges or beats is a broken diagram, so we fail loudly before rendering.
//
// Also enforces the Complete-System Law (docs/complete-system-law.md): every non-code beat's
// visible set must be an end-to-end runnable system, not a progressive-reveal fragment.
import { readFileSync } from 'node:fs';
import type { Beat, DiagramEdge, Topic } from './types.js';

/** Minimum visible nodes for a diagram beat (source + work + sink). */
const MIN_VISIBLE_NODES = 3;

/**
 * Induced-subgraph completeness for one beat:
 * - enough nodes to read as a system
 * - at least one edge with both ends visible
 * - no orphan nodes (every visible node participates in a visible edge)
 */
function checkCompleteSystem(
  beat: Beat,
  beatIndex: number,
  edges: DiagramEdge[],
  problems: string[],
): void {
  // Code slides show a snippet, not the architecture graph.
  if (beat.code) return;

  const visible = beat.visible ?? [];
  if (visible.length < MIN_VISIBLE_NODES) {
    problems.push(
      `beat ${beatIndex + 1} has ${visible.length} visible node(s); diagram beats need ≥${MIN_VISIBLE_NODES} for a complete system (see docs/complete-system-law.md)`,
    );
  }

  const vis = new Set(visible);
  const induced = edges.filter((e) => vis.has(e.from) && vis.has(e.to));
  if (induced.length === 0) {
    problems.push(
      `beat ${beatIndex + 1} has no edges between visible nodes — incomplete system (wire a full path)`,
    );
    return;
  }

  const degree = new Map<string, number>();
  for (const id of visible) degree.set(id, 0);
  for (const e of induced) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  const orphans = visible.filter((id) => (degree.get(id) ?? 0) === 0);
  if (orphans.length) {
    problems.push(
      `beat ${beatIndex + 1} has orphan node(s) with no visible edge: ${orphans.join(', ')} (leave them out until the path uses them)`,
    );
  }
}

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
    checkCompleteSystem(b, i, raw.edges ?? [], problems);
  });
  // em dashes are banned in every external-facing line
  (raw.beats ?? []).forEach((b, i) => {
    const text = [b.say, b.interviewee, b.interviewer, b.show].filter(Boolean).join(' ');
    if (text.includes('—')) problems.push(`beat ${i + 1} contains an em dash`);
    if (!b.interviewee && !b.say) problems.push(`beat ${i + 1} has no interviewee/say line`);
    // A code slide must carry its folder structure so the file has context.
    if (b.code) {
      if (!b.code.file || !b.code.code) problems.push(`beat ${i + 1} code slide missing file/code`);
      if (!Array.isArray(b.code.tree) || b.code.tree.length === 0)
        problems.push(`beat ${i + 1} code slide has no folder tree`);
    }
  });
  if (problems.length) throw new Error(`Invalid ${label}:\n  - ${problems.join('\n  - ')}`);
  return raw;
}

export function loadTopicFile(path: string): Topic {
  return validateTopic(JSON.parse(readFileSync(path, 'utf8')) as Topic, path);
}
