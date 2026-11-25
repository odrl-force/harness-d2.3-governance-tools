import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseTurtle, replay, type Replay } from './replay.mts';

const root = fileURLToPath(new URL('../', import.meta.url)); // fileURLToPath also works on Windows
const CSS = 'http://localhost:3000';
const UMA = 'http://localhost:4000/uma';
const CATALOG = 'http://localhost:5200/catalog';
const LOG = 'http://localhost:5100';
const RESOURCE = `${CSS}/anna/energy/meter-readings`;
const ODRL = 'http://www.w3.org/ns/odrl/2/';
const DPV = 'https://w3id.org/dpv#';
const WEBID_CLAIM = 'urn:solidlab:uma:claims:types:webid';
const PURPOSE_CLAIM = ODRL + 'purpose';
const webid = (pod: string) => `${CSS}/${pod}/profile/card#me`;
const ANNA = webid('anna');
const CITY = webid('ghent');
const ENERCO = webid('enerco');
const POLICIES = ['policies/p0-anna-owner.ttl', 'policies/p1-altruism-city.ttl', 'policies/p2-commercial-enerco.ttl', 'policies/p3-no-marketing.ttl'];

type Attempt = {
  firstStatus: number;
  ticket?: string;
  tokenStatus?: number;
  tokenBody?: { error?: string; message?: string; access_token?: string; token_type?: string };
  finalStatus?: number;
  finalBody?: string;
  replay?: Replay;
};

const read = (file: string) => fs.readFileSync(root + file, 'utf8');
const sha = (text: string) => 'sha256:' + crypto.createHash('sha256').update(text).digest('hex');
const short = (iri = '') => iri.replace(DPV, 'dpv:').replace(ODRL, 'odrl:').replace('http://example.org/d23/', 'd23:');
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const failures: string[] = [];
const expect = (label: string, ok: boolean) => { if (!ok) failures.push(label); };

async function log(event: Record<string, unknown>) {
  const body = JSON.stringify({ time: new Date().toISOString(), source: 'run-script', owner: ANNA, resource: RESOURCE, ...event });
  const post = () => fetch(`${LOG}/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  // One retry: the server can close a kept-alive connection just as it is reused.
  const r = await post().catch(post);
  if (r.status !== 201) failures.push(`logging server refused an event: ${await r.text()}`);
}

function policyId(file: string): string {
  const uid = parseTurtle(read(file)).find((q) => q.predicate.value === ODRL + 'uid');
  if (!uid) throw new Error(`${file} has no odrl:uid`);
  return uid.object.value;
}

async function postPolicy(file: string): Promise<number> {
  const text = read(file);
  const r = await fetch(`${UMA}/policies`, {
    method: 'POST',
    headers: { authorization: `WebID ${encodeURIComponent(ANNA)}`, 'content-type': 'text/turtle' },
    body: text,
  });
  if (r.status === 201) await log({ type: 'PolicyCreated', correlation: 'setup', policy: { id: policyId(file), hash: sha(text) }, note: file });
  return r.status;
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const unsignedJwt = (claims: object) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`;

async function access(c: { method?: string; body?: string; requester: string; purposes?: string[] }): Promise<Attempt> {
  const init: RequestInit = { method: c.method ?? 'GET', ...(c.body ? { body: c.body, headers: { 'content-type': 'text/turtle' } } : {}) };
  const first = await fetch(RESOURCE, init);
  const ticket = (first.headers.get('www-authenticate') ?? '').match(/ticket="([^"]+)"/)?.[1];
  const res: Attempt = { firstStatus: first.status, ticket };
  await first.text();
  if (first.status !== 401 || !ticket) return res;

  const claims: Record<string, unknown> = { [WEBID_CLAIM]: c.requester };
  const purposes = c.purposes ?? [];
  if (purposes.length) claims[PURPOSE_CLAIM] = purposes.length === 1 ? purposes[0] : purposes;
  const token = await fetch(`${UMA}/token`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket', ticket,
      claim_token: [{ claim_token: unsignedJwt(claims), claim_token_format: 'urn:solidlab:uma:claims:formats:jwt' }],
    }),
  });
  res.tokenStatus = token.status;
  res.tokenBody = await token.json().catch(() => ({}));
  if (token.status !== 200 || !res.tokenBody?.access_token) return res;
  const second = await fetch(RESOURCE, { ...init, headers: { ...init.headers, authorization: `${res.tokenBody.token_type} ${res.tokenBody.access_token}` } });
  res.finalStatus = second.status;
  res.finalBody = await second.text();
  return res;
}

