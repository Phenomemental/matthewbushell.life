// The uninterrupted film, Begin to the credits, with the checks of 6.82 (the film begins in the red star).
//   node film.js --size phone|desktop [--url URL] [--shots DIR]
// The first tuning is found by dragging the needle slowly (6.82 check 4); the others by 'Find Mara'.
'use strict';
const { open, args } = require('./lib');
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const o = args(), T = await open(o), P = T.page, W = T.size.width, H = T.size.height;
  const REST = W >= 900 ? 2.5 : 2.35;

  // a sampler inside the page, ten times a second
  await T.ev(() => {
    const $ = id => document.getElementById(id), R = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
    window.__S = [];
    window.__sampler = setInterval(() => {
      const s = window.theApproach.state();
      window.__S.push({ t: Date.now(), intro: s.intro, introDone: s.introDone, dist: s.dist, hs: s.hs, frameOn: s.frameOn, lost: s.lost, mLocked: s.mLocked, pi: s.pi, heard: s.heard,
        done: s.done, showTom: s.showTom, clipOn: s.clipOn, say: $('say').textContent, read: s.read, stopped: s.stopped, f: s.f, home: s.home, gap: s.gap,
        bandOp: +getComputedStyle($('band')).opacity, readOp: +getComputedStyle($('read')).opacity, sayR: R($('say')), btnsTop: R($('btns'))[1], frameR: R($('frame')),
        end: getComputedStyle($('end')).display !== 'none', endP: +$('end').querySelector('p').style.opacity, credits: !$('credits').hidden, title: getComputedStyle($('title')).display !== 'none',
        titleOp: +getComputedStyle($('title')).opacity, stopH: $('stop').hidden ? 0 : Math.round($('stop').getBoundingClientRect().height), stopTxt: $('stop').textContent, find: !$('find').hidden, vidT: document.getElementById('v').currentTime });
    }, 100);
  });
  const samples = () => T.ev(() => window.__S);

  // ── Begin: nothing of the film plays, and the invitation comes by itself ──
  await T.sleep(1200);
  await T.tap('#go');
  const tBegin = Date.now();
  await T.sleep(3000);
  let s = await T.st(), L = await T.log();
  T.ok('after Begin nothing of the film plays', !s.started && L.told.length === 0 && L.nar.length === 0 && L.clips.length === 0);
  T.ok('before Play the view is the wide sky', near(s.dist, REST, 0.08), s.dist);
  const inv = await T.until(() => window.theApproach.state().inviting && !document.getElementById('play').hidden, 30000);
  const tInv = (Date.now() - tBegin) / 1000;
  T.ok('the invitation rises by itself after about twenty seconds', !!inv && tInv > 14 && tInv < 26, tInv.toFixed(1) + 's');
  await T.shot('01-invitation');

  // ── Play: the dive ──
  await T.tap('#play');
  const tPlay = (await T.log()).play;
  for (const [ms, name] of [[1300, '02-dive-1.3s'], [2600, '03-title-2.6s'], [5600, '04-lifting-5.6s'], [6600, '05-arriving-6.6s'], [9200, '06-at-rest-o1']]) { await T.sleep(tPlay + ms - Date.now()); await T.shot(name); }
  await T.until(() => window.theApproach.state().introAt >= 6 && document.getElementById('say').textContent.length > 300, 80000);
  await T.sleep(11500); await T.shot('07-o7-longest-line');
  await T.until(() => window.theApproach.state().introDone, 60000);
  const tDone = Date.now();
  await T.sleep(1300); await T.shot('08-drawing-back');
  await T.sleep(2200); await T.shot('09-wide-dial-risen');

  let S = await samples();
  const rel = x => (x.t - tPlay) / 1000, op = S.filter(x => x.t >= tPlay && x.t <= tDone - 150);
  const at = sec => op.reduce((b, x) => Math.abs(rel(x) - sec) < Math.abs(rel(b) - sec) ? x : b, op[0]);
  T.ok('Play: the view rushes in (0.7 by 1.4 seconds, gathering speed)', at(0.7).dist > at(1.4).dist && near(at(1.5).dist, 0.7, 0.06) && (at(0) .dist - at(0.7).dist) < (at(0.7).dist - at(1.4).dist), [at(0).dist, at(0.7).dist, at(1.5).dist].join(' > '));
  T.ok('the moons are just appearing as the title cuts in', at(1.6).title && at(1.5).hs.a > 0.3 && at(1.5).hs.a < 0.95, 'a=' + at(1.5).hs.a + ' title=' + at(1.6).title);
  T.ok('under the black it holds', near(at(3).dist, 0.7, 0.03) && near(at(4.6).dist, 0.7, 0.03), at(3).dist + ' ' + at(4.6).dist);
  T.ok('the black lifts on the arrival (still coming in as it lifts)', at(5.6).dist < 0.69 && at(5.6).dist > 0.4 && at(7).title && at(7).titleOp < 1 && at(7).dist > 0.36, 'dist ' + at(5.6).dist + ' then ' + at(7).dist + ', title opacity ' + at(7).titleOp);
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
  T.ok('o7, the longest line, is readable whole above the buttons', /^On the radio/.test(longest.say) && longest.sayR[3] <= longest.btnsTop && longest.sayR[3] <= H, longest.say.length + ' letters, foot at ' + longest.sayR[3] + ', buttons at ' + longest.btnsTop);
  T.ok('every line of the opening stays above the buttons', spoken.every(x => x.sayR[3] <= x.btnsTop));
  T.ok('the dial is hidden from Play to the end of the opening', op.every(x => x.bandOp < 0.02 && x.readOp < 0.02), 'greatest opacity ' + Math.max(...op.map(x => x.bandOp)));
  T.ok('Stop is in reach through the opening, at least 48 pixels', op.filter(x => rel(x) > 0.3).every(x => x.stopH >= 48 && x.stopTxt === 'Stop'), 'least ' + Math.min(...op.filter(x => rel(x) > 0.3).map(x => x.stopH)));

  L = await T.log();
  const told = L.told.map(x => x.id);
  T.ok('the narrator\'s o1 to o9, in order', told.join(' ') === 'o1 o2 o3 o4 o5 o6 o7 o8 o9', told.join(' '));
  T.ok('no line of the opening over another', L.told.every((x, i) => i === 0 || x.t0 >= L.told[i - 1].t1), '');
  const first = (L.told[0].t0 - L.play) / 1000, lastEnd = (L.told[8].t1 - L.play) / 1000;
  T.ok('the film\'s own timing: the first line 7.8 seconds after Play', near(first, 7.8, 0.5), first.toFixed(2));
  T.ok('the film\'s own timing: the opening\'s last line ends at 94.3 seconds', near(lastEnd, 94.3, 1.0), lastEnd.toFixed(2));

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

  // ── the tunings, each to its drift; then Find Mara ──
  const drifts = [];
  for (let k = 0; k < 7; k++) {
    if (k > 0) {
      const g = await T.st();
      drifts.push({ k, read: g.read, gap: g.gap, lost: g.lost, dist: g.dist, frameOn: g.frameOn, find: g.find, a: g.hs.a });
      if (k === 1) await T.shot('13-signal-lost-wide');
      await T.tap('#find');
      const ok = await T.until(() => window.theApproach.state().mLocked, 9000);
      if (!ok) { T.ok('Find Mara found her, tuning ' + (k + 1), false); break; }
      await T.sleep(1600);
      const q = await T.st(); drifts[drifts.length - 1].after = { dist: q.dist, frameOn: q.frameOn, kind: q.hs.kind };
    }
    if (k === 2) { await T.until(() => window.theApproach.state().clipOn, 60000); await T.sleep(2500); await T.shot('12-a-clip-playing'); }
    if (k === 6) {   // Tom's radio: r8 is told over the star and its moons
      await T.until(() => window.theApproach.log().nar.some(n => n.id === 'r8'), 120000); await T.sleep(6000); await T.shot('14-r8-over-the-star');
    }
    const gone = await T.until(() => { const z = window.theApproach.state(); return !z.mLocked; }, 150000, null, 150);
    if (!gone) { T.ok('tuning ' + (k + 1) + ' came to its end', false); break; }
    if (k < 6) await T.sleep(3000);
  }
  // ── the end ──
  const tEnd = (await T.log()).end;
  await T.sleep(1500); await T.shot('15-shes-home');
  await T.until(() => window.theApproach.log().told.some(x => x.id === 'e1'), 20000); await T.sleep(2500); await T.shot('16-e1-whole-sky');
  await T.until(() => window.theApproach.log().end2, 60000); await T.sleep(1500); await T.shot('17-end-card');
  const cred = await T.until(() => window.theApproach.credits().open, 15000);
  await T.sleep(2500); await T.shot('18-credits');

  S = await samples(); L = await T.log();
  T.ok('all seven locks: six tunings of Mara and Tom\'s radio', L.nar.map(n => n.id).join(' ') === 'r1 r2 r3 r4 r5 r6 r7 r8', L.nar.map(n => n.id).join(' '));
  const clips = L.clips.map(c => c.name);
  T.ok('all ten clips, in order', clips.join(' ') === 'station chip address mara_asks tom_answer dawn nights archive summer shes_home', clips.join(' '));
  T.ok('every clip whole, its poster first, the picture showing', L.clips.every(c => c.ended && c.shown && c.poster === c.name + '.jpg' && c.seen > 3), L.clips.filter(c => !(c.ended && c.shown)).map(c => c.name).join(' '));
  T.ok('nothing spoken over a clip', L.clips.every(c => L.nar.every(n => n.t1 <= c.t0 + 50 || n.t0 >= c.t1 - 50)), '');
  T.ok('no narrator line over another', L.nar.every((n, i) => i === 0 || n.t0 >= L.nar[i - 1].t1));
  T.ok('Signal lost shows at each of the six gaps, the view wide and the picture closed', drifts.length === 6 && drifts.every(d => /signal lost/i.test(d.read) && d.lost && near(d.dist, REST, 0.05) && !d.frameOn && d.a === 0), drifts.map(d => d.read + '@' + d.dist).join(' | '));
  T.ok('each gap has its fiction on the air', drifts.map(d => d.gap).join(' | ') === 'The Third Point | The Ticket | With Her Yes | The Fork | The Moving Moment | Nothing Is Kept', drifts.map(d => d.gap).join(' | '));
  T.ok('Find Mara ends close on the red star each time, the picture over it', drifts.every(d => d.after && near(d.after.dist, 0.36, 0.03) && d.after.frameOn && d.after.kind === 'pic'), drifts.map(d => d.after && d.after.dist).join(' '));
  // through the tunings: nothing of the star shows round the picture
  const onAt = {}; let lastOn = 0; S.forEach((x, i) => { if (x.frameOn && (i === 0 || !S[i - 1].frameOn)) lastOn = x.t; onAt[i] = lastOn; });
  const tuned = S.filter((x, i) => x.mLocked && x.frameOn && x.hs.a > 0.05 && x.t - onAt[i] > 1500);   // once the star has settled behind the picture (it is still arriving for a second as the picture opens, in the working piece too)
  const outside = tuned.filter(x => x.hs.x - x.hs.R < x.frameR[0] - 1 || x.hs.x + x.hs.R > x.frameR[2] + 1 || x.hs.y - 0.6 * x.hs.R < x.frameR[1] - 1 || x.hs.y + 0.6 * x.hs.R > x.frameR[3] + 1);
  T.ok('through a tuning nothing of the star shows round the picture', tuned.length > 300 && outside.length === 0, tuned.length + ' samples, ' + outside.length + ' with the orbit outside the picture' + (outside[0] ? '; e.g. orbit ' + [outside[0].hs.x - outside[0].hs.R, Math.round(outside[0].hs.y - 0.62 * outside[0].hs.R), outside[0].hs.x + outside[0].hs.R, Math.round(outside[0].hs.y + 0.62 * outside[0].hs.R)] + ' picture ' + outside[0].frameR : ''));
  // each drift: the picture closes and the view draws back
  const driftsBack = []; for (let i = 1; i < S.length; i++) if (S[i - 1].mLocked && !S[i].mLocked && !S[i].done) { const w = S.slice(i).find(x => near(x.dist, REST, 0.03)); driftsBack.push(w ? (w.t - S[i].t) / 1000 : -1); }
  T.ok('when she drifts the view draws back over 2.6 seconds', driftsBack.length === 6 && driftsBack.every(d => near(d, 2.6, 0.7)), driftsBack.map(d => d.toFixed(1)).join(' '));
  // r8 over the star and its moons with the words beneath
  const r8 = L.nar.find(n => n.id === 'r8'), r8s = S.filter(x => r8 && x.t > r8.t0 + 1500 && x.t < r8.t1);
  T.ok('Tom\'s last telling (r8) is told over the star and its moons, the words beneath', r8s.length > 50 && r8s.every(x => !x.frameOn && x.hs.a > 0.98 && x.hs.kind === 'clear' && near(x.dist, 0.36, 0.02) && x.sayR[1] >= x.hs.bottom && x.sayR[3] <= x.btnsTop), r8s.length + ' samples; least gap ' + Math.min(...r8s.map(x => x.sayR[1] - x.hs.bottom)));
  // the end
  const e = S.filter(x => x.t >= tEnd), wide = e.find(x => near(x.dist, REST, 0.03));
  T.ok('at She\'s home the view draws back over 7 seconds to the whole sky', wide && near((wide.t - tEnd) / 1000, 7, 1.2), wide ? ((wide.t - tEnd) / 1000).toFixed(1) + 's' : 'never');
  const e1 = L.told.find(x => x.id === 'e1'), e2 = L.told.find(x => x.id === 'e2');
  T.ok('She\'s home stands alone, then e1 and e2', e1 && e2 && e1.t0 - tEnd > 3300 && e2.t0 >= e1.t1 && S.filter(x => x.t > tEnd + 300 && x.t < tEnd + 3200).every(x => x.end && x.endP === 0));
  const tale = S.filter(x => e1 && x.t > e1.t0 + 4000 && x.t < e2.t1);
  T.ok('the last two lines are told over the whole sky', tale.length > 20 && tale.filter(x => x.t > tEnd + 7400).every(x => near(x.dist, REST, 0.03) && x.hs.a === 0), '');
  T.ok('then the end card with The others are still on the air', !!L.end2 && S.some(x => x.t > L.end2 && x.end && x.endP === 1));
  T.ok('then the credits', !!cred);
  T.ok('Stop was in reach from Play to the end card, at least 48 pixels', S.filter(x => x.t > tPlay + 300 && x.t < tEnd && !x.credits).every(x => x.stopH >= 48), 'least ' + Math.min(...S.filter(x => x.t > tPlay + 300 && x.t < tEnd).map(x => x.stopH)));
  console.log('Play to the dial ' + ((tDone - tPlay) / 1000).toFixed(1) + 's; Play to the end card ' + ((L.end2 - tPlay) / 60000).toFixed(1) + ' minutes');
  T.noErrors(); await T.done();
})().catch(e => { console.error(e); process.exit(2); });
