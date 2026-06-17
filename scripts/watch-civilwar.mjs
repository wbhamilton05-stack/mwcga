#!/usr/bin/env node
// ============================================================================
//  MWCGA · watch-civilwar.mjs  — CIVIL WAR BOUNTY ANNOUNCER
// ----------------------------------------------------------------------------
//  When the knockout bracket resolves a match between TWO teams owned by the
//  SAME player (a "Civil War"), email the family telling that owner to make
//  their Bounty pick in the app. Fires ONCE per matchup — the announced match
//  keys are committed to .mwcga-civilwar.json so a matchup is never re-emailed,
//  exactly like the draft tripwire's high-water mark.
//
//  Only UPCOMING (unplayed) matchups are announced — there's no point nagging a
//  pick for a game already decided (the app auto-defaults to the favorite then).
//
//  Mirrors the app's isCivilWar()/bountyPick() (index.html) so the "defaulting
//  to favorite" line in the email matches exactly what the app shows. Reuses the
//  existing briefing mail secrets — nothing new to configure.
//  Env: MAIL_USERNAME, MAIL_PASSWORD (Gmail app password), MWCGA_RECIPIENTS.
//       MWCGA_DRY_RUN=true → print the email, send nothing, record nothing.
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { TEAMS, ODDS, OWNER_META, mapName, roundOf, appMatchKey,
         ROUND_NAME, ROUND_MULT, flag, GAME_URL, FEED_URL, SITE } from './league-data.mjs';

const STATE_FILE = '.mwcga-civilwar.json';
const GAME_LINK = `${SITE}/?game=wcuaw50n22xo`;
const DRY_RUN = process.env.MWCGA_DRY_RUN === 'true';

// Implied title chance from fractional odds ("9/2" → 18.18). Higher = favorite.
// Mirrors impliedTitlePct() in the app; missing odds → -1 (never the favorite).
function impliedPct(team) {
  const f = ODDS[team];
  if (!f) return -1;
  const [a, b] = String(f).split('/').map(Number);
  return a && b ? (100 * b) / (a + b) : -1;
}
// Default-to-favorite, exactly like the app's bountyPick fallback (tie → t1).
function favorite(t1, t2) { return impliedPct(t2) > impliedPct(t1) ? t2 : t1; }

// Detect every resolved, still-upcoming civil-war matchup in the feed.
export function findCivilWars({ feed, ownerOf, players, bounties, overrides }) {
  const out = [];
  for (const m of (feed.matches || [])) {
    const r = roundOf(m);
    if (r === 'group') continue;                       // group can't be same-owner
    const t1 = mapName(m.team1), t2 = mapName(m.team2);
    if (!TEAMS[t1] || !TEAMS[t2]) continue;            // KO slot still a placeholder
    const o1 = ownerOf[t1], o2 = ownerOf[t2];
    if (o1 == null || o1 !== o2) continue;             // not a civil war
    const key = appMatchKey({ num: m.num, date: m.date, team1: m.team1, team2: m.team2 });
    const ov = overrides[key];
    const feedScored = !!(m.score && Array.isArray(m.score.ft));
    const ovScored = !!(ov && ov.score1 != null && ov.score2 != null);
    if (feedScored || ovScored) continue;              // already played — no nag
    const saved = (bounties[key] === t1 || bounties[key] === t2) ? bounties[key] : null;
    out.push({ key, num: m.num, date: m.date, round: r, t1, t2,
      owner: o1, ownerName: players[o1] || 'You', saved, fav: favorite(t1, t2) });
  }
  return out;
}

