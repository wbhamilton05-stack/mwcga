# Session handoffs — drop box

Each Claude Code session that is about to be closed writes **its own file** here, then pushes.

**Filename:** `<UTC-timestamp>-<branch-slug>.md` — e.g. `20260816T1932Z-claude-api-error-tos-violation-nq5zhv.md`

**Why one file per session:** these sessions run in separate ephemeral containers and push
concurrently. Unique filenames mean a `git pull --rebase` never hits a content conflict, so
15 sessions can land their handoffs into the same branch without racing each other.

**Consolidation:** read every file in this directory, fold anything still outstanding into
`HANDOFF.md` §3 (next units) and §6 (operator tasks), then delete the consumed files in the
same commit that updates `HANDOFF.md`.

**This is a drop box, not the source of truth.** `HANDOFF.md` + `REVIEW.md` §R remain canonical.
Files here are transient — they exist only between "session closed" and "state reconsolidated."
