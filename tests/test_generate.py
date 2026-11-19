"""The generator's rules, run on tools/nonsense.json in place of the beach.

  python3 -m unittest discover -s tests -v

The yes lines and pins used here are the tests' own (tests/fixture.py), never the real ones.
"""
import json
import os
import re
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fixture  # noqa: E402
from fixture import GRAY, PAGES, blocks, generate  # noqa: E402

ALL = ['/within', '/', '/home', '/work', '/community', '/cyberspace', '/book', '/hello', '/support']
FILES = {'/within': 'within.html', '/': 'index.html', '/home': 'home.html', '/work': 'work.html', '/community': 'community.html',
         '/cyberspace': 'cyberspace.html', '/book': 'book.html', '/hello': 'hello.html', '/support': 'support.html'}
ROOT = '/matthewbushell.life'


def words_in(data):
    """Every line of the site's words in the test block, to look for in what was written."""
    out = []

    def go(n):
        if isinstance(n, str):
            if len(n) > 12:
                out.append(n)
        elif isinstance(n, dict):
            for k, v in n.items():
                go(v)
    for b in '123456':
        go(data['spine:life-work'][b])
    return out


class Base(unittest.TestCase):
    def setUp(self):
        self.run_ = fixture.Run()

    def tearDown(self):
        self.run_.close()

    def run_with(self, data, **kw):
        return self.run_(data, **kw)

    def read(self, name):
        return self.run_.read(name)

    def page(self, path):
        return self.read(FILES[path])

    def all_text(self):
        out = []
        for f in self.run_.files():
            if f.endswith(('.html', '.xml', '.txt')):
                out.append(self.read(f))
        return '\n'.join(out)


class TheHoldingPage(Base):
    def test_no_yes_lines_means_only_the_holding_page(self):
        data = blocks(yes=[])
        rep = self.run_with(data)
        self.assertEqual(rep['code'], 0)
        self.assertEqual(rep['published'], [])
        self.assertEqual(self.run_.files(), ['404.html', 'assets/site.css', 'index.html', 'robots.txt'])
        index = self.read('index.html')
        self.assertIn('Matthew Bushell', index)
        self.assertIn('This house is still being built.', index)
        self.assertIn('noindex', index)
        self.assertEqual(self.read('404.html'), index)
        text = self.all_text()
        for line in words_in(data):
            self.assertNotIn(line, text)

    def test_the_holding_page_sits_under_the_root(self):
        self.run_with(blocks(yes=[]), root=ROOT)
        self.assertIn('href="%s/assets/site.css"' % ROOT, self.read('index.html'))
        self.run_with(blocks(yes=[]), root='')
        self.assertIn('href="/assets/site.css"', self.read('index.html'))


