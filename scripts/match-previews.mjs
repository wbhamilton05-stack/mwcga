#!/usr/bin/env node
// MWCGA MATCH PREVIEWS — overnight, for every match on today's slate:
//   1. a written briefing page (cheeky MWCGA voice, more technical on players)
//   2. a short Hank & Sal podcast episode
// Outputs: matchday/<slug>.html, podcasts/matches/<slug>.mp3, matchday/index.json
// (the manifest the game app reads to show 📰/🎙️ links on the Schedule tab),
// and match-previews.xml (a second RSS feed just for match previews).
// Idempotent: matches that already have both artifacts are skipped, so re-runs
// and retries are safe. FAIL-SOFT per match: one bad match never kills the rest.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  SITE, GAME_URL, FEED_URL, FIRST_DAY, LAST_DAY,
  TEAMS, ODDS, mapName, flag, roundOf, ROUND_MULT, ROUND_NAME,
  appMatchKey, centralDate, OWNER_META, geminiClient, mdToHtml,
  buildOwnerContext,
} from './league-data.mjs';

const out = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const KEY = process.env.GEMINI_API_KEY;
const today = centralDate(0);

const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  if (!KEY) { console.log('GEMINI_API_KEY not set — nothing to do.'); out('count', '0'); return; }
  if (today < FIRST_DAY || today > LAST_DAY) { console.log(`Outside tournament window (${today}).`); out('count', '0'); return; }

  const [gameRes, feedRes] = await Promise.all([fetch(GAME_URL), fetch(FEED_URL)]);
  if (!gameRes.ok || !feedRes.ok) throw new Error(`fetch failed: game ${gameRes.status}, feed ${feedRes.status}`);
  const st = (await gameRes.json()).state;
  const feed = await feedRes.json();
  const players = st.players.map(p => p.name);
  const rosters = st.rosters || {};
  const ownerOf = {};
  players.forEach((_, i) => {
    const teams = Array.isArray(rosters) ? (rosters[i] || []) : (rosters[String(i)] || []);
    (teams || []).forEach(t => { if (t) ownerOf[t] = players[i]; });
  });

  const OC = buildOwnerContext(feed, st, today);

  const slate = feed.matches.filter(m => m.date === today && TEAMS[mapName(m.team1)] && TEAMS[mapName(m.team2)]);
  if (!slate.length) { console.log(`No matches with resolved teams on ${today}.`); out('count', '0'); return; }
  console.log(`${slate.length} match(es) on the ${today} slate`);

  mkdirSync('matchday', { recursive: true });
  mkdirSync('podcasts/matches', { recursive: true });
  const manifestPath = 'matchday/index.json';
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

  const gem = geminiClient(KEY);
  const models = await gem.models();
  const pick = (prefs, pred) => prefs.find(p => models.includes(p)) || models.find(pred);
  const textModel = pick(['gemini-3.1-flash', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-flash-latest'], m => /^gemini-[\d.]+-flash$/.test(m));
  const ttsModel = pick(['gemini-3.1-flash-tts', 'gemini-3-flash-tts', 'gemini-2.5-flash-tts', 'gemini-2.5-flash-preview-tts'], m => m.includes('tts'));
  console.log(`using text=${textModel}, tts=${ttsModel}`);

  let made = 0;
  for (const m of slate) {
    const t1 = mapName(m.team1), t2 = mapName(m.team2);
    const key = appMatchKey(m);
    const slug = slugify(`${m.date}-${t1}-${t2}`);
    const htmlPath = `matchday/${slug}.html`, mp3Path = `podcasts/matches/${slug}.mp3`;
    if (manifest[key] && existsSync(htmlPath) && existsSync(mp3Path)) { console.log(`skip (exists): ${t1} vs ${t2}`); continue; }
    try {
      const o1 = ownerOf[t1] || null, o2 = ownerOf[t2] || null;
      const round = roundOf(m), mult = ROUND_MULT[round];
      const stake = round === 'group' ? 3 * mult : 6 * mult;
      const sameOwner = o1 && o1 === o2;
      const e1 = o1 ? OWNER_META[o1]?.emoji || '' : '', e2 = o2 ? OWNER_META[o2]?.emoji || '' : '';
      const ctx = `EDITORIAL RULE — THE OWNERS ARE THE FRANCHISES: This league has four owners and the nations are players on their rosters. EVERYTHING is framed owner-first: this match is ${sameOwner ? `a CIVIL WAR inside ${o1}'s empire` : `${o1 || 'Unowned'} vs ${o2 || 'Unowned'}`}, fought on the field by ${t1} and ${t2}. Talk about owner momentum, form, the standings race, and the season series — use the teams and their real players as the HOW, never the headline.

MATCH: ${t1} (${o1 ? `${e1} ${o1}'s squad` : 'unowned'}) vs ${t2} (${o2 ? `${e2} ${o2}'s squad` : 'unowned'}) — ${ROUND_NAME[round]}${mult > 1 ? ` (×${mult} multiplier)` : ''}, ${m.date}. A win pays +${stake} league points to the owner.
TITLE ODDS: ${t1} ${ODDS[t1] || 'n/a'}, ${t2} ${ODDS[t2] || 'n/a'}.

OWNER FORM & CONTEXT (authoritative — weave these narratives in):
${o1 ? OC.ownerSummary(o1) : ''}
${o2 && !sameOwner ? OC.ownerSummary(o2) : ''}
${o1 && o2 && !sameOwner ? OC.h2hSummary(o1, o2) : ''}
LEADERBOARD: ${OC.board.map(b => `#${b.rank} ${b.name} ${b.pts}pts`).join(', ')}.

OWNERS: Will "the Commissioner" (dad), Granddad "the Veteran" (74), Barnes "the Prodigy" (12), Warner "the Young Phenom" (10). Family-friendly; tease about results only.`;

      // 1) Written briefing — cheeky voice, technical depth
      const bj = await gem.call(`models/${textModel}:generateContent`, {
        contents: [{ parts: [{ text: `Write "THE OFFICIAL MWCGA MATCH BRIEFING" for one World Cup 2026 match, in markdown.

${ctx}

VOICE: the MWCGA house style — bombastic, superlative-heavy, "folks", "tremendous", playful jabs at pundits — but this briefing goes DEEPER technically than our daily emails.

STRUCTURE (use these exact markdown headers, with the real owner names/emojis):
# ⚔️ ${sameOwner ? `${e1} ${(o1 || '').toUpperCase()}'S CIVIL WAR` : `${e1} ${(o1 || 'UNOWNED').toUpperCase()} vs ${(o2 || 'UNOWNED').toUpperCase()} ${e2}`} — ${t1} vs ${t2}
## 📖 THE STORYLINE — owner-first: each owner's form, momentum, place in the race, and the season series between them; what THIS game means for the family leaderboard. This is the heart of the briefing.
## 🔬 THE SCOUTING REPORT — "${o1 || 'X'} sends out ${t1}…" / "${o2 || 'Y'} answers with ${t2}…": for EACH squad, key players by name, preferred shape/style, and the one tactical question that decides it — always framed as the owner's assets doing the owner's work
## 📊 BY THE NUMBERS — small markdown table: owner standings & form, season series, title odds, World Cup pedigree
## 🔮 THE VERDICT — confident scoreline + which OWNER walks away happy and what the leaderboard looks like if it lands

RULES: 350-500 words. Use your knowledge of these national teams' real stars and styles; if unsure about a current-squad detail, lean on established stars and team identity — NEVER invent injuries, transfers, or lineups. Family-friendly.` }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 1600 },
      });
      const md = (bj.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
      if (!md) throw new Error('empty briefing');
      const page = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t1} vs ${t2} — MWCGA Match Briefing</title></head>
<body style="margin:0;background:#0a1c4a;padding:14px;">
<div style="max-width:680px;margin:0 auto;border:3px solid #b22234;border-radius:10px;padding:20px;background:#fffdf5;">
<div style="font-family:Arial,sans-serif;color:#0a1c4a;font-weight:900;font-size:13px;letter-spacing:1px;">🇺🇸 MWCGA MATCH BRIEFING · ${m.date} 🇺🇸</div>
${mdToHtml(md)}
<hr style="border:none;border-top:2px solid #ffd700;margin:16px 0;">
<p style="font-family:Arial,sans-serif;font-size:14px;text-align:center;">
<a href="${SITE}/podcasts/matches/${slug}.mp3" style="color:#b22234;font-weight:bold;">🎙️ Listen to this briefing</a> ·
<a href="${SITE}/?game=wcuaw50n22xo" style="color:#b22234;font-weight:bold;">🏆 Back to the league</a></p>
</div></body></html>`;
      writeFileSync(htmlPath, page);

      // 2) Podcast quick-hit
      const sj = await gem.call(`models/${textModel}:generateContent`, {
        contents: [{ parts: [{ text: `Write a SHORT podcast segment (220-320 words of pure dialogue) for MWCGA RADIO previewing ONE match. Hosts: "Hank:" (booming hype-man) and "Sal:" (dry analyst). Every line starts with "Hank:" or "Sal:". No stage directions.

${ctx}

Cover, OWNER-FIRST: open with Hank framing this as ${sameOwner ? `${o1} against himself — a civil war` : `${o1} vs ${o2}`} (the teams are just their players); each owner's form/momentum from the context above; the season series; then Sal's tactical point with two or three real players by name; the points on the line; and a fast scoreline prediction from each host, stated as which OWNER wins. Open with Hank naming the owners first, the teams second; end with both saying "M-W-C-G-A!". Same accuracy rules: real stars only, never invent injuries.` }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1200 },
      });
      const script = (sj.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
      if (!script || !script.includes('Hank:')) throw new Error('empty/unusable script');

      const tj = await gem.call(`models/${ttsModel}:generateContent`, {
        contents: [{ parts: [{ text: `TTS this sports-radio conversation. Hank is energetic and booming; Sal is dry and wry:\n\n${script}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [
            { speaker: 'Hank', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: 'Sal', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          ] } },
        },
      });
      // Long audio comes back CHUNKED across multiple inlineData parts — concat all
      const audioParts = (tj.candidates?.[0]?.content?.parts || []).filter(p => p.inlineData && p.inlineData.data);
      if (!audioParts.length) throw new Error('no audio returned (finishReason: ' + (tj.candidates?.[0]?.finishReason || '?') + ')');
      const rate = Number((audioParts[0].inlineData.mimeType.match(/rate=(\d+)/) || [])[1] || 24000);
      const pcmBuf = Buffer.concat(audioParts.map(p => Buffer.from(p.inlineData.data, 'base64')));
      console.log(`  audio: ${audioParts.length} chunk(s), ~${Math.round(pcmBuf.length / (2 * rate))}s (finishReason: ${tj.candidates?.[0]?.finishReason || '?'})`);
      await pcmToMp3(pcmBuf, rate, mp3Path);

      manifest[key] = {
        html: htmlPath, mp3: mp3Path,
        title: o1 && o2 ? `${e1} ${o1} vs ${o2} ${e2} — ${t1} vs ${t2}` : `${flag(t1)} ${t1} vs ${t2} ${flag(t2)}`,
        date: m.date,
      };
      made++;
      console.log(`✓ ${t1} vs ${t2} → ${htmlPath} + ${mp3Path}`);
      await new Promise(r => setTimeout(r, 2500)); // gentle on free-tier rate limits
    } catch (e) {
      console.error(`✗ ${t1} vs ${t2} failed (continuing): ${e.message}`);
    }
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  buildRss(manifest);
  console.log(`done: ${made} new preview(s); manifest has ${Object.keys(manifest).length}`);
  out('count', String(made));
}

