#!/usr/bin/env python3
"""The generator for www.matthewbushell.life. Plain Python, no dependencies, and no key.

It reads the page map at spine:life-work 7.1 and the yes lines and pins at function:life-work 4,
reads the words raw over the beach's public wire, and writes plain HTML from templates/.

  A page is written only when its yes line stands at function:life-work 4.1. With no yes lines at all
  the site is only the holding page. The menu names only pages that are up, and a link to a page that
  isn't up prints as plain words.
  A block on the page map other than spine:life-work reaches a page only through a pin at
  function:life-work 4.2. A page with no pin for it is held; a pin whose lines have changed holds the
  page as it was and asks for a fresh yes, unless the pin says 'follows'.
  A sealed line is never printed. A page holding 'Encrypted (gray)' or a long base64 run is held, and
  so is one whose words change by more than half at once, until its yes is said again.
  Nothing in the output carries the time of the run, so nothing changes when nothing has changed.

The site, run by the workflow:
  python3 tools/generate.py --site URL --root PATH

A private preview on a words file, outside this repository:
  python3 tools/generate.py --words ~/life-work/words.json --pictures ~/life-work/pictures \\
      --out ~/life-work/preview --preview

  The words file is JSON. Either a map of block names to blocks,
    {"spine:life-work": {...}, "function:life-work": {...}, "moonstone:Ada": {...}}
  or one block alone, which is taken as spine:life-work (tools/nonsense.json is that shape).
  Any block or branch of the spine it doesn't hold is read from the beach, unless --offline.
  --preview gives every page on the map a pretend yes and reports pins without holding pages.
  Serve it with: python3 tools/serve.py ~/life-work/preview --root ''

A pin line, to copy into function:life-work 4.2:
  python3 tools/generate.py --fingerprint moonstone:Ada 0
"""
import argparse
import difflib
import hashlib
import html
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import fill  # noqa: E402

WIRE = 'https://beach.happyseaurchin.com/.well-known/pscale-beach'
SPINE = 'spine:life-work'
LAW = 'function:life-work'
FAMILY = 'life-work'
POOL = 'pool:life-work'
ROOM = 'https://mirror.onen.ai/?pool=life-work'
SITE = 'https://www.matthewbushell.life'

ASSETS = ['site.css', 'site.js', 'mark.svg', 'favicon.svg', 'beach.js', 'door.js', 'door.css', 'tools.js']
BASE64_RUN = re.compile(r'[A-Za-z0-9+/=_-]{32,}')
HALF = 0.5


class Fatal(Exception):
    """The run can't be trusted: nothing is written and the last good pages stay up."""


# ---- reading ---------------------------------------------------------------------------------------

def raw_at(tree, spindle):
    """A raw node by spindle, with no checks: '7' is branch 7, '8.4' is 8 then 4, '0' is the root's line."""
    if spindle is None:
        return tree
    if spindle == '0':
        return tree.get('_') if isinstance(tree, dict) else tree
    node = tree
    for d in spindle.replace('.', ''):
        if not isinstance(node, dict) or d not in node:
            return None
        node = node[d]
    return node


class Beach:
    """The beach's public wire, read raw: ?block=<name>&spindle=<branch>, never with &pscale."""

    def __init__(self, wire=WIRE, tries=3):
        self.wire, self.tries = wire, tries

    def get(self, block, spindle=None):
        q = {'block': block}
        if spindle is not None:
            q['spindle'] = spindle
        address = self.wire + '?' + urllib.parse.urlencode(q)
        last = None
        for attempt in range(self.tries):
            try:
                req = urllib.request.Request(address, headers={
                    'Accept': 'application/json', 'User-Agent': 'matthewbushell.life generator'})
                with urllib.request.urlopen(req, timeout=30) as r:
                    return json.loads(r.read().decode('utf-8'))
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    return None
                last = 'HTTP %d' % e.code
            except (urllib.error.URLError, OSError, ValueError) as e:
                last = str(e)
            if attempt + 1 < self.tries:
                time.sleep(2 * (attempt + 1))
        raise Fatal('the beach could not be read at %s (%s)' % (address, last))


