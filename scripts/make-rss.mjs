#!/usr/bin/env node
// Rebuilds podcast.xml (MWCGA Radio RSS feed) from whatever episodes exist in
// podcasts/. Family subscribes once to the feed URL; new episodes just appear.
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';

const SITE = 'https://wbhamilton05-stack.github.io/mwcga';
if (!existsSync('podcasts')) { console.log('no podcasts dir — nothing to do'); process.exit(0); }

const eps = readdirSync('podcasts')
  .filter(f => f.endsWith('.mp3'))
  .sort()
  .reverse();

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const items = eps.map(f => {
  const m = f.match(/^(\d{4}-\d{2}-\d{2})-(morning|night|premiere)\.mp3$/);
  if (!m) return '';
  const [, date, mode] = m;
  const nice = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const title = mode === 'premiere' ? `🏆 THE SEASON PREMIERE — The Draft Special` : mode === 'night' ? `🌙 Nightcap — ${nice}` : `☀️ Morning Show — ${nice}`;
  // Publish times: morning ≈ 8:05 AM CT (13:05Z), nightcap ≈ 11:05 PM CT (04:05Z next day UTC)
  const pub = mode === 'premiere'
    ? new Date(Date.parse(date + 'T02:30:00Z') + 86400e3).toUTCString()
    : mode === 'night'
    ? new Date(Date.parse(date + 'T04:05:00Z') + 86400e3).toUTCString()
    : new Date(date + 'T13:05:00Z').toUTCString();
  const size = statSync('podcasts/' + f).size;
  return `    <item>
      <title>${esc(title)}</title>
      <description>MWCGA Radio — the official ${mode === 'night' ? 'end-of-day wrap' : 'morning preview'} of the greatest family World Cup league on Earth. Day-by-day results, standings, and feuds. ${date}.</description>
      <enclosure url="${SITE}/podcasts/${f}" length="${size}" type="audio/mpeg"/>
      <guid isPermaLink="false">mwcga-${date}-${mode}</guid>
      <pubDate>${pub}</pubDate>
    </item>`;
}).filter(Boolean).join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>MWCGA Radio</title>
    <link>${SITE}/?game=wcuaw50n22xo</link>
    <language>en-us</language>
    <description>Make the World Cup Great Again — the official twice-daily show of the Hamilton family World Cup league. Hank and Sal break down every result, every feud, every point. June 11 – July 19, 2026.</description>
    <itunes:author>The Commissioner</itunes:author>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Sports"/>
${items}
  </channel>
</rss>
`;
writeFileSync('podcast.xml', rss);
console.log(`podcast.xml rebuilt with ${eps.length} episode(s)`);

// Briefing archive index — the game UI reads this to offer past briefings
try {
  const briefs = readdirSync('briefings')
    .filter(f => /^\d{4}-\d{2}-\d{2}-(morning|night)\.html$/.test(f))
    .sort().reverse()
    .map(f => {
      const [, date, mode] = f.match(/^(\d{4}-\d{2}-\d{2})-(morning|night)\.html$/);
      return { date, mode, file: 'briefings/' + f, mp3: existsSync(`podcasts/${date}-${mode}.mp3`) ? `podcasts/${date}-${mode}.mp3` : null };
    });
  writeFileSync('briefings/index.json', JSON.stringify(briefs, null, 1));
  console.log(`briefings/index.json rebuilt with ${briefs.length} entr${briefs.length === 1 ? 'y' : 'ies'}`);
} catch (e) { console.log('no briefings dir yet'); }
