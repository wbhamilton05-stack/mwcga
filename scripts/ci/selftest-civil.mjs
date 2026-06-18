// Civil War Bounty self-test (house rule, ratified 2026-06-17) — the league-data
// (email/podcast) scoring path. The base selftest.mjs covers group GD / KO
// multipliers / pens but NOT the same-owner-KO side-bet; this closes that gap so
// the bounty scoring is executable-verified before it can fire (first possible
// civil-war match is a knockout, ≥ 2026-06-28).
//
// Rule: a KO match with the SAME owner on both sides REPLACES normal scoring —
// owner predicts the winner; correct → 3×mult, wrong → 1×mult, paid to whichever
// team actually advanced (the owner owns both), loser 0. Unpicked → default to the
// favorite by locked title odds. Mirrors the app's scoreMatch() (index.html).
import { matchPoints, civilFavorite } from '../league-data.mjs';

let pass = 0, fail = 0;
const eq = (got, want, name) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; }
  else { fail++; console.log(`  ✗ ${name}\n      got  ${g}\n      want ${w}`); }
};
const pts = (x) => { const r = matchPoints(x); return { pts1: r.pts1, pts2: r.pts2 }; };

// Default-to-favorite by the locked draft-night odds (higher implied chance wins).
eq(civilFavorite('Brazil', 'Canada'), 'Brazil', 'favorite: Brazil(8/1) > Canada(150/1)');
eq(civilFavorite('Canada', 'Brazil'), 'Brazil', 'favorite is order-independent');
eq(civilFavorite('France', 'Spain'),  'Spain',  'favorite: Spain(9/2) > France(6/1)');

// The side-bet REPLACES normal KO scoring (3×mult / 1×mult), paid to the advancer.
eq(pts({ round: 'qf', t1: 'Brazil', t2: 'Canada', s1: 2, s2: 1, civil: 'Brazil' }), { pts1: 15, pts2: 0 }, 'QF correct → 3×5=15 to winner');
eq(pts({ round: 'qf', t1: 'Brazil', t2: 'Canada', s1: 1, s2: 2, civil: 'Brazil' }), { pts1: 0, pts2: 5 },  'QF wrong → 1×5=5 to the team that advanced');
eq(pts({ round: 'final', t1: 'Spain', t2: 'France', s1: 1, s2: 1, p1: 4, p2: 2, civil: 'Spain' }),  { pts1: 39, pts2: 0 }, 'Final on pens, correct → 3×13=39');
eq(pts({ round: 'final', t1: 'Spain', t2: 'France', s1: 1, s2: 1, p1: 4, p2: 2, civil: 'France' }), { pts1: 13, pts2: 0 }, 'Final on pens, wrong → 1×13=13 to advancer');

// Control: a non-civil match must score exactly as before (sacred scoring intact).
eq(pts({ round: 'qf', t1: 'Brazil', t2: 'Canada', s1: 2, s2: 1 }),    { pts1: 30, pts2: 0 },  'non-civil QF win → 6×5=30 (unchanged)');
eq(pts({ round: 'group', t1: 'Brazil', t2: 'Canada', s1: 3, s2: 0 }), { pts1: 6, pts2: -3 },  'non-civil group 3-0 → +6/−3 GD bonus (unchanged)');

// NaN guard — points must always be finite.
for (const x of [
  { round: 'qf', t1: 'Brazil', t2: 'Canada', s1: 2, s2: 1, civil: 'Brazil' },
  { round: 'final', t1: 'Spain', t2: 'France', s1: 1, s2: 1, p1: 4, p2: 2, civil: 'France' },
]) {
  const r = matchPoints(x);
  if (!Number.isFinite(r.pts1) || !Number.isFinite(r.pts2)) { fail++; console.log(`  ✗ NaN in ${JSON.stringify(x)} → ${JSON.stringify(r)}`); }
  else pass++;
}

console.log(`civil-war self-test: ${pass}/${pass + fail} passed ${fail ? '✗' : '✓'}`);
process.exit(fail ? 1 : 0);
