// Begin draws you in (film:the-approach 6.73): the approach to the red star, the invitation as it arrives, the hand stopping it,
// Play from near and from far, the red star tapped from far, the sound of the universe before the film, and Close credits after the end.
//   node begin.js --size phone|desktop [--url URL] [--shots DIR] [--quick]      (--quick leaves out the film played to its end)
// The sound is measured at the page's own output: a meter hangs on every connection into the speakers. The chord's low band
// (60 to 330 Hz) is used where the radio's static could also be heard, since the static sits far above it.
'use strict';
const { open, args } = require('./lib');
const near = (a, b, e) => Math.abs(a - b) <= e;
const QUICK = process.argv.includes('--quick');
const METER = `(() => {
  if (!window.AudioNode) return;
  const orig = AudioNode.prototype.connect; window.__meters = [];
  AudioNode.prototype.connect = function (dest) {
    const r = orig.apply(this, arguments);
    try { if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode) { const c = this.context; if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 8192; window.__meters.push(c.__an); } orig.call(this, c.__an); } } catch (e) { /* the page carries on */ }
    return r;
  };
  window.__level = () => {
    let rms = 0, low = 0;
    for (const an of window.__meters) {
      const n = an.fftSize, td = new Float32Array(n); an.getFloatTimeDomainData(td); let s = 0; for (let i = 0; i < n; i++) s += td[i] * td[i]; rms = Math.max(rms, Math.sqrt(s / n));
      const fd = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(fd); const hz = an.context.sampleRate / n; let e = 0;
      for (let i = Math.floor(60 / hz); i <= Math.ceil(330 / hz); i++) if (isFinite(fd[i])) e += Math.pow(10, fd[i] / 10);
      low = Math.max(low, Math.sqrt(e));
    }
    return { rms: +rms.toFixed(5), low: +low.toFixed(5) };
  };
})();`;

