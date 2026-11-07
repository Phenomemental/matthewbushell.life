/* tools.js — the reader tools on www.matthewbushell.life.
 *
 * Taken from Phenomemental/happyseaurchin-beach three-calm-days.html (2026-10-27c), not rebuilt:
 * shareButton, readMirrors, voicesAt and the voice box (voiceBlock, sayAt), and the set-aside (heard),
 * wired to this site's hooks: .tools[data-share][data-comment-at] under each drawing, [data-tool="note"]
 * for the note box on Say hello, and [data-tool="door"] for the way in and the card.
 *
 * What changed from the copy: a sealed line in a mirror or the room is passed by, never shown (the older
 * helpers printed it); the set-aside comes from spine:life-work 7.3, baked into the page by the generator;
 * every box carries the line from The doors and Finding support beside it.
 *
 * Only these tools and the clock are live on the page. The site's own words are never redrawn here.
 */
(function () {
  'use strict';
  var cfgEl = document.getElementById('life-work');
  if (!cfgEl) return;
  var CFG = JSON.parse(cfgEl.textContent);
  var FAM = CFG.family, POOL = CFG.pool;
  var WIRE = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var MIRRORS = 'https://happyseaurchin.com/api/mirrors?family=' + FAM;
  var Door = window.Door, Beach = window.Beach;

  function esc(s) { var d = document.createElement('span'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fold(v) { return String(v || '').toLowerCase().replace(/[\s_-]+/g, ''); }
  function sealed(n) { return !!n && typeof n === 'object' && n['9'] && typeof n['9'] === 'object' && n['9']._ === 'gray'; }
  function when(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }

  /* the line beside every box, from The doors, with Finding support (baked in by the generator) */
  function boxLine() {
    var t = document.getElementById('tool-words');
    return t && t.content && t.content.firstElementChild ? t.content.firstElementChild.cloneNode(true) : el('p', 'boxline');
  }

  /* voices set aside on Matthew's word (spine:life-work 7.3): their words stay in the reader's own place;
     this site only passes them by, never showing or counting them */
  var ASIDE = {}, SLOTS = {};
  ((CFG.aside && CFG.aside.voices) || []).forEach(function (k) { ASIDE[k] = true; });
  ((CFG.aside && CFG.aside.slots) || []).forEach(function (k) { SLOTS[k] = true; });
  function heard(who, addr) { return !ASIDE[fold(who) + '@' + addr]; }

  /* ── reading ── */
  function get(block) {
    return fetch(WIRE + (block ? '?block=' + encodeURIComponent(block) : ''), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.status === 404 ? null : r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); });
  }
  function nodeAt(b, addr) {
    var n = b, ds = String(addr).replace('.', '').split('');
    for (var i = 0; i < ds.length; i++) { if (!n || typeof n !== 'object' || sealed(n)) return undefined; n = n[ds[i]]; }
    return n;
  }
  function lineOf(mirror, addr) {
    var n = nodeAt(mirror, addr);
    if (sealed(n)) return '';
    return typeof n === 'string' ? n.trim() : (n && typeof n === 'object' && typeof n._ === 'string' ? n._.trim() : '');
  }

  /* ── the voices: each reader's words in their own mirror, life-work:<name>, at the place they speak to ── */
  var VOICES = {}, TOUCHED = {};
  function readMirrors() {
    return fetch(MIRRORS, { headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; }).then(function (d) {
      if (d && d.mirrors) { TOUCHED = d.touched || {}; return d.mirrors; }
      /* where the site's shared read can't be had, the beach read straight */
      return get('').then(function (ix) {
        var names = ((ix && ix.blocks) || []).map(function (b) { return typeof b === 'string' ? b : (b && b.name) || ''; })
          .filter(function (n) { return n.indexOf(FAM + ':') === 0 && n.indexOf(':', FAM.length + 1) < 0; });
        var out = {}, t = (ix && ix.touched) || {};
        TOUCHED = {};
        names.forEach(function (n) { if (t[n]) TOUCHED[n.slice(FAM.length + 1)] = t[n]; });
        return Promise.all(names.map(function (n) { return get(n).then(function (b) { if (b) out[n.slice(FAM.length + 1)] = b; }, function () {}); })).then(function () { return out; });
      });
    }).then(function (m) {
      var me = Door && Door.me();
      if (!me) return m;
      /* the person's own mirror always read fresh */
      return get(FAM + ':' + me.name).then(function (own) { if (own) m[me.name] = own; return m; }, function () { return m; });
    });
  }
  /* newest first, by when each reader last wrote, the reader's own first */
  function voicesAt(addr) {
    var me = Door && Door.me(), out = [];
    Object.keys(VOICES).forEach(function (h) {
      var t = lineOf(VOICES[h], addr);
      if (t && heard(h, addr)) out.push({ who: h, t: t, you: !!(me && me.name === h), when: Date.parse(TOUCHED[h] || '') || 0 });
    });
    return out.sort(function (a, b) { return (b.you - a.you) || (b.when - a.when) || a.who.localeCompare(b.who); });
  }
  function paintVoices() {
    document.querySelectorAll('.voices[data-at]').forEach(function (v) {
      var list = voicesAt(v.dataset.at), ul = v.querySelector('.said');
      ul.innerHTML = list.map(function (x) {
        return '<li><b>' + esc(x.who) + '</b>' + (x.you ? ' <span class="you">(you)</span>' : '') + ' · ' + esc(x.t) + '</li>';
      }).join('');
      ul.hidden = !list.length;
      var c = v.querySelector('.say-count');
      if (c) c.textContent = list.length ? (list.length === 1 ? '· one voice' : '· ' + list.length + ' voices') : '';
    });
  }
  function refreshVoices() { return readMirrors().then(function (m) { VOICES = m || {}; paintVoices(); }, function () {}); }
  function paintAs() {
    var me = Door && Door.me();
    document.querySelectorAll('.say-as').forEach(function (s) {
      s.innerHTML = me ? 'as <strong>' + esc(me.name) + '</strong>' : 'You’ll choose a name first, or come in with yours.';
    });
  }

  /* ── Share, on each drawing ── */
  function shareButton(row, id, title) {
    var b = el('button', 'share', 'Share'); b.type = 'button';
    b.setAttribute('aria-label', 'Share' + (title ? ': ' + title : ''));
    var note = el('span', 'share-note'); note.setAttribute('role', 'status');
    row.appendChild(note); row.appendChild(b);
    b.addEventListener('click', function () {
      var url = location.origin + location.pathname + (id ? '#' + id : ''), t = title || document.title;
      var say = function (x) { note.textContent = x; setTimeout(function () { note.textContent = ''; }, 2600); };
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { navigator.share({ title: t, url: url }).catch(function () {}); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(function () { say('Link copied'); }, function () { say(url); }); return; }
      say(url);
    });
  }

  /* ── saying something at a place: with no name yet, the door opens first, then the words go ── */
  function sayAt(at, text, st) {
    st.textContent = 'Saying it…';
    return (Door.me() ? Promise.resolve() : Door.name().then(function () { return refreshVoices(); }))
      .then(function () { return Door.say({ family: FAM, at: at, text: text }); }, function () { return { ok: false, why: 'closed' }; })
      .then(function (r) {
        if (!r.ok) {
          st.textContent = r.why === 'closed' ? '' : r.why === 'key' ? 'Those aren’t the words your name here is kept under. Choose “not you?” and come in again.' : 'That didn’t get through. Please try again in a moment.';
          return r;
        }
        st.textContent = 'Said, under the name ' + r.name + '.';
        return refreshVoices().then(function () { return r; });
      });
  }
  /* a say box at an address, folded, with the voices there beneath it */
  function voiceBlock(mount, at) {
    var id = 'say-' + at.replace(/\./g, '-');
    var wrap = el('div', 'voices'); wrap.dataset.at = at;
    var det = el('details', 'say');
    var sum = el('summary'); sum.appendChild(document.createTextNode('+ Say something ')); sum.appendChild(el('span', 'say-count'));
    var f = el('form', 'say-form'); f.noValidate = true;
    var lab = el('label', 'sr', 'Say something'); lab.htmlFor = id;
    var box = el('textarea', 'field'); box.id = id; box.maxLength = 2000; box.rows = 3;
    var row = el('div', 'say-row'), send = el('button', 'btn solid', 'Say it'); send.type = 'submit';
    row.appendChild(send); row.appendChild(el('span', 'say-as'));
    var st = el('p', 'say-status'); st.setAttribute('role', 'status');
    [lab, box, row, boxLine(), st].forEach(function (x) { f.appendChild(x); });
    det.appendChild(sum); det.appendChild(f);
    wrap.appendChild(det);
    var ul = el('ul', 'said'); ul.hidden = true; wrap.appendChild(ul);
    mount.appendChild(wrap);
    var clear = Door.keepDraft(box, FAM + ':' + at);
    if (box.value) det.open = true;
    Door.mic(box);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var t = box.value.trim().replace(/\s+/g, ' ');
      if (!t) { st.textContent = 'Write something first.'; box.focus(); return; }
      send.disabled = true;
      sayAt(at, t, st).then(function (r) { send.disabled = false; if (r && r.ok) { clear(); box.value = ''; } });
    });
    return wrap;
  }

  document.querySelectorAll('.tools[data-comment-at]').forEach(function (t) {
    var at = t.getAttribute('data-comment-at');
    var row = el('div', 'tools-row');
    t.appendChild(row);
    if (Door && Door.say) voiceBlock(row, at);
    if (t.hasAttribute('data-share')) {
      var s = el('span', 'share-wrap');
      row.appendChild(s);
      shareButton(s, t.id, document.title);
    }
  });

  /* ── the note box on Say hello: it writes to the room, pool:life-work, with no key ── */
  function poolNotes(pool) {
    var out = [];
    (function walk(node, addr) {
      if (!node || typeof node !== 'object' || sealed(node)) return;
      if (node._ && typeof node._ === 'object') walk(node._, addr);
      for (var d = 1; d <= 9; d++) {
        var e = node[String(d)], a = addr + d;
        if (!e || sealed(e)) continue;
        if (typeof e === 'object' && typeof e._ === 'string' && typeof e['3'] === 'string') {
          if (e._.trim() && !SLOTS[a]) out.push({ who: typeof e['1'] === 'string' && e['1'].length <= 60 ? e['1'] : '', when: e['3'], text: e._ });
        } else if (typeof e === 'object') walk(e, a);
      }
    })(pool, '');
    return out;
  }
  document.querySelectorAll('[data-tool="note"]').forEach(function (form) {
    var box = form.querySelector('textarea'), send = form.querySelector('button');
    var ROOM = form.getAttribute('data-pool') || POOL;  /* a form may write to another room, such as the book's */
    var line = form.querySelector('.boxline');
    if (line && !line.querySelector('a[href$="/support"]')) {
      var fs = boxLine().querySelector('a[href$="/support"]');
      if (fs) { line.appendChild(document.createTextNode(' ')); line.appendChild(fs); }
    }
    var st = el('p', 'say-status'); st.setAttribute('role', 'status');
    form.insertBefore(st, line);
    /* the notes already left fold away under one line; a tap opens them */
    var fold = document.createElement('details'); fold.className = 'fold'; fold.hidden = true;
    var head = document.createElement('summary'); fold.appendChild(head);
    var list = el('ul', 'said notes'); fold.appendChild(list);
    form.parentNode.insertBefore(fold, form.nextSibling);
    function paint(open) {
      get(ROOM).then(function (pool) {
        var notes = poolNotes(pool);
        list.innerHTML = notes.map(function (n) {
          return '<li><b>' + esc(n.who || 'a visitor') + '</b>' + (when(n.when) ? ' · ' + esc(when(n.when)) : '') + '<br>' + esc(n.text) + '</li>';
        }).join('');
        head.textContent = notes.length === 1 ? 'Read the one note left so far' : 'Read the ' + notes.length + ' notes left so far';
        fold.hidden = !notes.length;
        if (open) fold.open = true;
      }, function () {});
    }
    var clear = Door ? Door.keepDraft(box, ROOM) : function () {};
    if (Door) Door.mic(box);
    function go(ev) {
      if (ev) ev.preventDefault();
      var t = box.value.trim();
      if (!t) { st.textContent = 'Write something first.'; box.focus(); return; }
      if (!Beach || !Beach.postNote) { st.textContent = 'That didn’t get through. Please try again in a moment.'; return; }
      var me = Door && Door.me();
      send.disabled = true; st.textContent = 'Sending…';
      Beach.postNote(ROOM, me ? me.name : 'a visitor', t).then(function () {
        clear(); box.value = ''; st.textContent = 'Sent. Anyone can read it.'; paint(true);
      }, function () { st.textContent = 'That didn’t get through. Please try again in a moment.'; })
        .then(function () { send.disabled = false; });
    }
    send.addEventListener('click', go);
    form.addEventListener('submit', go);
    paint();
  });

  /* ── the way in, laid out in the page's own look: a name, three words, and the card ── */
  document.querySelectorAll('[data-tool="door"]').forEach(function (root) {
    if (!Door || !Door.inline) { root.hidden = true; return; }
    var I = Door.inline, SAY = I.SAY;
    var picks = root.querySelectorAll('.pick'), inputs = root.querySelectorAll('input.field');
    var nameIn = inputs[0], wordsIn = inputs[1];
    var card = root.querySelector('.card'), top = card.querySelector('.top'), hand = card.querySelector('.hand'), wordsEl = card.querySelector('.words');
    var emptyName = hand.textContent, emptyWords = wordsEl.textContent, topNew = top.textContent;
    nameIn.maxLength = 32; nameIn.autocomplete = 'username'; nameIn.setAttribute('autocapitalize', 'words'); nameIn.spellcheck = false;
    wordsIn.spellcheck = false; wordsIn.setAttribute('autocapitalize', 'none'); wordsIn.setAttribute('autocorrect', 'off');

    var more = el('div', 'door-inline');
    var other = el('button', 'door-link', '↻ other words'); other.type = 'button';
    function tick(label) { var w = el('label', 'door-tick'), i = el('input'); i.type = 'checkbox'; w.appendChild(i); w.appendChild(document.createTextNode(' ' + label)); return { box: w, input: i }; }
    var adult = tick('I am 18 or over'), rem = tick('Remember me on this ' + I.DEVICE);
    rem.input.checked = true;
    var go = el('button', 'btn solid', 'Come in'); go.type = 'button';
    var small = el('p', 'door-note');
    var st = el('p', 'say-status'); st.setAttribute('role', 'status');
    var keep = el('div', 'door-keep'); keep.hidden = true;
    var lost = el('p', 'door-note');
    var lostA = el('a', null, 'I’ve lost my words'); lostA.href = I.LOST; lostA.rel = 'noopener'; lost.appendChild(lostA);
    [other, adult.box, rem.box, go, small, st, keep, lost].forEach(function (x) { more.appendChild(x); });
    card.parentNode.insertBefore(more, card);
    var who = el('p', 'door-who'); who.hidden = true; root.insertBefore(who, root.firstChild);

    var mode = 'new', proposed = null;
    function paintCard() {
      hand.textContent = I.cleanName(nameIn.value) || emptyName;
      wordsEl.textContent = wordsIn.value.trim() || emptyWords;
    }
    function setMode(m) {
      mode = m;
      picks.forEach(function (b, i) { b.setAttribute('aria-pressed', String((i === 0) === (m === 'new'))); });
      st.textContent = ''; keep.hidden = true;
      if (m === 'new') {
        try { proposed = I.threeWords(); } catch (e) { proposed = null; }
        wordsIn.value = proposed ? proposed.join(' ') : ''; wordsIn.readOnly = true;
        wordsIn.autocomplete = 'new-password';
        other.hidden = false; adult.box.hidden = false; lost.hidden = true;
        top.textContent = topNew;
        small.textContent = 'These three words are the only key to your name. Nobody can look them up for you, so keep them somewhere safe. ' + (Door.PUBLIC || '');
      } else {
        wordsIn.value = ''; wordsIn.readOnly = false; wordsIn.autocomplete = 'current-password';
        other.hidden = true; adult.box.hidden = true; lost.hidden = false;
        top.textContent = 'Welcome back';
        small.textContent = SAY.back;
      }
      paintCard();
    }
    other.addEventListener('click', function () { setMode('new'); });
    picks.forEach(function (b, i) { b.addEventListener('click', function () { setMode(i === 0 ? 'new' : 'back'); }); });
    nameIn.addEventListener('input', paintCard);
    wordsIn.addEventListener('input', paintCard);

    function signedIn(m, heading) {
      who.hidden = false; who.textContent = '';
      who.appendChild(document.createTextNode((heading || 'You are') + ' '));
      who.appendChild(el('strong', null, m.name));
      who.appendChild(document.createTextNode(' on this ' + I.DEVICE + ' · '));
      var out = el('button', 'door-link', 'not you?'); out.type = 'button';
      out.addEventListener('click', function () { Door.forget(); who.hidden = true; nameIn.value = ''; setMode('new'); paintAs(); refreshVoices(); });
      who.appendChild(out);
      hand.textContent = m.name;
    }

    go.addEventListener('click', function () {
      if (mode === 'new') {
        if (!proposed) { st.textContent = 'The word list didn’t load. Please reload the page.'; return; }
        if (I.cleanName(nameIn.value).length < 2) { st.textContent = SAY.short; nameIn.focus(); return; }
        if (!adult.input.checked) { st.textContent = SAY.adult; adult.input.focus(); return; }
        go.disabled = true; st.textContent = 'One moment…';
        I.signUp(nameIn.value, proposed.join('-')).then(function (r) {
          go.disabled = false;
          if (!r.ok) { st.textContent = SAY[r.why] || SAY.beach; return; }
          var m = Door.enter({ name: r.name, words: r.words }, rem.input.checked);
          st.textContent = 'You’re ' + m.name + '. These three words are the only key to your name. Keep them somewhere safe.';
          signedIn(m);
          keep.textContent = ''; keep.hidden = false;
          var pw = el('button', 'btn', 'Save to my ' + I.DEVICE + '’s passwords'); pw.type = 'button';
          var pic = el('button', 'btn', 'Save the card'); pic.type = 'button'; pic.disabled = true;
          var kst = el('p', 'say-status'); kst.setAttribute('role', 'status');
          keep.appendChild(pw); keep.appendChild(pic); keep.appendChild(kst);
          pw.addEventListener('click', function () { I.savePassword(m, kst); });
          I.cardPicture(m.name, m.words).then(function (src) {
            pic.disabled = false;
            pic.addEventListener('click', function () { I.savePicture(src, m, kst); });
          }, function () { pic.remove(); });
        });
      } else {
        go.disabled = true; st.textContent = 'One moment…';
        I.signIn(nameIn.value, wordsIn.value, FAM).then(function (r) {
          go.disabled = false;
          if (!r.ok) { st.textContent = SAY[r.why] || SAY.beach; return; }
          var m = Door.enter({ name: r.name, words: r.words }, rem.input.checked);
          st.textContent = '';
          signedIn(m, 'Welcome back. You are');
        });
      }
    });

    setMode('new');
    var me = Door.me();
    if (me) signedIn(me);
  });

  if (Door) {
    Door.family(FAM);
    Door.onNamed(function () { paintAs(); refreshVoices(); });
  }
  paintAs();
  if (document.querySelector('.voices')) {
    refreshVoices();
    setInterval(function () { if (!document.hidden) refreshVoices(); }, 45000);
  }
})();
