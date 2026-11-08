/* Living drawings for the Within page: the six portals, Shape of Emotion, the five pillars.
   Each draws a resting frame first, moves only when on screen, and keeps still for reduced motion. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function $(id) { return document.getElementById(id); }
  function f(n) { return n.toFixed(2); }
  var drawers = [];

  /* ---------- the six portals ---------- */
  var portals = $('portals');
  if (portals) (function () {
    var C = { x: 180, y: 160 }, P = {}, ring = {}, label = {};
    portals.querySelectorAll('circle[data-k]').forEach(function (c) {
      var k = c.getAttribute('data-k');
      P[k] = { x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }; ring[k] = c;
    });
    portals.querySelectorAll('text[data-k]').forEach(function (t) { label[t.getAttribute('data-k')] = t; });
    var pairs = [
      { lost: 'made', from: 'happened', say: 'Lost in what I’ve made of something…', q: 'What actually happened?' },
      { lost: 'ahead', from: 'matters', say: 'Racing ahead into what’s coming…', q: 'What matters?' }
    ];
    var you = $('p-you'), thread = $('p-thread'), centre = $('p-centre'), ripple = $('p-ripple'), cap = $('portal-cap');
    var capKey = '';
    function setCap(k, h) { if (k !== capKey) { capKey = k; cap.innerHTML = h; } }
    var CYCLE = 10;
    you.setAttribute('opacity', '1');
    drawers.push({ el: portals, draw: function (time) {
      var n = Math.floor(time / CYCLE) % pairs.length, t = time % CYCLE, pr = pairs[n], A = P[pr.lost], B = P[pr.from];
      centre.setAttribute('r', f(12 + 1.2 * Math.sin(time * 1.6)));
      for (var k in P) { ring[k].setAttribute('fill', 'var(--paper)'); label[k].setAttribute('fill', 'currentColor'); label[k].setAttribute('font-weight', '400'); }
      var out = ease(seg(t, 1.0, 2.6)), back = ease(seg(t, 5.6, 7.4)), x, y;
      if (t < 5.6) { x = C.x + (A.x - C.x) * out; y = C.y + (A.y - C.y) * out; }
      else { x = A.x + (C.x - A.x) * back; y = A.y + (C.y - A.y) * back; }
      if (t > 2.6 && t < 5.6) {
        var w = seg(t, 2.6, 3.2); x += Math.cos(time * 3.1) * 6 * w; y += Math.sin(time * 2.3) * 6 * w;
        ring[pr.lost].setAttribute('fill', 'var(--line-soft)'); label[pr.lost].setAttribute('font-weight', '600');
      }
      you.setAttribute('cx', f(x)); you.setAttribute('cy', f(y));
      var draw = ease(seg(t, 3.8, 4.8)), fade = 1 - seg(t, 6.4, 7.4);
      if (t > 3.8 && t < 7.4) {
        thread.setAttribute('opacity', f(.9 * fade));
        thread.setAttribute('x1', B.x); thread.setAttribute('y1', B.y);
        thread.setAttribute('x2', f(B.x + (x - B.x) * draw)); thread.setAttribute('y2', f(B.y + (y - B.y) * draw));
        ring[pr.from].setAttribute('fill', 'var(--accent)'); label[pr.from].setAttribute('fill', 'var(--accent)');
      } else thread.setAttribute('opacity', '0');
      var rp = seg(t, 7.4, 9.6);
      ripple.setAttribute('r', f(12 + 34 * rp)); ripple.setAttribute('opacity', f(rp > 0 ? (1 - rp) * .9 : 0));
      if (t < 1.0) setCap(n + 'a', '&nbsp;');
      else if (t < 3.8) setCap(n + 'b', pr.say);
      else if (t < 7.4) setCap(n + 'c', pr.say + ' <span class="q">' + pr.q + '</span>');
      else setCap(n + 'd', '…and back to the centre.');
    }, rest: 5.0 });
  })();

  /* ---------- Shape of Emotion ---------- */
  var shape = $('shape');
  if (shape) (function () {
    var blob = $('s-blob'), line = $('s-line'), scan = $('s-scan'), cap = $('shape-cap'), capKey = '';
    function setCap(k, h) { if (k !== capKey) { capKey = k; cap.innerHTML = h; } }
    function blobPath(cx, cy, R, spike, ph) {
      var N = 48, pts = [], i;
      for (i = 0; i < N; i++) {
        var a = i / N * Math.PI * 2;
        var r = R * (1 + spike * (.62 * Math.sin(7 * a + ph) + .38 * Math.sin(11 * a - ph * 1.3)) + .07 * Math.sin(3 * a + ph * .5));
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      var d = 'M ' + f(pts[0][0]) + ' ' + f(pts[0][1]);
      for (i = 0; i < N; i++) {
        var p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
        d += ' C ' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ', ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ', ' + f(p2[0]) + ' ' + f(p2[1]);
      }
      return d + ' Z';
    }
    var SC = 13;
    drawers.push({ el: shape, draw: function (time) {
      var t = time % SC, sc = seg(t, .2, 2.6);
      scan.setAttribute('y1', f(20 + sc * 180)); scan.setAttribute('y2', f(20 + sc * 180));
      scan.setAttribute('opacity', f(t > .2 && t < 2.8 ? .55 * Math.sin(Math.PI * sc) : 0));
      var appear = ease(seg(t, 1.4, 2.6)), soften = ease(seg(t, 6.0, 10.0));
      var spike = .5 - .42 * soften, R = Math.max(.1, (8 + 8 * appear) * (1 + .04 * Math.sin(time * (2.4 - 1.2 * soften))));
      var ph = time * (2.2 - 1.6 * soften), cy = 112 + 6 * soften;
      blob.setAttribute('d', blobPath(80, cy, R, spike, ph));
      blob.setAttribute('opacity', f(.88 * appear * (1 - seg(t, 12.2, 13))));
      var ln = seg(t, 3.0, 5.2);
      line.setAttribute('d', blobPath(80, cy, R + 5, spike * .8, ph));
      line.setAttribute('opacity', f(ln > 0 ? Math.min(1, ln * 2) * (1 - seg(t, 10.5, 12)) : 0));
      line.setAttribute('stroke-dasharray', ln < 1 ? f(4 * ln) + ' 3' : '4 3');
      if (t < 3.0) setCap('a', 'Find it in the body.');
      else if (t < 6.0) setCap('b', 'Give it a shape.');
      else if (t < 10.0) setCap('c', 'Work with the shape.');
      else setCap('d', '<span class="q">Somewhere to be.</span>');
    }, rest: 9.0 });
  })();

  /* ---------- the five pillars ---------- */
  var row = document.querySelector('.pillars');
  if (row) (function () {
    function q(p, c) { return row.querySelector('[data-p="' + p + '"] .' + c); }
    var spiral = q('think', 'pl-spiral'), think = q('think', 'pl-think'), wave = q('feel', 'pl-wave');
    var eight = q('move', 'pl-eight'), mover = q('move', 'pl-mover');
    var seed = q('grow', 'pl-seed'), stem = q('grow', 'pl-stem'), leafL = q('grow', 'pl-leafL'), leafR = q('grow', 'pl-leafR');
    var ra = q('relate', 'pl-a'), rao = q('relate', 'pl-ao'), rbo = q('relate', 'pl-bo'), lens = q('relate', 'pl-lens');
    var cx = 50, cy = 62, d = '', i;
    for (i = 0; i <= 120; i++) { var a = i / 120 * Math.PI * 5, r = 2 + i / 120 * 24; d += (i ? ' L ' : 'M ') + f(cx + r * Math.cos(a)) + ' ' + f(cy + r * Math.sin(a)); }
    spiral.setAttribute('d', d);
    var e = '';
    for (i = 0; i <= 80; i++) { var b = i / 80 * Math.PI * 2, s = Math.sin(b), c = Math.cos(b), den = 1 + s * s; e += (i ? ' L ' : 'M ') + f(cx + 34 * c / den) + ' ' + f(cy + 30 * s * c / den); }
    eight.setAttribute('d', e + ' Z');
    drawers.push({ el: row, draw: function (time) {
      think.setAttribute('transform', 'rotate(' + (time * 28 % 360).toFixed(1) + ' 50 62)');
      var w = '', A = 9 + 6 * Math.sin(time * .8), j;
      for (j = 0; j <= 60; j++) { var x = 17 + j / 60 * 66, env = Math.sin(Math.PI * j / 60); w += (j ? ' L ' : 'M ') + f(x) + ' ' + f(cy + A * env * Math.sin(j / 60 * Math.PI * 4 - time * 2.4)); }
      wave.setAttribute('d', w);
      var m = time * 1.3, ms = Math.sin(m), mc = Math.cos(m), md = 1 + ms * ms;
      mover.setAttribute('cx', f(cx + 34 * mc / md)); mover.setAttribute('cy', f(cy + 30 * ms * mc / md));
      var st = time % 9, g = ease(seg(st, 0, 4)), lf = ease(seg(st, 2.6, 5)), gone = seg(st, 8.2, 9);
      var sway = Math.sin(time * 1.4) * 4 * g, tx = 50 + sway, ty = 104 - 60 * g;
      stem.setAttribute('d', 'M 50 104 Q ' + f(50 - sway * .3) + ' ' + f(104 - 30 * g) + ' ' + f(tx) + ' ' + f(ty));
      var L = 16 * lf, H = 7 * lf;
      leafL.setAttribute('d', 'M ' + f(tx) + ' ' + f(ty + 8) + ' q ' + f(-L * .5) + ' ' + f(-H * 1.4) + ' ' + f(-L) + ' ' + f(-H * .2) + ' q ' + f(L * .5) + ' ' + f(H * 1.2) + ' ' + f(L) + ' ' + f(H * .2) + ' Z');
      leafR.setAttribute('d', 'M ' + f(tx) + ' ' + f(ty + 2) + ' q ' + f(L * .5) + ' ' + f(-H * 1.4) + ' ' + f(L) + ' ' + f(-H * .2) + ' q ' + f(-L * .5) + ' ' + f(H * 1.2) + ' ' + f(-L) + ' ' + f(H * .2) + ' Z');
      seed.setAttribute('opacity', f(1 - gone));
      var dd = 6 + 16 * (.5 + .5 * Math.cos(time * .9));
      ra.setAttribute('cx', f(50 - dd)); rao.setAttribute('cx', f(50 - dd));
      rbo.setAttribute('cx', f(50 + dd)); lens.setAttribute('cx', f(50 + dd));
    }, rest: 5.5 });
  })();

  if (!drawers.length) return;
  drawers.forEach(function (d) { d.draw(d.rest); d.on = true; });
  if (reduce) return;

  var held = false, clock = 0, last = 0;
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { drawers.forEach(function (d) { if (d.el === en.target) d.on = en.isIntersecting; }); });
  }) : null;
  drawers.forEach(function (d) { if (io) io.observe(d.el); });
  function frame(now) {
    var dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
    if (!held && !document.hidden) {
      clock += dt;
      drawers.forEach(function (d) { if (d.on) d.draw(clock + d.rest); });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  var btn = document.querySelector('[data-living-pause]');
  if (btn) btn.addEventListener('click', function () {
    held = !held; btn.setAttribute('aria-pressed', String(held));
    btn.textContent = held ? 'Let the drawings move' : 'Hold the drawings still';
  });
})();