class EveryPage(Base):
    def test_every_page_with_its_yes_is_written(self):
        rep = self.run_with(blocks())
        self.assertEqual(rep['published'], ALL)
        self.assertEqual(rep['held'], [])
        for path in ALL:
            h = self.page(path)
            self.assertNotIn('{{', h, path)
            self.assertNotIn('Encrypted', h, path)
            self.assertIn('<html lang="en-GB">', h)
            self.assertRegex(h, r'<title>[^<]+</title>')
            self.assertRegex(h, r'<meta name="description" content="[^"]+">')
            self.assertRegex(h, r'<meta property="og:image" content="https://[^"]+/pictures/[^"]+">')
            canon = 'https://phenomemental.github.io/matthewbushell.life' + path
            self.assertIn('<link rel="canonical" href="%s">' % canon, h)

    def test_the_menu_and_footer(self):
        self.run_with(blocks())
        h = self.page('/work')
        nav = re.search(r'<nav class="nav"[^>]*>(.*?)</nav>', h, re.S).group(1)
        names = re.findall(r'>([^<]+)</a>', nav)
        self.assertEqual(names, ['Within', 'Home', 'Work', 'Community', 'Cyberspace', 'The Book', 'Say hello'])
        self.assertIn('class="here" aria-current="page">Work', nav)
        foot = re.search(r'<footer class="foot">(.*?)</footer>', h, re.S).group(1)
        self.assertIn('Finding support', foot)
        self.assertTrue(foot.strip().endswith('<p class="made">Made by Matthew Bushell, Northampton</p>'))

    def test_every_internal_address_carries_the_root(self):
        self.run_with(blocks(), root=ROOT)
        for path in ALL:
            h = self.page(path)
            for attr, url in re.findall(r'\b(href|src)="(/[^"]*)"', h):
                self.assertTrue(url.startswith(ROOT + '/'), '%s %s="%s"' % (path, attr, url))
        self.run_with(blocks(), root='', site='https://www.matthewbushell.life')
        h = self.page('/')
        self.assertIn('href="/work"', h)
        self.assertIn('<link rel="canonical" href="https://www.matthewbushell.life/">', h)

    def test_the_same_words_make_the_same_bytes(self):
        self.run_with(blocks())
        first = {f: self.read(f) for f in self.run_.files() if f.endswith('.html')}
        self.run_with(blocks())
        second = {f: self.read(f) for f in self.run_.files() if f.endswith('.html')}
        self.assertEqual(first, second)

    def test_sitemap_and_robots(self):
        self.run_with(blocks(yes=['Matthew Bushell', 'Home', 'Work']))
        sitemap = self.read('sitemap.xml')
        self.assertIn('<loc>https://phenomemental.github.io/matthewbushell.life/</loc>', sitemap)
        self.assertIn('<loc>https://phenomemental.github.io/matthewbushell.life/work</loc>', sitemap)
        self.assertNotIn('/community<', sitemap)
        self.assertIn('Sitemap: https://phenomemental.github.io/matthewbushell.life/sitemap.xml', self.read('robots.txt'))

    def test_the_tools_are_wired(self):
        self.run_with(blocks())
        h = self.page('/home')
        self.assertIn('<div class="tools" data-share data-comment-at="2" id="at-2">', h)
        self.assertIn('<template id="tool-words"><p class="boxline">', h)
        self.assertRegex(h, r'<script src="%s/assets/door\.js\?v=[0-9a-f]{8}"></script>' % ROOT)
        cfg = json.loads(re.search(r'<script type="application/json" id="life-work">(.*?)</script>', h).group(1))
        self.assertEqual(cfg['family'], 'life-work')
        self.assertEqual(cfg['pool'], 'pool:life-work')
        door = json.loads(re.search(r'window\.DOOR=(.*?);</script>', h).group(1))
        self.assertTrue(door['proved'])
        self.assertEqual(door['home'], 'https://phenomemental.github.io/matthewbushell.life/')
        self.assertIn('data-goatcounter="https://matthewbushell.goatcounter.com/count"', h)
        hello = self.page('/hello')
        self.assertIn('data-tool="note"', hello)
        self.assertIn('data-tool="door"', hello)
        self.assertIn('data-tool="note" data-pool="pool:wholeless-nights"', self.page('/book'))

    def test_the_set_aside_is_baked_in(self):
        self.run_with(blocks(aside=['Lorem Ipsum at 3.6', 'pool:life-work 4']))
        cfg = json.loads(re.search(r'id="life-work">(.*?)</script>', self.page('/within')).group(1))
        self.assertEqual(cfg['aside'], {'voices': ['loremipsum@3.6'], 'slots': ['4']})

    def test_a_branch_opening_line_is_never_printed(self):
        data = blocks()
        for b in '123456':
            data['spine:life-work'][b]['_'] = 'OPENING LINE OF BRANCH %s, a note to Claude' % b
        self.run_with(data)
        self.assertNotIn('OPENING LINE OF BRANCH', self.all_text())


class TheYes(Base):
    def test_a_page_with_no_yes_is_not_written(self):
        rep = self.run_with(blocks(yes=[p[0] for p in PAGES if p[0] != 'The Book']))
        self.assertNotIn('/book', rep['published'])
        self.assertIsNone(self.read('book.html'))
        nav = re.search(r'<nav class="nav"[^>]*>(.*?)</nav>', self.page('/'), re.S).group(1)
        self.assertNotIn('The Book', nav)
        self.assertNotIn('/book.html', self.run_.files())

    def test_a_link_to_a_page_with_no_yes_prints_as_plain_words(self):
        data = blocks(yes=[p[0] for p in PAGES if p[0] not in ('Work', 'The Book', 'Finding support')])
        data['spine:life-work']['1']['3']['3'] = 'Read [the whole story](/work) and [the shelf](/book#shelf) here.'
        self.run_with(data)
        h = self.page('/home')
        self.assertNotRegex(h, r'href="%s/(work|book|support)' % ROOT)
        self.assertIn('Read <span>the whole story</span> and <span>the shelf</span> here.', h)
        self.assertIn('<span>Work</span>', self.page('/'))  # the door to a room with no yes is just its name
        self.assertIn('<p><span>Finding support</span></p>', h)
        self.assertRegex(h, r'href="%s/hello"' % ROOT)

    def test_with_no_yes_for_home_the_front_is_the_holding_page(self):
        self.run_with(blocks(yes=['Work']))
        self.assertIn('This house is still being built.', self.read('index.html'))
        self.assertIsNotNone(self.read('work.html'))
        self.assertNotRegex(self.read('work.html'), r'href="%s/"' % ROOT)

    def test_a_yes_taken_back_takes_the_page_down(self):
        self.run_with(blocks())
        self.assertIsNotNone(self.read('book.html'))
        rep = self.run_with(blocks(yes=[p[0] for p in PAGES if p[0] != 'The Book']))
        self.assertIsNone(self.read('book.html'))
        self.assertIn('The Book has no yes, so it comes down', rep['notes'])
        self.run_with(blocks(yes=[]))
        self.assertEqual(self.run_.files(), ['404.html', 'assets/site.css', 'index.html', 'robots.txt'])

    def test_a_yes_line_needs_a_date(self):
        data = blocks(yes=[])
        data['function:life-work']['4']['1']['1'] = 'Home'
        rep = self.run_with(data)
        self.assertEqual(rep['published'], [])


