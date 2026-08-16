# Session handoff — `claude/api-error-tos-violation-nq5zhv`

- **Closed:** 2026-08-16
- **Repo / branch:** `wbhamilton05-stack/mwcga` @ `claude/api-error-tos-violation-nq5zhv`
- **Headline:** Diagnostic session only. No application code was touched.

## 1. What this session was asked to do
Explain an `API Error: ... appears to violate our Usage Policy` that a *different* session hit
while researching a local-Llama setup, and determine what terms had been violated.

## 2. What was actually done
Diagnosed from a screenshot of the error. Conclusion:

- The error came from Anthropic's **automated safety classifier**, which sits in front of the
  model — not from the model reasoning about the request and declining.
- It is **not** a rule against competitor/open-source models. Installing Ollama, llama.cpp, or
  Llama weights is fully allowed. Nothing in the AUP covers "don't use another vendor's model."
- Near-certain **false positive**, and specifically a *poisoned session*: an innocuous follow-up
  question ("what rule am I violating?") returned the identical error, which only happens when
  the accumulated conversation history is being re-flagged on every turn, not the new request.
- Likely trigger: a long deep-research transcript with scraped third-party content in context.

**Remedy given:** start a fresh session and re-ask the Llama task concretely; rephrase or switch
model if it recurs; optionally report the two Request IDs to Anthropic support as a false positive
(`req_011CcHKPTXRCKY9UpvwySZmY`, `req_011CcHL9vxtq2Md5J2mULTSu`).

## 3. Outstanding / carry forward
- ⬜ **The Llama setup work itself was never completed** — it stalled on the classifier error and
  was never redone in a clean session. This is the only real open item from this thread. It is
  unrelated to MWCGA and does not belong in `HANDOFF.md` §3; track it wherever the local-LLM
  research lives.
- ⬜ Optional: report the two Request IDs above as a false positive.

## 4. Repo state
No source files modified. The only additions are `handoffs/README.md` and this file.
`HANDOFF.md` §2/§3 are **unchanged and still accurate** as of the last commit on this branch —
in particular PR #5 (Task G2) was still shown as open/awaiting reviewer, which this session did
not verify and which the consolidating session should re-check against live GitHub.

## 5. Nothing is blocked on this session.

---

## Close-out block — 2026-08-16 — session `nq5zhv` (api-error-tos-violation)

```
════ SESSION HANDOFF ════
Project / repo / branch: MWCGA — wbhamilton05-stack/mwcga @ claude/api-error-tos-violation-nq5zhv
Purpose (1 line): Diagnose an "API Error ... violates our Usage Policy" that blocked a
  separate session's local-Llama setup work.
Status: DONE
Shipped this session:
  - Diagnosis: automated safety-classifier FALSE POSITIVE firing on accumulated
    session context — NOT a policy against competitor/open-source models, and no
    actual account violation. Evidence: an innocuous follow-up question returned the
    identical error, which only happens when conversation history is being re-flagged.
  - handoffs/ per-session drop box + README convention (unique filenames so ~15
    concurrent sessions can land close-outs without clobbering each other).
  - PR #32 (draft, CI green) — https://github.com/wbhamilton05-stack/mwcga/pull/32
Outstanding — next actions (priority order):
  1. Redo the local-Llama setup in a FRESH session (not the poisoned one). It stalled
     on the classifier error and was never completed. Non-MWCGA work — track elsewhere.
  2. Merge PR #32 once the other ~14 sessions have landed their handoff files.
  3. Optional: report false-positive Request IDs to Anthropic support —
     req_011CcHKPTXRCKY9UpvwySZmY, req_011CcHL9vxtq2Md5J2mULTSu
  4. STALE-DATA WARNING for the consolidator: HANDOFF.md §2 still lists PR #5
     (Task G2, Crystal Ball email leaderboard) as open/awaiting reviewer, dated
     2026-06-18 — ~2 months stale. NOT verified by this session. Re-check live.
Blockers / waiting-on: None.
Decisions needed from me (Will): Merge or close PR #32 as part of the sweep.
Git state: Committed & pushed. Branch claude/api-error-tos-violation-nq5zhv @ b7814ac.
  Working tree clean, 0 unpushed commits, 0 stashes, upstream tracking set.
  NOTE: `git push` has NO credentials in these remote containers
  ("could not read Username for 'https://github.com'"). Pushed via GitHub MCP
  (create_branch + push_files) instead, which creates a DIFFERENT commit SHA than the
  local commit — local git then reports the work as unpushed even though it isn't.
  Verified identical tree hash 0c01fb9d + empty diff before resetting local to remote.
  ⚠️ Other sessions reporting a successful `git push` should be treated with suspicion —
  confirm the branch actually exists on the remote.
Resume pointer (exact file:line / command to continue):
  Nothing to resume in this repo. No application code was touched.
  For the consolidation sweep: read handoffs/*.md, fold live items into
  HANDOFF.md §3 (next units) and §6 (operator tasks), then delete consumed files in
  the same commit. Convention documented at handoffs/README.md.
Safe to close now? YES — diagnosis delivered, no app code touched, tree clean,
  everything pushed, CI green, nothing blocked on this session.
════ END HANDOFF ════
```
