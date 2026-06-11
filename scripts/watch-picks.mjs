#!/usr/bin/env node
// ============================================================================
//  MWCGA · watch-picks.mjs  — DRAFT TRIPWIRE
// ----------------------------------------------------------------------------
//  Reads the cloud game and compares its pick count to the highest count we've
//  ever recorded (a "high-water mark" committed to the repo). If the cloud ever
//  shows FEWER picks than the high-water mark, that's a sign the draft was
//  partially or fully wiped (the 2026-06-11 incident) — so we email an alert.
//
//  Otherwise it silently records the (equal-or-higher) count and exits. The
//  high-water mark only ever goes up, so a legitimate full draft won't keep
//  alerting; only a regression does.
//
//  Reuses the existing briefing mail secrets — nothing new to configure.
//  Env: MAIL_USERNAME, MAIL_PASSWORD (Gmail app password), MWCGA_RECIPIENTS.
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const GAME_URL = 'https://mwcga-c2e5e-default-rtdb.firebaseio.com/games/wcuaw50n22xo.json';
const STATE_FILE = '.mwcga-pickwatch.json';

function countPicks(rosters) {
  if (!rosters) return 0;
  const lists = Array.isArray(rosters) ? rosters : Object.values(rosters);
  return lists.reduce((n, r) => n + (Array.isArray(r) ? r.filter(Boolean).length : 0), 0);
}

async function main() {
  const res = await fetch(GAME_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`cloud HTTP ${res.status}`);
  const blob = (await res.json()) || {};
  const st = blob.state || {};
  const picks = countPicks(st.rosters);
  const idx = typeof st.draftPickIdx === 'number' ? st.draftPickIdx : 0;
  const players = (st.players || []).length;
  const now = new Date().toISOString();

  let mark = { highPicks: 0, highIdx: 0, recordedAt: null };
  if (existsSync(STATE_FILE)) {
    try { mark = { ...mark, ...JSON.parse(readFileSync(STATE_FILE, 'utf8')) }; } catch (e) {}
  }

  console.log(`cloud: ${picks} picks, draftPickIdx ${idx}, ${players} players.`);
  console.log(`high-water mark: ${mark.highPicks} picks (recorded ${mark.recordedAt || 'never'}).`);

  const regressed = picks < mark.highPicks || idx < (mark.highIdx || 0);

  if (regressed) {
    console.log(`⚠ REGRESSION: cloud has ${picks} picks but we've seen ${mark.highPicks}. Alerting.`);
    await alert({ picks, idx, players, mark, now });
    // Do NOT lower the high-water mark — keep alerting until it's restored.
    console.log('alert=1');
    return;
  }

  // Healthy: advance the high-water mark if this is a new peak.
  if (picks > mark.highPicks || idx > (mark.highIdx || 0)) {
    const next = { highPicks: Math.max(picks, mark.highPicks), highIdx: Math.max(idx, mark.highIdx || 0), recordedAt: now };
    writeFileSync(STATE_FILE, JSON.stringify(next, null, 2) + '\n');
    console.log(`high-water mark raised to ${next.highPicks} picks.`);
  } else {
    console.log('No change. All good.');
  }
  console.log('alert=0');
}

async function alert({ picks, idx, players, mark, now }) {
  const user = process.env.MAIL_USERNAME;
  const pass = (process.env.MAIL_PASSWORD || '').replace(/\s+/g, '');
  const to = process.env.MWCGA_RECIPIENTS;
  if (!user || !pass || !to) {
    console.log('Mail secrets not configured — alert is in the run log only.');
    return;
  }
  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass },
  });

  const subject = `⚠️ MWCGA ALERT: draft picks dropped (${picks} now, was ${mark.highPicks})`;
  const body =
`MWCGA draft tripwire fired.

The cloud game currently shows ${picks} picks (draftPickIdx ${idx}, ${players} players),
but the highest we'd recorded was ${mark.highPicks} picks (set ${mark.recordedAt}).

That drop usually means a device pushed a stale/empty board over the real draft.

WHAT TO DO:
1) Find a device that STILL shows the full draft (don't reload it).
2) Open the app → Settings → tap "⬆️ Push my board" to restore everyone.
3) If no device has it, reply to this email and we'll restore from backup.

Checked at ${now}.
Game: https://wbhamilton05-stack.github.io/mwcga/?game=wcuaw50n22xo`;

  await transporter.sendMail({
    from: `MWCGA Tripwire <${user}>`,
    to,
    subject,
    text: body,
  });
  console.log(`Alert emailed to ${to.split(',').length} recipient(s).`);
}

main().catch(err => { console.error('watch-picks failed:', err.message); process.exit(1); });