class Sealed(Base):
    def test_a_sealed_line_is_refused(self):
        data = blocks()
        data['spine:life-work']['2']['1']['2'] = GRAY
        rep = self.run_with(data)
        self.assertNotIn('/home', rep['published'])
        self.assertIsNone(self.read('home.html'))
        held = {h['page']: h['why'] for h in rep['held']}
        self.assertIn('sealed', held['Home'])
        self.assertIn('Home is held', [i['title'] for i in rep['issues']])
        self.assertNotIn('Encrypted', self.all_text())
        self.assertNotIn(GRAY['1'], self.all_text())

    def test_a_sealed_node_partway_along_an_address_is_refused(self):
        data = blocks()
        data['spine:life-work']['3']['5'] = GRAY  # Within reads 3.59: the walk meets the envelope at 3.5
        rep = self.run_with(data)
        self.assertNotIn('/within', rep['published'])
        self.assertNotIn(GRAY['2'], self.all_text())

    def test_a_sealed_item_in_a_list_is_refused(self):
        data = blocks()
        data['spine:life-work']['4']['4']['2']['3'] = GRAY  # one book on the shelf
        rep = self.run_with(data)
        self.assertNotIn('/book', rep['published'])
        self.assertNotIn(GRAY['1'], self.all_text())

    def test_a_sealed_line_beside_every_box_holds_the_pages_with_boxes(self):
        data = blocks()
        data['spine:life-work']['6']['2'] = GRAY
        rep = self.run_with(data)
        self.assertEqual(rep['published'], [])
        self.assertNotIn('Encrypted', self.all_text())

    def test_a_long_base64_run_is_refused(self):
        data = blocks()
        data['spine:life-work']['5']['1']['2'] = 'Lorem ipsum o290fr9cE/Qs1Zk2Lm8Pq4Rt6Vx0Yb3Nc5Df7Gh9Jk1Lm3 dolor.'
        rep = self.run_with(data)
        self.assertNotIn('/cyberspace', rep['published'])
        self.assertIn('scrambled', {h['page']: h['why'] for h in rep['held']}['Cyberspace'])

    def test_the_words_encrypted_gray_are_refused_even_unsealed(self):
        data = blocks()
        data['spine:life-work']['5']['1']['2'] = 'Encrypted (gray); readable only with the author secret.'
        rep = self.run_with(data)
        self.assertNotIn('/cyberspace', rep['published'])


class Pins(Base):
    def test_a_missing_pin_holds_the_page(self):
        rep = self.run_with(blocks(pins=False))
        held = {h['page']: h['why'] for h in rep['held']}
        self.assertEqual(sorted(held), ['Home', 'The Book', 'Within'])
        self.assertIn('no pin for it', held['Home'])
        self.assertIsNone(self.read('home.html'))
        self.assertIsNone(self.read('within.html'))
        self.assertNotRegex(self.page('/work'), r'href="%s/within' % ROOT)

    def test_a_changed_pin_holds_the_last_good_page_and_opens_an_issue(self):
        self.run_with(blocks())
        home_before = self.page('/home')
        within_before = self.page('/within')
        rep = self.run_with(blocks(heart='Lorem ipsum heart, changed in the night.'))
        self.assertNotIn('/home', rep['published'])
        self.assertEqual(self.page('/home'), home_before)
        self.assertEqual(self.page('/within'), within_before)
        titles = [i['title'] for i in rep['issues']]
        self.assertIn('Home is held: the pin for moonstone:Ada 0 has changed', titles)
        body = [i for i in rep['issues'] if i['title'].startswith('Home is held')][0]['body']
        self.assertIn('0: ' + fixture.HEART, body)
        self.assertIn('0: Lorem ipsum heart, changed in the night.', body)
        self.assertIn('moonstone:Ada; 0; %s; <the date of your yes>' % generate.fingerprint('Lorem ipsum heart, changed in the night.'), body)
        self.assertNotIn('Lorem ipsum heart', self.page('/home'))  # the heart is a guard and prints nothing

    def test_a_changed_pin_with_no_page_before_keeps_it_down(self):
        rep = self.run_with(blocks(heart='Something else entirely.'))
        self.assertIsNone(self.read('within.html'))
        self.assertIsNone(self.read('home.html'))
        self.assertIn('(not kept', [i for i in rep['issues'] if i['title'].startswith('Within is held')][0]['body'])

    def test_a_pin_marked_follows_lets_the_line_flow(self):
        data = blocks(heart='A new heart.')
        for i in ('1', '3'):
            data['function:life-work']['4']['2'][i]['1'] = fixture.pin_line('moonstone:Ada', '0', fixture.HEART, follows=True)
        rep = self.run_with(data)
        self.assertIn('/home', rep['published'])
        self.assertIn('/within', rep['published'])

    def test_a_fresh_pin_lets_the_page_back_up(self):
        self.run_with(blocks())
        data = blocks(heart='A new heart.')
        for i in ('1', '3'):
            data['function:life-work']['4']['2'][i]['1'] = fixture.pin_line('moonstone:Ada', '0', 'A new heart.', date='6 November 2026')
        rep = self.run_with(data)
        self.assertIn('/home', rep['published'])


