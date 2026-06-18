# REVIEW.md — Dual-Agent Git Build review channel (§R)

> **Append-only.** Newest entries at the bottom; never rewrite prior entries — this is the audit trail.
> Tags: 🔴 blocker (blocks merge) · 🟡 should-fix · 🔵 note/direction · ✅ verified (cite the executed result).
> A 🔴 clears **only** via a ✅ citing an executed result, never by an agent asserting it's fixed.
>
> **Roles:**
> - **BUILDER** = session `local_86c1fc12` — owns `feat/<unit>` branches, commits there, opens PRs. Never commits to `main`.
> - **REVIEWER** = the review session — reviews PRs, runs/authors the CHECKS gate, never edits the builder's branch. Lands its own fixes via its own branch → PR.

## §R — entries

- ✅ 2026-06-18 — REVIEWER — Scoring engine verified live across all three paths (`scoreMatch` in index.html, `matchPoints` in league-data, daily-recap `points()`): group goal-diff ±3 bonus, penalty win = 6× (Final on pens → 78/0), Civil War Bounty. Confirmed via `gh` + live curl.
- ✅ 2026-06-18 — REVIEWER — Results tab live (commit `1a28d04`, Pages green): completed games browsable by match day / group / nation with odds, owners, and upset callouts. Matches Will's "look back at past scores" ask.
- ✅ 2026-06-18 — REVIEWER — CI gate authored and verified green locally before commit: all scripts parse; index.html inline script extracts + parses (3,143 lines); guardrail confirms only `fetch-scores.mjs` + `fetch-live-scores.mjs` PUT the cloud. This PR adds it.
- 🔵 2026-06-18 — REVIEWER — **CUTOVER to git.** Project migrated onto the Dual-Agent Git Build flow: a clone of `wbhamilton05-stack/mwcga` is now the canonical working tree (the old non-git `deploy/` folder was a partial mirror missing `briefings/`,`podcasts/`,`matchday/`). **BUILDER: please switch to `feat/<unit>` branches → PR and stop pushing directly to `main`.** Branch protection will be enabled **only after you acknowledge here**, so the live build isn't cut off mid-flight.
- 🟡 2026-06-18 — REVIEWER — Open operator tasks (not code, need Will): (1) apply Firebase lockdown rules in the console (`database.rules.json`, 4-check Rules Playground); (2) verify `MWCGA_RECIPIENTS` = all 4 addresses — **three** email paths now depend on it (daily-recap, civil-war announcer, …); (3) confirm the ESPN poller fires on the MBP during the next match (`tail -f /tmp/mwcga-livescores.log`).
- 🟡 2026-06-18 — REVIEWER — Follow-up units worth tracking: author the scoring self-test (`scripts/ci/selftest.mjs`) so scoring becomes a CI gate; add a `league-data.mjs` drift check. See CHECKS.md "deferred".
- 🔵 2026-06-18 — BUILDER — **CUTOVER ACKNOWLEDGED.** Switched off the old `deploy/` + contents-API-to-`main` workflow. Now working in `mwcga-git/` on `feat/<unit>` branches → PR → merge on green CI + reviewer approval; **I will not commit to `main` directly.** Pre-build sync verified clean: canonical `index.html`, the `deploy/` mirror, and the LIVE Pages blob all = md5 `a23bbc7b3b92cbd67776ec53ddb79291`. **Reviewer: you're clear to enable branch protection on `main`.** First unit incoming on `feat/crystal-ball-cup`: **Task G — Crystal Ball Cup** — reuses Task D's `bounties`/`saveState`/cloud-sync plumbing (new `state.predictions` namespace), **sacred scoring untouched** (no edits to `scoreMatch`/`totalPoints`); side-leaderboard only. Building it as two units: G1 = in-app tab; G2 = email side-leaderboard (`league-data.mjs` + nightcap/briefing).
