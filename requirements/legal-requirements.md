# Legal Requirements for D2.3

**Status:** DRAFT v0.1  
**Last updated:** 2026-08-18  
**Last updated:** 2026-09-30  
**Author:** Marlin  
**Review:** Beatriz

## Purpose

This document maps relevant EU regulations to specific obligations. We then derive technical requirements that the D2.3 prototype must address. It addresses what the EU provisions require when personal data flows from a personal data vault into a data space.

## Scope

### In scope
- **GDPR [(2016/679)](http://data.europa.eu/eli/reg/2016/679/2016-05-04)** - personal data processing principles, consent, purpose limitation, data portability
- **DGA (Data Governance Act) [(2022/868)](http://data.europa.eu/eli/reg/2022/868/oj)** - data altruism, intermediary obligations
- **Data Act [(2023/2854)](https://eur-lex.europa.eu/eli/reg/2023/2854/oj)** - B2C (Business-to-Consumer) and B2B (Business-to-Business) data sharing rights and obligations 
> **Status of law:** reports indicate that Commission proposal COM(2025) 837 final would repeal the DGA and move data altruism into the Data Act. I cite the DGA as currently in force. TODO (@Marlin): confirm the status with Beatriz.

BE: Indeed, the status remains the same, and for the sake of completing the work on time, we can say that that was the status when we started developing and even if the proposal is accepted before the deadline, we consider it out of scope for this deliverable.

### Out of scope (temporarily awaiting review, collaboration from other DCs and supervisors)
- AI Act [(2024/1689)](http://data.europa.eu/eli/reg/2024/1689) (currently looking into it, and propose including it as it is relevant in state of the world.)
- EHDS [(2025/327)](https://eur-lex.europa.eu/eli/reg/2025/327/oj) clinical data standards (domain-specific for proposed use case, EHDS focuses on electronic health data, use case is on utility data in smart city context.)
- GDPR data breach reporting (not fully informed)
- Cross-border transfer mechanisms (Chapter V GDPR)
- EUDI wallet [(2024/1183)](https://eur-lex.europa.eu/eli/reg/2024/1183/oj/eng) (implementing acts not finalised)

BE: GDPR data breach reporting - this should not be out of scope, we might not do anything about it, but it should be in scope anyway

---

## Requirements Table

### GDPR Requirements

| ID | Regulation | Article(s) | Obligation | When it applies | What must be captured | What must be documented | Technical requirement |
|----|------------|------------|------------|-----------------|-----------------------|-------------------------|-----------------------|
| G1 | GDPR | Art. 6(1) | Lawful basis must exist before processing | Every time data is accessed from the pod | The legal basis claimed (consent, legitimate interest, contract, etc.) | Record of which legal basis was used | Policy must include `odrl:constraint` for legal basis; engine must verify before granting access. In the D1 scenario the basis is consent, Art. 6(1)(a); see G3 |
| G2 | GDPR | Art. 5(1)(b) | Purpose limitation: data collected for specified purposes, not processed incompatibly | Every access request | The stated purpose of the data request | Record linking access grant to specific purpose | Policy must include `dpv:Purpose` constraint; engine must match requested purpose to allowed purposes |
| G3 | GDPR | Art. 7 | Consent must be freely given, specific, informed, unambiguous; withdrawable | When consent is the legal basis | Consent status (given/withdrawn), scope, timestamp | Consent record with date, scope, identity of controller | Policy engine must check consent status; withdrawal must immediately revoke access |
| G4 | GDPR | Art. 5(1)(e) | Storage limitation: not kept longer than necessary | When data has a retention period | Retention period / expiry date | Log of when data access was time-limited | Policy must include temporal constraint (`odrl:dateTime`); engine must enforce expiry |
| G5 | GDPR | Art. 13-14 | Information must be provided to data subject about processing | When a new processor/controller accesses data | Identity of controller, purpose, legal basis, retention period | Record that information was provided | Access request must include controller identity and purpose; these must be logged |
| G6 | GDPR | Art. 20 | Data portability: right to receive data in structured, machine-readable format | When data subject requests it or when transferring between controllers | Data format, completeness | Record of portability request and fulfilment | Solid Pod already stores data in RDF (machine-readable); connector must preserve format |
| G7 | GDPR | Art. 25 | Data protection by design and by default | System design phase | Privacy-preserving defaults | Documentation of design choices | Default policies must be restrictive (deny by default); purpose must always be specified |

BE: G6, would be nice to implement some rights exercising, but don't know if there is time for this. I would remove it for now.

### DGA (Data Governance Act) Requirements

| ID | Regulation | Article(s) | Obligation | When it applies | What must be captured | What must be documented | Technical requirement |
|----|-----------|------------|------------|-----------------|----------------------|------------------------|----------------------|
| D1 | DGA | Art. 2(16), Ch. IV | Data altruism: voluntary sharing on the basis of the data subject's consent, for objectives of general interest (Art. 2(16)). In this scenario the GDPR legal basis is therefore consent, Art. 6(1)(a), which ties G1 to G3 | When a citizen chooses to share data for public benefit (e.g., urban planning) | Purpose (must be "general interest"), consent form used, identity of data altruism org | European data altruism consent form record (Art. 25) | Policy must distinguish altruistic vs. commercial purposes; specific consent form metadata must be captured; consent is represented by the owner's policy (see G1, G3) |
| D2 | DGA | Art. 21(2) | A recognised data altruism organisation must not use the data for objectives other than the general-interest ones the data subject or data holder allowed | Every use of altruistically shared data | Purpose of each use | Log of purpose per access | Purpose enforcement in policy engine, same as G2. Exact match only is a design choice of D2.3, stricter than Art. 21(2), which does not prescribe exact matching |
| D3 | DGA | Art. 11-12 | Data intermediation services providers must notify the competent authority (Art. 11) and stay neutral, not using the data for their own purposes (Art. 12(a)) | When a data intermediary facilitates the exchange | Intermediary identity, notification status, neutrality status | Notification and compliance record | Bridge must verify intermediary notification status (public register, Art. 11(10)) before enabling access |

BE: on D2, under 'What must be documented', should be:
- Article 20 - Transparency requirements
- notice in 21.1 should be added - but maybe this one should not be under D2, should be D3 and the current D3 will be D4

BE: currently I don't see the need for D3 (data intermediation) unless you add the sharing with commercial parties to the scenario


### Data Act Requirements

| ID | Regulation | Article(s) | Obligation | When it applies | What must be captured | What must be documented | Technical requirement |
|----|-----------|------------|------------|-----------------|----------------------|------------------------|----------------------|
| DA1 | Data Act | Art. 3-4 | Users have a right to access data generated by their connected products. The duty sits on the manufacturer (Art. 3(1)) and the data holder (Art. 4(1)). In D2.3 the pod is where Anna keeps the data she obtains | When IoT device generates data | Device identity, data types generated | Access log | Solid Pod must be able to ingest IoT data; user must be able to grant/revoke access |
| DA2 | Data Act | Art. 5 | At the user's request the data holder must make data available to a third party (Art. 5(1)). The pod is not the data holder. In D2.3 the pod is the user's side: Anna decides who receives her data and her policy records that decision. The data holder's own Art. 5 duty is not modelled | When user requests data sharing with a data space participant | Identity of third party, scope of sharing, user's request | Record of user request and fulfilment | Policy must allow user-initiated sharing; bridge must verify user authorisation |
| DA3 | Data Act | Art. 6(2) | Third parties must not use data to develop competing products | When data is shared with third parties | Prohibited uses | Contractual/policy prohibition | Policy must include prohibitive rules (`odrl:prohibition`) for specific uses |
| DA4 | Data Act | Art. 8-9 | Reasonable compensation may be required | When data is shared B2B | Compensation terms | Record of compensation agreement | Out of scope for PoC (contract negotiation handled by connector) |

---

## Mapping to Existing Implementations

*Per architecture.md, unverified until the evaluator runs.*

| Requirement                  | Already implemented? | Where?                                                       | Gap?                                                   |
|------------------------------|----------------------|--------------------------------------------------------------|--------------------------------------------------------|
| G1 (Lawful basis)            | Unsure               | Legal basis constraint                                       | To test                                                |
| G2 (Purpose)                 | Yes                  | `dpv:Purpose` constraint                                     | Multiple purposes currently pass (see D2)              |
| G3 (Consent)                 | No                   | None. Consent is represented by the owner's policy           | Consent state and withdrawal not supported             |
| G4 (Time limits)             | Yes                  | `odrl:dateTime` constraint                                   | None known                                             |
| G5 (Information provision)   | TBD                  | TBD                                                          | TBD                                                    |
| G6 (Portability)             | TBD                  | TBD                                                          | TBD                                                    |
| G7 (By design)               | Yes                  | Default-deny decision strategy                               | None known                                             |
| D1 (Data altruism)           | Unclear              | Party or verifiable credential                               | Mechanism to be tested                                 |
| D2 (Altruism purpose lock)   | Partly               | `dpv:Purpose` constraint                                     | Multiple purposes pass; exact match is a design choice |
| D3 (Intermediary check)      | Unsure/No            | Notification status                                          | No mechanism established                               |
| DA1 (IoT access)             | TBD                  | TBD                                                          | TBD                                                    |
| DA2 (User-initiated sharing) | Yes                  | Policy authorship (LOAMA)                                    | None known                                             |
| DA3 (Use restrictions)       | Yes                  | Prohibition rules; prohibition-overrides-permission strategy | None known                                             |

---

## Priority for PoC implementation

### Must-have (minimum viable prototype)
- G1: Explicit legal basis in policies
- G2: Purpose-based access control 
- G4: Time-limited access
- G7: Deny-by-default
- DA2: User-initiated sharing via bridge
- DA3: Prohibition enforcement in demo (already implemented in the evaluator)
- Bridge: Connector <-> server UMA communication 

### Should-have (makes it a stronger demo)
- G3: Consent with withdrawal
- D1: Data altruism purpose categories
- DA1: IoT data ingestion (can use synthetic data)

### Maybe-have (if time permits)
- G5: Information provision logging
- D3: Intermediary registry check

---

## [ ] **TODO:**  (@Marlin)

1. Confirm this requirements list with Beatriz & Harsh
2. Mapping table filled from architecture.md (unverified until the evaluator runs). G5, G6 and DA1 still TBD. Re-check after the evaluator run
3. Discuss with Beatriz-Joachim which requirements affect the authorizer (Joachim knows UMA best)
4. Discuss with Beatriz-Wout which requirements affect the policy engine (Wout knows ODRL evaluator best)
5. Confirm the "must-have" list is achievable by end of November
6. Start architecture diagram based on confirmed requirements
