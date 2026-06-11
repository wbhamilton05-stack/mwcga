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

await transporter.sendMail({
  from: `MWCGA Daily Briefing <${user}>`,
  to,
  subject,
  text: readFileSync('recap.txt', 'utf8'),
  html: readFileSync('recap.html', 'utf8'),
});
console.log(`Email sent to ${to.split(',').length} recipient(s).`);
