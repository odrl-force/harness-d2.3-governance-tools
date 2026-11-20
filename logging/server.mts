import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

type LogEvent = {
  type: 'PolicyCreated' | 'PolicyRemoved' | 'AccessRequested' | 'DecisionMade' | 'DataAccessed';
  time?: string;
  source: 'uma' | 'pod' | 'loama' | 'run-script';
  correlation: string;
  resource: string;
  owner: string;
  requester?: string;
  action?: string;
  purposes?: string[];
  claimTypes?: ('webid' | 'purpose' | 'legal basis' | 'credential')[];
  policy?: { id?: string; hash?: string };
  decision?: 'granted' | 'denied' | 'need_info';
  rules?: string[];
  httpStatus?: number;
  note?: string;
};

type LogRecord = LogEvent & { id: string; seq: number; recordedAt: string; prevHash: string; hash: string };

const here = fileURLToPath(new URL('./', import.meta.url)); // fileURLToPath also works on Windows
const { values: opts } = parseArgs({
  options: {
    port: { type: 'string', default: '5100' },
    file: { type: 'string', default: here + 'data/events.jsonl' },
  },
});
const PORT = Number(opts.port);
const FILE = opts.file;
const SERVER_SET = ['id', 'seq', 'recordedAt', 'prevHash', 'hash'];

const schema = JSON.parse(fs.readFileSync(here + 'event.schema.json', 'utf8'));
const context = JSON.parse(fs.readFileSync(here + 'context.jsonld', 'utf8'));
fs.mkdirSync(path.dirname(FILE), { recursive: true });

// ajv and ajv-formats are CommonJS: Node accepts the plain default import, TypeScript under nodenext only `.default`.
const ajv = new Ajv2020.default({ allErrors: true });
addFormats.default(ajv);
const validate = ajv.compile<LogEvent>(schema);

const load = (): LogRecord[] =>
  fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const digest = (prevHash: string, rec: object) =>
  'sha256:' + crypto.createHash('sha256').update(prevHash + '\n' + JSON.stringify(rec)).digest('hex');
const strip = ({ hash, ...rest }: LogRecord) => rest;

function check(ev: unknown): string[] {
  const errors: string[] = [];
  if (!validate(ev)) {
    for (const e of validate.errors ?? []) {
      const extra = e.params.additionalProperty ? ` '${e.params.additionalProperty}'` : '';
      const allowed = e.params.allowedValues ? `: ${e.params.allowedValues.join(', ')}` : '';
      errors.push(`${e.instancePath || '/'} ${e.message}${extra}${allowed}`);
    }
  }
  // The schema lists the server-set fields so stored records validate, which means Ajv lets a sender set them.
  if (ev && typeof ev === 'object') {
    for (const k of Object.keys(ev)) if (SERVER_SET.includes(k)) errors.push(`/${k} is set by the server`);
  }
  return errors;
}

function append(ev: LogEvent): LogRecord {
  const all = load();
  const prevHash = all.length ? all[all.length - 1].hash : 'sha256:genesis';
  const rec = { id: 'urn:uuid:' + crypto.randomUUID(), seq: all.length + 1, recordedAt: new Date().toISOString(), ...ev, prevHash };
  const stored: LogRecord = { ...rec, hash: digest(prevHash, rec) };
  fs.appendFileSync(FILE, JSON.stringify(stored) + '\n');
  return stored;
}

function verify() {
  const all = load();
  let prev = 'sha256:genesis';
  for (const r of all) {
    if (r.prevHash !== prev || digest(prev, strip(r)) !== r.hash) return { ok: false, brokenAt: r.seq };
    prev = r.hash;
  }
  return { ok: true, records: all.length, head: prev };
}

const send = (res: http.ServerResponse, code: number, body: unknown, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'access-control-allow-origin': '*' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' });
    return res.end();
  }
  if (req.method === 'POST' && url.pathname === '/events') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let ev: unknown;
      try { ev = JSON.parse(body); } catch { return send(res, 400, { error: 'body is not JSON' }); }
      const errors = check(ev);
      if (errors.length) return send(res, 400, { error: 'event does not match event.schema.json', details: errors });
      send(res, 201, append(ev as LogEvent));
    });
    return;
  }
  if (req.method === 'GET' && (url.pathname === '/events' || url.pathname === '/events.jsonld')) {
    let all = load();
    for (const k of ['owner', 'resource', 'correlation', 'requester'] as const) {
      const v = url.searchParams.get(k);
      if (v) all = all.filter((r) => r[k] === v);
    }
    if (url.pathname.endsWith('.jsonld')) return send(res, 200, { ...context, '@graph': all }, 'application/ld+json');
    return send(res, 200, all);
  }
  if (req.method === 'GET' && url.pathname === '/verify') return send(res, 200, verify());
  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, fs.readFileSync(here + 'ui.html', 'utf8'), 'text/html; charset=utf-8');
  send(res, 404, { error: 'not found' });
});
// Keep idle connections open for 65 seconds. 
server.keepAliveTimeout = 65_000;
server.listen(PORT, () => console.log(`D2.3 logging server on http://localhost:${PORT} (file ${FILE})`));
