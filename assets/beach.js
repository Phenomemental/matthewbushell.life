/* www.matthewbushell.life's copy of beach.js, taken unchanged from Phenomemental/happyseaurchin-beach
   (v=2026-10-26a) on 5 November 2026. */
/* Shared helpers for reading from and writing to David's beach
   (beach.happyseaurchin.com) from these static pages. */
(function () {
  var BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var REFRESH_MS = 30000;
  var LIMIT_MS = 6000;
  var clock = null;

  // A read waits about six seconds at most: a slow beach fails like an
  // absent one, so a page shows its saved words rather than waiting on.
  function read(url) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer;
    var late = new Promise(function (resolve, reject) {
      timer = setTimeout(function () {
        if (ctl) ctl.abort();
        reject(new Error('the beach took too long'));
      }, LIMIT_MS);
    });
    var asked = fetch(url, ctl ? { cache: 'no-store', signal: ctl.signal } : { cache: 'no-store' });
    return Promise.race([asked, late]).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      readClock(r.headers.get('X-Pscale-Now'));
      return r.json();
    }, function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  // Read a block, or only part of it: opts.spindle is an address such as
  // "19" (position 1.9), which returns that node and what's beneath it;
  // add opts.pscale to read a single node's own text (see point below).
  function get(block, opts) {
    var q = '?block=' + encodeURIComponent(block);
    if (opts && opts.spindle != null) q += '&spindle=' + encodeURIComponent(opts.spindle);
    if (opts && opts.pscale != null) q += '&pscale=' + encodeURIComponent(opts.pscale);
    return read(BEACH + q);
  }

  // One node's own text, without anything beneath it. The pscale counts
  // down from the block's floor: in a floor-1 block, 0 is a first-level
  // position ("1"), -1 a second-level one ("1.8"), and so on.
  function point(block, spindle, pscale) {
    return get(block, { spindle: spindle, pscale: pscale }).then(function (r) {
      return r && typeof r.content === 'string' ? r.content : '';
    });
  }

  // The beach's front door: every block's name ("blocks"), and when each
  // last changed ("touched"). It carries the shared clock too.
  function index() {
    return read(BEACH);
  }

  // Every beach response carries the shared clock as
  // "ISO | ten-digit sundial address | voicing", e.g.
  // "2026-09-27T10:04:23Z | 2026334647 | Sunday 27 September 2026, morning (beat 7)".
  function readClock(header) {
    var parts = (header || '').split('|').map(function (x) { return x.trim(); });
    if (parts.length === 3 && /^\d{10}$/.test(parts[1])) {
      clock = { iso: parts[0], address: parts[1], voicing: parts[2] };
    }
  }

  // A position's own text: a string leaf, or the "_" of a node.
  function text(node) {
    if (typeof node === 'string') return node;
    if (node && typeof node._ === 'string') return node._;
    return '';
  }

  // A pool entry is {_: text, 1: who, 2: address, 3: time}. As a pool
  // grows the beach nests older entries under "_" and newer ones one level
  // deeper, so walk "_" first, then 1-9, to read oldest to newest.
  function isEntry(n) {
    return n && typeof n === 'object' && typeof n._ === 'string' && typeof n['3'] === 'string';
  }

  // Position 1 of an entry is who left it. A few older entries keep words
  // of their own there instead, so only a name-length string counts.
  function name(v) {
    return typeof v === 'string' && v.length <= 60 ? v : '';
  }

  // A reply sits beneath the entry it answers, at the entry's next free
  // position: {_: text, 1: who, 3: time}, alongside the entry's own
  // who/where/when strings.
  function replies(e) {
    var out = [];
    for (var i = 1; i <= 9; i++) {
      var r = e[String(i)];
      if (r && typeof r === 'object' && typeof r._ === 'string' && r._.trim()) {
        out.push({
          who: name(r['1']),
          when: typeof r['3'] === 'string' ? r['3'] : '',
          text: r._
        });
      }
    }
    return out;
  }

  function entries(node, out) {
    out = out || [];
    if (!node || typeof node !== 'object') return out;
    if (node._ && typeof node._ === 'object') entries(node._, out);
    for (var i = 1; i <= 9; i++) {
      var e = node[String(i)];
      if (isEntry(e)) {
        if (e._.trim()) out.push({ who: name(e['1']), when: e['3'], text: e._, replies: replies(e),
          where: typeof e['2'] === 'string' ? e['2'] : '' });
      } else if (typeof e === 'string') {
        if (e.trim()) out.push({ who: '', when: '', text: e });
      } else {
        entries(e, out);
      }
    }
    return out;
  }

  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function renderThread(el, pool) {
    var list = entries(pool);
    el.textContent = '';
    if (!list.length) {
      var empty = document.createElement('p');
      empty.className = 'thread-empty';
      empty.textContent = 'No notes yet.';
      el.appendChild(empty);
      return;
    }
    list.forEach(function (c) {
      var div = comment(c, 'comment');
      if (c.replies && c.replies.length) {
        var rs = document.createElement('div');
        rs.className = 'replies';
        c.replies.forEach(function (r) { rs.appendChild(comment(r, 'comment reply')); });
        div.appendChild(rs);
      }
      el.appendChild(div);
    });
  }

  // A note's words; web addresses in them are shown short, as links, when
  // the page has live.js (which sets them by textContent and href only).
  function noteWords(el, s) {
    el.textContent = '';
    if (window.Live && window.Live.linkify) window.Live.linkify(el, s);
    else el.textContent = s;
  }

  // One note: who and when, then its words. A very long note shows its
  // opening, with the rest a tap away.
  var LONG = 700;
  function comment(c, cls) {
    var div = document.createElement('div');
    div.className = cls;
    var meta = document.createElement('p');
    meta.className = 'comment-meta';
    if (c.who) {
      var b = document.createElement('strong');
      b.textContent = c.who;
      meta.appendChild(b);
    }
    var w = when(c.when);
    if (w) meta.appendChild(document.createTextNode((c.who ? ' · ' : '') + w));
    if (meta.childNodes.length) div.appendChild(meta);
    var t = document.createElement('p');
    t.className = 'comment-text';
    var full = c.text.trim();
    if (full.length > LONG) {
      var cut = full.lastIndexOf(' ', 500);
      noteWords(t, full.slice(0, cut > 300 ? cut : 500) + '\u2026');
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'comment-more';
      more.textContent = 'Read all';
      more.addEventListener('click', function () {
        noteWords(t, full);
        more.remove();
      });
      div.appendChild(t);
      div.appendChild(more);
    } else {
      noteWords(t, full);
      div.appendChild(t);
    }
    return div;
  }

  // Append a note to a pool, in the same shape an assistant would write it,
  // located at an address in the pool's own tree when where is given. A
  // pool that keeps more with each note passes it in more, at its own
  // positions 5-9 ({7: …}). It resolves with the entry as sent and the
  // beach's answer.
  function postNote(pool, who, note, where, more) {
    var content = { _: note, 1: who, 2: where || '', 3: new Date().toISOString() };
    Object.keys(more || {}).forEach(function (k) {
      if (/^[5-9]$/.test(k)) content[k] = more[k];
    });
    return fetch(BEACH + '?block=' + encodeURIComponent(pool), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ append: true, content: content })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
        return { entry: content, answer: j };
      });
    });
  }

  // A read that tells a block that isn't there (404) from a beach that
  // can't be reached (status 0): resolves {status, json} and never
  // throws. It keeps the clock, as every read does; query is the rest of
  // the address after ?block= (such as "&spindle=19"), and an empty block
  // reads the beach's front door.
  function look(block, query) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, LIMIT_MS);
    var url = BEACH + (block ? '?block=' + encodeURIComponent(block) + (query || '') : '');
    return fetch(url, ctl ? { cache: 'no-store', signal: ctl.signal } : { cache: 'no-store' }).then(function (r) {
      clearTimeout(timer);
      readClock(r.headers.get('X-Pscale-Now'));
      return r.json().catch(function () { return null; }).then(function (j) { return { status: r.status, json: j }; });
    }, function () {
      clearTimeout(timer);
      return { status: 0, json: null };
    });
  }

  // A write in the beach's own shape: a POST naming the block, with body
  // {spindle, content, secret, new_lock, confirm, append} as the write
  // needs. The secret goes in this one request and is kept nowhere.
  // Resolves {status, json} and never throws; status 0 is no answer.
  function write(block, body) {
    return fetch(BEACH + '?block=' + encodeURIComponent(block), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    }).then(function (r) {
      readClock(r.headers.get('X-Pscale-Now'));
      return r.json().catch(function () { return null; }).then(function (j) { return { status: r.status, json: j }; });
    }, function () {
      return { status: 0, json: null };
    });
  }

  // A microphone beside a text box, so people can speak their words in.
  // It uses the browser's own speech recognition (Chrome, Edge, Safari);
  // where there is none, no button appears. The words land in the box to
  // be read and changed before anything is sent; it never sends.
  //
  // How it avoids the echo on phones (ways:dictation 2): a phone's engine
  // keeps revising the phrase it hears and hands back each revision, often
  // marked final, repeating the words before it. So on every result the
  // words are worked out again from everything the engine holds, from
  // result 0: the finals in order, revisions collapsed, and only the last
  // unfinished entry as the words still forming. The box is set to that,
  // in place of what the last result wrote, never added to.
  //
  // With {finals: true} (Sundial's fields, spine:front-door 6.8.3.4 (2)),
  // only final words are written, and a phone's passing guesses, handed
  // back as final as it goes, are folded into the phrase they revise: one
  // whose last word was only half heard, or one re-heard with nearly the
  // same words in the same places. The box then holds what was said once.
  var SVGNS = 'http://www.w3.org/2000/svg';
  function micIcon() {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('aria-hidden', 'true');
    [['rect', { x: 9, y: 3, width: 6, height: 11, rx: 3 }],
     ['path', { d: 'M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21', 'stroke-linecap': 'round' }]].forEach(function (part) {
      var n = document.createElementNS(SVGNS, part[0]);
      Object.keys(part[1]).forEach(function (k) { n.setAttribute(k, part[1][k]); });
      n.setAttribute('fill', 'none');
      n.setAttribute('stroke', 'currentColor');
      n.setAttribute('stroke-width', '1.8');
      svg.appendChild(n);
    });
    return svg;
  }

  // A phrase's words alone, for comparing revisions: lower case, letters
  // and digits, punctuation stripped. (Built at run time, so a browser
  // without Unicode classes falls back rather than failing to load.)
  var NOT_WORD;
  try { NOT_WORD = new RegExp('[^\\p{L}\\p{N}\\s]', 'gu'); } catch (e) { NOT_WORD = /[^a-z0-9\u00c0-\u024f\s]/g; }
  function words(s) {
    return String(s).toLowerCase().replace(NOT_WORD, ' ').split(/\s+/).filter(Boolean);
  }
  // True when b says what a said, or begins with it: b is a revision of a.
  function revises(a, b) {
    var x = words(a), y = words(b);
    if (x.length > y.length) return false;
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
  }
  // A phone's passing guess and its revision (6.8.3.4 (2)): b begins with
  // a, a's last word perhaps only half heard ('pers', then 'perspective'),
  // or b says nearly the same words in the same places ('Open my
  // perspective I'll …', then 'Offer my perspective I've …').
  function rehears(a, b) {
    var x = words(a), y = words(b);
    if (!x.length) return true;
    if (x.length > y.length) return false;
    if (x.every(function (w, i) { return w === y[i] || (i === x.length - 1 && y[i].indexOf(w) === 0); })) return true;
    if (x.length < 3) return false;
    return x.filter(function (w, i) { return w === y[i]; }).length / x.length >= 0.7;
  }
  // Going through the phrases in order, one that repeats the phrase before
  // it, or begins with it, takes its place instead of being added; with
  // `loose`, so does one that re-hears it.
  function collapse(list, loose) {
    var out = [];
    list.forEach(function (p) {
      p = String(p).trim();
      if (!words(p).length) return;
      if (out.length && (loose ? rehears : revises)(out[out.length - 1], p)) out[out.length - 1] = p;
      else out.push(p);
    });
    return out;
  }
  // Bare words become sentences (ways:dictation 3): an unpunctuated phrase
  // gets a capital where a sentence starts and a full stop where it ended
  // at a pause, and in English a lone 'i' stands up. A phrase the engine
  // punctuated stays as it came.
  var ENDS = /[.!?…]["”’)]*\s*$/;
  function sentence(p, starts, ends, english) {
    if (/[.,!?;:…]/.test(p)) return p;
    if (english) p = p.replace(/(^|\s)i(?=\s|'|’|$)/g, '$1I');
    if (starts) p = p.charAt(0).toUpperCase() + p.slice(1);
    return ends ? p + '.' : p;
  }

  var listening = null;     // the one microphone listening now, as its stop
  // With opts.dictate (Sundial's fields), the words go in as
  // happyseaurchin.com/theme.js's window.dictate puts them (spine:front-door
  // 3.57, answering 6.8.3.4 (2)): rebuilt whole every time, never appended.
  // The box holds what it held before, then every phrase the engine has
  // locked (carried across a pause that restarts it), then the one phrase
  // still being revised, the last passing guess only, with an ellipsis,
  // replaced as it firms. A run of revisions, each saying the one before
  // again or re-hearing it, collapses to the phrase it settled on.
  function addMic(box, opts) {
    var rebuild = !!(opts && (opts.dictate || opts.finals));
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec || !box || box.dataset.mic) return;
    box.dataset.mic = '1';
    var row = document.createElement('div');
    row.className = 'mic-row';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mic';
    btn.setAttribute('aria-pressed', 'false');
    btn.appendChild(micIcon());
    var word = document.createElement('span');
    btn.appendChild(word);
    var note = document.createElement('p');
    note.className = 'mic-note';
    note.setAttribute('role', 'status');
    row.appendChild(btn);
    row.appendChild(note);
    box.parentNode.insertBefore(row, box.nextSibling);

    // Where the voice goes, said before anyone presses (ways:dictation 4).
    var WHERE = 'Your browser turns your voice into text; Chrome may send it to Google to do that.';
    var lang = document.documentElement.lang === 'en' ? 'en-GB' : (document.documentElement.lang || 'en-GB');
    var english = /^en\b/i.test(lang);
    var rec = null;           // the engine's session now running
    var wanted = false;       // the person still wants to speak
    var frozen = false;       // stopped by typing or sending: write nothing more
    var base = '';            // the box's words before this session began
    var phrases = [], live = '';
    var prior = [], locked = [];   // rebuilding: phrases locked before this session's restart, and in it
    var began = 0, heard = false, spoke = false, quiet = 0;

    function label(on) {
      word.textContent = on ? 'Stop' : 'Speak';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Stop listening' : 'Speak your words into the box');
      btn.classList.toggle('listening', on);
    }
    // The box's words before dictation, then the spoken phrases as
    // sentences, then the words still forming, marked with an ellipsis.
    function compose(forming) {
      var t = base, starts = !t.trim() || ENDS.test(t);
      function put(s) { t += (t && !/\s$/.test(t) ? ' ' : '') + s; }
      phrases.forEach(function (p) {
        var s = sentence(p, starts, true, english);
        put(s);
        starts = ENDS.test(s);
      });
      if (live) put(sentence(live, starts, false, english) + (forming ? '…' : ''));
      return t;
    }
    function show(t) {
      var max = box.maxLength > 0 ? box.maxLength : Infinity;
      box.value = t.slice(0, max);
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Stop listening. Stopping lets the last words land; halting (on typing
    // or sending) keeps what is in the box and writes nothing more.
    function stop() {
      wanted = false;
      if (rec) try { rec.stop(); } catch (e) {}
    }
    function halt() {
      wanted = false;
      frozen = true;
      if (rec) try { rec.abort(); } catch (e) {}
    }
    function done(msg) {
      rec = null;
      if (listening === stop) listening = null;
      label(false);
      if (!frozen) show(compose(false).replace(/\s+$/, ''));
      note.textContent = msg || (spoke ? 'Read it through and change anything before you send it.' : WHERE);
    }

    function session() {
      var r = new Rec();
      rec = r;
      r.lang = lang;
      r.continuous = true;
      r.interimResults = true;
      // the engine's own punctuation where the browser offers it (theme.js)
      if (rebuild && 'unspokenPunctuation' in r) r.unspokenPunctuation = true;
      began = Date.now();
      heard = false;
      locked = [];
      if (!rebuild) {
        phrases = [];
        live = '';
      }
      var fault = '';
      r.onresult = function (ev) {
        if (frozen || r !== rec) return;
        heard = spoke = true;
        quiet = 0;
        var finals = [], forming = '';
        for (var i = 0; i < ev.results.length; i++) {
          var res = ev.results[i];
          if (res.isFinal) finals.push(res[0].transcript);
          else forming = res[0].transcript;
        }
        if (rebuild) {
          locked = finals;
          var guess = forming.trim(), runs = collapse(prior.concat(finals, guess ? [guess] : []), true);
          var open = !!guess && runs.length > 0 && runs[runs.length - 1] === guess;
          phrases = open ? runs.slice(0, -1) : runs;
          live = open ? guess : '';
          show(compose(open));
          return;
        }
        phrases = collapse(finals);
        live = forming.trim();
        // words still forming that repeat the last finished phrase are its revision
        if (live && phrases.length && revises(phrases[phrases.length - 1], live)) phrases.pop();
        show(compose(true));
      };
      r.onerror = function (ev) {
        var e = ev.error;
        if (e === 'no-speech' || e === 'aborted') return;
        wanted = false;
        fault = e === 'not-allowed' || e === 'service-not-allowed'
          ? 'The microphone wasn’t allowed. You can let this page use it in your browser’s settings, or type instead.'
          : e === 'audio-capture'
            ? 'No microphone could be found. You can type instead.'
            : 'Speaking didn’t work just now. You can type instead.';
      };
      r.onend = function () {
        if (r !== rec) return;
        // Silence ends a session, sooner on a phone. While the person still
        // wants to speak, start again, carrying what was said over as the new
        // starting text; a session that dies at once is a fault, not a pause.
        if (wanted && !frozen) {
          if (Date.now() - began < 1000) return done('Speaking didn’t work just now. You can type instead.');
          if (!heard && ++quiet >= 2) return done('I stopped listening after a long silence. Press Speak to go on.');
          if (rebuild) {
            // across the pause the locked phrases carry on, still open to
            // a revision that begins the next session
            prior = collapse(prior.concat(locked), true);
            phrases = prior.slice();
            live = '';
            show(compose(false));
          } else {
            base = compose(false);
            show(base);
          }
          try { session(); return; } catch (e) { return done('Speaking didn’t work just now. You can type instead.'); }
        }
        done(fault);
      };
      r.start();
    }

    label(false);
    note.textContent = WHERE;
    btn.addEventListener('click', function () {
      if (rec) return stop();
      if (listening) listening();      // one microphone at a time
      listening = stop;
      wanted = true;
      frozen = false;
      spoke = false;
      quiet = 0;
      base = box.value;
      prior = [];
      locked = [];
      phrases = [];
      live = '';
      try {
        session();
        label(true);
        note.textContent = 'Listening… press Stop when you’re done. Nothing is sent until you send it.';
      } catch (e) {
        rec = null;
        listening = null;
        note.textContent = 'Speaking didn’t work just now. You can type instead.';
      }
    });
    // Typing takes over: the words heard so far stay, without the mark of
    // words still forming, and listening stops.
    box.addEventListener('beforeinput', function (ev) {
      if (!rec || !ev.isTrusted) return;
      box.value = compose(false);
      halt();
    });
    box.addEventListener('blur', function (ev) {
      if (rec && ev.relatedTarget !== btn) stop();
    });
    // Sending stops the microphone first, so what is sent has no ellipsis
    // and nothing is written into the emptied box afterwards.
    if (box.form) box.form.addEventListener('submit', function () {
      if (!rec) return;
      show(compose(false).replace(/\s+$/, ''));
      halt();
    }, true);
  }

  // Wire a note form (fields: who, web [a trap for bots], note; a button;
  // a .form-status line) to leave notes in the given pool.
  function wireNoteForm(form, pool, onSent) {
    addMic(form.note);
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type=submit]') || form.querySelector('button');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var note = form.note.value.trim();
      if (form.web.value || !note) return;
      // A typed name is shown as a visitor's, never as a beach handle, so
      // nobody can sign as someone else.
      var name = form.who.value.replace(/\s+/g, ' ').trim().slice(0, 40);
      var who = name ? name + ', a visitor' : 'a visitor';
      button.disabled = true;
      status.textContent = 'Sending…';
      postNote(pool, who, note).then(function () {
        form.note.value = '';
        status.textContent = 'Thank you. Your note is on the beach.';
        if (onSent) return onSent();
      }).catch(function () {
        status.textContent = 'That didn’t reach the beach. Please try again in a moment.';
      }).then(function () {
        button.disabled = false;
      });
    });
  }

  // Run refresh() now, every 30 seconds while the page is visible, and when
  // it comes back into view. refresh() returns a promise; its outcome is
  // shown in noteEl, and onFirstSuccess runs once the beach has answered.
  // A page with no saved copy passes its own words for when the beach
  // hasn't answered yet (offline); '' says nothing in noteEl.
  function live(refresh, noteEl, onFirstSuccess, offline) {
    var lastSeen = null;
    function run() {
      return refresh().then(function () {
        if (!lastSeen && onFirstSuccess) onFirstSuccess();
        lastSeen = new Date();
        noteEl.textContent = 'Live from the beach · checked ' +
          lastSeen.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }, function () {
        if (!lastSeen) {
          noteEl.textContent = typeof offline === 'string' ? offline
            : 'The beach is out of reach just now, so this is the last saved version.';
        }
      });
    }
    run();
    setInterval(function () {
      if (!document.hidden) run();
    }, REFRESH_MS);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) run();
    });
    return run;
  }

  // ---- Signed answers ---------------------------------------------------------
  // Readers with a handle on the beach answer a family's spine in a block
  // of their own, <family>:<handle>, at the spine's own addresses. The
  // block named <family>:Phenomemental is Matthew's own, not an answer.
  // answerHandle(name, family) is the handle a block's name answers as,
  // or '' when the block is not a reader's answer to that family.
  var OWN = 'Phenomemental';
  var HANDLE = /^[A-Za-z][A-Za-z0-9 _-]*$/;
  function answerHandle(blockName, family) {
    if (typeof blockName !== 'string' || blockName.indexOf(family + ':') !== 0) return '';
    var handle = blockName.slice(family.length + 1);
    return HANDLE.test(handle) && handle !== OWN ? handle : '';
  }

  // Every answer in a reader's block, in address order, as { path, text }:
  // path is the address as keys (['3', '1'] for 3.1). The block's own
  // opening, which says what the block is, is not an answer.
  function answersIn(block) {
    var out = [];
    (function walk(node, path) {
      if (!node || typeof node !== 'object') return;
      for (var i = 1; i <= 9; i++) {
        var n = node[String(i)];
        var p = path.concat(String(i));
        var t = text(n).trim();
        if (t) out.push({ path: p, text: t });
        walk(n, p);
      }
    })(block, []);
    return out;
  }

  // The name of the part of a spine at a path, for saying what an answer
  // answers: the nearest line at or above it, up to its first colon or
  // full stop; else the address itself.
  function partName(spine, path) {
    for (var depth = path.length; depth > 0; depth--) {
      var n = spine;
      for (var i = 0; i < depth && n && typeof n === 'object'; i++) n = n[path[i]];
      var t = text(n).trim();
      if (t) {
        var cut = t.search(/[:.](\s|$)/);
        var label = cut > 0 && cut <= 60 ? t.slice(0, cut) : (t.length > 60 ? t.slice(0, 57).replace(/\s+\S*$/, '') + '…' : t);
        return depth === path.length ? label : label + ', at ' + path.join('.');
      }
    }
    return 'part ' + path.join('.');
  }

  // Who is in a room right now. The beach's presence block holds a slot
  // for each agent, overwritten at every heartbeat: {1: handle, 2: where
  // it is, such as "pool:X", 3: when}. here(room) resolves to the handles
  // whose slot names that room and is under two minutes old by the
  // beach's own clock.
  var FRESH = 120000;
  function slots(node, out) {
    out = out || [];
    if (!node || typeof node !== 'object') return out;
    if (node._ && typeof node._ === 'object') slots(node._, out);
    for (var i = 1; i <= 9; i++) {
      var s = node[String(i)];
      if (!s || typeof s !== 'object') continue;
      if (typeof s['1'] === 'string' && typeof s['3'] === 'string') out.push(s);
      else slots(s, out);
    }
    return out;
  }
  function here(room) {
    return get('presence').then(function (block) {
      var now = clock ? Date.parse(clock.iso) : NaN;
      if (isNaN(now)) now = Date.now();
      var who = [];
      slots(block).forEach(function (s) {
        var at = typeof s['2'] === 'string' ? s['2'].trim() : '';
        var handle = name(s['1']).trim();
        var age = now - Date.parse(s['3']);
        if (at !== room || !handle || !(age < FRESH && age > -FRESH)) return;
        if (who.indexOf(handle) < 0) who.push(handle);
      });
      return who;
    });
  }

  // Keep el saying "here now: <handles>" while anyone is in the room:
  // read every minute while the page is showing, and again when it comes
  // back into view. Otherwise, and whenever anything fails, el says
  // nothing, and nothing else is touched.
  function watchHere(room, el) {
    if (!el) return;
    function quiet() {
      el.textContent = '';
    }
    function check() {
      if (document.hidden) return;
      try {
        here(room).then(function (who) {
          el.textContent = who.length ? 'here now: ' + who.join(', ') : '';
        }, quiet);
      } catch (e) {
        quiet();
      }
    }
    check();
    setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
  }

  function human(slug) {
    return slug.replace(/[-_]+/g, ' ');
  }
  function titled(s) {
    return s.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }
  // Words read from the beach, told in plain names: a raw block name
  // ("pool:weft", "task:Dorylus"), a channel's number, a list of an agent's
  // blocks, a note of where a key is kept, never show. Web addresses are
  // left as they are.
  function plain(s) {
    return s.split(/(https?:\/\/\S+)/).map(function (part, i) {
      if (i % 2) return part;
      return part
        .split(/(?=\S)(?<=[.;]\s)/).filter(function (x) { return !/\b(latch(es)?|vault)\b|\bKey in\b/i.test(x); }).join('')
        .replace(/LEROs on the Commons/g, 'Community Recovery')
        .replace(/\s*\((?:a |an )?genus-one agent[^)]*\)/gi, '')
        .replace(/\s*\(([a-z][\w-]*)\)/g, '')
        .replace(/,? from [a-z]+:[\w-]+ to [a-z]+:[\w-]+/g, '')
        .replace(/\b[a-z][\w-]*:([\w-]+)(?:(?:, | and )[a-z][\w-]*:\1)+/g, function (m, n) { return 'the ' + titled(human(n)) + '’s blocks'; })
        .replace(/\barchive:[\w:.-]+/g, 'an earlier copy')
        .replace(/\bgrain:[0-9a-f]+/g, 'a private channel')
        .replace(/\bpool:([\w-]+)/g, function (m, n) { return 'the ' + human(n) + ' room'; })
        .replace(/\btask:([\w-]+)/g, function (m, n) { return human(n) + '’s task list'; })
        .replace(/\b([a-z][\w-]*):<handle>/g, function (m, f) { return 'each reader’s own ' + human(f) + ' block'; })
        .replace(/\b([a-z][\w-]*):([A-Z][\w-]*)/g, function (m, f) { return human(f); })
        .replace(/\b[a-z][\w-]*:([\w-]+)/g, function (m, n) { return human(n); })
        .replace(/\s{2,}/g, ' ');
    }).join('').trim();
  }

  window.Beach = {
    get: get,
    look: look,
    write: write,
    point: point,
    index: index,
    clock: function () { return clock; },
    text: text,
    entries: entries,
    renderThread: renderThread,
    wireNoteForm: wireNoteForm,
    note: postNote,
    addMic: addMic,
    live: live,
    answerHandle: answerHandle,
    answersIn: answersIn,
    partName: partName,
    here: here,
    watchHere: watchHere,
    plain: plain
  };
})();
