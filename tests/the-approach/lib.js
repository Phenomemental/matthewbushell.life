// Shared by the check suites of The Approach page (film:the-approach 6.6, 6.7, 6.72, 6.8, 6.82 on pscale).
// Headless Chrome through playwright-core (or playwright). APPROACH_CHANNEL=none uses Playwright's own Chromium.
'use strict';
let chromium; try { chromium = require('playwright-core').chromium; } catch (e) { chromium = require('playwright').chromium; }
const fs = require('fs'), path = require('path');

const SIZES = { phone: { width: 390, height: 844, touch: true }, desktop: { width: 1440, height: 900, touch: false } };

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
module.exports = { open, args, SIZES };
