# CHECKS.md — Definition of Done (machine-checkable)

> Dual-Agent Git Build. "Done" = these pass in CI **and** the reviewer approves the PR —
> never an agent's self-assessment. Run the whole gate locally before opening a PR.

## Mandatory gates (CI red → merge blocked)
| Gate | What | Why |
|---|---|---|
| Parse — scripts | `node --check` every `scripts/*.mjs` | no syntax errors ship in the content/score pipeline |
| Parse — app | extract index.html's single inline `<script>` → `node --check` | the ~3,140-line app must parse before GitHub Pages serves it |
| Guardrail — cloud writers | only `fetch-scores.mjs` + `fetch-live-scores.mjs` may PUT the Firebase blob | a content script must never overwrite the family's game state |

## Run the whole gate locally before a PR
```sh
for f in scripts/*.mjs; do node --check "$f"; done \
 && awk '/<script>/{f=1;next} /<\/script>/{f=0} f' index.html > /tmp/app.js && node --check /tmp/app.js \
 && bad=$(for f in scripts/*.mjs; do case "$f" in scripts/fetch-scores.mjs|scripts/fetch-live-scores.mjs) ;; *) grep -lE "method:.{0,3}PUT" "$f";; esac; done) \
 && [ -z "$bad" ] && echo "ALL GATES GREEN"
```

## Allowed cloud writers (excluded from the guardrail)
- `fetch-scores.mjs` — football-data.org official finals → Firebase `scoreOverrides` (authoritative; locks results).
- `fetch-live-scores.mjs` — ESPN near-live provisional scores (`live:true`); never overwrites an official locked final.

## Advisory (reviewer judgment — NOT auto-gating)
- Age-appropriate content (Warner is a minor) — carries over from MWCGA content rules.
- Fail-soft: content generators log + `exit 0` so one failure never blocks the rest of a run.
- Scoring house rules locked 2026-06-17 (see `CLAUDE_CODE_HANDOFF.md` §9 + memory `mwcga-scoring-rules`): group goal-diff ±3 bonus, penalty win = 6×, Civil War Bounty (replace + default-favorite).

## Tracked / deferred (not blocking now)
- **Scoring self-test** — author `scripts/ci/selftest.mjs` (spec cases for group GD, KO multipliers, pens 6×, Civil War Bounty) and wire it as a 4th gate. The NFL build's 100%-NaN bug (caught only by *executing* the engine) is why scoring needs an executable gate, not just review. Until then, scoring correctness is reviewer-verified, not CI-gated.
- **`league-data.mjs` drift check** — a `--check` that fails if SCHEDULE/TEAMS in `league-data.mjs` diverge from `index.html` (the email/podcast scoring path must stay in lockstep with the app).
