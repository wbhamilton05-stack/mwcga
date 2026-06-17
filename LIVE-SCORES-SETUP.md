# MWCGA — Live Scores + Firebase Rules Setup

Two operator tasks for Will. Both are optional/at-your-pace; the game works without them.

---

## 1. Live scores — 1-minute ESPN poller (run on the always-on MacBook Pro)

`scripts/fetch-live-scores.mjs` pulls near-live World Cup scores from ESPN's free JSON feed and writes them to Firebase as **provisional** scores (`live:true`). football-data.org stays the authoritative source — the poller **never overwrites an official locked final**, and the official write later upgrades + locks whatever live value is sitting there. So you get minute-to-minute numbers without risking a corrupted final.

GitHub Actions can't run every minute, so true 1-min polling runs as a **launchd job on the always-on MBP** (`com.mwcga.livescores.plist`, every 60s — a fast no-op when nothing is live).

**Prerequisite:** Node must be installed and resolvable from a *login* shell (`zsh -lc 'node -v'`). The plist prepends `~/.local/bin`, `/opt/homebrew/bin`, and `/usr/local/bin` to PATH, so a userland Node (e.g. `~/.local/opt/node`) or a Homebrew Node both work — no profile edits needed.

**Install (run on the always-on MacBook Pro):** — the plist now uses `$HOME`, so it's machine-independent.
```bash
cp "$HOME/Documents/Claude/Projects/World Cup Family Game/deploy/scripts/com.mwcga.livescores.plist" ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.mwcga.livescores.plist
launchctl list | grep mwcga      # col 2 == 0 means the last run exited cleanly
```

> ✅ **Installed & live on the `hamiltonfamily` MacBook Pro (2026-06-17).** Node v24.16.0 LTS installed userland at `~/.local/opt/node`. First run wrote 3 live updates; polling every 60s.

**Verify it's polling (during or near a match):**
```bash
tail -f /tmp/mwcga-livescores.log     # should print "ESPN: N in-progress/finished match(es)" each minute
```

**Pause / uninstall (e.g. after the tournament):**
```bash
launchctl unload ~/Library/LaunchAgents/com.mwcga.livescores.plist
rm ~/Library/LaunchAgents/com.mwcga.livescores.plist
```

**Dry-run test anytime (no writes):**
```bash
cd "$HOME/Documents/Claude/Projects/World Cup Family Game/deploy/scripts"
MWCGA_DRY_RUN=true node fetch-live-scores.mjs
```

> Note: live scores write into `scoreOverrides`, so the app scores them live — standings update in real time during a match and settle at the final whistle. That's intended ("live standings"). If you'd rather points only move on finished matches, say so and I'll split live scores into a display-only field.

---

## 2. Firebase RTDB lockdown rules (apply in the Firebase console)

`database.rules.json` tightens the wide-open database so the game node isn't world-enumerable or wipeable, while keeping the no-auth client and the score-sync Action working.

**What the rules do:**
- Block enumeration — `/games.json?shallow=true` no longer lists every game (only a direct `/games/<id>` read works).
- Block a blank-wipe — a write must contain a non-empty `state.players`, so a garbage/empty PUT is rejected.
- Cap player-name length at 64 chars.
- Score overrides must be numbers.
- Reads/writes to a known game id stay open (the client and the score Actions need no-auth REST).

**⚠️ TEST BEFORE PUBLISHING.** Bad rules can lock the whole family out of the live game. In the Firebase console → Realtime Database → **Rules**, paste `database.rules.json`, then use the **Rules Playground** to confirm:
1. A read of `/games/wcuaw50n22xo` is **allowed** (unauthenticated).
2. A read of `/games` (enumeration) is **denied**.
3. A write of the full game blob (with `state.players`) is **allowed**.
4. A write of `{}` or empty players is **denied**.

Only click **Publish** once those four check out. If anything legitimate is denied, revert (the console keeps history) and tell me which check failed.

---

### 🟢 Dead-simple walkthrough (no jargon — ~5 min, do it whenever)

> This is optional hardening. The game works perfectly without it. Low risk for a private family game, but nice to lock down. If anything looks different from these steps, stop and tell me — don't guess.

**1. Open the rules editor**
- Go to **https://console.firebase.google.com/** and sign in with the Google account that owns the project (`mwcga-c2e5e`).
- Click the project tile **mwcga-c2e5e**.
- In the left sidebar: **Build → Realtime Database**.
- Click the **Rules** tab (top of that page).

**2. Paste the new rules**
- You'll see a box of text (the current rules). Select all of it and delete it.
- Open `deploy/database.rules.json` (in this folder), copy ALL of it, and paste it into that box.

**3. Test it FIRST (this is the safety net)**
- Look for a small flask/beaker icon or a **"Rules Playground"** link (usually just above the rules box). Click it.
- Run these 4 quick checks. For each: set the **Location** and **Operation**, leave "Authenticated" OFF, and click **Run**:
  | # | Location | Operation | Should say |
  |---|----------|-----------|-----------|
  | 1 | `/games/wcuaw50n22xo` | get (read) | ✅ Allowed |
  | 2 | `/games` | get (read) | ❌ Denied |
  | 3 | `/games/wcuaw50n22xo` | set (write) — paste a blob with `state.players` filled in | ✅ Allowed |
  | 4 | `/games/wcuaw50n22xo` | set (write) — use `{}` | ❌ Denied |
- (For check 3, the simplest valid blob to paste in the "Data" field is: `{"state":{"players":[{"name":"Will"}],"draftPickIdx":48,"draftComplete":true}}`.)

**4. Publish (only if all 4 passed)**
- Click the blue **Publish** button above the rules box.
- That's it. If any check showed the wrong result, **don't Publish** — click away/undo and tell me which number failed; I'll fix the rules file.

**To undo later:** the Rules tab keeps a history — you can always roll back to the previous version.