class Words:
    """A local words file in place of the beach, for a private preview or the tests."""

    def __init__(self, path, fallback=None):
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, dict):
            raise Fatal('the words file is not a JSON object')
        if all(re.fullmatch(r'[1-9_]', k) for k in data):
            data = {SPINE: data}
        self.blocks, self.fallback = data, fallback

    def get(self, block, spindle=None):
        """The file's own node wins. For a branch of the spine, what the file lacks beneath it comes from
        the beach, child by child: a words file holds the words and pictures, while the page map at 7.1
        and the set-aside at 7.3 stay on the beach."""
        if block not in self.blocks:
            return self.fallback.get(block, spindle) if self.fallback else None
        tree = self.blocks[block]
        node = raw_at(tree, spindle)
        if block != SPINE or not self.fallback or spindle is None:
            return node
        if node is None:
            return self.fallback.get(block, spindle)
        if isinstance(node, dict) and not fill.is_sealed(node) and re.fullmatch(r'[1-9]', spindle):
            there = self.fallback.get(block, spindle)
            if isinstance(there, dict) and not fill.is_sealed(there):
                merged = {k: v for k, v in there.items() if k != '_'}
                merged.update(node)
                return merged
        return node


# ---- the page map, the yes lines and the pins -----------------------------------------------------

PAGE_LINE = re.compile(r'^\s*(?P<name>[^,;:]+?)\s*,\s*(?P<path>/[A-Za-z0-9/_-]*)\s*:\s*(?P<reads>.+?)\s*$')


def text(node):
    if isinstance(node, str):
        return node
    if isinstance(node, dict) and isinstance(node.get('_'), str):
        return node['_']
    return ''


def fold(s):
    return re.sub(r'[\s_-]+', '', str(s).lower())


class Page:
    def __init__(self, index, name, path, reads):
        self.index, self.name, self.path, self.reads = index, name, path, reads
        self.slug = 'home' if path == '/' else path.strip('/').replace('/', '-')
        self.file = 'index.html' if path == '/' else path.strip('/') + '.html'

    @property
    def branches(self):
        return [r for r in self.reads if re.fullmatch(r'[1-7]', r)]

    @property
    def blocks(self):
        return [r for r in self.reads if not re.fullmatch(r'[0-9]', r)]


def page_map(seven):
    """7.1: one line per page, 'name, path: what it reads', separated by semicolons. 7.19's 'Every page'
    line has no path and is not a page: the look is baked into site.css, so it is not read."""
    node = raw_at(seven, '1')
    if not isinstance(node, dict):
        raise Fatal('the page map at spine:life-work 7.1 is not there')
    pages, seen = [], set()
    for d in range(1, 10):
        child = node.get(str(d))
        if fill.is_sealed(child):
            raise Fatal('the page map line at 7.1%d is sealed' % d)
        m = PAGE_LINE.match(text(child))
        if not m:
            continue
        reads = [r.strip() for r in m.group('reads').split(';') if r.strip()]
        for r in reads:
            if re.fullmatch(r'[0-9]', r) and not re.fullmatch(r'[1-7]', r):
                raise Fatal('page %s reads branch %s, which holds no site words' % (m.group('name'), r))
        page = Page(d, m.group('name').strip(), m.group('path'), reads)
        if page.path in seen:
            raise Fatal('two pages at ' + page.path)
        seen.add(page.path)
        pages.append(page)
    return pages


YES_LINE = re.compile(r'^\s*(?P<name>.+?)\s*[,;:—–]\s*(?P<when>.*\d.*?)\s*$')


def yes_lines(law, notes):
    """function:life-work 4.1: one line per page, its name and the date of the yes."""
    node = raw_at(law, '4.1')
    out = {}
    if not isinstance(node, dict):
        return out
    for d in range(1, 10):
        child = node.get(str(d))
        if child is None:
            continue
        if fill.is_sealed(child):
            notes.append('the yes line at function:life-work 4.1%d is sealed, so it counts for nothing' % d)
            continue
        m = YES_LINE.match(text(child))
        if m:
            out[fold(m.group('name'))] = text(child).strip()
        elif text(child).strip():
            notes.append('the yes line at function:life-work 4.1%d has no date, so it counts for nothing' % d)
    return out


