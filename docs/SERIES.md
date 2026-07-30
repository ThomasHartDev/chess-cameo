# Film series registry (binding)

Both series share the **dialogue + chess match** engine (`FINAL-INTERVIEW-FORMAT.md`):

- One professional game per video, **White wins only**
- **Interviewee = White**, **Interviewer = Black**
- Beats at **eval swings** (not series-wide %)
- Short **Remotion loops** under VO (`work` / `break`) for OBS / Film

| `seriesId` | Display name | Subject | Loop visual |
|------------|--------------|---------|-------------|
| `system-design` | System Design, Out Loud | Architecture interviews (CAP, latency, scale) | Service graphs, green flow / red failure |
| `cli-tools` | Command Line, Out Loud | Tools agents actually use on this fleet (basic → advanced) | Terminal pipelines, pipes, exit codes, failure modes |

## Shared rules (both series)

1. Dialogue interview shape (pressure → complete answer).
2. Chess cameo from a real White-win game.
3. AI-generatable via AI voice / generation context (topic, game, swings, script, loop storyboard).
4. Artifacts: `episode.json` + `script.md` + `chess/` + `loops/`.

## Series: system-design

- Standing laws: `film-complete-system`, `film-diagram-visual`, `film-eval-swing-interview`
- Nodes: services, DBs, caches, queues
- Interviewer: scale, partitions, SLOs, tradeoffs

## Series: cli-tools

**Thesis:** teach useful command-line tools by walking **real agent workflows** on this host (Grok / Claude / Codex on command-center fleet), basic → advanced.

Curriculum ladder (expand over time; each episode one tool-cluster or one real job):

| Level | Themes | Example tools / actions (from fleet practice) |
|-------|--------|-----------------------------------------------|
| 0 Basic | Navigate, read, edit safely | `pwd`, `cd`, `ls`, `cat`/`less`, `mkdir`, `mv`, `cp`, `rm` (careful), editors |
| 1 Everyday | Search, pipes, JSON, git | `rg`/`grep`, `find`, `head`/`tail`, `jq`, `git status/diff/log`, pipes `\|` |
| 2 Remote | Machines, files, process | `ssh`, `scp`, `curl`, `ss`/`lsof`, `ps`, `systemctl`, logs/`journalctl` |
| 3 Ship | GitHub, verify, deploy | `gh pr/issue`, `pnpm test`/`vitest`, `tsc`, merge/deploy scripts |
| 4 Media / browser | Proof, assets | `ffmpeg`, Browser Pilot / CDP, screenshots, `proof-screenshot` |
| 5 Agent power | Parallel, recovery | background jobs, timeouts, handoffs, env secrets pattern, `task-contract` |

**Interview framing for CLI episodes:**

- Interviewer (Black): “Why not the GUI?” / “What fails?” / “How do you not brick prod?” / “Show the pipeline.”
- Interviewee (White): concrete command → what it does → when it bites → safer form.
- **work** loop: green path (command succeeds, data flows through the pipe).
- **break** loop: red path (wrong flag, missing pipe, permission denied, hung SSH) labeled.

**Not** a dry man-page dump. Always: real task → dialogue → chess beat → loop.

## episode.json fields (series)

```json
{
  "seriesId": "cli-tools",
  "series": "Command Line, Out Loud",
  "format": "eval-swing-v1",
  "topic": "cli-rg-pipes",
  "cliLevel": 1,
  "tools": ["rg", "jq", "git"]
}
```

Film gallery groups by **series** first, then chess game / date.
