# Runbook — Ambienti demo multi-tenant (aggiungere un lotto di istanze)

Procedura **collaudata** per aggiungere N nuove istanze demo isolate (ognuna: portale di
segnalazione + backoffice + credenziali proprie) **senza perdere quelle esistenti**. Branch
`demo-sales` (usa-e-getta). Lotto 1 = istanze 1-10; lotto 2 = 11-20; ecc. — la procedura è la
stessa, cambia solo l'intervallo numerico.

## Architettura in breve
- **Un solo server** (Hetzner, IP `46.224.154.104`, hostname `openclaw-vps`), **un solo processo
  api + un solo Postgres** servono *tutti* i tenant (multi-tenant **logico**, non un container per
  cliente). Aggiungere tenant non moltiplica le risorse.
- Stack: `/opt/whistlevault`, compose **project name `wvdemo`** (OBBLIGATORIO passarlo: `-p wvdemo`),
  file `deploy/docker-compose.demo.yml` + `deploy/.env.demo` (non in git: contiene i segreti).
- Tenant risolto dall'**Host header**. Host: `wbappdemo{n}.wbapp.dedyn.io` (gestione) e
  `wbappdemo{n}-segnalazioni.wbapp.dedyn.io` (pubblico). Username `admin{n}`, brand `WBApp Demo {n}`.
- **DNS deSEC**: wildcard **CNAME** `*.wbapp.dedyn.io → 46.224.154.104.sslip.io` → ogni nuovo host
  risolve da solo (nessuna modifica DNS per nuovi numeri). Caddy ottiene HTTPS per host (HTTP-01).
- `WB_ARGON2_LEVEL=interactive` (login concorrenti leggeri). `uvicorn` = **1 worker** (sessioni e
  rate-limit in-memory per processo): non aumentarlo.

## Trappole già individuate (NON ripeterle)
1. **Project name**: usare SEMPRE `docker compose -p wvdemo ...`. Senza `-p`, compose usa il nome
   della cartella (`deploy`) e crea uno **stack parallelo con volume vuoto** (collisione porta 80).
2. **2FA di default ON**: il codice attuale forza la 2FA. Per la demo frictionless va messo
   `enforce_2fa=false`: già fatto in `provision_demo.py` per i nuovi tenant; per gli **esistenti**
   serve il backfill SQL (sotto). Senza, al redeploy le istanze già consegnate si bloccano al setup 2FA.
3. **Harness `stress_demo.py`**: usa `admin{n}` (non "admin") e `WB_STRESS_START` per colpire SOLO il
   nuovo lotto (così non inquina i dati delle istanze in uso). Già corretto.
4. **Caddyfile è BAKED** nell'immagine web (`Dockerfile.web` COPY): aggiungere host richiede
   `up -d --build` (rebuild web), non un reload. I cert esistenti restano in `caddy_data`.
5. **`/data/demo-credentials.txt` viene SOVRASCRITTO** dal provisioning con i soli nuovi tenant →
   **fare backup** del file esistente prima.
6. **Niente wipe del volume** (distruggerebbe le istanze in uso): la pulizia post-test è **selettiva**
   per label del nuovo lotto.
