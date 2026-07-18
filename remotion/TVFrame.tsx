import { AbsoluteFill } from 'remotion';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import type { TVFrameProps, DiagramNode, CodeBlock, NodeShape } from '../src/episode/types';
import { getTechIcon, onDark, SHAPE_GLYPHS } from './diagram-icons';

// The diagram now owns the full frame width (the chess board moved to its own image).
// Node coords are authored in a local space; we fit them into this area at render time so
// every topic centers and uses the freed space, no matter how its nodes are laid out.
const AREA = { left: 96, right: 1824, top: 316, bottom: 872 };
const NODE_W = 250;
const NODE_H = 104;

const C = {
  bg: '#0d1117',
  grid: 'rgba(255,255,255,0.035)',
  nodeFill: '#161b22',
  nodeFillHot: '#1d2531',
  nodeBorder: '#2b3644',
  hot: '#e2a03f',
  label: '#e6edf3',
  sub: '#8b98a5',
  edge: '#3a4653',
  title: '#f2f6fa',
  eyebrow: '#7d8b99',
  ep: '#9aa7b4',
  band: '#12171e',
};

export const DEFAULT_TV_PROPS: TVFrameProps = {
  seriesTitle: 'System Design, Out Loud',
  episodeNo: 1,
  dateLabel: 'Mon Jul 7',
  topicTitle: 'Designing a URL Shortener',
  tagline: 'How a long link becomes something tiny',
  nodes: [
    { id: 'a', label: 'Client', x: 80, y: 340, shape: 'client' },
    { id: 'b', label: 'API', sub: 'shorten service', x: 430, y: 340, shape: 'service' },
    { id: 'c', label: 'KV Store', sub: 'code → url', x: 800, y: 340, shape: 'db', tech: 'amazondynamodb' },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ],
  visible: ['a', 'b', 'c'],
  highlight: ['b'],
  show: 'Every short link is really a lookup: code in, long URL out.',
  beatIndex: 0,
  totalBeats: 6,
  chessDataUri: '',
  gamePct: 0,
  gameCaption: 'start',
};

// Prism token colours (a compact one-dark-ish theme, inlined so headless render needs no CSS file).
const PRISM_CSS = `
.tok-comment,.token.comment{color:#6a7581}
.token.keyword,.token.boolean,.token.builtin{color:#c678dd}
.token.string,.token.char,.token.template-string,.token.regex{color:#98c379}
.token.function,.token.method,.token.class-name{color:#61afef}
.token.number,.token.constant{color:#d19a66}
.token.operator,.token.punctuation{color:#8b98a5}
.token.property,.token.attr-name{color:#e06c75}
.token.tag{color:#e06c75}
`;

