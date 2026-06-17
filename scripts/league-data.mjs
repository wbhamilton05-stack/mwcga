// Shared MWCGA league data + helpers for the content pipeline scripts.
// TEAMS/ODDS are extracted from the live app so content never disagrees with it.
export const SITE = 'https://wbhamilton05-stack.github.io/mwcga';
export const GAME_URL = 'https://mwcga-c2e5e-default-rtdb.firebaseio.com/games/wcuaw50n22xo.json';
export const FEED_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
export const FIRST_DAY = '2026-06-11', LAST_DAY = '2026-07-19';

export const TEAMS = {"Mexico": {"group": "A", "flag": "🇲🇽", "seed": 1, "tier": 3}, "Czechia": {"group": "A", "flag": "🇨🇿", "seed": 2, "tier": 4}, "South Korea": {"group": "A", "flag": "🇰🇷", "seed": 3, "tier": 5}, "South Africa": {"group": "A", "flag": "🇿🇦", "seed": 4, "tier": 5}, "Switzerland": {"group": "B", "flag": "🇨🇭", "seed": 1, "tier": 3}, "Canada": {"group": "B", "flag": "🇨🇦", "seed": 2, "tier": 4}, "Bosnia-Herzegovina": {"group": "B", "flag": "🇧🇦", "seed": 3, "tier": 5}, "Qatar": {"group": "B", "flag": "🇶🇦", "seed": 4, "tier": 5}, "Brazil": {"group": "C", "flag": "🇧🇷", "seed": 1, "tier": 1}, "Morocco": {"group": "C", "flag": "🇲🇦", "seed": 2, "tier": 3}, "Scotland": {"group": "C", "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "seed": 3, "tier": 4}, "Haiti": {"group": "C", "flag": "🇭🇹", "seed": 4, "tier": 5}, "United States": {"group": "D", "flag": "🇺🇸", "seed": 1, "tier": 3}, "Türkiye": {"group": "D", "flag": "🇹🇷", "seed": 2, "tier": 4}, "Paraguay": {"group": "D", "flag": "🇵🇾", "seed": 3, "tier": 4}, "Australia": {"group": "D", "flag": "🇦🇺", "seed": 4, "tier": 4}, "Germany": {"group": "E", "flag": "🇩🇪", "seed": 1, "tier": 1}, "Ecuador": {"group": "E", "flag": "🇪🇨", "seed": 2, "tier": 3}, "Ivory Coast": {"group": "E", "flag": "🇨🇮", "seed": 3, "tier": 4}, "Curaçao": {"group": "E", "flag": "🇨🇼", "seed": 4, "tier": 5}, "Netherlands": {"group": "F", "flag": "🇳🇱", "seed": 1, "tier": 2}, "Japan": {"group": "F", "flag": "🇯🇵", "seed": 2, "tier": 3}, "Sweden": {"group": "F", "flag": "🇸🇪", "seed": 3, "tier": 4}, "Tunisia": {"group": "F", "flag": "🇹🇳", "seed": 4, "tier": 4}, "Belgium": {"group": "G", "flag": "🇧🇪", "seed": 1, "tier": 2}, "Egypt": {"group": "G", "flag": "🇪🇬", "seed": 2, "tier": 4}, "Iran": {"group": "G", "flag": "🇮🇷", "seed": 3, "tier": 4}, "New Zealand": {"group": "G", "flag": "🇳🇿", "seed": 4, "tier": 5}, "Spain": {"group": "H", "flag": "🇪🇸", "seed": 1, "tier": 1}, "Uruguay": {"group": "H", "flag": "🇺🇾", "seed": 2, "tier": 2}, "Saudi Arabia": {"group": "H", "flag": "🇸🇦", "seed": 3, "tier": 5}, "Cape Verde": {"group": "H", "flag": "🇨🇻", "seed": 4, "tier": 5}, "France": {"group": "I", "flag": "🇫🇷", "seed": 1, "tier": 1}, "Norway": {"group": "I", "flag": "🇳🇴", "seed": 2, "tier": 2}, "Senegal": {"group": "I", "flag": "🇸🇳", "seed": 3, "tier": 3}, "Iraq": {"group": "I", "flag": "🇮🇶", "seed": 4, "tier": 5}, "Argentina": {"group": "J", "flag": "🇦🇷", "seed": 1, "tier": 1}, "Austria": {"group": "J", "flag": "🇦🇹", "seed": 2, "tier": 4}, "Algeria": {"group": "J", "flag": "🇩🇿", "seed": 3, "tier": 4}, "Jordan": {"group": "J", "flag": "🇯🇴", "seed": 4, "tier": 5}, "Portugal": {"group": "K", "flag": "🇵🇹", "seed": 1, "tier": 1}, "Colombia": {"group": "K", "flag": "🇨🇴", "seed": 2, "tier": 3}, "Congo DR": {"group": "K", "flag": "🇨🇩", "seed": 3, "tier": 5}, "Uzbekistan": {"group": "K", "flag": "🇺🇿", "seed": 4, "tier": 5}, "England": {"group": "L", "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "seed": 1, "tier": 1}, "Croatia": {"group": "L", "flag": "🇭🇷", "seed": 2, "tier": 2}, "Ghana": {"group": "L", "flag": "🇬🇭", "seed": 3, "tier": 4}, "Panama": {"group": "L", "flag": "🇵🇦", "seed": 4, "tier": 5}};
export const ODDS = {"Spain": "9/2", "France": "6/1", "England": "11/2", "Argentina": "8/1", "Brazil": "8/1", "Portugal": "12/1", "Germany": "12/1", "Netherlands": "20/1", "Norway": "25/1", "Belgium": "33/1", "Switzerland": "40/1", "Colombia": "50/1", "Morocco": "50/1", "United States": "50/1", "Japan": "66/1", "Uruguay": "80/1", "Mexico": "80/1", "Türkiye": "100/1", "Croatia": "100/1", "Ecuador": "100/1", "Senegal": "100/1", "Austria": "150/1", "Sweden": "150/1", "Paraguay": "150/1", "Canada": "150/1", "Scotland": "250/1", "Bosnia-Herzegovina": "250/1", "Egypt": "300/1", "Czechia": "300/1", "Ivory Coast": "300/1", "Algeria": "300/1", "Ghana": "400/1", "Iran": "500/1", "South Korea": "500/1", "Australia": "500/1", "Tunisia": "500/1", "Congo DR": "750/1", "Qatar": "1000/1", "Saudi Arabia": "1000/1", "South Africa": "1000/1", "New Zealand": "1500/1", "Panama": "1500/1", "Iraq": "1500/1", "Cape Verde": "2000/1", "Uzbekistan": "2000/1", "Curaçao": "2000/1", "Jordan": "2500/1", "Haiti": "3000/1"};

