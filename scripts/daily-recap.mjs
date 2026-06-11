#!/usr/bin/env node
// ============================================================================
// MWCGA DAILY BRIEFING — the most TREMENDOUS World Cup recap email in history
// Runs in GitHub Actions every morning (see .github/workflows/daily-recap.yml).
// Reads the live family game from Firebase + scores from openfootball, scores
// matches with the SAME rules as the app, and writes the day's briefing in
// The Voice. Outputs: recap.html, recap.txt, and GITHUB_OUTPUT send/subject.
// Test locally:  node scripts/daily-recap.mjs            (uses real today)
//                MWCGA_FAKE_TODAY=2026-06-15 node scripts/daily-recap.mjs
// ============================================================================
import { writeFileSync, appendFileSync, readFileSync } from 'node:fs';

const GAME_URL = process.env.MWCGA_GAME_URL || 'https://mwcga-c2e5e-default-rtdb.firebaseio.com/games/wcuaw50n22xo.json';
const FEED_URL = process.env.MWCGA_FEED_URL || 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const SITE_URL = 'https://wbhamilton05-stack.github.io/mwcga/?game=wcuaw50n22xo';
const SITE_BASE = 'https://wbhamilton05-stack.github.io/mwcga';
// Match-preview manifest (written by the overnight previews cron; present in
// the workflow checkout). Maps app-style match keys → briefing/episode paths.
let _previews = {};
try { _previews = JSON.parse(readFileSync('matchday/index.json', 'utf8')); } catch (e) { /* none yet */ }
const FIRST_DAY = '2026-06-11', LAST_DAY = '2026-07-20';
// Two editions share this script: the 8 AM Central MORNING briefing (preview)
// and the 11 PM Central NIGHTCAP (same-day results). The workflow sets
// MWCGA_MODE per cron; manual runs auto-detect by UTC hour.
const MODE = process.env.MWCGA_MODE || (new Date().getUTCHours() < 8 ? 'night' : 'morning');

const TEAMS = {
  "Mexico": {
    "flag": "🇲🇽",
    "group": "A"
  },
  "Czechia": {
    "flag": "🇨🇿",
    "group": "A"
  },
  "South Korea": {
    "flag": "🇰🇷",
    "group": "A"
  },
  "South Africa": {
    "flag": "🇿🇦",
    "group": "A"
  },
  "Switzerland": {
    "flag": "🇨🇭",
    "group": "B"
  },
  "Canada": {
    "flag": "🇨🇦",
    "group": "B"
  },
  "Bosnia-Herzegovina": {
    "flag": "🇧🇦",
    "group": "B"
  },
  "Qatar": {
    "flag": "🇶🇦",
    "group": "B"
  },
  "Brazil": {
    "flag": "🇧🇷",
    "group": "C"
  },
  "Morocco": {
    "flag": "🇲🇦",
    "group": "C"
  },
  "Scotland": {
    "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "group": "C"
  },
  "Haiti": {
    "flag": "🇭🇹",
    "group": "C"
  },
  "United States": {
    "flag": "🇺🇸",
    "group": "D"
  },
  "Türkiye": {
    "flag": "🇹🇷",
    "group": "D"
  },
  "Paraguay": {
    "flag": "🇵🇾",
    "group": "D"
  },
  "Australia": {
    "flag": "🇦🇺",
    "group": "D"
  },
  "Germany": {
    "flag": "🇩🇪",
    "group": "E"
  },
  "Ecuador": {
    "flag": "🇪🇨",
    "group": "E"
  },
  "Ivory Coast": {
    "flag": "🇨🇮",
    "group": "E"
  },
  "Curaçao": {
    "flag": "🇨🇼",
    "group": "E"
  },
  "Netherlands": {
    "flag": "🇳🇱",
    "group": "F"
  },
  "Japan": {
    "flag": "🇯🇵",
    "group": "F"
  },
  "Sweden": {
    "flag": "🇸🇪",
    "group": "F"
  },
  "Tunisia": {
    "flag": "🇹🇳",
    "group": "F"
  },
  "Belgium": {
    "flag": "🇧🇪",
    "group": "G"
  },
  "Egypt": {
    "flag": "🇪🇬",
    "group": "G"
  },
  "Iran": {
    "flag": "🇮🇷",
    "group": "G"
  },
  "New Zealand": {
    "flag": "🇳🇿",
    "group": "G"
  },
  "Spain": {
    "flag": "🇪🇸",
    "group": "H"
  },
  "Uruguay": {
    "flag": "🇺🇾",
    "group": "H"
  },
  "Saudi Arabia": {
    "flag": "🇸🇦",
    "group": "H"
  },
  "Cape Verde": {
    "flag": "🇨🇻",
    "group": "H"
  },
  "France": {
    "flag": "🇫🇷",
    "group": "I"
  },
  "Norway": {
    "flag": "🇳🇴",
    "group": "I"
  },
  "Senegal": {
    "flag": "🇸🇳",
    "group": "I"
  },
  "Iraq": {
    "flag": "🇮🇶",
    "group": "I"
  },
  "Argentina": {
    "flag": "🇦🇷",
    "group": "J"
  },
  "Austria": {
    "flag": "🇦🇹",
    "group": "J"
  },
  "Algeria": {
    "flag": "🇩🇿",
    "group": "J"
  },
  "Jordan": {
    "flag": "🇯🇴",
    "group": "J"
  },
  "Portugal": {
    "flag": "🇵🇹",
    "group": "K"
  },
  "Colombia": {
    "flag": "🇨🇴",
    "group": "K"
  },
  "Congo DR": {
    "flag": "🇨🇩",
    "group": "K"
  },
  "Uzbekistan": {
    "flag": "🇺🇿",
    "group": "K"
  },
  "England": {
    "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "group": "L"
  },
  "Croatia": {
    "flag": "🇭🇷",
    "group": "L"
  },
  "Ghana": {
    "flag": "🇬🇭",
    "group": "L"
  },
  "Panama": {
    "flag": "🇵🇦",
    "group": "L"
  }
};