class Guards(Base):
    def test_lines_are_escaped(self):
        data = blocks()
        data['spine:life-work']['2']['1']['2'] = 'Lorem <script>alert(1)</script> & "ipsum".'
        self.run_with(data)
        h = self.page('/home')
        self.assertNotIn('<script>alert(1)</script>', h)
        self.assertIn('Lorem &lt;script&gt;alert(1)&lt;/script&gt; &amp; "ipsum".', h)

    def test_a_line_splits_at_its_dash_into_head_and_tail(self):
        tree = {'1': 'The Return — A GP surgery at eighteen, and a *word*.', '2': 'No dash here'}
        self.assertEqual(generate.fill.fill('{{head:1}}|{{tail:1}}|{{head:2}}|{{tail:2}}', tree),
                         'The Return|A GP surgery at eighteen, and a <em>word</em>.|No dash here|')

    def test_a_paragraphs_slot_keeps_lines_and_paragraphs(self):
        tree = {'1': 'I\nWho will be <b>there</b>\nto hold her?\n\n\nII\nMight *she* catch the [scent](https://example.com/)?'}
        html = generate.fill.fill('{{paras:1}}', tree)
        self.assertEqual(html, '<p>I<br>\nWho will be &lt;b&gt;there&lt;/b&gt;<br>\nto hold her?</p>'
                               '<p>II<br>\nMight <em>she</em> catch the <a href="https://example.com/">scent</a>?</p>')

    def test_only_https_links_this_sites_paths_and_one_mailto(self):
        for bad in ('[x](javascript:alert(1))', '[x](http://example.com/)', '[x](//example.com/)', '[x](data:text/html,hi)'):
            data = blocks(yes=['Work'])
            data['spine:life-work']['3']['2']['2'] = 'Lorem ' + bad + ' ipsum.'
            rep = self.run_with(data)
            self.assertEqual(rep['published'], [], bad)
        data = blocks(yes=['Work'])
        data['spine:life-work']['3']['2']['2'] = 'Write to [me](mailto:a@example.com) or [me](mailto:b@example.com).'
        rep = self.run_with(data)
        self.assertEqual(rep['published'], [])
        data['spine:life-work']['3']['2']['2'] = 'Write to [me](mailto:a@example.com), see [this](https://example.com/a?b=1&c=2).'
        rep = self.run_with(data)
        self.assertEqual(rep['published'], ['/work'])
        self.assertIn('href="https://example.com/a?b=1&amp;c=2"', self.page('/work'))

    def test_a_page_whose_words_change_by_more_than_half_is_held(self):
        self.run_with(blocks())
        before = self.page('/cyberspace')
        data = blocks()
        digital = data['spine:life-work']['5']
        for period in digital['2']['2'].values():
            if isinstance(period, dict):
                for m in period.values():
                    if isinstance(m, dict):
                        m['2'] = 'Wholly different words now, written fresh from end to end in one go.'
                        m['1'] = 'Wholly different title now'
        digital['1']['2'] = 'Wholly different opening words, written fresh from end to end in one go, and then some more of them.'
        digital['4']['1'] = 'Wholly different words about the ground, written fresh from end to end in one go, and then some more.'
        digital['4']['2'] = 'And more different words here too, written fresh, so that more than half of the page has moved.'
        for card in digital['5']['2'].values():
            if isinstance(card, dict):
                card['1'] = 'Wholly different words now, written fresh from end to end in one go.'
        rep = self.run_with(data)
        self.assertNotIn('/cyberspace', rep['published'])
        self.assertEqual(self.page('/cyberspace'), before)
        self.assertIn('Cyberspace is held: its words changed by more than half at once', [i['title'] for i in rep['issues']])
        for k in data['function:life-work']['4']['1']:
            if data['function:life-work']['4']['1'][k].startswith('Cyberspace'):
                data['function:life-work']['4']['1'][k] = 'Cyberspace, 6 November 2026'
        rep = self.run_with(data)
        self.assertIn('/cyberspace', rep['published'])

    def test_a_missing_picture_holds_the_page(self):
        data = blocks(yes=['Home'])
        data['spine:life-work']['7']['5']['3']['2'] = 'not-there.jpg'
        rep = self.run_with(data)
        self.assertEqual(rep['published'], [])
        self.assertIn('not-there.jpg', rep['held'][0]['why'])

    def test_a_words_file_inside_the_repository_is_refused(self):
        inside = os.path.join(fixture.REPO, 'words.json')
        code = generate.main(['--words', inside, '--offline', '--out', self.run_.out])
        self.assertEqual(code, 1)

    def test_a_preview_never_writes_to_site(self):
        code = generate.main(['--words', os.path.join(fixture.REPO, 'tools', 'nonsense.json'), '--offline', '--preview',
                              '--out', os.path.join(fixture.REPO, 'site')])
        self.assertEqual(code, 1)

    def test_the_page_map_rules(self):
        seven = {'1': {'1': 'Home, /: 1; 3', '2': 'Odd, /odd: 8', '9': 'Every page: look:Phenomemental'}}
        with self.assertRaises(generate.Fatal):
            generate.page_map(seven)
        seven = {'1': {'1': 'Home, /: 1; 3; moonstone:Ada', '2': 'The Book, /book: 4; spine:wholeless-nights as 8',
                       '9': 'Every page: look:Phenomemental; the footer'}}
        pages = generate.page_map(seven)
        self.assertEqual([(p.name, p.path, p.branches, p.blocks, p.mounts) for p in pages],
                         [('Home', '/', ['1', '3'], ['moonstone:Ada'], {}),
                          ('The Book', '/book', ['4'], ['spine:wholeless-nights'], {'8': 'spine:wholeless-nights'})])
        seven = {'1': {'1': 'Home, /: 1; 3', '2': 'Odd, /odd: spine:x as 3', '9': 'Every page: look:Phenomemental'}}
        with self.assertRaises(generate.Fatal):
            generate.page_map(seven)

    def test_the_beach_is_read_raw(self):
        asked = []

        class Answer:
            def __init__(self, body):
                self.body = body

            def read(self):
                return self.body

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def fake(req, timeout=None):
            asked.append(req.full_url)
            return Answer(b'{"_": "x"}')
        with mock.patch('urllib.request.urlopen', fake):
            generate.Beach().get('spine:life-work', '3')
        self.assertEqual(asked, ['https://beach.happyseaurchin.com/.well-known/pscale-beach?block=spine%3Alife-work&spindle=3'])
        self.assertNotIn('pscale=', asked[0])

    def test_a_beach_that_cannot_be_reached_fails_the_run(self):
        def down(req, timeout=None):
            raise OSError('no route')
        with mock.patch('urllib.request.urlopen', down), mock.patch('time.sleep'):
            with self.assertRaises(generate.Fatal):
                generate.Beach().get('function:life-work')

    def test_a_words_file_falls_back_to_the_beach_for_what_it_lacks(self):
        class FakeBeach:
            def get(self, block, spindle=None):
                return {'_': 'from the beach', 'block': block, 'spindle': spindle}
        path = os.path.join(self.run_.dir, 'w.json')
        with open(path, 'w') as f:
            json.dump({'1': {'1': 'one'}}, f)
        w = generate.Words(path, FakeBeach())
        self.assertEqual(w.get('spine:life-work', '1.1'), 'one')
        self.assertEqual(w.get('spine:life-work', '7')['spindle'], '7')
        self.assertEqual(w.get('function:life-work')['block'], 'function:life-work')

    def test_a_words_branch_lies_over_the_beachs_child_by_child(self):
        class FakeBeach:
            def get(self, block, spindle=None):
                return {'_': 'the beach', '1': {'1': 'Home, /: 1'}, '3': 'set aside', '5': 'beach page lines'}
        path = os.path.join(self.run_.dir, 'w.json')
        with open(path, 'w') as f:
            json.dump({'7': {'2': 'my pictures', '5': 'my page lines'}}, f)
        seven = generate.Words(path, FakeBeach()).get('spine:life-work', '7')
        self.assertEqual(seven, {'1': {'1': 'Home, /: 1'}, '2': 'my pictures', '3': 'set aside', '5': 'my page lines'})

    def test_the_holding_page_is_never_taken_for_home(self):
        self.run_with(blocks(yes=[]))
        rep = self.run_with(blocks(yes=[]))
        self.assertEqual(rep['notes'], [])
        rep = self.run_with(blocks(yes=['Work']))
        self.assertEqual(rep['notes'], [])

    def test_a_preview_gives_every_page_a_pretend_yes(self):
        data = blocks(yes=[], pins=False)
        rep = self.run_with(data, extra=['--preview'])
        self.assertEqual(rep['published'], ALL)
        self.assertIn('<meta name="robots" content="noindex">', self.page('/work'))
        self.assertTrue(any('a preview carries on' in n for n in rep['notes']))


