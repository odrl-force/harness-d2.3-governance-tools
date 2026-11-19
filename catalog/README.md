# Catalogue

The data space's catalogue: lists Anna's meter readings as a DCAT dataset with an ODRL
offer, so a participant can find the data. The offer only informs.

## Run it

From the repository root:

```bash
node catalog/server.mts
```

The catalogue is at http://localhost:5200/catalog, as Turtle.

Options:

| Option          | Default               | Use                       |
| --------------- | --------------------- | ------------------------- |
| `--port <n>`    | `5200`                | port to listen on         |
| `--file <path>` | `catalog/catalog.ttl` | Turtle file to serve      |

