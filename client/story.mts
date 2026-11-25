import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseTurtle, replay, type Replay } from './replay.mts';
import { readMonths, forecastTurtle } from './forecast.mts';

const root = fileURLToPath(new URL('../', import.meta.url)); // fileURLToPath also works on Windows
const CSS = 'http://localhost:3000';
const UMA = 'http://localhost:4000/uma';
const CATALOG = 'http://localhost:5200/catalog';
const LOG = 'http://localhost:5100';
const RESOURCE = `${CSS}/anna/energy/meter-readings`;
const ODRL = 'http://www.w3.org/ns/odrl/2/';
const DPV = 'https://w3id.org/dpv#';
const FINANCE = 'https://w3id.org/dpv/sector/finance#';
const SERVICE = `${CSS}/enerco/services/forecast`;
const WEBID_CLAIM = 'urn:solidlab:uma:claims:types:webid';
const PURPOSE_CLAIM = ODRL + 'purpose';
const webid = (pod: string) => `${CSS}/${pod}/profile/card#me`;
const ANNA = webid('anna');
const CITY = webid('ghent');
const ENERCO = webid('enerco');
const STUDY = webid('study');
const BOB = webid('bob');

// A household: whose pod, which resource, which demo file and the policies the owner posts.
type Household = { name: string; possessive: string; webid: string; resource: string; data?: string; ownerRule: string; policies: string[] };
const ANNA_HOME: Household = {
  name: 'Anna', possessive: 'her', webid: ANNA, resource: RESOURCE, data: 'demo/meter-readings.ttl', ownerRule: 'P0',
  policies: ['policies/p0-anna-owner.ttl', 'policies/p1-altruism-city.ttl', 'policies/p2-commercial-enerco.ttl', 'policies/p3-no-marketing.ttl'],
};
const BOB_HOME: Household = {
  name: 'Bob', possessive: 'his', webid: BOB, resource: `${CSS}/bob/energy/meter-readings`, data: 'demo/bob-meter-readings.ttl', ownerRule: 'P5',
  policies: ['policies/p5-bob-owner.ttl', 'policies/p6-bob-research.ttl'],
};
// EnerCo's pod holds the forecast of Anna's household. P4, the offer, is for the catalogue only.
const ENERCO_HOME: Household = {
  name: 'EnerCo', possessive: 'its', webid: ENERCO, resource: `${SERVICE}/anna`, ownerRule: 'P7',
  policies: ['policies/p7-enerco-owner.ttl', 'policies/p4b-no-credit-checking-enerco.ttl', 'policies/p8-anna-forecast-enerco.ttl'],
};
// informedBy: the correlation of an earlier attempt this one builds on.
type Request = { method?: string; body?: string; requester: string; purposes?: string[]; home?: Household; informedBy?: string };

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
const short = (iri = '') => iri.replace(DPV, 'dpv:').replace(FINANCE, 'sector-finance:').replace(ODRL, 'odrl:').replace('http://example.org/d23/', 'd23:');
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

