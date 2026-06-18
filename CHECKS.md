# CHECKS.md — Definition of Done (machine-checkable)

> Dual-Agent Git Build. "Done" = these pass in CI **and** the reviewer approves the PR —
> never an agent's self-assessment. Run the whole gate locally before opening a PR.

## Mandatory gates (CI red → merge blocked)
| Gate | What | Why |
|---|---|---|
| Parse — scripts | `node --check` every `scripts/*.mjs` | no syntax errors ship in the content/score pipeline |
| Parse — app | extract index.html's single inline `<script>` → `node --check` | the ~3,140-line app must parse before GitHub Pages serves it |
| Guardrail — cloud writers | only `fetch-scores.mjs` + `fetch-live-scores.mjs` may PUT the Firebase blob | a content script must never overwrite the family's game state |
| Scoring self-test | `node scripts/ci/selftest.mjs` — 23 locked spec cases (group GD ±3, KO multipliers, pens 6×) must score exactly | executable proof the engine is correct; *reading* missed the NFL 100%-NaN bug, *running* caught it |

## Run the whole gate locally before a PR
```sh
for f in scripts/*.mjs; do node --check "$f"; done \
 && awk '/<script>/{f=1;next} /<\/script>/{f=0} f' index.html > /tmp/app.js && node --check /tmp/app.js \
 && ( viol=0; for f in scripts/*.mjs; do case "$f" in scripts/fetch-scores.mjs|scripts/fetch-live-scores.mjs) ;; *) grep -qE "method:.{0,3}PUT" "$f" && { echo "GUARDRAIL VIOLATION: $f"; viol=1; };; esac; done; exit $viol ) \
 && node scripts/ci/selftest.mjs \
 && echo "ALL GATES GREEN"
```
> Guardrail runs in a `( … exit $viol )` subshell — `grep -l` exits 1 when it finds **nothing** (the clean case), so the old `bad=$(…) && [ -z "$bad" ]` form falsely failed the whole chain even when the tree was clean.

## Allowed cloud writers (excluded from the guardrail)
- `fetch-scores.mjs` — football-data.org official finals → Firebase `scoreOverrides` (authoritative; locks results).
- `fetch-live-scores.mjs` — ESPN near-live provisional scores (`live:true`); never overwrites an official locked final.

## Advisory (reviewer judgment — NOT auto-gating)
- Age-appropriate content (Warner is a minor) — carries over from MWCGA content rules.
- Fail-soft: content generators log + `exit 0` so one failure never blocks the rest of a run.
- Scoring house rules locked 2026-06-17 (see `CLAUDE_CODE_HANDOFF.md` §9 + memory `mwcga-scoring-rules`): group goal-diff ±3 bonus, penalty win = 6×, Civil War Bounty (replace + default-favorite).

## Tracked / deferred (not blocking now)
- **Scoring self-test — ✅ DONE 2026-06-18** (`scripts/ci/selftest.mjs`, now gate #4 above): 23/23 spec cases pass (group GD ±3, KO multipliers, pens 6×). Covers `matchPoints` (league-data). NOT yet covered: the app-side `scoreMatch` **Civil War Bounty** (it lives in the index.html inline script → needs an app-side test harness; reviewer-verified in preview for now).
- **`league-data.mjs` drift check** — a `--check` that fails if SCHEDULE/TEAMS in `league-data.mjs` diverge from `index.html` (the email/podcast scoring path must stay in lockstep with the app).
