// ============================================================================
//  MWCGA  ·  fetch-scores.mjs
// ----------------------------------------------------------------------------
//  Pulls FINISHED World Cup 2026 matches from football-data.org and writes the
//  final scores into the family game's cloud store (Firebase RTDB) as
//  scoreOverrides — the same shape a family member produces when they type a
//  score into the app. The app already reads + applies scoreOverrides, so once
//  a score lands here it shows up on every device on the next sync.
//
//  WHY this exists: the old source (openfootball/worldcup.json) only carries
//  the *schedule* — it ships scores days late or not at all. football-data.org
//  publishes final scores reliably within an hour or two of the final whistle.
//  The game scores on the W/D/L result (+ penalty winner in knockouts), not on
//  goal totals — so "delayed-but-correct finals" is exactly what we need, and
//  no live/minute-by-minute polling is required.
//
//  CLOUD SHAPE (important): the blob is wrapped —
//      { v: 1, savedAt: <ISO>, state: { players, rosters, scoreOverrides, ... } }
//  The app adopts a remote change only when `savedAt` is newer than what the
//  device last saw, so after merging scores we BUMP savedAt. To avoid clobbering
//  an in-progress draft pick from another device, we do a read-modify-write of
//  the whole blob (GET → merge → PUT) and abort the PUT if the blob changed
//  underneath us between read and write.
//
//  SCHEDULE: the cloud blob does NOT carry the match schedule (the app embeds it
//  client-side and strips it before pushing). So we build the match index from
//  the openfootball feed — same fixtures/knockout numbers the app uses — purely
//  to translate a finished match into the app's exact match key.
//
//  Env:
//   FOOTBALL_DATA_TOKEN   (required)  free key from football-data.org
//   MWCGA_DRY_RUN=true    (optional)  print diffs, write nothing
// ============================================================================

import { mapName, appMatchKey, FEED_URL } from './league-data.mjs';

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const DRY_RUN = process.env.MWCGA_DRY_RUN === 'true';

const FD_URL = 'https://api.football-data.org/v4/competitions/WC/matches';
const GAME_URL = 'https://mwcga-c2e5e-default-rtdb.firebaseio.com/games/wcuaw50n22xo.json';

// ----------------------------------------------------------------------------
//  Team-name normalization: football-data.org spelling  ->  app canonical name.
//  The app's PLAYOFF_MAP (applied by mapName) already folds "USA", "Turkey" etc.
//  This table covers the remaining football-data.org English-spelling variants.
//  Anything not listed passes through mapName unchanged.
// ----------------------------------------------------------------------------
const FD_NAME_FIXES = {
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'Korea, Republic of': 'South Korea',
  'USA': 'United States',
  'United States of America': 'United States',
  'Turkey': 'Türkiye',
  'Czech Republic': 'Czechia',
  'DR Congo': 'Congo DR',
  'Democratic Republic of the Congo': 'Congo DR',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia-Herzegovina',
  'Côte d’Ivoire': 'Ivory Coast',
  "Côte d'Ivoire": 'Ivory Coast',
  "Cote d'Ivoire": 'Ivory Coast',
  'Curacao': 'Curaçao',
  'Cabo Verde': 'Cape Verde',
  'IR Iran': 'Iran',
};

function canon(name) {
  if (!name) return name;
  const fixed = FD_NAME_FIXES[name.trim()] || name.trim();
  return mapName(fixed);
}

async function getJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url.split('?')[0]} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function fetchFootballData() {
  if (!TOKEN) throw new Error('FOOTBALL_DATA_TOKEN is not set');
  const data = await getJSON(FD_URL, { headers: { 'X-Auth-Token': TOKEN } });
  return Array.isArray(data.matches) ? data.matches : [];
}

// Build a lookup from the openfootball schedule so we resolve to the SAME key
// the app uses — including knockout 'k'+num keys. Indexed by date + unordered
// team pair so a football-data result finds its home regardless of ordering.
function buildScheduleIndex(feedMatches) {
  const byPair = new Map();
  for (const m of feedMatches || []) {
    if (!m.date || !m.team1 || !m.team2) continue;
    const t1 = mapName(m.team1), t2 = mapName(m.team2);
    const pair = [t1, t2].sort().join('|');
    byPair.set(`${m.date}|${pair}`, { ...m, team1: t1, team2: t2 });
  }
  return byPair;
}

function score90(fd) {
  const ft = fd.score?.fullTime || {};
  const pens = fd.score?.penalties || {};
  return { home: ft.home, away: ft.away, pHome: pens.home ?? null, pAway: pens.away ?? null };
}

function isoDate(utc) { return (utc || '').slice(0, 10); }

