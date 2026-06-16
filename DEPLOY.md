# Guida al Deploy

Modello consigliato: **SaaS con un'istanza e un database isolati per ciascun cliente**, dietro
un reverse proxy con TLS automatico (Caddy). Il backend non è mai esposto direttamente.

## Architettura (per cliente)
```
            https://segnalazioni.cliente.it   https://gestione.cliente.it
                          │                              │
                          ▼                              ▼
                    ┌──────────────── Caddy (TLS) ────────────────┐
                    │  /srv/public (SPA)        /srv/backoffice    │
                    │  /api/* ───────────────► api:8000            │
                    └──────────────────────────────────────────────┘
                                         │
                                   api (FastAPI)
                                         │
                                   db (PostgreSQL, volume isolato)
```

## Prerequisiti
- Server Linux in **UE** con Docker + Docker Compose.
- Due record DNS (portale pubblico e backoffice) che puntano al server.
- Porte 80/443 aperte.

## Passi
1. Clonare il repository **del prodotto** (senza `reference/`, escluso da `.gitignore`).
2. Copiare e compilare l'ambiente:
   ```bash
   cp deploy/.env.prod.example deploy/.env.prod   # NON committare
   # impostare password DB, domini, ADMIN_PASSWORD, SMTP
   ```
3. Avviare lo stack (dalla root del repo, così il build include backend/ e frontend/):
   ```bash
   docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
   ```
   All'avvio l'API esegue automaticamente `alembic upgrade head`, il seed (tenant, stati,
   questionario di default) e il provisioning dell'**admin iniziale** (`ADMIN_PASSWORD`).
4. Accedere al backoffice (`https://gestione.cliente.it`) come `admin` e **cambiare la password**.

## Secondo cliente
Replicare in una directory separata con **proprio** `.env.prod`, domini, volumi e stack: i dati
restano fisicamente isolati. (In alternativa il codice è multi-tenant-ready: si può servire più
clienti da un'unica istanza filtrando per `tenant_id`, ma l'isolamento per istanza è preferibile
per l'audit.)

## Hardening di produzione (vedi [SECURITY.md](SECURITY.md))
- `WB_ENVIRONMENT=production` e `WB_ARGON2_LEVEL=moderate` (già nel compose).
- Limitare l'accesso al **backoffice** (VPN/SSO o IP allow-list nel `Caddyfile`).
- **Backup cifrati** del volume `db_data` + test di ripristino periodico.
- Conservare i segreti fuori dal repository (`.env.prod` è in `.gitignore`).

## Backup database (esempio)
```bash
docker compose -f deploy/docker-compose.prod.yml exec db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gpg -c > backup_$(date +%F).sql.gpg
```

## Note legali
Compilare e far validare i documenti in [compliance/](compliance/) (policy, informativa, DPIA,
DPA art. 28) prima del go-live. Firmare il DPA con ciascun cliente nel modello SaaS.
