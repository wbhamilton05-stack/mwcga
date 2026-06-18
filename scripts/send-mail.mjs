#!/usr/bin/env node
// MWCGA mailer — sends recap.html/recap.txt via Gmail SMTP using nodemailer.
// Runs on the workflow's own Node runtime (we control the version), so it is
// immune to GitHub's actions-runtime Node deprecation cycles.
// Expects env: MAIL_USERNAME, MAIL_PASSWORD (Gmail app password),
// MWCGA_RECIPIENTS (comma-separated), MAIL_SUBJECT.
import nodemailer from 'nodemailer';
import { readFileSync, existsSync } from 'node:fs';

const user = process.env.MAIL_USERNAME;
const pass = (process.env.MAIL_PASSWORD || '').replace(/\s+/g, '');
const to = process.env.MWCGA_RECIPIENTS;
const subject = process.env.MAIL_SUBJECT || '🦅 MWCGA Briefing';

if (!user || !pass || !to) {
  console.log('Mail secrets not configured — skipping send (briefing is in the run log).');
  process.exit(0);
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user, pass },
});

let text = readFileSync('recap.txt', 'utf8');
let html = readFileSync('recap.html', 'utf8');

// ── Inline the poster art (the "I'm not seeing them" fix) ───────────────────
// The briefing embeds the poster via its GitHub Pages URL, but the Nightcap
// emails the family seconds after pushing the PNG — before Pages redeploys — so
// the hot-linked <img> 404s at fetch time and Gmail caches the broken state.
// Carry any committed poster INSIDE the email as a CID attachment instead, so it
// renders the moment the email opens regardless of Pages timing. We rewrite only
// the <img src>; recap.txt still carries the plain URL as the "view online"
// fallback. Local files exist in the checkout (the poster step wrote them before
// the publish + mail steps), so we attach straight from disk.
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attachments = [];
const SITE = 'https://wbhamilton05-stack.github.io/mwcga/';
const posterUrls = [...new Set((html.match(/https:\/\/wbhamilton05-stack\.github\.io\/mwcga\/[A-Za-z0-9/_.-]+\.(?:png|jpg|jpeg)/g) || []))];
let embedded = 0;
for (const url of posterUrls) {
  const localPath = url.slice(SITE.length);                  // e.g. briefings/art/2026-06-17.png
  if (!existsSync(localPath)) continue;                       // not in this checkout — leave the hot-link
  const cid = 'poster' + embedded + '@mwcga';
  // swap only the image source (src="url" / 'url' / url), never an <a href>
  const before = html;
  html = html.replace(new RegExp('(src=)(["\']?)' + escRe(url) + '\\2', 'g'), '$1$2cid:' + cid + '$2');
  if (html === before) continue;                             // url present but not as an <img src> — skip
  attachments.push({ filename: localPath.split('/').pop(), path: localPath, cid });
  embedded++;
}
if (embedded) console.log(`Embedded ${embedded} poster image(s) inline (CID) so they render without waiting on Pages.`);

const podcast = process.env.PODCAST_URL;
if (podcast) {
  text += `\n\n🎙️ LISTEN to this briefing — MWCGA Radio: ${podcast}`;
  html += `<div style="max-width:640px;margin:14px auto 0;text-align:center;">
    <a href="${podcast}" style="display:inline-block;background:#b22234;color:#fff;font-family:Arial,sans-serif;font-weight:bold;font-size:16px;padding:12px 22px;border-radius:8px;text-decoration:none;">🎙️ LISTEN: today's MWCGA Radio episode</a>
    <div style="font-family:Arial,sans-serif;font-size:12px;color:#666;margin-top:6px;">Subscribe once in your podcast app: https://wbhamilton05-stack.github.io/mwcga/podcast.xml</div>
  </div>`;
}
await transporter.sendMail({
  from: `MWCGA Daily Briefing <${user}>`,
  to,
  subject,
  text,
  html,
  attachments,
});
console.log(`Email sent to ${to.split(',').length} recipient(s).`);