async function main() {
  const [fdMatches, feed] = await Promise.all([
    fetchFootballData(),
    getJSON(FEED_URL, { cache: 'no-store' }),
  ]);
  const idx = buildScheduleIndex(feed.matches || []);

  // Read the current cloud blob (we'll merge into state.scoreOverrides).
  const blob = await getJSON(GAME_URL, { cache: 'no-store' }) || {};
  const beforeSavedAt = blob.savedAt || null;
  const state = blob.state || {};
  const existing = state.scoreOverrides || {};

  const finished = fdMatches.filter(m => m.status === 'FINISHED');
  console.log(`football-data.org: ${fdMatches.length} matches, ${finished.length} finished.`);

  const merged = { ...existing };
  let changed = 0;
  const unmatched = [];

  for (const fd of finished) {
    const home = canon(fd.homeTeam?.name);
    const away = canon(fd.awayTeam?.name);
    const s = score90(fd);
    if (s.home == null || s.away == null) {
      console.log(`  · skipped (no fullTime score yet): ${fd.homeTeam?.name} vs ${fd.awayTeam?.name}` +
        ` — status=${fd.status}, score.fullTime=${JSON.stringify(fd.score?.fullTime)}, winner=${fd.score?.winner}`);
      continue;
    }

    // Resolve to the app's scheduled match (covers UTC-vs-local date drift).
    let appMatch = null;
    const d = new Date(fd.utcDate);
    const dates = [isoDate(fd.utcDate)];
    if (!isNaN(d)) {
      dates.push(new Date(d.getTime() - 864e5).toISOString().slice(0, 10));
      dates.push(new Date(d.getTime() + 864e5).toISOString().slice(0, 10));
    }
    const pair = [home, away].sort().join('|');
    for (const date of dates) {
      const hit = idx.get(`${date}|${pair}`);
      if (hit) { appMatch = hit; break; }
    }
    if (!appMatch) {
      unmatched.push(`${home} ${s.home}-${s.away} ${away} (${isoDate(fd.utcDate)})`);
      continue;
    }

    // Orient score to the app's team1/team2 ordering.
    const flip = appMatch.team1 === away && appMatch.team2 === home;
    const score1 = flip ? s.away : s.home;
    const score2 = flip ? s.home : s.away;
    const pens1 = flip ? s.pAway : s.pHome;
    const pens2 = flip ? s.pHome : s.pAway;

    const key = appMatchKey({ num: appMatch.num, date: appMatch.date, team1: appMatch.team1, team2: appMatch.team2 });

    // official:true marks this as the API's authoritative final. The app locks
    // any official score so it can no longer be hand-edited or cleared.
    const override = { score1, score2, official: true, source: 'football-data.org', lockedAt: new Date().toISOString() };
    if (pens1 != null && pens2 != null) { override.pens1 = pens1; override.pens2 = pens2; }

    const prev = merged[key];
    // "Already current" only if the existing entry has the SAME score AND is
    // already official — otherwise we (re)write to upgrade a manual entry to an
    // official, locked one (the official result always wins).
    const same = prev && prev.official === true &&
      prev.score1 === override.score1 && prev.score2 === override.score2 &&
      (prev.pens1 ?? null) === (override.pens1 ?? null) && (prev.pens2 ?? null) === (override.pens2 ?? null);
    if (same) {
      console.log(`  = already official: ${appMatch.team1} ${score1}-${score2} ${appMatch.team2}  [${key}]`);
      continue;
    }

    merged[key] = override;
    changed++;
    console.log(`  ↳ ${appMatch.team1} ${score1}-${score2} ${appMatch.team2}` +
      (override.pens1 != null ? ` (pens ${override.pens1}-${override.pens2})` : '') +
      `  [${key}]${prev ? ' (updated)' : ''}`);
  }

  if (unmatched.length) {
    console.log(`\n⚠ ${unmatched.length} finished match(es) could not be mapped:`);
    unmatched.forEach(u => console.log('   · ' + u));
    console.log('   (Add the team spelling to FD_NAME_FIXES, or the knockout slot is not resolved yet.)');
  }

  if (!changed) {
    console.log('\nNo new or changed finals. Nothing to write.');
    console.log('changed=0');
    return;
  }

  console.log(`\n${changed} score(s) to write.`);
  if (DRY_RUN) {
    console.log('DRY_RUN=true — not writing to the cloud.');
    console.log('changed=0');
    return;
  }

  // Read-modify-write guard: re-read and abort if another device wrote between
  // our read and now, so we never clobber a fresh draft pick. Retry a few times.
  for (let attempt = 1; attempt <= 4; attempt++) {
    const fresh = await getJSON(GAME_URL, { cache: 'no-store' }) || {};
    if ((fresh.savedAt || null) !== beforeSavedAt && attempt === 1) {
      // Someone wrote since our first read — re-merge onto the freshest state.
      console.log('Cloud changed since read; re-merging onto latest before write.');
    }
    const freshState = fresh.state || {};
    const freshOverrides = freshState.scoreOverrides || {};
    const finalOverrides = { ...freshOverrides, ...merged }; // our finals win on conflict
    const payload = {
      v: fresh.v || 1,
      savedAt: new Date().toISOString(), // bump so devices adopt the change
      state: { ...freshState, scoreOverrides: finalOverrides },
    };
    const res = await fetch(GAME_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      console.log(`✓ Wrote ${changed} score(s) to the cloud store (savedAt ${payload.savedAt}).`);
      console.log(`changed=${changed}`);
      return;
    }
    console.log(`  PUT attempt ${attempt} HTTP ${res.status}; retrying...`);
    await new Promise(r => setTimeout(r, 1500 * attempt));
  }
  throw new Error('All PUT attempts failed.');
}

main().catch(err => { console.error('fetch-scores failed:', err.message); process.exit(1); });
