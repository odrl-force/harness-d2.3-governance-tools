# Demo Scenario: Smart City Electricity Data Sharing

**Status:** DRAFT  
**Last updated:** 2026-09-02  
**Last updated:** 2026-09-30  
**Created:** 2026-08-20  
**Author:** Marlin  
**Review:** Beatriz
## Scenario overview

~~### Open question for review~~

~~This scenario describes a citizen sharing data with a public authority
under DGA data altruism (requirements D1, D2). An alternative would be
a household sharing with commercial parties (contractor, energy advisor,
insurer) under Data Act Art. 5, which shows differentiated per-datapoint
policies more clearly but needs D1 and D2 rewritten.~~

BE: why not both? it doesn't mean more work, i.e., same data, and for the evaluation is nice to show it working for legal requirements from multiple regulations

~~Decision needed before architecture work starts.~~

Anna lives in Ghent. Her smart electricity meter data is stored as monthly readings in her Solid Pod. ~~The City of Ghent, participating in a smart cities data space (modelled after DS4SSCC), wants electricity consumption data to plan sustainable energy infrastructure.~~ The City of Ghent, participating in a smart cities data space (modelled after DS4SSCC), wants electricity consumption data to plan sustainable energy infrastructure. Anna shares it under DGA data altruism (requirements D1, D2).

## Actors

| Actor                | Role                  | System                                                                     |
|----------------------|-----------------------|----------------------------------------------------------------------------|
| Anna (citizen)       | Data subject / holder | Solid Pod + Policy Management App                                          |
| Ghent City           | Data user             | ~Data space connector (to be selected with Meem; FIWARE is one candidate)~ |
| Bridge               | Translation layer     | D2.3 prototype                                                             |
| Authorization Server | Policy enforcer       | UMA + ODRL engine                                                          |

## Demo walkthrough

### Step 1: Data in the CSS 
Anna's Solid Pod contains one RDF resource with twelve monthly electricity readings:
- Consumption per calendar month of 2025 (kWh)
- Device identifier (smart meter ID, invented)
- Start and end of each reading period

BE: what is 'invented' here? aren't they all invented?

*(Synthetic. The monthly shape is derived from the UCI Individual Household Electric Power Consumption dataset, CC BY 4.0. See demo/README.md.)*

### Step 2: Anna sets policies (LOAMA)
Using the Policy Management App, Anna creates an ODRL policy:
- **Permission:** Read access to electricity consumption data
- **Assignee:** Registered data altruism organisations
- **Purpose:** Urban energy planning (mapped to a DPV purpose term)
- **Constraint:** Data may only be accessed in aggregated form
  (NOT IMPLEMENTED in PoC. Aggregation means transforming the data. The evaluator returns a decision, so enforcing this needs a component that computes over the data before release. Out of scope unless we decide otherwise.)

BE: indeed, I would remove this, it would involve a lot of work and there is no time

- **Constraint:** Access valid until 2027-12-31
- **Duty:** Must provide Anna with a summary of how data was used (Recorded but not enforced in PoC.)

BE: the duty I think it is interesting to implement, I would put it in scope of the PoC. see my related comment on [legal-reqs](../requirements/legal-requirements.md) line 56

### Step 3: City requests access (Client)
The City of Ghent (Ghent City), through its data space connector, is given the resource identifier of Anna's data and initiates an access request:
- Purpose: "Urban energy infrastructure planning"
- Requester: City of Ghent (registered data altruism org)
- Data requested: Electricity consumption, all twelve monthly readings of 2025

### Step 4: Bridge translates and forwards
The bridge receives the connector's request, translates it into a UMA permission request, and forwards it to the authorization server.

### Step 5: Policy evaluation
The policy engine checks the request against Anna's policy:

| Check                                                           | Result                |
|-----------------------------------------------------------------|-----------------------|
| Purpose matches an allowed purpose                              | Pass                  |
| Requester is a registered altruism org (mechanism to be tested) | Pass                  |
| Current date is before 2027-12-31                               | Pass                  |
| ~Duty recorded (usage summary owed to Anna)~                    | ~Noted, not enforced~ |

Result: access granted.

BE: Requester is a registered altruism org (mechanism to be tested) -- we can use VCs for this (was already added in the policy engine for PACSOI)
BE: See previous comment on duty

### Step 6: Data flows
~The bridge returns an access token to the connector. The connector fetches the data from the Solid Pod.~ 
Open (see architecture.md): either the bridge returns an access token and the connector fetches the data from the Solid pod, or the bridge retrieves the data itself. A compliance record is created.

BE: think about an auditing component for the architecture

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

- ~Aggregation (see step 2)~ Aggregation. A real deployment would meet data minimisation (GDPR Art. 5(1)(c)) by releasing aggregated values only. The PoC limits itself to purpose and time.
- ~Duty enforcement (see step 2)~ Duty enforcement. The owner's policy could require a usage summary to be sent to Anna. The PoC neither records nor enforces it.
- Consent withdrawal mid-flow
- Anything requiring the connector to negotiate a contract