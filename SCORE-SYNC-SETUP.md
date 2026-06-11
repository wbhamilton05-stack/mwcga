# MWCGA Score Sync — Setup

## What changed and why

**The problem:** the app pulled scores from `openfootball/worldcup.json` on GitHub.
That feed only carries the **schedule** — it publishes final scores days late, or
not at all. (Verified on opening day: Mexico vs South Africa had kicked off and
the feed still had no score on a single match.) No amount of re-syncing or
polling fixes a source that has no scores in it.

**The fix:** scores now come from **football-data.org**, a real results API. A
scheduled GitHub Action pulls finished matches a few times a day during the
match window and writes the finals into the game's cloud store, so they appear
on every family member's device automatically — exactly like someone typed the
score in.

Because the game only scores on the **result** (win / draw / loss, plus the
penalty winner in knockouts), we don't need live minute-by-minute data — just
the correct final, reliably, an hour or two after the whistle. That's what the
free tier gives us, with no paywall.

## What you need to do (one time, ~3 minutes)

### 1. Get a free football-data.org API key
1. Go to <https://www.football-data.org/client/register>
2. Register with your email (free tier, no card).
3. Copy the **API token** they email you (a long string of letters/numbers).

### 2. Add it to your GitHub repo as a secret
1. Open your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**.
3. Name: `FOOTBALL_DATA_TOKEN`
4. Value: paste the token from step 1.
5. Click **Add secret**.

### 3. Push the new files
Commit and push these (already created in `deploy/`):
- `scripts/fetch-scores.mjs` — the score fetcher
- `.github/workflows/fetch-scores.yml` — the scheduled job
- `index.html` — "Sync scores" buttons now pull the cloud first
- `SCORE-SYNC-SETUP.md` — this file

### 4. Test it
1. On GitHub → **Actions** tab → **MWCGA Score Sync** → **Run workflow**.
2. Set **dry_run** to `true` the first time — it fetches and prints what it
   *would* write without touching anything. Check the run log: it lists each
   finished match and the score it mapped.
3. If it looks right, run it again with **dry_run = false** to write for real.
   (After that, it runs itself on the schedule below.)

## How it runs on its own

The job wakes up roughly every 2 hours during the daily match window (and once
each morning as a safety net):

| UTC   | Central | Covers |
|-------|---------|--------|
| 20:00 | 15:00   | early afternoon finals |
| 22:00 | 17:00   | |
| 00:00 | 19:00   | evening block |
| 02:00 | 21:00   | |
| 04:00 | 23:00   | late finals |
| 06:00 | 01:00   | last West-coast finals |
| 13:00 | 08:00   | morning sweep / catch-up |

It's **idempotent** — a run with nothing new to report writes nothing and
changes nothing, so the extra passes are free. This matches your "check a couple
hours after each match" instinct without needing a separate cron per game.

## Notes & edge cases

- **Won't clobber the draft.** The script does a read-modify-write of the cloud
  blob and re-reads right before writing, so a score update can't overwrite a
  pick someone made on another device at the same moment.
- **Won't overwrite a manual score** unless football-data disagrees with it (in
  which case the official final wins, which is what you want).
- **Team-name spellings** are normalized to your app's names (Korea Republic →
  South Korea, Turkey → Türkiye, USA → United States, etc.). If a future
  finished match ever shows up as "could not be mapped" in the run log, it's a
  one-line add to `FD_NAME_FIXES` at the top of `scripts/fetch-scores.mjs`.
- **Knockout bracket slots** (e.g. "1A" → real team) still resolve from the
  openfootball feed via the app's existing sync — that part already worked.
- **Free-tier limit** is 10 calls/minute. This job makes 2 calls per run, ~7
  runs/day. Nowhere near the limit.

## Manual override is still there

Any family member can still type a score directly in the app — that path is
unchanged. The automation just means nobody *has* to.
