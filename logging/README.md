# Logging component

Stores events about Anna's data in a hash-chained log and shows them on Anna's page.


## Run it

From the repository root, after `npm install`:

```bash
node logging/server.mts
```

Open http://localhost:5100/ for Anna's page. Stop the server with Ctrl+C.

Options: `--port` (default 5100), `--file` (default `logging/data/events.jsonl`).

## Try it

In a second terminal, from the repository root, send the seven example events in order:

```bash
for f in logging/examples/[1-7]-*.json; do
  curl -s -X POST http://localhost:5100/events -H "content-type: application/json" -d @"$f"; echo; sleep 1
done
```


## Check that the log has not been changed

1. Open http://localhost:5100/verify. It answers `"ok": true`.
2. Open `logging/data/events.jsonl`, change any word in line 2, save.
3. Reload `/verify`. It answers `"ok": false, "brokenAt": 2`.

This shows the log is tamper-evident: an edit to an old entry is detected and located. Whoever
runs the server could still rewrite the whole file.
Run one server per log file.
Refused events go to a separate file next to the log (`events.rejected.jsonl`) with their own hash chain. They keep the errors and the body's hash and size.


## Endpoints

| Request              | Does                                                                              |
| -------------------- | --------------------------------------------------------------------------------- |
| `POST /events`       | adds one event; 201 with the stored record, or 400 with the errors                |
| `GET /events`        | all events, oldest first; filters `requester`, `resource`, `correlation`, `owner` |
| `GET /events.jsonld` | the same as JSON-LD                                                               |
| `GET /verify`        | checks the hash chain                                                             |
| `GET /`              | Anna's page                                                                       |
| `GET /rejected`      | refused events; filter `owner`                                                    |


