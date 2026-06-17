// ============================================================================
//  MWCGA  ·  fetch-live-scores.mjs
// ----------------------------------------------------------------------------
//  Near-live World Cup 2026 scores from ESPN's public scoreboard JSON, written
//  into the family game's Firebase store as PROVISIONAL scoreOverrides
//  (live:true, source:'espn' — NOT official). Built to run every ~1 minute while
//  matches are in progress; it writes ONLY when a score/state actually changes,
//  so a quiet minute is a no-op (no needless cloud writes or device re-syncs).
//
//  DUAL-SOURCE DESIGN: football-data.org (fetch-scores.mjs) stays the
//  AUTHORITATIVE source — it writes official:true finals that LOCK the result.
//  This live poller NEVER overwrites an official entry, and football-data's
//  official write later upgrades + locks whatever live value is sitting there.
//  So ESPN supplies the minute-to-minute number; football-data supplies the
//  locked final. A transient ESPN glitch can therefore never corrupt a result.
//
//  ESPN endpoint (no key, no quota, UNDOCUMENTED — so we code defensively: any
//  non-2xx or unexpected shape is treated as "no update", never an overwrite):
//    https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
//  Per event: status.type.state ('pre'|'in'|'post'), status.displayClock, and
//  competitions[0].competitors[] { team.displayName, homeAway, score, shootoutScore? }.
//
//  Env:  MWCGA_DRY_RUN=true → print, write nothing.   MWCGA_FAKE_TODAY=YYYY-MM-DD
// ============================================================================

import { mapName, appMatchKey, FEED_URL, GAME_URL, centralDate } from './league-data.mjs';

const DRY_RUN = process.env.MWCGA_DRY_RUN === 'true';
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// ESPN spelling -> app canonical name. mapName/PLAYOFF_MAP already folds
// USA/Turkey/Czech Republic/DR Congo; this covers ESPN's remaining variants.
// Anything not resolvable just won't match a fixture and is skipped (logged).
const ESPN_NAME_FIXES = {
  'Korea Republic': 'South Korea', 'South Korea': 'South Korea',
  'IR Iran': 'Iran', 'Iran': 'Iran',
  'Türkiye': 'Türkiye', 'Turkey': 'Türkiye',
  'Czechia': 'Czechia', 'Czech Republic': 'Czechia',
  "Côte d'Ivoire": 'Ivory Coast', 'Cote d’Ivoire': 'Ivory Coast', 'Ivory Coast': 'Ivory Coast',
  'Cabo Verde': 'Cape Verde', 'Cape Verde': 'Cape Verde',
  'DR Congo': 'Congo DR', 'Congo DR': 'Congo DR',
  'Curaçao': 'Curaçao', 'Curacao': 'Curaçao',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina', 'Bosnia & Herzegovina': 'Bosnia-Herzegovina',
  'USA': 'United States', 'United States': 'United States',
};
function canon(name) {
  if (!name) return name;
  const t = String(name).trim();
  return mapName(ESPN_NAME_FIXES[t] || t);
}