// Same normalization as the app (incl. the four feed spelling fixes)
const PLAYOFF_MAP = {
  'UEFA Path A winner': 'Bosnia-Herzegovina', 'UEFA Path B winner': 'Sweden',
  'UEFA Path C winner': 'Türkiye', 'UEFA Path D winner': 'Czechia',
  'IC Path 1 winner': 'Congo DR', 'IC Path 2 winner': 'Iraq',
  'USA': 'United States', 'Turkey': 'Türkiye', 'Czech Republic': 'Czechia',
  'DR Congo': 'Congo DR', 'Bosnia & Herzegovina': 'Bosnia-Herzegovina',
};
const mapName = n => PLAYOFF_MAP[n] || n;
const flag = t => (TEAMS[t] && TEAMS[t].flag) || '⚽';

// Tournament-winner odds (same table as the app) for upset detection + pizzazz
const ODDS = {"Spain": "9/2", "France": "6/1", "England": "11/2", "Argentina": "8/1", "Brazil": "8/1", "Portugal": "12/1", "Germany": "12/1", "Netherlands": "20/1", "Norway": "25/1", "Belgium": "33/1", "Switzerland": "40/1", "Colombia": "50/1", "Morocco": "50/1", "United States": "50/1", "Japan": "66/1", "Uruguay": "80/1", "Mexico": "80/1", "Türkiye": "100/1", "Croatia": "100/1", "Ecuador": "100/1", "Senegal": "100/1", "Austria": "150/1", "Sweden": "150/1", "Paraguay": "150/1", "Canada": "150/1", "Scotland": "250/1", "Bosnia-Herzegovina": "250/1", "Egypt": "300/1", "Czechia": "300/1", "Ivory Coast": "300/1", "Algeria": "300/1", "Ghana": "400/1", "Iran": "500/1", "South Korea": "500/1", "Australia": "500/1", "Tunisia": "500/1", "Congo DR": "750/1", "Qatar": "1000/1", "Saudi Arabia": "1000/1", "South Africa": "1000/1", "New Zealand": "1500/1", "Panama": "1500/1", "Iraq": "1500/1", "Cape Verde": "2000/1", "Uzbekistan": "2000/1", "Curaçao": "2000/1", "Jordan": "2500/1", "Haiti": "3000/1"};
const impliedPct = f => { const [a, b] = f.split('/').map(Number); return 100 * b / (a + b); };
const oddsOf = t => ODDS[t] || null;

// Owner epithets — rotate a little disrespect and a little glory
const EPITHET = {
  'Will': ['the Commissioner', 'the League Architect', 'Mr. Big League himself'],
  'Granddad': ['the Veteran', 'the Eight-Days-a-Week Golfer', 'the Salesman (still selling)', 'the Original Patriot'],
  'Barnes': ['the Prodigy', 'the Marksman (he doesn\'t miss)', 'the Builder', 'the Future of the Franchise'],
  'Warner': ['the Young Phenom', 'the Double-Digit Destroyer', 'the Analyst (he sees EVERYTHING)', 'the Youngest GM in History'],
};

