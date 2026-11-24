# Client

Plays the demo story against the running servers and posts each step to the logging server.

## Run

After `npm install`, start each server in its own terminal, from the repository root:

```bash
bash stack/start.sh
node catalog/server.mts
node logging/server.mts
```

Then:

```bash
node client/story.mts
```

It exits with 1 if an expected outcome fails. Anna's page is at http://localhost:5100/.

## Notes

- Restart `stack/start.sh` before each run. UMA accepts each policy once per start and keeps part of a deleted policy.
- UMA does not expose which rule decided a request. `replay.mts` re-evaluates each request with the same ODRL evaluator and settings as UMA and records the active rules. If its decision differs from UMA's, the event is marked MISMATCH. Matching decisions do not guarantee matching rules.
- Demo-only shortcuts: policies are posted with an `authorization: WebID` header, which UMA trusts; claims travel in an unsigned JWT; the client writes the events (`source: "run-script"`) on behalf of UMA and the pod.
