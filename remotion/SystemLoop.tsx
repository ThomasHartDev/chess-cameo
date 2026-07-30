/**
 * Short looping system-design graphic for interview beats.
 * mode=work → green flow; mode=break → red failure labels.
 * Designed for ~3s @ 30fps, small file, infinite loop under VO.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { DiagramEdge, DiagramNode } from '../src/episode/types';

export type SystemLoopProps = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  /** work = healthy flow; break = failure mode for interviewer pressure. */
  mode: 'work' | 'break';
  /** Short label under the graph (what is flowing or what is failing). */
  caption: string;
  /** Node or "from>to" edge that fails in break mode. */
  failTarget?: string;
  title?: string;
};

const C = {
  bg: '#0d1117',
  node: '#161b22',
  border: '#2b3644',
  label: '#e6edf3',
  sub: '#8b98a5',
  work: '#3dd68c',
  workDim: 'rgba(61,214,140,0.25)',
  break: '#ff6b6b',
  breakDim: 'rgba(255,107,107,0.3)',
  edge: '#3a4653',
  title: '#f2f6fa',
};

const NODE_W = 200;
const NODE_H = 72;

export const DEFAULT_LOOP_PROPS: SystemLoopProps = {
  title: 'Happy path',
  mode: 'work',
  caption: 'Request flows end-to-end',
  nodes: [
    { id: 'client', label: 'Client', x: 80, y: 200, shape: 'client' },
    { id: 'api', label: 'API', x: 380, y: 200, shape: 'service' },
    { id: 'kv', label: 'KV', sub: 'store', x: 680, y: 200, shape: 'db' },
  ],
  edges: [
    { from: 'client', to: 'api', label: 'req' },
    { from: 'api', to: 'kv', label: 'get' },
  ],
};

function nodeCenter(n: DiagramNode) {
  return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 };
}

export function SystemLoop(props: SystemLoopProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = { ...DEFAULT_LOOP_PROPS, ...props };
  const t = (frame % durationInFrames) / durationInFrames;
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  const accent = p.mode === 'work' ? C.work : C.break;
  const accentDim = p.mode === 'work' ? C.workDim : C.breakDim;

  // Packet position 0→1 along first edge path for a simple flow particle.
  const packetT = interpolate(frame % Math.round(fps * 1.2), [0, Math.round(fps * 1.2)], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const byId = new Map(p.nodes.map((n) => [n.id, n]));

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 28,
          color: C.title,
          fontSize: 28,
          fontWeight: 650,
          letterSpacing: 0.02,
        }}
      >
        {p.title ?? (p.mode === 'work' ? 'System working' : 'What can break')}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 68,
          color: accent,
          fontSize: 16,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.12,
        }}
      >
        {p.mode === 'work' ? '● flow ok' : '● failure mode'}
      </div>

      <svg width={960} height={540} style={{ position: 'absolute', inset: 0 }}>
        {p.edges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const A = nodeCenter(a);
          const B = nodeCenter(b);
          const key = `${e.from}>${e.to}`;
          const failing = p.mode === 'break' && p.failTarget === key;
          return (
            <g key={key}>
              <line
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={failing ? C.break : C.edge}
                strokeWidth={failing ? 4 : 2}
                strokeDasharray={failing || e.dashed ? '8 6' : undefined}
                opacity={failing ? 0.95 : 0.85}
              />
              {e.label && (
                <text
                  x={(A.x + B.x) / 2}
                  y={(A.y + B.y) / 2 - 10}
                  fill={failing ? C.break : C.sub}
                  fontSize={13}
                  textAnchor="middle"
                >
                  {failing ? `✗ ${e.label}` : e.label}
                </text>
              )}
              {p.mode === 'work' && !failing && (
                <circle
                  cx={A.x + (B.x - A.x) * packetT}
                  cy={A.y + (B.y - A.y) * packetT}
                  r={6}
                  fill={C.work}
                  opacity={0.9}
                />
              )}
            </g>
          );
        })}
      </svg>

      {p.nodes.map((n) => {
        const failing = p.mode === 'break' && p.failTarget === n.id;
        return (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left: n.x,
              top: n.y + 40,
              width: NODE_W,
              height: NODE_H,
              borderRadius: 14,
              background: C.node,
              border: `2px solid ${failing ? C.break : accent}`,
              boxShadow: failing
                ? `0 0 ${12 + pulse * 16}px ${accentDim}`
                : `0 0 ${8 + pulse * 10}px ${accentDim}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 14px',
            }}
          >
            <div style={{ color: C.label, fontSize: 18, fontWeight: 650 }}>{n.label}</div>
            {n.sub && <div style={{ color: C.sub, fontSize: 13 }}>{n.sub}</div>}
            {failing && (
              <div style={{ color: C.break, fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                FAILING
              </div>
            )}
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          bottom: 28,
          color: C.label,
          fontSize: 18,
          lineHeight: 1.35,
        }}
      >
        {p.caption}
      </div>
    </AbsoluteFill>
  );
}
