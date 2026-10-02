# Architecture

**Status:** DRAFT  
**Last updated:** 2026-09-02  
**Last updated:** 2026-09-30   
**Created:** 2026-08-20  
**Author:** Marlin  
**Review:** Beatriz


## Summary

D2.3 connects a data space connector to a Solid pod whose access is governed by
machine-readable policies. A request arriving from the data space is evaluated
against the data owner's ODRL policies before any data moves.

The storage, policy and evaluation components already exist within the research
infrastructure this project builds on. The new work in D2.3 is the bridge
between the data space and that stack.


## Components

| Component | Job | New or existing |
|-----------|-----|-----------------|
| Solid pod (CSS) | Stores the data. Holds no policies. | Existing |
| Authorization server (UMA) | Holds policies, issues tickets and tokens, orchestrates evaluation | Existing |
| ODRL evaluator | Decides whether a request satisfies a policy. Returns a compliance report. | Existing |
| Policy management interface (LOAMA)| Where the owner writes and manages policies | Existing |
| Data space connector (will be informed by Meem) | The participant's gateway into the data space | Existing, not yet selected |
| Bridge | Translates data space requests into authorization server requests | New. TBD |

Under this architecture the pod is a pure resource server. All access control
moves to the authorization server. This differs from standard Solid, which keeps
storage and access control together.

## Why the pod holds no policies

Standard Solid keeps storage and access control together. The pod server decides access itself, using WAC or ACP. In D2.3 I separate the two. The pod stores data
and the authorization server holds the policies.

This matches where Solid is going. The W3C Linked Web Storage Working Group
(chartered September 2024) is standardising Solid's successor and permits an
external authorization server. The Community Solid Server paper by Van Herwegen
and Verborgh [TODO:add citation -- The Community Solid Server:
Supporting Research & Development in an Evolving Ecosystem] describes authorization as a swappable module of the
server (WAC, ACP or none).

TODO (@Marlin): confirm with Joachim how the UMA server plugs into CSS before
claiming more here.


## Existing access flow


```
CLIENT                    POD                    AUTHORIZATION SERVER
  |                        |                          |
  |--- GET /resource ----->|                          |
  |                        |--- is this public? ----->|
  |                        |<-- no -------------------|
  |                        |--- client wants access ->|
  |                        |<-- ticket ---------------|
  |<-- go there + ticket --|                          |
  |                        |                          |
  |--- ticket + identity + purpose ----------------->|
  |                        |            evaluates ODRL policies
  |<-- access token ---------------------------------|
  |                        |                          |
  |--- GET /resource + token -->|                     |
  |<-- data --------------------|                     |
```

Denial returns HTTP 403. The server can also request additional claims before
deciding.

Evaluation inside the authorization server proceeds as: verify the claims, build
the evaluation model, assemble the state of the world (currently the timestamp),
run the evaluator once per requested resource, then interpret the compliance
report into a decision. Two decision strategies are implemented: default-deny,
and prohibition-overrides-permission.


## What the bridge does
TBD

Design questions still open:

- What the connector sends and in what format
- How a connector's participant identity becomes an identity token the
  authorization server accepts
- How a data space purpose becomes a DPV purpose IRI
- Whether the bridge retrieves the data or returns the token to the connector
- Which connector will be used?


## Constraints the stack can enforce currently

Mapped against `requirements/legal-requirements.md`:

| Requirement | Constraint | Supported per docs | Verified by running? |
|---|---|---|---|
| G2 purpose limitation | `dpv:Purpose` | Yes | no |
| G4 storage limitation | `odrl:dateTime` | Yes | no |
| G7 deny by default | Decision strategy | Yes | no |
| DA2 user-initiated sharing | Policy authorship | Yes | no |
| DA3 use restrictions | Prohibition rules | Yes | no |
| G1 lawful basis | Legal basis | Unsure | no |
| G3 consent status | Consent state | No | no |
| D1 altruism organisation | Party or verifiable credential | Unclear/Unsure, needs testing | no |
| D2 exact purpose match | Purpose | Partly. Supplying multiple purposes currently passes. | no |
| D3 intermediary notification | Notification status | Unsure/No | no |



## Limits that shape the design

TBD


## Scope

D2.3 implements evaluation and enforcement relying on state-of-the-world
tracking for temporal and purpose context. It reuses existing components for
syntactic and semantic validation.

Out of scope for the proof of concept:

- Aggregation
- Duty enforcement
- Policy combination
- Consent withdrawal mid-flow
- Contract negotiation between connectors



## Open questions for review

1. ~Policy combination. The owner's policies plus the recipient's regulatory
   obligations are two policies over one request. Is defining this for the
   legal-obligations case a D2.3 contribution, or too large? (Or am I overcomplicating this?)~
2. ~The demo scenario's aggregation constraint and duty cannot be enforced.
   Drop them, or change the scenario?~


## Next steps for me

- [ ] Run the evaluator locally 
- [ ] Run a pod locally with sample data
- [ ] Connect pod and authorization server
- [ ] Build the mock connector (need help)
- [ ] Build the bridge against the mock (need help)
- [ ] Select and run a real connector (with Meem)
- [ ] Replace the ASCII diagrams with a proper figure (consult with rest, I am bad at diagrams)
