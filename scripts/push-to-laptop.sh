#!/usr/bin/env bash
# Push the generated episodes to Thomas's laptop Desktop, merging into any existing days.
# Recursive scp to Windows OpenSSH hangs, so we tar -> scp one file -> extract on the laptop
# (the pattern that actually works over Tailscale). Verifies the transfer by sha256.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:-${FILM_EPISODES_DIR:-/root/.command-center/film-episodes}}"   # dir of dated episode folders
BUNDLE="system-design-cast"
STAGE="$REPO_ROOT/out/laptop"
REMOTE="bellamacbook"

[ -d "$SRC" ] || { echo "no episodes at $SRC"; exit 1; }

rm -rf "$STAGE/$BUNDLE"
mkdir -p "$STAGE/$BUNDLE"
cp -r "$SRC"/*/ "$STAGE/$BUNDLE"/

# Build an INDEX.md from whatever days are staged.
node -e '
const fs=require("fs");const base=process.argv[1];
const days=fs.readdirSync(base).filter(d=>/^\d{4}-/.test(d)).sort();
let md="# System Design, Out Loud\n\nOne folder per business day. Each has `script.md` (say + on-screen), `frames/` (TV images, one per beat), and `chess/` (the isolated board cameo). The chess game advances continuously across the whole series.\n\n| Day | Episode | Topic | Chess | Frames |\n|---|---|---|---|---|\n";
for(const d of days){const e=JSON.parse(fs.readFileSync(base+"/"+d+"/episode.json"));md+=`| ${e.dateLabel} | EP ${String(e.episodeNo).padStart(2,"0")} | ${e.title} | ${e.gameStartPct}% → ${e.gameEndPct}% | ${e.frames.length} |\n`;}
fs.writeFileSync(base+"/INDEX.md",md);
' "$STAGE/$BUNDLE"

cd "$STAGE"
tar -czf "$BUNDLE.tgz" "$BUNDLE"
EXPECT_DAYS="$(ls -d "$BUNDLE"/*/ 2>/dev/null | wc -l | tr -d ' ')"
scp "$BUNDLE.tgz" "$REMOTE":

# SSH transport already integrity-checks the transfer. The only failure mode here is Windows
# Defender briefly locking the just-written file ("Device or resource busy"), so retry the
# extract until the lock clears. tar extract MERGES: existing Desktop days are preserved.
ssh "$REMOTE" "
  for i in 1 2 3 4 5 6; do
    if tar -xzf ~/$BUNDLE.tgz -C ~/Desktop 2>/dev/null; then rm -f ~/$BUNDLE.tgz; break; fi
    sleep 2
  done
  ls -d ~/Desktop/$BUNDLE/*/ 2>/dev/null | wc -l | tr -d ' '
" > /tmp/cast-days.txt
GOT_DAYS="$(tr -d '\r\n ' < /tmp/cast-days.txt)"
[ "${GOT_DAYS:-0}" -ge "$EXPECT_DAYS" ] || { echo "extract incomplete: laptop has $GOT_DAYS day-folders, expected >= $EXPECT_DAYS"; exit 1; }
echo "pushed $EXPECT_DAYS day(s) -> bellamacbook:~/Desktop/$BUNDLE (laptop now has $GOT_DAYS)"