async function getJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url.split('?')[0]} HTTP ${res.status}`);
  return res.json();
}

// Resolve an ESPN event to the app's scheduled match via the openfootball feed
// (date + unordered team pair), exactly like fetch-scores.mjs, so we produce the
// SAME match key the app uses ('k'+num for KO, date|team1|team2 for group).
function buildScheduleIndex(feedMatches) {
  const byPair = new Map();
  for (const m of feedMatches || []) {
    if (!m.date || !m.team1 || !m.team2) continue;
    const t1 = mapName(m.team1), t2 = mapName(m.team2);
    byPair.set(`${m.date}|${[t1, t2].sort().join('|')}`, { ...m, team1: t1, team2: t2 });
  }
  return byPair;
}

async function main() {
  // A match's ESPN calendar day can differ from its openfootball date by a day
  // (time zones), so poll yesterday..tomorrow (CT) and dedupe by event id.
  const dateKeys = [...new Set([centralDate(-1), centralDate(0), centralDate(1)])].map(d => d.replace(/-/g, ''));
  const [feed, ...boards] = await Promise.all([
    getJSON(FEED_URL, { cache: 'no-store' }),
    ...dateKeys.map(d => getJSON(`${ESPN_URL}?dates=${d}`, { cache: 'no-store' })
      .catch(e => { console.log(`ESPN ${d} fetch failed (ignored): ${e.message}`); return { events: [] }; })),
  ]);
  const idx = buildScheduleIndex(feed.matches || []);

  // Gather ESPN events that carry a meaningful score (in progress or finished).
  const seen = new Set();
  const live = [];
  for (const b of boards) {
    for (const ev of (b.events || [])) {
      if (!ev || seen.has(ev.id)) continue;
      seen.add(ev.id);
      const state = ev.status?.type?.state;
      if (state !== 'in' && state !== 'post') continue; // 'pre' = not started, no score
      const comp = ev.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === 'home');
      const away = comp?.competitors?.find(c => c.homeAway === 'away');
      if (!home || !away) continue;
      live.push({
        state, utc: ev.date, clock: ev.status?.displayClock || '',
        home: canon(home.team?.displayName), away: canon(away.team?.displayName),
        hs: Number(home.score), as: Number(away.score),
        hShoot: home.shootoutScore != null ? Number(home.shootoutScore) : null,
        aShoot: away.shootoutScore != null ? Number(away.shootoutScore) : null,
      });
    }
  }
  console.log(`ESPN: ${live.length} in-progress/finished match(es) across ${dateKeys.join(', ')}.`);

  // Current cloud overrides — so we only write real changes and respect locks.
  const blob = await getJSON(GAME_URL, { cache: 'no-store' }) || {};
  const existing = (blob.state && blob.state.scoreOverrides) || {};

  const updates = {};
  const unmatched = [];
  for (const e of live) {
    if (Number.isNaN(e.hs) || Number.isNaN(e.as)) continue;
    const day = (e.utc || '').slice(0, 10);
    const cand = [day,
      new Date(Date.parse(day) - 864e5).toISOString().slice(0, 10),
      new Date(Date.parse(day) + 864e5).toISOString().slice(0, 10)];
    const pair = [e.home, e.away].sort().join('|');
    let appMatch = null;
    for (const d of cand) { const hit = idx.get(`${d}|${pair}`); if (hit) { appMatch = hit; break; } }
    if (!appMatch) { unmatched.push(`${e.home} ${e.hs}-${e.as} ${e.away}`); continue; }

    const key = appMatchKey({ num: appMatch.num, date: appMatch.date, team1: appMatch.team1, team2: appMatch.team2 });
    const prev = existing[key];
    if (prev && prev.official === true) continue; // locked final — never touch

    // Orient ESPN home/away to the app's stored team1/team2 ordering.
    const flip = appMatch.team1 === e.away && appMatch.team2 === e.home;
    const score1 = flip ? e.as : e.hs;
    const score2 = flip ? e.hs : e.as;
    const pens1 = flip ? e.aShoot : e.hShoot;
    const pens2 = flip ? e.hShoot : e.aShoot;

    const next = { score1, score2, live: true, source: 'espn', state: e.state, clock: e.clock, updatedAt: new Date().toISOString() };
    if (pens1 != null && pens2 != null) { next.pens1 = pens1; next.pens2 = pens2; }

    // Write only when the MEANINGFUL values change (ignore clock/updatedAt churn),
    // so the live clock ticking doesn't spam a cloud write every single minute.
    const changed = !prev || prev.score1 !== score1 || prev.score2 !== score2 || prev.state !== e.state ||
      (prev.pens1 ?? null) !== (next.pens1 ?? null) || (prev.pens2 ?? null) !== (next.pens2 ?? null);
    if (changed) {
      updates[key] = next;
      console.log(`  ↳ ${appMatch.team1} ${score1}-${score2} ${appMatch.team2}  [${key}] ${e.state} ${e.clock}` +
        (next.pens1 != null ? ` (pens ${next.pens1}-${next.pens2})` : ''));
    }
  }
  if (unmatched.length) console.log(`  (${unmatched.length} unmatched — name fix or unresolved KO slot: ${unmatched.join('; ')})`);

  const n = Object.keys(updates).length;
  if (!n) { console.log('No score changes. Nothing to write.'); console.log('changed=0'); return; }
  if (DRY_RUN) { console.log(`DRY_RUN — would write ${n} live update(s).`); console.log('changed=0'); return; }

  // Read-modify-write so we never clobber a concurrent draft pick or an official
  // score (re-check the lock on the freshest read before merging each key).
  for (let attempt = 1; attempt <= 4; attempt++) {
    const fresh = await getJSON(GAME_URL, { cache: 'no-store' }) || {};
    const freshState = fresh.state || {};
    const freshOv = freshState.scoreOverrides || {};
    const merged = { ...freshOv };
    for (const [k, v] of Object.entries(updates)) {
      if (freshOv[k] && freshOv[k].official === true) continue;
      merged[k] = v;
    }
    const payload = { v: fresh.v || 1, savedAt: new Date().toISOString(), state: { ...freshState, scoreOverrides: merged } };
    const res = await fetch(GAME_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { console.log(`✓ Wrote ${n} live update(s) (savedAt ${payload.savedAt}).`); console.log(`changed=${n}`); return; }
    console.log(`  PUT attempt ${attempt} HTTP ${res.status}; retrying...`);
    await new Promise(r => setTimeout(r, 1200 * attempt));
  }
  throw new Error('All PUT attempts failed.');
}

main().catch(err => { console.error('fetch-live-scores failed:', err.message); process.exit(1); });