async function attempt(label: string, c: { method?: string; body?: string; requester: string; purposes?: string[] }): Promise<Attempt> {
  const r = await access(c);
  const action = ODRL + (c.method === 'PUT' ? 'write' : 'read');
  const base = { correlation: r.ticket ?? 'no-ticket-' + crypto.randomUUID(), requester: c.requester, action };
  const purposes = c.purposes ?? [];
  await log({ ...base, type: 'AccessRequested', purposes, claimTypes: purposes.length ? ['webid', 'purpose'] : ['webid'], httpStatus: r.firstStatus, note: label });
  if (r.tokenStatus !== undefined) {
    const decision = r.tokenStatus === 200 ? 'granted' : r.tokenBody?.error === 'need_info' ? 'need_info' : 'denied';
    const umaSaid = `UMA answered ${r.tokenStatus}${r.tokenBody?.error ? ' ' + r.tokenBody.error : ''}.`;
    if (c.requester === ANNA) {
      await log({ ...base, type: 'DecisionMade', decision, httpStatus: r.tokenStatus, note: `${umaSaid} Owner access under P0.` });
    } else {
      const policy = POLICIES.flatMap((f) => parseTurtle(read(f)));
      r.replay = await replay(policy, { action, target: RESOURCE, requester: c.requester, purposes });
      const file = POLICIES.find((f) => policyId(f) === r.replay?.active[0]?.policy);
      const agree = (r.replay.decision === 'ALLOW') === (decision === 'granted');
      await log({
        ...base, type: 'DecisionMade', decision, httpStatus: r.tokenStatus, rules: r.replay.active.map((a) => a.rule),
        ...(file ? { policy: { id: policyId(file), hash: sha(read(file)) } } : {}),
        note: `${umaSaid} Active rules from the run script's evaluator replay of Anna's policies, which says ${r.replay.decision}.`
          + (agree ? '' : ' MISMATCH: UMA and the replay disagree.'),
      });
      expect(`${label}: UMA and the replay agree`, agree);
    }
  }
  if (r.finalStatus !== undefined) await log({ ...base, type: 'DataAccessed', httpStatus: r.finalStatus });
  return r;
}

const allowed = (r: Attempt) => r.finalStatus !== undefined && r.finalStatus < 300;
const explain = (r: Attempt) => {
  if (r.tokenStatus === undefined) return `pod answered ${r.firstStatus}`;
  const why = r.tokenBody?.error ?? r.tokenBody?.message;
  return `token ${r.tokenStatus}${why ? ` "${why}"` : ''}${r.finalStatus !== undefined ? `, pod ${r.finalStatus}` : ''}`;
};
const rules = (r: Attempt) => r.replay?.active.map((a) => short(a.rule)).join(', ') || 'none';

console.log('1. Anna sets up');
for (const f of POLICIES) {
  const status = await postPolicy(f);
  console.log(`   posts ${f}: ${status}`);
  // UMA keeps part of a deleted policy, so a policy can only be posted once per UMA start.
  if (status === 409) { console.log('   UMA already holds this policy. Restart the stack for a clean run.'); process.exit(1); }
  expect(`posting ${f} gives 201`, status === 201);
}
const put = await attempt('Anna stores her meter readings', { method: 'PUT', body: read('demo/meter-readings.ttl'), requester: ANNA });
console.log(`   stores demo/meter-readings.ttl: ${explain(put)}`);
expect('Anna stores her readings', allowed(put));

console.log('2. The City finds the data');
const catalog = parseTurtle(await (await fetch(CATALOG)).text());
// Only the offer on Anna's dataset: other listings have offers of their own.
const offer = catalog.find((q) => q.subject.value === RESOURCE && q.predicate.value === ODRL + 'hasPolicy')?.object.value;
const permitted = new Set(catalog.filter((q) => q.subject.value === offer && q.predicate.value === ODRL + 'permission').map((q) => q.object.value));
const valueOf = new Map(catalog.filter((q) => q.predicate.value === ODRL + 'rightOperand').map((q) => [q.subject.value, q.object.value]));
const ruleOf = new Map(catalog.filter((q) => q.predicate.value === ODRL + 'constraint').map((q) => [q.object.value, q.subject.value]));
const offered = [...valueOf].filter(([c, v]) => v.startsWith(DPV) && permitted.has(ruleOf.get(c) ?? '')).map(([, v]) => short(v));
console.log(`   the offer accepts: ${offered.join(', ')}`);
expect('the catalogue offers dpv:ImprovePublicServices', offered.includes('dpv:ImprovePublicServices'));

console.log('3. The City asks');
const noPurpose = await attempt('City asks without a purpose', { requester: CITY });
console.log(`   without a purpose: ${explain(noPurpose)}`);
expect('City without a purpose is refused', !allowed(noPurpose));
const city = await attempt('City asks to improve public services', { requester: CITY, purposes: [DPV + 'ImprovePublicServices'] });
console.log(`   with dpv:ImprovePublicServices: ${explain(city)}; rules: ${rules(city)}`);
expect('City with dpv:ImprovePublicServices reads', allowed(city));

console.log('4. EnerCo asks');
const advice = await attempt('EnerCo asks to advise Anna', { requester: ENERCO, purposes: [DPV + 'OptimisationForConsumer'] });
console.log(`   with dpv:OptimisationForConsumer: ${explain(advice)}; rules: ${rules(advice)}`);
expect('EnerCo with dpv:OptimisationForConsumer reads', allowed(advice));
const ads = await attempt('EnerCo asks for personalised advertising', { requester: ENERCO, purposes: [DPV + 'PersonalisedAdvertising'] });
console.log(`   with dpv:PersonalisedAdvertising: ${explain(ads)}; rules: ${rules(ads)}`);
expect('EnerCo with dpv:PersonalisedAdvertising is refused', !allowed(ads));

await pause(200);
const chain = await (await fetch(`${LOG}/verify`)).json() as { ok: boolean; records?: number; brokenAt?: number };
console.log(`5. The log: ${chain.records ?? '?'} records, chain ${chain.ok ? 'intact' : 'broken at ' + chain.brokenAt}. Anna's page: ${LOG}/`);
expect('the log chain verifies', chain.ok);

console.log(failures.length ? `FAILED:\n - ${failures.join('\n - ')}` : 'All expected outcomes met.');
if (failures.length) process.exitCode = 1;
