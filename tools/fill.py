#!/usr/bin/env python3
"""The slot language in templates/. Plain Python, no dependencies.

fill(template_text, tree, item=None, root='', extra=None) returns HTML. `tree` is the block as JSON,
with a line at "_" and children at digits 1-9.

  {{3.62}}           the line at an address, with *italic* and [words](address) made into HTML
  {{.}} {{.31}}      inside a loop, the item's own line, or a line relative to it
  {{a|b}}            the first of these that exists
  {{plain:x}}        the line with no markup, for attributes
  {{url:x}}          the line as a link address
  {{paras:x}}        the line as paragraphs: a blank line starts a new one, a line break is kept
  {{n}}              the loop's position, from 1
  {{#each 3.14}}     children 1 to 9 in order; depth=2 for lists nested by period, to=5 to stop early
  {{#refs 3.73}}     the addresses in a semicolon list, each as the item
  {{#if .1}}         shown when something is there
  {{#repeat .1}}     repeated by a number
  {{root}} and anything in `extra` (content, nav, site, path) are supplied by the generator.

Anything missing, or sealed, raises Missing, so a page that can't be filled is never written.
A sealed line is a gray envelope: a node whose 9._ is 'gray'. Every step of every walk is checked,
because the envelope's own 1 and 2 (its ciphertext and nonce) look like ordinary children.
Links may go only to https addresses, this site's own paths and mailto. Everything else is escaped.
"""
import html
import re

TOKEN = re.compile(r'\{\{(.*?)\}\}', re.S)
LINK = re.compile(r'\[([^\]]+)\]\(([^)\s]+)\)')
EM = re.compile(r'\*([^*\n]+)\*')
SEALED = 'Encrypted (gray)'


class Missing(Exception):
    pass


def is_sealed(node):
    return isinstance(node, dict) and isinstance(node.get('9'), dict) and node['9'].get('_') == 'gray'


def _step(node, d, where):
    if not isinstance(node, dict) or d not in node:
        return None
    child = node[d]
    if is_sealed(child):
        raise Missing('sealed line at ' + where)
    return child


def walk(tree, addr):
    """'3.62' walks 3, 6, 2: the digits after the point are one step each."""
    addr = addr.strip()
    if not re.fullmatch(r'[1-9](\.[1-9]+)?', addr):
        raise Missing('not an address: ' + addr)
    if is_sealed(tree):
        raise Missing('sealed block')
    node = tree
    for d in addr.replace('.', ''):
        node = _step(node, d, addr)
        if node is None:
            return None
    return node


def line_of(node):
    if node is None:
        return None
    if isinstance(node, str):
        return node
    if isinstance(node, dict):
        own = node.get('_')
        if is_sealed(own):
            raise Missing('sealed line')
        return own if isinstance(own, str) else None
    return None


class Ctx:
    def __init__(self, tree, item=None, n=0, root='', extra=None):
        self.tree, self.item, self.n, self.root = tree, item, n, root
        self.extra = extra if extra is not None else {}

    def at(self, ref):
        ref = ref.strip()
        if ref == '.':
            return self.item
        if ref.startswith('.'):
            node = self.item
            for d in ref[1:]:
                node = _step(node, d, ref)
                if node is None:
                    return None
            return node
        return walk(self.tree, ref)

    def first(self, refs):
        for ref in refs.split('|'):
            node = self.at(ref)
            if node is not None and (line_of(node) or isinstance(node, dict)):
                return node
        return None


def url(u, root):
    u = u.strip()
    if u.startswith('/') and not u.startswith('//') and re.fullmatch(r'/[^\s"\'<>`\\]*', u):
        return root + u
    if re.fullmatch(r'https://[^\s"\'<>`\\]+', u):
        return u
    if re.fullmatch(r'mailto:[^\s"\'<>`?\\]+@[^\s"\'<>`?\\]+', u):
        return u
    raise Missing('link not allowed: ' + u)


def _em(escaped):
    return EM.sub(r'<em>\1</em>', escaped)


def rich(line, root=''):
    """A line may hold *italic* and [words](address). Everything else is escaped.
    Links are found in the raw line first, so an address is escaped once, not twice."""
    out, pos = [], 0
    for m in LINK.finditer(line):
        out.append(_em(html.escape(line[pos:m.start()], quote=False)))
        href = html.escape(url(m.group(2), root), quote=True)
        out.append('<a href="%s">%s</a>' % (href, _em(html.escape(m.group(1), quote=False))))
        pos = m.end()
    out.append(_em(html.escape(line[pos:], quote=False)))
    return ''.join(out)


