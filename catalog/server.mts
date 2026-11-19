// Catalogue server: serves catalog.ttl to data-space participants.
// Usage: node catalog/server.mts [--port 5200] [--file <path to a Turtle file>]

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '5200' },
    file: { type: 'string', default: join(import.meta.dirname, 'catalog.ttl') },
  },
});
const port = Number(values.port);
const file = values.file;

if (!existsSync(file)) {
  console.error(`No catalogue at ${file}`);
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (req.method !== 'GET' || path !== '/catalog') {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found. The catalogue is at GET /catalog\n');
    return;
  }
  try {
    // Read on every request, so edits to the file show without a restart.
    const body = await readFile(file, 'utf8');
    res.writeHead(200, { 'content-type': 'text/turtle', 'access-control-allow-origin': '*' });
    res.end(body);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(`Could not read ${file}\n`);
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error(err.code === 'EADDRINUSE' ? `Port ${port} is in use. Stop the other server or pass --port.` : err.message);
  process.exit(1);
});

server.listen(port, () => console.log(`D2.3 catalogue on http://localhost:${port}/catalog (file ${file})`));
