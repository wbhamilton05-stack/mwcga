#!/usr/bin/env node
// MWCGA POSTER DESK — AI match-poster art for the league.
// Two jobs, both fail-soft, both invoked from make-podcast.mjs so the existing
// workflows need ZERO new secrets or YAML:
//   1. nightlyPoster(mode, date) — after the Nightcap briefing is written,
//      paint a cinematic poster of the day's top match (highest multiplier,
//      then biggest upset, then biggest margin), save it under briefings/art/
//      (the publish step already commits briefings/), and inject it into
//      recap.html BEFORE the mail step reads it. Owner-first caption.
//   2. hypeOneShot(date, mode) — a staged scripts/hype-poster.json turns a
//      manual re-dispatch (that day's episode already recorded) into a
//      poster-only run that paints a PRE-match hype poster. Self-disarms once
//      the PNG exists and expires when the staged date passes — same spent
//      one-shot pattern as the bulletin/premiere.
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import {
  GAME_URL, FEED_URL, SITE, ODDS, ROUND_MULT, ROUND_NAME,
  geminiClient, normalizeFeedMatch, matchPoints, buildOwnerContext,
} from './league-data.mjs';

const KEY = process.env.GEMINI_API_KEY;
const impliedPct = f => { const [a, b] = String(f || '').split('/').map(Number); return a && b ? 100 * b / (a + b) : null; };

async function loadLeague(date) {
  const [gameRes, feedRes] = await Promise.all([fetch(GAME_URL), fetch(FEED_URL)]);
  if (!gameRes.ok || !feedRes.ok) throw new Error(`fetch failed: game ${gameRes.status}, feed ${feedRes.status}`);
  const feed = await feedRes.json();
  const st = (await gameRes.json()).state;
  const OC = buildOwnerContext(feed, st, date);
  const ms = feed.matches.map(normalizeFeedMatch);
  // keep venue/kickoff from the raw feed for prompt color (same array order)
  feed.matches.forEach((raw, i) => { ms[i].ground = raw.ground; ms[i].time = raw.time; });
  return { ms, OC };
}

// Winner's title odds vs loser's — >1 means the books had it the other way
function upsetRatio(x) {
  if (x.s1 == null || x.s1 === x.s2) return 0;
  const w = x.s1 > x.s2 ? x.t1 : x.t2, l = x.s1 > x.s2 ? x.t2 : x.t1;
  const wp = impliedPct(ODDS[w]), lp = impliedPct(ODDS[l]);
  return wp && lp ? lp / wp : 0;
}

// The day's top match: knockout multiplier, then upset size, then margin, then
// goals. Only a REAL upset outranks margin — same 4x implied-odds bar the
// briefing uses for its "MASSIVE UPSET" call.
export function pickTopMatch(ms, date, { finishedOnly }) {
  const pool = ms.filter(x => x.date === date && (!finishedOnly || x.s1 != null));
  const bigUpset = x => { const r = upsetRatio(x); return r >= 4 ? r : 0; };
  return pool.sort((a, b) =>
    (ROUND_MULT[b.round] - ROUND_MULT[a.round]) ||
    (bigUpset(b) - bigUpset(a)) ||
    (Math.abs((b.s1 ?? 0) - (b.s2 ?? 0)) - Math.abs((a.s1 ?? 0) - (a.s2 ?? 0))) ||
    (((b.s1 ?? 0) + (b.s2 ?? 0)) - ((a.s1 ?? 0) + (a.s2 ?? 0))))[0] || null;
}

