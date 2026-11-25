# Legal Requirements for D2.3

**Status:** DRAFT v0.1  
**Last updated:** 2026-11-25  
**Author:** Marlin  
**Review:** Beatriz

## Purpose

This document maps relevant EU regulations to specific obligations. We then derive technical requirements that the D2.3 prototype must address. It addresses what the EU provisions require when personal data flows from a personal data vault into a data space.

## Scope

### In scope
- **GDPR [(2016/679)](http://data.europa.eu/eli/reg/2016/679/2016-05-04)** - personal data processing principles, consent, purpose limitation, data breach notification
- **DGA (Data Governance Act) [(2022/868)](http://data.europa.eu/eli/reg/2022/868/oj)** - data altruism
- **Data Act [(2023/2854)](https://eur-lex.europa.eu/eli/reg/2023/2854/oj)** - B2C (Business-to-Consumer) and B2B (Business-to-Business) data sharing rights and obligations 
- **AI Act [(2024/1689)](http://data.europa.eu/eli/reg/2024/1689/oj)**, as amended by Regulation (EU) [2026/1744](http://data.europa.eu/eli/reg/2026/1744/oj) - classification of AI systems, roles of provider and deployer, high-risk use through a change of intended purpose, AI disclosure

> **Status of law:** reports indicate that Commission proposal COM(2025) 837 final would repeal the DGA and move data altruism into the Data Act. This deliverable cites the DGA as in force when development started. The proposal is out of scope, even if adopted before the deadline.

### Out of scope (temporarily awaiting review, collaboration from other DCs and supervisors)
- EHDS [(2025/327)](https://eur-lex.europa.eu/eli/reg/2025/327/oj) clinical data standards (domain-specific for proposed use case, EHDS focuses on electronic health data, use case is on utility data in smart city context.)
- Cross-border transfer mechanisms (Chapter V GDPR)
- EUDI wallet [(2024/1183)](https://eur-lex.europa.eu/eli/reg/2024/1183/oj/eng) (implementing acts not finalised)
- Data subject rights such as portability (GDPR Art. 20.1): D2.3 has no flow for exercising them
- Data intermediation services (DGA Art. 10 to 12): no intermediation service provider in the scenario

## Requirements Table

### GDPR Requirements

| ID | Regulation | Article(s) | Obligation | When it applies | What must be captured | What must be documented | Technical requirement |
|----|------------|------------|------------|-----------------|-----------------------|-------------------------|-----------------------|
| G1 | GDPR | Art. 6(1) | Lawful basis must exist before processing | Every time data is accessed from the pod | The legal basis claimed (consent, legitimate interest, contract, etc.) | Record of which legal basis was used | Policy must include `odrl:constraint` for legal basis; engine must verify before granting access. In the D1 scenario the basis is consent, Art. 6(1)(a); see G3 |
| G2 | GDPR | Art. 5(1)(b) | Purpose limitation: data collected for specified purposes, not processed incompatibly | Every access request | The stated purpose of the data request | Record linking access grant to specific purpose | Policy must include `dpv:Purpose` constraint; engine must match requested purpose to allowed purposes |
| G3 | GDPR | Art. 7 | Consent must be freely given, specific, informed, unambiguous; withdrawable | When consent is the legal basis | Consent status (given/withdrawn), scope, timestamp | Consent record with date, scope, identity of controller | Policy engine must check consent status; withdrawal must immediately revoke access |
| G4 | GDPR | Art. 5(1)(e) | Storage limitation: not kept longer than necessary | When data has a retention period | Retention period / expiry date | Log of when data access was time-limited | Policy must include temporal constraint (`odrl:dateTime`); engine must enforce expiry |
| G5 | GDPR | Art. 13-14 | Information must be provided to data subject about processing | When a new processor/controller accesses data | Identity of controller, purpose, legal basis, retention period | Record that information was provided | Access request must include controller identity and purpose; these must be logged |
| G7 | GDPR | Art. 25 | Data protection by design and by default | System design phase | Privacy-preserving defaults | Documentation of design choices | Default policies must be restrictive (deny by default); purpose must always be specified |
| G8 | GDPR | Art. 33, 34 | Personal data breaches are notified to the supervisory authority within 72 hours, and to data subjects when the risk is high; every breach is documented (Art. 33.5) | When a personal data breach occurs | What happened, which data, whose, when | Breach record | None built. The log shows who accessed which data and when, which helps establish a breach's scope |

### DGA (Data Governance Act) Requirements

| ID | Regulation | Article(s) | Obligation | When it applies | What must be captured | What must be documented | Technical requirement |
|----|-----------|------------|------------|-----------------|----------------------|------------------------|----------------------|
| D1 | DGA | Art. 2(16), Ch. IV | Data altruism: voluntary sharing on the basis of the data subject's consent, for objectives of general interest (Art. 2(16)). In this scenario the GDPR legal basis is therefore consent, Art. 6(1)(a), which ties G1 to G3 | When a citizen chooses to share data for public benefit (e.g., urban planning) | Purpose (must be "general interest"), consent form used, identity of data altruism org | European data altruism consent form record (Art. 25) | Policy must distinguish altruistic vs. commercial purposes; specific consent form metadata must be captured; consent is represented by the owner's policy (see G1, G3) |
| D2 | DGA | Art. 21(2) | A recognised data altruism organisation must not use the data for objectives other than the general-interest ones the data subject or data holder allowed | Every use of altruistically shared data | Purpose of each use | Records of who was given access, when and for which declared purpose (Art. 20(1)(a) to (c)); the log holds them | Purpose enforcement in policy engine, same as G2. Exact match only is a design choice of D2.3, stricter than Art. 21(2), which does not prescribe exact matching |
| D3 | DGA | Art. 21.1 | Before any processing, the recognised data altruism organisation informs the data subject of the objectives of general interest and the purpose | Before the first access under a data altruism policy | Objective and purpose shown to the data subject | Record that the data subject was informed, and when | Policy and request name the objective and purpose; Anna's page shows them |

BE: on D2, under 'What must be documented', should be:
- Article 20 - Transparency requirements
- notice in 21.1 should be added - but maybe this one should not be under D2, should be D3 and the current D3 will be D4

### Data Act Requirements

| ID | Regulation | Article(s) | Obligation | When it applies | What must be captured | What must be documented | Technical requirement |
|----|-----------|------------|------------|-----------------|----------------------|------------------------|----------------------|
| DA1 | Data Act | Art. 3-4 | Users have a right to access data generated by their connected products. The duty sits on the manufacturer (Art. 3(1)) and the data holder (Art. 4(1)). In D2.3 the pod is where Anna keeps the data she obtains | When IoT device generates data | Device identity, data types generated | Access log | Solid Pod must be able to ingest IoT data; user must be able to grant/revoke access |
| DA2 | Data Act | Art. 5 | At the user's request the data holder must make data available to a third party (Art. 5(1)). The pod is not the data holder. In D2.3 the pod is the user's side: Anna decides who receives her data and her policy records that decision. The data holder's own Art. 5 duty is not modelled | When user requests data sharing with a data space participant | Identity of third party, scope of sharing, user's request | Record of user request and fulfilment | Policy must allow user-initiated sharing; bridge must verify user authorisation |
| DA3 | Data Act | Art. 6(2) | Third parties must not use data to develop competing products | When data is shared with third parties | Prohibited uses | Contractual/policy prohibition | Policy must include prohibitive rules (`odrl:prohibition`) for specific uses |
| DA4 | Data Act | Art. 8-9 | Reasonable compensation may be required | When data is shared B2B | Compensation terms | Record of compensation agreement | Out of scope for PoC (contract negotiation handled by connector) |

### AI Act Requirements

| ID  | Regulation | Article(s)                                | Obligation                                                                                                                                                                | When it applies                                                          | What must be captured                                   | What must be documented                                          | Technical requirement                                                                                                                                                 |
|-----|------------|-------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|---------------------------------------------------------|------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AI1 | AI Act     | Art. 3.3, 3.4; Art. 2.10                  | Provider and deployer roles. EnerCo provides and runs the service. A household getting its own forecast for personal use is not a deployer                                | Every call to the service                                                | Provider; caller; owner of the readings used            | Role of each party                                               | Catalogue names the provider (`dct:publisher`, `tech:hasProvider`); log records caller and owner; each forecast readable only by its own household                    |
| AI2 | AI Act     | Art. 3.1; recital 12                      | The Act covers AI systems only. Simple statistical software may fall outside                                                                                              | Design of the service                                                    | Forecast method                                         | Classification note: the seasonal fit stands in for an AI system | Catalogue declares `ai:AISystem` and its technique (`ai:hasTechnique`)                                                                                                |
| AI3 | AI Act     | Art. 6.2; Annex III, points 2 and 5(b)    | The intended purpose decides the risk class. Advice on a household's own energy use is not in Annex III, so the service is not high-risk                                  | Design; every call                                                       | Intended purpose; purpose declared on each call         | Intended purpose and risk level                                  | Policy allows only `dpv:OptimisationForConsumer`; other purposes denied by default (G7); catalogue states intended purpose and risk level                             |
| AI4 | AI Act     | Art. 25.1(c), 25.2; Annex III, point 5(b) | Using the service for credit scoring would make it high-risk, and whoever does so becomes its provider. The original provider is covered if it clearly ruled that use out | Every call that declares a credit-checking purpose, alone or with others | Declared purposes; decision; deciding rule              | The ban on credit checking; each refused call                    | Policy must include `odrl:prohibition` on credit-checking purposes (`sector-finance:CreditChecking` and its narrower terms), in a separate policy from the permission |
| AI5 | AI Act     | Art. 12; Art. 19.1; Art. 26.6             | Automatic logging, with logs kept at least six months. High-risk systems only                                                                                             | Only if the service becomes high-risk                                    | Time, caller, purposes, decision and rules of each call | Hash-chained log                                                 | Optional here. Existing log, plus a link from each service call to the pod read it caused                                                                             |
| AI6 | AI Act     | Art. 50.1                                 | People must be told they are interacting with an AI system                                                                                                                | When a household calls the service                                       | That the forecast came from an AI system                | Disclosure in the catalogue and in each response                 | Catalogue types the service `ai:AISystem`; each response links to the service (`prov:wasGeneratedBy`)                                                                 |
| AI7 | AI Act     | Art. 4                                    | Providers and deployers support the AI literacy of their staff                                                                                                            | Always (organisational)                                                  | -                                                       | -                                                                | None. Organisational duty                                                                                                                                             |

## Mapping to Existing Implementations

*Statuses of the G, D and DA rows date from the design phase and are still to be checked against the code.*

| Requirement                  | Already implemented? | Where?                                                       | Gap?                                                   |
|------------------------------|----------------------|--------------------------------------------------------------|--------------------------------------------------------|
| G1 (Lawful basis)            | Unsure               | Legal basis constraint                                       | To test                                                |
| G2 (Purpose)                 | Yes                  | `dpv:Purpose` constraint                                     | Multiple purposes currently pass (see D2)              |
| G3 (Consent)                 | No                   | None. Consent is represented by the owner's policy           | Consent state and withdrawal not supported             |
| G4 (Time limits)             | Yes                  | `odrl:dateTime` constraint                                   | None known                                             |
| G5 (Information provision)   | TBD                  | TBD                                                          | TBD                                                    |
| G7 (By design)               | Yes                  | Default-deny decision strategy                               | None known                                             |
| G8 (Breach notification)     | No                   | Access log                                                   | No notification flow                                   |
| D1 (Data altruism)           | Unclear              | Party or verifiable credential                               | Mechanism to be tested                                 |
| D2 (Altruism purpose lock)   | Partly               | `dpv:Purpose` constraint                                     | Multiple purposes pass; exact match is a design choice |
| D3 (Altruism notice)         | Partly               | Purpose in Anna's policy; rule text on her page              | No notice from the City before its first read          |
| DA1 (IoT access)             | TBD                  | TBD                                                          | TBD                                                    |
| DA2 (User-initiated sharing) | Yes                  | Policy authorship (LOAMA)                                    | None known                                             |
| DA3 (Use restrictions)       | Yes                  | Prohibition rules; prohibition-overrides-permission strategy | None known                                             |
| AI1 (Roles)                  | Partly               | `dct:publisher` in catalogue; `requester`, `owner` in log    | Provider property missing; forecasts not per household |
| AI2 (AI system)              | Partly               | `ai:AISystem` in catalogue                                   | Forecast method not built                              |
| AI3 (Intended purpose)       | Partly               | Purpose constraint in EnerCo's service policy                | Service not running, so not enforced                   |
| AI4 (Credit-checking ban)    | Partly               | Prohibition in EnerCo's service policy                       | Needs its own policy (see #42)                         |
| AI5 (Logging)                | Partly               | Hash-chained log                                             | Service calls not logged yet                           |
| AI6 (AI disclosure)          | Partly               | `ai:AISystem` in catalogue                                   | Responses do not say an AI system made them            |
| AI7 (AI literacy)            | No                   | None                                                         | Organisational duty, nothing to build                  |