function buildRss(manifest) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const items = Object.values(manifest)
    .filter(e => e.mp3 && existsSync(e.mp3))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(e => `    <item>
      <title>${esc('⚔️ ' + e.title.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim() + ' — Match Preview')}</title>
      <description>MWCGA Radio match preview — scouting, stakes, and a fearless prediction. ${esc(e.date)}.</description>
      <enclosure url="${SITE}/${e.mp3}" length="${statSync(e.mp3).size}" type="audio/mpeg"/>
      <guid isPermaLink="false">mwcga-preview-${esc(e.mp3.split('/').pop().replace('.mp3', ''))}</guid>
      <pubDate>${new Date(e.date + 'T07:30:00Z').toUTCString()}</pubDate>
    </item>`).join('\n');
  writeFileSync('match-previews.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>MWCGA Match Previews</title>
    <link>${SITE}/?game=wcuaw50n22xo</link>
    <language>en-us</language>
    <description>Every 2026 World Cup match previewed by Hank and Sal — scouting reports, family stakes, fearless predictions.</description>
    <itunes:author>The Commissioner</itunes:author>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Sports"/>
${items}
  </channel>
</rss>
`);
}

async function pcmToMp3(pcm, rate, outPath) {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    writeFileSync('episode.pcm', pcm);
    execSync(`ffmpeg -y -loglevel error -f s16le -ar ${rate} -ac 1 -i episode.pcm -b:a 64k "${outPath}"`);
    return;
  } catch (e) { /* fall through to JS encoder */ }
  if (!existsSync('node_modules/@breezystack/lamejs')) {
    execSync('npm install --no-fund --no-audit --no-save @breezystack/lamejs', { stdio: 'inherit' });
  }
  const mod = await import('@breezystack/lamejs');
  const L = mod.default || mod;
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const enc = new L.Mp3Encoder(1, rate, 64);
  const chunks = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const b = enc.encodeBuffer(samples.subarray(i, Math.min(i + 1152, samples.length)));
    if (b.length) chunks.push(Buffer.from(b));
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  writeFileSync(outPath, Buffer.concat(chunks));
}

main().catch(e => { console.error('match-previews failed:', e); process.exit(1); });