async function pickModels(g) {
  const models = await g.models();
  const pick = (prefs, pred) => prefs.find(p => models.includes(p)) || models.find(pred);
  const textModel = pick(
    ['gemini-3.1-flash', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'],
    m => /^gemini-[\d.]+-flash$/.test(m));
  const imageModel = pick(
    ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview', 'gemini-3-pro-image-preview', 'gemini-2.0-flash-preview-image-generation'],
    m => /^gemini-.*image/.test(m) && !/embed/.test(m));
  if (!textModel || !imageModel) throw new Error(`models not found (text=${textModel}, image=${imageModel})`);
  console.log(`poster: using text=${textModel}, image=${imageModel}`);
  return { textModel, imageModel };
}

function houseArt(kind, m, OC) {
  const o1 = OC.ownerOf[m.t1], o2 = OC.ownerOf[m.t2];
  const scene = `Epic cinematic sports-movie poster: two colossal football titans in the national kit colors of ${m.t1} and ${m.t2} ` +
    (kind === 'hype'
      ? `charging toward each other across a packed, floodlit stadium${m.ground ? ` in ${m.ground}` : ''}, storm clouds and stadium light beams colliding overhead, grass and confetti exploding at the point of impact, `
      : `— the ${m.s1 > m.s2 ? m.t1 : m.t2} side towering victorious in golden light while the other kneels in blue shadow, scarves and confetti raining down, `) +
    `dramatic rim lighting, low hero angle, painterly photoreal detail. The only text anywhere: a small bold "MWCGA" wordmark.`;
  let caption;
  if (kind === 'hype') {
    caption = `${(o1 || m.t1).toUpperCase()} vs ${(o2 || m.t2).toUpperCase()} — ${m.t1} vs ${m.t2}, ${ROUND_NAME[m.round]} · ${m.date}`;
  } else if (m.s1 === m.s2) {
    caption = `ALL SQUARE — ${m.t1} ${m.s1}–${m.s2} ${m.t2}. Nobody blinked.`;
  } else {
    const p = matchPoints(m);
    const [wt, lt, wo, wp] = m.s1 > m.s2 ? [m.t1, m.t2, o1, p.pts1] : [m.t2, m.t1, o2, p.pts2];
    caption = `${(wo || wt).toUpperCase()} OWNS THE NIGHT — ${wt} over ${lt}, ${Math.max(m.s1, m.s2)}–${Math.min(m.s1, m.s2)}${wo ? ` (+${wp})` : ''}`;
  }
  return { scene, caption };
}

// One text call writes both the image prompt and the owner-first caption
async function writeArtDirection(g, textModel, kind, m, OC) {
  const o1 = OC.ownerOf[m.t1], o2 = OC.ownerOf[m.t2];
  const p = m.s1 != null ? matchPoints(m) : null;
  const matchLine = kind === 'hype'
    ? `UPCOMING: ${m.t1}${o1 ? ` (owned by ${o1})` : ''} vs ${m.t2}${o2 ? ` (owned by ${o2})` : ''} — ${ROUND_NAME[m.round]}, ${m.date}${m.ground ? `, at ${m.ground}` : ''}${m.time ? `, kickoff ${m.time}` : ''}`
    : `FINAL: ${m.t1}${o1 ? ` (${o1})` : ''} ${m.s1}–${m.s2} ${m.t2}${o2 ? ` (${o2})` : ''}${m.p1 != null ? ` (${m.p1}–${m.p2} pens)` : ''} — ${ROUND_NAME[m.round]}${p && p.mult > 1 ? ` (×${p.mult} points)` : ''}${upsetRatio(m) >= 4 ? ' — a MASSIVE upset by the title odds' : ''}`;
  const ownerLines = [o1, o2].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
    .map(o => OC.ownerSummary(o)).join('\n') +
    (o1 && o2 && o1 !== o2 ? `\n${OC.h2hSummary(o1, o2)}` : '');
  const prompt = `You are the art director and caption writer for "MWCGA" (Make the World Cup Great Again), a four-person FAMILY World Cup fantasy league. EDITORIAL LAW: the four OWNERS are the franchises — Will "the Commissioner", Granddad "the Veteran", Barnes "the Prodigy" (12), Warner "the Young Phenom" (10). The nations are just players on their rosters. Family-friendly always; tease owners about results, never about who they are.

POSTER SUBJECT (${kind === 'hype' ? 'a match still to come — build the dread and the hype' : "tonight's result — celebrate the winner, twist the knife gently"}):
${matchLine}
${ownerLines}

Return STRICT JSON, nothing else: {"scene": "...", "caption": "..."}
- "scene": 60-110 words of vivid visual art direction for an AI image model — ONE dramatic cinematic movie-poster scene for this matchup. Composition, lighting, atmosphere, the two nations' kit colors and iconography (jerseys, national animals, landmarks, abstract crests)${m.ground ? `, the stadium (${m.ground})` : ''}. ${kind === 'hype' ? 'Both sides equally massive — a collision about to happen.' : 'The winning side visually dominates; the losing side is in shadow.'} NO text in the scene except a small "MWCGA" wordmark. NO real people or recognizable player likenesses — anonymous heroic figures only.
- "caption": ONE punchy line, max 90 characters, that LEADS WITH THE OWNERS' NAMES IN CAPS (e.g. "WILL vs WARNER — the Azteca shakes"). ${kind === 'hype' ? 'Pre-fight poster energy.' : 'Winner-first glory, loser ribbed gently.'}`;
  const thinkCfg = /2\.5/.test(textModel) ? { thinkingConfig: { thinkingBudget: 0 } } : {};
  try {
    const r = await g.call(`models/${textModel}:generateContent`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.95, maxOutputTokens: 4000, responseMimeType: 'application/json', ...thinkCfg },
    });
    const j = JSON.parse((r.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join(''));
    if (typeof j.scene === 'string' && j.scene.length > 40 && typeof j.caption === 'string' && j.caption.length > 5) {
      return { scene: j.scene, caption: j.caption.slice(0, 120) };
    }
    throw new Error('JSON came back the wrong shape');
  } catch (e) {
    console.log('art direction fell back to house style:', e.message);
    return houseArt(kind, m, OC);
  }
}

