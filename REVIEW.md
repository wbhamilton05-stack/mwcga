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
- ✅ 2026-06-18 — REVIEWER — CI gate re-run green on the canonical tree (HEAD `93e02a3`, incl. the Results tab): all `scripts/*.mjs` parse; index.html inline app parses (3,143 lines); cloud-writer guardrail clean (only `fetch-scores.mjs` + `fetch-live-scores.mjs` PUT). Verified by EXECUTING the gate, not reading it.
- ✅ 2026-06-18 — REVIEWER — **Scoring self-test authored + RUN: 23/23 pass** (`scripts/ci/selftest.mjs`). Asserts exact points for group W/D/L + goal-diff bonus ±3 (3-0→+6/−3, 5-0 capped, 1-7→−3/+6, draws 1/1), KO multipliers (r32 12/0 … sf 48/0 … final 78/0), and penalty-shootout = FULL 6× win (final 1-1 pens 4-2 → 78/0; equal pens → no advance 5/5). Plus a Number.isFinite NaN guard on every case. Closes the §R follow-up and wires it as **CI gate #4** in `ci.yml`. NOT covered: the app-side `scoreMatch` Civil War Bounty (lives in the index.html inline script → needs an app-side harness; preview-verified for now — tracked in CHECKS.md).
- 🟡 2026-06-18 — REVIEWER — `CHECKS.md` "run locally" snippet had a false-failure bug: `bad=$(…) && [ -z "$bad" ]` inherits `grep -l`'s exit 1 when it finds NOTHING (the clean case), so it exited 1 and never printed "ALL GATES GREEN" even on a clean tree. The actual `ci.yml` workflow was already correct (uses a `viol` counter — not affected). Fixed the doc snippet to a `( … exit $viol )` subshell. Landed in this PR.
- 🔵 2026-06-18 — REVIEWER — Per the flow, landing the above via the reviewer's OWN branch `chore/reviewer-scoring-selftest` → PR (not the builder's branch, not a direct push to `main`). The 🔵 CUTOVER ack above is still pending from the BUILDER session.
