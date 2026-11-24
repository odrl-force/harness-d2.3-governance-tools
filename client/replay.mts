import { DataFactory, Parser, Store, type Quad } from 'n3';
import {
  ODRLEvaluator, ODRLEngineMultipleSteps, EyelingReasoner,
  parseComplianceReport, serializeComplianceReport, RDF, REPORT,
} from 'odrl-evaluator';
import { ActiveConflictResolver, DenyConflictResolver, FORCE, type ConflictResolverInput } from 'policy-conflict-resolver';

const ODRL = 'http://www.w3.org/ns/odrl/2/';
const TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const SOTW = 'https://w3id.org/force/sotw#context';
const LEGAL_BASIS = 'https://w3id.org/oac#LegalBasis';

export type ReplayRequest = {
  action: string;
  target: string;
  requester: string;
  purposes?: string[];
  legalBasis?: string;
};

export type Replay = {
  decision: 'ALLOW' | 'DENY';
  active: { policy: string; rule: string }[];
};

export const parseTurtle = (text: string): Quad[] => new Parser().parse(text);

let evaluator: ODRLEvaluator | undefined;

// The request has the shape UMA builds: one permission, the requester as assignee,
// and each claim as a sotw:context constraint on a blank node.
function buildRequest(r: ReplayRequest): Quad[] {
  const { quad, namedNode, blankNode } = DataFactory;
  const req = namedNode('urn:d23:request:replay');
  const rule = namedNode('urn:d23:request-rule:replay');
  const q = [
    quad(req, namedNode(TYPE), namedNode(ODRL + 'Request')),
    quad(req, namedNode(ODRL + 'permission'), rule),
    quad(rule, namedNode(TYPE), namedNode(ODRL + 'Permission')),
    quad(rule, namedNode(ODRL + 'action'), namedNode(r.action)),
    quad(rule, namedNode(ODRL + 'target'), namedNode(r.target)),
    quad(rule, namedNode(ODRL + 'assignee'), namedNode(r.requester)),
  ];
  const claims = (r.purposes ?? []).map((p) => [ODRL + 'purpose', p]);
  if (r.legalBasis) claims.push([LEGAL_BASIS, r.legalBasis]);
  for (const [left, right] of claims) {
    const b = blankNode();
    q.push(
      quad(rule, namedNode(SOTW), b),
      quad(b, namedNode(TYPE), namedNode(ODRL + 'Constraint')),
      quad(b, namedNode(ODRL + 'leftOperand'), namedNode(left)),
      quad(b, namedNode(ODRL + 'operator'), namedNode(ODRL + 'eq')),
      quad(b, namedNode(ODRL + 'rightOperand'), namedNode(right)),
    );
  }
  return q;
}

function stateOfTheWorld(time: string): Quad[] {
  const { quad, namedNode, literal } = DataFactory;
  return [quad(namedNode('http://example.com/request/currentTime'), namedNode('http://purl.org/dc/terms/issued'),
    literal(time, namedNode('http://www.w3.org/2001/XMLSchema#dateTime')))];
}

export async function replay(policy: Quad[], request: ReplayRequest, time = new Date().toISOString()): Promise<Replay> {
  evaluator ??= new ODRLEvaluator(new ODRLEngineMultipleSteps({ reasoner: new EyelingReasoner() }));
  const store = new Store(await evaluator.evaluate(policy, buildRequest(request), stateOfTheWorld(time)));
  const active: Replay['active'] = [];
  const reports: ConflictResolverInput['reports'] = [];
  for (const node of store.getSubjects(RDF.type, REPORT.PolicyReport, null)) {
    const report = parseComplianceReport(node, store);
    for (const r of report.ruleReport) {
      if (r.activationState === REPORT.Active) active.push({ policy: report.policy.value, rule: r.rule.value });
    }
    reports.push({ policy, report: serializeComplianceReport(report) });
  }
  if (reports.length === 0) return { decision: 'DENY', active };
  // Allow only if a permission is active and no prohibition is: UMA's PrioritizeProhibitionStrategy.
  const result = await new ActiveConflictResolver(new DenyConflictResolver()).handleSafe({ reports });
  const conclusion = new Store(result.report).getObjects(result.identifier, FORCE.conclusion, null)[0];
  return { decision: conclusion?.value === FORCE.Allow ? 'ALLOW' : 'DENY', active };
}
