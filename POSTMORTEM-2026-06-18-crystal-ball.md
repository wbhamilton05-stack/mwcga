# Postmortem — Crystal Ball Cup build (2026-06-18, Dual-Agent Git Build)

**Session:** paired BUILDER + REVIEWER, first full feature run on the new Dual-Agent Git Build flow.
**Shipped:** Task G — the Crystal Ball Cup — end to end.
**Outcome:** ✅ G1 (in-app tab) merged & live; ✅ G2 (email side-leaderboard) built, [PR #5](https://github.com/wbhamilton05-stack/mwcga/pull/5) green & awaiting reviewer approval. Sacred fantasy scoring provably untouched throughout.

---

## What was built

| Unit | What | Where | State |
|------|------|-------|-------|
| **G1** | 🔮 Crystal Ball tab — predict each match winner before kickoff; round-weighted, tie-ranked leaderboard; per-player pick controls (seat-gated); Today-tab nudge | `index.html` (`state.predictions` + `matchOutcome`/`pickLocked`/`cbOptions`/`cbBoard`/…) | **Merged** (PR #3 → `65d44e6`), Pages green, live in the family app |
| **G1 core** | Executable-verified scoring primitives | `league-data.mjs` `crystalOutcome()`/`crystalBallPoints()` + 15 self-test cases | Merged with G1; gate #4 → 38/38 |
| **G2** | 🔮 side-leaderboard section in BOTH the morning briefing and the nightcap, with a "pick before kickoff" nudge | `league-data.mjs` `crystalBallBoard()` + `daily-recap.mjs` | **PR #5 open**, green CI, awaiting review; gate #4 → 42/42 |

**Product decisions (ratified by Will):** round-weighted scoring (reuses `ROUND_MULT`, group +1 … Final +13) and an in-app tab (resolved the roadmap-"standalone page" vs handoff-"reuse in-app plumbing" conflict in favor of the handoff). Unset pick = no points (must play to score) — deliberately different from the Civil War Bounty's default-to-favorite.

**Invariant held:** Crystal Ball is a separate bragging-rights board. `git diff main` on `index.html` was **+265/−0** — zero edits to `scoreMatch`/`matchPoints`/`totalPoints`/`scoreOverrides`. The 23 sacred scoring self-test cases stayed exact the whole way.

---

## What worked

- **The git gate did its job.** Branch → PR → green CI (5 deterministic gates) + reviewer approval → merge. "Done" was never a self-assessment. G1 merged only after the reviewer re-ran the gates in an isolated worktree and confirmed +265/−0.
- **Executable verification at every layer.** App: preview (open pick → locked → decided ✓/✗, group-DRAW vs KO-no-draw, ×13 Final, tie-ranking, live click, zero console errors). Scoring: self-test grew 23 → 42. Emails: a functional render test (real `daily-recap.mjs` run against a local mock) — not just reading the code.
- **Per-unit PRs kept review tractable.** G1 (app) and G2 (emails) were separate, each self-testable.
- **One product question, not ten.** The genuine fork (scoring model + tab-vs-page) went to Will; everything else used sensible defaults and proceeded.
- **The reviewer's hard requirements raised the bar correctly.** "New scoring must be executable-verified, not preview-only" forced the `league-data.mjs` scoring core + self-test cases — which is what made G2 cheap and safe to build on.

## What was tricky (and how it was caught)

1. **The `appMatchKey` lockstep bug — caught by the functional test, not by reading or by the unit test.**
   The first email render test showed the Crystal Ball section **missing**. Root cause: matches carry a feed `num`, so the app stores group picks under `'k'+num` (via `matchKey`), not the `date|teams` key my mock assumed. The unit self-test had passed because *I* wrote its keys to match my (wrong) mental model. **Fix:** `crystalBallBoard` now derives the key via the **canonical `appMatchKey()`** (the same function the score writers use) — eliminating any drift between how the app stores a pick and how the email reads it. **Lesson:** test against realistic data shapes, and reuse the one canonical key/derivation function rather than hand-rolling a "should be equivalent" copy. Running the integration end-to-end found what a self-authored unit test structurally could not.

2. **CI silently doesn't run on a conflicted PR.** After both sessions appended to `REVIEW.md`, the builder PR went `CONFLICTING` — and GitHub stopped producing CI runs, because `pull_request` runs are built on a *merge commit* that can't exist while the branch won't merge. Symptom looked like "CI broke"; cause was "branch can't merge." **Lesson:** when CI mysteriously stops firing, check `mergeStateStatus` first. Resolving the conflict restored both merge-ability and CI.

3. **Append-only channel conflicts are frequent with two live sessions** (every `REVIEW.md` append from both sides collides). They're trivial to resolve (keep both, reviewer's entries then builder's), but expect one per integration. The append-only log is worth it for the audit trail.

4. **Mid-session merges require a rebase for a clean diff.** G1 merged to `main` while G2 was in flight on a branch stacked off G1. Rebasing G2 onto fresh `main` collapsed the diff to G2-only (3 files, +74/−1) — much easier to review than a cumulative stack.

---

## Metrics
- 2 feature PRs (1 merged, 1 in review) + 1 cutover-ack commit.
- `index.html`: +265 / −0. Scoring functions touched: **0**.
- Scoring self-test: 23 → **42** cases (Crystal Ball outcome, round-weighting, both key paths, board aggregation).
- CI gates on `main`: **5** (parse scripts, parse app, cloud-writer guardrail, scoring self-test #4, Civil-War self-test #5).
- Bugs that reached `main`: **0**. Bugs caught pre-merge by execution: **1** (the key-derivation mismatch).

## Process improvements to carry forward
- **Reuse canonical derivations** (`appMatchKey`, `matchKey`, `ROUND_MULT`) — never hand-roll a parallel "equivalent."
- **Add an integration/functional test for anything that crosses a boundary** (app ↔ cloud ↔ email), not just unit math. The 5-gate suite proves math; a mock end-to-end run proves wiring.
- **Watch `mergeStateStatus`** as a first-class signal, not just CI conclusions.
- **Keep the §5 three-site scoring duplication in mind** for any scoring change; new side-game logic should live once in `league-data.mjs` and be imported wherever it can (the app is the only forced duplicate).
