// Catalogue server: serves catalog.ttl to data space participants, with an ODRL offer
// for each listed asset built from the rules in policies/*.ttl.
// Usage: node catalog/server.mts [--port 5200] [--file <Turtle file>] [--policies <folder>]

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { glob, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { DataFactory, Parser, Store, Writer, type BlankNode, type Quad, type Quad_Subject, type Term } from 'n3';

const { namedNode, blankNode, literal, quad } = DataFactory;

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '5200' },
    file: { type: 'string', default: join(import.meta.dirname, 'catalog.ttl') },
    policies: { type: 'string', default: join(import.meta.dirname, '..', 'policies') },
  },
});
const port = Number(values.port);
const file = values.file;
const policies = values.policies;

for (const path of [file, policies]) {
  if (!existsSync(path)) {
    console.error(`Not found: ${path}`);
    process.exit(1);
  }
}

const RDF_TYPE = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const ODRL = 'http://www.w3.org/ns/odrl/2/';
const DCAT = 'http://www.w3.org/ns/dcat#';
const DCT = 'http://purl.org/dc/terms/';
const PROV = 'http://www.w3.org/ns/prov#';
const D23 = 'http://example.org/d23/';
const odrl = (term: string) => namedNode(ODRL + term);

// The output uses the prefixes declared in the parsed files, plus prov: for the links the
// server adds, so new vocabularies get short names without a change here.
async function parseFile(path: string, prefixes: Record<string, string>): Promise<Quad[]> {
  try {
    return new Parser().parse(await readFile(path, 'utf8'), null, (prefix, iri) => { prefixes[prefix] = iri.value; });
  } catch (err) {
    throw new Error(`${path}: ${(err as Error).message}`);
  }
}

// The offer for an asset holds every rule in policies/ whose target is that asset, minus
// the owner's own access (assignee is the assigner). Rules are copied into the offer with
// new blank nodes so they stay apart from the Agreements UMA enforces, and point back to
// their source with prov:wasDerivedFrom. Offer rules carry no odrl:target, since
// odrl:hasPolicy makes the asset the target.
function offerFor(asset: Quad_Subject, title: Term | undefined, rules: Store, next: () => BlankNode): Quad[] {
  const has = (s: Term, p: Term, o: Term) => rules.countQuads(s, p, o, null) > 0;
  const one = (s: Term, p: string) => rules.getObjects(s, odrl(p), null)[0];
  const selected = rules.getSubjects(odrl('target'), asset, null)
    .filter((r) => has(r, RDF_TYPE, odrl('Permission')) || has(r, RDF_TYPE, odrl('Prohibition')))
    .filter((r) => !one(r, 'assignee')?.equals(one(r, 'assigner')))
    .sort((a, b) => a.value.localeCompare(b.value));
  if (selected.length === 0) return [];

  const path = new URL(asset.value).pathname.replace(/^\/|\/$/g, '').replace(/[^A-Za-z0-9]+/g, '-');
  const offer = namedNode(`${D23}offer-${path}`);
  const out: Quad[] = [
    quad(asset, odrl('hasPolicy'), offer),
    quad(offer, RDF_TYPE, odrl('Offer')),
    quad(offer, odrl('uid'), offer),
  ];
  if (title?.termType === 'Literal') out.push(quad(offer, namedNode(DCT + 'title'), literal(`Offer for ${title.value}`, title.language || undefined)));

  const parties = new Set<string>();
  for (const rule of selected) {
    const kind = has(rule, RDF_TYPE, odrl('Permission')) ? 'Permission' : 'Prohibition';
    const copy = next();
    out.push(quad(offer, odrl(kind.toLowerCase()), copy));
    out.push(quad(copy, RDF_TYPE, odrl(kind)));
    out.push(quad(copy, namedNode(PROV + 'wasDerivedFrom'), rule));
    for (const q of rules.getQuads(rule, null, null, null)) {
      if (q.predicate.equals(RDF_TYPE) || q.predicate.equals(odrl('target'))) continue;
      if (q.predicate.equals(odrl('assigner')) || q.predicate.equals(odrl('assignee'))) parties.add(q.object.value);
      if (!q.predicate.equals(odrl('constraint'))) {
        out.push(quad(copy, q.predicate, q.object));
        continue;
      }
      const constraint = next();
      out.push(quad(copy, q.predicate, constraint));
      for (const c of rules.getQuads(q.object, null, null, null)) out.push(quad(constraint, c.predicate, c.object));
    }
  }
  for (const party of parties) out.push(quad(namedNode(party), RDF_TYPE, odrl('Party')));
  return out;
}

async function build(): Promise<string> {
  const prefixes: Record<string, string> = { prov: PROV };
  const listing = await parseFile(file, prefixes);
  const rules = new Store();
  for await (const name of glob('*.ttl', { cwd: policies })) rules.addQuads(await parseFile(join(policies, name), prefixes));

  const catalog = new Store(listing);
  let n = 0;
  const next = () => blankNode(`b${n++}`);
  const assets = [DCAT + 'Dataset', DCAT + 'DataService'].flatMap((type) => catalog.getSubjects(RDF_TYPE, namedNode(type), null));
  const offers = assets.flatMap((asset) => offerFor(asset, catalog.getObjects(asset, namedNode(DCT + 'title'), null)[0], rules, next));

  // Group each subject's triples so every resource is written as one block.
  const groups = new Map<string, Quad[]>();
  for (const q of [...listing, ...offers]) {
    const key = `${q.subject.termType}:${q.subject.value}`;
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  const quads = [...groups.values()].flat();
  const terms = quads.flatMap((q) => [q.subject, q.predicate, q.object, ...(q.object.termType === 'Literal' ? [q.object.datatype] : [])]);
  const used = Object.entries(prefixes).filter(([, iri]) => terms.some((t) => t.termType === 'NamedNode' && t.value.startsWith(iri)));
  const writer = new Writer({ prefixes: Object.fromEntries(used) });
  writer.addQuads(quads);
  return new Promise((resolve, reject) => writer.end((err, text: string) => (err ? reject(err) : resolve(text))));
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (req.method !== 'GET' || path !== '/catalog') {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found. The catalogue is at GET /catalog\n');
    return;
  }
  try {
    // Built on every request, so edits to the catalogue or the policies show without a restart.
    const body = await build();
    res.writeHead(200, { 'content-type': 'text/turtle', 'access-control-allow-origin': '*' });
    res.end(body);
  } catch (err) {
    console.error((err as Error).message);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(`Could not build the catalogue: ${(err as Error).message}\n`);
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error(err.code === 'EADDRINUSE' ? `Port ${port} is in use. Stop the other server or pass --port.` : err.message);
  process.exit(1);
});

server.listen(port, () => console.log(`D2.3 catalogue on http://localhost:${port}/catalog (file ${file}, policies ${policies})`));
