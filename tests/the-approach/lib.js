// Shared by the check suites of The Approach page (film:the-approach 6.6, 6.7, 6.72, 6.8, 6.82 on pscale).
// Headless Chrome through playwright-core (or playwright). APPROACH_CHANNEL=none uses Playwright's own Chromium.
'use strict';
let chromium; try { chromium = require('playwright-core').chromium; } catch (e) { chromium = require('playwright').chromium; }
const fs = require('fs'), path = require('path');

const SIZES = { phone: { width: 390, height: 844, touch: true }, desktop: { width: 1440, height: 900, touch: false },
  small: { width: 360, height: 640, touch: true }, tall: { width: 412, height: 740, touch: true } };   // the two small phones the opening's long line is checked at (6.9)

// What the page sounds, noted as it is asked for (o.sound): every pip (its pitch and the moment it sounds) and every recorded sound
// (its length, when it starts, when it is told to stop). Nothing is changed; the page plays as it would.
const SOUND = `(() => { window.__snd = { osc: [], buf: [] };
  const wall = (ctx, when) => Date.now() + Math.max(0, (when || 0) - ctx.currentTime) * 1000;
  if (window.OscillatorNode) { const s = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function (when) { try { window.__snd.osc.push({ f: Math.round(this.frequency.value), t: Math.round(wall(this.context, when)) }); } catch (e) {} return s.apply(this, arguments); }; }
  if (window.AudioBufferSourceNode) { const s = AudioBufferSourceNode.prototype.start, p = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (when) { try { this.__r = { d: this.buffer ? +this.buffer.duration.toFixed(2) : 0, loop: !!this.loop, t: Math.round(wall(this.context, when)), stop: 0 }; window.__snd.buf.push(this.__r); } catch (e) {} return s.apply(this, arguments); };
    AudioBufferSourceNode.prototype.stop = function (when) { try { if (this.__r && !this.__r.stop) this.__r.stop = Math.round(wall(this.context, when)); } catch (e) {} return p.apply(this, arguments); }; }
})();`;
// the page's own ten digits for a moment (film:the-approach 1.78 (3)), worked out apart from the page
function sundial(ms) {
  const t = new Date(ms), h = t.getUTCHours() + t.getUTCMinutes() / 60 + t.getUTCSeconds() / 3600 + t.getUTCMilliseconds() / 3.6e6;
  const g = Math.min(8, Math.floor(h / (24 / 9))), b = Math.min(8, Math.floor((h - g * 24 / 9) / (24 / 81))), m = t.getUTCMonth(), d = t.getUTCDate();
  return String(t.getUTCFullYear()) + (Math.floor(m / 3) + 1) + (m % 3 + 1) + (Math.floor((d - 1) / 7) + 1) + ((d - 1) % 7 + 1) + (g + 1) + (b + 1);
}
// The retelling (film:the-approach 1.72, 6.9): what the film tells, in order
const STORY = {
  opening: 'o1 o2 o3 o3a whisper o3b o4 o5 o6 o7 o8 o9',
  nar: 'r1 r2 r2b r3 r3b r4a r4 r5 r5b r5c r6 r6b r6c r7 r7b r8 r8b e1 e1b',
  clips: 'station address chip mara_asks tom_answer numbers dawn nights seasons helper archive voice summer shes_home gate_night',
  ending: 'e1c keep e2', stops: 8,
  drift: ['Something is talking over her. She has moved along the dial. Find her again.', 'She has been talked over again. Find her.', 'She has been talked over again. Find her.',
    'She has been talked over again. Find her.', 'She has been talked over again. Find her.', 'The numbers have stopped.', 'Tom’s radio is on, at the far end of the dial.'],
  cap: { station: "Mara: ‘Wait. That's not noise. It repeats. Those are numbers. Somebody made this.’", address: "Mara: ‘Ten digits isn't a message, Dad. It's an address.’", chip: '',
    mara_asks: "Mara: ‘What do I do if you go away again in your head?’", tom_answer: "Tom: ‘Send me our summer, at the gate. If I get lost, that will find me.’",
    numbers: "Mara: ‘If it talks like me, it isn't me. Numbers only, Dad.’  Tom: ‘Numbers only. I'm forgetful, love, not daft.’", dawn: '', nights: "Tom: ‘Night one. Nothing.’", seasons: '',
    helper: "‘I can't sleep.’  ‘I'm here, Mara. Tell me everything.’", archive: "The Archive: ‘Bring your books. We will keep them for you. Whole. Forever.’",
    voice: "The radio, in Mara's voice: ‘Dad, it's me. Take the chip down to the pier. They'll keep it safe.’  Tom: ‘Numbers only.’",
    summer: '2048 · summer · July · the third week · Thursday · late afternoon · the gate', shes_home: "Tom: ‘The gate. The dog. She's home.’", gate_night: '' },
};