class Pin:
    def __init__(self, line):
        parts = [p.strip() for p in line.split(';')]
        if len(parts) < 4 or not parts[0] or not parts[1] or not parts[2]:
            raise ValueError(line)
        self.block, self.address, self.fingerprint, self.date = parts[:4]
        self.follows = any(p.lower() == 'follows' for p in parts[4:])
        self.line = line.strip()


def pins_for(law, page, notes):
    """function:life-work 4.2<n>, for the page at 7.1<n>: up to nine lines,
    'block; address; fingerprint; date of the yes', and 'follows' if that line may flow."""
    node = raw_at(law, '4.2%d' % page.index)
    pins = []
    if node is None:
        return pins
    lines = [node] if isinstance(node, str) else [node.get(str(d)) for d in range(1, 10)]
    for child in lines:
        if child is None:
            continue
        if fill.is_sealed(child):
            notes.append('a pin for %s is sealed, so it counts for nothing' % page.name)
            continue
        t = text(child).strip()
        if not t:
            continue
        try:
            pins.append(Pin(t))
        except ValueError:
            notes.append('a pin for %s is not in the form block; address; fingerprint; date: %s' % (page.name, t))
    return pins


def fingerprint(node):
    canon = json.dumps(node, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canon.encode('utf-8')).hexdigest()[:12]


def plain_lines(node, address):
    """A node as plain words, one 'address: line' each, for an issue."""
    out = []

    def go(n, a):
        if fill.is_sealed(n):
            out.append('%s: (sealed)' % a)
        elif isinstance(n, str):
            out.append('%s: %s' % (a, n))
        elif isinstance(n, dict):
            if isinstance(n.get('_'), str):
                out.append('%s: %s' % (a, n['_']))
            for d in range(1, 10):
                if str(d) in n:
                    go(n[str(d)], child_address(a, d))
    go(node, address)
    return out


def child_address(a, d):
    """'3' then 6 is '3.6'; '3.6' then 2 is '3.62'; the root ('0') then 1 is '1'."""
    if a == '0':
        return str(d)
    return a + str(d) if '.' in a else a + '.' + str(d)


# ---- making a page -----------------------------------------------------------------------------------

def restricted(spine, page, box_line):
    """Only the branches the page's line names, and 7. A branch's opening line is never printed, so it
    is left out. The line beside every box, 6.2, is there for any page with a box."""
    tree = {}
    for b in page.branches:
        node = spine.get(b)
        if isinstance(node, dict) and not fill.is_sealed(node):
            tree[b] = {k: v for k, v in node.items() if k != '_'} if b != '7' else node
        elif node is not None:
            tree[b] = node
    if '7' not in tree and '7' in spine:
        tree['7'] = spine['7']
    if box_line and '6' not in tree:
        six = spine.get('6')
        if isinstance(six, dict) and '2' in six:
            tree['6'] = {'2': six['2']}
    return tree


def read_template(name):
    path = os.path.join(REPO, 'templates', name)
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return f.read()


def asset_hash(name):
    with open(os.path.join(REPO, 'assets', name), 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:8]


def version_assets(page_html, root):
    """Each asset carries a tag from its own contents, so a changed file is fetched fresh."""
    def tag(m):
        name, rest = m.group(2), m.group(3) or ''
        if not os.path.exists(os.path.join(REPO, 'assets', name)):
            return m.group(0)
        return '%s/assets/%s?v=%s%s"' % (m.group(1), name, asset_hash(name), rest)
    pat = re.compile(r'(%s)/assets/([A-Za-z0-9._-]+)(#[A-Za-z0-9_-]+)?"' % re.escape(root))
    return pat.sub(tag, page_html)


def tool_ids(page_html):
    """Each drawing's tools get an id from their address, so Share links straight to it."""
    def sub(m):
        if ' id="' in m.group(0):
            return m.group(0)
        return m.group(0)[:-1] + ' id="at-%s">' % m.group(1).replace('.', '-')
    return re.sub(r'<div class="tools"[^>]*\bdata-comment-at="([0-9.]+)"[^>]*>', sub, page_html)


ANCHOR = re.compile(r'<a\b([^>]*?)\bhref="([^"]*)"([^>]*)>(.*?)</a>', re.S)


