# Logging component

Records what happens to Anna's data: which policies she added or removed, who asked for the
data and why, what was decided and by which rule and whether the data was read. Anna reads
the record on a web page. Each entry carries a fingerprint of the one before it so a changed
or deleted entry shows.

Status: reference version.


## Files

| File                                   | What it is                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| [log-model.md](log-model.md)           | the design: the five kinds of event, the choices and why, the limits         |
| [event.schema.json](event.schema.json) | the rules every event must follow; the server refuses events that break them |
| [context.jsonld](context.jsonld)       | maps each field to a standard term                                           |
| [server.mjs](server.mjs)               | the logging server                                                           |
| [ui.html](ui.html)                     | Anna's log page                                                              |
| [examples/](./examples/)               | one example event of each kind and one broken event                          |
| [data/](./data/)                       | created when the server runs; holds the log, not committed                   |

## Run it

From the repository root:

```bash
node logging/server.mjs
```

Open http://localhost:5100/ for Anna's page. Stop the server with Ctrl+C.

## Try it

In a second terminal, from the repository root, send the seven example events in order:

```bash
for f in logging/examples/[1-7]-*.json; do
  curl -s -X POST http://localhost:5100/events -H "content-type: application/json" -d @"$f"; echo; sleep 1
done
```

Reload the page: Anna adds a rule, the City asks, is allowed and reads, EnerCo asks for advertising and is refused and Anna removes her rule.

Send an event that breaks the rules and the server refuses it with a list of what is wrong:

```bash
curl -s -X POST http://localhost:5100/events -H "content-type: application/json" -d @logging/examples/bad-event.json
```

BE: question should we keep a log of events gone wrong?

## Check that the log has not been changed

1. Open http://localhost:5100/verify. It answers `"ok": true`.
2. Open `logging/data/events.jsonl`, change any word in line 2, save.
3. Reload `/verify`. It answers `"ok": false, "brokenAt": 2`.

This shows the log is tamper-evident: an edit to an old entry is detected and located. Whoever
runs the server could still rewrite the whole file.

BE: we should have policies on who can read and write logs. logs should not be updatable, it should only be possible to create new ones.
BE: http://localhost:5100/ now shows "Warning: entry 3 has been changed or removed after it was written."

BE: I would expect every entry to show a timestamp
BE: it's not 'everyone' right? it's Ana because it's her data/policies so she can see everything
BE: 'Your rules' could be 'Your actions' because Anna should also be able to see when data was added or altered -- not a problem for now, but with some time this might be a very long list so filters will be needed, e.g., to only see policy logs, or data logs, or even data update logs (e.g., to catch unwanted data updates)

## Endpoints

| Request              | Does                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `POST /events`       | adds one event (JSON); answers 201 with the stored record, or 400 with what is wrong          |
| `GET /events`        | all events, oldest first; filter with `?requester=`, `?resource=`, `?correlation=`, `?owner=` |
| `GET /events.jsonld` | the same as linked data                                                                       |
| `GET /verify`        | checks the chain of fingerprints                                                              |
| `GET /`              | Anna's page                                                                                   |
