# D2.3 - Solid Pod <-> Data Space Bridge

**HARNESS: Deliverable D2.3 - Tools for Governance of Data and AI Services**  

Proof of Concept: Compliance-Based Data Flow from Solid Pods to Data Spaces # wording in  proposal

## Overview

This repository contains the proof-of-concept implementation for D2.3 of the HARNESS project. The prototype demonstrates how machine-readable policies and compliance technologies can govern the flow of (personal) data from decentralised data vaults into data spaces (e.g CEDS - Common European Data Space), with automated compliance checking.

### What this does

A person stores their utility/energy consumption data in CSS. When a data space participant (e.g., a city energy authority) wants to access this data, the system:

1. **Receives the request** via a data space connector
2. **Evaluates ODRL policies** - checking purpose, time constraints, consent status, and other legal requirements
3. **Enforces the decision** - grants or blocks access based on policy evaluation
4. **Documents compliance** - records what was checked and decided, for audit and accountability

### Architecture

```
[TBD]
```

### Components (existing, to be integrated)

| Component | Description | Maintainer | Repo |
|-----------|-------------|------------|------|
| CSS | Community Solid Server for data storage | IDLab/SolidLab | [link TBD] |
| UMA Authorization Server | [TBD] | J. van Herwegen | [link TBD] |
| ODRL Policy Engine | Evaluates ODRL policies | Wout Slabbinck | [link TBD] |
| Authorizer | Enforces policy decisions | J. van Herwegen | [link TBD] |
| Policy Management App | UI for creating/managing ODRL policies | TBD | [link TBD] |

### New component

[TBD]


## Quick start

> ⚠️ Under development - instructions will be added as components become available.

[TODO]

```bash
# Clone this repo
git clone [repo-url]
cd d2.3-solid-dataspace-bridge

# Setup instructions TBD
```

## Project structure

```
.
├── README.md                 # This file
├── docs/                     # Deliverable documentation
│   ├── architecture.md       # Architecture description - TBD
│   ├── demo-scenario.md      # Demo scenario walkthrough - TBD
│   └── setup-guide.md        # How to run the prototype - TBD
├── requirements/             # Legal and technical requirements
│   ├── legal-requirements.md # Regulations, obligations, technical needs [DONE - TO BE REVIEWED]
│   └── technical-specs.md    # Feature list per component- TBD
├── src/                      # Source code for the bridge - TBD
├── demo/                     # Demo scenario data and scripts - TBD
└── references/               # Key papers and links - TBD
```

## Use case

**Utility data in a smart city context.** A citizen's electricity consumption data (collected from IoT smart meters) is stored in their Solid Pod. A city energy authority, participating in a smart cities data space, wants to access aggregated consumption data for urban planning. The below must be ensured:

- The purpose (urban planning) matches an allowed purpose in the citizen's ODRL policies
- Time constraints are respected
- Consent status is verified
- A compliance record is created

## Related work

- [ODRL Profile for Access Control (OAC)](https://w3id.org/oac)
- [Data Privacy Vocabulary (DPV)](https://w3id.org/dpv)
- [TBD]

## Team

| Name | Affiliation | Role |
|------|------------|------|
| Marlin | UGent-IDLab-imec | Lead, requirements, implementation |
| Beatriz Esteves | UGent-IDLab-imec | Supervisor-Reviewer, ODRL/Solid expertise |
| Meem Arafat Manab | UPM | [TBD]|
| J. van Herwegen | UGent-IDLab-imec | [TBD] |
| Wout Slabbinck| UGent-IDLab-imec| [TBD] |
| Victor Rodríguez-Doncel | UPM | Project coordinator, submission |
| Harshvardhan Pandit  | ADAPT-TCD | WP2 Coordinator-Reviewer |
| Celestine Lecat | UNIBO | [TBD] |
| Fabian Linde | UPM | [TBD] |
| Sheyla Leyva Sanchez | UPM | [TBD] |
| Victoria Wiegand | ADAPT-TCD | [TBD] |


## Licence

MIT License (publicly funded research)

## Acknowledgements

This work is part of the HARNESS project, funded under the EU Marie Skłodowska-Curie Actions.
