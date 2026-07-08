// Filming interface: browse generated episodes, step through each beat's frame on the TV, and
// read both interview scripts (interviewer + candidate) beside the image. Reads episodes off disk
// at request time so freshly generated ones show up on refresh.
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, normalize } from 'node:path';

interface FrameMeta {
  index: number;
  frame: string;
  interviewer?: string;
  interviewee?: string;
  say?: string;
  show: string;
  gamePct: number;
  gameCaption: string;
}
interface EpisodeMeta {
  series: string;
  episodeNo: number;
  date: string;
  dateLabel: string;
  title: string;
  tagline: string;
  frames: FrameMeta[];
}

function readEpisodes(dir: string): EpisodeMeta[] {
  if (!existsSync(dir)) return [];
  const days = readdirSync(dir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const eps: EpisodeMeta[] = [];
  for (const d of days) {
    const f = join(dir, d, 'episode.json');
    if (existsSync(f)) {
      try {
        eps.push(JSON.parse(readFileSync(f, 'utf8')) as EpisodeMeta);
      } catch {
        /* skip malformed */
      }
    }
  }
  return eps;
}

export function startFilmServer(port: number, episodesDir: string, host = '0.0.0.0'): void {
  const root = resolve(episodesDir);

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname === '/api/episodes') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(readEpisodes(root)));
      return;
    }

    // /frame/<date>/<...path> -> serve the PNG from the episode folder (path-guarded)
    if (url.pathname.startsWith('/frame/')) {
      const rel = decodeURIComponent(url.pathname.slice('/frame/'.length));
      const abs = normalize(join(root, rel));
      if (!abs.startsWith(root) || !abs.endsWith('.png') || !existsSync(abs)) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      res.end(readFileSync(abs));
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
    const eps = readEpisodes(root);
    console.log(`chess-cameo filming interface -> http://localhost:${port}  (also http://<this-host>:${port})`);
    console.log(`Episodes dir: ${root} (${eps.length} episode(s))`);
  });
}

