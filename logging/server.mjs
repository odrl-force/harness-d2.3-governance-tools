// D2.3 logging server. Node.js 20 or later, no other software needed.
//
//   POST /events                 write one event (JSON, see event.schema.json)
//   GET  /events?owner=&resource=&correlation=&requester=   read events, oldest first
//   GET  /events.jsonld          the same, as JSON-LD with context.jsonld (PROV terms)
//   GET  /verify                 recompute the hash chain; reports the first broken record
//   GET  /                       Anna's log page (ui.html)
//
// Records are append-only (data/events.jsonl). Each record carries the hash of the one
// before it, so editing or deleting an old record breaks the chain. That makes it
// tamper-evident. Whoever runs the server can still rewrite the whole file. 
// Run, from the repository root: node logging/server.mjs   (port 5100, or PORT=...)
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';

const here = fileURLToPath(new URL('./', import.meta.url)); // this folder; fileURLToPath also works on Windows
const PORT = Number(process.env.PORT ?? 5100);
const FILE = process.env.LOG_FILE ?? here + 'data/events.jsonl';
const schema = JSON.parse(fs.readFileSync(here + 'event.schema.json', 'utf8'));
const context = JSON.parse(fs.readFileSync(here + 'context.jsonld', 'utf8'));
fs.mkdirSync(here + 'data', { recursive: true });

const load = () => (fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const digest = (prevHash, rec) => 'sha256:' + crypto.createHash('sha256').update(prevHash + '\n' + JSON.stringify(rec)).digest('hex');
const strip = ({ hash, ...rest }) => rest;

function check(ev) {
  const errors = [];
  for (const k of schema.required) if (ev[k] === undefined) errors.push(`missing '${k}'`);
  for (const k of Object.keys(ev)) {
    if (!schema.properties[k]) errors.push(`unknown field '${k}'`);
    if (['id', 'seq', 'prevHash', 'hash'].includes(k)) errors.push(`'${k}' is set by the server`);
  }
  for (const [k, p] of Object.entries(schema.properties)) {
    if (ev[k] !== undefined && p.enum && !p.enum.includes(ev[k])) errors.push(`'${k}' must be one of ${p.enum.join(', ')}`);
  }
  if (ev.time && Number.isNaN(Date.parse(ev.time))) errors.push(`'time' is not a date-time`);
  if (ev.claimTypes && ev.claimTypes.some((c) => c.length > 80)) errors.push(`'claimTypes' holds kinds of claims only, never claim content`);
  return errors;
}

function append(ev) {
  const all = load();
  const prevHash = all.length ? all[all.length - 1].hash : 'sha256:genesis';
  const rec = { id: 'urn:uuid:' + crypto.randomUUID(), seq: all.length + 1, ...ev, prevHash };
  rec.hash = digest(prevHash, rec);
  fs.appendFileSync(FILE, JSON.stringify(rec) + '\n');
  return rec;
}

function verify() {
  let prev = 'sha256:genesis';
  for (const r of load()) {
    if (r.prevHash !== prev || digest(prev, strip(r)) !== r.hash) return { ok: false, brokenAt: r.seq };
    prev = r.hash;
  }
  return { ok: true, records: load().length, head: prev };
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'access-control-allow-origin': '*' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' }); return res.end(); }
  if (req.method === 'POST' && url.pathname === '/events') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let ev; try { ev = JSON.parse(body); } catch { return send(res, 400, { error: 'body is not JSON' }); }
      const errors = check(ev);
      if (errors.length) return send(res, 400, { error: 'event does not match event.schema.json', details: errors });
      const rec = append(ev);
      send(res, 201, rec);
    });
    return;
  }
  if (req.method === 'GET' && (url.pathname === '/events' || url.pathname === '/events.jsonld')) {
    let all = load();
    for (const k of ['owner', 'resource', 'correlation', 'requester']) {
      const v = url.searchParams.get(k); if (v) all = all.filter((r) => r[k] === v);
    }
    if (url.pathname.endsWith('.jsonld')) return send(res, 200, { ...context, '@graph': all }, 'application/ld+json');
    return send(res, 200, all);
  }
  if (req.method === 'GET' && url.pathname === '/verify') return send(res, 200, verify());
  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, fs.readFileSync(here + 'ui.html', 'utf8'), 'text/html; charset=utf-8');
  send(res, 404, { error: 'not found' });
});
// Keep idle connections open for 65 seconds. With Node's default of 5 seconds, the server can
// close a connection just as a client reuses it, and the event fails with "other side closed".
server.keepAliveTimeout = 65_000;
server.listen(PORT, () => console.log(`D2.3 logging server on http://localhost:${PORT} (file ${FILE})`));
