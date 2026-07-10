// Shared shapes between the episode generator and the Remotion TVFrame component.

export interface DiagramNode {
  id: string;
  label: string;
  sub?: string;
  x: number; // local diagram coords (0..1140)
  y: number; // local diagram coords (0..760)
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

/** One line of a folder-structure tree shown alongside a code slide. */
export interface TreeEntry {
  /** Pre-indented label, e.g. "  orchestrator.ts" or "packages/agent-core/". */
  text: string;
  /** True for the file the code snippet is from (highlighted). */
  active?: boolean;
}

/** A code slide: a real snippet from the PR plus the folder structure it lives in. */
export interface CodeBlock {
  /** Path shown as the editor tab, e.g. "packages/agent-core/src/orchestrator.ts". */
  file: string;
  /** Prism language id: typescript | tsx | javascript | json | bash | css | ... */
  lang?: string;
  /** The actual code excerpt (kept verbatim from the repo). */
  code: string;
  /** Folder structure. Always required on a code slide so the file has context. */
  tree: TreeEntry[];
}

export interface Beat {
  /**
   * Candidate's spoken line (Thomas, the interviewee) for this frame. `interviewee` is the
   * preferred field; `say` is kept for older topics and used as a fallback.
   */
  say?: string;
  interviewee?: string;
  /** Interviewer's line for this frame (the question, prompt, or follow-up). */
  interviewer?: string;
  /** On-screen line (the lower-third caption). */
  show: string;
  /** Node ids visible on this frame. */
  visible: string[];
  /** Node/edge ids to emphasize (nodes by id, edges as "from>to"). */
  highlight?: string[];
  /** When present, this beat renders as a code slide (snippet + folder tree) instead of the diagram. */
  code?: CodeBlock;
}

export interface Topic {
  slug: string;
  title: string;
  tagline: string;
  /** The interviewer's opening ask, e.g. "walk me through how you'd design a URL shortener". */
  interviewPrompt?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  beats: Beat[];
}

/** Everything the TVFrame needs to render one still. Must be JSON-serializable. */
export interface TVFrameProps {
  seriesTitle: string;
  episodeNo: number;
  dateLabel: string;
  topicTitle: string;
  tagline: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  visible: string[];
  highlight: string[];
  show: string;
  beatIndex: number;
  totalBeats: number;
  chessDataUri: string;
  gamePct: number;
  gameCaption: string;
  /** When set, the frame renders a code slide (snippet + folder tree) instead of the diagram. */
  code?: CodeBlock | null;
}