export const PLAYOFF_MAP = {
  'UEFA Path A winner': 'Bosnia-Herzegovina', 'UEFA Path B winner': 'Sweden',
  'UEFA Path C winner': 'Türkiye', 'UEFA Path D winner': 'Czechia',
  'IC Path 1 winner': 'Congo DR', 'IC Path 2 winner': 'Iraq',
  'USA': 'United States', 'Turkey': 'Türkiye', 'Czech Republic': 'Czechia',
  'DR Congo': 'Congo DR', 'Bosnia & Herzegovina': 'Bosnia-Herzegovina',
};
export const mapName = n => PLAYOFF_MAP[n] || n;
export const flag = t => (TEAMS[t] && TEAMS[t].flag) || '⚽';

export const ROUND_MULT = { group: 1, r32: 2, r16: 3, qf: 5, sf: 8, third: 5, final: 13 };
export const ROUND_NAME = { group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', third: '3rd-Place Match', final: 'THE FINAL' };
export function roundOf(m) {
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

// Same key scheme as the app: 'k'+num for KO games, date|team1|team2 (app names) for group games
export function appMatchKey(feedMatch) {
  if (feedMatch.num != null) return 'k' + feedMatch.num;
  return [feedMatch.date, mapName(feedMatch.team1), mapName(feedMatch.team2)].join('|');
}

export function centralDate(offsetDays = 0) {
  const fake = process.env.MWCGA_FAKE_TODAY;
  const base = fake ? Date.parse(fake + 'T12:00:00Z') : (Date.now() - 5 * 3600e3);
  return new Date(base + offsetDays * 86400e3).toISOString().slice(0, 10);
}

export const OWNER_META = {
  Will: { emoji: '🔴', nick: 'the Commissioner' },
  Granddad: { emoji: '⚪', nick: 'the Veteran' },
  Barnes: { emoji: '🟡', nick: 'the Prodigy' },
  Warner: { emoji: '🔵', nick: 'the Young Phenom' },
};

// Gemini REST client with model discovery + transient-error retries
export function geminiClient(key) {
  const API = 'https://generativelanguage.googleapis.com/v1beta';
  async function call(path, body) {
    const delays = [0, 3000, 8000, 20000];
    let lastErr;
    for (const d of delays) {
      if (d) { console.log(`retrying ${path} in ${d / 1000}s...`); await new Promise(r => setTimeout(r, d)); }
      const r = await fetch(`${API}/${path}?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (r.ok) return r.json();
      const msg = `${path} HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`;
      if (![429, 500, 503].includes(r.status)) throw new Error(msg);
      lastErr = new Error(msg);
    }
    throw lastErr;
  }
  async function models() {
    const r = await fetch(`${API}/models?key=${key}&pageSize=200`);
    if (!r.ok) throw new Error('ListModels HTTP ' + r.status);
    return ((await r.json()).models || []).map(m => m.name.replace('models/', ''));
  }
  return { call, models };
}

// Minimal markdown → email/page-safe HTML (headers, bold, lists, tables, hr)
export function mdToHtml(md) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const inline = t => esc(t)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#b22234;font-weight:bold;">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  const P = 'font-family:Arial,sans-serif;font-size:15px;line-height:1.55;margin:8px 0;';
  const out = []; let inTable = false, inList = false;
  const close = () => {
    if (inTable) { out.push('</table>'); inTable = false; }
    if (inList) { out.push('</ul>'); inList = false; }
  };
  for (const line of md.split('\n')) {
    const ls = line.trim();
    if (ls.startsWith('|')) {
      const cells = ls.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      if (cells.every(c => /^:?-+:?$/.test(c) || c === '')) continue;
      if (!inTable) { close(); out.push('<table style="border-collapse:collapse;margin:8px 0;width:100%;">'); inTable = true; }
      out.push('<tr>' + cells.map(c => `<td style="border:1px solid #ddd;padding:5px 9px;font-family:Arial,sans-serif;font-size:14px;">${inline(c)}</td>`).join('') + '</tr>');
      continue;
    }
    if (inTable) { out.push('</table>'); inTable = false; }
    if (ls.startsWith('### ')) { close(); out.push(`<h3 style="font-family:Arial,sans-serif;color:#0a1c4a;margin:14px 0 4px;">${inline(ls.slice(4))}</h3>`); }
    else if (ls.startsWith('## ')) { close(); out.push(`<h2 style="font-family:Arial,sans-serif;color:#b22234;margin:18px 0 6px;">${inline(ls.slice(3))}</h2>`); }
    else if (ls.startsWith('# ')) { close(); out.push(`<h1 style="font-family:Arial,sans-serif;color:#b22234;border-bottom:3px solid #ffd700;padding-bottom:4px;margin:22px 0 8px;">${inline(ls.slice(2))}</h1>`); }
    else if (ls === '---') { close(); out.push('<hr style="border:none;border-top:2px solid #ffd700;margin:16px 0;">'); }
    else if (ls.startsWith('- ')) {
      if (!inList) { out.push('<ul style="margin:6px 0;padding-left:22px;">'); inList = true; }
      out.push(`<li style="${P}">${inline(ls.slice(2))}</li>`);
    }
    else if (ls === '') { close(); }
    else { close(); out.push(`<p style="${P}">${inline(ls)}</p>`); }
  }
  close();
  return out.join('\n');
}

// ── OWNER-FIRST CONTEXT ──────────────────────────────────────────────────────
// The league's editorial rule: the four OWNERS are the franchises; nations are
// players on their rosters. These builders turn raw results into owner
// narratives (form, momentum, season series, upcoming stretch) for the prompts.

export function normalizeFeedMatch(m) {
  const t1 = mapName(m.team1), t2 = mapName(m.team2);
  let s1 = null, s2 = null, p1 = null, p2 = null;
  if (m.score && Array.isArray(m.score.ft)) {
    const fin = Array.isArray(m.score.et) ? m.score.et : m.score.ft;
    [s1, s2] = fin;
    if (Array.isArray(m.score.p)) [p1, p2] = m.score.p;
  }
  return { date: m.date, round: roundOf(m), t1, t2, s1, s2, p1, p2, num: m.num };
}

export function matchPoints(x) {
  if (x.s1 == null || x.s2 == null) return null;
  const mult = ROUND_MULT[x.round];
  const ko = x.round !== 'group';
  // Winner; in knockouts a level score is decided by the shootout, and a shootout
  // winner counts as a FULL regulation winner (house rule 2026-06-17): Win(3) +
  // Advance(3) = 6×mult, loser 0 (not draw+advance = 4×). Keeps the email/podcast
  // scoring in lockstep with the app's scoreMatch().
  let adv = 0;
  if (x.s1 > x.s2) adv = 1; else if (x.s2 > x.s1) adv = 2;
  else if (ko && x.p1 != null && x.p2 != null && Number(x.p1) !== Number(x.p2)) adv = Number(x.p1) > Number(x.p2) ? 1 : 2;
  let pts1 = 0, pts2 = 0;
  if (adv === 1) pts1 = 3; else if (adv === 2) pts2 = 3; else { pts1 = 1; pts2 = 1; }
  if (ko && adv === 1) pts1 += 3;
  if (ko && adv === 2) pts2 += 3;
  // Group goal-differential bonus (house rule 2026-06-17): winner +min(margin,3),
  // loser −min(margin,3), capped at ±3; group only.
  if (!ko && adv) { const gd = Math.min(Math.abs(x.s1 - x.s2), 3); if (adv === 1) { pts1 += gd; pts2 -= gd; } else { pts2 += gd; pts1 -= gd; } }
  return { pts1: pts1 * mult, pts2: pts2 * mult, adv, mult };
}

export function buildOwnerContext(feed, st, today) {
  const players = st.players.map(p => p.name);
  const rosters = st.rosters || {};
  const ownerOf = {};
  players.forEach((name, i) => {
    const teams = Array.isArray(rosters) ? (rosters[i] || []) : (rosters[String(i)] || []);
    (teams || []).forEach(t => { if (t) ownerOf[t] = name; });
  });

  const ms = feed.matches.map(normalizeFeedMatch);
  const done = ms.filter(x => x.s1 != null).sort((a, b) => a.date.localeCompare(b.date));
  const totals = Object.fromEntries(players.map(p => [p, 0]));
  const events = Object.fromEntries(players.map(p => [p, []]));
  const h2h = {};

  for (const x of done) {
    const p = matchPoints(x);
    const oa = ownerOf[x.t1], ob = ownerOf[x.t2];
    if (oa) {
      totals[oa] += p.pts1;
      events[oa].push({ date: x.date, res: x.s1 > x.s2 ? 'W' : (x.s1 < x.s2 ? 'L' : 'D'), pts: p.pts1, line: `${x.t1} ${x.s1}-${x.s2} ${x.t2}${ob ? ` (vs ${ob})` : ''}` });
    }
    if (ob) {
      totals[ob] += p.pts2;
      events[ob].push({ date: x.date, res: x.s2 > x.s1 ? 'W' : (x.s2 < x.s1 ? 'L' : 'D'), pts: p.pts2, line: `${x.t2} ${x.s2}-${x.s1} ${x.t1}${oa ? ` (vs ${oa})` : ''}` });
    }
    if (oa && ob && oa !== ob) {
      const k = [oa, ob].sort().join('|');
      h2h[k] = h2h[k] || { draws: 0, wins: {} };
      if (x.s1 === x.s2 && !p.adv) h2h[k].draws++;
      else { const w = (x.s1 > x.s2 || p.adv === 1) ? oa : ob; h2h[k].wins[w] = (h2h[k].wins[w] || 0) + 1; }
    }
  }

  const board = players.map(name => ({ name, pts: totals[name] }))
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
  let lastPts = null, lastRank = 1;
  board.forEach((b, i) => { b.rank = b.pts === lastPts ? lastRank : i + 1; lastPts = b.pts; lastRank = b.rank; });
  const rankOf = Object.fromEntries(board.map(b => [b.name, b.rank]));

  function ownerSummary(name) {
    const ev = events[name] || [];
    const recent = ev.slice(-5);
    const form = recent.map(e => e.res).join('-') || 'no games yet';
    const upcoming = ms.filter(x => x.s1 == null && x.date >= today && (ownerOf[x.t1] === name || ownerOf[x.t2] === name)).slice(0, 4)
      .map(x => {
        const mine = ownerOf[x.t1] === name ? x.t1 : x.t2;
        const their = mine === x.t1 ? x.t2 : x.t1;
        const opp = ownerOf[their];
        return `${x.date}: ${mine} vs ${their}${opp && opp !== name ? ` (vs ${opp})` : ''}${x.round !== 'group' ? ` [${ROUND_NAME[x.round]}]` : ''}`;
      });
    return `${OWNER_META[name]?.emoji || ''} ${name} (${OWNER_META[name]?.nick || ''}) — rank #${rankOf[name]}, ${totals[name]} pts. ` +
      `Form (last ${recent.length || 0}): ${form}. ` +
      (recent.length ? `Recent: ${recent.map(e => `${e.res} ${e.line} (+${e.pts})`).join('; ')}. ` : 'The season hasn\'t started for this owner yet. ') +
      (upcoming.length ? `Upcoming stretch: ${upcoming.join('; ')}.` : 'No upcoming fixtures found.');
  }

  function h2hSummary(a, b) {
    const k = [a, b].sort().join('|');
    const r = h2h[k];
    if (!r) return `Season series ${a} vs ${b}: this is their FIRST head-to-head meeting of the tournament.`;
    const aw = r.wins[a] || 0, bw = r.wins[b] || 0;
    const played = aw + bw + r.draws;
    const lead = aw > bw ? `${a} leads` : bw > aw ? `${b} leads` : 'all square';
    return `Season series ${a} vs ${b} (game ${played + 1} of 12): ${lead} ${Math.max(aw, bw)}-${Math.min(aw, bw)}${r.draws ? ` with ${r.draws} draw(s)` : ''}.`;
  }

  return { players, ownerOf, totals, board, rankOf, ownerSummary, h2hSummary };
}
