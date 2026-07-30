# Final interview format — System Design, Out Loud (binding)

**Status:** final desired product direction (Thomas 2026-07-30).  
Supersedes multi-episode % chess cameo + static diagram stills for new work.

## One video = one professional chess game + one system design interview

| Role | Chess | Speaking |
|------|--------|----------|
| **Interviewee (Thomas)** | Always **White** | Answers when **White is winning** (eval favors White) |
| **Interviewer** | Always **Black** | Questions / pressure when **Black is winning** |

- Pick **real professional games where White wins** (`1-0`) so the interviewee “closes” — last spoken beat is White’s answer.
- **No series-wide percentages.** Chess progress is **inside one game**: board position tracks plies at eval-swing beats.
- At each swing (side with advantage changes, or a clear local peak), cut a beat:
  - **Black advantage** → interviewer follow-up (scale, CAP, latency, failure mode, tradeoff).
  - **White advantage** → interviewee response (fix / rework / tradeoff named).

Material balance (or Stockfish when available) is the swing signal. Prefer Stockfish; fall back to material.

## Diagrams are short looping videos (not stills)

Each beat (or each major arc state) has a **Remotion loop** (~2–6s, small file, infinite loop):

| Mode | Look | When |
|------|------|------|
| **`work`** | Green accents, data flowing end-to-end | Happy path / fixed design |
| **`break`** | Same topology, red/amber failure labels, broken edges | Interviewer names a failure mode |

While Thomas speaks that beat’s script, the loop plays under the camera (OBS window / Browser Source).  
**One cycle** of the system, then repeat — no long linear animations.

Complete-System Law still applies: every diagram state is a full working system (source → work → sink). Complexity grows by add/rework/branch under interviewer pressure. See `complete-system-law.md`.

## Episode product shape

- **Single episode first** (no multi-day gallery of partial % segments).
- Artifacts per episode:
  - `episode.json` — beats with `speaker`, `chessPly`, `evalCp` / material, `loopMode`, script lines
  - `chess/beat-NN.png` — board at that ply
  - `loops/beat-NN.mp4` (or webm) — short Remotion loop
  - `script.md` — full VO
- Film / OBS: show **loop video** in place of static diagram PNG; chess board still a separate cameo image if needed.

## AI generation (daily one-shot)

All creative inputs live in **AI voice / generation context** so they can be iterated and trained:

1. Topic + interview arc (questions under pressure, CAP, latency SLOs, tradeoffs).
2. Chess game pick (White win, professional PGN).
3. Eval-swing beat cut + speaker assignment.
4. Loop storyboard (`work` / `break` labels, which edge fails).
5. Script lines (interviewer / interviewee).

Standing laws: `film-complete-system`, `film-diagram-visual`, plus this doc.

## Command Center

- Film panel: **one primary episode**, loops playable (and OBS Browser Source URL for each loop or a single player page).
- Phone cam / OBS scene still separate (camera + overlays).

## Implementation map

| Piece | Path |
|-------|------|
| Eval swings | `src/eval-swings.ts` |
| Loop composition | `remotion/SystemLoop.tsx` |
| Episode types | `src/episode/types.ts` (`speaker`, `loopMode`, …) |
| Generate CLI | `src/episode/generate.ts` / `scripts/` |
| Film disk layout | `out/episodes/<date>/` or `/root/.command-center/film-episodes/` |
| CC reader | `lib/film/episodes.ts` + Film panel video tags |
| Voice laws | `lib/voice-learning/standing-laws.ts` |