class VisitCounting(Base):
    SCRIPT = ('<script data-goatcounter="https://matthewbushell.goatcounter.com/count" async '
              'src="https://gc.zgo.at/count.v4.js" crossorigin="anonymous" '
              'integrity="sha384-nRw6qfbWyJha9LhsOtSb2YJDyZdKvvCFh0fJYlkquSFjUxp9FVNugbfy8q1jdxI+"></script>')

    def test_every_page_is_counted_with_its_own_path(self):
        rep = self.run_with(blocks())
        self.assertEqual(rep['published'], ALL)  # the script's long hash doesn't hold a page
        for path in ALL:
            h = self.page(path)
            self.assertIn(self.SCRIPT, h, path)
            self.assertIn('<noscript><img class="counted" src="https://matthewbushell.goatcounter.com/count?p=%s" alt=""></noscript>' % path, h)
            foot = re.search(r'<footer class="foot">(.*?)</footer>', h, re.S).group(1)
            self.assertIn('Visits are counted with <a href="https://www.goatcounter.com">GoatCounter</a>, without cookies.', foot)
            self.assertTrue(foot.strip().endswith('<p class="made">Made by Matthew Bushell, Northampton</p>'))

    def test_the_holding_page_is_not_counted(self):
        self.run_with(blocks(yes=[]))
        self.assertNotIn('goatcounter', self.all_text())

    def test_a_preview_is_never_counted(self):
        self.run_with(blocks(yes=[]), extra=['--preview'])
        for path in ALL:
            h = self.page(path)
            self.assertNotIn('data-goatcounter', h)
            self.assertNotIn('goatcounter.com/count', h)
            self.assertIn('without cookies', h)