// Build the announcement email (subject + plain-text body) for N fresh matchups.
export function buildEmail(fresh) {
  const many = fresh.length > 1;
  const subject = many
    ? `⚔️ CIVIL WAR BOUNTIES — ${fresh.length} picks to make`
    : `⚔️ CIVIL WAR! ${fresh[0].ownerName}: ${fresh[0].t1} vs ${fresh[0].t2} — make your pick`;

  const blocks = fresh.map(c => {
    const meta = OWNER_META[c.ownerName] || {};
    const mult = ROUND_MULT[c.round] || 1;
    const pickLine = c.saved
      ? `Your pick is locked: ${c.saved}.`
      : `No pick yet — it'll DEFAULT to the favorite, ${flag(c.fav)} ${c.fav}. Change it if you disagree.`;
    return [
      `⚔️  ${meta.emoji || ''} ${c.ownerName.toUpperCase()}'S CIVIL WAR — ${ROUND_NAME[c.round]} (×${mult})`,
      `    ${flag(c.t1)} ${c.t1}   vs   ${flag(c.t2)} ${c.t2}   ·   ${c.date}`,
      ``,
      `    ${c.ownerName}, you own BOTH — you're advancing one no matter what.`,
      `    So normal scoring is off; it's a side-bet: predict which of your two wins.`,
      `      • Right → 3× = ${3 * mult} pts.    • Wrong → 1× = ${mult} pts.`,
      `    ${pickLine}`,
    ].join('\n');
  }).join('\n\n────────────────────────────\n\n');

  const text =
`A Civil War has broken out in the bracket. 🇺🇸

${blocks}

👉  HOW TO PICK: open the app → Today tab → find the ⚔️ CIVIL WAR BOUNTY card
    on the matchup → tap your predicted winner. It locks in and syncs to the
    whole family. Do it any time BEFORE kickoff. If you forget, the favorite
    above is used automatically — so you're never left with nothing.

Make your pick: ${GAME_LINK}

— The MWCGA War Desk`;

  return { subject, text };
}

async function main() {
  const [gameRes, feedRes] = await Promise.all([
    fetch(GAME_URL, { cache: 'no-store' }),
    fetch(FEED_URL, { cache: 'no-store' }),
  ]);
  if (!gameRes.ok || !feedRes.ok) throw new Error(`fetch failed: game ${gameRes.status}, feed ${feedRes.status}`);
  const game = (await gameRes.json()) || {};
  const feed = (await feedRes.json()) || {};
  const st = game.state || {};
  const players = (st.players || []).map(p => p.name);
  const rosters = st.rosters || {};
  const bounties = st.bounties || {};
  const overrides = st.scoreOverrides || {};

  // team name -> owner index (handles array or object rosters, like the app)
  const ownerOf = {};
  players.forEach((_, i) => {
    const teams = Array.isArray(rosters) ? (rosters[i] || []) : (rosters[String(i)] || []);
    (teams || []).forEach(t => { if (t) ownerOf[t] = i; });
  });

  const civil = findCivilWars({ feed, ownerOf, players, bounties, overrides });

  let state = { announced: [] };
  if (existsSync(STATE_FILE)) {
    try { state = { announced: [], ...JSON.parse(readFileSync(STATE_FILE, 'utf8')) }; } catch (e) {}
  }
  const seen = new Set(state.announced);
  const fresh = civil.filter(c => !seen.has(c.key));

  console.log(`${civil.length} active civil-war matchup(s); ${fresh.length} new to announce.`);
  fresh.forEach(c => console.log(`  ⚔️ ${c.ownerName}: ${c.t1} vs ${c.t2} [${c.key}] ${ROUND_NAME[c.round]} ${c.date}`));
  if (!fresh.length) { console.log('announced=0'); return; }

  const { subject, text } = buildEmail(fresh);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: email NOT sent, state NOT recorded ---');
    console.log('Subject:', subject);
    console.log(text);
    console.log('announced=0');
    return;
  }

  const sent = await sendMail(subject, text);
  if (!sent) { console.log('Mail not configured — nothing recorded (will retry next run).'); console.log('announced=0'); return; }

  // Record ONLY after a successful send, so a mail failure retries next run
  // instead of silently swallowing a matchup.
  const next = { announced: [...new Set([...state.announced, ...fresh.map(c => c.key)])] };
  writeFileSync(STATE_FILE, JSON.stringify(next, null, 2) + '\n');
  console.log(`announced=${fresh.length}`);
}

async function sendMail(subject, text) {
  const user = process.env.MAIL_USERNAME;
  const pass = (process.env.MAIL_PASSWORD || '').replace(/\s+/g, '');
  const to = process.env.MWCGA_RECIPIENTS;
  if (!user || !pass || !to) {
    console.log('Mail secrets not configured — announcement is in the run log only.');
    return false;
  }
  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass },
  });
  await transporter.sendMail({ from: `MWCGA War Desk <${user}>`, to, subject, text });
  console.log(`Announcement emailed to ${to.split(',').length} recipient(s).`);
  return true;
}

// Only auto-run when invoked directly (lets tests import buildEmail/findCivilWars).
if (process.argv[1] && process.argv[1].endsWith('watch-civilwar.mjs')) {
  main().catch(err => { console.error('watch-civilwar failed:', err.message); process.exit(1); });
}
