// The nine moons (6.8), brought up to date for 6.82: the walk (digits, card, Go in) never opens while the narrator
// or a clip plays, while the red star's own moons are now the film's backdrop.
//   node moons.js --size phone|desktop [--url URL] [--shots DIR]
'use strict';
const { open, args } = require('./lib');
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const o = args(), T = await open(o), P = T.page, W = T.size.width, H = T.size.height;
  const REST = W >= 900 ? 2.5 : 2.35;
  const A = () => T.ev(() => window.theApproach.state());
  const M = () => T.ev(() => window.theApproach.moons());
  const settled = (ms) => T.until(() => { const z = window.theApproach.moons(); return z.inside && !z.tr ? z : null; }, ms || 6000, null, 60);
  const out = (ms) => T.until(() => !window.theApproach.moons().inside, ms || 6000);
  const wheelAt = async (x, y, dy, pred, max) => { for (let i = 0; i < (max || 60); i++) { if (await pred()) return true; await P.mouse.move(x, y); await P.mouse.wheel(0, dy); await T.sleep(100); } return pred(); };
  const zoomTo = async (lo, hi) => { for (let i = 0; i < 80; i++) { const s = await A(); if (s.dist >= lo && s.dist <= hi) return; const h = s.home || [W / 2, H * 0.4]; await P.mouse.move(h[0], h[1]); await P.mouse.wheel(0, s.dist < lo ? 200 : -110); await T.sleep(80); } };
  const dragSky = async dx => { await P.mouse.move(W / 2, H * 0.3); await P.mouse.down(); for (let i = 1; i <= 8; i++) { await P.mouse.move(W / 2 + dx * i / 8, H * 0.3); await T.sleep(30); } await P.mouse.up(); await T.sleep(350); };
  const band = await T.ev(() => { const r = document.getElementById('band').getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2 }; });
  const pad = await T.ev(() => { const b = document.getElementById('band'), r = b.getBoundingClientRect(); /* find the padding the page uses by asking where digit 1 and 9 sit */ return 0; });
  const digit = async k => { // drag along the band until the page says this digit is chosen
    await P.mouse.move(band.l + band.w * 0.5, band.y); await P.mouse.down();
    for (let x = 0.04; x <= 0.97; x += 0.01) { await P.mouse.move(band.l + band.w * x, band.y); if ((await M()).selLive === k) { await P.mouse.move(band.l + band.w * (x + 0.02), band.y); break; } }
    await P.mouse.up(); await T.sleep(1500); return M();
  };
  const front = async k => { const r = await T.ev(() => window.theApproach.ring()); if (!r) return null; const me = r.pts.find(p => p.k === k); const ys = r.pts.map(p => p.y), lo = Math.min(...ys), hi = Math.max(...ys); return me ? { isFront: me.y >= hi - 0.2 * (hi - lo), x: Math.round(me.x), y: Math.round(me.y), lowest: Math.round(hi), highest: Math.round(lo) } : null; };   // the front of the tilted orbit is its near, lower edge

  await T.sleep(1500); await T.tap('#go'); await T.sleep(2500);
  let s = await A();

  // ── zoom in on the red star before the film: its moons open ──
  await wheelAt(s.home[0], s.home[1], -120, async () => (await M()).inside, 70);
  let m = await settled(); await T.sleep(700); m = await M();
  T.ok('zooming in on the red star before the film opens its moons', !!m && m.inside && m.block === 'film:the-approach' && m.focus === '', m && m.block);
  T.ok('nine slots, a moon in each that exists: eight today, the eighth slot empty', m.hits.length === 9 && m.hits.filter(h => h.has).length === 8 && !m.hits.find(h => h.k === 8).has, m.hits.map(h => h.k + (h.has ? '' : '-')).join(' '));
  T.ok('a moon is larger the more it holds', new Set(m.hits.filter(h => h.has).map(h => h.r)).size > 1, m.hits.filter(h => h.has).map(h => h.k + ':' + h.r).join(' '));
  await T.shot('m01-red-star-moons');
  // ── the band's digits spin the orbit ──
  m = await digit(6); let f6 = await front(6);
  T.ok('the dial brings moon 6 round to the front', m.selLive === 6 && f6 && f6.isFront, JSON.stringify(f6));
  m = await digit(3); let f3 = await front(3);
  T.ok('and then moon 3, to the same place', m.selLive === 3 && f3 && f3.isFront && Math.abs(f3.x - f6.x) < 4 && Math.abs(f3.y - f6.y) < 4, JSON.stringify(f3));
  await T.shot('m02-moon-3-in-front');
  m = await digit(6);
  // ── Go in to THE MAKING ──
  await T.tap('#tin'); m = await settled(8000); await T.sleep(1200); m = await M();
  T.ok('Go in to 6: the address reads film:the-approach 6, THE MAKING', m.focus === '6' && /film:the-approach\s*·?\s*6\b/.test(m.addr) && /^THE MAKING/.test(m.line), m.addr + ' | ' + m.line.slice(0, 40));
  T.ok('its own moons stand round it', m.kids.length >= 5 && m.hits.filter(h => h.has).length === m.kids.length, m.kids.join(''));
  await T.shot('m03-inside-the-making');
  m = await digit(5); await T.tap('#tin'); await settled(8000); await T.sleep(1200); m = await M();
  T.ok('going in again reads 6.5, THE RADIO PAGE', m.focus === '6.5' && /6\.5\b/.test(m.addr) && /^THE RADIO PAGE/.test(m.line), m.addr + ' | ' + m.line.slice(0, 40));
  await T.shot('m04-inside-6.5');
  await T.tap('#tup'); await T.sleep(2100); await settled(); m = await M(); const up1 = m.focus;
  await T.tap('#tup'); await T.sleep(2100); await settled(); m = await M(); const up2 = m.focus;
  T.ok('Up twice returns to the star', up1 === '6' && up2 === '' && m.inside, up1 + ' then "' + up2 + '"');
  await T.tap('#tup'); const folded = await out(6000); await T.sleep(800);
  T.ok('a third Up folds the moons away, back to the sky', !!folded && !(await A()).inside);

  // ── another star opens its own moons: a tap, and a tap again ──
  await zoomTo(1.2, 1.9);
  const openNamed = async (name) => {
    for (let i = 0; i < 40; i++) {
      const q = await T.ev(n => { const p = window.theApproach.star(n); if (!p) return null; const e = document.elementFromPoint(p.x, p.y); return e && e.id === 'sky' && p.y > 100 ? p : null; }, name);
      if (q) { await T.tapAt(q.x, q.y); await T.sleep(1700);
        const nm = await T.ev(() => document.getElementById('starcard').hidden ? '' : document.getElementById('sname').textContent);
        if (nm.indexOf(name) === 0) return true; await T.ev(() => document.getElementById('sclose').click()); await zoomTo(1.2, 1.9); }
      await dragSky(60);
    }
    return false;
  };
  const got = await openNamed('spine:ai-inoculation');
  T.ok('a tap on spine:ai-inoculation opens its card', got);
  if (got) { const q = await T.ev(() => window.theApproach.star('spine:ai-inoculation')); await T.tapAt(q.x, q.y); m = await settled(14000); await T.sleep(900); m = await M(); }
  T.ok('a tap again opens its own moons', got && m.inside && m.block === 'spine:ai-inoculation' && m.kids.length > 0, m && (m.block + ' ' + m.kids.join('')));
  await T.shot('m05-another-star');
  for (let i = 0; i < 5 && (await M()).inside; i++) { await T.tap('#tup'); await T.sleep(2000); }
  // ── a block over the read limit ──
  await T.ev(() => document.getElementById('sclose').click()); await zoomTo(0.9, 1.3);
  let big = null, bigOpen = false;
  for (let i = 0; i < 30 && !bigOpen; i++) {
    big = await T.ev(() => window.theApproach.sky().clear.filter(a => a.big && document.elementFromPoint(a.x, a.y) === document.getElementById('sky'))[0] || null);
    if (!big) { await dragSky(70); continue; }
    await T.tapAt(big.x, big.y); await T.sleep(1700);
    const card = await T.ev(() => document.getElementById('starcard').hidden ? null : { name: document.getElementById('sname').textContent, line: document.getElementById('sline').textContent, walk: !document.getElementById('swalk').hidden });
    if (card && card.name.indexOf(big.name) === 0 && card.walk) { await T.tap('#swalk'); m = await settled(20000); bigOpen = !!m; if (bigOpen) { await T.sleep(900); m = await M(); console.log('   large block: ' + card.name + ' — ' + card.line); } }
    if (!bigOpen) { await T.ev(() => document.getElementById('sclose').click()); await zoomTo(0.9, 1.3); await dragSky(70); }
  }
  T.ok('a block over the read limit opens its moons from the lighter reads', bigOpen && m.inside && m.hits.filter(h => h.has).length >= 1, bigOpen ? m.block + ' moons ' + m.kids.join('') : 'none found');
  await T.shot('m06-large-block');
  for (let i = 0; i < 5 && (await M()).inside; i++) { await T.tap('#tup'); await T.sleep(2000); }
  await T.ev(() => document.getElementById('sclose').click());

  // ── while the film plays: the red star's own moons are the backdrop, but the walk never opens ──
  await zoomTo(REST - 0.2, REST + 0.3);
  await T.until(() => !document.getElementById('play').hidden, 30000); await T.tap('#play');
  await T.until(() => window.theApproach.state().introAt >= 1, 40000); await T.sleep(1500);
  s = await A();
  const walkUi = () => T.ev(() => ({ inside: window.theApproach.moons().inside, card: !document.getElementById('mcard').hidden, tin: !document.getElementById('tin').hidden, up: !document.getElementById('tup').hidden, hint: document.getElementById('mhint').textContent }));
  let ui = await walkUi();
  T.ok('while the narrator speaks the red star wears its moons as the backdrop (6.82)', s.intro && s.hs.a >= 0.99 && near(s.dist, 0.36, 0.01));
  T.ok('but the walk is not open: no digits, no card, no Go in, no hint', !ui.inside && !ui.card && !ui.tin && !ui.up && !ui.hint, JSON.stringify(ui));
  await P.mouse.move(s.home[0], s.home[1]); for (let i = 0; i < 6; i++) { await P.mouse.wheel(0, -160); await T.sleep(120); }
  await T.sleep(800); ui = await walkUi(); s = await A();
  T.ok('zooming in while the narrator speaks opens no walk, and the film plays on', !ui.inside && !ui.card && s.intro && !s.stopped, 'dist ' + s.dist);
  const backHome = await T.until(() => Math.abs(window.theApproach.state().dist - 0.36) < 0.01, 12000); s = await A();
  T.ok('and the view comes back to its close rest by itself', !!backHome && s.intro, s.dist);
  await T.tap('#stop'); await T.sleep(300); await T.tap('#skipop'); await T.sleep(3000);
  await T.tap('#find'); await T.until(() => window.theApproach.state().clipOn, 45000); await T.sleep(2000);
  ui = await walkUi(); s = await A();
  T.ok('no walk while a clip plays', s.clipOn && !ui.inside && !ui.card && !ui.tin, JSON.stringify(ui));
  await T.until(() => { const z = window.theApproach.state(); return !z.mLocked && z.lost; }, 90000, null, 150); await T.sleep(3000);
  // the dial's pass through the fiction keeps its distance and shows none
  s = await A(); await P.mouse.move(band.l + s.f * band.w, band.y); await P.mouse.down();
  for (let i = 1; i <= 30; i++) { await P.mouse.move(band.l + (s.f + (0.225 - s.f) * i / 30) * band.w, band.y); await T.sleep(90); }
  await T.sleep(1500); await P.mouse.up(); ui = await walkUi(); s = await A();
  T.ok('the dial\'s pass through a fiction keeps its distance and shows no moons', s.ficOn && !ui.inside && s.hs.a === 0 && s.dist > 0.44, 'dist ' + s.dist);
  await T.shot('m07-fiction-no-moons');
  // the viewer's own zoom opens them in a gap
  await P.mouse.move(band.l + 0.33 * band.w, band.y); await P.mouse.down(); await P.mouse.move(band.l + 0.36 * band.w, band.y, { steps: 4 }); await P.mouse.up(); await T.sleep(2500);
  s = await A(); await wheelAt(W / 2, s.home ? s.home[1] : H * 0.4, -140, async () => (await M()).inside, 70);
  m = await settled(15000);
  T.ok('the viewer\'s own zoom opens moons in a gap', !!m && m.inside, m && m.block);
  await T.shot('m08-moons-in-a-gap');
  for (let i = 0; i < 5 && (await M()).inside; i++) { await T.tap('#tup'); await T.sleep(2000); }
  T.ok('and Up returns a working radio', !(await A()).inside && !(await A()).held);
  T.noErrors(); await T.done();
})().catch(e => { console.error(e); process.exit(2); });