class TheUniversePage(Base):
    """The Pscale universe stands outside the page map as the film's page does: the sky alone, no film and no dial."""
    FILE = 'universe/index.html'

    def test_it_is_carried_counted_and_holds_no_film(self):
        rep = self.run_with(blocks())
        self.assertEqual(rep['published'], ALL)
        h = self.read(self.FILE)
        self.assertIsNotNone(h)
        self.assertNotIn('{{', h)
        self.assertIn(VisitCounting.SCRIPT, h)
        self.assertIn('<noscript><img class="counted" src="https://matthewbushell.goatcounter.com/count?p=/universe/" alt=""></noscript>', h)
        self.assertIn('<link rel="canonical" href="https://phenomemental.github.io/matthewbushell.life/universe/">', h)
        for gone in ('<video', 'id="band"', 'id="needle"', 'id="veil"', 'data-parts', '.mp4', '.mp3', 'site.css'):
            self.assertNotIn(gone, h)
        self.assertIn('?block=presence', h)
        ids = re.findall(r'id="([^"]+)"', h)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual([f for f in self.run_.files() if f.startswith("universe/")], [self.FILE])

    def test_it_is_in_no_menu_and_no_sitemap(self):
        self.run_with(blocks())
        self.assertNotIn('universe', self.read('sitemap.xml'))
        for path in ALL:
            self.assertNotIn('/universe/', self.page(path), path)


