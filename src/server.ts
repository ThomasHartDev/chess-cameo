// Local web scrubber: drag a percentage slider, see the exact board, export the frame.
// Reuses renderPng server-side so the preview is byte-identical to what `render`/`frames` emit.
import { createServer } from 'node:http';
import { loadPin } from './config.js';
import { parsePgn } from './game.js';
import { positionAtPercent } from './percent.js';
import { renderPng, type RenderOptions } from './render.js';

function bool(v: string | null): boolean {
  return v === '1' || v === 'true';
}

export function startServer(port: number, host = '0.0.0.0'): void {
  const pin = loadPin();
  const game = parsePgn(pin.pgn);

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname === '/render.png') {
      const pct = Number(url.searchParams.get('pct') ?? '0');
      const r = positionAtPercent(game, pct);
      const opts: RenderOptions = {
        size: Number(url.searchParams.get('size') ?? '720'),
        orientation: bool(url.searchParams.get('flip')) ? 'black' : 'white',
        coordinates: !bool(url.searchParams.get('nocoords')),
        transparent: bool(url.searchParams.get('transparent')),
        caption: bool(url.searchParams.get('nocaption')) ? null : r.caption,
        subCaption: bool(url.searchParams.get('nocaption'))
          ? null
          : `${pin.meta.white} vs ${pin.meta.black}`,
      };
      const png = renderPng(r.position, opts);
      const download = bool(url.searchParams.get('download'));
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        ...(download
          ? { 'Content-Disposition': `attachment; filename="board-${Math.round(r.pct)}.png"` }
          : {}),
      });
      res.end(png);
      return;
    }

    if (url.pathname === '/game.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          meta: pin.meta,
          source: pin.source,
          totalPlies: game.totalPlies,
          positions: game.positions.map((p) => ({
            ply: p.ply,
            moveNumber: p.moveNumber,
            san: p.san,
            moved: p.moved,
            fen: p.fen,
            pct: game.totalPlies ? (p.ply / game.totalPlies) * 100 : 0,
          })),
        }),
      );
      return;
    }

    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGE);
      return;
    }

    res.writeHead(404).end('not found');
  });

  server.listen(port, host, () => {
    console.log(`chess-cameo scrubber -> http://localhost:${port}  (also http://<this-host>:${port})`);
    console.log(`Pinned: ${pin.meta.white} vs ${pin.meta.black} — ${game.totalPlies} plies`);
  });
}

