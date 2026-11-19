// The retelling's opening (film:the-approach 1.731; 6.9 check 3): ten pips first, the whisper, the kept voices piling up under
// 'Then AI filled the internet' and cut to silence before the narrator's last two sentences, and every line of it, the long one on
// what a block is above all, sitting wholly between the red star and Stop. It plays from Begin to the dial and no further.
//   node opening.js --size phone|desktop|small|tall [--url URL] [--shots DIR]      (small is 360 by 640, tall is 412 by 740)
'use strict';
const { open, args, STORY } = require('./lib');
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const o = args(); o.sound = true;
  const T = await open(o), W = T.size.width, H = T.size.height;
  await T.ev(() => {
    const $ = id => document.getElementById(id), R = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
    window.__S = [];
    setInterval(() => { const s = window.theApproach.state(), st = $('stop');
      window.__S.push({ t: Date.now(), intro: s.intro, introAt: s.introAt, dist: s.dist, hs: s.hs, say: $('say').textContent, font: parseFloat(getComputedStyle($('say')).fontSize), sayR: R($('say')), btnsTop: R($('btns'))[1],
        stopTop: st.hidden ? 0 : R(st)[1], stopH: st.hidden ? 0 : Math.round(st.getBoundingClientRect().height), frameOn: s.frameOn, bandOp: +getComputedStyle($('band')).opacity }); }, 100);
  });
  await T.sleep(1200); await T.tap('#go');
  await T.until(() => !document.getElementById('play').hidden && window.theApproach.state().inviting, 32000);
  await T.sleep(2600);   // the view comes to its rest near the red star before Play
  await T.tap('#play');
  const tPlay = (await T.log()).play;
  await T.until(() => /^A block is a tree/.test(document.getElementById('say').textContent) && document.getElementById('say').textContent.length > 360, 60000);
  await T.sleep(1200); await T.shot('o1-the-long-line');
  await T.until(() => window.theApproach.log().told.some(x => x.id === 'whisper'), 90000); await T.sleep(1500); await T.shot('o2-the-whisper');
  await T.until(() => window.theApproach.log().told.some(x => x.id === 'o3b'), 90000); await T.sleep(9000); await T.shot('o3-the-fall');
  await T.until(() => window.theApproach.log().told.some(x => x.id === 'o7'), 90000); await T.sleep(9000); await T.shot('o4-mara-and-tom');
  await T.until(() => window.theApproach.state().introDone, 90000);
  const tDone = Date.now();
  await T.sleep(3200); await T.shot('o5-the-dial');

  const S = (await T.ev(() => window.__S)).filter(x => x.t >= tPlay && x.t <= tDone - 150), L = await T.log(), SND = await T.ev(() => window.__snd);
  const told = L.told.map(x => x.id);
  T.ok('the opening\'s twelve items in order, the whisper among them', told.join(' ') === STORY.opening, told.join(' '));
  T.ok('no line of the opening over another', L.told.every((x, i) => i === 0 || x.t0 >= L.told[i - 1].t1));
  // the sound
  const pips = SND.osc.filter(x => x.f === 880 && x.t >= L.play && x.t < L.told[0].t0);
  T.ok('ten pips are the film\'s first sound, before the first line', pips.length === 10 && pips[9].t < L.told[0].t0 - 300 && SND.buf.filter(b => !b.loop && b.t >= L.play && b.t < pips[0].t).length === 0, pips.length + ' pips, ' + (((pips[0] || {}).t - L.play) / 1000).toFixed(1) + 's to ' + (((pips[9] || {}).t - L.play) / 1000).toFixed(1) + 's after Play');
  const first = (L.told[0].t0 - L.play) / 1000, last = (L.told[11].t0 - L.play) / 1000;
  T.ok('the first line about 11 seconds after Play, the last at about 118', near(first, 10.9, 0.6) && near(last, 118, 2.5), first.toFixed(1) + 's and ' + last.toFixed(1) + 's');
  const wh = L.told.find(x => x.id === 'whisper'), o3a = L.told.find(x => x.id === 'o3a'), o3b = L.told.find(x => x.id === 'o3b');
  const whS = S.filter(x => x.t > wh.t0 + 1500 && x.t < wh.t1);
  T.ok('the whisper follows And its owners kept every word: its words on screen, its sound from the voices folder', wh.t0 >= o3a.t1 && o3b.t0 >= wh.t1 && L.heard.includes('whisper') && whS.length > 5 && whS.every(x => /I can't sleep\.’\s*‘I'm here\. Tell me everything\./.test(x.say)) && (await T.ev(() => performance.getEntriesByType('resource').some(r => /\/voices\/whisper\.mp3$/.test(r.name)))), ((wh.t1 - wh.t0) / 1000).toFixed(1) + 's');
  const pile = SND.buf.filter(b => !b.loop && b.stop && b.t > o3b.t0 + 100 && b.t < o3b.t1), cut = Math.max(...pile.map(b => b.stop)), half = pile.length ? (pile[0].t + pile[pile.length - 1].t) / 2 : 0;
  const gaps = a => a.slice(1).map((b, i) => b.t - a[i].t), mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  T.ok('under Then AI filled the internet the kept voices pile up, closer and closer together', pile.length >= 20 && mean(gaps(pile.filter(b => b.t >= half))) < 0.6 * mean(gaps(pile.filter(b => b.t < half))), pile.length + ' voices; ' + Math.round(mean(gaps(pile.filter(b => b.t < half)))) + ' ms apart at first, ' + Math.round(mean(gaps(pile.filter(b => b.t >= half)))) + ' ms at the last');
  T.ok('and are cut to silence before the narrator\'s last two sentences', pile.length > 0 && near((o3b.t1 - cut) / 1000, 4.35, 0.4) && SND.buf.filter(b => !b.loop && b.t > cut && b.t < o3b.t1).length === 0, 'cut ' + ((o3b.t1 - cut) / 1000).toFixed(2) + 's before the line ends');
  T.ok('nothing but the narrator is heard from then to the dial', SND.buf.filter(b => !b.loop && b.t > cut && b.t < tDone - 200).length === 6, SND.buf.filter(b => !b.loop && b.t > cut && b.t < tDone - 200).length + ' sounds (o4 to o9)');
  // the look: every line between the red star and Stop
  const rest = S.filter(x => (x.t - tPlay) / 1000 > 8.9), spoken = rest.filter(x => x.say.length > 0);
  const longest = spoken.reduce((b, x) => x.say.length > b.say.length ? x : b, spoken[0]);
  T.ok('the view rests close on the red star through the opening, its moons whole', rest.length > 600 && rest.every(x => near(x.dist, 0.36, 0.006) && x.hs.a >= 0.99), rest.length + ' samples');
  T.ok('the long line on what a block is sits wholly between the red star and Stop', /^A block is a tree of words/.test(longest.say) && longest.say.length > 360 && longest.sayR[1] >= longest.hs.bottom && longest.sayR[3] <= longest.stopTop && longest.stopTop > 0 && longest.sayR[3] <= H,
    longest.say.length + ' letters at ' + longest.font + 'px, from ' + longest.sayR[1] + ' to ' + longest.sayR[3] + '; the orbit ends at ' + longest.hs.bottom + ', Stop begins at ' + longest.stopTop);
  const bad = spoken.filter(x => x.sayR[1] < x.hs.bottom || x.sayR[3] > x.stopTop || x.frameOn);
  T.ok('and so does every other line of the opening, nothing over the star', bad.length === 0, bad.length ? bad[0].say.slice(0, 40) + ': ' + bad[0].sayR[1] + ' to ' + bad[0].sayR[3] + ', orbit ' + bad[0].hs.bottom + ', Stop ' + bad[0].stopTop : 'least room above ' + Math.min(...spoken.map(x => x.sayR[1] - x.hs.bottom)) + 'px, beneath ' + Math.min(...spoken.map(x => x.stopTop - x.sayR[3])) + 'px');
  T.ok('no line is set smaller than 16 pixels', spoken.every(x => x.font >= 16), 'smallest ' + Math.min(...spoken.map(x => x.font)) + 'px');
  T.ok('Stop is in reach throughout, at least 48 pixels, and the dial hidden', S.filter(x => x.t > tPlay + 300).every(x => x.stopH >= 48 && x.bandOp < 0.02), 'least ' + Math.min(...S.filter(x => x.t > tPlay + 300).map(x => x.stopH)));
  console.log('Play to the dial ' + ((tDone - tPlay) / 1000).toFixed(1) + 's');
  T.noErrors(); await T.done();
})().catch(e => { console.error(e); process.exit(2); });
