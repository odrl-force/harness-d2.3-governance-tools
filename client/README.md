# Client

Plays the demo story against the running servers and posts each step to the logging server.

## Run

After `npm install`, from the repository root:

```bash
npm start
```

Then, in a second terminal:

```bash
npm run story
```

It exits with 1 if an expected outcome fails. Anna's page is at http://localhost:5100/.

## Notes

- Restart `npm start` before each run. UMA accepts each policy once per start and keeps part of a deleted policy.
- UMA does not expose which rule decided a request. `replay.mts` re-evaluates each request with the same ODRL evaluator and settings as UMA and records the active rules. If its decision differs from UMA's, the event is marked MISMATCH. Matching decisions do not guarantee matching rules.
- Step 8 withdraws Anna's consent to the City by deleting P1 from UMA and logs a `PolicyRemoved` event. New requests are refused at once, but an access token UMA issued before the withdrawal stays valid until it expires (30 minutes): UMA does not revoke tokens when a policy is removed.
- Demo-only shortcuts: policies are posted with an `authorization: WebID` header, which UMA trusts; claims travel in an unsigned JWT; the client writes the events (`source: "run-script"`) on behalf of UMA and the pod.
