# Runbook operativo — Modello attuale: Opzione A (una VPS per cliente)

Comandi e passi per gestire le istanze. Modello scelto: **una VPS dedicata per cliente**,
sottodomini distinti sul **nostro** dominio-brand (`WB_BASE_DOMAIN`), TLS automatico.
Il cliente non configura nulla.

> Prerequisito una-tantum: registrare **un** dominio-brand (es. `segnalazioni-sicure.it`).
> I sottodomini sono illimitati e gratuiti.

## Onboarding di un nuovo cliente (~30 min)
1. **VPS** in UE con Docker installato. Annota l'IP.
2. **DNS** (nel pannello del nostro dominio-brand): due record **A** → IP della VPS
   ```
   acme            A   <IP_VPS>     →  acme.<brand>            (portale pubblico)
   acme-gestione   A   <IP_VPS>     →  acme-gestione.<brand>   (backoffice)
   ```
3. **Codice + env** sulla VPS:
   ```bash
   git clone <repo> && cd <repo>
   cp deploy/.env.prod.example deploy/.env.prod      # NON committare
   # imposta: domini del cliente, password DB, ADMIN_PASSWORD, SMTP
   ```
4. **Avvio** (dalla root del repo):
   ```bash
   docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
   ```
   Esegue da solo: migrazioni DB + seed + admin iniziale. Caddy ottiene il TLS automaticamente.
5. **Configura** dal backoffice (`https://acme-gestione.<brand>`): cambia password admin,
   crea canali, questionario (editor), gestori/custodi, e **branding** (logo/colori/testi →
   il portale assume l'aspetto del cliente).
6. **Compliance**: pubblica policy + informativa (`compliance/`), firma il DPA art. 28.

## Gestione quotidiana (per VPS)
```bash
docker compose -f deploy/docker-compose.prod.yml ps           # stato
docker compose -f deploy/docker-compose.prod.yml logs -f api  # log (no PII/IP)
curl -fsS https://acme.<brand>/api/health                     # salute
```
Audit degli accessi: dal backoffice → sezione **Audit log**.

## Backup (schedulare via cron)
```bash
docker compose -f deploy/docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gpg -c > backup_$(date +%F).sql.gpg
```
Conserva i backup cifrati fuori dalla VPS; prova periodicamente il ripristino.

## Aggiornamento alla nuova versione
```bash
git pull
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
# le migrazioni Alembic vengono applicate automaticamente all'avvio
```

## Secondo cliente
Ripeti l'onboarding su una **seconda VPS** con il suo `.env.prod`, i suoi sottodomini
(`beta.<brand>`, `beta-gestione.<brand>`) e i record DNS → IP della seconda VPS.
Dati fisicamente separati.

## Antivirus allegati (ClamAV) — rinviato
Non incluso ora (vedi [../SECURITY.md](../SECURITY.md)). Quando servirà: aggiungere un servizio
`clamav` e la scansione sullo upload. Comporta ~+1.5 GB RAM → dimensionare la VPS a ~4 GB.

## Quando crescono i clienti
Passare a **Opzione B** (1 VPS, Caddy frontale condiviso → `deploy/proxy/`) o al **multi-tenant**,
senza modifiche al codice dell'applicazione.
