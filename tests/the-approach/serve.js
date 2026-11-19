// Serve a made site the way GitHub Pages does, with byte ranges so a video can seek. node serve.js DIR PORT
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2]), port = Number(process.argv[3] || 8766);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.json': 'application/json', '.xml': 'text/xml', '.txt': 'text/plain' };
http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
  let f = path.join(dir, p);
  if (!f.startsWith(dir)) { r.writeHead(403); return r.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { r.writeHead(404, { 'content-type': 'text/html' }); return r.end('not found'); }
  const st = fs.statSync(f), m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || '');
  const a = m ? +m[1] : 0, b = m && m[2] ? +m[2] : st.size - 1;
  r.writeHead(m ? 206 : 200, Object.assign({ 'content-type': types[path.extname(f)] || 'application/octet-stream', 'accept-ranges': 'bytes', 'content-length': b - a + 1 }, m ? { 'content-range': `bytes ${a}-${b}/${st.size}` } : {}));
  fs.createReadStream(f, { start: a, end: b }).pipe(r);
}).listen(port, '127.0.0.1', () => console.log('serving ' + dir + ' on ' + port));
