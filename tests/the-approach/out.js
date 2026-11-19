// The way out (6.72): 'Explore the pscale universe' at the foot of the credits, and after the end the universe is the viewer's.
//   node out.js --size phone|desktop [--url URL] [--shots DIR]
// It plays the whole film once to reach the real end, and on the way checks what the retelling (6.9) put between and on the stations:
// the Archive's whispers, the visitor's station, the credits' last words and the kept lives.
// It plays the whole film once to reach the real end. Nothing is written to the beach: any request that is not a read is stopped
// and counted as a failure.
'use strict';
const { open, args } = require('./lib');
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const o = args(); o.sound = true;
  const T = await open(o), P = T.page, W = T.size.width, H = T.size.height;
  const writes = []; await P.context().route('**/*', r => { const q = r.request(); if (!/^(GET|HEAD|OPTIONS)$/.test(q.method())) { writes.push(q.method() + ' ' + q.url()); return r.abort(); } return r.fallback(); });
  const REST = W >= 900 ? 2.5 : 2.35, OUT0 = W >= 900 ? 2.3 : 2.7, OUT1 = W >= 900 ? 2.2 : 2.5;
  const A = () => T.ev(() => window.theApproach.state());
  const C = () => T.ev(() => window.theApproach.credits());
  const pose = () => T.ev(() => { const k = window.theApproach.sky(), s = window.theApproach.state(); return { yaw: k.yaw, dist: k.dist, home: s.home, film: k.film.map(Math.round), centre: s.centre || [innerWidth / 2, innerHeight * 0.4] }; });
  const btn = () => T.ev(() => { const b = document.getElementById('csky'), r = b.getBoundingClientRect(), c = getComputedStyle(b), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const g = getComputedStyle(document.getElementById('credits'), '::after');
    const texts = [].slice.call(document.querySelectorAll('#roll p, #roll h2, #roll a, #roll span')).filter(e => e.offsetParent && e.textContent.trim()).map(e => e.getBoundingClientRect()).filter(q => q.bottom > r.top + 4 && q.top < r.bottom - 4 && q.right > r.left && q.left < r.right).length;
    return { text: b.textContent, l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), h: Math.round(r.height), onTop: top === b, bg: c.backgroundColor, call: b.classList.contains('call'), veil: g.backgroundImage.indexOf('gradient') >= 0 ? parseFloat(g.height) : 0, under: texts, scroll: Math.round(document.getElementById('roll').scrollTop) }; });
  const dragSky = async dx => { await P.mouse.move(W / 2, H * 0.3); await P.mouse.down(); for (let i = 1; i <= 8; i++) { await P.mouse.move(W / 2 + dx * i / 8, H * 0.3); await T.sleep(30); } await P.mouse.up(); await T.sleep(350); };
  const zoomTo = async (lo, hi) => { for (let i = 0; i < 80; i++) { const s = await A(); if (s.dist >= lo && s.dist <= hi) return; await P.mouse.move(W / 2, H * 0.36); await P.mouse.wheel(0, s.dist < lo ? 200 : -110); await T.sleep(80); } };
  const clearStar = fic => T.ev(fic => { const k = window.theApproach.sky(); return (fic ? k.fictions : k.clear).filter(a => document.elementFromPoint(a.x, a.y) === document.getElementById('sky'))[0] || null; }, !!fic);
  const findStar = async fic => { for (let i = 0; i < 16; i++) { const s = await clearStar(fic); if (s) return s; if (!fic && i === 1) await zoomTo(0.9, 1.2); if (!fic && i === 6) await zoomTo(0.45, 0.6); await dragSky(70); } return null; };   // nearer, until single stars stand clear
  const still = async (ms) => { const a = await pose(); await T.sleep(ms); const b = await pose(); const c = b.centre, dA = Math.hypot(a.film[0] - c[0], a.film[1] - c[1]), dB = Math.hypot(b.film[0] - c[0], b.film[1] - c[1]); return { a, b, same: Math.abs(a.dist - b.dist) < 0.004 && !(dB < 24 && dA > 60) }; };   /* nothing pulls the view home: the distance holds and the red star is not brought to the centre (the sky's slow turn may carry it) */
  const begin = async () => { await T.sleep(1300); await T.tap('#go'); await T.sleep(2200); };

  // ── before Play: Explore from the credits leaves the invitation working (check 7) ──
  await begin();
  await T.tap('#credit'); await T.sleep(700);
  let b = await btn();
  T.ok('the credits carry Explore the pscale universe at their foot, at least 48 pixels', b.text === 'Explore the pscale universe' && b.h >= 48 && b.b <= H && b.t > H * 0.75 && b.onTop, JSON.stringify(b));
  T.ok('Close credits stays as it is', await T.ev(() => { const c = document.getElementById('cclose'), r = c.getBoundingClientRect(); return c.textContent === 'Close credits' && r.top < 80 && r.right > innerWidth - 200; }));
  T.ok('there is no second button for the same act (Back to the sky is gone)', await T.ev(() => [].slice.call(document.querySelectorAll('#credits button, #credits a.btn')).filter(e => /sky|explore/i.test(e.textContent)).length === 1 && !/Back to the sky/.test(document.getElementById('credits').textContent)));
  await T.shot('x01-credits-before-play');
  await T.tap('#csky'); await T.sleep(400);
  let c = await C(), s = await A();
  T.ok('Explore before Play closes the credits and gives the sky with its line', !c.open && c.explored && c.hint === 'Tap any star to read its block. The sea-green stars play a film.' && !s.started && !s.held, c.hint);
  await T.shot('x02-explored-before-play');
  const invited = await T.until(() => window.theApproach.state().inviting && !document.getElementById('play').hidden, 32000);
  T.ok('and the invitation carries on', !!invited);
  await T.sleep(300); c = await C();
  // ── Play: the line goes; in the middle of the film, Explore leaves it stopped (check 6) ──
  await T.tap('#play'); await T.sleep(600); c = await C();
  T.ok('the line goes when the film is played', c.hint === '');
  await T.until(() => window.theApproach.state().introAt >= 1, 40000); await T.sleep(2000);
  await T.tap('#credit'); await T.sleep(700); await T.shot('x03-credits-mid-film');
  await T.tap('#csky'); await T.sleep(3200);
  s = await A(); c = await C();
  const stopTxt = () => T.ev(() => document.getElementById('stop').hidden ? '' : document.getElementById('stop').textContent);
  T.ok('Explore from the credits in the middle of the film leaves it stopped, Back to the film in reach', s.stopped && !s.intro && !c.open && (await stopTxt()) === 'Back to the film' && near(s.dist, OUT1, 0.06), 'dist ' + s.dist + ' ' + (await stopTxt()));
  T.ok('with its line', c.hint.length > 20);
  await T.shot('x04-explored-mid-film');
  await T.tap('#stop');
  const dived = await T.until(() => { const z = window.theApproach.state(); return Math.abs(z.dist - 0.36) < 0.01 && z.hs.a > 0.98 && z.intro; }, 5000, null, 60);
  c = await C(); T.ok('Back to the film returns (the dive home), and the line goes', !!dived && c.hint === '');

  // ── on to the real end ──
  await T.tap('#stop'); await T.sleep(300); await T.tap('#skipop'); await T.sleep(3000);
  // between the stations (6.9 check 9): the needle is held clear of every station for a while after the first stop and after the sixth,
  // and what is whispered there is counted. The Archive's four whispers take the place of the others, a little more at every stop.
  const bandBox = await T.ev(() => { const r = document.getElementById('band').getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2 }; });
  const whispers = async (secs) => { const n0 = (await T.log()).heard.length, x = bandBox.l + bandBox.w * 0.993;
    await P.mouse.move(bandBox.l + bandBox.w * 0.97, bandBox.y); await P.mouse.down(); await P.mouse.move(x, bandBox.y, { steps: 5 });
    for (let i = 0; i < secs * 2; i++) { await P.mouse.move(x - (i % 2), bandBox.y); await T.sleep(500); }
    await P.mouse.up(); const h = (await T.log()).heard.slice(n0); return { archive: h.filter(id => /^a\d$/.test(id)).length, others: h.filter(id => /^g\d+$/.test(id)).length }; };
  const between = {};
  for (let k = 0; k < 8; k++) {
    await T.tap('#find');
    if (!(await T.until(() => window.theApproach.state().mLocked, 9000))) { T.ok('the button found the station, stop ' + (k + 1), false); break; }
    await T.until(() => !window.theApproach.state().mLocked, 170000, null, 200);
    if (k < 7) await T.sleep(2800);
    if (k === 0 || k === 2 || k === 5) between[k + 1] = await whispers(k === 2 ? 12 : 21);
  }
  const b1 = between[1] || {}, b3 = between[3] || {}, b6 = between[6] || {};
  T.ok('between the stations after the first stop the whispers are other lives, none the Archive\'s', b1.others >= 4 && b1.archive === 0, JSON.stringify(b1));
  T.ok('after the sixth stop the Archive\'s whispers have taken their place', b6.archive >= 3 && b6.archive > b6.others && b6.archive + b6.others >= 4, JSON.stringify(b6) + ' (after the third stop ' + JSON.stringify(b3) + ')');
  s = await A(); T.ok('the film came to its end', s.done, '');
  await T.until(() => window.theApproach.log().end2, 60000);
  // after the end, before the credits: Find Mara has given way
  await T.sleep(1500);
  let foot = await T.ev(() => ({ find: !document.getElementById('find').hidden, again: (e => e && !e.hidden ? e.textContent : '')(document.getElementById('replay')) }));
  const opened = await T.until(() => window.theApproach.credits().open, 15000);
  T.ok('the credits open by themselves after the end card', !!opened);
  const kept = await T.ev(() => document.getElementById('clives').textContent);
  T.ok('the credits\' kept lives leave out Mara\'s own diary', /Aoife/.test(kept) && /Bríd/.test(kept) && /two men on the ferry/.test(kept) && !/Mara/.test(kept), kept);
  // (1) the button from the credits' first frame to their last
  const roll = []; let rest = null; const t0 = Date.now();
  while (Date.now() - t0 < 240000) { b = await btn(); roll.push(b); if (roll.length === 2) await T.shot('x05-credits-first-frames'); if (roll.length === 60) await T.shot('x06-credits-rolling'); if (b.call) { rest = b; break; } await T.sleep(500); }
  T.ok('the button is in view and can be pressed from the credits\' first frame to their last', !!rest && roll.length > 20 && roll.every(q => q.h >= 48 && q.onTop && q.b <= H && q.l >= 0 && q.r <= W && q.text === 'Explore the pscale universe'), roll.length + ' looks over ' + ((Date.now() - t0) / 1000).toFixed(0) + 's, the roll moving ' + roll[0].scroll + ' to ' + roll[roll.length - 1].scroll);
  T.ok('the roll fades beneath it: a dark veil at the foot, the button solid', roll.every(q => q.veil >= 100 && !/rgba\([^)]*,\s*0(\.\d+)?\)$/.test(q.bg)), 'veil ' + roll[0].veil + 'px, button ' + roll[0].bg);
  await T.sleep(600); await T.shot('x07-credits-at-rest');
  // (2) at rest
  const atRest = await T.ev(() => { const L = document.querySelector('#roll .clast'), r = L.getBoundingClientRect(), roll = document.getElementById('roll'), m = getComputedStyle(L, '::after'), mb = r.bottom - parseFloat(m.bottom) ;
    const others = [].slice.call(roll.querySelectorAll('p, h2, a, input, button, canvas, img')).filter(e => !L.contains(e) && e.offsetParent && e.getBoundingClientRect().height > 0).filter(e => { const q = e.getBoundingClientRect(); return q.bottom > 4 && q.top < innerHeight - 4; }).map(e => (e.textContent || e.tagName).slice(0, 30));
    return { text: L.textContent.replace(/\s+/g, ' ').trim(), top: Math.round(r.top), h: Math.round(r.height), others: others, mark: m.content !== 'none' && parseFloat(m.width) > 8 && m.borderBottomStyle === 'solid', markY: Math.round(mb), more: roll.scrollHeight - roll.scrollTop - roll.clientHeight }; });
  T.ok('at rest the last line stands alone over the sky', atRest.text === 'Keep one of us.' && atRest.others.length === 0 && atRest.h >= H - 2, JSON.stringify({ text: atRest.text, others: atRest.others, h: atRest.h }));
  T.ok('a small mark above the button says there is more beneath, and the button calls', atRest.mark && atRest.markY < rest.t && atRest.markY > rest.t - 60 && rest.call && atRest.more > 100, 'mark at ' + atRest.markY + ', button at ' + rest.t + ', ' + atRest.more + 'px beneath');
  // the sheet and the site's link are reached by scrolling; the reader tools still work (8)
  await T.ev(() => { const r = document.getElementById('roll'), f = r.querySelector('[data-tool="door"] input'); r.scrollTop = f.getBoundingClientRect().top + r.scrollTop - innerHeight * 0.35; }); await T.sleep(500);
  await T.shot('x08-the-sheet');
  // the door in the sheet: a made-up name on the card, the tool's own three words offered, the picks switching. Nothing is sent: 'Come in' is never pressed.
  const fields = P.locator('#roll [data-tool="door"] input.field');
  await fields.nth(0).click(); await P.keyboard.type('Ada', { delay: 20 }); await T.sleep(400);
  const doorNow = () => T.ev(() => { const d = document.querySelector('#roll [data-tool="door"]'), f = d.querySelectorAll('input.field'); return { hand: d.querySelector('.hand').textContent, cardWords: d.querySelector('.words').textContent.trim().split(/\s+/).length, offered: f[1].value.trim().split(/\s+/).filter(Boolean).length, same: d.querySelector('.words').textContent.trim() === f[1].value.trim(), readOnly: f[1].readOnly, picks: [].slice.call(d.querySelectorAll('.pick')).map(p => p.getAttribute('aria-pressed')).join() }; });
  const door = await doorNow();
  await P.locator('#roll [data-tool="door"] .pick').nth(1).click(); await T.sleep(300); const door2 = await doorNow();
  await P.locator('#roll [data-tool="door"] .pick').nth(0).click(); await T.sleep(200); await fields.nth(0).fill(''); const door3 = await doorNow();
  T.ok('the reader tools in the sheet still work (the card takes a name, three words are offered, the picks switch)', door.hand === 'Ada' && door.offered === 3 && door.same && door.picks === 'true,false' && door2.picks === 'false,true' && !door2.readOnly && door2.offered === 0 && door3.picks === 'true,false', JSON.stringify([door, door2, door3]));
  await T.ev(() => { const r = document.getElementById('roll'); r.scrollTop = r.scrollHeight; }); await T.sleep(500);
  const link = await T.ev(() => { const a = document.querySelector('#roll .cways a'), r = a.getBoundingClientRect(), b = document.getElementById('csky').getBoundingClientRect(); return { text: a.textContent, clear: r.bottom <= b.top && r.top > 0, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === a }; });
  T.ok('the site\'s link is reached by scrolling, clear of the button', /Matthew Bushell/.test(link.text) && link.clear && link.top, JSON.stringify(link));
  b = await btn(); T.ok('and the button is still there at the very foot', b.onTop && b.h >= 48);
  await T.shot('x09-foot-of-the-roll');

  // (3) Explore after the end
  await T.shot('x10-just-before-explore');
  await T.tap('#csky'); await T.sleep(120); await T.shot('x11-just-after-explore');
  const p0 = await pose(); await T.sleep(3000); const p1 = await pose(); c = await C(); s = await A();
  T.ok('Explore after the end gives the whole sky from the view the credits were turning over', !c.open && near(p0.dist, OUT0, 0.06), 'dist ' + p0.dist.toFixed(3) + ' as the credits close (the credits\' sky is ' + OUT0 + ')');
  T.ok('then settles a little nearer over 2.6 seconds', near(p1.dist, OUT1, 0.02), p1.dist.toFixed(3));
  T.ok('its line shows above the dial', c.hint === 'Tap any star to read its block. The sea-green stars play a film.' && await T.ev(() => { const e = document.getElementById('xhint'), r = e.getBoundingClientRect(), d = document.getElementById('radio').getBoundingClientRect(); return +getComputedStyle(e).opacity > 0.9 && r.bottom <= d.top + 2 && r.top > 0; }));
  await T.shot('x12-explored-after-the-end');
  // (5) Play the film again stands where Find Mara stood
  foot = await T.ev(() => { const g = id => { const e = document.getElementById(id); return e && !e.hidden ? { t: e.textContent, x: Math.round(e.getBoundingClientRect().left), h: Math.round(e.getBoundingClientRect().height) } : null; }; return { find: g('find'), again: g('replay'), stop: g('stop') }; });
  T.ok('after the end Play the film again stands where Find Mara stood', !foot.find && foot.again && foot.again.t === 'Play the film again' && foot.again.h >= 48, JSON.stringify(foot));
  // (4) nothing pulls the view home
  let q = await still(10000);
  T.ok('after the end, left untouched for ten seconds, the view stays where it was', q.same, 'dist ' + q.a.dist.toFixed(3) + ' -> ' + q.b.dist.toFixed(3) + ', red star ' + q.a.film + ' -> ' + q.b.film);
  await dragSky(90); await zoomTo(1.5, 1.9); await T.sleep(400);
  q = await still(10000);
  T.ok('nor after the viewer has turned and zoomed it', q.same, 'dist ' + q.a.dist.toFixed(3) + ' -> ' + q.b.dist.toFixed(3));
  let star = null, card = '';
  for (let i = 0; i < 4 && !card; i++) {
    star = await findStar(false);
    console.log('   star to tap: ' + JSON.stringify(star) + ' ' + JSON.stringify(await T.ev(() => { const k = window.theApproach.sky(), z = window.theApproach.state(); return { dist: +k.dist.toFixed(2), clear: k.clear.length, inside: z.inside, held: z.held, filmOn: z.filmOn, stopped: z.stopped }; })));
    if (star) await T.tapAt(star.x, star.y); await T.sleep(1800);
    card = await T.ev(() => document.getElementById('starcard').hidden ? '' : document.getElementById('sname').textContent);
    if (!card) await dragSky(60);
  }
  c = await C();
  T.ok('a star opens its card, and the line goes at the first star opened', !!card && c.hint === '', card);
  await T.shot('x13-star-open-after-the-end');
  q = await still(8000);
  T.ok('with a star open the view stays where the viewer left it', q.same, 'dist ' + q.a.dist.toFixed(3) + ' -> ' + q.b.dist.toFixed(3));
  await T.ev(() => document.getElementById('sclose').click()); await zoomTo(REST - 0.25, REST + 0.3);
  let on = false; for (let i = 0; i < 8 && !on; i++) { const f = await findStar(true); if (!f) break; await T.tapAt(f.x, f.y); const k = await T.until(() => !document.getElementById('starcard').hidden && !document.getElementById('sfic').hidden, 4000); if (k) { await T.tap('#sfic'); on = !!(await T.until(() => window.theApproach.state().filmOn, 8000)); } else { await T.ev(() => document.getElementById('sclose').click()); await zoomTo(REST - 0.25, REST + 0.3); await dragSky(80); } }
  await T.until(() => window.theApproach.film().t > 3, 20000);
  foot = await T.ev(() => ({ again: (e => e && !e.hidden)(document.getElementById('replay')), stop: document.getElementById('stop').textContent }));
  T.ok('a sea-green star plays its film after the end', on && /^Stop/.test(foot.stop), foot.stop);
  await T.tap('#stop'); await T.sleep(1200);
  q = await still(6000); s = await A();
  T.ok('and five seconds after it is stopped the view is still there', !s.filmOn && !s.held && q.same, 'dist ' + q.a.dist.toFixed(3) + ' -> ' + q.b.dist.toFixed(3));
  // the dial still carries the kept lives
  const band = await T.ev(() => { const r = document.getElementById('band').getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2 }; });
  await P.mouse.move(band.l + band.w * 0.45, band.y); await P.mouse.down(); await P.mouse.move(band.l + band.w * 0.5, band.y, { steps: 8 }); await T.sleep(3500); await P.mouse.up();
  s = await A(); T.ok('the dial still carries the kept lives', /visitor/.test(s.who) || /visitor/.test(s.cur || ''), s.who + ' / ' + s.cur);
  // the visitor's station (6.9 check 8): ten pips, over and over, and ten digits naming a night in spring still to come
  const vis0 = Date.now(); await P.mouse.down(); await T.sleep(12000); await P.mouse.up();
  const visSay = await T.ev(() => ({ say: document.getElementById('say').textContent, big: document.getElementById('say').classList.contains('big'), who: document.getElementById('who').textContent }));
  const visPips = (await T.ev(() => window.__snd.osc)).filter(x => x.f === 880 && x.t > vis0 - 8000 && x.t < vis0 + 12000), runs = []; visPips.forEach((x, i) => { if (i === 0 || x.t - visPips[i - 1].t > 1000) runs.push(1); else runs[runs.length - 1]++; });
  T.ok('the visitor\'s station carries ten pips, over and over', runs.length >= 3 && runs.slice(1, -1).every(n => n === 10)   /* the first and last runs may be cut by the edges of the listening */, 'runs of ' + runs.join(', '));
  T.ok('and the digits 2049214293, a night in spring, still to come, in place of its old spoken line', visSay.say === '2049214293\na night in spring, still to come' && visSay.big && /1420 MHz/.test(visSay.who) && !(await T.log()).heard.includes('visitor') && !(await T.ev(() => performance.getEntriesByType('resource').some(r => /voices\/visitor\.mp3/.test(r.name)))), JSON.stringify(visSay));
  await T.shot('x14-a-kept-life-after-the-end');
  // (5) it starts the page from its beginning
  await T.ev(() => document.getElementById('sclose').click());
  await Promise.all([P.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => null), T.tap('#replay')]);
  await T.sleep(1500);
  const fresh = await T.ev(() => ({ veil: getComputedStyle(document.getElementById('veil')).display !== 'none', started: window.theApproach.state().started, begun: window.theApproach.state().begun, told: window.theApproach.log().told.length }));
  T.ok('Play the film again starts the page from its beginning', fresh.veil && !fresh.started && !fresh.begun && fresh.told === 0, JSON.stringify(fresh));
  await T.shot('x15-from-the-beginning');
  T.ok('nothing was written to the beach', writes.length === 0, writes.join(' , '));
  T.noErrors(); await T.done();
})().catch(e => { console.error(e); process.exit(2); });
