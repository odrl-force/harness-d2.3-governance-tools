# Demo Scenario: Smart City Electricity Data Sharing

**Status:** DRAFT  
**Last updated:** 2026-09-02  
**Created:** 2026-08-20  
**Author:** Marlin  
**Review:** Beatriz
## Scenario overview

### Open question for review

This scenario describes a citizen sharing data with a public authority
under DGA data altruism (requirements D1, D2). An alternative would be
a household sharing with commercial parties (contractor, energy advisor,
insurer) under Data Act Art. 5, which shows differentiated per-datapoint
policies more clearly but needs D1 and D2 rewritten.

Decision needed before architecture work starts.

Anna lives in Ghent. Her smart electricity meter records her hourly consumption and stores the data in her Solid Pod. The City of Ghent, participating in a smart cities data space (modelled after DS4SSCC), wants aggregated electricity consumption data to plan sustainable energy infrastructure.

## Actors

| Actor | Role | System |
|-------|------|--------|
| Anna (citizen) | Data owner / provider | Solid Pod + Policy Management App |
| Ghent City | Data consumer | Data Space Connector (FIWARE) |
| Bridge | Translation layer | D2.3 prototype |
| Authorization Server | Policy enforcer | UMA + ODRL engine |

## Demo walkthrough

### Step 1: Data in the CSS 
Anna's Solid Pod contains RDF-structured electricity consumption data:
- Hourly readings (kWh)
- Device identifier (smart meter ID)
- Timestamps

*(This will be synthetic/generated data for the demo.)*

### Step 2: Anna sets policies (LOAMA)
Using the Policy Management App, Anna creates an ODRL policy:
- **Permission:** Read access to electricity consumption data
- **Assignee:** Registered data altruism organisations
- **Purpose:** Urban energy planning (mapped to a DPV purpose term)
- **Constraint:** Data may only be accessed in aggregated form
  (NOT IMPLEMENTED in PoC. Aggregation means transforming the data.. The evaluator returns a decision, so enforcing this needs a component that computes over the data before release. Out of scope unless we decide otherwise.)
- **Constraint:** Access valid until 2027-12-31
- **Duty:** Must provide Anna with a summary of how data was used (Recorded but not enforced in PoC.)

### Step 3: City requests access (Client)
The City of Ghent (Ghent City), through its data space connector, discovers Anna's data in the data space catalogue and initiates an access request:
- Purpose: "Urban energy infrastructure planning"
- Requester: City of Ghent (registered data altruism org)
- Data requested: Electricity consumption, last 12 months

### Step 4: Bridge translates and forwards
The bridge receives the connector's request, translates it into a UMA permission request, and forwards it to the authorization server.

### Step 5: Policy evaluation
The policy engine checks the request against Anna's policy:

| Check | Result |
|-------|--------|
| Purpose matches an allowed purpose | Pass |
| Requester is a registered altruism org | Pass |
| Current date is before 2027-12-31 | Pass |
| Duty recorded (usage summary owed to Anna) | Noted, not enforced |

Result: access granted.

### Step 6: Data flows
The bridge returns an access token to the connector. The connector fetches the data from the Solid Pod. A compliance record is created.

### Step 7: Demonstrate denial
Show a second request that gets denied:
- Purpose: "Targeted advertising for energy products"
- Result: **Access denied** - purpose does not match allowed purposes

## What this demonstrates

The point of the demo is that the decision in step 5 happens
automatically. Today, the equivalent decision is made by a person
reading a consent form and remembering what was agreed. Here it is
made by the policy engine against a machine-readable policy that
Anna wrote herself.

Step 7 exists to show that the policy actually constrains something.
A demo where everything is permitted proves nothing.

## Demo data

Synthetic data, generated for this demo, stored in `demo/`.
No real or personal data. Small enough to run from a clone
of this repository.

## Not covered

- Aggregation (see step 2)
- Duty enforcement (see step 2)
- Consent withdrawal mid-flow
- Anything requiring the connector to negotiate a contract