def unlink(page_html, root, live_paths):
    """A link to a page of this site that isn't up prints as plain words."""
    def sub(m):
        href = html.unescape(m.group(2))
        if not (href == root or href.startswith(root + '/')) or href.startswith('//'):
            return m.group(0)
        path = href[len(root):] or '/'
        path = re.split(r'[#?]', path)[0] or '/'
        if path != '/' and path.endswith('/'):
            path = path[:-1]
        if path.startswith('/assets/') or path.startswith('/pictures/'):
            return m.group(0)
        if path in live_paths:
            return m.group(0)
        return '<span>%s</span>' % m.group(4)
    return ANCHOR.sub(sub, page_html)


TAG = re.compile(r'<[^>]+>')
ATTR = re.compile(r'\s([a-zA-Z:-]+)="([^"]*)"')
DROP = re.compile(r'<(script|style|template)\b.*?</\1>', re.S)


def visible_words(page_html):
    body = DROP.sub(' ', page_html)
    body = TAG.sub(' ', body)
    return html.unescape(body).split()


def uncounted(page_html):
    """A private preview is never counted: GoatCounter's script and its pixel come out."""
    page_html = re.sub(r'<!-- visit counting[^>]*-->\n?', '', page_html)
    page_html = re.sub(r'<script\b[^>]*\bdata-goatcounter=[^>]*></script>\n?', '', page_html)
    return re.sub(r'<noscript><img\b[^>]*goatcounter[^>]*></noscript>\n?', '', page_html)


def checks(page_html):
    """What would make a page wrong to publish, in plain words."""
    problems = []
    if fill.SEALED in page_html:
        problems.append("it holds 'Encrypted (gray)'")
    pieces = [' '.join(visible_words(page_html))]
    for tag in re.findall(r'<[^>]+>', DROP.sub(' ', page_html)):
        for k, v in ATTR.findall(tag):
            if k not in ('href', 'src', 'd', 'viewBox', 'points', 'transform', 'style', 'integrity'):
                pieces.append(html.unescape(v))
    for piece in pieces:
        for run in BASE64_RUN.findall(piece):
            if re.search(r'[0-9]', run) and re.search(r'[a-z]', run) and re.search(r'[A-Z]', run):
                problems.append('it holds a long run like scrambled text: %s…' % run[:16])
                break
    for href in re.findall(r'\bhref="([^"]*)"', page_html):
        h = html.unescape(href)
        if re.match(r'\s*(javascript|data|vbscript):', h, re.I):
            problems.append('it holds a link that is not allowed: ' + h[:40])
    return problems


def change(old_html, new_html):
    a, b = visible_words(old_html), visible_words(new_html)
    if not a:
        return 0.0
    return 1.0 - difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()


def pictures_in(page_html, root):
    return sorted(set(re.findall(r'(?:src|content)="(?:[^"]*?)%s/pictures/([^"?#]*)"' % re.escape(root), page_html)) |
                  set(re.findall(r'(?:src|content)="https?://[^"]*/pictures/([^"?#]*)"', page_html)))


# ---- the run -----------------------------------------------------------------------------------------

class Result:
    def __init__(self):
        self.published, self.held, self.issues, self.notes, self.files = [], [], [], [], {}

    def issue(self, title, body):
        if not any(i['title'] == title for i in self.issues):
            self.issues.append({'title': title, 'body': body})


def esc_json_for_script(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True).replace('</', '<\\/')


def tools_html(root, site, spine, aside):
    """The reader tools, at the foot of every page: the line beside every box, the set-aside, the door's
    settings for this site, then beach.js, door.js and tools.js."""
    six = spine.get('6')
    node = six.get('2') if isinstance(six, dict) and not fill.is_sealed(six) else None
    if fill.is_sealed(node):
        raise fill.Missing('sealed line at 6.2, the line beside every box')
    box_line = text(node)
    if not box_line.strip():
        raise fill.Missing('nothing at 6.2, the line beside every box')
    line = fill.rich(box_line, root)
    if 'href="%s/support' % root not in line:
        line += ' <a href="%s/support">Finding support</a>' % root
    words = '<template id="tool-words"><p class="boxline">%s</p></template>' % line
    data = '<script type="application/json" id="life-work">%s</script>' % esc_json_for_script(
        {'family': FAMILY, 'pool': POOL, 'aside': aside})
    door = {
        'place': 'Matthew Bushell', 'home': site + '/', 'room': ROOM, 'proved': True,
        'say': {
            'back': 'If you came in on one of Matthew’s other pages, this site doesn’t know you yet. '
                    'Type your name and your three words, exactly as you chose them.',
        },
    }
    config = '<script>window.DOOR=%s;</script>' % esc_json_for_script(door)
    scripts = ''.join('<script src="%s/assets/%s"></script>' % (root, s) for s in ('beach.js', 'door.js', 'tools.js'))
    return '\n'.join([words, data, config, scripts])


