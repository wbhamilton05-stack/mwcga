# MWCGA — Build Handoff (next session)

**Last updated:** 2026-06-18, end of the Crystal Ball Cup build (paired BUILDER + REVIEWER).
**Canonical tree:** this repo, `mwcga-git/` (clone of `wbhamilton05-stack/mwcga`). The GitHub remote is the cross-Mac source of truth — **not** iCloud, **not** the old `deploy/` mirror.

> This is the in-repo, version-controlled handoff. The old `../CLAUDE_CODE_HANDOFF.md` (iCloud root) is retained for history but is **superseded by this file + memory + `REVIEW.md` §R**.

---

## 0. START HERE
1. **Read memory:** `~/.claude/projects/-Users-willhamilton-Documents-Claude-Projects-World-Cup-Family-Game/memory/` → `MEMORY.md`, then `mwcga-dual-agent-git-build`, `mwcga-crystal-ball-cup`, `mwcga-scoring-rules`, `hamilton-family-facts`.
2. **Read the review channel:** `REVIEW.md` §R (append-only; newest at the bottom). It carries live directives (🔴/🟡/🔵/✅) and the operator/Will to-dos.
3. **Confirm you're current:** `git fetch && git log origin/main --oneline -5`. Build from fresh `main`.
4. **Pick up the next unit** (§3 below) on a `feat/<unit>` branch.

## 1. Operating model — Dual-Agent Git Build (the rules)
- **BUILDER** (local session): works only on `feat/<unit>` branches, commits there, opens one PR per unit, **never commits to `main`**. Self-tests the full gate before marking a PR ready.
- **REVIEWER** (separate, remote-only via `gh`): reviews PRs, runs the gate **by executing it**, directs via `REVIEW.md` §R. Lands its own fixes on its own branch → PR. Never edits the builder's branch.
- **Definition of done = green CI (the 5 gates) + reviewer PR approval.** Never a self-assessment. A 🔴 in §R clears only via a ✅ citing an executed result.
- **Coordination:** only one session manipulates the local checkout at a time. Append to §R for both sides; expect (trivial) append conflicts and keep both sides.
- **Branch protection on `main` is intentionally NOT enabled** — nightly content Actions (radio/previews/briefing/score-sync/civil-war) push directly to `main`. Gate by the required `gates` status check + the feat→PR convention, *not* a blanket push block. (Open decision for Will — see §R.)

