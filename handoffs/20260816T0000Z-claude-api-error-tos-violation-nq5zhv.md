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
