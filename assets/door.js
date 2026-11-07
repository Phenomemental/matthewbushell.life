/* door.js — the way in, made standard: a name, its key, and the card that keeps them.
 *
 * www.matthewbushell.life's copy, taken from Phenomemental/happyseaurchin-beach door.js (v=2026-10-27a)
 * on 5 November 2026, with four changes, each marked "matthewbushell.life" below:
 *   - with window.DOOR.proved, a name needs its three words: the unproved sign-in, for names that have
 *     blocks on the beach but no passport, is turned off;
 *   - the line after saving to a phone's passwords no longer promises they fill themselves in;
 *   - the door's pieces are handed out as Door.inline, so a page can lay the way in out in its own look;
 *   - Door.enter keeps a name and tells the page, as the sheet does.
 *
 * Lifted from David's sign-in for Community Recovery (community-recovery/kit.js and words.js,
 * copied here under the MIT licence below) into one door any of Matthew's pages can take. It wears
 * the page's own look: door.css reads the page's colour tokens (--ground, --ink, --muted, --panel,
 * --line, --accent, --serif) and falls back to Matthew's (look:Phenomemental).
 *
 *   <script>window.DOOR = { place, beach, home, room, key, say };</script>   all optional
 *   <script src="door.js"></script>
 *
 * place is printed on the card; beach is where names live (the main beach by default); home is the
 * page's address, printed on the card; room is where 'lost my words' sends a person; key is the
 * storage name this phone keeps them under; say gives any of the door's own lines (SAY below) in the
 * page's words, as a page that keeps to everyday words needs.
 *
 * Two ways in. "I'm new": a name nobody on the beach already answers to (any block named for it,
 * not passports only, and without regard to capitals, spaces or hyphens, so no twin is ever made),
 * and three words the page proposes and shows once; the first write is passport:<name>, latched
 * with them. "I've been here": a name and its key. The key is tried exactly as typed first, then
 * as three words tidied the way the kit tidies them, because people already on the beach hold keys
 * of their own (ways:key 2). Names follow the beach's one rule for a handle: letters, digits, _ and
 * -, with one space between words.
 *
 * Words reach the beach as the beach's own voice puts them (beach.happyseaurchin.com/button/
 * voice.js, say): the person's mirror, <family>:<name>, founded latched to their key, then a plain
 * line at the address, so a voice given here reads the same on every page that reads the family.
 *
 * What a phone remembers is kept in its own storage and sent nowhere else. No key of anyone's is
 * ever written into a page.
 *
 * ---------------------------------------------------------------------------------------------
 * MIT License
 *
 * Copyright (c) 2026 pscale-commons contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ---------------------------------------------------------------------------------------------
 */