async function paintPoster(g, imageModel, scene, outPath) {
  const prompt = `${scene}

STYLE: epic cinematic sports-movie poster, dramatic rim lighting, rich saturated color, painterly photoreal detail, portrait composition. League palette accents: deep navy #0a1c4a, red #b22234, gold #ffd700.
HARD RULES: the ONLY text anywhere in the image is the small bold wordmark "MWCGA". No other letters, numbers, logos, or watermarks. No real people's faces or likenesses — players are anonymous heroic figures. Family-friendly.`;
  // Newer image models take IMAGE-only + aspectRatio; older previews want TEXT+IMAGE
  const configs = [
    { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:4' } },
    { responseModalities: ['TEXT', 'IMAGE'] },
  ];
  let lastErr;
  for (const generationConfig of configs) {
    try {
      const r = await g.call(`models/${imageModel}:generateContent`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      });
      const img = (r.candidates?.[0]?.content?.parts || []).find(x => x.inlineData && /^image\//.test(x.inlineData.mimeType || ''));
      if (!img) throw new Error('no image in response (finishReason: ' + (r.candidates?.[0]?.finishReason || '?') + ')');
      const bytes = Buffer.from(img.inlineData.data, 'base64');
      mkdirSync('briefings/art', { recursive: true });
      writeFileSync(outPath, bytes);
      console.log(`poster painted: ${outPath} (${Math.round(bytes.length / 1024)} KB, ${img.inlineData.mimeType})`);
      return;
    } catch (e) {
      lastErr = e;
      if (!/HTTP 400/.test(e.message)) throw e;
      console.log('image config rejected — trying simpler shape:', e.message.slice(0, 160));
    }
  }
  throw lastErr;
}

const sidecarPath = png => png.replace(/\.png$/, '.json');
const writeSidecar = (png, data) => writeFileSync(sidecarPath(png), JSON.stringify(data, null, 1) + '\n');

// Put the poster at the top of the Nightcap email (and the archived briefing,
// since the publish step copies recap.html after this runs).
function injectIntoNightcap(date, caption) {
  if (!existsSync('recap.html')) return false;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const url = `${SITE}/briefings/art/${date}.png`;
  const block = `<div style="margin:4px 0 12px;">
<img src="${url}" alt="Tonight's MWCGA match poster" style="width:100%;border-radius:8px;display:block;border:2px solid #ffd700;">
<div style="font-family:Arial,sans-serif;color:#ffd700;font-weight:bold;font-size:13px;margin-top:6px;text-align:center;">🎨 ${esc(caption)}</div>
</div>
`;
  const html = readFileSync('recap.html', 'utf8');
  const marker = '<div style="background:#fffdf5';
  writeFileSync('recap.html', html.includes(marker) ? html.replace(marker, block + marker) : html + block);
  appendFileSync('recap.txt', `\n\n🎨 TONIGHT'S POSTER: ${url}\n${caption}\n`);
  return true;
}

// ── Job 1: the nightly Nightcap poster ──────────────────────────────────────
export async function nightlyPoster(mode, date) {
  if (mode !== 'night') return;
  if (!KEY) { console.log('poster: no GEMINI_API_KEY — skipping.'); return; }
  if (!existsSync('recap.html')) { console.log('poster: no recap.html this run — skipping.'); return; }
  const file = `briefings/art/${date}.png`;
  let caption;
  if (existsSync(file) && existsSync(sidecarPath(file))) {
    caption = JSON.parse(readFileSync(sidecarPath(file), 'utf8')).caption;
    console.log(`poster: ${file} already painted — reusing.`);
  } else {
    const { ms, OC } = await loadLeague(date);
    const m = pickTopMatch(ms, date, { finishedOnly: true });
    if (!m) { console.log(`poster: no finished matches on ${date} — skipping.`); return; }
    console.log(`poster: tonight's subject is ${m.t1} ${m.s1}–${m.s2} ${m.t2}`);
    const g = geminiClient(KEY);
    const { textModel, imageModel } = await pickModels(g);
    const art = await writeArtDirection(g, textModel, 'recap', m, OC);
    await paintPoster(g, imageModel, art.scene, file);
    writeSidecar(file, { kind: 'recap', date, match: `${m.t1} ${m.s1}–${m.s2} ${m.t2}`, caption: art.caption });
    caption = art.caption;
  }
  injectIntoNightcap(date, caption);
  console.log('poster: injected into recap.html —', caption);
}

// ── Job 2: the staged hype-poster one-shot ──────────────────────────────────
// Fires ONLY when today's episode already exists (a manual re-dispatch), so a
// fresh cron run can never lose its podcast to a stale request. Returns true
// when this run should be poster-only.
export async function hypeOneShot(date, mode) {
  const REQ = 'scripts/hype-poster.json';
  if (!existsSync(REQ)) return false;
  let req;
  try { req = JSON.parse(readFileSync(REQ, 'utf8')); } catch { console.log('poster one-shot: unreadable request — ignoring.'); return false; }
  if (req.date !== date) { console.log(`poster one-shot: staged for ${req.date}, run date is ${date} — ignoring.`); return false; }
  const file = `briefings/art/${req.date}-hype.png`;
  if (existsSync(file)) return false; // already painted — disarmed
  if (!existsSync(`podcasts/${date}-${mode}.mp3`)) { console.log('poster one-shot: no episode for today yet — letting the real show record first.'); return false; }
  if (!KEY) return false;
  console.log(`poster one-shot: HYPE poster for ${req.date} — poster-only run (today's ${mode} episode already exists).`);
  try {
    const { ms, OC } = await loadLeague(date);
    let m = (req.t1 && req.t2) ? ms.find(x => x.date === date && x.t1 === req.t1 && x.t2 === req.t2) : null;
    if (!m) m = pickTopMatch(ms, date, { finishedOnly: false });
    if (!m) throw new Error('no matches found for ' + date);
    console.log(`poster one-shot: subject is ${m.t1} vs ${m.t2}`);
    const g = geminiClient(KEY);
    const { textModel, imageModel } = await pickModels(g);
    const art = await writeArtDirection(g, textModel, 'hype', m, OC);
    await paintPoster(g, imageModel, art.scene, file);
    writeSidecar(file, { kind: 'hype', date, match: `${m.t1} vs ${m.t2}`, caption: art.caption });
    console.log(`HYPE POSTER READY: ${SITE}/${file}`);
    console.log(`CAPTION: ${art.caption}`);
  } catch (e) {
    console.error('hype poster failed (one-shot stays armed for a retry dispatch):', e.message);
  }
  return true; // gates passed — this run was a poster run either way
}
