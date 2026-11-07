"""Test words, in the beach's exact shapes, made from tools/nonsense.json.

The page map, the yes lines and the pins here are for the tests only. The real ones live on the beach,
at spine:life-work 7.1 and function:life-work 4, and are never copied into this repository.
"""
import contextlib
import io
import json
import os
import shutil
import sys
import tempfile

TESTS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TESTS)
sys.path.insert(0, os.path.join(REPO, 'tools'))
import generate  # noqa: E402

PAGES = [
    ('Within', '/within', '3; moonstone:Ada'),
    ('Matthew Bushell', '/', '1; 3; moonstone:Ada'),
    ('Home', '/home', '1; 2; 3; 6; moonstone:Ada'),
    ('Work', '/work', '3; 6'),
    ('Community', '/community', '3; 6'),
    ('Cyberspace', '/cyberspace', '3; 5'),
    ('The Book', '/book', '4; spine:wholeless-nights as 8'),
    ('Say hello', '/hello', '6'),
    ('Finding support', '/support', '6'),
]
HEART = 'Lorem ipsum heart, dolor sit amet.'
BOOK = {'_': 'Lorem Nights, for the tests.', '1': 'What it is about: lorem.',
        '3': {'_': 'The watches', '1': {'_': 'Watches one to nine'}, '2': {'_': 'Watches ten to eighteen'}, '3': {'_': 'Watches nineteen to twenty-seven'}}}
for _shelf in ('1', '2', '3'):
    for _d in range(1, 10):
        BOOK['3'][_shelf][str(_d)] = {'_': 'Watch %s%d — Lorem ipsum dolor sit amet.' % (_shelf, _d), '9': ''}
BOOK['3']['1']['1']['1'] = {'_': 'Encrypted (gray); readable only with the author secret.', '1': 'o290fr9cE/Qs1Zk2Lm8Pq4Rt6Vx0Yb3Nc5Df7Gh9Jk1Lm3Np5Qr7St9Uv1Wx3Yz5AbCdEfGh', '2': 'Zx9Yw8Vu7Ts6Rq5Po4Nm3Lk2Ji1Hg0Fe', '9': {'_': 'gray', '1': 'self'}}
GRAY = {'_': 'Encrypted (gray); readable only with the author secret.',
        '1': 'o290fr9cE/Qs1Zk2Lm8Pq4Rt6Vx0Yb3Nc5Df7Gh9Jk1Lm3Np5Qr7St9Uv1Wx3Yz5AbCdEfGh',
        '2': 'Zx9Yw8Vu7Ts6Rq5Po4Nm3Lk2Ji1Hg0Fe', '9': {'_': 'gray', '1': 'self'}}


def nonsense():
    with open(os.path.join(REPO, 'tools', 'nonsense.json'), encoding='utf-8') as f:
        return json.load(f)


def pin_line(block, address, text, date='5 November 2026', follows=False):
    return '%s; %s; %s; %s%s' % (block, address, generate.fingerprint(text), date, '; follows' if follows else '')


def blocks(yes=None, pins=True, heart=HEART, aside=None):
    """The three blocks a run reads. yes is the list of page names with a yes (all of them by default)."""
    spine = nonsense()
    spine['7']['1'] = {'_': 'THE PAGES — for the tests.'}
    for i, (name, path, reads) in enumerate(PAGES, 1):
        spine['7']['1'][str(i)] = '%s, %s: %s' % (name, path, reads)
    spine['7']['3'] = {'_': 'THE VOICES SET ASIDE — for the tests.'}
    for i, line in enumerate(aside or [], 1):
        spine['7']['3'][str(i)] = line
    names = [p[0] for p in PAGES] if yes is None else yes
    law = {'_': 'The law, for the tests.', '4': {
        '1': {'_': 'THE PAGES — for the tests.'},
        '2': {'_': 'THE PINS — for the tests.'}}}
    for i, name in enumerate(names, 1):
        law['4']['1'][str(i)] = '%s, 5 November 2026' % name
    if pins:
        for i, (name, path, reads) in enumerate(PAGES, 1):
            if 'moonstone:Ada' in reads:
                law['4']['2'][str(i)] = {'_': name, '1': pin_line('moonstone:Ada', '0', HEART)}
            if 'spine:wholeless-nights' in reads:
                law['4']['2'][str(i)] = {'_': name, '1': pin_line('spine:wholeless-nights', '3', BOOK['3'], follows=True)}
    return {'spine:life-work': spine, 'function:life-work': law, 'moonstone:Ada': {'_': heart, '1': 'Lorem a critique.'},
            'spine:wholeless-nights': BOOK}


class Run:
    """A generator run in a scratch folder: words file, pictures, out and record."""

    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix='life-work-test-')
        self.out = os.path.join(self.dir, 'site')
        self.record = os.path.join(self.dir, 'record.json')
        self.report = os.path.join(self.dir, 'report.json')
        self.pictures = os.path.join(self.dir, 'pictures')
        os.makedirs(self.pictures)
        shutil.copy(os.path.join(REPO, 'assets', 'placeholder.svg'), os.path.join(self.pictures, 'placeholder.svg'))

    def __call__(self, data, root='/matthewbushell.life', site='https://phenomemental.github.io/matthewbushell.life',
                 extra=()):
        words = os.path.join(self.dir, 'words.json')
        with open(words, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        self.said = io.StringIO()
        with contextlib.redirect_stdout(self.said), contextlib.redirect_stderr(self.said):
            code = generate.main(['--words', words, '--offline', '--out', self.out, '--root', root, '--site', site,
                                  '--pictures', self.pictures, '--record', self.record, '--report', self.report] + list(extra))
        with open(self.report, encoding='utf-8') as f:
            report = json.load(f)
        report['code'] = code
        return report

    def read(self, name):
        path = os.path.join(self.out, name)
        if not os.path.exists(path):
            return None
        with open(path, encoding='utf-8') as f:
            return f.read()

    def files(self):
        out = []
        for dirpath, _, filenames in os.walk(self.out):
            for fn in filenames:
                out.append(os.path.relpath(os.path.join(dirpath, fn), self.out).replace(os.sep, '/'))
        return sorted(out)

    def close(self):
        shutil.rmtree(self.dir, ignore_errors=True)


if __name__ == '__main__':
    # python3 tests/fixture.py OUT [ROOT]: the whole test site, every page with its test yes, for the layout tests.
    out = os.path.abspath(sys.argv[1])
    root = sys.argv[2] if len(sys.argv) > 2 else '/matthewbushell.life'
    run = Run()
    run.out = out
    rep = run(blocks(), root=root)
    print(json.dumps({'published': rep['published'], 'held': rep['held']}))
    run.close()