(function () {
  'use strict';
  var CFG = window.DOOR || {};
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function sget(store, k) { try { return store.getItem(k); } catch (e) { return null; } }
  function sset(store, k, v) { try { if (v == null) store.removeItem(k); else store.setItem(k, v); } catch (e) {} }

  // Only a page served from this computer may be pointed at another beach (a builder's test);
  // a published page writes to the beach its own config names, and nowhere else.
  var BEACH = CFG.beach || 'https://beach.happyseaurchin.com';
  if (LOCAL) {
    var asked = new URLSearchParams(location.search).get('beach');
    if (asked) BEACH = asked;
  }
  BEACH = String(BEACH).replace(/\/+$/, '');
  var WIRE = BEACH + '/.well-known/pscale-beach';
  var PLACE = CFG.place || document.title || '';
  var HOME = CFG.home || (location.origin + location.pathname);
  var ROOM = CFG.room || '';
  var LOST = 'https://happyseaurchin.com/key';

  // ---- the beach -------------------------------------------------------------------------------
  // A read waits about eight seconds at most: a slow beach fails like an absent one.
  function getJSON(url) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('the beach answered ' + r.status);
        return r.json();
      }, function (e) { clearTimeout(timer); throw e; });
  }
  function read(block) { return getJSON(WIRE + '?block=' + encodeURIComponent(block)); }
  var held = null;
  function index(fresh) {
    if (!fresh && held && Date.now() - held.at < 60000) return held.p;
    var p = getJSON(WIRE).then(function (ix) { return ix; }, function (e) { held = null; throw e; });
    held = { at: Date.now(), p: p };
    return p;
  }
  function names(ix) {
    var b = ix && ix.blocks;
    if (Array.isArray(b)) return b.map(function (n) { return typeof n === 'string' ? n : (n && n.name) || ''; });
    if (b && typeof b === 'object') return Object.keys(b);
    return [];
  }
  function send(body) {
    return fetch(WIRE + '?block=' + encodeURIComponent(body.block), {
      method: 'POST', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        return { ok: r.ok && !(d && (d.error || d.ok === false)), status: r.status, code: d && d.code, error: d && (d.error || d.message) };
      });
    }, function () { return { ok: false, status: 0 }; });
  }
  // The beach reads a block, changes it and writes it back, so two writes to one block sent at
  // once can lose one of them: writes to the same block go one after another.
  var queue = {};
  function post(body) {
    var k = body.block, run = function () { return send(body); };
    var p = (queue[k] || Promise.resolve()).then(run, run);
    queue[k] = p;
    return p;
  }
  function refused(r) { return !!r && (r.status === 403 || r.code === 'lock_required' || r.code === 'handle_bound'); }

  // ---- names -----------------------------------------------------------------------------------
  // The one rule for a handle on every happyseaurchin.com page and in the beach's voice.
  function cleanName(v) { return String(v || '').replace(/[^a-z0-9_\s-]/gi, '').replace(/\s+/g, ' ').trim().slice(0, 32); }
  // two spellings that would be the same person to a reader: JulieJ and Julie J, mark-beall and Mark Beall
  function fold(v) { return String(v || '').toLowerCase().replace(/[\s_-]+/g, ''); }
  function handleOf(block) { return block.slice(block.lastIndexOf(':') + 1); }
  function taken(ix, name) {
    var f = fold(name);
    return names(ix).some(function (b) { return fold(handleOf(b)) === f; });
  }
  // the spelling the beach already has for a typed name: its passport, else any block named for it
  function spelled(ix, name) {
    var low = name.toLowerCase(), all = names(ix), i, h;
    for (i = 0; i < all.length; i++) if (all[i].indexOf('passport:') === 0 && all[i].slice(9).toLowerCase() === low) return { name: all[i].slice(9), passport: true };
    for (i = 0; i < all.length; i++) { h = handleOf(all[i]); if (h !== all[i] && h.toLowerCase() === low) return { name: h, passport: false }; }
    return null;
  }

  // ---- keys ------------------------------------------------------------------------------------
  var WORDS = window.DOOR_WORDS || /* the kit's 1137 plain words (community-recovery/words.js): three make about 30 bits */
    ["acorn","alder","allotment","alpaca","alphabet","amaze","amber","amble","ample","angle","anorak","antenna","anthem","anvil","apollo","apple","apricot","april","apron","archway","argon","armchair","arrive","arrow","aspen","aster","atlas","attic","august","aurora","author","autumn","avenue","avocado","azure","backpack","badge","badger","bagel","bake","baker","bakery","balance","balcony","ballad","ballet","bamboo","banana","band","banjo","banner","barber","barge","barn","barrow","basil","basket","battery","beacon","beagle","bedroom","beetle","beetroot","begin","bell","bench","birch","bison","blanket","bloom","blossom","bluebell","blueberry","bobble","bolt","bonnet","bonny","bookcase","bookmark","bookshelf","bookshop","boot","boulder","bounce","bowling","bracelet","bracken","bramble","branch","brave","bread","breeze","breezy","brick","bridge","bright","brisk","bronze","brook","broom","brunch","brush","bubble","buckle","buddy","bugle","build","builder","bulb","bulrush","bumblebee","bumpy","bundle","bunting","busy","butter","buttercup","butterfly","button","byway","cabbage","cabin","cable","cactus","calm","camel","camera","camping","canal","candle","canteen","canter","canvas","canyon","cap","cape","captain","caramel","carbon","cardigan","careful","carnival","carpet","carrot","cart","carve","cascade","cashew","castle","catkin","cavern","cedar","celery","cement","century","chain","chair","chalk","channel","charcoal","cheery","cheese","cherry","chess","chestnut","chickpea","chime","chimney","chisel","chive","choir","chuckle","cinema","circle","city","clap","clay","clear","clever","cliff","clifftop","climb","clipboard","clock","cloud","cloudy","clover","coast","coaster","coat","cobalt","cobbler","cocoa","coconut","coffee","cogwheel","collar","college","collie","comet","compass","compost","cone","conker","cook","cookie","cool","copper","coral","corner","cornet","cottage","cotton","count","county","courtyard","cove","crab","cradle","crane","crate","crayon","cream","creek","cress","crew","cricket","crimson","crisp","crocus","crossing","crown","crumble","crumpet","cub","cucumber","cuddle","cumin","cup","cupcake","curious","curly","curry","curve","custard","cycling","daffodil","dainty","daisy","damson","dandy","dangle","dapper","dawn","daybreak","daylight","dazzle","decade","delta","denim","dial","dig","dinner","disco","discover","diving","dolphin","domino","donkey","doodle","door","doorbell","doormat","doorstep","dot","dove","downpour","dragonfly","draw","dreamy","drift","driftwood","driver","driveway","drizzle","drum","duck","duet","dumpling","dune","dusk","dusty","eager","eagle","early","earthy","easel","east","echo","eclipse","editor","eggcup","elephant","elm","ember","emerald","encore","engine","envelope","episode","evening","explore","fable","fabric","falcon","fancy","farmer","fawn","feather","fence","fennel","fern","ferret","ferry","festival","fiddle","field","fig","film","finch","finish","fireside","fishing","flag","flagpole","flamingo","flapjack","fleecy","flicker","flint","float","florist","fluffy","flute","flutter","flyover","foal","fog","foothill","footpath","forest","fork","fountain","fox","foxglove","fresh","friday","fridge","friendly","fringe","frog","frost","frosty","fudge","funnel","fuse","fuzzy","gadget","galaxy","gale","gallery","gallop","garage","garden","gardener","garland","garlic","gather","gecko","gentle","giant","giggle","ginger","glad","glade","gleam","gleeful","glide","glimmer","glitter","globe","glossy","glove","glow","goat","gobble","goggles","golden","goose","grand","granite","granola","grater","gravel","gravy","grill","grocer","grotto","grove","grow","guava","guide","guild","gull","hallway","hammock","hamper","handle","handy","hanger","happy","harp","harvest","hat","hawk","hawthorn","haystack","haze","hazel","hazelnut","headland","hearty","heath","heather","hedge","hedgehog","hedgerow","helium","helmet","helpful","hem","hen","heron","herring","hidden","hiking","hillside","hilltop","hinge","hippo","hockey","holiday","holly","honest","honey","hopeful","horizon","hover","huddle","hum","humble","icicle","icing","igloo","imagine","indigo","inkwell","inlet","invent","iris","iron","island","ivory","jacket","jade","jam","january","jasmine","jaunty","jellyfish","jetty","jiggle","jigsaw","jingle","joiner","jolly","jostle","journal","journey","joyful","judo","juggle","juice","july","jump","jumper","junction","june","jungle","jupiter","kale","kangaroo","karate","kayak","kebab","keen","keeper","kestrel","ketchup","kettle","keyboard","keypad","keyring","kind","kiosk","kitchen","kite","kitten","kiwi","koala","korma","ladder","ladle","ladybird","lagoon","lake","lakeside","lamb","lamp","lander","lane","lantern","lanyard","laptop","larch","larder","lark","latch","laundry","lavender","leaf","leafy","leap","ledge","ledger","legend","lemon","lemonade","lemur","lentil","letter","letterbox","lever","light","lilac","lily","lime","linen","lion","listen","little","lively","lizard","lobster","locket","lodge","lolly","lotus","lowland","loyal","lunch","lunchbox","lupin","lyric","magenta","magnet","magnolia","magpie","mallet","mango","map","maple","marble","march","marigold","marker","market","maroon","marrow","marsh","mayor","maypole","meadow","meander","measure","medal","megaphone","melody","melon","mend","menu","meteor","middle","midnight","milk","milkshake","mindful","mingle","mint","mirror","misty","mitten","mole","monday","monkey","moon","moonlight","moose","moss","mossy","moth","mountain","mouse","muddle","muffin","murmur","museum","mustard","naan","nachos","napkin","navy","neon","neptune","nestle","netball","nettle","newsagent","newt","nibble","nifty","nimble","noodle","noon","north","notebook","notepad","nutmeg","oak","oasis","oats","ocean","octave","october","octopus","office","olive","onion","opal","open","opera","orange","orbit","orchard","organ","origami","otter","oval","oven","owl","oxygen","oyster","packet","paddle","paddock","paint","painted","painter","pal","palm","pan","pancake","panda","pantry","papaya","paper","paperclip","paprika","parade","parasol","parcel","park","parrot","parsley","parsnip","pasta","pastel","pastry","pasture","patch","path","patio","pattern","pavement","peach","peanut","pearl","pebble","pecan","peeler","pelican","pencil","pendant","penguin","pepper","peppy","perky","pesto","petal","photo","piano","picnic","picture","pie","piglet","pillow","pilot","pin","pinecone","pink","pinwheel","pizza","planet","plank","plant","planter","plate","platform","playful","playlist","pliers","plucky","plum","plumber","pluto","pocket","podcast","poem","polish","polished","polka","pond","ponder","pony","poplar","porch","portrait","postbox","postcard","poster","potato","potter","pottery","present","pretzel","primrose","printer","propeller","proper","pudding","puddle","puffin","pulley","pumpkin","puppy","purple","puzzle","quarry","quartet","quiet","quill","quilt","quirky","rabbit","radiant","radio","radish","raft","railway","rainbow","raincoat","rake","ramble","ramen","ranger","rapids","raven","reader","recipe","reef","return","ribbon","rice","riddle","ridge","ringtone","ripple","river","riverbank","rivet","robin","rocket","rooftop","rooster","rosy","round","rounders","rover","rowan","rowing","ruby","rucksack","rudder","rug","rugby","rumba","running","rustic","rustle","saddle","saffron","sailing","sailor","salad","salsa","salt","samba","samosa","sand","sandal","sandbank","sandpit","sandwich","sapling","satchel","satsuma","saturn","saunter","scamper","scanner","scarecrow","scarf","scarlet","school","scone","scooter","scout","scrapbook","scribble","seahorse","seashell","seaside","season","seed","seedling","seesaw","sesame","shadow","shallows","shed","sheep","shelf","sherbet","shield","shimmer","shiny","shovel","shower","shrimp","shuffle","shuttle","signal","signpost","silky","silver","sing","skate","skating","sketch","skip","skylight","skyline","slate","sledge","sleek","sleet","sleeve","slide","slipper","slope","smile","smooth","smoothie","snack","snail","snappy","snowdrop","snug","snuggle","soap","sock","socket","sofa","soft","solid","solo","sorbet","soup","south","spade","spaniel","spanner","sparkle","sparrow","spatula","speaker","spiral","sponge","spring","sprinkle","sprout","spruce","spry","square","squash","squid","stable","stag","stairway","stamp","star","starfish","starlight","starling","station","steady","stencil","stew","stool","storm","stream","street","string","stripe","stroll","strong","student","studio","sturdy","sugar","suitcase","summer","summit","sunbeam","sunday","sundial","sunflower","sunlight","sunlit","sunny","sunrise","sunset","supper","surfing","sushi","swallow","swan","swede","sweep","sweetcorn","swift","swim","swing","switch","sycamore","syrup","tabby","table","taco","tailor","tall","tandem","tangerine","tango","tape","tassel","teabag","teacher","teacup","teal","team","teapot","telescope","tempo","tennis","tent","terrier","thankful","thicket","thimble","thread","thunder","tiara","ticket","tidy","tiger","tile","timber","timer","tin","tinker","tinsel","tiny","toast","toaster","toddle","toffee","tofu","tomato","tongs","topaz","torch","towel","tower","town","towpath","tractor","trail","travel","trellis","trifle","trinket","trophy","trot","trout","trowel","trumpet","trusty","tuba","tuesday","tulip","tumble","tundra","tune","tunnel","turnip","turtle","twig","twilight","twine","twinkle","twirl","umbrella","upbeat","uplands","valley","vanilla","varnish","vase","velvet","venus","verse","village","vinegar","violet","violin","vivid","volcano","vole","voyage","waddle","wafer","waffle","walking","walnut","walrus","waltz","wander","wardrobe","warm","wasp","water","waterfall","wavy","weave","weaver","weekend","wellies","west","wetland","wheat","wheel","whisper","whittle","wicker","wiggle","willow","windchime","windmill","window","windy","wink","winter","wire","wise","wobble","wolf","wombat","wonder","wonton","wooden","woodland","wool","woolly","workshop","woven","yarn","yellow","yodel","yoga","yoyo","zebra","zesty","zigzag","zinc","zip","zippy"];
  var DEVICE = /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'phone' : 'computer';
  function threeWords() {
    if (WORDS.length < 500) throw new Error('the word list did not load');
    var out = [], buf = new Uint32Array(1), n = WORDS.length, limit = Math.floor(4294967296 / n) * n;
    while (out.length < 3) {
      crypto.getRandomValues(buf);
      if (buf[0] >= limit) continue;                 // no leaning toward any word
      var w = WORDS[buf[0] % n];
      if (out.indexOf(w) < 0) out.push(w);
    }
    return out;
  }
  // how far apart two words are, counting a slip of one letter as one step
  function apart(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    if (Math.abs(m - n) > 2) return 3;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }
  // a typed word, put right if it is one slip away from exactly one word of the list
  function nearest(w) {
    if (WORDS.indexOf(w) >= 0) return w;
    var near = WORDS.filter(function (x) { return apart(w, x) <= (w.length > 4 ? 2 : 1); });
    return near.length === 1 ? near[0] : null;
  }
  // whatever a person types, a phone's capital or a comma included, as the three words, or null
  function tidied(typed) {
    var toks = String(typed || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
    if (toks.length !== 3) return null;
    var fixed = toks.map(nearest);
    return fixed.indexOf(null) >= 0 ? null : fixed.join('-');
  }
  // the spellings of a typed key worth trying, in order, three at most (the beach refuses many)
  function tries(typed) {
    var out = [];
    function add(k) { if (k && out.indexOf(k) < 0) out.push(k); }
    add(String(typed || ''));
    add(String(typed || '').trim());
    add(tidied(typed));
    return out.slice(0, 3);
  }
  // proves a key against a latched block and changes nothing
  function prove(block, keys) {
    var i = 0, last = null;
    function next() {
      if (i >= keys.length) return Promise.resolve({ ok: false, why: refused(last) ? 'key' : 'beach' });
      var k = keys[i++];
      return post({ block: block, secret: k, new_lock: k }).then(function (r) {
        if (r.ok) return { ok: true, key: k };
        last = r;
        return refused(r) ? next() : { ok: false, why: 'beach' };
      });
    }
    return next();
  }

  // ---- the person at this phone ------------------------------------------------------------------
  var ME_KEY = CFG.key || ('door:me:' + BEACH);
  function me() {
    var raw = sget(localStorage, ME_KEY) || sget(sessionStorage, ME_KEY);
    try { var m = raw && JSON.parse(raw); return m && m.name && m.words ? m : null; } catch (e) { return null; }
  }
  function keepMe(m, remember) {
    sset(localStorage, ME_KEY, remember ? JSON.stringify(m) : null);
    sset(sessionStorage, ME_KEY, remember ? null : JSON.stringify(m));
  }
  function forget() { sset(localStorage, ME_KEY, null); sset(sessionStorage, ME_KEY, null); }

  function signUp(typed, words) {
    var name = cleanName(typed);
    if (name.length < 2) return Promise.resolve({ ok: false, why: 'short' });
    return index(true).then(function (ix) {
      if (taken(ix, name)) return { ok: false, why: 'taken' };
      return post({ block: 'passport:' + name, content: { _: name }, new_lock: words }).then(function (r) {
        if (!r.ok) return { ok: false, why: r.code === 'confirm_required' || refused(r) ? 'taken' : 'beach' };
        held = null;
        return { ok: true, name: name, words: words };
      });
    }, function () { return { ok: false, why: 'beach' }; });
  }
  function signIn(typedName, typedKey, family) {
    var name = cleanName(typedName);
    if (!name) return Promise.resolve({ ok: false, why: 'noname' });
    if (!String(typedKey || '').trim()) return Promise.resolve({ ok: false, why: 'nokey' });
    return index(true).then(function (ix) {
      var s = spelled(ix, name);
      if (!s) return { ok: false, why: 'noname' };
      var all = names(ix), mirror = family ? family + ':' + s.name : '';
      var against = s.passport ? 'passport:' + s.name : (mirror && all.indexOf(mirror) >= 0 ? mirror : '');
      // A name with blocks but no passport and nothing latched here has nothing to prove the key
      // against: the beach cannot tell its owner from anyone else, as on every page that reads
      // the family. The key is kept as given, and latches their words here the first time.
      // matthewbushell.life: with DOOR.proved a name needs its words, so there is no unproved way in
      if (!against && CFG.proved) return { ok: false, why: 'unproved' };
      if (!against) return { ok: true, name: s.name, words: tidied(typedKey) || String(typedKey).trim(), unproved: true };
      return prove(against, tries(typedKey)).then(function (r) {
        return r.ok ? { ok: true, name: s.name, words: r.key } : { ok: false, why: r.why };
      });
    }, function () { return { ok: false, why: 'beach' }; });
  }

  // ---- the card: a picture of the name and its words, to keep -------------------------------------
  var FACE = '"Cormorant Garamond", "Iowan Old Style", Georgia, serif';
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var loads = Promise.all(['500 92px', 'italic 400 32px', '600 26px'].map(function (f) { return document.fonts.load(f + ' "Cormorant Garamond"'); }));
    return Promise.race([loads, new Promise(function (r) { setTimeout(r, 2500); })]).catch(function () {});
  }
  function cardPicture(name, words) {
    return fontsReady().then(function () {
      var c = document.createElement('canvas'); c.width = 900; c.height = 560;
      var g = c.getContext('2d');
      function fit(t, style, px, max) { g.font = style + ' ' + px + 'px ' + FACE; while (px > 14 && g.measureText(t).width > max) { px -= 2; g.font = style + ' ' + px + 'px ' + FACE; } }
      // Matthew's paper and ink, with the crimson heart (look:Phenomemental)
      g.fillStyle = '#eee7d5'; g.fillRect(0, 0, 900, 560);
      g.fillStyle = '#f6f1e6'; g.fillRect(30, 30, 840, 500);
      g.strokeStyle = '#b9ad9a'; g.lineWidth = 2; g.strokeRect(31, 31, 838, 498);
      g.strokeStyle = '#1d1a17'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.arc(100, 104, 28, -2.2, 2.6); g.stroke();
      g.fillStyle = '#c21d4e'; g.beginPath(); g.arc(100, 104, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a5147';
      if ('letterSpacing' in g) g.letterSpacing = '6px';
      fit(String(PLACE).toUpperCase(), '600', 26, 680); g.fillText(String(PLACE).toUpperCase(), 150, 113);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      g.fillStyle = '#1d1a17'; fit(name, '500', 92, 760); g.fillText(name, 70, 262);
      g.fillStyle = '#c21d4e'; var line = words.split('-').join('  ');
      fit(line, '500', 66, 760); g.fillText(line, 70, 372);
      g.fillStyle = '#5a5147'; fit('The only key to this name. Keep it safe.', 'italic 400', 34, 760);
      g.fillText('The only key to this name. Keep it safe.', 70, 446);
      fit(HOME.replace(/^https?:\/\//, ''), '400', 26, 760); g.fillText(HOME.replace(/^https?:\/\//, ''), 70, 494);
      return c.toDataURL('image/png');
    });
  }
  // Saving the words: to the phone's own password store, or as the card picture. Chrome on
  // Android takes them straight in; elsewhere a real sign-in form is filled and submitted out of
  // sight, which is what makes Safari and other browsers offer to save the password.
  function savePassword(m, st) {
    if (window.PasswordCredential && navigator.credentials && navigator.credentials.store) {
      try {
        var c = new window.PasswordCredential({ id: m.name, password: m.words, name: PLACE + ': ' + m.name });
        navigator.credentials.store(c).then(function () {
          // matthewbushell.life: no promise that they fill themselves in, on this site or any other
          st.textContent = 'Your ' + DEVICE + ' has kept your words with its passwords.';
        }, function () { formSave(m, st); });
        return;
      } catch (e) { /* the form below */ }
    }
    formSave(m, st);
  }
  function formSave(m, st) {
    var f = el('form', 'door-pw'); f.method = 'post'; f.action = '#'; f.setAttribute('aria-hidden', 'true');
    var u = el('input'); u.type = 'text'; u.name = 'username'; u.autocomplete = 'username'; u.value = m.name; u.tabIndex = -1;
    var pw = el('input'); pw.type = 'password'; pw.name = 'password'; pw.autocomplete = 'new-password'; pw.value = m.words; pw.tabIndex = -1;
    var sb = el('button'); sb.type = 'submit'; sb.tabIndex = -1;
    f.appendChild(u); f.appendChild(pw); f.appendChild(sb);
    document.body.appendChild(f);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1200);
    });
    if (f.requestSubmit) f.requestSubmit(sb); else sb.click();
    st.textContent = 'When your ' + DEVICE + ' offers to save the password, say yes.';
  }
  function savePicture(src, m, st) {
    var fname = 'my-card-' + m.name.replace(/\s+/g, '-') + '.png';
    fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
      var file = window.File ? new File([b], fname, { type: 'image/png' }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: 'My card' }).then(function () { st.textContent = 'Saved. Keep it with your photos.'; });
      }
      var a = el('a'); a.href = src; a.download = fname;
      document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
      st.textContent = 'Saved. You can also press and hold the picture to keep it.';
    }).catch(function () { st.textContent = 'Press and hold the picture above to save it.'; });
  }

  // ---- the sheet that asks, once ----------------------------------------------------------------
  function el(tag, cls, t) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (t != null) e.textContent = t;
    return e;
  }
  var PUBLIC = 'What you write here is public, under the name you chose.';
  var SAY = {
    short: 'Please choose a name of two letters or more.',
    taken: 'Someone on the beach already goes by that name. Pick another, or add a letter.',
    beach: 'That didn’t reach the beach. Please try again in a moment.',
    noname: 'There’s nobody on the beach by that name yet. Check the spelling, or choose “I’m new”.',
    nokey: 'Please type your words, or your key.',
    key: 'Those aren’t the words for that name. Look at the first letter: phones capitalise it.',
    adult: 'This is for people aged 18 or over. Please tick the box if that’s you.',
    back: 'Three words, or the key you already use on the beach, exactly as you chose it.',
    // matthewbushell.life: a name with blocks but no passport has nothing to prove its words against
    unproved: 'That name is in use on the beach, but there’s nothing here to check your words against. Please choose “I’m new” and another name.',
    lost: 'Nobody can look them up, and nobody here can clear them on the spot: the beach keeps only a check of them, never the words. Losing them loses no words you wrote, only the pen.'
  };
  // A page that keeps to everyday words gives any of these lines in its own (window.DOOR.say).
  Object.keys(CFG.say || {}).forEach(function (k) { if (typeof CFG.say[k] === 'string') SAY[k] = CFG.say[k]; });
  var sheetOpen = null, onNamed = [], family = '';
  function sheet(start) {
    if (sheetOpen) return sheetOpen;
    sheetOpen = new Promise(function (resolve, reject) {
      var veil = el('div', 'door-veil'), box = el('div', 'door-sheet');
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'door-head');
      var shut = el('button', 'door-shut', '×'); shut.type = 'button'; shut.setAttribute('aria-label', 'Close');
      var body = el('div');
      box.appendChild(shut); box.appendChild(body);
      document.body.appendChild(veil); document.body.appendChild(box);
      document.body.classList.add('door-up');
      var before = document.activeElement, ended = false, named = null;
      function done(m) {
        if (ended) return;
        ended = true;
        veil.remove(); box.remove(); document.body.classList.remove('door-up'); sheetOpen = null;
        if (before && before.focus && document.contains(before)) try { before.focus({ preventScroll: true }); } catch (e) {}
        if (m) { onNamed.forEach(function (fn) { try { fn(m); } catch (e) {} }); resolve(m); } else reject(new Error('closed'));
      }
      // closing the sheet once a name is made carries on with that name
      shut.addEventListener('click', function () { done(named); });
      veil.addEventListener('click', function () { done(named); });
      box.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { done(named); return; }
        if (ev.key !== 'Tab') return;
        // the keyboard stays inside the sheet while it is open
        var f = Array.prototype.filter.call(box.querySelectorAll('button, a[href], input, textarea'), function (x) { return !x.disabled && x.tabIndex !== -1 && x.offsetParent !== null; });
        if (!f.length) return;
        if (ev.shiftKey && document.activeElement === f[0]) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && document.activeElement === f[f.length - 1]) { ev.preventDefault(); f[0].focus(); }
      });

      function head(t) { var h = el('h2', 'door-head', t); h.id = 'door-head'; return h; }
      function field(label, id, attrs) {
        var w = el('div', 'door-field'), l = el('label', null, label), i = el('input');
        l.htmlFor = id; i.id = id; i.type = 'text'; i.spellcheck = false;
        i.setAttribute('autocorrect', 'off'); i.setAttribute('autocapitalize', 'none');
        Object.keys(attrs || {}).forEach(function (k) { i.setAttribute(k, attrs[k]); });
        w.appendChild(l); w.appendChild(i);
        return { box: w, input: i };
      }
      function tick(label, id, on) {
        var w = el('div', 'door-tick'), i = el('input'), l = el('label', null, label);
        i.type = 'checkbox'; i.id = id; i.checked = !!on; l.htmlFor = id;
        w.appendChild(i); w.appendChild(l);
        return { box: w, input: i };
      }
      function go(t) { var b = el('button', 'door-go', t); b.type = 'submit'; return b; }
      function quiet(t, fn) { var b = el('button', 'door-link', t); b.type = 'button'; b.addEventListener('click', fn); return b; }
      function status() { var p = el('p', 'door-status'); p.setAttribute('role', 'status'); return p; }
      function small(t) { return el('p', 'door-small', t); }
      function focus(i) { setTimeout(function () { try { i.focus(); } catch (e) {} }, 30); }

      function newView() {
        body.textContent = '';
        var words;
        try { words = threeWords(); } catch (e) { words = null; }
        var form = el('form', 'door-form'); form.noValidate = true;
        var nm = field('What shall we call you?', 'door-name', { autocapitalize: 'words', maxlength: '32', autocomplete: 'username' });
        var chips = el('div', 'door-words');
        var other = quiet('↻ other words', function () { words = threeWords(); paint(); });
        function paint() { chips.textContent = ''; (words || []).forEach(function (w) { chips.appendChild(el('span', null, w)); }); chips.appendChild(other); }
        paint();
        var adult = tick('I am 18 or over', 'door-adult', false);
        var rem = tick('Remember me on this ' + DEVICE, 'door-rem', true);
        var st = status(), b = go('Carry on');
        [nm.box, small('A first name or a nickname is fine. Letters, numbers, - and _, with a space between words.'),
          el('p', 'door-label', 'Your three words'), chips,
          small('These are the only key to your name. Nobody can look them up for you, so keep them somewhere safe.'),
          adult.box, rem.box, small(PUBLIC), b, st].forEach(function (x) { form.appendChild(x); });
        body.appendChild(head('A name for your words'));
        body.appendChild(form);
        var alt = el('p', 'door-alt'); alt.appendChild(quiet('I’ve been here before', backView)); body.appendChild(alt);
        if (!words) { st.textContent = 'The word list didn’t load. Please reload the page.'; b.disabled = true; }
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          if (!words) return;
          if (cleanName(nm.input.value).length < 2) { st.textContent = SAY.short; nm.input.focus(); return; }
          if (!adult.input.checked) { st.textContent = SAY.adult; adult.input.focus(); return; }
          b.disabled = true; st.textContent = 'One moment…';
          signUp(nm.input.value, words.join('-')).then(function (r) {
            b.disabled = false;
            if (!r.ok) { st.textContent = SAY[r.why] || SAY.beach; return; }
            var m = { name: r.name, words: r.words };
            keepMe(m, rem.input.checked);
            cardView(m, 'You’re ' + m.name + '.');
          });
        });
        focus(nm.input);
      }

      function backView() {
        body.textContent = '';
        var form = el('form', 'door-form'); form.noValidate = true;
        var nm = field('Your name', 'door-name2', { autocapitalize: 'words', maxlength: '32', autocomplete: 'username', name: 'username' });
        var wd = field('Your words, or your key', 'door-key', { autocomplete: 'current-password', name: 'password' });
        wd.input.type = 'password';
        var show = tick('Show what I type', 'door-show', false);
        show.input.addEventListener('change', function () { wd.input.type = show.input.checked ? 'text' : 'password'; });
        var rem = tick('Remember me on this ' + DEVICE, 'door-rem2', true);
        var st = status(), b = go('Come in');
        [nm.box, wd.box, show.box, small(SAY.back), rem.box, b, st]
          .forEach(function (x) { form.appendChild(x); });
        body.appendChild(head('Welcome back'));
        body.appendChild(form);
        var alt = el('p', 'door-alt');
        alt.appendChild(quiet('I’m new', newView));
        alt.appendChild(document.createTextNode(' · '));
        alt.appendChild(quiet('I’ve lost my words', lostView));
        body.appendChild(alt);
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          b.disabled = true; st.textContent = 'One moment…';
          signIn(nm.input.value, wd.input.value, family).then(function (r) {
            b.disabled = false;
            if (!r.ok) { st.textContent = SAY[r.why] || SAY.beach; return; }
            var m = { name: r.name, words: r.words };
            keepMe(m, rem.input.checked);
            done(m);
          });
        });
        focus(nm.input);
      }

      function lostView() {
        body.textContent = '';
        body.appendChild(head('Lost your words?'));
        body.appendChild(small(SAY.lost));
        var p = el('p', 'door-small');
        var a = el('a', null, 'The ways back to your key'); a.href = LOST; a.rel = 'noopener';
        p.appendChild(a);
        if (ROOM) {
          p.appendChild(document.createTextNode(', or ask in '));
          var r = el('a', null, 'the room'); r.href = ROOM; r.rel = 'noopener';
          p.appendChild(r);
        }
        p.appendChild(document.createTextNode('.'));
        body.appendChild(p);
        var alt = el('p', 'door-alt');
        alt.appendChild(quiet('Back', backView));
        alt.appendChild(document.createTextNode(' · '));
        alt.appendChild(quiet('I’m new', newView));
        body.appendChild(alt);
        focus(alt.querySelector('button'));
      }

      function cardView(m, heading) {
        body.textContent = '';
        body.appendChild(head(heading));
        var chips = el('div', 'door-words');
        m.words.split('-').forEach(function (w) { chips.appendChild(el('span', null, w)); });
        body.appendChild(small('These three words are the only key to your name. Keep them somewhere safe.'));
        body.appendChild(chips);
        var img = el('img', 'door-card'); img.alt = 'Your card: ' + m.name + ', ' + m.words.split('-').join(', ');
        body.appendChild(img);
        var st = status(), keep = el('div', 'door-keep');
        var pwb = el('button', 'door-go door-quiet', 'Save to my ' + DEVICE + '’s passwords'); pwb.type = 'button';
        pwb.addEventListener('click', function () { savePassword(m, st); });
        var pic = el('button', 'door-go door-quiet', 'Save the picture'); pic.type = 'button'; pic.disabled = true;
        keep.appendChild(pwb); keep.appendChild(pic);
        body.appendChild(keep); body.appendChild(st);
        var on = el('button', 'door-go', 'I’ve kept them'); on.type = 'button';
        on.addEventListener('click', function () { done(m); });
        body.appendChild(on);
        named = m;
        cardPicture(m.name, m.words).then(function (src) {
          img.src = src; pic.disabled = false;
          pic.addEventListener('click', function () { savePicture(src, m, st); });
        }, function () { img.remove(); });
        focus(pwb);
      }
      if (start === 'back') backView(); else newView();
    });
    return sheetOpen;
  }
  // the person at this phone: known already, or asked now
  function name(start) { var m = me(); return m ? Promise.resolve(m) : sheet(start); }

  // the line that says who this phone thinks you are
  function whoLine(mount) {
    function draw() {
      mount.textContent = '';
      var m = me();
      if (m) {
        mount.appendChild(document.createTextNode('You are '));
        mount.appendChild(el('strong', null, m.name));
        mount.appendChild(document.createTextNode(' on this ' + DEVICE + ' · '));
        var b = el('button', 'door-link', 'not you?'); b.type = 'button';
        b.addEventListener('click', function () { forget(); draw(); onNamed.forEach(function (fn) { try { fn(null); } catch (e) {} }); });
        mount.appendChild(b);
      } else {
        var n = el('button', 'door-link', 'I’m new'); n.type = 'button';
        n.addEventListener('click', function () { sheet('new').then(null, function () {}); });
        var c = el('button', 'door-link', 'I’ve been here'); c.type = 'button';
        c.addEventListener('click', function () { sheet('back').then(null, function () {}); });
        mount.appendChild(n); mount.appendChild(document.createTextNode(' · ')); mount.appendChild(c);
      }
    }
    draw();
    onNamed.push(draw);
    return draw;
  }

  // ---- words on the beach, as the beach's own voice puts them ----------------------------------------
  function intro(fam, who) {
    return 'MIRROR — ' + who + '’s readings on the ' + fam + ' family (spine:' + fam +
      '), at the spine’s own addresses. Sovereign to them; silence at an address is honest absence.';
  }
  /* a block of the person's own, founded latched to their key; where they have a passport the beach
   * takes no other key for their name (handle_bound), so the founding is made again proving it */
  function found(block, key, content) {
    return post({ block: block, content: content, new_lock: key }).then(function (w) {
      return w.ok || w.code !== 'handle_bound' ? w : post({ block: block, content: content, secret: key, new_lock: key });
    });
  }
  function say(op) {
    op = op || {};
    var fam = String(op.family || family || '').toLowerCase(), addr = String(op.at || '').trim(), text = String(op.text || '').trim().slice(0, 2000);
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(fam)) return Promise.resolve({ ok: false, error: 'not a family name' });
    if (!/^[1-9][0-9]*(\.[0-9]+)?$/.test(addr)) return Promise.resolve({ ok: false, error: 'not an address' });
    if (!text) return Promise.resolve({ ok: false, error: 'nothing to say' });
    return name().then(function (m) {
      var block = fam + ':' + m.name;
      return read(block).then(function (mirror) {
        return (mirror ? Promise.resolve({ ok: true }) : found(block, m.words, { _: intro(fam, m.name) })).then(function (w) {
          // confirm_required: the mirror was founded a moment ago, from another tab, and stands
          return w.ok || w.code === 'confirm_required' ? post({ block: block, spindle: addr, content: text, secret: m.words }) : w;
        });
      }).then(function (r) {
        r.name = m.name;
        if (!r.ok) r.why = refused(r) ? 'key' : 'beach';
        return r;
      }, function () { return { ok: false, why: 'beach', name: m.name }; });
    }, function () { return { ok: false, why: 'closed', quiet: true }; });
  }

  // ---- write boxes ---------------------------------------------------------------------------------
  // A box keeps its draft on this device until the words land (the rule of keepDraft on
  // happyseaurchin.com): the key names where the words are going, never the page.
  function keepDraft(box, key) {
    var k = 'draft:' + key;
    if (!box) return function () {};
    if (!box.value) { var d = sget(localStorage, k); if (d) box.value = d; }
    box.addEventListener('input', function () { sset(localStorage, k, box.value || null); });
    return function () { sset(localStorage, k, null); };
  }
  // A microphone beside the box, from beach.js where the page carries it (ways:dictation).
  function mic(box) { return window.Beach && window.Beach.addMic ? window.Beach.addMic(box) : null; }

  // matthewbushell.life: keep a name as the sheet does, and tell whoever is listening
  function enter(m, remember) {
    keepMe(m, remember);
    onNamed.forEach(function (fn) { try { fn(m); } catch (e) {} });
    return m;
  }

  window.Door = {
    beach: BEACH, family: function (f) { if (f != null) family = String(f); return family; },
    me: me, name: name, sheet: sheet, forget: forget, whoLine: whoLine, onNamed: function (fn) { onNamed.push(fn); },
    say: say, read: read, index: index, keepDraft: keepDraft, mic: mic, PUBLIC: PUBLIC,
    // matthewbushell.life: the door's pieces, for a way in laid out in a page's own look
    enter: enter,
    inline: { signUp: signUp, signIn: signIn, threeWords: threeWords, cleanName: cleanName, cardPicture: cardPicture,
      savePicture: savePicture, savePassword: savePassword, SAY: SAY, DEVICE: DEVICE, LOST: LOST, ROOM: ROOM },
    // for the checks only
    _t: { cleanName: cleanName, fold: fold, taken: taken, spelled: spelled, tidied: tidied, tries: tries, nearest: nearest, threeWords: threeWords, intro: intro, cardPicture: cardPicture }
  };
})();