## 2. Current state (what's live / pending)
- 🛑 **2026-06-25 — ALL automated daily content REMOVED** (`chore/remove-daily-content`, Will's call — "too much"). The 4 content crons (briefing emails + radio podcasts, match previews + posters, civil-war announcer email, draft tripwire email) and their generator scripts/templates are **deleted**. The **already-generated archive is kept frozen** (`briefings/`, `podcasts/`, `matchday/`, `podcast.xml`, `match-previews.xml` + manifests) and the app's News Desk / poster UI is untouched — it just no longer grows. **Do NOT re-add content generation** without Will asking. Score Sync, `league-data.mjs`, CI, and the in-app game features were all kept. (Unused Gmail/Gemini/recipient secrets were intentionally left in place.)
- ✅ **Task D — Civil War Bounty:** live in `index.html`.
- ✅ **Task G1 — Crystal Ball Cup (in-app 🔮 tab):** merged & live (PR #3). `state.predictions` syncs like `state.bounties`.
- ✅ **Task G2 — Crystal Ball email side-leaderboard:** merged (PR #5). NOTE: this rode the now-removed `daily-recap` email path, so it no longer sends — the in-app 🔮 tab remains the live surface.
- ✅ **CI:** 5 gates on every PR — parse scripts, parse app, cloud-writer guardrail, scoring self-test (`selftest.mjs`, gate #4, 42/42), Civil-War self-test (`selftest-civil.mjs`, gate #5, 11/11).

## 3. Next candidate build units (prioritized)
1. **Merge G2 (PR #5)** — reviewer action; unblocks "Crystal Ball in the emails."
2. **App-side `scoreMatch` Civil War Bounty test harness** *(reviewer-tracked gap; do before KO June 28).* `selftest.mjs` covers the `league-data` path only; the app's inline `scoreMatch` bounty branch is preview-verified only. Needs an app-side scoring harness so the bounty math is executable-verified before the first real same-owner KO match.
3. **Tier-2 roadmap (group-stage lull, ~June 28):**
   - **Owner-colored bracket page** once the Round of 32 locks — each KO slot tinted by owner; "path to the ×13 Final" per player.
   - **Points-race chart** on the Rankings tab (4 colored lines).
   - **EXTRA! editions** — hourly cron during match windows that emails BREAKING only on something newsworthy (big upset by implied odds, an owned team eliminated, bracket clinch); quiet otherwise.
   - **Sunday Long Read** — weekly multi-agent magazine feature.
4. **Side-game pattern:** Crystal Ball is the template for future side-games — `state.<namespace>` synced like `bounties`/`predictions`, scoring core once in `league-data.mjs` (tested), app mirror in `index.html`, optional email section in `daily-recap.mjs`.

## 4. How to verify (definition of done is executable)
**Full gate locally (run before every PR):**
```sh
for f in scripts/*.mjs; do node --check "$f"; done \
 && awk '/<script>/{f=1;next} /<\/script>/{f=0} f' index.html > /tmp/app.js && node --check /tmp/app.js \
 && ( viol=0; for f in scripts/*.mjs; do case "$f" in scripts/fetch-scores.mjs|scripts/fetch-live-scores.mjs) ;; *) grep -qE "method:.{0,3}PUT" "$f" && viol=1;; esac; done; exit $viol ) \
 && node scripts/ci/selftest.mjs && node scripts/ci/selftest-civil.mjs && echo "ALL GREEN"
```
- **App UI:** preview server is `.claude/launch.json` name `mwcga` (serves `deploy/` on :8642). The preview serves `deploy/`, so to preview an `index.html` change either repoint the server or copy the WIP into `deploy/` and restore it after (`deploy/` md5 baseline today = `a23bbc7b3b92cbd67776ec53ddb79291`). Inject mock `state` via `preview_eval` — `state.cloudGameId` is `null` on fresh load so the preview never touches live Firebase.
- **Emails:** run `daily-recap.mjs` against a local mock (a tiny HTTP server returning `{state:{…}}` for the game and `{matches:[…]}` for the feed) with `MWCGA_GAME_URL`/`MWCGA_FEED_URL`/`MWCGA_FAKE_TODAY`/`MWCGA_MODE`. It writes `recap.html`/`recap.txt` (gitignore-worthy build artifacts — don't commit them).

## 5. Gotchas (hard-won)
- **§5 — scoring is duplicated in 3 places** (`scoreMatch` in `index.html`, `matchPoints` in `league-data.mjs`, `points()` in `daily-recap.mjs`). Any fantasy-scoring change must touch all three and add a `selftest.mjs` case. New *side-game* logic should live **once** in `league-data.mjs` and be imported where possible (the app is the only forced duplicate).
- **Keys: always use `appMatchKey()`** (`league-data.mjs`) to derive a match key from a feed match — it's what the score writers and the app agree on (`'k'+num`, else `date|mappedTeams`). Don't hand-roll an "equivalent."
- **New `state.<key>` syncs for free** — `stripCloudKeys` keeps everything except cloud meta / matches / lastSync / scheduleVersion; `validCloudState` tolerates extra keys; the whole-state cloud pull adopts them. (That's how `predictions`/`bounties` sync.) Don't add a new key to the strip list.
- **CI won't run on a conflicted PR** — `pull_request` runs need a buildable merge commit. If CI "stops firing," check `gh pr view <n> --json mergeStateStatus` before anything else.
- **Mid-session merges:** if the prior unit merges while you're stacked on it, `git rebase origin/main` to get a clean per-unit diff.
- **`deploy/` is a retired mirror** — don't push it anywhere; retiring it fully is an open cleanup.

## 6. Open operator tasks (Will's — not code)
1. **Apply the Firebase lockdown rules** in the console (`database.rules.json`; test the 4 checks in `LIVE-SCORES-SETUP.md` Rules Playground before Publish).
2. **Confirm `MWCGA_RECIPIENTS`** = all 4 family addresses (3 email paths depend on it: daily-recap, civil-war announcer, and now the Crystal Ball section rides the daily-recap path).
3. **Confirm the ESPN live poller** fires on the MBP during a live match (`tail -f /tmp/mwcga-livescores.log`).
4. **Decide branch-protection approach** for `main` (required `gates` check + bot bypass vs. convention only) — see §R.

## 7. Reference
- Players: Will (0, 🔴), Granddad (1, ⚪), Barnes (2, 🟡), Warner (3 — age **10**, 🔵). Family-safe content always.
- Firebase RTDB `mwcga-c2e5e`, game id `wcuaw50n22xo`. Live app: https://wbhamilton05-stack.github.io/mwcga/
- Scoring house rules (locked 2026-06-17): group GD bonus ±min(margin,3); KO win = 6×mult; penalty-shootout win = FULL 6×; Civil War Bounty (same-owner KO → predict winner, correct 3×/wrong 1×, default-to-favorite). Crystal Ball Cup is **bragging rights only** and never touches these.
