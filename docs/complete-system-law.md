# Complete-System Law (Arjay pattern) — STRICT

**Every diagram beat is a complete working system.** Complexity varies; completeness does not.

This is the binding rule for Film-tab interview episodes (`src/episode/topics.ts` and
`src/episode/projects/*.json`). It mirrors how strong system-design interview videos
(e.g. Arjay) whiteboard: each frame is a system that would run, then the interviewer
pushes a harder case and the *next* frame is still complete, with pieces added or
reworked to answer that case.

## Arc (every interview episode)

1. **Beat 1 — naive complete.** Simplest design that still works end-to-end for the
   happy path (request in → process → store/response out).
2. **Interviewer follow-up.** Names a real gap: scale, offline, burst, celebrity,
   multi-server, exactness, failure mode, etc.
3. **Next beat — still complete.** Same story as a full system, with nodes **added**,
   **replaced**, or **re-routed** to address that case. Highlight what changed.
4. Repeat until the production design. Wrap beats may re-highlight tradeoffs without
   stripping the graph back to fragments.

Code slides are exempt (they show a snippet + folder tree, not the architecture graph).

## What "complete" means

For a diagram beat, the `visible` node set must form an **end-to-end runnable path**:

| Role | Examples |
|------|----------|
| Source | client, user, event stream, author |
| Work | API, gateway, worker, sketch, id gen, token bucket |
| Sink / durable | KV, DB, cache, recipient client, Top-K result, 429, final message |

Minimum bar enforced in `validate.ts`:

1. At least **3** visible nodes on a diagram beat (2 only if both ends of a single
   clear hop are intentional — prefer 3+).
2. At least **one edge** with both ends visible (something actually connected).
3. **No orphan nodes**: every visible node has degree ≥ 1 in the induced subgraph
   (both endpoints of some visible edge). Isolated "problem labels" that do not
   participate in the path are not allowed — either wire them in or leave them out
   until the beat that uses them.
4. Prefer a **source + work + sink** read: a viewer who never hears the VO should
   still see "who starts, what runs, where it ends."

## How complexity grows (allowed deltas)

| Move | When | Example |
|------|------|---------|
| **Add** | New subsystem for a new case | Redis counters when multi-server appears |
| **Rework** | Same job, better mechanism | Hash → counter/base62; fixed window → token bucket |
| **Branch** | Alternate path for a case | Celebrity merge-on-read beside normal fan-out |
| **Highlight only** | Same complete graph, stress a tradeoff | Fail-open vs fail-closed on Redis |

## Forbidden (the old progressive-reveal trap)

- Assembling one final diagram piece-by-piece so early beats are **incomplete**:
  - Client → API with **no store** (URL shortener that cannot redirect)
  - Gateway + limiter with **no allow/deny** path to a service
  - Event stream → Top-K result with **no counting mechanism**
  - Author → Write API with **no feed path for readers**
- Showing only the "new box" without the rest of the path that uses it
- Leaving a visible node floating with no edge in that beat
- Treating "reveal more nodes" as the default beat structure

## Authoring checklist

Before locking a topic:

- [ ] Beat 1 alone could ship as a toy system for the happy path
- [ ] Every later beat still answers "walk me through a request" without inventing
      hidden boxes off-screen
- [ ] Interviewer lines are real pressure (scale / failure / exactness), not
      "and what's next on the diagram?"
- [ ] Highlight points at the **delta** (what was tacked on or reworked)
- [ ] `pnpm exec tsx` / `validateTopic` passes (complete-system checks included)

## Implementation map

| Piece | Path |
|-------|------|
| Law (this file) | `docs/complete-system-law.md` |
| Shape/icon grammar | `docs/diagram-conventions.md` |
| Types | `src/episode/types.ts` |
| Validator | `src/episode/validate.ts` |
| Built-in topics | `src/episode/topics.ts` |
| Interview project topics | `src/episode/projects/*.json` |
| PR → topic drafter prompt | `scripts/draft-topic.ts` |
| Skill (agents) | `~/.claude/skills/system-design-cast/SKILL.md` |
| Film panel (CC) | command-center `components/chat/film-panel.tsx` |

## Why this exists

Progressive reveal reads as a tutorial stack ("here is piece 1… piece 2…"). Interview
videos deep-dive by **evolving a working design** under pressure. Each graphic must
earn the word "system," not "fragment of a future system."
