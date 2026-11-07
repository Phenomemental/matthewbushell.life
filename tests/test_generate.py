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

ALL = ['/', '/story', '/now', '/places', '/writing', '/digital', '/hello', '/support']
FILES = {'/': 'index.html', '/story': 'story.html', '/now': 'now.html', '/places': 'places.html',
         '/writing': 'writing.html', '/digital': 'digital.html', '/hello': 'hello.html', '/support': 'support.html'}
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
        h = self.page('/story')
        nav = re.search(r'<nav class="nav"[^>]*>(.*?)</nav>', h, re.S).group(1)
        names = re.findall(r'>([^<]+)</a>', nav)
        self.assertEqual(names, ['Home', 'Story', 'Now', 'Places', 'Writing', 'Digital', 'Say hello'])
        self.assertIn('class="here" aria-current="page">Story', nav)
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
        self.assertIn('href="/story"', h)
        self.assertIn('<link rel="canonical" href="https://www.matthewbushell.life/">', h)

    def test_the_same_words_make_the_same_bytes(self):
        self.run_with(blocks())
        first = {f: self.read(f) for f in self.run_.files() if f.endswith('.html')}
        self.run_with(blocks())
        second = {f: self.read(f) for f in self.run_.files() if f.endswith('.html')}
        self.assertEqual(first, second)

    def test_sitemap_and_robots(self):
        self.run_with(blocks(yes=['Home', 'Story']))
        sitemap = self.read('sitemap.xml')
        self.assertIn('<loc>https://phenomemental.github.io/matthewbushell.life/</loc>', sitemap)
        self.assertIn('<loc>https://phenomemental.github.io/matthewbushell.life/story</loc>', sitemap)
        self.assertNotIn('/now<', sitemap)
        self.assertIn('Sitemap: https://phenomemental.github.io/matthewbushell.life/sitemap.xml', self.read('robots.txt'))

    def test_the_tools_are_wired(self):
        self.run_with(blocks())
        h = self.page('/story')
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

    def test_the_set_aside_is_baked_in(self):
        self.run_with(blocks(aside=['Lorem Ipsum at 3.6', 'pool:life-work 4']))
        cfg = json.loads(re.search(r'id="life-work">(.*?)</script>', self.page('/places')).group(1))
        self.assertEqual(cfg['aside'], {'voices': ['loremipsum@3.6'], 'slots': ['4']})

    def test_a_branch_opening_line_is_never_printed(self):
        data = blocks()
        for b in '123456':
            data['spine:life-work'][b]['_'] = 'OPENING LINE OF BRANCH %s, a note to Claude' % b
        self.run_with(data)
        self.assertNotIn('OPENING LINE OF BRANCH', self.all_text())


