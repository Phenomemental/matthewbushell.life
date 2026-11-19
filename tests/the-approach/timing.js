// The film's own timings, for setting one build beside another: every told line, narrator line and clip, as lengths and gaps
// that do not depend on when the viewer presses anything. Works on builds before 6.82 too.
//   node timing.js --size phone --url URL
'use strict';
const { open, args } = require('./lib');
(async () => {
  const o = args(), T = await open(o);
  await T.sleep(1200); await T.tap('#go');
  await T.until(() => !document.getElementById('play').hidden, 32000); await T.tap('#play');
  await T.until(() => window.theApproach.state().introDone, 120000); await T.sleep(3200);
  for (let k = 0; k < 7; k++) { await T.tap('#find'); await T.until(() => window.theApproach.state().mLocked, 9000); await T.until(() => !window.theApproach.state().mLocked, 150000, null, 200); if (k < 6) await T.sleep(2800); }
  await T.until(() => window.theApproach.log().end2, 60000);
  const L = await T.log(), s = x => (x / 1000).toFixed(1);
  console.log('opening: ' + L.told.filter(x => /^o/.test(x.id)).map(x => x.id + ' at ' + s(x.t0 - L.play) + ' for ' + s(x.t1 - x.t0)).join(', '));
  let out = [];
  L.nar.forEach((n, i) => { const cs = L.clips.filter(c => c.t0 >= n.t1 && (!L.nar[i + 1] || c.t0 < L.nar[i + 1].t0)); out.push(n.id + ' for ' + s(n.t1 - n.t0) + (cs.length ? '; then after ' + s(cs[0].t0 - n.t1) + ': ' + cs.map((c, j) => c.name + ' ' + s(c.t1 - c.t0) + (j ? ' (gap ' + s(c.t0 - cs[j - 1].t1) + ')' : '')).join(', ') : '')); });
  console.log('tunings: ' + out.join(' | '));
  const e = L.told.filter(x => /^e/.test(x.id));
  console.log('ending: She\'s home, then ' + e.map(x => x.id + ' at ' + s(x.t0 - L.end) + ' for ' + s(x.t1 - x.t0)).join(', ') + ', the card at ' + s(L.end2 - L.end));
  await T.browser.close();
})().catch(e => { console.error(e); process.exit(2); });
