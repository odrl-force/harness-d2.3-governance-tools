# Policies

Anna's rules for her meter readings, in ODRL 2.2 with DPV 2.3 purposes. These are the files
the authorisation server reads to decide each request. Each file starts with a comment
saying what it does and which requirement it serves (codes from
[legal-requirements](../requirements/legal-requirements.md)).

| File                                                             | In plain words                                                                           | Flow                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------- |
| [p0-anna-owner.ttl](p0-anna-owner.ttl)                           | Anna may store, change and read her own data                                             | housekeeping                |
| [p1-altruism-city.ttl](p1-altruism-city.ttl)                     | the City of Ghent may read the readings to improve public services, until 1 January 2028 | flow 1, data altruism (DGA) |
| [p2-commercial-enerco.ttl](p2-commercial-enerco.ttl)             | EnerCo may read them to advise Anna on her energy use, until 1 July 2027                 | flow 2, Data Act            |
| [p3-no-marketing.ttl](p3-no-marketing.ttl)                       | nobody may read them for marketing or advertising                                        | the refusal                 |
| [shared/parties-and-assets.ttl](./shared/parties-and-assets.ttl) | type statements for the parties and data the policies name                               | used when validating        |


## Checked

Validated with the ODRL validator 0.1.0: all valid, no violations. Tested against IDLab's
ODRL evaluator 0.6.0 and live against IDLab's UMA server (commit 4c4134f): all requirement
cases pass. The tests and the checking tools come in the next pull request.

## Open

- **P1, requirement D1:** whether the City is presented as a recognised data altruism
  organisation. Registration under DGA Art. 19 is voluntary, and data altruism does not
  require it.
- **P2:** EnerCo is a placeholder for the flow-2 requester.
- **Legal basis (G1):** recorded in comments only; IDLab's two decision engines disagree on it.
