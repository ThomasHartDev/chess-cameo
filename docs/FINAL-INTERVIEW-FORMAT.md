# Final interview format (binding) — all Film series

**Status:** final desired product direction (Thomas 2026-07-30, extended 2026-07-30 for multi-series).  
Supersedes multi-episode % chess cameo + static diagram stills for new work.

**Applies to every Film side series**, including:

| seriesId | Name | Topic domain |
|----------|------|----------------|
| `system-design` | System Design, Out Loud | Architecture interviews |
| `cli-tools` | Command Line, Out Loud | Agent/CLI tools, basic → advanced |

Series-specific curriculum and loop vocabulary: **`docs/SERIES.md`**.

## One video = one professional chess game + one dialogue lesson

| Role | Chess | Speaking |
|------|--------|----------|
| **Interviewee (Thomas)** | Always **White** | Answers when **White is winning** (eval favors White) |
| **Interviewer** | Always **Black** | Questions / pressure when **Black is winning** |

- Pick **real professional games where White wins** (`1-0`) so the interviewee “closes” — last spoken beat is White’s answer.
- **No series-wide percentages.** Chess progress is **inside one game**: board position tracks plies at eval-swing beats.
- At each swing (side with advantage changes, or a clear local peak), cut a beat:
  - **Black advantage** → interviewer follow-up (domain pressure: scale/CAP **or** “what fails on the CLI?”).
  - **White advantage** → interviewee response (fix / rework / safer command / tradeoff named).

Material balance (or Stockfish when available) is the swing signal. Prefer Stockfish; fall back to material.

## Diagrams are short looping videos (not stills)

Each beat (or each major arc state) has a **Remotion loop** (~2–6s, small file, infinite loop):

| Mode | Look | When |
|------|------|------|
| **`work`** | Green accents, data flowing end-to-end | Happy path / fixed design / successful command pipeline |
| **`break`** | Same topology, red/amber failure labels, broken edges | Interviewer names a failure mode / bad flag / hung SSH |

While Thomas speaks that beat’s script, the loop plays under the camera (OBS window / Browser Source).  
**One cycle** of the system (or pipeline), then repeat — no long linear animations.

For **system-design**, Complete-System Law still applies (source → work → sink). See `complete-system-law.md`.  
For **cli-tools**, the “system” is a **command pipeline**: input → tools → output, still complete each beat.

## Episode product shape

- Multiple series in Film; each series can ship many episodes over time.
- Artifacts per episode:
  - `episode.json` — `seriesId`, beats with `speaker`, `chessPly`, eval, `loopMode`, script lines
  - `chess/beat-NN.png` — board at that ply
  - `loops/*.mp4` — short Remotion loops
  - `script.md` — full VO
- Film / OBS: show **loop video** in place of static diagram PNG; chess board still a separate cameo image if needed.

## AI generation (daily one-shot)

All creative inputs live in **AI voice / generation context** so they can be iterated and trained:

1. Series + topic + interview arc (SD pressure **or** CLI task pressure).
2. Chess game pick (White win, professional PGN).
3. Eval-swing beat cut + speaker assignment.
4. Loop storyboard (`work` / `break` labels, which edge/command fails).
5. Script lines (interviewer / interviewee).

Standing laws: `film-complete-system`, `film-diagram-visual`, `film-eval-swing-interview`, `film-cli-tools-series`, plus this doc + `SERIES.md`.

## Command Center

- Film panel: group by **series**, play loops, OBS Browser Source = loop URL.
- Phone cam / OBS scene still separate (camera + overlays).

## Implementation map

| Piece | Path |
|-------|------|
| Series registry | `docs/SERIES.md`, `src/series.ts` |
| Eval swings | `src/eval-swings.ts` |
| Loop composition | `remotion/SystemLoop.tsx` |
| Episode types | `src/episode/types.ts` (`speaker`, `loopMode`, …) |
| Generate CLI | `src/episode/generate.ts` / `scripts/` |
| Film disk layout | `out/episodes/<date>/` or `/root/.command-center/film-episodes/` |
| CC reader | `lib/film/episodes.ts` + Film panel video tags |
| Voice laws | `lib/voice-learning/standing-laws.ts` |
