// The uninterrupted film, Begin to the credits: the retelling (film:the-approach 1.7 and 6.9: eight stops, fifteen clips, the new opening
// and ending), with the checks of 6.82 (the film begins in the red star) and of 6.73 (Begin draws you in).
//   node film.js --size phone|desktop [--url URL] [--shots DIR]
// The first tuning is found by dragging the needle slowly (6.82 check 4); the others by the button ('Find Mara', then 'Find the numbers').
'use strict';
const { open, args, STORY, sundial } = require('./lib');
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const o = args(); o.sound = true;
  const T = await open(o), P = T.page, W = T.size.width, H = T.size.height;
  const REST = W >= 900 ? 2.5 : 2.35;

  // a sampler inside the page, ten times a second
  await T.ev(() => {
    const $ = id => document.getElementById(id), R = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
    window.__S = [];
    // how bright a strip of open sky is (a tenth of the height, below the middle), and the warm light of the ending: what has brightened near the red star
    const sky = $('sky'), tmp = document.createElement('canvas'), tg = tmp.getContext('2d', { willReadFrequently: true });
    const strip = () => { const k = sky.width / sky.clientWidth, y = Math.round(sky.clientHeight * 0.6 * k), h = Math.round(sky.clientHeight * 0.1 * k); tmp.width = 200; tmp.height = 12; tg.drawImage(sky, 0, y, sky.width, h, 0, 0, 200, 12); const d = tg.getImageData(0, 0, 200, 12).data; let a = 0; for (let i = 0; i < d.length; i += 4) a += (d[i] + d[i + 1] + d[i + 2]) / 3; return +(a / (d.length / 4)).toFixed(1); };
    // the sky in squares sixteen pixels wide, each its mean brightness: a single star crossing a square barely moves it, a new light does
    const big = document.createElement('canvas'), bg = big.getContext('2d', { willReadFrequently: true }), CELL = 16; window.__L = {};
    window.__grab = name => { const w = Math.round(sky.clientWidth / CELL), h = Math.round(sky.clientHeight / CELL); big.width = w; big.height = h; bg.imageSmoothingQuality = 'high'; bg.drawImage(sky, 0, 0, sky.width, sky.height, 0, 0, w, h); const d = bg.getImageData(0, 0, w, h).data, L = new Uint8Array(w * h); for (let i = 0; i < L.length; i++) L[i] = Math.min(d[4 * i], d[4 * i + 1]); window.__L[name] = { w: w, L: L }; };
    // the square within rad of (hx, hy) that has brightened most from frame a to frame b, and by how much (of 255); or, given a square, how much that one has
    window.__rise = (a, b, hx, hy, rad, at) => { const A = window.__L[a], B = window.__L[b]; let best = { by: -999, x: 0, y: 0, i: -1 }; for (let i = 0; i < A.L.length; i++) { const x = CELL * (i % A.w) + CELL / 2, y = CELL * Math.floor(i / A.w) + CELL / 2; if (at >= 0 ? i !== at : Math.hypot(x - hx, y - hy) > rad) continue; if (B.L[i] - A.L[i] > best.by) best = { by: B.L[i] - A.L[i], x: x, y: y, i: i }; } return best; };
    let tick = 0;
    window.__sampler = setInterval(() => {
      const s = window.theApproach.state(), mk = $('mmark'), us = [].slice.call(document.querySelectorAll('#band u'));
      window.__S.push({ t: Date.now(), intro: s.intro, introDone: s.introDone, dist: s.dist, hs: s.hs, frameOn: s.frameOn, lost: s.lost, mLocked: s.mLocked, pi: s.pi, heard: s.heard,
        done: s.done, showTom: s.showTom, clipOn: s.clipOn, say: $('say').textContent, read: $('read').textContent, who: $('who').textContent, findTxt: $('find').textContent, dots: $('dots').children.length,
        mark: mk ? +getComputedStyle(mk).opacity : 0, markStrong: !!mk && mk.classList.contains('strong'), markW: mk ? Math.round(mk.getBoundingClientRect().width) : 0,
        all: $('band').classList.contains('all'), lit: us.length ? Math.min.apply(null, us.map(u => Math.round(u.getBoundingClientRect().height))) : 0, lives: us.length,
        sky: (s.showTom || s.done) && tick++ % 5 === 0 ? strip() : null, clip: (document.getElementById('v').src.match(/clips\/(\w+)\.mp4/) || [])[1] || '', stopped: s.stopped, f: s.f, home: s.home, gap: s.gap,
        bandOp: +getComputedStyle($('band')).opacity, readOp: +getComputedStyle($('read')).opacity, sayR: R($('say')), btnsTop: R($('btns'))[1], frameR: R($('frame')),
        end: getComputedStyle($('end')).display !== 'none', endP: +$('end').querySelector('p').style.opacity, credits: !$('credits').hidden, title: getComputedStyle($('title')).display !== 'none',
        titleOp: +getComputedStyle($('title')).opacity, stopH: $('stop').hidden ? 0 : Math.round($('stop').getBoundingClientRect().height), stopTxt: $('stop').textContent, find: !$('find').hidden, vidT: document.getElementById('v').currentTime });
    }, 100);
  });
  const samples = () => T.ev(() => window.__S);

  // ── Begin draws the viewer in (6.73): the view sets off for the red star at once; as it arrives the invitation rises ──
  await T.sleep(1200);
  await T.tap('#go');
  const tBegin = Date.now();
  await T.sleep(3000);
  let s = await T.st(), L = await T.log();
  T.ok('after Begin nothing of the film plays', !s.started && L.told.length === 0 && L.nar.length === 0 && L.clips.length === 0);
  T.ok('before Play the view is coming in to the red star (6.73)', s.dist < REST - 0.05 && s.dist > 0.6, s.dist);   /* the star comes to the centre as the view arrives */
  const inv = await T.until(() => window.theApproach.state().inviting && !document.getElementById('play').hidden, 30000);
  const tInv = (Date.now() - tBegin) / 1000;
  T.ok('the invitation rises by itself as the view arrives, at about 8.4 seconds (6.73)', !!inv && tInv > 7.6 && tInv < 9.6, tInv.toFixed(1) + 's');
  await T.shot('01-invitation');
  await T.sleep(Math.max(0, tBegin + 10800 - Date.now())); s = await T.st();
  T.ok('the view rests near the red star (0.52) with its moons whole', near(s.dist, 0.52, 0.02) && s.hs.a >= 0.99, 'dist ' + s.dist + ' a ' + s.hs.a);
  await T.shot('01b-rest-near');

  // ── Play: the dive ──
  await T.tap('#play');
  const tPlay = (await T.log()).play;
  for (const [ms, name] of [[1300, '02-dive-1.3s'], [2600, '03-title-2.6s'], [5600, '04-lifting-5.6s'], [6600, '05-arriving-6.6s'], [12300, '06-at-rest-o1']]) { await T.sleep(tPlay + ms - Date.now()); await T.shot(name); }
  await T.until(() => /^A block is a tree/.test(document.getElementById('say').textContent) && document.getElementById('say').textContent.length > 360, 80000);
  await T.sleep(1500); await T.shot('07-o2-longest-line');
  await T.until(() => window.theApproach.log().told.some(x => x.id === 'whisper'), 80000); await T.sleep(1200); await T.shot('07b-the-whisper');
  await T.until(() => window.theApproach.log().told.some(x => x.id === 'o3b'), 80000); await T.sleep(9000); await T.shot('07c-the-fall');
  await T.until(() => window.theApproach.state().introDone, 60000);
  const tDone = Date.now();
  await T.sleep(1300); await T.shot('08-drawing-back');
  await T.sleep(2200); await T.shot('09-wide-dial-risen');

  let S = await samples();
  const rel = x => (x.t - tPlay) / 1000, op = S.filter(x => x.t >= tPlay && x.t <= tDone - 150);
  const at = sec => op.reduce((b, x) => Math.abs(rel(x) - sec) < Math.abs(rel(b) - sec) ? x : b, op[0]);
  /* Play from near (6.73 TWO): it moves in at once, from 0.52 to about 0.42, gathering speed; from far it would rush to 0.7 (begin.js checks that) */
  const d0 = at(0).dist, hold = Math.min(d0, Math.max(0.396, Math.min(d0 * 0.8, 0.7)));
  T.ok('Play from near: the view moves in at once (to about 0.42 by 1.4 seconds, gathering speed) (6.73)', at(0.5).dist < d0 - 0.004 && near(at(1.5).dist, hold, 0.02) && (at(0).dist - at(0.7).dist) < (at(0.7).dist - at(1.4).dist), [at(0).dist, at(0.7).dist, at(1.5).dist].join(' > ') + ' (hold ' + hold.toFixed(3) + ')');
  const jump = Math.max(...op.filter(x => rel(x) <= 1.4).map(x => x.home ? Math.hypot(x.home[0] - at(0).home[0], x.home[1] - at(0).home[1]) : 999));
  T.ok('through those 1.4 seconds the star keeps its place on screen, so nothing jumps (6.73)', jump < 12, Math.round(jump) + 'px at most');
  T.ok('the moons are in view as the title cuts in', at(1.6).title && at(1.5).hs.a > 0.3, 'a=' + at(1.5).hs.a + ' title=' + at(1.6).title);
  T.ok('under the black it holds', near(at(3).dist, hold, 0.02) && near(at(4.6).dist, hold, 0.02), at(3).dist + ' ' + at(4.6).dist);
  T.ok('the black lifts on the arrival (still coming in as it lifts)', at(5.6).dist <= hold + 0.003 && at(5.6).dist > 0.36 && at(7).title && at(7).titleOp < 1 && at(7).dist > 0.36, 'dist ' + at(5.6).dist + ' then ' + at(7).dist + ', title opacity ' + at(7).titleOp);
  const rest = op.filter(x => rel(x) > 8.9);
  T.ok('it rests close on the red star (distance 0.36) for the whole opening', rest.length > 500 && rest.every(x => near(x.dist, 0.36, 0.006)), 'min ' + Math.min(...rest.map(x => x.dist)) + ' max ' + Math.max(...rest.map(x => x.dist)) + ' over ' + rest.length + ' samples');
  T.ok('its moons are whole throughout', rest.every(x => x.hs.a >= 0.99 && x.hs.kind === 'clear'));
  const h = rest[10].hs, barBottom = await T.ev(() => Math.max(document.getElementById('credit').getBoundingClientRect().bottom, document.getElementById('sound').getBoundingClientRect().bottom));
  const expR = W >= 900 ? Math.min(W * 0.2, H * 0.28) : Math.min(W * 0.385, H * 0.2);
  T.ok('the orbit is the plan\'s size at home', near(h.R, expR, 2), h.R + ' against ' + expR.toFixed(1));
  T.ok('the star and its whole orbit are in clear view between the top bar and the words', h.x - h.R >= 0 && h.x + h.R <= W && h.y - 0.62 * h.R >= barBottom && h.bottom <= h.wordsTop, 'orbit x ' + (h.x - h.R) + '..' + (h.x + h.R) + ', y ' + Math.round(h.y - 0.62 * h.R) + '..' + h.bottom + ', bar ' + Math.round(barBottom) + ', words ' + h.wordsTop);
  const spoken = rest.filter(x => x.say.length > 0);
  T.ok('nothing covers the star at any point in the opening (words beneath, no picture)', spoken.length > 400 && spoken.every(x => x.sayR[1] >= x.hs.bottom && !x.frameOn), 'least gap ' + Math.min(...spoken.map(x => x.sayR[1] - x.hs.bottom)) + 'px');
  T.ok('the words sit directly beneath the orbit', spoken.every(x => x.sayR[1] - x.hs.bottom < 90), 'greatest gap ' + Math.max(...spoken.map(x => x.sayR[1] - x.hs.bottom)) + 'px');
  const longest = op.reduce((b, x) => x.say.length > b.say.length ? x : b, op[0]);
  T.ok('o2, the long line on what a block is, sits wholly between the red star and Stop', /^A block is a tree of words/.test(longest.say) && longest.sayR[1] >= longest.hs.bottom && longest.sayR[3] <= longest.btnsTop && longest.sayR[3] <= H, longest.say.length + ' letters, from ' + longest.sayR[1] + ' (the orbit ends at ' + longest.hs.bottom + ') to ' + longest.sayR[3] + ', buttons at ' + longest.btnsTop);
  T.ok('every line of the opening stays above the buttons', spoken.every(x => x.sayR[3] <= x.btnsTop));
  T.ok('the dial is hidden from Play to the end of the opening', op.every(x => x.bandOp < 0.02 && x.readOp < 0.02), 'greatest opacity ' + Math.max(...op.map(x => x.bandOp)));
  T.ok('Stop is in reach through the opening, at least 48 pixels', op.filter(x => rel(x) > 0.3).every(x => x.stopH >= 48 && x.stopTxt === 'Stop'), 'least ' + Math.min(...op.filter(x => rel(x) > 0.3).map(x => x.stopH)));

  L = await T.log();
  const told = L.told.map(x => x.id);
  T.ok('the opening\'s twelve items in order, the whisper among them', told.join(' ') === STORY.opening, told.join(' '));
  T.ok('no line of the opening over another', L.told.every((x, i) => i === 0 || x.t0 >= L.told[i - 1].t1), '');
  const first = (L.told[0].t0 - L.play) / 1000, last = (L.told[11].t0 - L.play) / 1000;
  T.ok('the film\'s own timing: the first line about 11 seconds after Play', near(first, 10.9, 0.6), first.toFixed(2));
  T.ok('the film\'s own timing: the opening\'s last line at about 118 seconds', near(last, 118, 2.5), last.toFixed(2) + ' (it ends at ' + ((L.told[11].t1 - L.play) / 1000).toFixed(1) + ')');
  // the opening's sound (6.9 check 3): ten pips first; the whisper; the kept voices pile up under 'Then AI filled the internet' and are cut before her last two sentences
  let SND = await T.ev(() => window.__snd);
  const firstPips = SND.osc.filter(x => x.f === 880 && x.t >= L.play && x.t < L.told[0].t0);
  T.ok('ten pips are the film\'s first sound, before the first line', firstPips.length === 10 && firstPips[9].t < L.told[0].t0 - 300 && SND.buf.filter(b => !b.loop && b.t >= L.play && b.t < firstPips[0].t).length === 0, firstPips.length + ' pips, from ' + (((firstPips[0] || {}).t - L.play) / 1000).toFixed(1) + 's to ' + (((firstPips[9] || {}).t - L.play) / 1000).toFixed(1) + 's after Play');
  const wh = L.told.find(x => x.id === 'whisper'), o3b = L.told.find(x => x.id === 'o3b');
  const whShown = op.filter(x => wh && x.t > wh.t0 + 1500 && x.t < wh.t1);
  T.ok('the whisper: a child and the kind voice, its words on screen, its sound from the voices folder', !!wh && L.heard.includes('whisper') && whShown.length > 5 && whShown.every(x => /I can't sleep\.’\s*‘I'm here\. Tell me everything\./.test(x.say)) && (await T.ev(() => performance.getEntriesByType('resource').some(r => /\/voices\/whisper\.mp3$/.test(r.name)))), wh ? ((wh.t1 - wh.t0) / 1000).toFixed(1) + 's' : 'not told');
  const pile = SND.buf.filter(b => !b.loop && b.stop && b.t > o3b.t0 + 100 && b.t < o3b.t1), cut = Math.max(...pile.map(b => b.stop)), half = pile.length ? (pile[0].t + pile[pile.length - 1].t) / 2 : 0;
  const gapsOf = a => a.slice(1).map((b, i) => b.t - a[i].t), mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  T.ok('under Then AI filled the internet the kept voices pile up, closer and closer together', pile.length >= 20 && mean(gapsOf(pile.filter(b => b.t >= half))) < 0.6 * mean(gapsOf(pile.filter(b => b.t < half))), pile.length + ' voices; ' + Math.round(mean(gapsOf(pile.filter(b => b.t < half)))) + ' ms apart at first, ' + Math.round(mean(gapsOf(pile.filter(b => b.t >= half)))) + ' ms at the last');
  T.ok('and are cut to silence before the narrator\'s last two sentences', pile.length > 0 && near((o3b.t1 - cut) / 1000, 4.35, 0.4) && SND.buf.filter(b => !b.loop && b.t > cut && b.t < o3b.t1).length === 0, 'cut ' + ((o3b.t1 - cut) / 1000).toFixed(2) + 's before the line ends');

  // ── the opening ends: the view draws back as the dial rises ──
  S = await samples();
  const after = S.filter(x => x.t > tDone);
  const back = after.find(x => near(x.dist, REST, 0.02));
  T.ok('when the opening ends the view draws back to the wide sky (2.6 seconds)', back && near((back.t - tDone) / 1000, 2.6, 0.6), back ? ((back.t - tDone) / 1000).toFixed(1) + 's to ' + back.dist : 'never');
  T.ok('and the dial rises', after[after.length - 1].bandOp > 0.98 && after[after.length - 1].find);
  T.ok('the moons fold away as it draws back', after[after.length - 1].hs.a === 0);

  // ── the first tuning, by the needle, slowly ──
  const band = await T.ev(() => { const b = document.getElementById('band').getBoundingClientRect(); return { l: b.left, w: b.width, y: b.top + b.height / 2 }; });
  s = await T.st();
  const mara = (await T.ev(() => window.theApproach.mara()));
  const x0 = band.l + s.f * band.w, x1 = band.l + mara[0] * band.w;
  await P.mouse.move(x0, band.y); await P.mouse.down();
  const track = [];
  for (let i = 1; i <= 60; i++) { await P.mouse.move(x0 + (x1 - x0) * i / 60, band.y); await T.sleep(110); if (i % 3 === 0) { const q = await T.st(); track.push({ f: q.f, dist: q.dist, a: q.hs.a, y: q.hs.y, kind: q.hs.kind, seat: q.hs.seat, frameOn: q.frameOn, locked: q.mLocked }); if (i === 57) await T.shot('10-needle-nearing-mara'); } }
  const locked = await T.until(() => window.theApproach.state().mLocked, 8000);
  await P.mouse.up();
  const pre = track.filter(q => !q.frameOn), mid = pre[Math.max(0, pre.length - 2)];
  T.ok('dragging the needle to Mara brings the red star up, driven by the needle', !!locked && pre.length > 3 && pre[0].dist > 2 && mid.dist < pre[0].dist - 0.5, 'dist ' + pre.map(q => q.dist).join(' '));
  s = await T.st();
  const fr = await T.ev(() => { const r = document.getElementById('frame').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  await T.sleep(1500); s = await T.st(); await T.shot('11-locked-picture-open');
  T.ok('at the lock the picture opens over the star (the star sits behind the picture)', s.frameOn && s.hs.kind === 'pic' && s.home && s.home[0] > fr.l && s.home[0] < fr.r && s.home[1] > fr.t && s.home[1] < fr.b, 'star ' + s.home + ' in picture ' + [fr.l, fr.t, fr.r, fr.b].map(Math.round));
  T.ok('with its moons, it swelled in the picture\'s place', near(s.hs.seat, (fr.t + fr.b) / 2, 6), 'seat ' + s.hs.seat + ', picture centre ' + Math.round((fr.t + fr.b) / 2));
  T.ok('the lock ends close on the red star', near(s.dist, 0.36, 0.02), s.dist);

  // ── the eight stops, each to its drift; then the button ──
  const drifts = [], clipShot = { numbers: '12b-numbers', seasons: '12c-seasons-night-60', helper: '12d-helper-today', voice: '12e-the-false-voice', summer: '14a-summer-the-sky-bright', shes_home: '14b-shes-home', gate_night: '14e-gate-night-spring' };
  const shotAtClip = async name => { await T.until(n => window.theApproach.log().clips.some(c => c.name === n), 150000, name, 150); await T.sleep(4500); await T.shot(clipShot[name]); };
  for (let k = 0; k < 8; k++) {
    if (k > 0) {
      const g = await T.st();
      drifts.push({ k, read: g.read, gap: g.gap, lost: g.lost, dist: g.dist, frameOn: g.frameOn, find: g.find, a: g.hs.a, t: Date.now() });
      if (k === 1) await T.shot('13-signal-lost-wide');
      if (k === 6) await T.shot('13b-before-the-false-voice');
      if (k === 7) await T.shot('13c-toms-radio-is-on');
      await T.tap('#find');
      const ok = await T.until(() => window.theApproach.state().mLocked, 9000);
      if (!ok) { T.ok('the button found the station, stop ' + (k + 1), false); break; }
      drifts[drifts.length - 1].lock = Date.now();
      await T.sleep(1600);
      const q = await T.st(); drifts[drifts.length - 1].after = { dist: q.dist, frameOn: q.frameOn, kind: q.hs.kind };
    }
    if (k === 2) { await T.until(() => window.theApproach.state().clipOn, 60000); await T.sleep(2500); await T.shot('12-a-clip-playing'); }
    if (k === 3) await shotAtClip('numbers');
    if (k === 4) await shotAtClip('seasons');
    if (k === 5) await shotAtClip('helper');
    if (k === 6) await shotAtClip('voice');
    if (k === 7) {   // Tom's radio: the walk, the gate and She's home with the whole sky bright, then r8 over the star and its moons
      await T.until(() => /2048 3/.test(document.getElementById('read').textContent), 30000); await T.sleep(2600); await T.shot('14-the-walk');
      await shotAtClip('summer'); await shotAtClip('shes_home');
      await T.until(() => window.theApproach.log().nar.some(n => n.id === 'r8'), 120000); await T.sleep(8000); await T.shot('14c-r8-over-the-star');
      await shotAtClip('gate_night');
    }
    const gone = await T.until(() => { const z = window.theApproach.state(); return !z.mLocked; }, 170000, null, 150);
    if (!gone) { T.ok('stop ' + (k + 1) + ' came to its end', false); break; }
    if (k < 7) await T.sleep(3000);
  }
  // ── the end ──
  const tEnd = (await T.log()).end;
  await T.sleep(1500); await T.shot('15-shes-home');
  await T.until(() => window.theApproach.log().told.some(x => x.id === 'e1c'), 20000); await T.sleep(2500); await T.shot('16-e1c-whole-sky');
  // the last two looks before the line, the view wide and at rest by then, to know how much the sky changes by itself
  await T.ev(() => { window.__grab('a'); window.__grab('b'); });
  for (let i = 0; i < 80 && !(await T.ev(() => window.theApproach.log().told.some(x => x.id === 'keep'))); i++) { await T.ev(() => { window.__L.a = window.__L.b; window.__grab('b'); }); await T.sleep(400); }
  for (let i = 0; i < 3; i++) { await T.sleep(1600); await T.ev(i => window.__grab('k' + i), i); if (i === 1) await T.shot('16b-keep-one-of-us'); }
  await T.until(() => window.theApproach.log().end2, 60000); await T.sleep(1500); await T.shot('17-end-card');
  const cred = await T.until(() => window.theApproach.credits().open, 15000);
  await T.ev(() => window.__grab('z')); const sinceKeep = (Date.now() - (await T.log()).told.find(x => x.id === 'keep').t0) / 1000;
  await T.sleep(2500); await T.shot('18-credits');

  S = await samples(); L = await T.log();
  SND = await T.ev(() => window.__snd);
  const at2 = ms => S.reduce((b, x) => Math.abs(x.t - ms) < Math.abs(b.t - ms) ? x : b, S[0]), within = (a, b) => S.filter(x => x.t >= a && x.t <= b);
  const narOf = id => L.nar.find(n => n.id === id), clipOf = name => L.clips.find(c => c.name === name);
  T.ok('all eight stops: the nineteen narrator lines in order', L.nar.map(n => n.id).join(' ') === STORY.nar, L.nar.map(n => n.id).join(' '));
  T.ok('eight dots stand by the film\'s name, one for each stop', S[S.length - 1].dots === 8, S[S.length - 1].dots);
  const clips = L.clips.map(c => c.name);
  T.ok('all fifteen clips, in order', clips.join(' ') === STORY.clips, clips.join(' '));
  T.ok('every clip whole (about ten seconds), its poster first, the picture showing', L.clips.length === 15 && L.clips.every(c => c.ended && c.shown && c.poster === c.name + '.jpg' && c.seen >= 9.7 && c.seen <= 10.3 && (c.t1 - c.t0) / 1000 < 11.2), L.clips.map(c => c.name + ' ' + c.seen.toFixed(1)).join(', '));
  const capNow = L.clips.map(c => ({ name: c.name, say: at2(c.t0 + 5000).say }));
  T.ok('every clip carries its own words beneath it, and the wordless ones none', capNow.every(c => c.say === STORY.cap[c.name]), capNow.filter(c => c.say !== STORY.cap[c.name]).map(c => c.name + ': ' + c.say).join(' | '));
  // the radio's face (6.9 check 4)
  const face = (ms) => at2(ms).read, midC = c => (clipOf(c).t0 + clipOf(c).t1) / 2, helperC = clipOf('helper');
  const todayRead = within(helperC.t0 + 600, helperC.t1 - 300), want = ms => sundial(ms).replace(/(.{4})(.*)/, '$1 $2') + '  ·  today';
  const reads = { 'Night 1': face(midC('nights')), 'Night 2': face(narOf('r5b').t0 + 3000), 'Night 60': face(midC('seasons')), 'Night 64': face(narOf('r6').t0 + 2000), 'Night 64 again': face(narOf('r6b').t0 + 3000),
    'Night 90': face(midC('voice')), 'Night 97': face(drifts[6].lock + 900), 'Spring': face(midC('gate_night')) };
  T.ok('the radio\'s face reads Night 1, Night 2, Night 60, Night 64, Night 90, Night 97 and Spring, each in its place', reads['Night 1'] === 'Night 1  ·  Mara' && reads['Night 2'] === 'Night 2  ·  Mara' && reads['Night 60'] === 'Night 60  ·  Mara' && reads['Night 64'] === 'Night 64  ·  Mara' && reads['Night 64 again'] === 'Night 64  ·  Mara' && reads['Night 90'] === 'Night 90  ·  Mara?' && reads['Night 97'] === 'Night 97  ·  Tom’s radio' && reads['Spring'] === 'Spring  ·  Tom’s radio', JSON.stringify(reads));
  T.ok('while the helper clip plays it shows today\'s own ten digits and the word today, equal to the sundial of that moment', todayRead.length > 60 && todayRead.every(x => x.read === want(x.t) || x.read === want(helperC.t0)), (todayRead[0] || {}).read + ' against ' + want(helperC.t0));
  const sm = clipOf('summer'), walk = within(drifts[6].lock, sm.t0).map(x => x.read).filter((r, i, a) => /^2\d*( \d*)?$/.test(r) && r !== a[i - 1]);
  T.ok('at Tom\'s radio the face walks the gate\'s ten digits rung by rung, to 2048 313271', walk.length >= 8 && walk[walk.length - 1] === '2048 313271' && walk.every((r, i) => i === 0 || r.length > walk[i - 1].length), walk.join(' > '));
  const walkPips = SND.osc.filter(x => x.f === 880 && x.t > drifts[6].lock && x.t < sm.t0), walkWords = within(drifts[6].lock, sm.t0).map(x => x.say).filter((r, i, a) => r && r !== a[i - 1]);
  T.ok('ten pips, each a step of the walk, its words building beneath (no narrator)', walkPips.length === 10 && walkWords[walkWords.length - 1] === STORY.cap.summer && walkWords.length === 7 && L.nar.every(n => n.t1 <= drifts[6].lock || n.t0 >= clipOf('shes_home').t1), walkPips.length + ' pips; ' + walkWords.length + ' steps of words');
  // the sounds laid between words and clips
  const count = (f, a, b) => SND.osc.filter(x => x.f === f && x.t >= a && x.t <= b).length;
  T.ok('ten pips when Mara finds the signal (after r1, before the station clip)', count(880, narOf('r1').t1, clipOf('station').t0) === 10, count(880, narOf('r1').t1, clipOf('station').t0));
  T.ok('ten pips before the second night is told, and Tom\'s ten lower pips after it', count(880, clipOf('nights').t1, narOf('r5b').t0) === 10 && count(660, narOf('r5b').t1, narOf('r5c').t0) === 10, count(880, clipOf('nights').t1, narOf('r5b').t0) + ' and ' + count(660, narOf('r5b').t1, narOf('r5c').t0));
  T.ok('Tom\'s ten lower pips answer again after r8b', count(660, narOf('r8b').t1, narOf('e1').t0) === 10, count(660, narOf('r8b').t1, narOf('e1').t0));
  // the false voice (6.9 check 5)
  const gapS = k => within(drifts[k - 1].t - 3000, drifts[k - 1].lock || drifts[k - 1].t);   // the gap before stop k+1, from its drift to the next lock
  const driftAt = []; for (let i = 1; i < S.length; i++) if (S[i - 1].mLocked && !S[i].mLocked && !S[i].done) driftAt.push(S[i].t);
  const markIn = k => { const a = driftAt[k], m = S.find(x => x.t > a && x.t < (drifts[k].lock || a + 20000) && x.mark > 0.5); return m ? (m.t - a) / 1000 : -1; };
  const strongNow = within(driftAt[5], drifts[5].lock).filter(x => x.mark > 0.5);
  T.ok('before stop 7 the mark shows within three seconds, and stronger', markIn(5) > 0 && markIn(5) <= 3.2 && strongNow.length > 0 && strongNow.every(x => x.markStrong && x.markW >= 7) && [1, 2, 3, 4].every(k => markIn(k) < 0), 'at ' + markIn(5).toFixed(1) + 's, ' + (strongNow[0] || {}).markW + 'px wide; at the stops before it: ' + [1, 2, 3, 4].map(markIn).join(' '));
  const callsIn = k => SND.osc.filter(x => x.f === 784 && x.t > driftAt[k] && x.t < drifts[k].lock).length;
  T.ok('her three-note call is silent near the false voice (it sounds near the true Mara)', callsIn(5) === 0 && [0, 1, 2, 3, 4].some(k => callsIn(k) > 0), 'calls in each gap: ' + [0, 1, 2, 3, 4, 5, 6].map(callsIn).join(' '));
  const v7 = at2(midC('voice'));
  T.ok('the false voice is named Mara? on the dial', /^Mara\?  ·  /.test(v7.who) && v7.read === 'Night 90  ·  Mara?', v7.who + ' / ' + v7.read);
  // the drift words and the button
  const words = driftAt.map((a, k) => within(a, drifts[k].lock || a + 6000).reduce((b, x) => x.say.length > b.length ? x.say : b, ''));
  T.ok('the drift words: something is talking over her; talked over again (four times); the numbers have stopped; Tom\'s radio is on', words.length === 7 && words.every((w, i) => w === STORY.drift[i]), words.join(' | '));
  const labels = driftAt.map((a, k) => at2((drifts[k].lock || a + 3000) - 300).findTxt);
  T.ok('the button reads Find Mara until the false voice, then Find the numbers', labels.slice(0, 6).every(x => x === 'Find Mara') && labels[6] === 'Find the numbers', labels.join(' | '));
  // the sky at the peak (6.9 check 6)
  const skyAt = (a, b) => within(a, b).map(x => x.sky).filter(x => x !== null), avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const skyBefore = avg(skyAt(drifts[6].lock + 500, sm.t0 - 300)), skyDuring = skyAt(sm.t0 + 5000, clipOf('shes_home').t1 - 500), r8n = narOf('r8'), skyAfter = avg(skyAt(r8n.t0 + 8000, r8n.t0 + 10500));
  T.ok('the sky is clearly brighter while summer and shes_home play than before them', skyDuring.length > 15 && Math.min(...skyDuring) > skyBefore + 25 && Math.min(...skyDuring) > 2 * skyBefore, 'a strip of sky ' + skyBefore.toFixed(0) + ' before, ' + Math.min(...skyDuring).toFixed(0) + ' to ' + Math.max(...skyDuring).toFixed(0) + ' during');
  T.ok('and has settled within about eight seconds of the narrator starting again', Math.abs(skyAfter - skyBefore) < 6, skyAfter.toFixed(0) + ' against ' + skyBefore.toFixed(0) + ' before');
  T.ok('nothing spoken over a clip', L.clips.every(c => L.nar.every(n => n.t1 <= c.t0 + 50 || n.t0 >= c.t1 - 50)), '');
  T.ok('no narrator line over another', L.nar.every((n, i) => i === 0 || n.t0 >= L.nar[i - 1].t1));
  T.ok('Signal lost shows at each of the seven gaps, the view wide and the picture closed', drifts.length === 7 && drifts.every(d => /signal lost/i.test(d.read) && d.lost && near(d.dist, REST, 0.05) && !d.frameOn && d.a === 0), drifts.map(d => d.read + '@' + d.dist).join(' | '));
  T.ok('each of the first six gaps has its fiction on the air (6.7); the last, before Tom\'s radio, has none', drifts.map(d => d.gap).join(' | ') === 'The Third Point | The Ticket | With Her Yes | The Fork | The Moving Moment | Nothing Is Kept | ', drifts.map(d => d.gap).join(' | '));
  T.ok('the button ends close on the red star each time, the picture over it (at Tom\'s radio no picture until the gate plays)', drifts.every((d, i) => d.after && near(d.after.dist, 0.36, 0.03) && (i === 6 ? !d.after.frameOn : d.after.frameOn && d.after.kind === 'pic')), drifts.map(d => d.after && d.after.dist + (d.after.frameOn ? ' pic' : ' none')).join(', '));
  // through the tunings: nothing of the star shows round the picture
  const onAt = {}; let lastOn = 0; S.forEach((x, i) => { if (x.frameOn && (i === 0 || !S[i - 1].frameOn)) lastOn = x.t; onAt[i] = lastOn; });
  const tuned = S.filter((x, i) => x.mLocked && x.frameOn && x.hs.a > 0.05 && x.t - onAt[i] > 1500);   // once the star has settled behind the picture (it is still arriving for a second as the picture opens, in the working piece too)
  const outside = tuned.filter(x => x.hs.x - x.hs.R < x.frameR[0] - 1 || x.hs.x + x.hs.R > x.frameR[2] + 1 || x.hs.y - 0.6 * x.hs.R < x.frameR[1] - 1 || x.hs.y + 0.6 * x.hs.R > x.frameR[3] + 1);
  T.ok('through a tuning nothing of the star shows round the picture', tuned.length > 300 && outside.length === 0, tuned.length + ' samples, ' + outside.length + ' with the orbit outside the picture' + (outside[0] ? '; e.g. orbit ' + [outside[0].hs.x - outside[0].hs.R, Math.round(outside[0].hs.y - 0.62 * outside[0].hs.R), outside[0].hs.x + outside[0].hs.R, Math.round(outside[0].hs.y + 0.62 * outside[0].hs.R)] + ' picture ' + outside[0].frameR : ''));
  // each drift: the picture closes and the view draws back
  const driftsBack = []; for (let i = 1; i < S.length; i++) if (S[i - 1].mLocked && !S[i].mLocked && !S[i].done) { const w = S.slice(i).find(x => near(x.dist, REST, 0.03)); driftsBack.push(w ? (w.t - S[i].t) / 1000 : -1); }
  T.ok('when she drifts the view draws back over 2.6 seconds', driftsBack.length === 7 && driftsBack.every(d => near(d, 2.6, 0.7)), driftsBack.map(d => d.toFixed(1)).join(' '));
  // r8 over the star and its moons with the words beneath
  const r8 = L.nar.find(n => n.id === 'r8'), r8s = S.filter(x => r8 && x.t > r8.t0 + 1500 && x.t < r8.t1);
  T.ok('at Tom\'s radio r8 is told over the star and its moons, the words beneath', r8s.length > 50 && r8s.every(x => !x.frameOn && x.hs.a > 0.98 && x.hs.kind === 'clear' && near(x.dist, 0.36, 0.02) && x.sayR[1] >= x.hs.bottom && x.sayR[3] <= x.btnsTop), r8s.length + ' samples; least gap ' + Math.min(...r8s.map(x => x.sayR[1] - x.hs.bottom)));
  // the end
  const e = S.filter(x => x.t >= tEnd), wide = e.find(x => near(x.dist, REST, 0.03));
  T.ok('at She\'s home the view draws back over 7 seconds to the whole sky', wide && near((wide.t - tEnd) / 1000, 7, 1.2), wide ? ((wide.t - tEnd) / 1000).toFixed(1) + 's' : 'never');
  const e1 = L.told.find(x => x.id === 'e1c'), keep = L.told.find(x => x.id === 'keep'), e2 = L.told.find(x => x.id === 'e2');
  T.ok('She\'s home stands alone, then the ending\'s three lines: e1c, Keep one of us, e2', L.told.slice(12).map(x => x.id).join(' ') === STORY.ending && e1.t0 - tEnd > 3300 && keep.t0 >= e1.t1 && e2.t0 >= keep.t1 && S.filter(x => x.t > tEnd + 300 && x.t < tEnd + 3200).every(x => x.end && x.endP === 0), L.told.slice(12).map(x => x.id).join(' '));
  const tale = S.filter(x => e1 && x.t > e1.t0 + 4000 && x.t < e2.t1);
  T.ok('the ending is told over the whole sky', tale.length > 20 && tale.filter(x => x.t > tEnd + 7400).every(x => near(x.dist, REST, 0.03) && x.hs.a === 0), '');
  // Keep one of us (6.9 check 7): every station lit, one warm light beside the red star, gone before the credits open
  const kp = within(keep.t0 + 1500, keep.t1), before = within(e1.t0, keep.t0 - 200), afterAll = within(keep.t1 + 4800, L.end2 + 7000);
  T.ok('at Keep one of us the words stand large and every station on the dial is lit', kp.length > 3 && kp.every(x => x.say === 'Keep one of us.' && x.all && x.lives === 8 && x.lit >= 33) && before.every(x => !x.all && x.lit < 30) && afterAll.length > 10 && afterAll.every(x => !x.all), 'lit ' + (kp[0] || {}).lives + ' stations to ' + (kp[kp.length - 1] || {}).lit + 'px (' + (before[0] || {}).lit + 'px before)');
  const home = at2(keep.t0 + 3000).home, RAD = 0.3 * Math.min(W, H), rise = (a, b, at) => T.ev(q => window.__rise(q[0], q[1], q[2], q[3], q[4], q[5]), [a, b, home[0], home[1], RAD, at === undefined ? -1 : at]);
  const own = await rise('a', 'b'), kindled = [await rise('b', 'k0'), await rise('b', 'k1'), await rise('b', 'k2')], peak = kindled.reduce((b, x) => x.by > b.by ? x : b), gone = await rise('b', 'z', peak.i);
  T.ok('one new warm light stands beside the red star', peak.by >= 45 && peak.by > 3 * Math.max(own.by, 5) && Math.hypot(peak.x - home[0], peak.y - home[1]) > 8 && Math.hypot(peak.x - home[0], peak.y - home[1]) < RAD, 'a patch of sky near the red star brightens by ' + kindled.map(x => x.by).join(', ') + ' of 255 as it kindles (' + own.by + ' at most by itself), at ' + peak.x + ',' + peak.y + '; the red star at ' + home);
  T.ok('and it has gone as the credits open', gone.by <= Math.max(12, 0.2 * peak.by), 'that patch is ' + gone.by + ' above what it was, ' + sinceKeep.toFixed(1) + 's after the line began');
  T.ok('the film\'s own timing: Play to the first end card about 8 minutes 48', near((L.end - tPlay) / 1000, W >= 900 ? 533 : 528, 12), ((L.end - tPlay) / 1000).toFixed(0) + 's');
  T.ok('then the end card again, with The others are still on the air', !!L.end2 && S.some(x => x.t > L.end2 && x.end && x.endP === 1));
  T.ok('then the credits', !!cred);
  T.ok('Stop was in reach from Play to the end card, at least 48 pixels', S.filter(x => x.t > tPlay + 300 && x.t < tEnd && !x.credits).every(x => x.stopH >= 48), 'least ' + Math.min(...S.filter(x => x.t > tPlay + 300 && x.t < tEnd).map(x => x.stopH)));
  console.log('Play to the dial ' + ((tDone - tPlay) / 1000).toFixed(1) + 's; Play to the end card ' + ((L.end2 - tPlay) / 60000).toFixed(1) + ' minutes');
  T.noErrors(); await T.done();
})().catch(e => { console.error(e); process.exit(2); });