class TheFilmPage(Base):
    """The Approach stands outside the page map: carried whole to its own folder while the site is up."""
    FILE = 'the-approach/index.html'

    def test_it_is_carried_with_the_sites_footer_counting_and_tools(self):
        rep = self.run_with(blocks())
        self.assertEqual(rep['published'], ALL)
        h = self.read(self.FILE)
        self.assertIsNotNone(h)
        self.assertNotIn('{{', h)
        self.assertIn(VisitCounting.SCRIPT, h)
        self.assertIn('<noscript><img class="counted" src="https://matthewbushell.goatcounter.com/count?p=/the-approach/" alt=""></noscript>', h)
        self.assertIn('<link rel="canonical" href="https://phenomemental.github.io/matthewbushell.life/the-approach/">', h)
        foot = re.search(r'<footer class="foot">(.*?)</footer>', h, re.S).group(1)
        self.assertEqual(foot, re.search(r'<footer class="foot">(.*?)</footer>', self.page('/work'), re.S).group(1))
        self.assertTrue(foot.strip().endswith('<p class="made">Made by Matthew Bushell, Northampton</p>'))
        self.assertIn('<div class="tools" data-share data-comment-at="5.526"></div>', h)
        self.assertIn('data-tool="door"', h)
        self.assertIn('<template id="tool-words"><p class="boxline">', h)
        for name in ('site.css', 'door.css', 'site.js', 'beach.js', 'door.js', 'tools.js'):
            self.assertRegex(h, r'="%s/assets/%s\?v=[0-9a-f]{8}"' % (ROOT, re.escape(name)))
        for attr, url in re.findall(r'\b(href|src)="(/[^"]*)"', h):
            self.assertTrue(url.startswith(ROOT + '/'), '%s="%s"' % (attr, url))

    def test_its_parts_are_carried_beside_it_with_a_list_of_what_is_there(self):
        """Version five (film:the-approach 6.5): the radio's own folders beside the page (clips, poster, nar,
        voices) and the ten block films, with a manifest listing what is there."""
        self.run_with(blocks())
        files = self.run_.files()
        here = os.path.join(fixture.REPO, 'the-approach')
        kinds = (('clips', '.mp4'), ('poster', '.jpg'), ('nar', '.mp3'), ('fictions', '.mp4'))
        for kind, ext in kinds:
            names = sorted(fn[:-len(ext)] for fn in os.listdir(os.path.join(here, kind)) if fn.endswith(ext))
            self.assertTrue(names, kind)
            for n in names:
                self.assertIn('the-approach/%s/%s%s' % (kind, n, ext), files)
        src = os.path.join(here, 'clips', 'shes_home.mp4')
        self.assertEqual(os.path.getsize(os.path.join(self.run_.out, 'the-approach', 'clips', 'shes_home.mp4')), os.path.getsize(src))
        listed = json.loads(self.read('the-approach/manifest.json'))
        self.assertEqual(sorted(listed), ['clips', 'fictions', 'nar', 'poster'])
        # the retelling (film:the-approach 1.74, 6.9): fifteen clips, nine as they were and six made on 19 November 2026
        story = ['address', 'archive', 'chip', 'dawn', 'gate_night', 'helper', 'mara_asks', 'nights', 'numbers', 'seasons', 'shes_home',
                 'station', 'summer', 'tom_answer', 'voice']
        self.assertEqual(listed['clips'], story)
        self.assertEqual(listed['poster'], story)   # every clip shows its own first frame before it plays
        # the narrator's 32 lines (1.731 to 1.733): the opening, the eight stops, the ending
        self.assertEqual(listed['nar'], sorted('e1 e1b e1c e2 o1 o2 o3 o3a o3b o4 o5 o6 o7 o8 o9 r1 r2 r2b r3 r3b r4 r4a r5 r5b r5c r6 r6b r6c '
                                               'r7 r7b r8 r8b'.split()))
        h = self.read(self.FILE)
        for name in story:   # every clip in the folder is one the film plays
            self.assertRegex(h, r"own:\[[^\]]*'%s'" % name)
        for line in listed['nar']:   # and every narrator file is one it tells
            self.assertRegex(h, r"(say:\['%s'\]|\{id:'%s',)" % (line, line))
        self.assertEqual(len(listed['fictions']), 10)
        self.assertIn('the-approach/fictions/fictions.json', files)
        h = self.read(self.FILE)
        self.assertIn('data-parts="%s/the-approach/"' % ROOT, h)

    def test_the_fourth_versions_story_and_the_older_parts_are_retired(self):
        self.run_with(blocks())
        files = self.run_.files()
        self.assertEqual([f for f in files if f.startswith(('the-approach/moments/', 'the-approach/plates/', 'the-approach/glimpses/',
                                                            'the-approach/stills/', 'the-approach/img/'))], [])
        self.assertEqual([f for f in files if re.fullmatch(r'the-approach/nar/[mt]\d+[ab]?\.mp3', f)], [])
        for gone in ('screens_dark', 'tom_one_page'):   # out of the story since 18 November (6.53)
            self.assertEqual([f for f in files if gone in f], [])
        self.assertNotIn('the-approach/walk.json', files)
        voices = [f for f in files if re.fullmatch(r'the-approach/voices/[a-z0-9_]+\.mp3', f)]
        # the kept lives and the whispers (27, the visitor's old line among them, no longer loaded), and the retelling's six:
        # the Archive between the stations (a1 to a4), 'Keep one of us.' and the opening's whisper
        self.assertEqual(len(voices), 33)
        for v in ('a1', 'a2', 'a3', 'a4', 'keep', 'whisper'):
            self.assertIn('the-approach/voices/%s.mp3' % v, files)
        self.assertEqual([f for f in voices if '/w_' in f], [])
        self.assertIn('the-approach/credits/mara.jpg', files)
        self.assertIn('the-approach/credits/tom.jpg', files)
        h = self.read(self.FILE)
        self.assertIn('data-voices="%s/the-approach/voices/"' % ROOT, h)
        self.assertIn('data-credits="%s/the-approach/credits/"' % ROOT, h)
        for gone in ('the-approach/moments/', 'data-moments', 'id="skip"', 'Walk the film', 'beachsky.js', 'screens_dark', 'tom_one_page'):
            self.assertNotIn(gone, h)

    def test_the_retelling_is_the_film_the_page_tells(self):
        """The retelling (film:the-approach 1.7, 6.9): eight stops, the seventh the false voice; the visitor's station is ten pips
        and ten digits; 'Keep one of us.' is the ending's and the credits' last words; the old telling's lines are gone."""
        self.run_with(blocks())
        h = self.read(self.FILE)
        self.assertIn("{f:.555,strong:true,who:'Mara?',beats:[{say:['r7']", h)
        self.assertIn("who:'the visitor',pips:true,say:\"2049214293\\na night in spring, still to come\",big:true}", h)
        self.assertIn("{id:'keep',t:\"Keep one of us.\",big:true,all:true}", h)
        self.assertIn("{id:'whisper',t:", h)
        self.assertIn("$('find').textContent='Find the numbers'", h)
        self.assertIn("'Keep one of us.'.split(", h)
        for gone in ('A block is a few words', 'We kept our lives in this shape', "'visitor'", "She's drifted off the band", "She's gone again",
                     'People all over the world are growing them now', 'down to a few minutes'):
            self.assertNotIn(gone, h)

    def test_a_star_card_does_not_take_the_tap_that_opened_it(self):
        """On a touch screen the click after a tap lands on the card as it appears; for a moment the card takes no presses."""
        self.run_with(blocks())
        h = self.read(self.FILE)
        self.assertIn("elStar.style.pointerEvents = 'none'; clearTimeout(cardWake); cardWake = setTimeout(function () { elStar.style.pointerEvents = ''; }, 350);", h)

    def test_the_way_out_stands_in_the_credits(self):
        """6.72: 'Explore the pscale universe' at the foot of the credits in place of 'Back to the sky', 'Play the film again'
        after the end, and no id used twice (the page finds its buttons by id: 'Try again' and 'Play the film again' are two)."""
        self.run_with(blocks())
        h = self.read(self.FILE)
        self.assertIn('<button type="button" class="btn red cexplore" id="csky">Explore the pscale universe</button>', h)
        self.assertNotIn('Back to the sky', h)
        self.assertIn('<button type="button" id="replay" hidden>Play the film again</button>', h)
        self.assertIn('<button type="button" id="again">Try again</button>', h)
        ids = re.findall(r'\sid="([^"]+)"', h.split('<script>')[0])
        self.assertEqual(sorted(set(i for i in ids if ids.count(i) > 1)), [])

    def test_the_viewer_can_always_stop_it_and_step_out(self):
        """6.6: a Stop button from Begin to the end card (Back to the film once stopped), a way to skip the rest of the
        opening, and a sky canvas drawn by the graphics chip, not in software."""
        self.run_with(blocks())
        h = self.read(self.FILE)
        for id_ in ('id="stop"', 'id="skipop"', 'id="find"', 'id="credit"', 'id="sound"', 'id="play"', 'id="sfilm"', 'id="mcard"', 'id="maddr"', 'id="mline"'):
            self.assertIn(id_, h)
        self.assertIn("'Back to the film'", h)
        self.assertNotIn("canvas.getContext('2d', { willReadFrequently: true })", h)

    def test_it_is_in_no_menu_and_no_sitemap(self):
        self.run_with(blocks())
        self.assertNotIn('the-approach', self.read('sitemap.xml'))
        for path in ALL:
            self.assertNotIn('the-approach', self.page(path), path)

    def test_it_holds_none_of_the_sites_words_but_the_door_lines(self):
        data = blocks()
        self.run_with(data)
        h = self.read(self.FILE)
        six = data['spine:life-work']['6']
        allowed = {generate.text(six['2']), generate.text(six['3']), generate.text(six['3'].get('1')) if isinstance(six['3'], dict) else ''}
        for line in words_in(data):
            if line not in allowed:
                self.assertNotIn(line, h)

    def test_the_holding_page_stands_alone(self):
        self.run_with(blocks(yes=[]))
        self.assertIsNone(self.read(self.FILE))

    def test_a_preview_of_it_is_not_counted(self):
        self.run_with(blocks(), extra=['--preview'])
        h = self.read(self.FILE)
        self.assertNotIn('goatcounter.com/count', h)
        self.assertIn('<meta name="robots" content="noindex">', h)

    def test_the_same_run_twice_makes_the_same_bytes(self):
        self.run_with(blocks())
        first = self.read(self.FILE)
        self.run_with(blocks())
        self.assertEqual(first, self.read(self.FILE))


if __name__ == '__main__':
    unittest.main()
