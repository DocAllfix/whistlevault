# Front proxy — FUTURE (Option B consolidation)

These files are **not used in the current model (Option A: one VPS per client)**.

They are kept ready for when multiple clients are consolidated onto a **single VPS**
(Option B): a shared Caddy that terminates TLS for every client subdomain and routes
by hostname to each client's isolated `*_api` backend container.

- `Caddyfile` — global config that imports one routing file per client.
- `clients/_TEMPLATE.caddy` — copy to `<client>.caddy`, replace `__CLIENT__`/`__BASE__`,
  then `caddy reload`.

For the current deployment use [../docker-compose.prod.yml](../docker-compose.prod.yml)
(one isolated stack per VPS) — see [../../DEPLOY.md](../../DEPLOY.md) and
[../RUNBOOK.md](../RUNBOOK.md).