const ROUND_MULT = { group: 1, r32: 2, r16: 3, qf: 5, sf: 8, third: 5, final: 13 };
const ROUND_NAME = { group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', third: '3rd-Place Match', final: 'THE FINAL' };
function roundOf(m) {
  const r = String(m.round || '').toLowerCase();
  if (r.startsWith('matchday')) return 'group';
  if (r.includes('round of 32')) return 'r32';
  if (r.includes('round of 16')) return 'r16';
  if (r.includes('quarter')) return 'qf';
  if (r.includes('semi')) return 'sf';
  if (r.includes('third')) return 'third';
  if (r === 'final') return 'final';
  return 'group';
}

// Central time (CDT = UTC-5 all tournament)
function centralDate(offsetDays = 0) {
  const fake = process.env.MWCGA_FAKE_TODAY;
  const base = fake ? Date.parse(fake + 'T12:00:00Z') : (Date.now() - 5 * 3600e3);
  return new Date(base + offsetDays * 86400e3).toISOString().slice(0, 10);
}

// Deterministic per-day phrase picker (same email on re-run, fresh tomorrow)
function seededPicker(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (arr) => { h = Math.imul(h ^ (h >>> 13), 1597334677); return arr[Math.abs(h) % arr.length]; };
}

async function main() {
  const today = centralDate(0), yesterday = centralDate(-1);
  const out = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
  out('date', today);
  out('mode', MODE);

  if (today < FIRST_DAY || today > LAST_DAY) {
    // PRE-TOURNAMENT SPECIAL: if the one-time kickoff preview is staged in the
    // repo, send THAT instead. Only reachable before June 11, so it can never
    // collide with (or repeat after) the daily briefings.
    if (today < FIRST_DAY) {
      try {
        const { readFileSync } = await import('node:fs');
        const kickoff = readFileSync(new URL('./kickoff-email.html', import.meta.url), 'utf8');
        writeFileSync('recap.html', kickoff);
        writeFileSync('recap.txt', 'THE NIGHT-BEFORE-KICKOFF PREVIEW — open the HTML version for the full tremendous experience. ' + SITE_URL);
        out('send', 'true');
        out('subject', '🏆 THE NIGHT BEFORE EVERYTHING: MWCGA 2026 — THE GREATEST DRAFT IN HUMAN HISTORY, FOLKS 🇺🇸🦅');
        console.log('Kickoff preview staged — sending the season premiere.');
        return;
      } catch (e) { /* no kickoff file staged — fall through to no-op */ }
    }
    console.log(`Outside tournament window (${today}) — no briefing.`);
    out('send', 'false');
    return;
  }

  const [gameRes, feedRes] = await Promise.all([fetch(GAME_URL), fetch(FEED_URL)]);
  if (!gameRes.ok || !feedRes.ok) throw new Error(`fetch failed: game ${gameRes.status}, feed ${feedRes.status}`);
  const game = await gameRes.json();
  const feed = await feedRes.json();
  const st = game.state;
  const players = st.players.map(p => p.name);
  const EMOJI = ['🔴', '⚪', '🟡', '🔵'];

  // team -> owner index
  const rosters = st.rosters || {};
  const ownerOf = {};
  players.forEach((_, i) => {
    const teams = Array.isArray(rosters) ? (rosters[i] || []) : (rosters[String(i)] || rosters[i] || []);
    (teams || []).forEach(t => { if (t) ownerOf[t] = i; });
  });

  // Normalize feed matches + apply family scoreOverrides (manual entries win)
  const overrides = st.scoreOverrides || {};
  const matches = feed.matches.map(m => {
    const t1 = mapName(m.team1), t2 = mapName(m.team2);
    const r = roundOf(m);
    let s1 = null, s2 = null, p1 = null, p2 = null;
    if (m.score && Array.isArray(m.score.ft)) {
      const fin = Array.isArray(m.score.et) ? m.score.et : m.score.ft;
      [s1, s2] = fin;
      if (Array.isArray(m.score.p)) [p1, p2] = m.score.p;
    }
    // override keys as the app stores them (frozen placeholder keys for third/final)
    const keys = [m.num != null ? 'k' + m.num : null, `${m.date}|${t1}|${t2}`,
      r === 'third' ? '2026-07-18|L101|L102' : null, r === 'final' ? '2026-07-19|W101|W102' : null].filter(Boolean);
    for (const k of keys) {
      const o = overrides[k];
      if (o && o.score1 != null && o.score2 != null) {
        s1 = o.score1; s2 = o.score2; p1 = o.pens1 ?? p1; p2 = o.pens2 ?? p2;
        break;
      }
    }
    return { date: m.date, round: r, t1, t2, s1, s2, p1, p2, num: m.num };
  });

  // Same points math as the app
  function points(m) {
    if (m.s1 == null || m.s2 == null) return null;
    const mult = ROUND_MULT[m.round];
    let pts1 = 0, pts2 = 0, adv = 0;
    if (m.s1 > m.s2) pts1 = 3; else if (m.s2 > m.s1) pts2 = 3; else { pts1 = 1; pts2 = 1; }
    if (m.round !== 'group') {
      if (m.s1 > m.s2) adv = 1; else if (m.s2 > m.s1) adv = 2;
      else if (m.p1 != null && m.p2 != null && Number(m.p1) !== Number(m.p2)) adv = Number(m.p1) > Number(m.p2) ? 1 : 2;
      if (adv === 1) pts1 += 3; if (adv === 2) pts2 += 3;
    }
    return { pts1: pts1 * mult, pts2: pts2 * mult, adv, mult };
  }

  const totals = players.map(() => 0);
  matches.forEach(m => {
    const p = points(m);
    if (!p) return;
    if (ownerOf[m.t1] != null) totals[ownerOf[m.t1]] += p.pts1;
    if (ownerOf[m.t2] != null) totals[ownerOf[m.t2]] += p.pts2;
  });
  const board = players.map((name, i) => ({ name, i, pts: totals[i] })).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
  let lastPts = null, lastRank = 1;
  board.forEach((b, i) => { b.rank = b.pts === lastPts ? lastRank : i + 1; lastPts = b.pts; lastRank = b.rank; });

  const yResults = matches.filter(m => m.date === yesterday && m.s1 != null);
  const tGames = matches.filter(m => m.date === today);

  if (yResults.length === 0 && tGames.length === 0) {
    console.log('No results yesterday and no games today — skipping briefing.');
    out('send', 'false');
    return;
  }

  // ── THE VOICE ──
  const pick = seededPicker(today);
  const OPENERS = [
    "BREAKING: this briefing just got even more tremendous. Experts are studying how one email can contain this much winning.",
    "Another beautiful morning in the greatest fantasy league on Earth. The birds are singing, the haters are crying, and the scores are IN.",
    "I was told there would be other World Cup newsletters. I looked. There's nothing. NOTHING, folks. This is the only one that matters.",
    "GOOD MORNING, PATRIOTS! While the Fake News sleeps, the MWCGA delivers the most ACCURATE, most BEAUTIFUL World Cup briefing in the history of briefings. Maybe ever.",
    "FOLKS — nobody covers this tournament like we do. NOBODY. Other families get no briefing at all. Sad!",
    "They said one family couldn't run the greatest fantasy league on Planet Earth. WRONG AGAIN. Here is your tremendous, very legal, very cool daily briefing.",
    "Rise and shine, champions. The haters and losers said this league wouldn't last a week. We're stronger than ever. TREMENDOUS numbers below.",
    "This briefing has the best words, the best scores, and frankly the best readers. Everyone says so.",
  ];
  const WIN_WORDS = ["sent a very strong message to", "made absolute mincemeat of", "took to the woodshed","absolutely DEMOLISHED", "totally DOMINATED", "beat the living daylights out of", "humiliated — and I mean HUMILIATED —", "steamrolled"];
  const BIGWIN = ["People are calling it the greatest performance in the history of this tournament, maybe any tournament.", "Total domination. You hate to see it. Actually, you love to see it.", "Even the referees were impressed, and they're very tough people."];
  const DRAW_LINES = ["A draw. BORING! But points are points, folks — we take them and we move on.", "They tied. Low energy from both sides, frankly. Still — beautiful points all around.", "A tie?? In AMERICA?? (Fine, technically also Canada and Mexico.) Points secured anyway."];
  const LEADER_LINES = ["is WINNING SO BIGLY it's almost unfair", "is leading by a lot — people are saying it might be rigged, it's not, they're just tremendous at this", "is on top of the polls. REAL polls, the best polls"];
  const BOTTOM_LINES = ["Look — tremendous person, beautiful family, but these numbers are a DISASTER. Time for the greatest comeback in history.", "The Fake News says it's over. WRONG. Nobody does comebacks like this family.", "Currently getting absolutely SCHLONGED in the standings. But the knockout rounds pay 13X, folks. It's not over."];
  const CLOSERS = [
    `Tell your friends. Tell your enemies. Tell the Fake News. The board never lies: ${SITE_URL} — MWCGA! 🦅`,
    `Somewhere a pundit is wrong about your teams. Prove it on the scoreboard: ${SITE_URL} 🇺🇸`,
    `Full standings, rosters, everything — it's all there, it's all beautiful: ${SITE_URL} — MWCGA!! 🇺🇸🦅`,
    `We're going to win so much you may even get tired of winning. You won't. Check the board: ${SITE_URL} 🇺🇸`,
    `Stay loyal, stay beautiful, and check the scoreboard: ${SITE_URL} — MAKE THE WORLD CUP GREAT AGAIN! 🦅`,
  ];

  const txt = [], html = [];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const addPreviewLinks = (m) => {
    const key = m.num != null ? 'k' + m.num : `${m.date}|${m.t1}|${m.t2}`;
    const pv = _previews[key];
    if (!pv || !pv.html) return;
    txt.push(`     📰 Briefing: ${SITE_BASE}/${pv.html}` + (pv.mp3 ? `  ·  🎙️ Listen: ${SITE_BASE}/${pv.mp3}` : ''));
    html.push(`<p style="font-family:Arial,sans-serif;font-size:13px;margin:0 0 10px 18px;"><a href="${SITE_BASE}/${pv.html}" style="color:#b22234;font-weight:bold;text-decoration:none;">📰 Match Briefing</a>` + (pv.mp3 ? ` &nbsp;·&nbsp; <a href="${SITE_BASE}/${pv.mp3}" style="color:#b22234;font-weight:bold;text-decoration:none;">🎙️ Listen (2 min)</a>` : '') + `</p>`);
  };
  const addH = (t) => { txt.push('\n== ' + t + ' =='); html.push(`<h2 style="color:#b22234;font-family:Arial,sans-serif;margin:18px 0 6px;">${esc(t)}</h2>`); };
  const addP = (t, bold) => { txt.push(t); html.push(`<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;margin:6px 0;${bold ? 'font-weight:bold;' : ''}">${esc(t)}</p>`); };

  const dayN = Math.round((Date.parse(today) - Date.parse(FIRST_DAY)) / 86400e3) + 1;
  const ep = (name) => { const list = EPITHET[name]; return list ? pick(list) : ''; };

  // ── 🌙 NIGHTCAP EDITION ──────────────────────────────────────────────────
  if (MODE === 'night') {
    const tResults = matches.filter(m => m.date === today && m.s1 != null);
    const tPending = matches.filter(m => m.date === today && m.s1 == null);
    const tomorrow = centralDate(1);
    const tmGames = matches.filter(m => m.date === tomorrow);
    if (tResults.length === 0 && tPending.length === 0) {
      console.log('No games today — no nightcap.');
      out('send', 'false');
      return;
    }
    addP(`🌙 THE MWCGA NIGHTCAP — DAY ${dayN} IS IN THE BOOKS 🌙`, true);
    addP(pick([
      "The stadiums are dark, the points are counted, and somebody in this family is going to sleep ANGRY tonight. Beautiful.",
      "Before you go to bed, patriots, the numbers. Always the numbers. The most accurate numbers in late-night television.",
      "Day " + dayN + " is OVER, folks — and what a day. Historians will write about it. The Fake News won't. We will.",
      "Lights out at the World Cup — but first, your official, certified, absolutely tremendous end-of-day accounting.",
    ]), true);

    if (tResults.length) {
      addH(`TONIGHT'S FINAL WHISTLES (${today})`);
      for (const m of tResults) {
        const p = points(m);
        const o1 = ownerOf[m.t1], o2 = ownerOf[m.t2];
        const score = `${m.s1}–${m.s2}` + (m.p1 != null ? ` (${m.p1}–${m.p2} pens)` : '');
        if (m.s1 === m.s2 && !p.adv) {
          addP(`• ${flag(m.t1)} ${m.t1} ${score} ${m.t2} ${flag(m.t2)} — ${pick(DRAW_LINES)} (${o1 != null ? players[o1] : 'Spoiler'} +${p.pts1}, ${o2 != null ? players[o2] : 'Spoiler'} +${p.pts2})`);
        } else {
          const w = (m.s1 > m.s2 || p.adv === 1) ? 1 : 2;
          const [wt, lt, wo, wp] = w === 1 ? [m.t1, m.t2, o1, p.pts1] : [m.t2, m.t1, o2, p.pts2];
          const wOdds = oddsOf(wt), lOdds = oddsOf(lt);
          const upset = wOdds && lOdds && impliedPct(wOdds) < impliedPct(lOdds) / 4;
          addP(`• ${flag(wt)} ${wt} (${wo != null ? players[wo] + ', ' + ep(players[wo]) : 'Spoiler'}) ${pick(WIN_WORDS)} ${lt} ${flag(lt)}, ${score}.` +
            (upset ? ` A MASSIVE UPSET at ${wOdds} — the experts are in SHAMBLES tonight.` : '') +
            (wo != null ? ` +${wp} points${p.mult > 1 ? ` (×${p.mult} ${ROUND_NAME[m.round]})` : ''}.` : ''));
        }
        addPreviewLinks(m);
      }
    }
    if (tPending.length) {
      addH('STILL BEING COUNTED');
      addP(`${tPending.length} match${tPending.length > 1 ? 'es' : ''} from today ${tPending.length > 1 ? "haven't" : "hasn't"} reached the official feed yet (${tPending.map(m => `${m.t1} vs ${m.t2}`).join('; ')}). The morning briefing will have the certified finals. Slow counters. Sad!`);
    }

    // Tonight's haul — who actually got paid today
    const haul = players.map((name, i) => {
      let pts = 0;
      tResults.forEach(m => {
        const p = points(m);
        if (ownerOf[m.t1] === i) pts += p.pts1;
        if (ownerOf[m.t2] === i) pts += p.pts2;
      });
      return { name, i, pts };
    }).sort((a, b) => b.pts - a.pts);
    if (tResults.length) {
      addH("TONIGHT'S HAUL — WHO GOT PAID TODAY");
      addP(haul.map(x => `${EMOJI[x.i]} ${x.name} +${x.pts}`).join('   ·   '));
      const top = haul[0];
      if (top.pts > 0 && (haul.length < 2 || top.pts > haul[1].pts)) {
        addP(`${top.name}, ${ep(top.name)}, owns the night with +${top.pts}. ${pick(["Somebody check on the others.", "The family group chat just went quiet. Very quiet.", "Tremendous day at the office.", "That's a statement, folks."])}`);
      }
    }

    addH('THE LEADERBOARD — WHERE WE SLEEP TONIGHT');
    const soleLeaderN = board.filter(b => b.rank === 1).length === 1;
    for (const b of board) {
      addP(`#${b.rank}  ${EMOJI[b.i]} ${b.name}: ${b.pts} pts${b.rank === 1 && soleLeaderN ? ' — sleeping like a champion tonight' : ''}`);
    }

    if (tmGames.length) {
      addH('TOMORROW, WE GO AGAIN');
      const feuds = tmGames.filter(m => ownerOf[m.t1] != null && ownerOf[m.t2] != null && ownerOf[m.t1] !== ownerOf[m.t2]);
      const marquee = feuds[0] || tmGames[0];
      addP(`${tmGames.length} match${tmGames.length > 1 ? 'es' : ''} tomorrow${marquee ? `, headlined by ${flag(marquee.t1)} ${marquee.t1}${ownerOf[marquee.t1] != null ? ` (${players[ownerOf[marquee.t1]]})` : ''} vs ${marquee.t2}${ownerOf[marquee.t2] != null ? ` (${players[ownerOf[marquee.t2]]})` : ''} ${flag(marquee.t2)}` : ''}. Full battle plan lands at 8 AM sharp. Sleep fast, patriots.`);
    }

    txt.push('');
    addP(pick(CLOSERS), true);

    const leaderN = board[0];
    const subjectN = soleLeaderN
      ? `🌙 MWCGA NIGHTCAP — DAY ${dayN}: ${leaderN.name.toUpperCase()} SLEEPS ON TOP (${leaderN.pts} PTS)`
      : `🌙 MWCGA NIGHTCAP — DAY ${dayN}: DEADLOCKED AT THE TOP. NOBODY SLEEPS.`;
    const fullHtmlN = `<div style="max-width:640px;margin:0 auto;border:3px solid #0a1c4a;border-radius:10px;padding:18px;background:#0a1c4a;">
<h1 style="font-family:Arial,sans-serif;color:#ffd700;margin:0 0 2px;">🌙 MWCGA NIGHTCAP 🌙</h1>
<div style="font-family:Arial,sans-serif;color:#b8c8f0;font-weight:bold;font-size:13px;margin-bottom:10px;">MAKE THE WORLD CUP GREAT AGAIN · DAY ${dayN} COMPLETE · ${today}</div>
<div style="background:#fffdf5;border-radius:8px;padding:4px 14px;">
${html.join('\n')}
</div></div>`;
    writeFileSync('recap.html', fullHtmlN);
    writeFileSync('recap.txt', txt.join('\n'));
    out('send', 'true');
    out('subject', subjectN);
    console.log('SUBJECT: ' + subjectN + '\n');
    console.log(txt.join('\n'));
    return;
  }
  // ── ☀️ MORNING EDITION (original) ────────────────────────────────────────
  addP(`☀️ DAY ${dayN} OF THE GREATEST TOURNAMENT EVER HELD ☀️`, true);
  addP(pick(OPENERS), true);

  if (yResults.length) {
    addH(`YESTERDAY'S TREMENDOUS RESULTS (${yesterday})`);
    for (const m of yResults) {
      const p = points(m);
      const o1 = ownerOf[m.t1], o2 = ownerOf[m.t2];
      const score = `${m.s1}–${m.s2}` + (m.p1 != null ? ` (${m.p1}–${m.p2} pens)` : '');
      let line;
      if (m.s1 === m.s2 && !p.adv) {
        line = `${flag(m.t1)} ${m.t1} ${score} ${m.t2} ${flag(m.t2)} — ${pick(DRAW_LINES)} (${players[o1] ?? 'Spoiler'} +${p.pts1}, ${players[o2] ?? 'Spoiler'} +${p.pts2})`;
      } else {
        const w = (m.s1 > m.s2 || p.adv === 1) ? 1 : 2;
        const [wt, lt, wo, wp] = w === 1 ? [m.t1, m.t2, o1, p.pts1] : [m.t2, m.t1, o2, p.pts2];
        const margin = Math.abs(m.s1 - m.s2);
        const wOdds = oddsOf(wt), lOdds = oddsOf(lt);
        const upset = wOdds && lOdds && impliedPct(wt && wOdds) < impliedPct(lOdds) / 4;
        line = `${flag(wt)} ${wt} (${wo != null ? players[wo] + ', ' + ep(players[wo]) : 'Spoiler'}) ${pick(WIN_WORDS)} ${lt} ${flag(lt)}, ${score}.` +
          (upset ? ` A MASSIVE UPSET — the so-called experts had ${wt} at ${wOdds}. WRONG AGAIN! The Fake Odds strike out one more time.` : '') +
          (margin >= 3 ? ' ' + pick(BIGWIN) : '') +
          (wo != null ? ` +${wp} BEAUTIFUL points${p.mult > 1 ? ` (that's the ${ROUND_NAME[m.round]} ×${p.mult} multiplier, folks)` : ''}.` : ' Nobody owns them. Spoiler team. SAD!');
      }
      addP('• ' + line);
    }
  }

  addH('THE LEADERBOARD — REAL POLLS, THE BEST POLLS');
  const soleLeader = board.filter(b => b.rank === 1).length === 1;
  const worstRank = Math.max(...board.map(x => x.rank));
  for (const b of board) {
    let tag = '';
    if (b.rank === 1 && soleLeader) tag = ` — ${pick(LEADER_LINES)}!`;
    else if (b.rank === worstRank && worstRank > 1 && b.pts < board[0].pts) tag = ` — ${pick(BOTTOM_LINES)}`;
    addP(`#${b.rank}  ${EMOJI[b.i]} ${b.name}: ${b.pts} pts${tag}`);
  }
  if (!soleLeader) addP('A DEAD HEAT at the top. The tension is UNBELIEVABLE. Somebody has to win — and somebody has to lose. Sad for them!');

  if (tGames.length) {
    // Whose armies march today
    const armies = players.map((name, i) => {
      const list = [];
      tGames.forEach(m => {
        if (ownerOf[m.t1] === i) list.push(`${flag(m.t1)} ${m.t1} (vs ${m.t2})`);
        if (ownerOf[m.t2] === i) list.push(`${flag(m.t2)} ${m.t2} (vs ${m.t1})`);
      });
      return { name, i, list };
    }).filter(a => a.list.length);
    if (armies.length) {
      addH('YOUR ARMIES MARCH TODAY');
      for (const a of armies) addP(`${EMOJI[a.i]} ${a.name.toUpperCase()}, ${ep(a.name)}, sends out: ${a.list.join(' · ')}`);
    }

    addH(`TODAY'S BATTLES (${today}) — SET YOUR ALARMS, PATRIOTS`);
    for (const m of tGames) {
      const o1 = ownerOf[m.t1], o2 = ownerOf[m.t2];
      const mult = ROUND_MULT[m.round];
      const stakes = [];
      if (o1 != null) stakes.push(`${players[o1]} +${(m.round === 'group' ? 3 : 6) * mult} if ${m.t1} wins`);
      if (o2 != null) stakes.push(`${players[o2]} +${(m.round === 'group' ? 3 : 6) * mult} if ${m.t2} wins`);
      const roundTag = m.round !== 'group' ? ` [${ROUND_NAME[m.round]} — ×${mult} HUGE]` : '';
      const feud = (o1 != null && o2 != null && o1 !== o2) ? ` 🔥 FAMILY FEUD ALERT: ${players[o1]} vs ${players[o2]} — dinner-table bragging rights ON THE LINE.` : '';
      const odds1 = oddsOf(m.t1), odds2 = oddsOf(m.t2);
      const oddsNote = odds1 && odds2 ? ` (odds: ${m.t1} ${odds1}, ${m.t2} ${odds2})` : '';
      addP(`• ${flag(m.t1)} ${m.t1}${o1 != null ? ` (${EMOJI[o1]} ${players[o1]})` : ''} vs ${m.t2}${o2 != null ? ` (${EMOJI[o2]} ${players[o2]})` : ''} ${flag(m.t2)}${roundTag}${oddsNote}${stakes.length ? ' — ' + stakes.join('; ') : ''}${feud}`);
      addPreviewLinks(m);
    }

    // Upset watch: today's biggest David-vs-Goliath where somebody owns David
    const candidates = tGames.map(m => {
      const p1 = oddsOf(m.t1) ? impliedPct(oddsOf(m.t1)) : null, p2 = oddsOf(m.t2) ? impliedPct(oddsOf(m.t2)) : null;
      if (p1 == null || p2 == null) return null;
      const david = p1 < p2 ? m.t1 : m.t2, goliath = p1 < p2 ? m.t2 : m.t1;
      const gap = Math.max(p1, p2) / Math.max(0.01, Math.min(p1, p2));
      return { david, goliath, gap, owner: ownerOf[david] };
    }).filter(c => c && c.gap >= 8 && c.owner != null).sort((a, b) => b.gap - a.gap);
    if (candidates.length) {
      const c = candidates[0];
      addP(`🚨 UPSET WATCH: ${flag(c.david)} ${c.david} (${ODDS[c.david]}) against mighty ${c.goliath}. The experts say it can't happen. The experts also said I couldn't fit this many capital letters in one email. ${players[c.owner]}, ${ep(players[c.owner])}, believes.`);
    }
  }

  txt.push('');
  addP(pick(CLOSERS), true);

  const leader = board[0];
  const tied = board.filter(b => b.rank === 1).length > 1;
  const subject = tied
    ? `🦅 MWCGA BRIEFING ${today}: DEAD HEAT AT THE TOP — TREMENDOUS TENSION`
    : `🦅 MWCGA BRIEFING ${today}: ${leader.name.toUpperCase()} ${leader.pts > 0 ? `WINNING BIGLY (${leader.pts} PTS)` : 'LEADS A SCORELESS NATION'}`;

  const fullHtml = `<div style="max-width:640px;margin:0 auto;border:3px solid #b22234;border-radius:10px;padding:18px;background:#fffdf5;">
<h1 style="font-family:Arial,sans-serif;color:#0a1c4a;margin:0 0 2px;">🇺🇸 MWCGA DAILY BRIEFING 🇺🇸</h1>
<div style="font-family:Arial,sans-serif;color:#b22234;font-weight:bold;font-size:13px;margin-bottom:10px;">MAKE THE WORLD CUP GREAT AGAIN · ${today}</div>
${html.join('\n')}
</div>`;

  writeFileSync('recap.html', fullHtml);
  writeFileSync('recap.txt', txt.join('\n'));
  out('send', 'true');
  out('subject', subject);
  console.log('SUBJECT: ' + subject + '\n');
  console.log(txt.join('\n'));
}

main().catch(e => { console.error(e); process.exit(1); });
