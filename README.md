# D2.3 - Solid Pod <-> Data Space

**HARNESS: Deliverable D2.3 - Tools for Governance of Data and AI Services**  

Proof of Concept: Compliance-Based Data Flow from Solid Pods to Data Spaces <!-- wording taken from the proposal -->

## Overview

This repository contains the proof-of-concept implementation for D2.3 of the HARNESS project. The prototype demonstrates how machine-readable policies and compliance technologies can govern the flow of (personal) data from decentralised data vaults into data spaces (e.g CEDS - Common European Data Space), with automated compliance checking.

### What this does

A person stores their utility/energy consumption data in CSS. When a data space participant (e.g., a city energy authority) wants to access this data, the system:

1. **Receives the request** via a data space connector
2. **Evaluates ODRL policies** - purpose, time limits and requester status are checked; consent is represented by the owner's policy
3. **Enforces the decision** - grants or blocks access based on policy evaluation
4. **Documents compliance** - records what was checked and decided, for audit and accountability

### Architecture

```
[TBD]
```

### Components (existing, to be integrated)

| Component | Description | Maintainer | Repo |
|-----------|-------------|------------|------|
| CSS | Community Solid Server for data storage | IDLab | [link TBD] |
| UMA Authorization Server | [TBD] | IDLab | [link TBD] |
| ODRL Policy Engine | Evaluates ODRL policies | IDLab | [link TBD] |
| Policy Management App (LOAMA) | UI for creating/managing ODRL policies | IDLab | [link TBD] |

### New component

[TBD]


## Quick start

> ⚠️ Under development - instructions will be added as components become available.

[TODO]

```bash
# Clone this repo
git clone https://github.com/odrl-force/harness-d2.3-dataspace-bridge.git
cd harness-d2.3-dataspace-bridge

# Setup instructions TBD
```

## Project structure

```
.
├── README.md                  # This file
├── LICENSE                    # MIT licence text (add if not yet in the repo)
├── docs/                      # Deliverable documentation
│   ├── architecture.md        # Architecture description - DRAFT, awaiting review
│   ├── demo-scenario.md       # Demo scenario walkthrough - DRAFT, awaiting review
│   └── setup-guide.md         # How to run the prototype - TBD
├── requirements/              # Legal and technical requirements
│   ├── legal-requirements.md  # Regulations, obligations, technical needs - DRAFT, awaiting review
│   └── technical-specs.md     # Feature list per component - TBD
├── src/                       # Source code - TBD
├── demo/                      # Synthetic meter data - DONE; demo scripts - TBD
│   ├── README.md              # How the data was made, vocabulary, UCI attribution
│   ├── generate_meter_data.py # Builds the Turtle file (standard library only)
│   ├── meter-readings.ttl     # Generated monthly readings, loaded into the pod
│   └── data/                  # Raw UCI download, not committed (in .gitignore)
├── policies/                  # Mock ODRL policies (requested by Beatriz) - TBD
└── references/                # Key papers and links - TBD
```

## Use case

**Utility data in a smart city context.** A citizen's electricity consumption data (collected from IoT smart meters) is stored in their Solid Pod. A city energy authority, participating in a smart cities data space, wants to access consumption data for urban planning. The below must be ensured:

- The purpose (urban planning) matches an allowed purpose in the citizen's ODRL policies
- Time constraints are respected
- The requester's status is checked, and consent is represented by the owner's policy
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