function args() {
  const a = process.argv.slice(2), o = { url: 'http://127.0.0.1:8770/the-approach/', size: 'phone', shots: null };
  for (let i = 0; i < a.length; i++) { if (a[i] === '--url') o.url = a[++i]; else if (a[i] === '--size') o.size = a[++i]; else if (a[i] === '--shots') o.shots = a[++i]; }
  if (o.shots) fs.mkdirSync(o.shots, { recursive: true });
  return o;
}

async function open(o) {
  const sz = SIZES[o.size];
  const browser = await chromium.launch({ channel: process.env.APPROACH_CHANNEL === 'none' ? undefined : (process.env.APPROACH_CHANNEL || 'chrome'), headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const ctx = await browser.newContext({ viewport: { width: sz.width, height: sz.height }, hasTouch: sz.touch, isMobile: sz.touch, deviceScaleFactor: sz.touch ? 2 : 1 });
  const page = await ctx.newPage();
  const errors = [], missing = [], failed = [];
  page.on('console', m => { if (m.type() === 'error' && !/gc\.zgo\.at|goatcounter/.test((m.location() || {}).url || '')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => { if (!/gc\.zgo\.at|goatcounter|ERR_ABORTED/.test(r.url() + (r.failure() ? r.failure().errorText : ''))) failed.push(r.url() + ' ' + (r.failure() ? r.failure().errorText : '')); const u = r.url(); if (!/goatcounter|gc\.zgo/.test(u) && !/ERR_ABORTED/.test(r.failure() ? r.failure().errorText : '')) missing.push('failed ' + u + ' ' + (r.failure() ? r.failure().errorText : '')); });
  // the visit counter is never reached from a check, so a check is never counted as a visit
  await ctx.route(/gc\.zgo\.at|goatcounter\.com/, r => r.abort());
  if (o.sound) await ctx.addInitScript(SOUND);
  if (o.init) await ctx.addInitScript(o.init);   // a check may watch from inside the page before it loads (begin.js meters the sound)
  for (let i = 0; ; i++) { try { await page.goto(o.url, { waitUntil: 'load' }); break; } catch (e) { if (i >= 4) throw e; missing.length = 0; failed.length = 0; errors.length = 0; await new Promise(r => setTimeout(r, 3000)); } }   // a dropped connection is tried again
  const T = {
    browser, page, errors, missing, size: sz, o, results: [],
    st: () => page.evaluate(() => window.theApproach.state()),
    log: () => page.evaluate(() => window.theApproach.log()),
    ev: (fn, arg) => page.evaluate(fn, arg),
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    shot: async name => { if (o.shots) await page.screenshot({ path: path.join(o.shots, o.size + '-' + name + '.png') }); },
    ok: (name, cond, detail) => { T.results.push({ name, pass: !!cond, detail: detail === undefined ? '' : String(detail) }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '   [' + detail + ']' : '')); },
    until: async (fn, ms, arg, every) => { const t0 = Date.now(); for (;;) { const v = await page.evaluate(fn, arg); if (v) return v; if (Date.now() - t0 > ms) return null; await T.sleep(every || 100); } },
    tap: async sel => { await page.locator(sel).click(); },
    tapAt: async (x, y) => { if (sz.touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); },
    done: async () => {
      const f = T.results.filter(r => !r.pass);
      console.log('\n' + o.size + ': ' + (T.results.length - f.length) + ' of ' + T.results.length + ' passed' + (f.length ? '; FAILED: ' + f.map(r => r.name).join(' | ') : ''));
      await browser.close(); process.exitCode = f.length ? 1 : 0;
    },
    noErrors: () => { T.ok('no console errors', T.errors.length === 0, T.errors.slice(0, 3).join(' // ') + (failed.length ? ' ## failed requests: ' + failed.slice(0, 4).join(' , ') : '')); T.ok('no missing files', T.missing.length === 0, T.missing.slice(0, 3).join(' // ')); },
  };
  return T;
}
module.exports = { open, args, SIZES, STORY, sundial };
