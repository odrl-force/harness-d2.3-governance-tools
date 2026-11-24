import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url)); // fileURLToPath also works on Windows
const umaRepo = root + 'external/user-managed-access/';
const logs = root + 'stack/logs/';
const { values: opts } = parseArgs({ options: { log: { type: 'string', default: root + 'logging/data/events.jsonl' } } });

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const status = (url: string) => fetch(url, { signal: AbortSignal.timeout(2000) }).then((r) => r.status, () => 0);

const state = execFileSync('git', ['-C', root, 'submodule', 'status', 'external/user-managed-access'], { encoding: 'utf8' });
if (state.startsWith('-')) fail("IDLab's code is missing. Run: git submodule update --init");
if (state.startsWith('+')) fail("IDLab's code is not at the pinned commit. Run: git submodule update");

for (const port of [3000, 4000, 5100, 5200]) {
  if (await status(`http://localhost:${port}/`)) fail(`Port ${port} is in use. Stop the other server first.`);
}

if (!fs.existsSync(umaRepo + 'packages/uma/dist') || !fs.existsSync(umaRepo + 'packages/css/dist')) {
  console.log("First run: installing and building IDLab's code");
  execFileSync('corepack', ['yarn', 'install'], { cwd: umaRepo, stdio: 'inherit' });
}

fs.mkdirSync(logs, { recursive: true });
const servers: ChildProcess[] = [];
let stopping = false;

function stop(code: number): never {
  stopping = true;
  for (const s of servers) {
    // A negative pid signals the whole process group: npx starts the pod as a grandchild.
    if (s.pid) try { process.kill(-s.pid, 'SIGTERM'); } catch { /* already gone */ }
  }
  process.exit(code);
}

function start(name: string, cwd: string, args: string[], command = process.execPath) {
  const out = fs.openSync(logs + name + '.log', 'w');
  const child = spawn(command, args, { cwd, stdio: ['ignore', out, out], detached: true });
  child.on('exit', (code, signal) => {
    if (!stopping) { console.error(`The ${name} server stopped (${signal ?? 'exit ' + code}). See stack/logs/${name}.log.`); stop(1); }
  });
  servers.push(child);
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

// The start commands from IDLab's package.json files, with the D2.3 accounts in place of theirs.
start('uma', umaRepo + 'packages/uma', ['bin/main.js']);
start('css', umaRepo + 'packages/css', ['community-solid-server', '-m', '.', '-c', './config/default.json', './config/init-pat.json',
  '--seedConfig', root + 'stack/seed.json'], 'npx');
start('catalog', root, ['catalog/server.mts']);
start('logging', root, ['logging/server.mts', '--file', opts.log]);

const checks = [
  'http://localhost:4000/uma/.well-known/uma2-configuration',
  'http://localhost:3000/anna/profile/card',
  'http://localhost:5200/catalog',
  'http://localhost:5100/verify',
];
for (let i = 0; i < 60; i++) {
  if ((await Promise.all(checks.map(status))).every((s) => s === 200)) {
    console.log(`All servers are up.
  pod        http://localhost:3000/
  UMA        http://localhost:4000/uma
  catalogue  http://localhost:5200/catalog
  log        http://localhost:5100/   (Anna's page; file ${opts.log})
Logs: stack/logs/. Run the story in another terminal: npm run story. Ctrl+C stops all servers.`);
    break;
  }
  if (i === 59) { console.error('The servers did not start in 3 minutes. See stack/logs/.'); stop(1); }
  await new Promise((ok) => setTimeout(ok, 3000));
}
