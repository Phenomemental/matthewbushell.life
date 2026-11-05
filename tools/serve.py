#!/usr/bin/env python3
"""Serve a made site the way GitHub Pages does, for a private preview or the tests.

  python3 tools/serve.py ~/life-work/preview --root '' --port 8000
  then open http://localhost:8000/

/story is story.html, a folder is its index.html, and anything missing is 404.html. With --root
/matthewbushell.life the site sits under that path, as it does on github.io until the domain moves.
"""
import argparse
import functools
import http.server
import os


class Handler(http.server.SimpleHTTPRequestHandler):
    site_root = ''

    def translate_path(self, path):
        p = path.split('?', 1)[0].split('#', 1)[0]
        if self.site_root:
            if p != self.site_root and not p.startswith(self.site_root + '/'):
                return os.path.join(self.directory, '\0missing')
            p = p[len(self.site_root):] or '/'
        full = super().translate_path(p)
        if os.path.isdir(full):
            return os.path.join(full, 'index.html')
        if not os.path.exists(full) and os.path.exists(full + '.html'):
            return full + '.html'
        return full

    def send_error(self, code, message=None, explain=None):
        page = os.path.join(self.directory, '404.html')
        if code == 404 and os.path.exists(page):
            with open(page, 'rb') as f:
                body = f.read()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def log_message(self, *args):
        pass


def server(folder, root='', port=0):
    handler = functools.partial(Handler, directory=os.path.abspath(folder))
    Handler.site_root = root.rstrip('/')
    return http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('folder')
    ap.add_argument('--root', default='')
    ap.add_argument('--port', type=int, default=8000)
    a = ap.parse_args()
    s = server(a.folder, a.root, a.port)
    print('Serving %s at http://127.0.0.1:%d%s/' % (a.folder, s.server_address[1], a.root.rstrip('/')))
    s.serve_forever()


if __name__ == '__main__':
    main()
