# Legal Requirements for D2.3

**Status:** DRAFT v0.1  
**Last updated:** 2026-08-18  
**Author:** Marlin  
**Review:** Beatriz

## Purpose

This document maps relevant EU regulations to specific obligations. We then derive technical requirements that the D2.3 prototype must address. It adresses: what the EU provisions require when personal data flows from a personal data vault into a data space.

## Scope

### In scope
- **GDPR [(2016/679)](http://data.europa.eu/eli/reg/2016/679/2016-05-04)** - personal data processing principles, consent, purpose limitation, data portability
- **DGA (Data Governance Act) [(2022/868)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)** - data altruism, intermediary obligations
- **Data Act [(2023/2854)](https://eur-lex.europa.eu/eli/reg/2023/2854/oj)** - B2C (Business-to-Consumer) and B2B (Business-to-Business) data sharing rights and obligations

### Out of scope (temporarily awaiting review, collaboration from other DCs and supervisors)
- AI Act [(2024/1689)](http://data.europa.eu/eli/reg/2024/1689) (currently looking into it, and propose including it as it is relevant in state of the world.)
- EHDS [(2025/327)](https://eur-lex.europa.eu/eli/reg/2025/327/oj) clinical data standards (domain-specific for proposed use case, EHDS focuses on electronic health data, use case is on utility data in smart city context.)
- GDPR data breach reporting (not fully informed)
- Cross-border transfer mechanisms (Chapter V GDPR)
- EUDI wallet [(2024/1183)](https://eur-lex.europa.eu/eli/reg/2024/1183/oj/eng) (implementing acts not finalised)

---

## Requirements Table

### GDPR Requirements

| ID | Regulation | Article(s) | Obligation | When it applies | What must be captured | What must be documented | Technical requirement |
|----|-----------|------------|------------|-----------------|----------------------|------------------------|----------------------|
| G1 | GDPR | Art. 6(1) | Lawful basis must exist before processing | Every time data is accessed from the pod | The legal basis claimed (consent, legitimate interest, contract, etc.) | Record of which legal basis was used | Policy must include `odrl:constraint` for legal basis; engine must verify before granting access |
| G2 | GDPR | Art. 5(1)(b) | Purpose limitation: data collected for specified purposes, not processed incompatibly | Every access request | The stated purpose of the data request | Record linking access grant to specific purpose | Policy must include `dpv:Purpose` constraint; engine must match requested purpose to allowed purposes |
| G3 | GDPR | Art. 7 | Consent must be freely given, specific, informed, unambiguous; withdrawable | When consent is the legal basis | Consent status (given/withdrawn), scope, timestamp | Consent record with date, scope, identity of controller | Policy engine must check consent status; withdrawal must immediately revoke access |
| G4 | GDPR | Art. 5(1)(e) | Storage limitation: not kept longer than necessary | When data has a retention period | Retention period / expiry date | Log of when data access was time-limited | Policy must include temporal constraint (`odrl:dateTime`); engine must enforce expiry |
| G5 | GDPR | Art. 13-14 | Information must be provided to data subject about processing | When a new processor/controller accesses data | Identity of controller, purpose, legal basis, retention period | Record that information was provided | Access request must include controller identity and purpose; these must be logged |
| G6 | GDPR | Art. 20 | Data portability: right to receive data in structured, machine-readable format | When data subject requests it or when transferring between controllers | Data format, completeness | Record of portability request and fulfilment | Solid Pod already stores data in RDF (machine-readable); connector must preserve format |
| G7 | GDPR | Art. 25 | Data protection by design and by default | System design phase | Privacy-preserving defaults | Documentation of design choices | Default policies must be restrictive (deny by default); purpose must always be specified |

### DGA (Data Governance Act) Requirements

| ID | Regulation | Article(s) | Obligation | When it applies | What must be captured | What must be documented | Technical requirement |
|----|-----------|------------|------------|-----------------|----------------------|------------------------|----------------------|
| D1 | DGA | Art. 2(16), Ch. IV | Data altruism: voluntary sharing for general interest purposes | When a citizen chooses to share data for public benefit (e.g., urban planning) | Purpose (must be "general interest"), consent form used, identity of data altruism org | European data altruism consent form record | Policy must distinguish altruistic vs. commercial purposes; specific consent form metadata must be captured |
| D2 | DGA | Art. 25, Art. 21, Art. 22 | Data altruism organisations must ensure data is not used for other purposes | Every use of altruistically shared data | Purpose of each use | Log of purpose per access | Purpose enforcement in policy engine (same as G2 but stricter - no compatible purposes, exact match only) |
| D3 | DGA | Art. 12-15 | Data intermediaries must be neutral, not use data for own purposes | When a data intermediary facilitates the exchange | Intermediary identity, neutrality status | Registration and compliance record | Bridge must verify intermediary registration status before enabling access |

### Data Act Requirements

| ID | Regulation | Article(s) | Obligation | When it applies | What must be captured | What must be documented | Technical requirement |
|----|-----------|------------|------------|-----------------|----------------------|------------------------|----------------------|
| DA1 | Data Act | Art. 3-4 | Users have right to access data generated by their connected products | When IoT device generates data | Device identity, data types generated | Access log | Solid Pod must be able to ingest IoT data; user must be able to grant/revoke access |
| DA2 | Data Act | Art. 5 | Data holders must share data with third parties at user's request | When user requests data sharing with a data space participant | Identity of third party, scope of sharing, user's request | Record of user request and fulfilment | Policy must allow user-initiated sharing; bridge must verify user authorisation |
| DA3 | Data Act | Art. 6(2) | Third parties must not use data to develop competing products | When data is shared with third parties | Prohibited uses | Contractual/policy prohibition | Policy must include prohibitive rules (`odrl:prohibition`) for specific uses |
| DA4 | Data Act | Art. 8 | Reasonable compensation may be required | When data is shared B2B | Compensation terms | Record of compensation agreement | Out of scope for PoC (contract negotiation handled by connector) |

---

## [ ] **TODO:(@Marlin)** Mapping to Existing Implementations

| Requirement | Already implemented? | Where? | Gap? |
|-------------|---------------------|--------|------|
| G1 (Lawful basis) |  |  |  |
| G2 (Purpose) |   |  |  |
| G3 (Consent) |  |  |  |
| G4 (Time limits) |   | |  |
| G5 (Information provision) |   |  |  |
| G6 (Portability) |   |  |  |
| G7 (By design) |  |  |  |
| D1 (Data altruism) |   |  | |
| D2 (Altruism purpose lock) |  |  |  |
| D3 (Intermediary check) |   |  |  |
| DA1 (IoT access) |   | |  |
| DA2 (User-initiated sharing) |  |  |  |
| DA3 (Use restrictions) |   |  |  |

---

## Priority for PoC implementation

### Must-have (minimum viable prototype)
- G2: Purpose-based access control 
- G4: Time-limited access
- G7: Deny-by-default
- DA2: User-initiated sharing via bridge
- Bridge: Connector <-> server UMA communication 

### Should-have (makes it a stronger demo)
- G1: Explicit legal basis in policies
- G3: Consent with withdrawal
- D1: Data altruism purpose categories
- DA1: IoT data ingestion (can use synthetic data)

### Maybe-have (if time permits)
- G5: Information provision logging
- D3: Intermediary registry check
- DA3: Prohibition enforcement in demo

---

## [ ] **TODO:**  (@Marlin)

1. Confirm this requirements list with Beatriz & Harsh
2. After confirmed, map the requirements to existing implementations
3. Discuss with Beatriz-Joachim which requirements affect the authorizer (Joachim knows UMA best)
4. Discuss with Beatriz-Wout which requirements affect the policy engine (Wout knows ODRL evaluator best)
5. Confirm the "must-have" list is achievable by end of November
6. Start architecture diagram based on confirmed requirements