const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>chess-cameo scrubber</title>
<style>
  :root { --bg:#141210; --panel:#1d1a16; --line:#2e2a24; --ink:#efe7d3; --muted:#a99e88; --accent:#d8a24a; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font-family:'DejaVu Sans',system-ui,sans-serif; }
  .wrap { max-width:1040px; margin:0 auto; padding:28px 20px 60px; }
  h1 { font-size:20px; font-weight:700; letter-spacing:.01em; margin:0 0 2px; }
  .sub { color:var(--muted); font-size:13px; margin-bottom:22px; }
  .grid { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:24px; align-items:start; }
  @media (max-width:820px){ .grid{ grid-template-columns:1fr; } }
  .board { background:var(--panel); border:1px solid var(--line); border-radius:16px;
    padding:16px; }
  .board img { width:100%; height:auto; display:block; border-radius:8px; }
  .readout { display:flex; justify-content:space-between; align-items:baseline;
    margin:14px 2px 4px; }
  .pct { font-size:30px; font-weight:800; color:var(--accent); font-variant-numeric:tabular-nums; }
  .move { color:var(--muted); font-size:14px; }
  input[type=range]{ width:100%; margin:16px 0 4px; accent-color:var(--accent); height:26px; }
  .fen { font-family:'DejaVu Sans Mono',monospace; font-size:11px; color:var(--muted);
    word-break:break-all; margin-top:8px; }
  .panel { background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:16px; }
  .panel h2 { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted);
    margin:0 0 12px; font-weight:700; }
  .opts label { display:flex; align-items:center; gap:8px; font-size:14px; padding:5px 0; cursor:pointer; }
  .opts input,.opts select { accent-color:var(--accent); }
  .row { display:flex; gap:8px; margin-top:14px; }
  button,a.btn { flex:1; text-align:center; text-decoration:none; background:var(--accent); color:#241a08;
    border:0; border-radius:9px; padding:11px; font-weight:700; font-size:14px; cursor:pointer; }
  a.btn.ghost { background:transparent; color:var(--ink); border:1px solid var(--line); }
  .moves { margin-top:20px; max-height:280px; overflow:auto; }
  .moves ol { margin:0; padding:0; list-style:none; display:grid; grid-template-columns:auto 1fr 1fr; gap:2px 6px; }
  .moves .no { color:var(--muted); font-size:12px; padding:3px 4px; }
  .moves .m { font-size:13px; padding:3px 6px; border-radius:6px; cursor:pointer; }
  .moves .m:hover { background:var(--line); }
  .moves .m.active { background:var(--accent); color:#241a08; font-weight:700; }
  select { background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:7px; padding:5px; }
</style>
</head>
<body>
<div class="wrap">
  <h1 id="title">chess-cameo</h1>
  <div class="sub" id="subtitle">loading…</div>
  <div class="grid">
    <div class="board">
      <img id="board" alt="chess board"/>
      <div class="readout"><span class="pct" id="pctLabel">0%</span><span class="move" id="moveLabel"></span></div>
      <input type="range" id="slider" min="0" max="100" step="0.5" value="0"/>
      <div class="fen" id="fen"></div>
      <div class="row">
        <a class="btn" id="download">Download this frame</a>
        <a class="btn ghost" id="copyurl">Copy image URL</a>
      </div>
    </div>
    <div>
      <div class="panel opts">
        <h2>Options</h2>
        <label>Size <select id="size"><option>480</option><option selected>720</option><option>1080</option><option>1440</option></select></label>
        <label><input type="checkbox" id="flip"/> Flip (Black at bottom)</label>
        <label><input type="checkbox" id="transparent"/> Transparent background</label>
        <label><input type="checkbox" id="caption" checked/> Caption band</label>
        <label><input type="checkbox" id="coords" checked/> Coordinates</label>
        <div class="moves"><div id="moveList"></div></div>
      </div>
    </div>
  </div>
</div>
<script>
let G = null;
const el = (id) => document.getElementById(id);
function opts() {
  const p = new URLSearchParams();
  p.set('size', el('size').value);
  if (el('flip').checked) p.set('flip','1');
  if (el('transparent').checked) p.set('transparent','1');
  if (!el('caption').checked) p.set('nocaption','1');
  if (!el('coords').checked) p.set('nocoords','1');
  return p;
}
function plyForPct(pct){ return Math.round((pct/100) * G.totalPlies); }
let pending = null;
function refresh() {
  const pct = Number(el('slider').value);
  const p = opts(); p.set('pct', String(pct));
  const url = '/render.png?' + p.toString();
  el('board').src = url; // direct + reliable; server render is fast enough that no preload swap is needed
  const pos = G.positions[plyForPct(pct)];
  el('pctLabel').textContent = Math.round(pct) + '%';
  const san = pos.san ? (pos.moved === 'b' ? '…' : '') + pos.san : 'start';
  el('moveLabel').textContent = 'move ' + pos.moveNumber + ' · ' + san;
  el('fen').textContent = pos.fen;
  const dl = new URLSearchParams(p); dl.set('download','1');
  el('download').href = '/render.png?' + dl.toString();
  el('copyurl').dataset.url = location.origin + url;
  document.querySelectorAll('.m').forEach(m => m.classList.toggle('active', Number(m.dataset.ply) === pos.ply));
}
function debounce(fn, ms){ let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }
const refreshD = debounce(refresh, 50);
async function boot() {
  G = await (await fetch('/game.json')).json();
  el('title').textContent = G.meta.white + ' vs ' + G.meta.black;
  el('subtitle').textContent = G.meta.result + ' · ' + G.totalPlies + ' plies · ' + (G.source.selector || '');
  // build move list (pairs)
  const ol = document.createElement('ol');
  for (let i = 1; i <= G.totalPlies; i += 2) {
    const w = G.positions[i], b = G.positions[i+1];
    const no = document.createElement('div'); no.className='no'; no.textContent = w.moveNumber + '.';
    ol.appendChild(no);
    const wm = document.createElement('div'); wm.className='m'; wm.textContent=w.san; wm.dataset.ply=w.ply;
    wm.onclick=()=>{ el('slider').value=String(w.pct); refresh(); };
    ol.appendChild(wm);
    const bm = document.createElement('div');
    if (b){ bm.className='m'; bm.textContent=b.san; bm.dataset.ply=b.ply; bm.onclick=()=>{ el('slider').value=String(b.pct); refresh(); }; }
    ol.appendChild(bm);
  }
  el('moveList').appendChild(ol);
  ['input'].forEach(ev => el('slider').addEventListener(ev, refreshD));
  ['size','flip','transparent','caption','coords'].forEach(id => el(id).addEventListener('change', refresh));
  el('copyurl').onclick = (e)=>{ e.preventDefault(); navigator.clipboard?.writeText(e.currentTarget.dataset.url||''); e.currentTarget.textContent='Copied!'; setTimeout(()=>e.currentTarget.textContent='Copy image URL',1200); };
  refresh();
}
boot();
</script>
</body>
</html>`;
