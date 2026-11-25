# Log model

Marlin 2026-10-30

Files in this folder: `event.schema.json` (what an event must contain), `context.jsonld`
(what each field means in RDF), `server.mts` (stores and serves events), `ui.html` (Anna's page).

## What the log is for

Anna wants to know who read her readings and why (G5): control before delivery, accountability after (Weitzner et al., 2008).

## What is recorded

Every attempt gets one `correlation` value. All events of that attempt carry it, so the page can group them.

| Event             | Written when                             | Main fields                                         |
| ----------------- | ---------------------------------------- | --------------------------------------------------- |
| `PolicyCreated`   | Anna posts a policy to UMA               | `policy.id`, `policy.hash`                          |
| `PolicyRemoved`   | Anna deletes a policy                    | `policy.id`                                         |
| `AccessRequested` | a party asks the pod and gets a ticket   | `requester`, `action`, `purposes`, `claimTypes`     |
| `DecisionMade`    | UMA answers the token request            | `decision`, `httpStatus`, `rules`, `policy`, `note` |
| `DataAccessed`    | the pod answers the request with a token | `httpStatus`                                        |

Required in every event: `type`, `time`, `source`, `correlation`, `resource`, `owner`.

## Choices and motivation

| Choice                                                                | Reason                                                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Claim kinds, never claim content (`claimTypes: ["webid", "purpose"]`) | A credential can hold personal data about the requester. The log keeps what kind of proof was shown. Data minimisation, GDPR Art. 5(1)(c). |
| Policy hash in the event                                              | Shows which version of a policy was in force. A later edit gives a new hash.                                                               |
| Deciding rules in `DecisionMade`                                      | The run script replays the request in the same evaluator and writes the active rules, marked as a replay in `note`.                        |
| Mismatch flag                                                         | If the auth server and the replay disagree, `note` says MISMATCH and Anna's page shows a warning.                                          |
| PROV-O terms in `context.jsonld`                                      | `prov:atTime`, `prov:used`, `prov:wasAssociatedWith`: so audit queries can be shared.                                                     |
| Append-only file with a hash chain                                    | Each record holds the hash of the one before. Changing or deleting an old record breaks the chain, and `/verify` reports where.            |
| `source: "run-script"`                                                | CSS/the pod does not post events. The demo script writes them on its behalf.                                                              |   
| `informedBy`                                                          | Links an attempt to the earlier one it builds on: Anna's read of her forecast to EnerCo's read of her readings (`d23:informedBy`).        |


