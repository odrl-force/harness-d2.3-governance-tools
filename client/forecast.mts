import { Parser, Store, type Term } from 'n3';

const SOSA = 'http://www.w3.org/ns/sosa/';
const TIME = 'http://www.w3.org/2006/time#';
const QUDT = 'http://qudt.org/schema/qudt/';
const TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

export type Month = { start: Date; kWh: number };

// The monthly readings in a household's file, oldest first.
export function readMonths(turtle: string): Month[] {
  const store = new Store(new Parser().parse(turtle));
  const one = (s: Term, p: string) => store.getObjects(s, p, null)[0];
  const months = store.getSubjects(TYPE, SOSA + 'Observation', null).map((obs) => {
    const begin = one(one(one(obs, SOSA + 'phenomenonTime'), TIME + 'hasBeginning'), TIME + 'inXSDDateTimeStamp');
    const value = one(one(obs, SOSA + 'hasResult'), QUDT + 'numericValue');
    return { start: new Date(begin.value), kWh: Number(value.value) };
  });
  return months.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// Least-squares fit of mean level plus one yearly sine and cosine to twelve consecutive
// months. For twelve evenly spaced points over one period the three terms are orthogonal,
// so the least-squares weights are the mean and two averaged products.
export function fitSeasonal(months: Month[]): { level: number; sin: number; cos: number } {
  if (months.length !== 12) throw new Error(`the fit needs 12 monthly readings, got ${months.length}`);
  const angle = (m: Month) => (2 * Math.PI * m.start.getUTCMonth()) / 12;
  const level = months.reduce((sum, m) => sum + m.kWh, 0) / 12;
  const sin = months.reduce((sum, m) => sum + m.kWh * Math.sin(angle(m)), 0) / 6;
  const cos = months.reduce((sum, m) => sum + m.kWh * Math.cos(angle(m)), 0) / 6;
  return { level, sin, cos };
}

// The next twelve months as Turtle, with the service named as the system that made them.
export function forecastTurtle(months: Month[], service: string, readings: string): string {
  const fit = fitSeasonal(months);
  const last = months[11].start;
  const iso = (d: Date) => d.toISOString().replace('.000Z', 'Z');
  const ids: string[] = [];
  const entries: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const start = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const a = (2 * Math.PI * start.getUTCMonth()) / 12;
    const kWh = fit.level + fit.sin * Math.sin(a) + fit.cos * Math.cos(a);
    const id = `<#${iso(start).slice(0, 7)}>`;
    ids.push(id);
    entries.push(`${id} a tech:Prediction ;
    sosa:phenomenonTime [ a time:Interval ;
        time:hasBeginning [ a time:Instant ; time:inXSDDateTimeStamp "${iso(start)}"^^xsd:dateTimeStamp ] ;
        time:hasEnd [ a time:Instant ; time:inXSDDateTimeStamp "${iso(end)}"^^xsd:dateTimeStamp ] ] ;
    sosa:hasResult [ a qudt:QuantityValue ;
        qudt:numericValue "${kWh.toFixed(2)}"^^xsd:decimal ;
        qudt:unit unit:KiloW-HR ] .`);
  }
  return `@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .
@prefix time: <http://www.w3.org/2006/time#> .
@prefix qudt: <http://qudt.org/schema/qudt/> .
@prefix unit: <http://qudt.org/vocab/unit/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix dct:  <http://purl.org/dc/terms/> .
@prefix tech: <https://w3id.org/dpv/tech#> .

<#forecast> a prov:Collection ;
    dct:description "Forecast of the household's monthly electricity use for the next twelve months, made by an AI system: a least-squares fit of mean level plus one yearly sine and cosine to its last twelve readings."@en ;
    prov:wasGeneratedBy <${service}> ;
    prov:wasDerivedFrom <${readings}> ;
    prov:hadMember ${ids.join(', ')} .

${entries.join('\n\n')}
`;
}
