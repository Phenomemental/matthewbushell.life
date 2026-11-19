// The way in, Signal lost, and the dial that turns the universe (6.7), brought up to date for 6.82:
// the film's rest is close on the red star with its moons; away from her the rest is the wide sky.
//   node dial.js --size phone|desktop [--url URL] [--shots DIR]
'use strict';
const { open, args } = require('./lib');
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const o = args(), T = await open(o), P = T.page, W = T.size.width, H = T.size.height;
  const REST = W >= 900 ? 2.5 : 2.35;
  const A = () => T.ev(() => window.theApproach.state());
  // is anything empty darkening or covering the sky?
  const darkBlocks = () => T.ev(() => ['frame', 'words', 'title', 'end', 'snow', 'px', 'starcard', 'wcard', 'mcard'].filter(id => {
    const e = document.getElementById(id); if (!e) return false; const c = getComputedStyle(e), r = e.getBoundingClientRect();
    if (e.hidden || c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0 || r.width < 2 || r.height < 2) return false;
    const bg = c.backgroundColor, alpha = /rgba\(/.test(bg) ? +bg.split(',')[3].replace(')', '') : (bg === 'transparent' ? 0 : 1);
    const painted = alpha > 0.02 || c.boxShadow !== 'none' || (parseFloat(c.borderTopWidth) > 0 && !/rgba\(0, 0, 0, 0\)/.test(c.borderTopColor)) || c.backgroundImage !== 'none' || c.backdropFilter && c.backdropFilter !== 'none';
    const holds = id === 'snow' || id === 'px' ? false : (e.textContent || '').trim().length > 0;
    return painted && !holds && !(id === 'snow' && +c.opacity < 0.02);
  }));
  const band = await T.ev(() => { const r = document.getElementById('band').getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2 }; });
  const X = f => band.l + f * band.w;
  let held = false;
  const needle = async (to, ms, each) => { const s = await A(), from = s.f, n = Math.max(2, Math.round(ms / 90)); if (!held) { await P.mouse.move(X(from), band.y); await P.mouse.down(); held = true; } for (let i = 1; i <= n; i++) { await P.mouse.move(X(from + (to - from) * i / n), band.y); await T.sleep(90); if (each) await each(await A()); } };
  const lift = async () => { if (held) { await P.mouse.up(); held = false; } };

  await T.sleep(1500);
  await T.tap('#go'); await T.sleep(2500);
  let s = await A();
  T.ok('with nothing playing, no dark block anywhere over the sky', (await darkBlocks()).length === 0, (await darkBlocks()).join(' '));
  T.ok('after Begin nothing of the film plays', !s.started && (await T.log()).told.length === 0);
  /* Begin draws the viewer in (6.73): the view comes in to the red star, which stays in the centre */
  const d0 = s.dist; await T.sleep(1500); const s1 = await A();
  T.ok('the view comes in toward the red star (6.73)', s1.dist < d0 - 0.05 && d0 < REST && s1.dist > 0.52, 'dist ' + d0 + ' then ' + s1.dist);
  await T.shot('d01-after-begin');
  // a star card opens (come a little nearer so single stars stand clear)
  for (let i = 0; i < 30; i++) { s = await A(); if (s.dist <= 1.15) break; await P.mouse.move(s.home[0], s.home[1]); await P.mouse.wheel(0, -120); await T.sleep(80); }
  let star = null; for (let i = 0; i < 12 && !star; i++) { star = await T.ev(() => window.theApproach.sky().clear.filter(a => document.elementFromPoint(a.x, a.y) === document.getElementById('sky'))[0] || null); if (!star) { await P.mouse.move(W / 2, H * 0.3); await P.mouse.down(); await P.mouse.move(W / 2 + 70, H * 0.3, { steps: 5 }); await P.mouse.up(); await T.sleep(300); } }
  if (star) await T.tapAt(star.x, star.y); await T.sleep(1200);
  T.ok('a star card opens before the film', !!star && await T.ev(() => !document.getElementById('starcard').hidden), star && star.name);
  await T.ev(() => document.getElementById('sclose').click());
  const inv = await T.until(() => window.theApproach.state().inviting && !document.getElementById('play').hidden, 30000);
  T.ok('the invitation, Play the film, rises', !!inv); await T.shot('d02-invitation');
  const yaw0 = await T.ev(() => window.theApproach.sky().yaw); await T.sleep(2500); const yaw1 = await T.ev(() => window.theApproach.sky().yaw);
  T.ok('the sky turns while the viewer waits', yaw1 !== yaw0, (yaw1 - yaw0).toFixed(4));

  // ── Play glides into the red star and the opening plays ──
  await T.tap('#play'); await T.sleep(9500);
  s = await A(); T.ok('Play dives into the red star and the opening is told from there (6.82)', s.intro && near(s.dist, 0.36, 0.01) && s.hs.a >= 0.99 && (await T.log()).told[0].id === 'o1', 'dist ' + s.dist);
  await T.tap('#stop'); await T.sleep(300); await T.tap('#skipop'); await T.sleep(3200);
  s = await A(); T.ok('the dial is the viewer\'s after the opening, the view wide', s.introDone && near(s.dist, REST, 0.05), s.dist);
  T.ok('no dark block over the sky with the dial waiting', (await darkBlocks()).length === 0, (await darkBlocks()).join(' '));

  // ── Mara by the needle: the view comes home to the red star, close (6.7 TWO as 6.82 changes it) ──
  const mara = await T.ev(() => window.theApproach.mara());
  const tr = []; await needle(mara[0], 3200, q => tr.push(q.dist));
  await T.until(() => window.theApproach.state().mLocked, 8000); await lift(); await T.sleep(1500);
  s = await A(); T.ok('finding Mara by the dial brings the view home to the red star, close, as her signal locks', s.mLocked && near(s.dist, 0.36, 0.02) && s.home && near(s.home[0], W / 2, 6), 'dist ' + tr.filter((v, i) => i % 6 === 0).join(' ') + ' -> ' + s.dist);
  const gone = await T.until(() => { const z = window.theApproach.state(); return !z.mLocked && z.lost; }, 90000, null, 150);
  await T.sleep(3200); s = await A();
  T.ok('when the tuning ends the radio shows Signal lost', !!gone && /signal lost/i.test(s.read), s.read);
  T.ok('and the view has drawn back to the wide sky (6.82)', near(s.dist, REST, 0.05) && s.hs.a === 0, s.dist);
  T.ok('the gap\'s fiction is on the air between her places', s.gap === 'The Third Point' && near(s.gapF, 0.225, 0.001), s.gap + ' at ' + s.gapF);
  await T.shot('d03-signal-lost');

  // ── the dial turns the universe ──
  const centre = () => [W / 2, s.home ? s.home[1] : H * 0.4];
  const off = q => q.gapStar ? Math.hypot(q.gapStar[0] - W / 2, q.gapStar[1] - (q.centre ? q.centre[1] : H * 0.4)) : 9999;
  await needle(0.33, 900); await T.sleep(700);
  const far = await A();
  const trace = []; await needle(0.225, 5000, q => trace.push({ f: +q.f.toFixed(3), off: Math.round(off(q)), dist: q.dist, pulled: q.pulled, on: q.ficOn, S: q.ficS, bs: q.ficBs, who: q.who }));
  await T.sleep(1500); let at = await A(); await T.shot('d04-on-the-fiction');
  console.log('   pass through: ' + trace.filter((v, i) => i % 5 === 0).map(v => v.f + ' off' + v.off + ' d' + v.dist + ' S' + v.S + ' bs' + v.bs).join(' | '));
  T.ok('away from the fiction the view rests on the wide sky', !far.ficOn && near(far.dist, REST, 0.06), 'dist ' + far.dist);
  const first = trace.find(v => v.pulled && v.dist < REST - 0.03);
  T.ok('the pull begins about 0.07 either side of the station, broad and smooth', first && Math.abs(first.f - 0.225) > 0.04 && Math.abs(first.f - 0.225) < 0.085 && trace.every((v, i) => i === 0 || Math.abs(v.dist - trace[i - 1].dist) < 0.25), first ? 'first felt at ' + first.f : 'never');
  T.ok('dragging the needle into the fiction swings the view to its star', off(at) < 40 && off(far) > off(at) + 40, 'star ' + Math.round(off(far)) + 'px from the centre, then ' + Math.round(off(at)) + 'px');
  T.ok('and draws a little closer', at.dist < far.dist - 0.4 && at.dist > 0.44, far.dist + ' -> ' + at.dist);
  const words = await T.ev(() => ({ who: document.getElementById('who').textContent, say: document.getElementById('say').textContent, diary: document.getElementById('diary').textContent, read: document.getElementById('read').textContent }));
  const all = [words.who, words.say, words.diary, words.read].join(' ¦ ');
  T.ok('its name, its own first line and its ten digits show', /meeting-protocol/.test(all) && /\b\d{10}\b/.test(all) && words.say.length + words.diary.length > 20, all.slice(0, 220));
  const weak = trace.filter(v => v.on && v.S > 0.05 && v.S < 0.5), strong = trace.filter(v => v.on && v.S > 0.9);
  T.ok('its picture sharpens with the signal (blocky when weak, clear when strong)', weak.length > 0 && Math.max(...weak.map(v => v.bs)) > 6 && at.ficOn && at.frameOn && at.ficBs <= 2, 'blocks ' + (weak.length ? Math.max(...weak.map(v => v.bs)) : '-') + ' when weak, ' + at.ficBs + ' when held');
  const t0 = at.ficT; await T.sleep(4000); at = await A();
  T.ok('held there its film plays on clean, the star resting in the centre', at.ficOn && at.ficT > t0 + 3 && at.ficBs <= 1 && !/blur\((?!0)/.test(at.ficFilter) && off(at) < 30, 'film at ' + at.ficT + 's, blocks ' + at.ficBs + ', filter ' + at.ficFilter);
  T.ok('nothing of the film is told over it', !at.mLocked && !at.clipOn && (await T.log()).nar.length === 1);
  await T.shot('d05-held-on-the-fiction');
  // moving off dissolves it and the view eases back; back and forth swings the universe back and forth
  const swing = []; await needle(0.31, 1800, q => swing.push(Math.round(off(q)))); await T.sleep(1600);
  let away = await A();
  T.ok('moving off dissolves it and the view eases back to the wide sky', !away.ficOn && !away.frameOn && near(away.dist, REST, 0.08), 'dist ' + away.dist);
  await needle(0.225, 1800); await T.sleep(900); const again = await A();
  T.ok('moving the dial back swings the universe back', off(again) < 40 && again.ficOn, Math.round(off(away)) + ' -> ' + Math.round(off(again)));
  // the viewer's hand wins
  await needle(0.26, 600); await lift(); await T.sleep(300);
  const before = await A();
  await P.mouse.move(W / 2, H * 0.32); await P.mouse.down(); await P.mouse.move(W / 2 + 110, H * 0.32 + 30, { steps: 8 }); await P.mouse.up();
  const y0 = await T.ev(() => window.theApproach.sky().yaw); await T.sleep(2600); const y1 = await T.ev(() => window.theApproach.sky().yaw);
  let hand = await A();
  T.ok('turning the sky by hand in a gap is never fought by the dial', hand.handWins && !hand.pulled && Math.abs(y1 - y0) < 0.02, 'pulled ' + hand.pulled + ', drift ' + (y1 - y0).toFixed(4));
  await needle(0.24, 500); await T.sleep(700); hand = await A();
  T.ok('the pull waits until the dial is next moved', !hand.handWins && hand.pulled, 'pulled ' + hand.pulled);
  await lift();
  // ── Find Mara sweeps past the fiction and the view comes home to the red star ──
  await needle(0.36, 700); await lift(); await T.sleep(1500);
  await T.tap('#find'); const sweep = [], tF = Date.now();
  while (Date.now() - tF < 2300) { const q = await A(); sweep.push({ f: +q.f.toFixed(3), off: Math.round(off(q)), dist: q.dist, on: q.ficOn, S: q.ficS }); await T.sleep(70); }
  const lock = await T.until(() => window.theApproach.state().mLocked, 8000); await T.sleep(1700); s = await A();
  const passed = sweep.filter(v => Math.abs(v.f - 0.225) < 0.03);
  console.log('   sweep: ' + sweep.filter((v, i) => i % 3 === 0).map(v => v.f + ' off' + v.off + ' d' + v.dist).join(' | '));
  T.ok('Find Mara sweeps the needle across the band in about two seconds, past the fiction', sweep[0].f > 0.33 && near(sweep[sweep.length - 1].f, mara[1], 0.01) && passed.length > 0, sweep.filter((v, i) => i % 4 === 0).map(v => v.f).join(' '));
  T.ok('the universe is seen to swing past the fiction on the way', Math.min(...sweep.map(v => v.off)) < sweep[0].off - 40, 'the star of the fiction ' + sweep[0].off + 'px from the centre, as near as ' + Math.min(...sweep.map(v => v.off)) + 'px in passing');
  T.ok('and the view comes home to the red star, close, as the tuning begins', !!lock && near(s.dist, 0.36, 0.02) && s.frameOn && !s.ficOn && (await T.log()).nar.length === 2 && near(s.home[0], W / 2, 6), 'dist ' + s.dist);
  await T.shot('d06-home-on-the-red-star');
  const Lf = await T.log();
  T.ok('nothing of a fiction plays over the narrator or a clip', Lf.fic.filter(x => x.on).length >= 2 && Lf.fic.filter(x => x.on).every(x => Lf.nar.every(n => x.t < n.t0 || x.t > n.t1) && Lf.clips.every(c => x.t < c.t0 || x.t > (c.t1 || Infinity))), Lf.fic.filter(x => x.on).length + ' times on the air');
  // the next gap has its own fiction
  const gone2 = await T.until(() => { const z = window.theApproach.state(); return !z.mLocked && z.lost; }, 120000, null, 150); await T.sleep(600); s = await A();
  T.ok('the next gap shows Signal lost with its own fiction', !!gone2 && /signal lost/i.test(s.read) && s.gap === 'The Ticket', s.read + ' / ' + s.gap);
  T.noErrors(); await T.done();
})().catch(e => { console.error(e); process.exit(2); });
