#!/usr/bin/env node
// MWCGA RADIO — turns the day's briefing (recap.txt) into a two-host podcast
// episode using Gemini: one text call writes the show script, one multi-speaker
// TTS call performs it. Outputs podcasts/<date>-<mode>.mp3 (via ffmpeg, present
// on GitHub runners) and GITHUB_OUTPUT file/url. FAIL-SOFT: any error logs and
// exits 0 with empty outputs so the email always still goes out.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const out = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const KEY = process.env.GEMINI_API_KEY;
const SITE = 'https://wbhamilton05-stack.github.io/mwcga';

function centralDate(offsetDays = 0) {
  const fake = process.env.MWCGA_FAKE_TODAY;
  const base = fake ? Date.parse(fake + 'T12:00:00Z') : (Date.now() - 5 * 3600e3);
  return new Date(base + offsetDays * 86400e3).toISOString().slice(0, 10);
}
const MODE = process.env.MWCGA_MODE || (new Date().getUTCHours() < 8 ? 'night' : 'morning');
const DATE = centralDate(0);

async function main() {
  if (!KEY) { console.log('GEMINI_API_KEY not set — skipping podcast.'); out('file', ''); out('url', ''); return; }
  if (!existsSync('recap.txt')) { console.log('no recap.txt — skipping podcast.'); out('file', ''); out('url', ''); return; }
  const briefing = readFileSync('recap.txt', 'utf8');

  const API = 'https://generativelanguage.googleapis.com/v1beta';
  async function gem(path, body) {
    const r = await fetch(`${API}/${path}?key=${KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${path} HTTP ${r.status}: ${(await r.text()).slice(0, 400)}`);
    return r.json();
  }

  // Discover available models so new releases/renames never break the show
  const lr = await fetch(`${API}/models?key=${KEY}&pageSize=200`);
  if (!lr.ok) throw new Error('ListModels HTTP ' + lr.status);
  const models = ((await lr.json()).models || []).map(m => m.name.replace('models/', ''));
  const pick = (prefs, pred) => prefs.find(p => models.includes(p)) || models.find(pred);
  const textModel = pick(
    ['gemini-3.1-flash', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'],
    m => /^gemini-[\d.]+-flash$/.test(m));
  const ttsModel = pick(
    ['gemini-3.1-flash-tts', 'gemini-3-flash-tts', 'gemini-2.5-flash-tts', 'gemini-2.5-flash-preview-tts'],
    m => m.includes('tts'));
  if (!textModel || !ttsModel) throw new Error(`models not found (text=${textModel}, tts=${ttsModel})`);
  console.log(`using text=${textModel}, tts=${ttsModel}`);

  // ── 1. Write the show ──
  const showType = MODE === 'night'
    ? 'the NIGHTCAP — an end-of-day wrap of today\'s results, who got paid, and the standings'
    : 'the MORNING SHOW — a preview of today\'s matches, the family feuds on deck, and the standings';
  const scriptPrompt = `Write a podcast script for "MWCGA RADIO", the official show of a four-person FAMILY World Cup fantasy league (Make the World Cup Great Again). This episode is ${showType}.

THE HOSTS (exactly two speakers, alternate naturally):
Hank: the hype man — bombastic, superlatives, "folks", "tremendous", treats every result like history being made. Loud but warm.
Sal: the analyst — dry, sharp, numbers-first, gently deflates Hank, secretly just as invested.

THE LEAGUE OWNERS (use their names and nicknames often): Will "the Commissioner" (dad), Granddad "the Veteran" (74, golfs daily, ex-salesman), Barnes "the Prodigy" (12, marksman, builds video games), Warner "the Young Phenom" (10, elite game analyst). Family-friendly always; tease owners about results, never about who they are.

SOURCE MATERIAL (today's official briefing — every fact you state must come from it):
${briefing}

RULES:
- 500-650 words of pure dialogue. Every line starts with "Hank:" or "Sal:" — no stage directions, no markdown, no sound effects.
- Open with Hank's cold-open catchphrase welcoming listeners to MWCGA Radio, day/date included.
- Cover: the headline story, results or matchups with owner names and points/stakes, the leaderboard, one playful argument between the hosts, and a sign-off teasing the next episode.
- End with both hosts doing a quick "M-W-C-G-A!" sign-off.`;

  const sj = await gem(`models/${textModel}:generateContent`, {
    contents: [{ parts: [{ text: scriptPrompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 2000 },
  });
  const script = (sj.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  if (!script || !script.includes('Hank:')) throw new Error('script generation came back empty/unusable');
  writeFileSync('podcast-script.txt', script);
  console.log('script written:', script.split(/\s+/).length, 'words');

  // ── 2. Perform it (one multi-speaker TTS call) ──
  const tj = await gem(`models/${ttsModel}:generateContent`, {
    contents: [{ parts: [{ text: `TTS the following sports-radio conversation. Hank sounds energetic and booming; Sal sounds dry and wry:\n\n${script}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Hank', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: 'Sal', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          ],
        },
      },
    },
  });
  const part = (tj.candidates?.[0]?.content?.parts || []).find(p => p.inlineData && p.inlineData.data);
  if (!part) throw new Error('no audio in TTS response');
  const rate = Number((part.inlineData.mimeType.match(/rate=(\d+)/) || [])[1] || 24000);
  writeFileSync('episode.pcm', Buffer.from(part.inlineData.data, 'base64'));

  mkdirSync('podcasts', { recursive: true });
  const mp3 = `podcasts/${DATE}-${MODE}.mp3`;
  execSync(`ffmpeg -y -loglevel error -f s16le -ar ${rate} -ac 1 -i episode.pcm -b:a 64k "${mp3}"`);
  console.log(`episode ready: ${mp3} (${Math.round(require_size(mp3) / 1024)} KB)`);
  out('file', mp3);
  out('url', `${SITE}/${mp3}`);
}

function require_size(p) { return (existsSync(p) ? readFileSync(p).length : 0); }

main().catch(e => { console.error('podcast failed (fail-soft):', e.message); out('file', ''); out('url', ''); });
