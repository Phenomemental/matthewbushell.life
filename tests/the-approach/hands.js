// The viewer's controls (6.6), brought up to date for 6.82 FIVE (the viewer's hands while the view is close on the red star).
//   node hands.js --size phone|desktop [--url URL] [--shots DIR]
'use strict';
const { open, args } = require('./lib');
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const o = args(), T = await open(o), P = T.page, W = T.size.width, H = T.size.height;
  const REST = W >= 900 ? 2.5 : 2.35;
  const A = () => T.ev(() => window.theApproach.state());
  const moons = () => T.ev(() => window.theApproach.moons());
  const wheelTo = async (pred, dy, max) => { for (let i = 0; i < (max || 60); i++) { const s = await A(); if (pred(s)) return s; const h = s.home || [W / 2, H * 0.4]; await P.mouse.move(h[0], h[1]); await P.mouse.wheel(0, dy); await T.sleep(90); } return A(); };
  const zoomOut = () => wheelTo(s => s.dist >= REST - 0.15, 260, 40);
  const zoomMid = async () => { await wheelTo(s => s.dist >= 1.0, 200, 40); return wheelTo(s => s.dist <= 1.15, -120, 40); };   // near enough that single stars stand clear
  const told = async () => (await T.log()).told.map(x => x.id);
  const dragSky = async (dx) => { await P.mouse.move(W / 2, H * 0.3); await P.mouse.down(); for (let i = 1; i <= 8; i++) { await P.mouse.move(W / 2 + dx * i / 8, H * 0.3); await T.sleep(30); } await P.mouse.up(); await T.sleep(300); };
  // a star that stands clear of the page's own furniture, so a tap reaches the sky
  const clearStar = async (fic) => T.ev((fic) => {
    const k = window.theApproach.sky(), list = fic ? k.fictions : k.clear, $ = id => document.getElementById(id);
    const boxes = ['frame', 'words', 'starcard', 'radio', 'credit', 'sound'].map(id => $(id)).filter(e => e && !e.hidden && getComputedStyle(e).display !== 'none').map(e => e.getBoundingClientRect());
    const free = list.filter(a => boxes.every(b => a.x < b.left - 14 || a.x > b.right + 14 || a.y < b.top - 14 || a.y > b.bottom + 14) && document.elementFromPoint(a.x, a.y) === $('sky'));
    return free[0] || null;
  }, !!fic);
  const findStar = async (fic) => { for (let i = 0; i < 14; i++) { const s = await clearStar(fic); if (s) return s; if (!fic && i === 2) await zoomMid(); await dragSky(70); } return null; };
  const cardOpen = () => T.ev(() => { const c = document.getElementById('starcard'); return c.hidden ? null : { name: document.getElementById('sname').textContent, line: document.getElementById('sline').textContent, walk: !document.getElementById('swalk').hidden, fic: !document.getElementById('sfic').hidden }; });
  const btns = () => T.ev(() => { const g = id => { const e = document.getElementById(id); return e.hidden ? null : { t: e.textContent, h: Math.round(e.getBoundingClientRect().height) }; }; return { stop: g('stop'), find: g('find'), skip: g('skipop'), up: g('tup'), play: g('play'), tin: g('tin') }; });

  await T.sleep(1200); await T.tap('#go'); await T.sleep(2500);

  // ── before Play: zooming toward the red star shows its moons growing, then the walk (6.82 check 9) ──
  let s = await A(); const grow = [];
  for (let i = 0; i < 60; i++) { s = await A(); grow.push({ d: s.dist, a: s.hs.a, R: s.hs.R }); if ((await moons()).inside) break; await P.mouse.move(s.home[0], s.home[1]); await P.mouse.wheel(0, -120); await T.sleep(110); if (near(s.dist, 0.5, 0.06)) await T.shot('h01-before-play-zooming-moons'); }
  const seen = grow.filter(g => g.a > 0.05 && g.a < 1), whole = grow.filter(g => g.a >= 1);
  T.ok('before Play, zooming toward the red star shows its moons growing', seen.length >= 2 && whole.length >= 2 && whole[whole.length - 1].R > whole[0].R && grow.find(g => g.a > 0).d <= 0.95, grow.filter(g => g.a > 0).slice(0, 12).map(g => g.d + ':' + g.a + ':' + g.R).join(' '));
  let m = await T.until(() => { const z = window.theApproach.moons(); return z.inside && !z.tr ? z : null; }, 4000);
  T.ok('and coming closer than 0.3 opens the walk', !!m && m.block === 'film:the-approach' && grow[grow.length - 1].d < 0.31, m ? m.block + ' at ' + grow[grow.length - 1].d : 'no walk');
  await T.sleep(500); await T.shot('h02-before-play-walk');
  T.ok('the walk\'s moons: the film\'s own places, the eighth slot empty', !!m && m.kids.join('') === '12345679', m && m.kids.join(''));
  await T.tap('#tup'); await T.until(() => !window.theApproach.moons().inside, 5000); await T.sleep(600);
  await zoomOut();
  s = await A(); T.ok('Up folds the moons away and the sky is the viewer\'s again', !s.inside && !s.started, '');
  await T.until(() => !document.getElementById('play').hidden, 30000);

  // ── Play, then Stop in the opening ──
  await T.tap('#play');
  await T.until(() => window.theApproach.state().introAt >= 1, 40000); await T.sleep(2500);
  let b = await btns(); T.ok('Stop shows in the opening, at least 48 pixels', b.stop && b.stop.t === 'Stop' && b.stop.h >= 48, JSON.stringify(b.stop));
  const lineAt = (await A()).introAt, n0 = (await told()).length;
  await T.tap('#stop'); await T.sleep(2800);
  s = await A(); b = await btns();
  T.ok('Stop in the opening stops the narrator at once', s.stopped && !s.intro && (await told()).length === n0 && s.say === '', '');
  T.ok('the radio goes quiet', s.stG === 0 && s.ghostG === 0, 'static ' + s.stG + ' ghosts ' + s.ghostG);
  T.ok('the button reads Back to the film, with a way to skip the opening', b.stop && b.stop.t === 'Back to the film' && b.skip && b.stop.h >= 48, JSON.stringify(b));
  T.ok('Stop leaves the view where it is, the star and its moons in view (6.82)', near(s.dist, 0.36, 0.01) && s.hs.a >= 0.99, 'dist ' + s.dist + ' moons ' + s.hs.a);
  await T.sleep(3500); s = await A();
  T.ok('and nothing pulls it away while stopped', near(s.dist, 0.36, 0.01) && s.hs.a >= 0.99, s.dist);
  await T.shot('h03-stopped-in-opening');

  // a tap on the star itself opens its card, as before
  await T.tapAt(s.home[0], s.home[1]); await T.sleep(700);
  let c = await cardOpen(); T.ok('a tap on the red star itself opens its card', c && /film:the-approach/.test(c.name) && c.walk, c && c.name);
  await T.tap('#sclose'); await T.sleep(1800);
  // a tap among the moons walks straight in, with no second arrival
  s = await A();
  const tTap = Date.now(); await T.tapAt(Math.round(s.hs.x + 0.8 * s.hs.R), s.hs.y);
  m = await T.until(() => { const z = window.theApproach.moons(); return z.inside && !z.tr ? z : null; }, 5000, null, 40);
  const arrive = (Date.now() - tTap) / 1000;
  T.ok('a tap among the moons opens the walk with no second arrival (0.9 seconds)', !!m && m.block === 'film:the-approach' && arrive < 1.5, arrive.toFixed(2) + 's');
  await T.sleep(400); await T.shot('h04-walk-from-the-moons');
  b = await btns(); T.ok('the walk has Up', !!b.up);
  await T.tap('#tup'); await T.until(() => !window.theApproach.moons().inside, 5000); await T.sleep(500);
  await T.tap('#stop');   // Back to the film
  const tBack = Date.now();
  const home = await T.until(() => { const z = window.theApproach.state(); return Math.abs(z.dist - 0.36) < 0.01 && z.hs.a > 0.98; }, 4000, null, 50);
  T.ok('Up, then Back to the film, returns close on the red star', !!home, ((Date.now() - tBack) / 1000).toFixed(1) + 's');
  await T.sleep(1500); s = await A(); let tl = await told();
  T.ok('and the opening carries on from the line it was stopped on', s.intro && !s.stopped && tl.length === n0 + 1 && tl[tl.length - 1] === 'o' + (lineAt + 1), tl.join(' ') + ' (stopped on o' + (lineAt + 1) + ')');

  // ── while the opening plays: a tap among the moons stops the film first, then walks ──
  await T.sleep(2500); s = await A();
  await T.tapAt(Math.round(s.hs.x - 0.8 * s.hs.R), s.hs.y);
  m = await T.until(() => { const z = window.theApproach.moons(); return z.inside && !z.tr ? z : null; }, 5000, null, 40);
  s = await A(); T.ok('a tap among the moons while the film plays stops it first and opens the walk', !!m && s.stopped && !s.intro, '');
  await T.tap('#tup'); await T.until(() => !window.theApproach.moons().inside, 5000); await T.sleep(600);

  // ── while stopped the universe is the viewer's: a star, its card, its block walked, Up ──
  await zoomMid();
  const y0 = (await T.ev(() => window.theApproach.sky().yaw)); await dragSky(120); const y1 = (await T.ev(() => window.theApproach.sky().yaw));
  T.ok('while stopped, a drag turns the sky', Math.abs(y1 - y0) > 0.3, (y1 - y0).toFixed(2));
  let walked = false, tries = 0, star = null;
  while (!walked && tries++ < 6) {
    star = await findStar(false); if (!star) break;
    await T.tapAt(star.x, star.y);
    c = await T.until(() => { const e = document.getElementById('starcard'); return !e.hidden && !/^Reading/.test(document.getElementById('sline').textContent) ? { name: document.getElementById('sname').textContent, walk: !document.getElementById('swalk').hidden } : null; }, 9000);
    if (tries === 1) { T.ok('a tap on a star opens its card', !!c && c.name.length > 2, c && c.name); await T.shot('h05-star-card-while-stopped'); }
    if (c && c.walk) { await T.tap('#swalk'); m = await T.until(() => { const z = window.theApproach.moons(); return z.inside && !z.tr ? z : null; }, 12000); walked = !!m; }
    if (!walked) { console.log('   (not walked: ' + JSON.stringify(c) + ')'); await T.ev(() => document.getElementById('sclose').click()); await zoomMid(); await dragSky(90); }
  }
  T.ok('Walk this block walks it', walked, m && m.block);
  await T.shot('h06-another-block-walked');
  if (walked) { for (let i = 0; i < 6 && (await moons()).inside; i++) { await T.tap('#tup'); await T.sleep(1900); } }
  s = await A(); b = await btns();
  T.ok('Up out of it returns a working radio', !s.inside && !s.held && b.stop && b.stop.t === 'Back to the film', JSON.stringify({ inside: s.inside, held: s.held }));
  await T.ev(() => document.getElementById('sclose').click());
  await T.tap('#stop'); const tb2 = Date.now();
  const home2 = await T.until(() => { const z = window.theApproach.state(); return Math.abs(z.dist - 0.36) < 0.01 && z.hs.a > 0.98; }, 4000, null, 50);
  T.ok('Back to the film in the opening dives home at once', !!home2 && Date.now() - tb2 < 2600, ((Date.now() - tb2) / 1000).toFixed(1) + 's');
  await T.sleep(1200); s = await A(); T.ok('and the opening continues', s.intro && !s.stopped && (await told()).length === n0 + 2, (await told()).join(' '));

  // ── skip the opening; tune to Mara; Stop in the middle of a clip ──
  await T.tap('#stop'); await T.sleep(400); await T.tap('#skipop'); await T.sleep(3200);
  s = await A(); b = await btns();
  T.ok('Skip the opening ends it: the dial is the viewer\'s and the view is wide', s.introDone && !s.stopped && b.find && near(s.dist, REST, 0.05), s.dist);
  await T.tap('#find'); await T.until(() => window.theApproach.state().mLocked, 9000);
  await T.until(() => window.theApproach.state().clipOn, 40000); await T.sleep(2600);
  b = await btns(); T.ok('Stop shows during a clip, at least 48 pixels', b.stop && b.stop.t === 'Stop' && b.stop.h >= 48);
  await T.tap('#stop'); await T.sleep(900);
  s = await A(); b = await btns();
  T.ok('Stop in the middle of a clip pauses it, its frame and words hidden', s.stopped && s.vidPaused && !s.frameOn && s.say === '' && !s.mLocked, '');
  T.ok('the button reads Back to the film and the dial stays in view', b.stop.t === 'Back to the film' && b.find && (await T.ev(() => +getComputedStyle(document.getElementById('band')).opacity)) > 0.95);
  T.ok('Stop leaves the view where it is, on the red star with its moons', near(s.dist, 0.36, 0.02) && s.hs.a > 0.9, 'dist ' + s.dist + ' moons ' + s.hs.a);
  await T.shot('h07-stopped-mid-clip');

  // ── a block film, stopped half way; nothing freezes ──
  const playFiction = async () => {
    await zoomOut();
    for (let i = 0; i < 8; i++) {
      const f = await findStar(true); if (!f) return false;
      await T.tapAt(f.x, f.y);
      const k = await T.until(() => !document.getElementById('starcard').hidden && !document.getElementById('sfic').hidden, 4000);
      if (k) { await T.tap('#sfic'); return !!(await T.until(() => window.theApproach.state().filmOn, 8000)); }
      await T.ev(() => document.getElementById('sclose').click()); await zoomOut(); await dragSky(80);
    }
    return false;
  };
  let on = await playFiction();
  T.ok('Play its film plays a block film from its sea-green star', on);
  await T.until(() => window.theApproach.film().t > 4, 20000); await T.shot('h08-block-film-playing');
  let fm = await T.ev(() => window.theApproach.film()); b = await btns();
  T.ok('while it plays it shows its own Stop', !fm.paused && b.stop && /^Stop/.test(b.stop.t) && b.stop.h >= 48, JSON.stringify(b.stop) + ' at ' + fm.t.toFixed(1) + 's');
  await T.tap('#stop'); await T.sleep(1200);
  s = await A(); b = await btns();
  T.ok('stopping it half way clears the held state', !s.filmOn && !s.held && b.stop.t === 'Back to the film', JSON.stringify({ filmOn: s.filmOn, held: s.held }));
  const band = await T.ev(() => { const r = document.getElementById('band').getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2 }; });
  const f0 = s.f; await P.mouse.move(band.l + band.w * 0.7, band.y); await P.mouse.down(); await P.mouse.move(band.l + band.w * 0.8, band.y, { steps: 6 }); await P.mouse.up(); await T.sleep(300);
  s = await A(); T.ok('the dial can be dragged', near(s.f, 0.8, 0.02) && s.f !== f0, s.f);
  const sk0 = (await T.ev(() => window.theApproach.sky().yaw)); await dragSky(100); const sk1 = (await T.ev(() => window.theApproach.sky().yaw));
  T.ok('the sky turns', Math.abs(sk1 - sk0) > 0.25);
  await zoomMid(); star = await findStar(false); if (star) { await T.tapAt(star.x, star.y); await T.sleep(900); }
  T.ok('stars can be tapped', !!(await cardOpen()));
  await T.ev(() => document.getElementById('sclose').click());
  await T.tap('#find'); await T.sleep(2500); s = await A();
  T.ok('Find Mara works (the needle sweeps to her place)', near(s.f, 0.445, 0.01), s.f);
  const nar0 = (await T.log()).nar.length;
  if ((await A()).stopped) await T.tap('#stop');
  const re = await T.until(() => window.theApproach.state().mLocked, 9000);
  await T.sleep(1200); s = await A(); const L1 = await T.log();
  T.ok('Back to the film restarts the tuning that was stopped', !!re && !s.stopped && L1.nar.length === nar0 + 1 && L1.nar[L1.nar.length - 1].id === 'r1' && s.frameOn, L1.nar.map(n => n.id).join(' '));
  T.ok('the radio\'s sound comes back', s.ac === 'running' && near(s.dist, 0.36, 0.03), s.ac + ' dist ' + s.dist);
  await T.until(() => window.theApproach.state().clipOn, 40000); await T.sleep(2200);
  s = await A(); T.ok('and it plays on into its clip', s.clipOn && !s.vidPaused && s.frameOn);

  // ── a star tapped while a clip is playing ──
  star = null; for (let i = 0; i < 40 && !star; i++) { star = await clearStar(false); if (!star) await T.sleep(250); }
  if (!star) { T.ok('a star stands clear of the picture to be tapped', false); } else {
    await T.tapAt(star.x, star.y); await T.sleep(1000);
    s = await A(); c = await cardOpen();
    T.ok('a star tapped while a clip plays stops the film and opens its card', s.stopped && s.vidPaused && !s.frameOn && !!c, c && c.name);
    await T.shot('h09-star-tapped-during-clip');
    await T.ev(() => document.getElementById('sclose').click());
  }
  // ── a block film to its natural end, and the same recovery ──
  on = await playFiction(); T.ok('a block film plays again', on);
  const ended = await T.until(() => !window.theApproach.state().filmOn, 420000, null, 500);
  await T.sleep(1000); s = await A(); b = await btns();
  T.ok('a block film left to end by itself returns everything', !!ended && !s.held && !s.filmOn && b.stop && b.stop.t === 'Back to the film', JSON.stringify({ held: s.held, filmOn: s.filmOn, btn: b.stop }));
  await P.mouse.move(band.l + band.w * 0.5, band.y); await P.mouse.down(); await P.mouse.move(band.l + band.w * 0.6, band.y, { steps: 6 }); await P.mouse.up(); await T.sleep(300);
  s = await A(); T.ok('the dial can be dragged after it', near(s.f, 0.6, 0.02), s.f);
  await T.tap('#stop'); const re2 = await T.until(() => window.theApproach.state().mLocked, 9000);
  T.ok('Back to the film finds the tuning again', !!re2);
  await T.sleep(1500); await T.shot('h10-back-in-the-film');

  // ── Credits and Sound keep working ──
  const snd0 = await T.ev(() => document.getElementById('sound').textContent); await T.tap('#sound'); const snd1 = await T.ev(() => document.getElementById('sound').textContent); await T.tap('#sound');
  T.ok('Sound works', snd0 === 'Sound: on' && snd1 === 'Sound: off');
  await T.tap('#credit'); await T.sleep(800); const co = await T.ev(() => window.theApproach.credits().open); await T.shot('h11-credits-mid-film');
  await T.tap('#cclose'); await T.sleep(500); const cc = await T.ev(() => window.theApproach.credits().open);
  T.ok('Credits open and close', co && !cc);
  T.noErrors(); await T.done();
})().catch(e => { console.error(e); process.exit(2); });