7. **ISP (TIM)** può filtrare i domini dedyn.io su alcune reti: la verifica **autoritativa** è
   `scripts/verify_demo.py` (lato server, Host header, indipendente dall'ISP).

## SSH
`ssh -i <chiave> root@46.224.154.104` (la chiave è autorizzata dall'utente; non committarla).
Helper psql usato sotto:
```bash
cd /opt/whistlevault; set -a; . deploy/.env.demo; set +a
PSQL="docker exec wvdemo-db-1 psql -U $POSTGRES_USER -d $POSTGRES_DB"
```

---

## Procedura (esempio: aggiungere il lotto 11-20 → COUNT=20)

### 0) Pre-check + backup (NON distruttivo)
```bash
docker ps --format '{{.Names}}\t{{.Status}}'                 # wvdemo-{db,api,web} up
$PSQL -t -A -F'|' -c "SELECT t.label, t.active, (SELECT count(*) FROM report r WHERE r.tenant_id=t.id) \
  FROM tenant t WHERE t.backoffice_domain<>'' ORDER BY t.id;"   # quali tenant e quanti report REALI
free -h; df -h /
mkdir -p /opt/whistlevault/backups
docker exec wvdemo-db-1 pg_dump -U $POSTGRES_USER -d $POSTGRES_DB > backups/demo-db-$(date +%F-%H%M%S).sql
docker exec wvdemo-api-1 cat /data/demo-credentials.txt > backups/demo-credentials-prev.bak
```

### 1) Codice aggiornato sul server
```bash
git fetch origin demo-sales:refs/remotes/origin/demo-sales
git merge --ff-only origin/demo-sales      # porta provision/stress aggiornati (+ eventuali feature)
```
(Le modifiche a `provision_demo.py`/`stress_demo.py` vanno committate su `demo-sales` PRIMA.)

### 2) DNS (solo verifica)
```bash
for h in wbappdemo11 wbappdemo20-segnalazioni; do getent hosts $h.wbapp.dedyn.io; done  # → 46.224.154.104
```

### 3) Caddy per il nuovo totale + redeploy
```bash
bash deploy/gen-demo-caddyfile.sh wbapp.dedyn.io 20 > deploy/Caddyfile
sed -i 's/^DEMO_COUNT=.*/DEMO_COUNT=20/' deploy/.env.demo
docker compose -p wvdemo -f deploy/docker-compose.demo.yml --env-file deploy/.env.demo build
docker compose -p wvdemo -f deploy/docker-compose.demo.yml --env-file deploy/.env.demo up -d
# attendi qualche secondo; health:
docker exec wvdemo-api-1 python -c "import urllib.request;print(urllib.request.urlopen('http://localhost:8000/api/health').read())"
```

### 4) Provisioning del nuovo lotto + frictionless su tutte
```bash
docker compose -p wvdemo -f deploy/docker-compose.demo.yml --env-file deploy/.env.demo \
  exec -T -e WB_DEMO_COUNT=20 -e WB_DEMO_BASE_DOMAIN=wbapp.dedyn.io api \
  python scripts/provision_demo.py            # idempotente: salta gli esistenti, crea i nuovi
# backfill: nessun tenant deve restare 2FA-forzato
$PSQL -c "UPDATE tenant SET settings = jsonb_set(coalesce(settings,'{}'::jsonb),'{enforce_2fa}','false',true) \
  WHERE backoffice_domain IS NOT NULL;"
# HTTPS dei nuovi host (Caddy emette i cert al primo accesso):
for h in wbappdemo11-segnalazioni wbappdemo20; do curl -s -o /dev/null -w "$h %{http_code}\n" https://$h.wbapp.dedyn.io/api/health; done
```
Le credenziali dei NUOVI sono in `/data/demo-credentials.txt` (e nello stdout del comando).

### 5) Verifica per-istanza (autoritativa, indipendente dall'ISP)
```bash
docker cp backups/demo-credentials-prev.bak wvdemo-api-1:/data/creds_prev.bak   # per il login storm su TUTTE
docker exec -e WB_DEMO_COUNT=20 -e WB_STRESS_START=11 wvdemo-api-1 python scripts/verify_demo.py
# atteso: ogni Demo n -> arrivo OK, decifratura OK, frictionless OK; isolamento cross-tenant tutto "bloccato OK"
# at-rest: i marker NON devono comparire in chiaro:
$PSQL -t -A -c "SELECT count(*) FROM report_answer WHERE answers::text LIKE '%VERIFY-DEMO%';"   # = 0
```
(Opzionale dev-tools browser: flusso UI completo su 1 istanza + login reale sulle altre — il bundle
servito è identico su tutte, quindi 1 flusso profondo + login per istanza basta.)

### 6) Stress test (caso peggiore) — submit solo sul nuovo lotto, login storm su tutte
```bash
docker exec wvdemo-api-1 sh -lc 'cat /data/creds_prev.bak /data/demo-credentials.txt > /data/creds_all.bak'
docker exec -e WB_DEMO_COUNT=20 -e WB_STRESS_START=11 -e WB_DEMO_CRED_FILE=/data/creds_all.bak \
  wvdemo-api-1 python scripts/stress_demo.py
# atteso: SPREAD 0×5xx; BURST 429 ma 0×5xx; LOGIN storm 20 senza OOM. Monitor: docker stats / free -h
```

### 7) Pulizia → pristine SOLO sul nuovo lotto (mai toccare gli esistenti)
```bash
LAB="'WBApp Demo 11','WBApp Demo 12','WBApp Demo 13','WBApp Demo 14','WBApp Demo 15','WBApp Demo 16','WBApp Demo 17','WBApp Demo 18','WBApp Demo 19','WBApp Demo 20'"
$PSQL -t -A -c "SELECT count(*) FROM tenant WHERE label IN ($LAB);"   # GUARD: deve essere 10
$PSQL -c "DELETE FROM report WHERE tenant_id IN (SELECT id FROM tenant WHERE label IN ($LAB));"
$PSQL -t -A -F'|' -c "SELECT t.label, count(r.id) FROM tenant t LEFT JOIN report r ON r.tenant_id=t.id \
  WHERE t.backoffice_domain<>'' GROUP BY t.label ORDER BY length(t.label), t.label;"  # 11-20 = 0; gli altri invariati
docker exec wvdemo-api-1 sh -lc 'rm -f /data/creds_prev.bak /data/creds_all.bak'
```

### 8) Documento credenziali (solo il nuovo lotto)
- Scaricare `/data/demo-credentials.txt` (i nuovi) e generare il `.docx` con `python-docx`, **stessa
  tabella** del precedente: colonne `# | Link segnalazioni | Link gestione | Utente | Password`,
  una riga per istanza. (Snippet usato: legge lo stile tabella dal docx precedente e ricrea le righe.)

### 9) Rollback
- Solo nuovo lotto: `UPDATE tenant SET active=false WHERE label IN (...);` + rigenerare Caddyfile per il
  numero precedente + `up -d --build`. Gli esistenti restano intatti.
- Totale: ripristino da `backups/demo-db-*.sql`.

## Criteri di consegna (PASS)
Per ogni nuova istanza: segnalazione arriva all'admin · decifratura ok · 0 leak cross-tenant ·
ciphertext a riposo · 0 IP nei log · login frictionless · nuove feature ok · tour · 0 errori console ·
nessun "Whistlevault". Stress: 0×5xx · rate-limit regge · login storm senza OOM. **Istanze esistenti
invariate** (conteggi report == pre-check). Nuovo lotto a **0 report** (pristine). Documento consegnato.