class TheYes(Base):
    def test_a_page_with_no_yes_is_not_written(self):
        rep = self.run_with(blocks(yes=[p[0] for p in PAGES if p[0] != 'Writing']))
        self.assertNotIn('/writing', rep['published'])
        self.assertIsNone(self.read('writing.html'))
        nav = re.search(r'<nav class="nav"[^>]*>(.*?)</nav>', self.page('/'), re.S).group(1)
        self.assertNotIn('Writing', nav)
        self.assertNotIn('/writing.html', self.run_.files())

    def test_a_link_to_a_page_with_no_yes_prints_as_plain_words(self):
        data = blocks(yes=[p[0] for p in PAGES if p[0] not in ('Story', 'Writing', 'Finding support')])
        data['spine:life-work']['1']['3']['3'] = 'Read [the whole story](/story) and [the shelf](/writing#shelf) here.'
        self.run_with(data)
        h = self.page('/')
        self.assertNotRegex(h, r'href="%s/(story|writing|support)' % ROOT)
        self.assertIn('Read <span>the whole story</span> and <span>the shelf</span> here.', h)
        self.assertIn('<span>%s</span>' % data['spine:life-work']['1']['3']['6'], h)
        self.assertIn('<p><span>Finding support</span></p>', h)
        self.assertRegex(h, r'href="%s/hello"' % ROOT)

    def test_with_no_yes_for_home_the_front_is_the_holding_page(self):
        self.run_with(blocks(yes=['Story']))
        self.assertIn('This house is still being built.', self.read('index.html'))
        self.assertIsNotNone(self.read('story.html'))
        self.assertNotRegex(self.read('story.html'), r'href="%s/"' % ROOT)

    def test_a_yes_taken_back_takes_the_page_down(self):
        self.run_with(blocks())
        self.assertIsNotNone(self.read('writing.html'))
        rep = self.run_with(blocks(yes=[p[0] for p in PAGES if p[0] != 'Writing']))
        self.assertIsNone(self.read('writing.html'))
        self.assertIn('Writing has no yes, so it comes down', rep['notes'])
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
        self.assertNotIn('/story', rep['published'])
        self.assertIsNone(self.read('story.html'))
        held = {h['page']: h['why'] for h in rep['held']}
        self.assertIn('sealed', held['Story'])
        self.assertIn('Story is held', [i['title'] for i in rep['issues']])
        self.assertNotIn('Encrypted', self.all_text())
        self.assertNotIn(GRAY['1'], self.all_text())

    def test_a_sealed_node_partway_along_an_address_is_refused(self):
        data = blocks()
        data['spine:life-work']['3']['6'] = GRAY  # Places reads 3.62: the walk meets the envelope at 3.6
        rep = self.run_with(data)
        self.assertNotIn('/places', rep['published'])
        self.assertNotIn(GRAY['2'], self.all_text())

    def test_a_sealed_item_in_a_list_is_refused(self):
        data = blocks()
        data['spine:life-work']['4']['4']['2']['3'] = GRAY  # one book on the shelf
        rep = self.run_with(data)
        self.assertNotIn('/writing', rep['published'])
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
        self.assertNotIn('/digital', rep['published'])
        self.assertIn('scrambled', {h['page']: h['why'] for h in rep['held']}['Digital'])

    def test_the_words_encrypted_gray_are_refused_even_unsealed(self):
        data = blocks()
        data['spine:life-work']['5']['1']['2'] = 'Encrypted (gray); readable only with the author secret.'
        rep = self.run_with(data)
        self.assertNotIn('/digital', rep['published'])


class Pins(Base):
    def test_a_missing_pin_holds_the_page(self):
        rep = self.run_with(blocks(pins=False))
        held = {h['page']: h['why'] for h in rep['held']}
        self.assertEqual(sorted(held), ['Home', 'Places'])
        self.assertIn('no pin for it', held['Home'])
        self.assertIn('This house is still being built.', self.read('index.html'))
        self.assertIsNone(self.read('places.html'))
        self.assertNotRegex(self.page('/story'), r'href="%s/places' % ROOT)
        self.assertNotRegex(self.page('/story'), r'href="%s/"' % ROOT)

    def test_a_changed_pin_holds_the_last_good_page_and_opens_an_issue(self):
        self.run_with(blocks())
        home_before = self.page('/')
        places_before = self.page('/places')
        rep = self.run_with(blocks(heart='Lorem ipsum heart, changed in the night.'))
        self.assertNotIn('/', rep['published'])
        self.assertEqual(self.page('/'), home_before)
        self.assertEqual(self.page('/places'), places_before)
        titles = [i['title'] for i in rep['issues']]
        self.assertIn('Home is held: the pin for moonstone:Ada 0 has changed', titles)
        body = [i for i in rep['issues'] if i['title'].startswith('Home is held')][0]['body']
        self.assertIn('0: ' + fixture.HEART, body)
        self.assertIn('0: Lorem ipsum heart, changed in the night.', body)
        self.assertIn('moonstone:Ada; 0; %s; <the date of your yes>' % generate.fingerprint('Lorem ipsum heart, changed in the night.'), body)
        self.assertNotIn('Lorem ipsum heart', self.page('/'))  # the heart is a guard and prints nothing

    def test_a_changed_pin_with_no_page_before_keeps_it_down(self):
        rep = self.run_with(blocks(heart='Something else entirely.'))
        self.assertIsNone(self.read('places.html'))
        self.assertIn('This house is still being built.', self.read('index.html'))
        self.assertIn('(not kept', [i for i in rep['issues'] if i['title'].startswith('Places is held')][0]['body'])

    def test_a_pin_marked_follows_lets_the_line_flow(self):
        data = blocks(heart='A new heart.')
        for i in ('1', '4'):
            data['function:life-work']['4']['2'][i]['1'] = fixture.pin_line('moonstone:Ada', '0', fixture.HEART, follows=True)
        rep = self.run_with(data)
        self.assertIn('/', rep['published'])
        self.assertIn('/places', rep['published'])

    def test_a_fresh_pin_lets_the_page_back_up(self):
        self.run_with(blocks())
        data = blocks(heart='A new heart.')
        for i in ('1', '4'):
            data['function:life-work']['4']['2'][i]['1'] = fixture.pin_line('moonstone:Ada', '0', 'A new heart.', date='6 November 2026')
        rep = self.run_with(data)
        self.assertIn('/', rep['published'])