async function postPolicy(file: string, h: Household): Promise<number> {
  const text = read(file);
  const r = await fetch(`${UMA}/policies`, {
    method: 'POST',
    headers: { authorization: `WebID ${encodeURIComponent(h.webid)}`, 'content-type': 'text/turtle' },
    body: text,
  });
  if (r.status === 201) await log({ type: 'PolicyCreated', owner: h.webid, resource: h.resource, correlation: 'setup', policy: { id: policyId(file), hash: sha(text) }, note: file });
  return r.status;
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const unsignedJwt = (claims: object) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`;

async function access(c: Request): Promise<Attempt> {
  const target = (c.home ?? ANNA_HOME).resource;
  const init: RequestInit = { method: c.method ?? 'GET', ...(c.body ? { body: c.body, headers: { 'content-type': 'text/turtle' } } : {}) };
  const first = await fetch(target, init);
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
  const second = await fetch(target, { ...init, headers: { ...init.headers, authorization: `${res.tokenBody.token_type} ${res.tokenBody.access_token}` } });
  res.finalStatus = second.status;
  res.finalBody = await second.text();
  return res;
}

async function attempt(label: string, c: Request): Promise<Attempt> {
  const h = c.home ?? ANNA_HOME;
  const r = await access(c);
  const action = ODRL + (c.method === 'PUT' ? 'write' : 'read');
  const base = { owner: h.webid, resource: h.resource, correlation: r.ticket ?? 'no-ticket-' + crypto.randomUUID(), requester: c.requester, action,
    ...(c.informedBy ? { informedBy: c.informedBy } : {}) };
  const purposes = c.purposes ?? [];
  await log({ ...base, type: 'AccessRequested', purposes, claimTypes: purposes.length ? ['webid', 'purpose'] : ['webid'], httpStatus: r.firstStatus, note: label });
  if (r.tokenStatus !== undefined) {
    const decision = r.tokenStatus === 200 ? 'granted' : r.tokenBody?.error === 'need_info' ? 'need_info' : 'denied';
    const umaSaid = `UMA answered ${r.tokenStatus}${r.tokenBody?.error ? ' ' + r.tokenBody.error : ''}.`;
    if (c.requester === h.webid) {
      await log({ ...base, type: 'DecisionMade', decision, httpStatus: r.tokenStatus, note: `${umaSaid} Owner access under ${h.ownerRule}.` });
    } else {
      const policy = h.policies.flatMap((f) => parseTurtle(read(f)));
      r.replay = await replay(policy, { action, target: h.resource, requester: c.requester, purposes });
      const file = h.policies.find((f) => policyId(f) === r.replay?.active[0]?.policy);
      const agree = (r.replay.decision === 'ALLOW') === (decision === 'granted');
      await log({
        ...base, type: 'DecisionMade', decision, httpStatus: r.tokenStatus, rules: r.replay.active.map((a) => a.rule),
        ...(file ? { policy: { id: policyId(file), hash: sha(read(file)) } } : {}),
        note: `${umaSaid} Active rules from the run script's evaluator replay of ${h.name}'s policies, which says ${r.replay.decision}.`
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

async function postPolicies(h: Household) {
  for (const f of h.policies) {
    const status = await postPolicy(f, h);
    console.log(`   posts ${f}: ${status}`);
    // UMA keeps part of a deleted policy, so a policy can only be posted once per UMA start.
    if (status === 409) { console.log('   UMA already holds this policy. Restart the stack for a clean run.'); process.exit(1); }
    expect(`posting ${f} gives 201`, status === 201);
  }
}

async function setUp(step: number, h: Household) {
  console.log(`${step}. ${h.name} sets up`);
  await postPolicies(h);
  const put = await attempt(`${h.name} stores ${h.possessive} meter readings`, { method: 'PUT', body: read(h.data ?? ''), requester: h.webid, home: h });
  console.log(`   stores ${h.data}: ${explain(put)}`);
  expect(`${h.name} stores ${h.possessive} readings`, allowed(put));
}

await setUp(1, ANNA_HOME);
await setUp(2, BOB_HOME);

console.log('3. The City finds the data');
const catalog = parseTurtle(await (await fetch(CATALOG)).text());
const valueOf = new Map(catalog.filter((q) => q.predicate.value === ODRL + 'rightOperand').map((q) => [q.subject.value, q.object.value]));
const ruleOf = new Map(catalog.filter((q) => q.predicate.value === ODRL + 'constraint').map((q) => [q.object.value, q.subject.value]));
// The purposes the offer on one listing accepts: each listing has an offer of its own.
function offeredFor(resource: string): string[] {
  const offer = catalog.find((q) => q.subject.value === resource && q.predicate.value === ODRL + 'hasPolicy')?.object.value;
  const permitted = new Set(catalog.filter((q) => q.subject.value === offer && q.predicate.value === ODRL + 'permission').map((q) => q.object.value));
  return [...valueOf].filter(([c, v]) => v.startsWith(DPV) && permitted.has(ruleOf.get(c) ?? '')).map(([, v]) => short(v));
}
const offered = offeredFor(RESOURCE);
console.log(`   the offer accepts: ${offered.join(', ')}`);
expect('the catalogue offers dpv:ImprovePublicServices', offered.includes('dpv:ImprovePublicServices'));

console.log('4. The City asks');
const noPurpose = await attempt('City asks without a purpose', { requester: CITY });
console.log(`   without a purpose: ${explain(noPurpose)}`);
expect('City without a purpose is refused', !allowed(noPurpose));
const city = await attempt('City asks to improve public services', { requester: CITY, purposes: [DPV + 'ImprovePublicServices'] });
console.log(`   with dpv:ImprovePublicServices: ${explain(city)}; rules: ${rules(city)}`);
expect('City with dpv:ImprovePublicServices reads', allowed(city));

console.log('5. EnerCo asks');
const advice = await attempt('EnerCo asks to advise Anna', { requester: ENERCO, purposes: [DPV + 'OptimisationForConsumer'] });
console.log(`   with dpv:OptimisationForConsumer: ${explain(advice)}; rules: ${rules(advice)}`);
expect('EnerCo with dpv:OptimisationForConsumer reads', allowed(advice));
const ads = await attempt('EnerCo asks for personalised advertising', { requester: ENERCO, purposes: [DPV + 'PersonalisedAdvertising'] });
console.log(`   with dpv:PersonalisedAdvertising: ${explain(ads)}; rules: ${rules(ads)}`);
expect('EnerCo with dpv:PersonalisedAdvertising is refused', !allowed(ads));

console.log("6. EnerCo's forecast service");
console.log(`   the offer accepts: ${offeredFor(SERVICE).join(', ')}`);
expect("the forecast offer accepts dpv:OptimisationForConsumer", offeredFor(SERVICE).includes('dpv:OptimisationForConsumer'));
await postPolicies(ENERCO_HOME);
// The forecast is computed from the readings EnerCo read in step 5, under Anna's P2.
const forecast = advice.finalBody ? forecastTurtle(readMonths(advice.finalBody), SERVICE, RESOURCE) : '';
const write = await attempt("EnerCo writes Anna's forecast", { method: 'PUT', body: forecast, requester: ENERCO, home: ENERCO_HOME, informedBy: advice.ticket });
console.log(`   writes Anna's forecast from the readings of step 5: ${explain(write)}`);
expect("EnerCo writes Anna's forecast", allowed(write));
const forecastFor = (label: string, requester: string, purposes: string[]) =>
  attempt(label, { requester, purposes, home: ENERCO_HOME, ...(requester === ANNA ? { informedBy: advice.ticket } : {}) });
const own = await forecastFor('Anna reads her forecast for advice', ANNA, [DPV + 'OptimisationForConsumer']);
console.log(`   Anna, with dpv:OptimisationForConsumer: ${explain(own)}; rules: ${rules(own)}`);
expect('Anna reads her forecast', allowed(own));
expect('the forecast says an AI system made it', (own.finalBody ?? '').includes(`<${SERVICE}>`));
const credit = await forecastFor('Anna asks her forecast for credit checking', ANNA, [FINANCE + 'CreditChecking']);
console.log(`   Anna, with sector-finance:CreditChecking: ${explain(credit)}; rules: ${rules(credit)}`);
expect('credit checking is refused', !allowed(credit));
const mixed = await forecastFor('Anna asks her forecast for advice and a credit score', ANNA, [DPV + 'OptimisationForConsumer', FINANCE + 'CreditScoreEvaluation']);
console.log(`   Anna, with dpv:OptimisationForConsumer and sector-finance:CreditScoreEvaluation: ${explain(mixed)}; rules: ${rules(mixed)}`);
expect('advice mixed with a credit score is refused', !allowed(mixed));
const narrower = ['CreditHistoryEvaluation', 'CreditLimitDetermination', 'CreditScoreEvaluation', 'InstabilityRiskAssessment',
  'MaintainCreditCheckingDatabase', 'MaintainCreditRatingDatabase'];
let refused = 0;
for (const term of narrower) {
  const r = await forecastFor(`Anna asks her forecast for ${term}`, ANNA, [FINANCE + term]);
  if (!allowed(r)) refused++;
  expect(`sector-finance:${term} is refused`, !allowed(r));
}
console.log(`   Anna, with each of the ${narrower.length} narrower credit terms alone: ${refused} refused`);
// Advice mixed with an allowed-elsewhere purpose: UMA grants it, as for any mixed request (#42).
const harmless = await forecastFor('Anna asks her forecast for advice and research', ANNA, [DPV + 'OptimisationForConsumer', DPV + 'ScientificResearch']);
console.log(`   Anna, with dpv:OptimisationForConsumer and dpv:ScientificResearch: ${explain(harmless)}; rules: ${rules(harmless)}`);
const bobsReadings = await attempt("EnerCo asks to advise Bob", { requester: ENERCO, purposes: [DPV + 'OptimisationForConsumer'], home: BOB_HOME });
console.log(`   EnerCo reads Bob's readings for advice: ${explain(bobsReadings)}, so no forecast for Bob`);
expect("Bob's rules refuse EnerCo", !allowed(bobsReadings));
const other = await forecastFor("Bob asks for Anna's forecast", BOB, [DPV + 'OptimisationForConsumer']);
console.log(`   Bob, Anna's forecast: ${explain(other)}; rules: ${rules(other)}`);
expect("Bob is refused Anna's forecast", !allowed(other));

console.log('7. A research study asks Anna and Bob');
const research = 'dpv:ScientificResearch';
const accepts = (resource: string) => (offeredFor(resource).includes(research) ? 'yes' : 'no');
console.log(`   offers accepting ${research}: Anna's ${accepts(RESOURCE)}, Bob's ${accepts(BOB_HOME.resource)}`);
expect("Anna's offer leaves research out", accepts(RESOURCE) === 'no');
expect("Bob's offer accepts research", accepts(BOB_HOME.resource) === 'yes');
// The offer only informs: the study asks both, and UMA decides.
const studyAnna = await attempt('Research study asks Anna for scientific research', { requester: STUDY, purposes: [DPV + 'ScientificResearch'] });
console.log(`   Anna, with ${research}: ${explain(studyAnna)}; rules: ${rules(studyAnna)}`);
expect('the study is refused Anna\'s readings', !allowed(studyAnna));
const studyBob = await attempt('Research study asks Bob for scientific research', { requester: STUDY, purposes: [DPV + 'ScientificResearch'], home: BOB_HOME });
console.log(`   Bob, with ${research}: ${explain(studyBob)}; rules: ${rules(studyBob)}`);
expect('the study reads Bob\'s readings', allowed(studyBob));

await pause(200);
const chain = await (await fetch(`${LOG}/verify`)).json() as { ok: boolean; records?: number; brokenAt?: number };
console.log(`8. The log: ${chain.records ?? '?'} records, chain ${chain.ok ? 'intact' : 'broken at ' + chain.brokenAt}. Anna's page: ${LOG}/`);
expect('the log chain verifies', chain.ok);

console.log(failures.length ? `FAILED:\n - ${failures.join('\n - ')}` : 'All expected outcomes met.');
if (failures.length) process.exitCode = 1;
