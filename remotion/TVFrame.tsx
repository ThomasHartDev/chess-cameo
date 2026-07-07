import { AbsoluteFill, Img } from 'remotion';
import type { TVFrameProps, DiagramNode } from '../src/episode/types';

const BOX = { left: 60, top: 258, w: 1080, h: 640 }; // diagram area
const NODE_W = 208;
const NODE_H = 78;

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
    { id: 'a', label: 'Client', x: 80, y: 340 },
    { id: 'b', label: 'API', sub: 'shorten service', x: 430, y: 340 },
    { id: 'c', label: 'KV Store', sub: 'code → url', x: 800, y: 340 },
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

function nodeMap(nodes: DiagramNode[]): Record<string, DiagramNode> {
  return Object.fromEntries(nodes.map((n) => [n.id, n]));
}

export const TVFrame: React.FC<TVFrameProps> = (p) => {
  const nm = nodeMap(p.nodes);
  const vis = new Set(p.visible);
  const hot = new Set(p.highlight ?? []);
  const cx = (n: DiagramNode) => BOX.left + n.x;
  const cy = (n: DiagramNode) => BOX.top + n.y;

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

      {/* Diagram */}
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
              {e.label ? (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 10}
                  fill={C.sub}
                  fontSize={16}
                  textAnchor="middle"
                >
                  {e.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {p.nodes.map((n) => {
          if (!vis.has(n.id)) return null;
          const isHot = hot.has(n.id);
          const x = cx(n) - NODE_W / 2;
          const y = cy(n) - NODE_H / 2;
          return (
            <g key={n.id}>
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={14}
                fill={isHot ? C.nodeFillHot : C.nodeFill}
                stroke={isHot ? C.hot : C.nodeBorder}
                strokeWidth={isHot ? 2.4 : 1.5}
              />
              <text
                x={cx(n)}
                y={n.sub ? cy(n) - 6 : cy(n) + 7}
                fill={C.label}
                fontSize={22}
                fontWeight={700}
                textAnchor="middle"
              >
                {n.label}
              </text>
              {n.sub ? (
                <text x={cx(n)} y={cy(n) + 20} fill={C.sub} fontSize={15} textAnchor="middle">
                  {n.sub}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* Chess cameo */}
      <div style={{ position: 'absolute', right: 60, top: 232, width: 560 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <span style={{ color: C.eyebrow, fontSize: 17, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>
            Game progress
          </span>
          <span style={{ color: C.hot, fontSize: 30, fontWeight: 800 }}>{Math.round(p.gamePct)}%</span>
        </div>
        {p.chessDataUri ? (
          <Img
            src={p.chessDataUri}
            style={{ width: 560, height: 560, borderRadius: 12, border: `1px solid ${C.nodeBorder}` }}
          />
        ) : (
          <div style={{ width: 560, height: 560, borderRadius: 12, border: `1px solid ${C.nodeBorder}` }} />
        )}
        <div style={{ color: C.sub, fontSize: 20, marginTop: 12, textAlign: 'center' }}>{p.gameCaption}</div>
      </div>

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