function CodeSlide({ code }: { code: CodeBlock }) {
  const lang = (code.lang && Prism.languages[code.lang] ? code.lang : 'typescript') as string;
  const grammar = Prism.languages[lang] ?? Prism.languages.typescript;
  const html = Prism.highlight(code.code, grammar, lang);
  // Size the font so the longest line fits the editor width and all lines fit its height.
  const lines = code.code.split('\n');
  const maxLen = Math.max(1, ...lines.map((l) => l.length));
  const byWidth = Math.floor(720 / (maxLen * 0.61));
  const byHeight = Math.floor(560 / (lines.length * 1.55));
  const codeSize = Math.max(13, Math.min(24, byWidth, byHeight));
  return (
    <div style={{ position: 'absolute', left: 60, top: 250, width: 1090, height: 650, display: 'flex', gap: 18 }}>
      <style>{PRISM_CSS}</style>
      {/* Folder tree */}
      <div
        style={{
          width: 300,
          flex: '0 0 300px',
          background: '#12171e',
          border: `1px solid ${C.nodeBorder}`,
          borderRadius: 12,
          padding: '16px 14px',
          overflow: 'hidden',
        }}
      >
        <div style={{ color: C.eyebrow, fontSize: 15, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
          Files
        </div>
        <div style={{ fontFamily: 'DejaVu Sans Mono, monospace', fontSize: 18, lineHeight: 1.7 }}>
          {code.tree.map((t, i) => (
            <div
              key={i}
              style={{
                color: t.active ? '#241a08' : C.sub,
                background: t.active ? C.hot : 'transparent',
                fontWeight: t.active ? 700 : 400,
                borderRadius: 5,
                padding: t.active ? '1px 6px' : '1px 6px',
                whiteSpace: 'pre',
              }}
            >
              {t.text}
            </div>
          ))}
        </div>
      </div>
      {/* Code editor */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: '#0b0f14',
          border: `1px solid ${C.nodeBorder}`,
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: '#12171e',
            borderBottom: `1px solid ${C.nodeBorder}`,
            padding: '11px 18px',
            color: C.label,
            fontFamily: 'DejaVu Sans Mono, monospace',
            fontSize: 17,
          }}
        >
          <span style={{ color: C.hot }}>◈</span> {code.file}
        </div>
        <pre
          style={{
            margin: 0,
            padding: '18px 22px',
            fontFamily: 'DejaVu Sans Mono, monospace',
            fontSize: codeSize,
            lineHeight: 1.55,
            color: '#c7d0da',
            whiteSpace: 'pre',
            overflow: 'hidden',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

function nodeMap(nodes: DiagramNode[]): Record<string, DiagramNode> {
  return Object.fromEntries(nodes.map((n) => [n.id, n]));
}

// ── Node shapes ───────────────────────────────────────────────────────────────
// Every shape draws inside a NODE_W × NODE_H box centered on (x, y). Cylinders are
// stores (db/cache); queue is a rect with an open right end; the rest are rounded
// rects. `accent` is the border/glyph color (brand hex, or amber when highlighted).

interface ShapeProps {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  accent: string;
  sw: number;
}

function RoundedRect({ x, y, w, h, fill, accent, sw }: ShapeProps) {
  return (
    <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={18} fill={fill} stroke={accent} strokeWidth={sw} />
  );
}

// Databases are ALWAYS cylinders. `capFill` lets a cache tint its top ellipse.
function Cylinder({ x, y, w, h, fill, accent, sw, capFill }: ShapeProps & { capFill?: string }) {
  const rx = w / 2;
  const ry = h * 0.16;
  const topCY = y - h / 2 + ry;
  const botCY = y + h / 2 - ry;
  const body = `M ${x - rx} ${topCY} L ${x - rx} ${botCY} A ${rx} ${ry} 0 0 0 ${x + rx} ${botCY} L ${x + rx} ${topCY} Z`;
  return (
    <g>
      <path d={body} fill={fill} stroke="none" />
      <path
        d={`M ${x - rx} ${topCY} L ${x - rx} ${botCY} A ${rx} ${ry} 0 0 0 ${x + rx} ${botCY} L ${x + rx} ${topCY}`}
        fill="none"
        stroke={accent}
        strokeWidth={sw}
      />
      <ellipse cx={x} cy={topCY} rx={rx} ry={ry} fill={capFill ?? '#1d2531'} stroke={accent} strokeWidth={sw} />
    </g>
  );
}

// A queue/stream: rounded rect with an OPEN (dashed) right end, like a pipe.
function QueueBox({ x, y, w, h, fill, accent, sw }: ShapeProps) {
  const left = x - w / 2;
  const right = x + w / 2;
  const top = y - h / 2;
  const bot = y + h / 2;
  return (
    <g>
      <rect x={left} y={top} width={w} height={h} rx={10} fill={fill} />
      <path d={`M ${right} ${top} L ${left} ${top} L ${left} ${bot} L ${right} ${bot}`} fill="none" stroke={accent} strokeWidth={sw} />
      <line x1={right} y1={top} x2={right} y2={bot} stroke={accent} strokeWidth={sw} strokeDasharray="5 7" opacity={0.65} />
    </g>
  );
}

function NodeBackground(props: ShapeProps & { shape: NodeShape; redisRed?: string }) {
  switch (props.shape) {
    case 'db':
      return <Cylinder {...props} />;
    case 'cache':
      return <Cylinder {...props} capFill={props.redisRed ?? '#FF4438'} />;
    case 'queue':
      return <QueueBox {...props} />;
    default:
      return <RoundedRect {...props} />;
  }
}

const ICON_PX = 30; // rendered icon edge

// Brand icon (top-left) when `tech` resolves, else the neutral shape glyph.
function NodeIcon({
  x,
  y,
  w,
  h,
  tech,
  shape,
  neutral,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tech?: string;
  shape: NodeShape;
  neutral: string;
}) {
  const icon = getTechIcon(tech);
  const ix = x - w / 2 + 16;
  const iy = y - h / 2 + 12;
  if (icon) {
    const fill = onDark(icon.hex).iconFill;
    return (
      <svg x={ix} y={iy} width={ICON_PX} height={ICON_PX} viewBox="0 0 24 24">
        {icon.paths.map((d, i) => (
          <path key={i} d={d} fill={fill} />
        ))}
      </svg>
    );
  }
  const glyph = SHAPE_GLYPHS[shape];
  if (!glyph) return null;
  return (
    <svg x={ix} y={iy} width={ICON_PX} height={ICON_PX} viewBox="0 0 24 24">
      {glyph.map((d, i) => (
        <path key={i} d={d} fill={neutral} opacity={0.85} />
      ))}
    </svg>
  );
}

/** Fit authored node coords into AREA so every topic centers and uses the full width. */
function makeProjector(nodes: DiagramNode[]) {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = NODE_W / 2 + 28;
  const padY = NODE_H / 2 + 28;
  const availW = AREA.right - AREA.left - 2 * padX;
  const availH = AREA.bottom - AREA.top - 2 * padY;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  // Independent x/y scaling spreads columns into the freed width; caps stop a single
  // row/column (span ~0) from exploding.
  const scaleX = Math.min(availW / spanX, 2.4);
  const scaleY = Math.min(availH / spanY, 1.6);
  const cX = (minX + maxX) / 2;
  const cY = (minY + maxY) / 2;
  const areaCX = (AREA.left + AREA.right) / 2;
  const areaCY = (AREA.top + AREA.bottom) / 2;
  return {
    px: (n: DiagramNode) => areaCX + (n.x - cX) * scaleX,
    py: (n: DiagramNode) => areaCY + (n.y - cY) * scaleY,
  };
}

// A generic cylinder mark for a store node that carries no brand icon.
const DB_GLYPH = ['M3 6c0-1.7 4-3 9-3s9 1.3 9 3-4 3-9 3-9-1.3-9-3z', 'M3 6v12c0 1.7 4 3 9 3s9-1.3 9-3V6c0 1.7-4 3-9 3S3 7.7 3 6z'];

const SHAPE_KIND: Record<NodeShape, string> = {
  db: 'database',
  cache: 'cache',
  queue: 'queue',
  client: 'client',
  compute: 'worker',
  component: 'data structure',
  service: 'service',
};

interface LegendItem {
  key: string;
  label: string;
  kind: string;
  color: string;
  paths: string[];
}

/**
 * Build the legend from the nodes actually in the episode. One chip per distinct tech,
 * plus one per distinct store/queue shape that has no brand icon, so a viewer can tell a
 * Redis cylinder from a DynamoDB cylinder without guessing. Plain service/client/compute
 * nodes are self-evident and stay out of the legend.
 */
function legendEntries(nodes: DiagramNode[]): LegendItem[] {
  const out: LegendItem[] = [];
  const seen = new Set<string>();
  for (const n of nodes) {
    const shape: NodeShape = n.shape ?? 'service';
    const icon = getTechIcon(n.tech);
    if (icon) {
      const key = `tech:${n.tech!.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, label: icon.title, kind: SHAPE_KIND[shape], color: onDark(icon.hex).iconFill, paths: icon.paths });
    } else if (shape === 'db' || shape === 'cache' || shape === 'queue') {
      const key = `shape:${shape}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        key,
        label: n.label,
        kind: SHAPE_KIND[shape],
        color: '#8b98a5',
        paths: shape === 'queue' ? (SHAPE_GLYPHS.queue ?? []) : DB_GLYPH,
      });
    }
  }
  return out;
}

interface EdgeLabelInput {
  key: number;
  text: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface EdgeLabelPos {
  key: number;
  text: string;
  x: number;
  y: number;
}

/**
 * Place edge labels so they sit just off their edge and don't overprint each other.
 * Each label starts at its edge midpoint pushed a fixed distance along the perpendicular
 * (biased upward for readability), then a few relaxation passes nudge any overlapping pair
 * apart vertically. General for every topic — two edges sharing a midpoint (top-k's
 * `update` / `merge heaps`) no longer collide.
 */
function layoutEdgeLabels(items: EdgeLabelInput[]): EdgeLabelPos[] {
  const OFF = 17; // perpendicular offset off the line
  const CHAR_W = 8.2; // ~advance per char at fontSize 16
  const LINE_H = 24;
  const placed = items.map((it) => {
    const mx = (it.x1 + it.x2) / 2;
    const my = (it.y1 + it.y2) / 2;
    const dx = it.x2 - it.x1;
    const dy = it.y2 - it.y1;
    const len = Math.hypot(dx, dy) || 1;
    let px = -dy / len;
    let py = dx / len;
    if (py > 0) {
      px = -px;
      py = -py;
    } // bias the offset upward
    return { key: it.key, text: it.text, x: mx + px * OFF, y: my + py * OFF, half: (it.text.length * CHAR_W) / 2 };
  });
  for (let iter = 0; iter < 8; iter++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const overlapX = a.half + b.half + 8 - Math.abs(a.x - b.x);
        const overlapY = LINE_H - Math.abs(a.y - b.y);
        if (overlapX > 0 && overlapY > 0) {
          const push = overlapY / 2 + 2;
          if (a.y <= b.y) {
            a.y -= push;
            b.y += push;
          } else {
            a.y += push;
            b.y -= push;
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return placed.map(({ key, text, x, y }) => ({ key, text, x, y }));
}

export const TVFrame: React.FC<TVFrameProps> = (p) => {
  const nm = nodeMap(p.nodes);
  const vis = new Set(p.visible);
  const hot = new Set(p.highlight ?? []);
  const proj = makeProjector(p.nodes);
  const cx = (n: DiagramNode) => proj.px(n);
  const cy = (n: DiagramNode) => proj.py(n);
  const legend = legendEntries(p.nodes);

  // Pre-place edge labels once (perpendicular offset + de-collision) so they never overprint.
  const edgeLabels = layoutEdgeLabels(
    p.edges
      .map((e, i) => {
        const a = nm[e.from];
        const b = nm[e.to];
        if (!e.label || !a || !b || !vis.has(e.from) || !vis.has(e.to)) return null;
        return { key: i, text: e.label, x1: cx(a), y1: cy(a), x2: cx(b), y2: cy(b) };
      })
      .filter((x): x is EdgeLabelInput => x !== null),
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.bg,
        fontFamily: 'DejaVu Sans, Arial, Helvetica, sans-serif',
        color: C.label,
        backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }}
    >
      {/* Header */}
      <div style={{ position: 'absolute', left: 60, top: 54, right: 60 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div
            style={{
              color: C.eyebrow,
              fontSize: 20,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {p.seriesTitle}
          </div>
          <div style={{ color: C.ep, fontSize: 22, letterSpacing: '0.04em' }}>
            EP {String(p.episodeNo).padStart(2, '0')} · {p.dateLabel}
          </div>
        </div>
        <div style={{ color: C.title, fontSize: 56, fontWeight: 800, marginTop: 14, letterSpacing: '-0.01em' }}>
          {p.topicTitle}
        </div>
        <div style={{ color: C.sub, fontSize: 24, marginTop: 6 }}>{p.tagline}</div>
      </div>

      {/* Code slide takes over the main area when present, else the diagram. */}
      {p.code ? <CodeSlide code={p.code} /> : null}
      {!p.code && (
      <svg
        width={1920}
        height={1080}
        style={{ position: 'absolute', left: 0, top: 0 }}
        viewBox="0 0 1920 1080"
      >
        <defs>
          <marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
            <path d="M2,2 L10,6 L2,10" fill="none" stroke={C.edge} strokeWidth="2" />
          </marker>
          <marker id="arrowHot" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
            <path d="M2,2 L10,6 L2,10" fill="none" stroke={C.hot} strokeWidth="2.4" />
          </marker>
        </defs>
        {p.edges.map((e, i) => {
          const a = nm[e.from];
          const b = nm[e.to];
          if (!a || !b || !vis.has(e.from) || !vis.has(e.to)) return null;
          const isHot = hot.has(`${e.from}>${e.to}`);
          const x1 = cx(a);
          const y1 = cy(a);
          const x2 = cx(b);
          const y2 = cy(b);
          // trim endpoints so the arrow starts/ends at the node boxes, not their centers
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const pad1 = NODE_W / 2 + 8;
          const pad2 = NODE_W / 2 + 16;
          return (
            <g key={i}>
              <line
                x1={x1 + ux * pad1}
                y1={y1 + uy * pad1}
                x2={x2 - ux * pad2}
                y2={y2 - uy * pad2}
                stroke={isHot ? C.hot : C.edge}
                strokeWidth={isHot ? 3 : 2}
                strokeDasharray={e.dashed ? '7 7' : undefined}
                markerEnd={`url(#${isHot ? 'arrowHot' : 'arrow'})`}
              />
            </g>
          );
        })}
        {/* Edge labels, pre-placed so they sit off the line and never overprint. */}
        {edgeLabels.map((l) => (
          <text key={l.key} x={l.x} y={l.y} fill={C.sub} fontSize={16} textAnchor="middle">
            {l.text}
          </text>
        ))}
        {p.nodes.map((n) => {
          if (!vis.has(n.id)) return null;
          const isHot = hot.has(n.id);
          const shape: NodeShape = n.shape ?? 'service';
          const icon = getTechIcon(n.tech);
          const brand = icon ? onDark(icon.hex) : null;
          const accent = isHot ? C.hot : brand ? brand.accent : C.nodeBorder;
          const fill = isHot ? C.nodeFillHot : C.nodeFill;
          const sw = isHot ? 2.6 : 1.8;
          const X = cx(n);
          const Y = cy(n);
          // Cylinders push their text below the top cap so it sits in the body.
          const isCyl = shape === 'db' || shape === 'cache';
          const textDy = isCyl ? NODE_H * 0.12 : 0;
          const labelY = (n.sub ? Y - 6 : Y + 7) + textDy;
          return (
            <g key={n.id}>
              <NodeBackground
                shape={shape}
                x={X}
                y={Y}
                w={NODE_W}
                h={NODE_H}
                fill={fill}
                accent={accent}
                sw={sw}
                redisRed={icon ? icon.hex : undefined}
              />
              <NodeIcon x={X} y={Y} w={NODE_W} h={NODE_H} tech={n.tech} shape={shape} neutral={C.sub} />
              <text x={X} y={labelY} fill={C.label} fontSize={24} fontWeight={700} textAnchor="middle">
                {n.label}
              </text>
              {n.sub ? (
                <text x={X} y={labelY + 26} fill={C.sub} fontSize={16} textAnchor="middle">
                  {n.sub}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      )}

      {/* Legend: only the tech/shapes this episode actually uses. */}
      {!p.code && legend.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 60,
            bottom: 172,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            maxWidth: 1400,
            alignItems: 'center',
          }}
        >
          {legend.map((item) => (
            <div
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px 5px 8px',
                background: 'rgba(22,27,34,0.72)',
                border: `1px solid ${C.nodeBorder}`,
                borderRadius: 9,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" style={{ flex: '0 0 18px' }}>
                {item.paths.map((d, i) => (
                  <path key={i} d={d} fill={item.color} />
                ))}
              </svg>
              <span style={{ color: C.label, fontSize: 15, fontWeight: 600 }}>{item.label}</span>
              <span style={{ color: C.sub, fontSize: 15 }}>· {item.kind}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Beat progress dots */}
      <div style={{ position: 'absolute', left: 60, top: 210, display: 'flex', gap: 8 }}>
        {Array.from({ length: p.totalBeats }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === p.beatIndex ? 30 : 14,
              height: 6,
              borderRadius: 3,
              backgroundColor: i <= p.beatIndex ? C.hot : C.nodeBorder,
            }}
          />
        ))}
      </div>

      {/* Lower third */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 156,
          backgroundColor: C.band,
          borderTop: `1px solid ${C.nodeBorder}`,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ width: 8, height: 156, backgroundColor: C.hot }} />
        <div style={{ padding: '0 60px' }}>
          <div style={{ color: C.eyebrow, fontSize: 16, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
            Beat {p.beatIndex + 1} / {p.totalBeats}
          </div>
          <div style={{ color: '#eaf0f6', fontSize: 40, fontWeight: 600, lineHeight: 1.15 }}>{p.show}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