(async () => {
  const o = args(); o.init = METER;
  const T = await open(o), P = T.page, W = T.size.width, H = T.size.height;
  const REST = W >= 900 ? 2.5 : 2.35, NEAR = 0.52;
  const A = () => T.st(), MU = () => T.ev(() => window.theApproach.music()), LV = () => T.ev(() => window.__level ? window.__level() : { rms: 0, low: 0 });
  const moons = () => T.ev(() => window.theApproach.moons());
  const wheelTo = async (pred, dy, max) => { for (let i = 0; i < (max || 60); i++) { const s = await A(); if (pred(s)) return s; const h = s.home || [W / 2, H * 0.4]; await P.mouse.move(h[0], h[1]); await P.mouse.wheel(0, dy); await T.sleep(90); } return A(); };
  const toFar = () => wheelTo(s => s.dist >= 1.6, 260, 40);
  const dragSky = async (dx, y) => { y = y || H * 0.3; await P.mouse.move(W / 2, y); await P.mouse.down(); for (let i = 1; i <= 6; i++) { await P.mouse.move(W / 2 + dx * i / 6, y); await T.sleep(25); } await P.mouse.up(); };
  const tapRedStar = async () => { const s = await A(); await T.tapAt(s.home[0], s.home[1]); };
  const closeCard = () => T.ev(() => { const c = document.getElementById('starcard'); if (!c.hidden) document.getElementById('sclose').click(); });
  const comeNear = async label => {   // a tap on the red star from far brings its moons into view (check 5)
    await toFar(); const far = await A(); await tapRedStar(); await T.sleep(2400); const s = await A();
    T.ok(label + ': a tap on the red star from far brings the view near (0.52) and its moons into view', far.dist >= 1.5 && near(s.dist, NEAR, 0.02) && s.hs.a >= 0.99, 'from ' + far.dist + ' to ' + s.dist + ', moons ' + s.hs.a);
    await closeCard(); return s;
  };
  // a sampler inside the page, ten times a second
  const sampler = () => T.ev(() => { window.__S = []; clearInterval(window.__sampler); window.__sampler = setInterval(() => { const s = window.theApproach.state(), m = window.theApproach.music(); window.__S.push({ t: Date.now(), dist: s.dist, home: s.home, a: s.hs.a, x: s.hs.x, y: s.hs.y, R: s.hs.R, inviting: s.inviting, play: !document.getElementById('play').hidden, started: s.started, title: getComputedStyle(document.getElementById('title')).display !== 'none', mon: m.on, mlev: m.level, lv: window.__level ? window.__level() : null }); }, 100); });
  const samples = () => T.ev(() => window.__S);
  const atT = (S, t0, sec) => S.reduce((b, x) => Math.abs((x.t - t0) / 1000 - sec) < Math.abs((b.t - t0) / 1000 - sec) ? x : b, S[0]);
  const tops = () => T.ev(() => ({ bar: Math.max(document.querySelector('.corner').getBoundingClientRect().bottom, document.getElementById('fmark').getBoundingClientRect().bottom), radio: document.getElementById('btns').getBoundingClientRect().top }));

  // ══ ONE and TWO: Begin, the approach, the moons opening, the invitation as it arrives, the rest near ══
  await T.sleep(1500); await sampler();
  await T.tap('#go'); const tBegin = Date.now();
  for (const [ms, name] of [[1000, 'b01-approach-1s'], [6000, 'b02-moons-opening-6s']]) { await T.sleep(Math.max(0, tBegin + ms - Date.now())); await T.shot(name); }
  const inv = await T.until(() => window.theApproach.log().invite, 15000);
  await T.sleep(Math.max(0, inv + 500 - Date.now())); await T.shot('b03-call-and-ripple');
  await T.sleep(Math.max(0, tBegin + 10800 - Date.now())); await T.shot('b04-rest-near');
  let S = await samples(), L = await T.log(), s = await A();
  const a0 = atT(S, tBegin, 0.15), a1 = atT(S, tBegin, 0.95);
  T.ok('Begin: the view is moving toward the red star within the first second', a1.dist < a0.dist - 0.01, a0.dist + ' -> ' + a1.dist);
  const firstMoon = S.find(x => x.t > tBegin && x.a > 0.05);
  T.ok('the red star grows and its moons open round it from about six seconds', !!firstMoon && (firstMoon.t - tBegin) / 1000 > 4.5 && (firstMoon.t - tBegin) / 1000 < 7.5, firstMoon ? ((firstMoon.t - tBegin) / 1000).toFixed(1) + 's at ' + firstMoon.dist : 'never');
  const b = await tops();
  T.ok('it comes to rest near the red star (0.52) at about ten seconds, its whole orbit and its eight moons in view', near(s.dist, NEAR, 0.012) && s.hs.a >= 0.99 && s.hs.kind === 'clear' && s.hs.x - s.hs.R >= 0 && s.hs.x + s.hs.R <= W && s.hs.y - s.hs.R * 0.45 >= b.bar - 4 && s.hs.y + s.hs.R * 0.45 <= b.radio, 'dist ' + s.dist + ', orbit ' + (s.hs.x - s.hs.R) + '..' + (s.hs.x + s.hs.R) + ' x ' + Math.round(s.hs.y - s.hs.R * 0.45) + '..' + Math.round(s.hs.y + s.hs.R * 0.45) + ' within ' + Math.round(b.bar) + '..' + Math.round(b.radio));
  const tInv = (inv - tBegin) / 1000, before = atT(S, tBegin, 8.0);
  T.ok('Play the film rises at about 8.4 seconds, and not before', near(tInv, 8.4, 0.45) && !before.play, tInv.toFixed(2) + 's; at 8.0s shown: ' + before.play);
  T.ok('with Mara\'s call as it rises', L.calls.length >= 1 && Math.abs(L.calls[0] - inv) < 200, L.calls.length + ' call(s)');
  // FOUR: the sound
  const l1 = atT(S, tBegin, 1.0).lv, l5 = atT(S, tBegin, 5.0).lv, plateau = S.filter(x => (x.t - tBegin) / 1000 > 6 && (x.t - tBegin) / 1000 < 10.5).map(x => x.lv.low).sort((p, q) => p - q), L0 = plateau[Math.floor(plateau.length / 2)];
  T.ok('the sound of the universe is at the output within a second of Begin', l1 && l1.rms > 0.0005 && atT(S, tBegin, 1.0).mon, JSON.stringify(l1));
  T.ok('and at its level by five seconds', l5 && l5.low >= 0.7 * L0, 'at 5s ' + (l5 && l5.low) + ', settled ' + L0);
  // the sound under the viewer's hands, before Play
  const lowNow = async () => { const v = []; for (let i = 0; i < 6; i++) { v.push((await LV()).low); await T.sleep(120); } return v.sort((p, q) => p - q)[3]; };
  await T.tap('#sound'); await T.sleep(1200); const off = await LV();
  await T.tap('#sound'); await T.sleep(1800); const backOn = await lowNow();
  T.ok('Sound: off silences it, and on brings it back', off.rms < 0.0002 && backOn > 0.5 * L0, 'off ' + off.rms + ', back ' + backOn + ' of ' + L0);
  await T.tap('#credit'); await T.sleep(2500); const cr = await lowNow(), crm = await MU();
  await T.tap('#cclose'); await T.sleep(500); const cc = await T.ev(() => window.theApproach.credits());
  T.ok('before the end Close credits only closes the credits (no explore, no line)', !cc.open && !cc.explored && cc.hint === '', JSON.stringify({ open: cc.open, explored: cc.explored, hint: cc.hint }));
  await T.sleep(1800); const crBack = await lowNow();
  T.ok('it stands aside for the credits and comes back after', crm.level === 0 && cr < 0.2 * L0 && crBack > 0.5 * L0, 'under the credits ' + cr + ' (level ' + crm.level + '), after ' + crBack);
  const walked = await (async () => { for (let i = 0; i < 60; i++) { const m = await moons(); if (m.inside && !m.tr) return true; const s2 = await A(); await P.mouse.move(s2.home[0], s2.home[1]); await P.mouse.wheel(0, -120); await T.sleep(100); } return false; })();
  await T.sleep(1600); const wk = await lowNow(), wkm = await MU();
  for (let i = 0; i < 10; i++) { const m = await moons(); if (!m.inside) break; if (!m.tr) await T.tap('#tup'); await T.sleep(500); }
  await T.sleep(2200); const wkBack = await lowNow();
  T.ok('it steps back under a walk', walked && near(wkm.level, 0.48, 0.01) && wk < 0.75 * L0 && wk > 0.15 * L0 && wkBack > 0.6 * L0, 'under the walk ' + wk + ' (level ' + wkm.level + '), after ' + wkBack + ', settled ' + L0);
  let fic = null; for (let i = 0; i < 16 && !fic; i++) { fic = await T.ev(() => { const k = window.theApproach.sky(), $ = id => document.getElementById(id), boxes = ['frame', 'words', 'starcard', 'radio', 'credit', 'sound'].map(id => $(id)).filter(e => e && !e.hidden && getComputedStyle(e).display !== 'none').map(e => e.getBoundingClientRect()); return k.fictions.filter(a => boxes.every(q => a.x < q.left - 14 || a.x > q.right + 14 || a.y < q.top - 14 || a.y > q.bottom + 14) && document.elementFromPoint(a.x, a.y) === $('sky'))[0] || null; }); if (!fic) { await dragSky(70); await T.sleep(300); } }
  if (fic) { await T.tapAt(fic.x, fic.y); await T.until(() => !document.getElementById('sfic').hidden, 5000); await T.sleep(400); await T.tap('#sfic'); }
  await T.until(() => window.theApproach.state().filmOn && window.theApproach.film().t > 1.5, 15000); await T.sleep(1000);
  const fl = await lowNow(), flm = await MU();
  await T.tap('#stop'); await T.sleep(2600); const flBack = await lowNow();
  T.ok('it stands aside for a block film and comes back after', !!fic && flm.level === 0 && fl < 0.2 * L0 && flBack > 0.5 * L0, (fic ? fic.name : 'no sea-green star') + ': under the film ' + fl + ' (level ' + flm.level + '), after ' + flBack);
  // THREE: the red star tapped from far, before Play
  await comeNear('before Play');
  await T.sleep(1200);

  // ══ TWO: Play from near ══
  await sampler(); s = await A(); const nearAtPlay = s.dist;
  await T.tap('#play'); const tPlay = (await T.log()).play;
  await T.sleep(Math.max(0, tPlay + 1000 - Date.now())); await T.shot('b05-play-near-1s');
  await T.sleep(Math.max(0, tPlay + 2600 - Date.now())); await T.shot('b06-title');
  await T.sleep(Math.max(0, tPlay + 3300 - Date.now())); const after3 = await LV(), m3 = await MU();
  await T.sleep(Math.max(0, tPlay + 9200 - Date.now())); await T.shot('b07-rest-o1');
  S = await samples(); L = await T.log();
  const p0 = atT(S, tPlay, 0), p15 = atT(S, tPlay, 1.5), hold = Math.min(p0.dist, Math.max(0.396, Math.min(p0.dist * 0.8, 0.7)));
  const jump = Math.max(...S.filter(x => x.t >= tPlay && x.t <= tPlay + 1400).map(x => Math.hypot(x.home[0] - p0.home[0], x.home[1] - p0.home[1])));
  T.ok('Play from near moves in at once (0.52 to about 0.42 before the title)', near(nearAtPlay, NEAR, 0.02) && atT(S, tPlay, 0.5).dist < p0.dist - 0.004 && near(p15.dist, hold, 0.02), p0.dist + ' -> ' + atT(S, tPlay, 0.5).dist + ' -> ' + p15.dist);
  T.ok('and nothing on screen jumps: the star keeps its place until the title is up', jump < 12, Math.round(jump) + 'px at most');
  T.ok('the opening rests close (0.36) on the red star with its moons', near(s = (await A()).dist, 0.36, 0.01), s);
  const first = L.told.find(x => x.id === 'o1');
  T.ok('the first line is 7.8 seconds after Play', !!first && near((first.t0 - L.play) / 1000, 7.8, 0.3), first ? ((first.t0 - L.play) / 1000).toFixed(2) + 's' : 'none');
  T.ok('the sound is gone three seconds after Play, and does not come back', !m3.on && after3.low < 0.1 * L0, 'at 3.3s low ' + after3.low + ' of ' + L0 + ', on ' + m3.on);

  // THREE: stopped
  await T.tap('#stop'); await T.sleep(1200);
  await comeNear('stopped');
  T.ok('the sound stays away while stopped', !(await MU()).on);
  // THREE: in a gap
  await T.tap('#skipop'); await T.sleep(3000);
  await T.tap('#find'); await T.until(() => window.theApproach.state().mLocked, 9000);
  await T.until(() => { const x = window.theApproach.state(); return !x.mLocked && x.lost && x.heard >= 1; }, 150000, null, 300); await T.sleep(3200);
  await comeNear('in a gap');
  T.ok('the sound is still absent after Play, in the film', !(await MU()).on);

  // ══ THREE: the hand stops the approach; the invitation still comes at its time ══
  await P.reload({ waitUntil: 'load' }); await T.sleep(1500); await sampler();
  await T.tap('#go'); const tB2 = Date.now();
  await T.sleep(2600); await dragSky(60, H * 0.62); const tTouch = Date.now(); await T.sleep(2200); await T.shot('b08-hand-stopped');
  const inv2 = await T.until(() => window.theApproach.log().invite, 15000);
  S = await samples(); s = await A();
  const atTouch = atT(S, tTouch, 0.15), later = atT(S, tTouch, 2.0);
  T.ok('a touch on the sky stops the approach and the view stays where the hand left it', near(atTouch.dist, later.dist, 0.005) && atTouch.dist > NEAR + 0.2, atTouch.dist + ' then ' + later.dist);
  T.ok('and the invitation still comes at its time', !!inv2 && near((inv2 - tB2) / 1000, 8.4, 0.5) && s.touches < 3, ((inv2 - tB2) / 1000).toFixed(2) + 's, ' + s.touches + ' touch(es)');
  // three touches bring it sooner
  await P.reload({ waitUntil: 'load' }); await T.sleep(1500);
  await T.tap('#go'); const tB3 = Date.now(); await T.sleep(1200);
  for (let i = 0; i < 3; i++) { await dragSky(40, H * 0.62); await T.sleep(250); }
  const inv3 = await T.until(() => window.theApproach.log().invite, 15000);
  T.ok('three touches of the sky bring the invitation sooner', !!inv3 && (inv3 - tB3) / 1000 < 4.5, ((inv3 - tB3) / 1000).toFixed(2) + 's');

  // ══ TWO: Play from far behaves as in 6.82 (it rushes to 0.7 first) ══
  await P.reload({ waitUntil: 'load' }); await T.sleep(1500);
  await T.tap('#go'); await T.sleep(300); await dragSky(30, H * 0.62);   // the hand stops the approach while the view is still far
  await T.until(() => window.theApproach.log().invite, 15000); await T.sleep(400);
  await sampler(); const farAtPlay = (await A()).dist;
  await T.tap('#play'); const tP4 = (await T.log()).play; await T.sleep(Math.max(0, tP4 + 4700 - Date.now()));
  S = await samples();
  T.ok('Play from far rushes to 0.7 before the title and holds there under the black, as in 6.82', farAtPlay > 1.8 && near(atT(S, tP4, 1.5).dist, 0.7, 0.04) && near(atT(S, tP4, 3.5).dist, 0.7, 0.03), farAtPlay + ' -> ' + atT(S, tP4, 1.5).dist + ' -> ' + atT(S, tP4, 3.5).dist);

  // ══ FIVE: after the end, Close credits hands the sky over as Explore does ══
  if (!QUICK) {
    await T.tap('#stop'); await T.sleep(800); await T.tap('#skipop'); await T.sleep(3000);
    for (let k = 0; k < 7; k++) { await T.tap('#find'); await T.until(() => window.theApproach.state().mLocked, 9000); await T.until(() => { const x = window.theApproach.state(); return !x.mLocked || x.done; }, 150000, null, 300); if (k < 6) await T.sleep(2800); }
    const credits = await T.until(() => window.theApproach.credits().open, 90000, null, 300);
    await T.sleep(3000); await T.tap('#cclose'); await T.sleep(600);
    const c = await T.ev(() => window.theApproach.credits()); s = await A();
    await T.sleep(2800); const s2 = await A(); await T.shot('b09-close-credits-after-end');
    T.ok('after the end, Close credits gives the whole sky with its line, as Explore does', !!credits && !c.open && c.explored && c.hint === 'Tap any star to read its block. The sea-green stars play a film.' && s2.dist >= (W >= 900 ? 2.1 : 2.4), JSON.stringify({ explored: c.explored, hint: c.hint, dist: s2.dist }));
  }
  T.noErrors();
  await T.done();
})().catch(e => { console.error(e); process.exit(2); });