def set_aside(seven):
    """7.3: voices the site doesn't show, 'name at address', or a slot in pool:life-work."""
    voices, slots = [], []

    def go(n):
        if isinstance(n, dict):
            for d in range(1, 10):
                if str(d) in n:
                    go(n[str(d)])
                    t = text(n[str(d)])
                    if isinstance(n[str(d)], dict) and t:
                        take(t)
        elif isinstance(n, str):
            take(n)

    def take(line):
        m = re.search(r'pool:life-work\D*?(\d+)', line)
        if m:
            slots.append(m.group(1))
            return
        m = re.match(r'^\s*(.+?)\s*(?:\bat\b|,)\s*(\d+(?:\.\d+)?)\s*\.?\s*$', line, re.I)
        if m:
            voices.append(fold(m.group(1)) + '@' + m.group(2))
    node = raw_at(seven, '3')
    if isinstance(node, dict) and not fill.is_sealed(node):
        go(node)
    return {'voices': sorted(set(voices)), 'slots': sorted(set(slots))}


def generate(source, out, site=SITE, root='', pictures=None, record_path=None, preview=False):
    res = Result()
    root = root.rstrip('/')
    site = site.rstrip('/')
    law = source.get(LAW)
    if not isinstance(law, dict):
        raise Fatal('the law at function:life-work could not be read')
    seven = source.get(SPINE, '7')
    if not isinstance(seven, dict):
        raise Fatal('spine:life-work 7 could not be read')
    pages = page_map(seven)
    yeses = yes_lines(law, res.notes)
    for name in yeses:
        if not any(fold(p.name) == name for p in pages):
            res.notes.append('a yes line names a page that is not on the map: ' + yeses[name])

    record = {'pages': {}, 'pins': {}}
    if record_path and os.path.exists(record_path):
        with open(record_path, encoding='utf-8') as f:
            record = json.load(f)
        record.setdefault('pages', {})
        record.setdefault('pins', {})
    new_record = {'pages': {}, 'pins': {}}

    def yes_of(page):
        if preview:
            return 'preview'
        return yeses.get(fold(page.name))

    wanted = [p for p in pages if yes_of(p)]
    spine = {'7': seven}
    branches = sorted({b for p in wanted for b in p.branches if b != '7'} | ({'6'} if wanted else set()))
    for b in branches:
        node = source.get(SPINE, b)
        if node is None:
            continue
        spine[b] = node

    def old(page):
        """The page as it was last published, or None. The record says what was up; with no record,
        a file that is the holding page was never a page."""
        path = os.path.join(out, page.file)
        if record_path and page.path not in record['pages']:
            return None
        if os.path.exists(path):
            with open(path, encoding='utf-8') as f:
                before = f.read()
            if 'class="ground hold"' in before:
                return None
            return before
        return None

    base = read_template('_base.html')
    aside = set_aside(seven)
    state = {}  # page path -> ('fresh', content) | ('held', why)

    for page in wanted:
        tpl = read_template(page.slug + '.html')
        if tpl is None:
            state[page.path] = ('held', 'there is no template for it, templates/%s.html' % page.slug)
            continue
        why = None
        for block in page.blocks:
            pins = [p for p in pins_for(law, page, res.notes) if p.block == block]
            if not pins:
                why = 'it reads %s and has no pin for it at function:life-work 4.2%d' % (block, page.index)
                if preview:
                    res.notes.append('%s: %s (a preview carries on)' % (page.name, why))
                    why = None
                continue
            for pin in pins:
                node = source.get(block, pin.address)
                now = fingerprint(node) if node is not None and not fill.is_sealed(node) else None
                key = '%s|%s|%s' % (page.path, block, pin.address)
                lines = plain_lines(node, pin.address) if node is not None else ['(nothing there)']
                if now == pin.fingerprint or (pin.follows and now is not None):
                    new_record['pins'][key] = {'fingerprint': now, 'lines': lines}
                    continue
                kept = record['pins'].get(key)
                old_lines = kept['lines'] if kept and kept.get('fingerprint') == pin.fingerprint else None
                body = [
                    'The lines at %s, address %s, no longer match the pin for %s at function:life-work 4.2%d.' % (
                        block, pin.address, page.name, page.index),
                    '%s stays as it was until there is a fresh yes.' % page.name, '',
                    'The pin: %s' % pin.line, '', 'The old lines:', '']
                body += old_lines if old_lines else ['(not kept: the record has no copy of the lines this pin matched)']
                body += ['', 'The new lines:', ''] + lines + ['',
                         'To say yes to the new lines, write this pin line in place of the old one, with the date:',
                         '', '%s; %s; %s; <the date of your yes>' % (block, pin.address, now or '(unreadable)')]
                res.issue('%s is held: the pin for %s %s has changed' % (page.name, block, pin.address), '\n'.join(body))
                why = 'the pin for %s %s has changed' % (block, pin.address)
                if preview:
                    res.notes.append('%s: %s (a preview carries on)' % (page.name, why))
                    why = None
        if why:
            state[page.path] = ('held', why)
            continue
        tree = restricted(spine, page, box_line=('class="tools"' in tpl or 'data-tool=' in tpl))
        try:
            content = tool_ids(fill.fill(tpl, tree, root=root))
        except fill.Missing as e:
            state[page.path] = ('held', str(e))
            continue
        state[page.path] = ('fresh', content)

    # what is up: every page made fresh, and every held page that was up before
    def live_set():
        live = set()
        for page in wanted:
            kind = state.get(page.path, ('held', ''))[0]
            if kind == 'fresh' or (kind == 'held' and old(page) is not None):
                live.add(page.path)
        return live

    finished = {}
    for _ in range(len(wanted) + 1):
        live = live_set()
        changed = False
        finished = {}
        for page in wanted:
            kind, value = state[page.path]
            if kind != 'fresh':
                continue
            nav = []
            for p in pages:
                if p.path in live and p.path != '/support':
                    href = root + (p.path if p.path != '/' else '/')
                    here = ' class="here" aria-current="page"' if p.path == page.path else ''
                    nav.append('<a href="%s"%s>%s</a>' % (html.escape(href), here, html.escape(p.name)))
            item = raw_at(seven, '5%d' % page.index)
            try:
                extra = {
                    'content': value, 'nav': '\n'.join(nav), 'site': site, 'path': page.path,
                    'tools': tools_html(root, site, spine, aside),
                    'robots': '<meta name="robots" content="noindex">' if preview else '',
                }
                if fill.is_sealed(item) or item is None:
                    raise fill.Missing('nothing at 7.5%d, the page lines' % page.index)
                page_html = fill.fill(base, {'7': seven}, item=item, root=root, extra=extra)
            except fill.Missing as e:
                state[page.path] = ('held', str(e))
                changed = True
                continue
            page_html = unlink(page_html, root, live)
            page_html = version_assets(page_html, root)
            if preview:
                page_html = uncounted(page_html)
            problems = checks(page_html)
            mailtos = set(re.findall(r'href="(mailto:[^"]+)"', page_html))
            if len(mailtos) > 1:
                problems.append('it links to more than one mailto address')
            missing = [p or '(no file named)' for p in pictures_in(page_html, root)
                       if not p or not pictures or not os.path.isfile(os.path.join(pictures, p))]
            if missing:
                problems.append('a picture it shows is not in the pictures folder: ' + ', '.join(missing))
            if problems:
                state[page.path] = ('held', '; '.join(problems))
                changed = True
                continue
            before = old(page)
            yes = yes_of(page)
            kept = record['pages'].get(page.path, {})
            if before is not None and not preview and kept.get('yes') == yes:
                moved = change(before, page_html)
                if moved > HALF:
                    state[page.path] = ('held', 'its words changed by %d%% at once' % round(moved * 100))
                    res.issue('%s is held: its words changed by more than half at once' % page.name, '\n'.join([
                        '%s would change by %d%% of its words in one run, so it stays as it was.' % (page.name, round(moved * 100)),
                        '', 'If the change is meant, say its yes again: write a new date on its line at function:life-work 4.1.']))
                    changed = True
                    continue
            finished[page.path] = page_html
        if not changed:
            break

    # the files
    files = {}
    live = live_set()
    for page in wanted:
        kind, value = state[page.path]
        if page.path in finished:
            files[page.file] = finished[page.path]
            res.published.append(page.path)
            new_record['pages'][page.path] = {'yes': yes_of(page)}
        else:
            reason = value if kind == 'held' else 'it could not be finished'
            res.held.append({'page': page.name, 'why': reason})
            before = old(page)
            if before is not None:
                files[page.file] = before
                if page.path in record['pages']:
                    new_record['pages'][page.path] = record['pages'][page.path]
                for key, v in record['pins'].items():
                    if key.startswith(page.path + '|') and key not in new_record['pins']:
                        new_record['pins'][key] = v
            if not any(i['title'].startswith(page.name + ' is held') for i in res.issues):
                res.issue('%s is held' % page.name, '%s is not published as it now reads, because %s.%s' % (
                    page.name, reason, ' The last good version stays up.' if before is not None
                    else ' It was not up before, so it stays down.'))
    for page in pages:
        if page not in wanted and old(page) is not None and page.path not in finished:
            res.notes.append('%s has no yes, so it comes down' % page.name)

    holding = fill.fill(read_template('holding.html'), {}, root=root)
    if not live:
        files['index.html'] = holding
        files['404.html'] = holding
        files['robots.txt'] = 'User-agent: *\nAllow: /\n'
        files['assets/site.css'] = None
    else:
        if '/' not in live:
            files['index.html'] = holding
        home_link = '<p class="golink"><a href="%s/">The front page</a></p>' % root if '/' in live else ''
        files['404.html'] = version_assets(fill.fill(read_template('404.html'), {}, root=root, extra={'home': home_link}), root)
        for a in ASSETS:
            files['assets/' + a] = None
        for name in sorted({p for f in files.values() if isinstance(f, str) for p in pictures_in(f, root)}):
            src = os.path.join(pictures, name) if pictures else None
            if src and os.path.exists(src):
                files['pictures/' + name] = ('copy', src)
            elif os.path.exists(os.path.join(out, 'pictures', name)):
                files['pictures/' + name] = ('copy', os.path.join(out, 'pictures', name))
            if src and os.path.exists(src) and os.path.getsize(src) > 600 * 1024:
                res.notes.append('the picture %s is over 600 KB; compress it before it goes in' % name)
        urls = ['%s%s' % (site, p.path) for p in pages if p.path in live]
        files['sitemap.xml'] = ('<?xml version="1.0" encoding="UTF-8"?>\n'
                                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
                                ''.join('<url><loc>%s</loc></url>\n' % html.escape(u) for u in urls) + '</urlset>\n')
        files['robots.txt'] = 'User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n' % site

    res.files = files
    write_out(out, files)
    if record_path and not preview:
        os.makedirs(os.path.dirname(os.path.abspath(record_path)), exist_ok=True)
        with open(record_path, 'w', encoding='utf-8') as f:
            json.dump(new_record, f, ensure_ascii=False, sort_keys=True, indent=1)
            f.write('\n')
    return res