const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>chess-cameo · filming</title>
<style>
  :root { --bg:#0d1117; --panel:#161b22; --line:#2b3644; --ink:#e6edf3; --muted:#8b98a5; --hot:#e2a03f; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:'DejaVu Sans',system-ui,sans-serif; }
  .app { display:grid; grid-template-columns:230px 1fr; height:100vh; }
  .side { border-right:1px solid var(--line); overflow:auto; padding:16px 12px; }
  .side h1 { font-size:13px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin:0 0 14px; }
  .ep { display:block; width:100%; text-align:left; background:transparent; color:var(--ink); border:1px solid var(--line);
    border-radius:10px; padding:10px 12px; margin-bottom:8px; cursor:pointer; font-size:13px; }
  .ep:hover { border-color:var(--hot); }
  .ep.active { background:var(--hot); color:#241a08; font-weight:700; border-color:var(--hot); }
  .ep small { display:block; color:var(--muted); font-size:11px; margin-top:3px; }
  .ep.active small { color:#5a4212; }
  .main { display:flex; flex-direction:column; min-width:0; padding:20px 24px; overflow:auto; }
  .head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px; }
  .head .t { font-size:22px; font-weight:800; }
  .head .m { color:var(--muted); font-size:13px; }
  .stage { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(300px,1fr); gap:20px; align-items:start; }
  @media (max-width:1100px){ .stage{ grid-template-columns:1fr; } }
  .frameWrap { background:#000; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .frameWrap img { display:block; width:100%; height:auto; }
  .script .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 18px; margin-bottom:12px; }
  .role { font-size:12px; letter-spacing:.12em; text-transform:uppercase; margin-bottom:8px; }
  .role.iv { color:var(--muted); }
  .role.me { color:var(--hot); }
  .line { font-size:19px; line-height:1.4; }
  .cap { color:var(--muted); font-size:13px; }
  .cap b { color:var(--ink); }
  .controls { display:flex; gap:10px; align-items:center; margin:16px 0 6px; }
  button.ctl { background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:9px; padding:10px 16px; font-size:14px; cursor:pointer; }
  button.ctl.primary { background:var(--hot); color:#241a08; font-weight:700; border-color:var(--hot); }
  .count { color:var(--muted); font-size:13px; margin-left:auto; }
  .strip { display:flex; gap:8px; margin-top:14px; overflow-x:auto; padding-bottom:6px; }
  .strip img { height:64px; border-radius:6px; border:2px solid transparent; cursor:pointer; opacity:.6; }
  .strip img.active { border-color:var(--hot); opacity:1; }
  .empty { color:var(--muted); padding:40px; }
  /* TV mode: fullscreen frame for casting */
  #tv { position:fixed; inset:0; background:#000; display:none; align-items:center; justify-content:center; z-index:50; }
  #tv.on { display:flex; }
  #tv img { max-width:100vw; max-height:100vh; object-fit:contain; }
  #tvhint { position:fixed; bottom:14px; left:50%; transform:translateX(-50%); color:#8b98a5; font-size:13px; z-index:51; display:none; }
  #tv.on ~ #tvhint { display:block; }
</style>
</head>
<body>
<div class="app">
  <div class="side">
    <h1>Episodes</h1>
    <div id="epList"></div>
  </div>
  <div class="main" id="main">
    <div class="empty" id="empty">No episodes yet. Generate some, then refresh.</div>
    <div id="content" style="display:none;">
      <div class="head">
        <div class="t" id="epTitle"></div>
        <div class="m" id="epMeta"></div>
      </div>
      <div class="stage">
        <div>
          <div class="frameWrap"><img id="frame" alt="frame"/></div>
          <div class="controls">
            <button class="ctl" id="prev">← Prev</button>
            <button class="ctl" id="next">Next →</button>
            <button class="ctl primary" id="tvBtn">TV mode ⤢</button>
            <span class="count" id="count"></span>
          </div>
          <div class="strip" id="strip"></div>
        </div>
        <div class="script">
          <div class="card"><div class="role iv">Interviewer</div><div class="line" id="ivLine"></div></div>
          <div class="card"><div class="role me">You (candidate)</div><div class="line" id="meLine"></div></div>
          <div class="card"><div class="cap"><b>On screen:</b> <span id="showLine"></span><br/><b>Chess:</b> <span id="chessLine"></span></div></div>
        </div>
      </div>
    </div>
  </div>
</div>
<div id="tv"><img id="tvImg" alt="tv frame"/></div>
<div id="tvhint">← / → to step · Esc to exit TV mode</div>
<script>
const el = (id) => document.getElementById(id);
let EPS = [], ei = 0, bi = 0;
function frameUrl(ep, f){ return '/frame/' + ep.date + '/' + f.frame; }
function render(){
  const ep = EPS[ei]; if(!ep) return;
  const f = ep.frames[bi];
  el('epTitle').textContent = ep.title;
  el('epMeta').textContent = 'EP ' + String(ep.episodeNo).padStart(2,'0') + ' · ' + ep.dateLabel + ' · ' + ep.series;
  el('frame').src = frameUrl(ep, f);
  el('tvImg').src = frameUrl(ep, f);
  el('ivLine').textContent = f.interviewer || '(no interviewer line)';
  el('meLine').textContent = f.interviewee || f.say || '';
  el('showLine').textContent = f.show || '';
  el('chessLine').textContent = f.gamePct + '% · ' + (f.gameCaption||'');
  el('count').textContent = 'Beat ' + (bi+1) + ' / ' + ep.frames.length;
  document.querySelectorAll('#epList .ep').forEach((b,i)=>b.classList.toggle('active', i===ei));
  // filmstrip
  const strip = el('strip'); strip.innerHTML='';
  ep.frames.forEach((fr,i)=>{ const im=document.createElement('img'); im.src=frameUrl(ep,fr); im.className=i===bi?'active':''; im.onclick=()=>{bi=i;render();}; strip.appendChild(im); });
}
function pickEp(i){ ei=i; bi=0; render(); }
function step(d){ const ep=EPS[ei]; if(!ep) return; bi=Math.max(0,Math.min(ep.frames.length-1, bi+d)); render(); }
el('prev').onclick=()=>step(-1);
el('next').onclick=()=>step(1);
el('tvBtn').onclick=()=>{ el('tv').classList.add('on'); if(el('tv').requestFullscreen) el('tv').requestFullscreen().catch(()=>{}); };
el('tv').onclick=()=>{ el('tv').classList.remove('on'); if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); };
document.addEventListener('keydown',(e)=>{
  if(e.key==='ArrowRight') step(1);
  else if(e.key==='ArrowLeft') step(-1);
  else if(e.key==='Escape'){ el('tv').classList.remove('on'); }
  else if(e.key.toLowerCase()==='f'){ el('tvBtn').click(); }
});
async function boot(){
  EPS = await (await fetch('/api/episodes')).json();
  if(!EPS.length) return;
  el('empty').style.display='none'; el('content').style.display='block';
  const list = el('epList'); list.innerHTML='';
  EPS.forEach((ep,i)=>{ const b=document.createElement('button'); b.className='ep';
    b.innerHTML = ep.title + '<small>EP '+String(ep.episodeNo).padStart(2,'0')+' · '+ep.dateLabel+'</small>';
    b.onclick=()=>pickEp(i); list.appendChild(b); });
  pickEp(0);
}
boot();
</script>
</body>
</html>`;
