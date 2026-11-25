# Catalogue

The data space's catalogue: lists Anna's and Bob's meter readings as DCAT datasets and
EnerCo's AI forecast as a DCAT data service, each with an ODRL offer, so a participant can
find them. The server builds each offer from the rules in `policies/` on every request. The
offers only inform.

## Run it

From the repository root:

```bash
node catalog/server.mts
```

The catalogue is at http://localhost:5200/catalog, as Turtle.

Options:

| Option             | Default               | Use                       |
| ------------------ | --------------------- | ------------------------- |
| `--port <n>`       | `5200`                | port to listen on         |
| `--file <path>`    | `catalog/catalog.ttl` | listings, in Turtle       |
| `--policies <dir>` | `policies/`           | policy files for offers   |

## Notes

- Each listed dataset or data service gets one offer with every rule in `policies/*.ttl`
  that targets it, except the owner's own access. Each rule points to its source with
  `prov:wasDerivedFrom`.
- Offer rules carry no `odrl:target`, since `odrl:hasPolicy` makes the dataset the target.
- The server reads the policy files. A rule changed only in UMA, such as a withdrawn
  consent, reaches the catalogue once the file changes too.
- The offer names each assignee, so anyone who reads the catalogue sees who Anna shares
  with. Showing each participant only its own offers needs the catalogue to know who asks
  (#15).
- Each household reads its forecast in the service's endpoint container, for example
  `.../forecast/anna`.