class Guards(Base):
    def test_lines_are_escaped(self):
        data = blocks()
        data['spine:life-work']['2']['1']['2'] = 'Lorem <script>alert(1)</script> & "ipsum".'
        self.run_with(data)
        h = self.page('/story')
        self.assertNotIn('<script>alert(1)</script>', h)
        self.assertIn('Lorem &lt;script&gt;alert(1)&lt;/script&gt; &amp; "ipsum".', h)

    def test_a_paragraphs_slot_keeps_lines_and_paragraphs(self):
        tree = {'1': 'I\nWho will be <b>there</b>\nto hold her?\n\n\nII\nMight *she* catch the [scent](https://example.com/)?'}
        html = generate.fill.fill('{{paras:1}}', tree)
        self.assertEqual(html, '<p>I<br>\nWho will be &lt;b&gt;there&lt;/b&gt;<br>\nto hold her?</p>'
                               '<p>II<br>\nMight <em>she</em> catch the <a href="https://example.com/">scent</a>?</p>')

    def test_only_https_links_this_sites_paths_and_one_mailto(self):
        for bad in ('[x](javascript:alert(1))', '[x](http://example.com/)', '[x](//example.com/)', '[x](data:text/html,hi)'):
            data = blocks(yes=['Story'])
            data['spine:life-work']['2']['1']['2'] = 'Lorem ' + bad + ' ipsum.'
            rep = self.run_with(data)
            self.assertEqual(rep['published'], [], bad)
        data = blocks(yes=['Story'])
        data['spine:life-work']['2']['1']['2'] = 'Write to [me](mailto:a@example.com) or [me](mailto:b@example.com).'
        rep = self.run_with(data)
        self.assertEqual(rep['published'], [])
        data['spine:life-work']['2']['1']['2'] = 'Write to [me](mailto:a@example.com), see [this](https://example.com/a?b=1&c=2).'
        rep = self.run_with(data)
        self.assertEqual(rep['published'], ['/story'])
        self.assertIn('href="https://example.com/a?b=1&amp;c=2"', self.page('/story'))

    def test_a_page_whose_words_change_by_more_than_half_is_held(self):
        self.run_with(blocks())
        before = self.page('/story')
        data = blocks()
        story = data['spine:life-work']['2']
        for period in story['2'].values():
            if isinstance(period, dict):
                for m in period.values():
                    if isinstance(m, dict):
                        m['2'] = 'Wholly different words now, written fresh from end to end in one go.'
        story['1']['2'] = 'Wholly different opening words, written fresh from end to end in one go.'
        rep = self.run_with(data)
        self.assertNotIn('/story', rep['published'])
        self.assertEqual(self.page('/story'), before)
        self.assertIn('Story is held: its words changed by more than half at once', [i['title'] for i in rep['issues']])
        for k in data['function:life-work']['4']['1']:
            if data['function:life-work']['4']['1'][k].startswith('Story'):
                data['function:life-work']['4']['1'][k] = 'Story, 6 November 2026'
        rep = self.run_with(data)
        self.assertIn('/story', rep['published'])

    def test_a_missing_picture_holds_the_page(self):
        data = blocks(yes=['Story'])
        data['spine:life-work']['7']['5']['2']['2'] = 'not-there.jpg'
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
        seven = {'1': {'1': 'Home, /: 1; 3; moonstone:Ada', '9': 'Every page: look:Phenomemental; the footer'}}
        pages = generate.page_map(seven)
        self.assertEqual([(p.name, p.path, p.branches, p.blocks) for p in pages], [('Home', '/', ['1', '3'], ['moonstone:Ada'])])

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
        rep = self.run_with(blocks(yes=['Story']))
        self.assertEqual(rep['notes'], [])

    def test_a_preview_gives_every_page_a_pretend_yes(self):
        data = blocks(yes=[], pins=False)
        rep = self.run_with(data, extra=['--preview'])
        self.assertEqual(rep['published'], ALL)
        self.assertIn('<meta name="robots" content="noindex">', self.page('/story'))
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


if __name__ == '__main__':
    unittest.main()
