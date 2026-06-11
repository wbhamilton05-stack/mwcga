#!/usr/bin/env node
// MWCGA mailer — sends recap.html/recap.txt via Gmail SMTP using nodemailer.
// Runs on the workflow's own Node runtime (we control the version), so it is
// immune to GitHub's actions-runtime Node deprecation cycles.
// Expects env: MAIL_USERNAME, MAIL_PASSWORD (Gmail app password),
// MWCGA_RECIPIENTS (comma-separated), MAIL_SUBJECT.
import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';

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
});
console.log(`Email sent to ${to.split(',').length} recipient(s).`);
