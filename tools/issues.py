#!/usr/bin/env python3
"""Open an issue on this repository for each thing a run needs Matthew to know, once.

  python3 tools/issues.py report.json        each issue the generator asked for, if not already open
  python3 tools/issues.py --failed RUN_URL   'The site run failed', if not already open

It uses the workflow's own GITHUB_TOKEN and GITHUB_REPOSITORY, and no other key. GitHub emails the
repository's owner about each new issue. An issue already open with the same title is left as it is,
so an hourly run never opens the same one twice.
"""
import json
import os
import sys
import urllib.request

API = 'https://api.github.com'


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None, headers={
        'Authorization': 'Bearer ' + os.environ['GITHUB_TOKEN'], 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'matthewbushell.life site run'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode() or 'null')


def open_titles(repo):
    titles, page = set(), 1
    while True:
        got = call('GET', '/repos/%s/issues?state=open&per_page=100&page=%d' % (repo, page))
        titles |= {i['title'] for i in got if 'pull_request' not in i}
        if len(got) < 100:
            return titles
        page += 1


def main(argv):
    repo = os.environ.get('GITHUB_REPOSITORY')
    if not repo or not os.environ.get('GITHUB_TOKEN'):
        print('No GITHUB_REPOSITORY or GITHUB_TOKEN: nothing opened.')
        return 0
    wanted = []
    if argv[:1] == ['--failed']:
        run = argv[1] if len(argv) > 1 else ''
        wanted.append({'title': 'The site run failed', 'body': '\n'.join([
            'A run of the site stopped before it finished, so the last good pages stay up.', '',
            'The run: ' + run, '',
            'If the beach could not be read, the next hourly run will try again. This issue stays open until someone closes it.'])})
    else:
        path = argv[0] if argv else 'report.json'
        if not os.path.exists(path):
            print('No report: nothing opened.')
            return 0
        with open(path, encoding='utf-8') as f:
            report = json.load(f)
        if report.get('failed'):
            wanted.append({'title': 'The site run failed', 'body': 'The run stopped, so the last good pages stay up: %s' % report['failed']})
        wanted += report.get('issues') or []
    if not wanted:
        print('Nothing to open.')
        return 0
    have = open_titles(repo)
    for issue in wanted:
        if issue['title'] in have:
            print('Already open: ' + issue['title'])
            continue
        call('POST', '/repos/%s/issues' % repo, {'title': issue['title'], 'body': issue['body']})
        have.add(issue['title'])
        print('Opened: ' + issue['title'])
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
