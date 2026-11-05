/* The pages in a browser, on the nonsense words: every page in light and dark, at desktop and phone
 * width with no sideways scroll, and with script off. Also the holding page.
 *
 *   node tests/layout.js [--shots DIR]
 *
 * It needs Playwright with Chromium. Every call to the beach and to happyseaurchin.com is answered
 * here with empty test answers, and any write is stopped and counted as a failure: a test never posts
 * to the room or makes a name on the beach.
 */
'use strict';
const { chromium } = require('playwright');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.dirname(__dirname);
const ROOT = '/matthewbushell.life';
const PAGES = ['/', '/story', '/now', '/places', '/writing', '/digital', '/hello', '/support'];
const WIDTHS = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } };
const shotsAt = process.argv.indexOf('--shots');
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;

function made(root, empty) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'life-work-layout-'));
  const out = path.join(dir, 'site');
  if (empty) {
    execFileSync('python3', ['-c', [
      'import sys, json; sys.path.insert(0, "tests"); import fixture',
      'r = fixture.Run(); r.out = sys.argv[1]; r(fixture.blocks(yes=[]), root=sys.argv[2]); r.close()'].join('\n'), out, root], { cwd: REPO });
  } else {
    execFileSync('python3', [path.join('tests', 'fixture.py'), out, root], { cwd: REPO });
  }
  return out;
}

function serve(folder, root) {
  return new Promise((resolve, reject) => {
    const p = spawn('python3', ['-c', [
      'import sys; sys.path.insert(0, "tools"); import serve',
      's = serve.server(sys.argv[1], sys.argv[2], 0); print(s.server_address[1], flush=True); s.serve_forever()'].join('\n'), folder, root], { cwd: REPO });
    p.stdout.once('data', d => resolve({ port: Number(String(d).trim()), stop: () => p.kill() }));
    p.on('error', reject);
  });
}

async function stub(context, writes) {
  await context.route(/beach\.happyseaurchin\.com|happyseaurchin\.com\/api|mirror\.onen\.ai|goatcounter/, route => {
    const req = route.request();
    if (req.method() !== 'GET' && req.method() !== 'HEAD') { writes.push(req.method() + ' ' + req.url()); return route.abort(); }
    const u = req.url();
    let body = {};
    if (/api\/mirrors/.test(u)) body = { mirrors: {}, touched: {} };
    else if (/block=pool%3Alife-work|block=pool:life-work/.test(u)) body = { _: 'The room, for the tests.' };
    else if (/pscale-beach$/.test(u)) body = { blocks: [], touched: {} };
    else return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function check(browser, base, page, scheme, width, js, writes, failures) {
  const context = await browser.newContext({ viewport: WIDTHS[width], colorScheme: scheme, javaScriptEnabled: js, deviceScaleFactor: 1 });
  await stub(context, writes);
  const tab = await context.newPage();
  const errors = [];
  tab.on('pageerror', e => errors.push(String(e)));
  tab.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|fonts\.g/.test(m.text())) errors.push(m.text()); });
  const label = `${page} ${scheme} ${width} ${js ? 'script on' : 'script off'}`;
  const res = await tab.goto(base + (page === '/' ? '/' : page), { waitUntil: 'load' });
  if (!res || res.status() !== 200) failures.push(`${label}: status ${res && res.status()}`);
  await tab.waitForTimeout(js ? 250 : 50);
  const m = await tab.evaluate(() => {
    const doc = document.documentElement;
    const wide = [];
    document.querySelectorAll('body *').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width && (r.right > doc.clientWidth + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed') {
        let p = e, hidden = false;
        while (p && p !== document.body) { const s = getComputedStyle(p); if (s.overflowX === 'hidden' || s.overflow === 'hidden' || s.display === 'none') { hidden = true; break; } p = p.parentElement; }
        if (!hidden && !e.closest('svg')) wide.push((e.className && e.className.baseVal === undefined ? e.className : e.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
      }
    });
    return {
      sideways: doc.scrollWidth > doc.clientWidth + 1,
      scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth,
      wide: wide.slice(0, 5),
      ground: getComputedStyle(document.body).backgroundColor,
      ink: getComputedStyle(document.querySelector('.ground') || document.body).color,
      text: document.body.innerText.length,
      tools: document.querySelectorAll('.tools .share').length,
      toolsShown: Array.from(document.querySelectorAll('.tools,[data-tool]')).some(e => getComputedStyle(e).display !== 'none' && e.offsetHeight > 0),
      sealed: /Encrypted \(gray\)/.test(document.body.innerText),
    };
  });
  if (m.sideways) failures.push(`${label}: sideways scroll, ${m.scrollWidth} wide in ${m.clientWidth}: ${m.wide.join('; ')}`);
  if (m.sealed) failures.push(`${label}: shows a sealed line`);
  if (m.text < 40) failures.push(`${label}: hardly any words (${m.text})`);
  const dark = scheme === 'dark';
  const g = m.ground.match(/\d+/g).map(Number);
  const isDark = g[0] + g[1] + g[2] < 200;
  if (isDark !== dark) failures.push(`${label}: the ground is ${m.ground}, not ${scheme}`);
  if (!js && m.toolsShown) failures.push(`${label}: the tools show with script off`);
  if (js && page !== '/support' && m.tools === 0 && page !== '/hello') failures.push(`${label}: no Share on the drawings`);
  if (errors.length) failures.push(`${label}: ${errors.join(' | ')}`);
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    const name = (page === '/' ? 'home' : page.slice(1)) + `-${scheme}-${width}-${js ? 'js' : 'nojs'}.png`;
    await tab.screenshot({ path: path.join(SHOTS, name), fullPage: true });
  }
  await context.close();
  return m;
}

