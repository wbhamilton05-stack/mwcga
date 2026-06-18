// ============================================================================
//  MWCGA · scripts/ci/selftest.mjs — executable scoring spec (CI gate #4)
// ----------------------------------------------------------------------------
//  Runs the scoring engine against the locked house rules and asserts exact
//  point outputs. This catches the class of bug that READING misses — the NFL
//  Family League build shipped a 100%-NaN scoring regression that code review
//  never saw and an executable self-test caught instantly (0/10 → 23/23).
//
//  Target: `matchPoints` in league-data.mjs (the email/podcast scoring path),
//  which mirrors the app's `scoreMatch`. The `league-data.mjs` drift check
//  (separate gate, deferred) keeps that mirror honest with index.html.
//
//  House rules under test (locked 2026-06-17 — see memory `mwcga-scoring-rules`):
//   • Group:    win 3 / draw 1 / loss 0  +  goal-diff bonus ±min(margin,3)   (×mult, group=1)
//   • Knockout: win = 6 (win 3 + advance 3) × ROUND_MULT;  loser 0;  no GD bonus
//   • Penalty shootout winner = FULL win (6×mult), loser 0  (NOT draw+advance = 4×)
//   • ROUND_MULT: group 1, r32 2, r16 3, qf 5, sf 8, third 5, final 13  (Fibonacci ladder)
//
//  Exit non-zero on any failure so CI goes red.
// ============================================================================
import { matchPoints, ROUND_MULT } from '../league-data.mjs';

let pass = 0, fail = 0;
const cases = [];
const C = (label, x, e1, e2) => cases.push([label, x, e1, e2]); // expect pts1, pts2

// ── Group stage: W/D/L + goal-differential bonus (capped ±3) ──
C('group 3-0  win + GD3',         { s1: 3, s2: 0, round: 'group' },  6, -3);
C('group 2-0  win + GD2',         { s1: 2, s2: 0, round: 'group' },  5, -2);
C('group 1-0  win + GD1',         { s1: 1, s2: 0, round: 'group' },  4, -1);
C('group 2-2  draw',              { s1: 2, s2: 2, round: 'group' },  1,  1);
C('group 0-0  draw',              { s1: 0, s2: 0, round: 'group' },  1,  1);
C('group 5-0  GD capped at 3',    { s1: 5, s2: 0, round: 'group' },  6, -3);
C('group 1-7  loss + GD capped',  { s1: 1, s2: 7, round: 'group' }, -3,  6);

// ── Knockout: 6×mult win, loser 0, no goal-diff bonus ──
C('r32   2-0  6×2',   { s1: 2, s2: 0, round: 'r32' },   12, 0);
C('r16   1-0  6×3',   { s1: 1, s2: 0, round: 'r16' },   18, 0);
C('qf    3-1  6×5',   { s1: 3, s2: 1, round: 'qf' },    30, 0);
C('sf    2-1  6×8',   { s1: 2, s2: 1, round: 'sf' },    48, 0);
C('third 2-1  6×5',   { s1: 2, s2: 1, round: 'third' }, 30, 0);
C('final 1-0  6×13',  { s1: 1, s2: 0, round: 'final' }, 78, 0);

// ── Penalty shootout = FULL win (house rule 2026-06-17) ──
C('final pens 1-1 (4-2) → 78/0',          { s1: 1, s2: 1, p1: 4, p2: 2, round: 'final' }, 78, 0);
C('r32 pens 0-0 (3-5) → 0/12',            { s1: 0, s2: 0, p1: 3, p2: 5, round: 'r32' },   0, 12);
C('qf pens equal 1-1 (3-3) → no advance', { s1: 1, s2: 1, p1: 3, p2: 3, round: 'qf' },    5, 5);

for (const [label, x, e1, e2] of cases) {
  const r = matchPoints(x);
  const ok = r && Number.isFinite(r.pts1) && Number.isFinite(r.pts2) && r.pts1 === e1 && r.pts2 === e2;
  if (ok) pass++;
  else { fail++; console.log(`✗ ${label}  → got ${r ? `${r.pts1}/${r.pts2}` : 'null'}, expected ${e1}/${e2}`); }
}

// ROUND_MULT ladder sanity
for (const [k, v] of Object.entries({ group: 1, r32: 2, r16: 3, qf: 5, sf: 8, third: 5, final: 13 })) {
  if (ROUND_MULT[k] === v) pass++;
  else { fail++; console.log(`✗ ROUND_MULT[${k}] = ${ROUND_MULT[k]}, expected ${v}`); }
}

const total = pass + fail;
console.log(`\nscoring self-test: ${pass}/${total} passed${fail ? ` — ${fail} FAILED` : ' ✓'}`);
process.exit(fail ? 1 : 0);