def paras(line, root=''):
    """A poem or a letter: a blank line starts a new paragraph, and a line break inside one is kept."""
    parts = [p.strip() for p in re.split(r'\n\s*\n', line.replace('\r', '')) if p.strip()]
    return ''.join('<p>%s</p>' % rich(p, root).replace('\n', '<br>\n') for p in parts)


def plain(line):
    s = LINK.sub(lambda m: m.group(1), line)
    s = EM.sub(r'\1', s)
    return html.escape(s, quote=True)


def parse(text):
    """Into a tree of strings, slots and blocks."""
    out, stack, pos = [], [], 0
    cur = out
    for m in TOKEN.finditer(text):
        if m.start() > pos:
            cur.append(text[pos:m.start()])
        tok = m.group(1).strip()
        pos = m.end()
        if tok.startswith('#'):
            parts = tok[1:].split()
            node = {'kind': parts[0], 'ref': parts[1] if len(parts) > 1 else '',
                    'args': dict(a.split('=', 1) for a in parts[2:]), 'body': []}
            cur.append(node)
            stack.append((cur, node['kind']))
            cur = node['body']
        elif tok.startswith('/'):
            if not stack:
                raise Missing('{{%s}} closes nothing' % tok)
            cur, kind = stack.pop()
            if tok[1:].strip() != kind:
                raise Missing('{{%s}} closes {{#%s}}' % (tok, kind))
        else:
            cur.append({'kind': 'slot', 'ref': tok})
    if stack:
        raise Missing('{{#%s}} is never closed' % stack[-1][1])
    cur.append(text[pos:])
    return out


def render(nodes, ctx):
    res = []
    for node in nodes:
        if isinstance(node, str):
            res.append(node)
        elif node['kind'] == 'slot':
            res.append(slot(node['ref'], ctx))
        elif node['kind'] == 'if':
            if ctx.first(node['ref']) is not None:
                res.append(render(node['body'], ctx))
        elif node['kind'] == 'each':
            for i, it in enumerate(items(ctx.at(node['ref']), node['args'], node['ref']), 1):
                res.append(render(node['body'], Ctx(ctx.tree, it, i, ctx.root, ctx.extra)))
        elif node['kind'] == 'refs':
            raw = line_of(ctx.at(node['ref']))
            for i, a in enumerate([x.strip() for x in (raw or '').split(';') if x.strip()], 1):
                it = walk(ctx.tree, a)
                if it is None:
                    raise Missing('refs point at nothing: ' + a)
                res.append(render(node['body'], Ctx(ctx.tree, it, i, ctx.root, ctx.extra)))
        elif node['kind'] == 'repeat':
            raw = (line_of(ctx.at(node['ref'])) or '0').strip()
            if not raw.isdigit() or int(raw) > 999:
                raise Missing('not a number at ' + node['ref'])
            for i in range(int(raw)):
                res.append(render(node['body'], Ctx(ctx.tree, ctx.item, i + 1, ctx.root, ctx.extra)))
        else:
            raise Missing('unknown block ' + node['kind'])
    return ''.join(res)


def items(node, args, where=''):
    """Children 1-9 in order. depth=2 gives grandchildren, for lists nested by period.
    to=5 stops at child 5. A period's own line is never printed."""
    depth, to = int(args.get('depth', 1)), int(args.get('to', 9))
    level = [node] if node is not None else []
    for _ in range(depth):
        nxt = []
        for n in level:
            if isinstance(n, dict):
                for d in range(1, to + 1):
                    child = _step(n, str(d), where)
                    if child is not None:
                        nxt.append(child)
        level = nxt
    return level


def slot(ref, ctx):
    if ref == 'n':
        return str(ctx.n)
    if ref == 'root':
        return ctx.root
    if ref in ctx.extra:
        return ctx.extra[ref]
    if ref.startswith('plain:'):
        return plain(need(ctx, ref[6:]))
    if ref.startswith('url:'):
        return html.escape(url(need(ctx, ref[4:]), ctx.root), quote=True)
    if ref.startswith('paras:'):
        return paras(need(ctx, ref[6:]), ctx.root)
    return rich(need(ctx, ref), ctx.root)


def need(ctx, ref):
    node = ctx.first(ref)
    line = line_of(node)
    if line is None:
        raise Missing('nothing at ' + ref)
    if SEALED in line:
        raise Missing('sealed words at ' + ref)
    return line


def fill(text, tree, item=None, root='', extra=None):
    """extra holds raw pieces the generator supplies: content, nav, site, path."""
    return render(parse(text), Ctx(tree, item, 0, root, extra))