(async () => {
  const failures = [], writes = [];
  const browser = await chromium.launch();
  let count = 0;
  for (const [empty, pages] of [[false, PAGES], [true, ['/']]]) {
    const folder = made(ROOT, empty);
    const srv = await serve(folder, ROOT);
    const base = `http://127.0.0.1:${srv.port}${ROOT}`;
    try {
      for (const page of pages) for (const scheme of ['light', 'dark']) for (const width of Object.keys(WIDTHS)) for (const js of [true, false]) {
        if (empty) {
          const ctx = await browser.newContext({ viewport: WIDTHS[width], colorScheme: scheme, javaScriptEnabled: js });
          const tab = await ctx.newPage();
          await tab.goto(base + '/');
          const t = await tab.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' ').trim(), sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
          if (t.text !== 'Matthew Bushell This house is still being built.') failures.push(`holding ${scheme} ${width}: says ${JSON.stringify(t.text)}`);
          if (t.sideways) failures.push(`holding ${scheme} ${width}: sideways scroll`);
          if (SHOTS && js) await tab.screenshot({ path: path.join(SHOTS, `holding-${scheme}-${width}.png`) });
          await ctx.close();
        } else {
          await check(browser, base, page, scheme, width, js, writes, failures);
        }
        count++;
      }
    } finally {
      srv.stop();
    }
  }
  // the way in: picking "I've been here" and back again, and the card answering the name, with no write
  {
    const folder = made(ROOT, false);
    const srv = await serve(folder, ROOT);
    const ctx = await browser.newContext({ viewport: WIDTHS.phone, colorScheme: 'light' });
    await stub(ctx, writes);
    const tab = await ctx.newPage();
    await tab.goto(`http://127.0.0.1:${srv.port}${ROOT}/hello`);
    const door = tab.locator('[data-tool="door"]');
    await door.locator('input.field').first().fill('Lorem Test');
    const card = await door.locator('.card .hand').innerText();
    if (card !== 'Lorem Test') failures.push(`the card shows ${JSON.stringify(card)}, not the name typed`);
    const words = (await door.locator('input.field').nth(1).inputValue()).split(' ');
    if (words.length !== 3) failures.push(`"I'm new" proposes ${words.length} words`);
    await door.locator('.pick').nth(1).click();
    if (await door.locator('.pick').nth(1).getAttribute('aria-pressed') !== 'true') failures.push(`"I've been here" doesn't press`);
    if (await door.locator('input.field').nth(1).inputValue() !== '') failures.push(`"I've been here" keeps proposed words`);
    // a box opens, and saying nothing says so, without a write
    await tab.goto(`http://127.0.0.1:${srv.port}${ROOT}/story`);
    await tab.locator('.tools summary').first().click();
    await tab.locator('.tools .say-form button[type=submit]').first().click();
    const said = await tab.locator('.tools .say-status').first().innerText();
    if (said !== 'Write something first.') failures.push(`an empty box says ${JSON.stringify(said)}`);
    const line = await tab.locator('.tools .boxline').first().innerText();
    if (!line) failures.push('the box has no line from The doors beside it');
    if (!(await tab.locator('.tools .boxline a[href$="/support"]').count())) failures.push('the box has no Finding support beside it');
    await ctx.close();
    srv.stop();
  }
  await browser.close();
  if (writes.length) failures.push('a test tried to write: ' + writes.join(', '));
  console.log(`${count} page views checked.`);
  if (failures.length) {
    console.log(failures.join('\n'));
    process.exit(1);
  }
  console.log('All well: no sideways scroll, light and dark, phone and desktop, with script on and off.');
})().catch(e => { console.error(e); process.exit(1); });