def write_out(out, files):
    """Write what changed and remove what is no longer there, inside the out folder only."""
    staged = {}
    for name, value in files.items():
        if value is None:
            with open(os.path.join(REPO, 'assets', name.split('/', 1)[1]), 'rb') as f:
                staged[name] = f.read()
        elif isinstance(value, tuple):
            with open(value[1], 'rb') as f:
                staged[name] = f.read()
        else:
            staged[name] = value.encode('utf-8')
    os.makedirs(out, exist_ok=True)
    for dirpath, dirnames, filenames in os.walk(out, topdown=False):
        for fn in filenames:
            rel = os.path.relpath(os.path.join(dirpath, fn), out).replace(os.sep, '/')
            if rel not in staged:
                os.remove(os.path.join(dirpath, fn))
        if dirpath != out and not os.listdir(dirpath):
            os.rmdir(dirpath)
    for name, data in sorted(staged.items()):
        path = os.path.join(out, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if os.path.exists(path):
            with open(path, 'rb') as f:
                if f.read() == data:
                    continue
        with open(path, 'wb') as f:
            f.write(data)


def inside(path, folder):
    path, folder = os.path.realpath(path), os.path.realpath(folder)
    return path == folder or path.startswith(folder + os.sep)


def main(argv=None):
    ap = argparse.ArgumentParser(description='Make www.matthewbushell.life from the beach, or from a words file.')
    ap.add_argument('--words', help='a local words file in place of the beach (JSON)')
    ap.add_argument('--offline', action='store_true', help='with --words, never read the beach')
    ap.add_argument('--preview', action='store_true', help='every page on the map gets a pretend yes; pins only reported')
    ap.add_argument('--out', default=os.path.join(REPO, 'site'), help='where the site is written (default: site/)')
    ap.add_argument('--site', default=SITE, help='the site address, for canonical and share links')
    ap.add_argument('--root', default='', help="the path the site sits under, '' at the domain")
    ap.add_argument('--pictures', default=os.path.join(REPO, 'pictures'), help='where the picture files are')
    ap.add_argument('--record', default=None, help='the record of what was published (default: record/state.json for the site)')
    ap.add_argument('--report', default=None, help='write what happened as JSON here, for the workflow')
    ap.add_argument('--wire', default=WIRE, help=argparse.SUPPRESS)
    ap.add_argument('--fingerprint', nargs=2, metavar=('BLOCK', 'ADDRESS'), help='print a pin line for a block and address')
    a = ap.parse_args(argv)

    beach = None if a.offline else Beach(a.wire)
    try:
        if a.words:
            if inside(a.words, REPO) and not (inside(a.words, os.path.join(REPO, 'tests')) or
                                              os.path.realpath(a.words) == os.path.join(REPO, 'tools', 'nonsense.json')):
                raise Fatal('a words file inside this repository is refused: keep real words outside it')
            source = Words(a.words, beach)
        elif beach is None:
            raise Fatal('--offline needs --words')
        else:
            source = beach

        if a.fingerprint:
            block, address = a.fingerprint
            node = source.get(block, address)
            if node is None:
                raise Fatal('nothing at %s %s' % (block, address))
            print('%s; %s; %s; <the date of your yes>' % (block, address, fingerprint(node)))
            print('\n'.join(plain_lines(node, address)))
            return 0

        out = os.path.abspath(a.out)
        site_dir = os.path.join(REPO, 'site')
        if inside(out, REPO) and not (inside(out, site_dir) or inside(out, os.path.join(REPO, 'preview'))):
            raise Fatal('the out folder must be site/, preview/ or somewhere outside this repository')
        if (a.words or a.preview) and inside(out, site_dir):
            raise Fatal('a preview or a words file never writes to site/, which is published')
        record = a.record
        if record is None and inside(out, site_dir):
            record = os.path.join(REPO, 'record', 'state.json')
        res = generate(source, out, site=a.site, root=a.root, pictures=a.pictures,
                       record_path=record, preview=a.preview)
    except Fatal as e:
        print('The run failed: %s' % e, file=sys.stderr)
        if a.report:
            with open(a.report, 'w', encoding='utf-8') as f:
                json.dump({'failed': str(e), 'issues': [], 'published': [], 'held': [], 'notes': []}, f, indent=1)
        return 1

    print('Published: %s' % (', '.join(res.published) or 'nothing; the site is the holding page'))
    for h in res.held:
        print('Held: %s, because %s' % (h['page'], h['why']))
    for n in res.notes:
        print('Note: ' + n)
    if a.report:
        with open(a.report, 'w', encoding='utf-8') as f:
            json.dump({'failed': None, 'published': res.published, 'held': res.held,
                       'issues': res.issues, 'notes': res.notes}, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main())
