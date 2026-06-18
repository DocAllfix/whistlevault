# WhistleVault — Hardening Guide (produzione `whistlevault.it`)

Guida operativa per il deploy in produzione. Ordinata per priorità. Le voci marcate ✅ sono già nel codice/config; le ☐ sono passi operativi da eseguire al deploy.

---

## 1. Segreti (priorità massima)
- ☐ **`RECEIPT_PEPPER`** unico e casuale **per ogni tenant**: `openssl rand -hex 32`. L'app **non parte** in produzione con un placeholder (`validate_for_production`). Mai committarlo, mai metterlo in DB.
- ☐ `ADMIN_PASSWORD`, `POSTGRES_PASSWORD`: random forti, diversi per tenant. Rimuovere i `change-me-*`.
- ☐ Gestire `.env.prod` come **secret** (permessi `600`, fuori dal repo; idealmente Docker secret / vault).

## 2. Caddy (reverse proxy + TLS) ✅/☐
- ✅ HSTS `max-age=63072000; includeSubDomains; preload`, `nosniff`, `X-Frame-Options DENY`, `Referrer-Policy no-referrer`, COOP, Permissions-Policy, **CSP** per la SPA.
- ✅ **Access-log disattivato** (default Caddy) → l'IP del segnalante non viene scritto. Se per debug attivi `log`, **elimina** il campo IP:
  ```
  log { format filter { fields { request>remote_ip delete request>headers>X-Forwarded-For delete } } }
  ```
- ☐ **Backoffice**: restringere l'esposizione con allow-list IP/VPN (blocco `@blocked not remote_ip …` già predisposto e commentato nel `Caddyfile`) o SSO.
- ☐ Verifica CSP contro la build reale: `curl -I https://acme.whistlevault.it` e controlla in console che non vi siano violazioni (se Vite emettesse uno script inline, aggiungere l'hash invece di allargare a `'unsafe-inline'`).

## 3. SMTP ✅/☐
- ✅ `mailer` autentica (`SMTP_USERNAME/PASSWORD`) e usa STARTTLS in produzione.
- ☐ Configurare un relay con SPF/DKIM/DMARC sul dominio mittente. Le email restano **content-free** (mai contenuto della segnalazione).

## 4. Docker / runtime ✅/☐
- ✅ Backend **non-root** (`appuser`); DB e API **non esposti** (solo Caddy pubblica 80/443).
- ✅ uvicorn `--no-access-log`.
- ✅ Dipendenze pinnate (`requirements.lock`) + `pip-audit` (0 CVE). ☐ Ri-eseguire `pip-audit` ad ogni release.
- ☐ Volumi (`db_data`, `files_data`) su storage cifrato (LUKS/disk encryption del provider); permessi non world-readable (named volume Docker → root-only sul host).
- ☐ Aggiornare regolarmente le immagini base (`python:3.12-slim`, `postgres:16-alpine`, `caddy:2-alpine`).
- ☐ Limiti risorse per container (memoria/CPU) per contenere il blast-radius di un DoS.

## 5. DNS / TLS / wildcard ☐
- ☐ **Record CAA** su `whistlevault.it` (es. `0 issue "letsencrypt.org"`) per limitare le CA autorizzate.
- ☐ **HSTS preload**: dopo verifica, sottomettere `whistlevault.it` a hstspreload.org (il dominio e i sottodomini devono essere sempre HTTPS).
- ☐ **Wildcard** `*.whistlevault.it` → certificato wildcard via DNS-01, **oppure** per-host via HTTP-01 (on-demand). Preferire per-host se non si usa l'API DNS.
- ☐ **Subdomain takeover (L5/F):** alla dismissione di un cliente, **rimuovere** subito il record DNS del suo sottodominio; monitorare i sottodomini attivi vs tenant attivi; non lasciare record che puntano a IP/risorse non più controllate.

## 6. Multi-tenant (Opzione B — host condiviso) ☐
- ✅ Tenant risolto dall'Host (`core/tenancy.py`); file namespaced per tenant (L4).
- ☐ **Provisioning**: impostare `Tenant.public_domain` e `Tenant.backoffice_domain` per ogni cliente (il resolver li usa; senza, vale il fallback single-tenant).
- ☐ (Difesa extra) valutare l'inserimento del dominio-istanze nella **Public Suffix List** per isolare i cookie tra tenant a livello browser; oppure offrire al cliente il **proprio dominio** (isolamento massimo).

## 7. Account / accessi ☐
- ☐ **2FA admin obbligatorio**: completare il *gate UI* nel backoffice sul flag `two_factor_setup_required` (pattern `ForcePasswordChange`). Forzare 2FA a tutti i gestori dei clienti sensibili.
- ☐ Rotazione periodica delle password gestori; sessioni TTL 120 min (già) + idle-timeout lato UI.

## 8. Backup ☐ (GDPR art.32)
- ☐ Backup periodici di `db_data` e `files_data`, **cifrati** (i blob nel DB/FS sono già cifrati app-level; cifrare comunque il backup a riposo) e con retention allineata alla policy.
- ☐ Test di restore periodico. Conservare i backup in regione **UE/UK**.

## 9. Monitoring / logging — cosa loggare e cosa MAI
**MAI loggare:** IP/User-Agent del segnalante, contenuto delle segnalazioni, receipt, chiavi, identità, `X-Forwarded-For`.
**Si può loggare (senza PII):** errori applicativi (senza payload), eventi di sistema, metriche aggregate, audit delle azioni dei gestori (già content-free).
- ☐ Se si usa un aggregatore log, filtrare a monte i campi IP. uvicorn access-log resta **off**.
- ☐ Allerta su: fallimenti ripetuti di login (rate-limit), errori SMTP, spazio disco (`files_data`).

## 10. Checklist di go-live (sintesi)
1. ☐ Genera e imposta `RECEIPT_PEPPER`, password forti (no `change-me-*`).
2. ☐ DNS: A/wildcard, CAA; HTTPS verde su entrambi i sottodomini.
3. ☐ `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build`; migrazioni applicate.
4. ☐ `curl -I` verifica HSTS+CSP; console SPA senza violazioni CSP.
5. ☐ Login admin → 2FA enrolment forzato; cambio password iniziale.
6. ☐ `pip-audit` pulito; backup + restore testati.
7. ☐ (Opzione B) domini per tenant impostati; allow-list/VPN sul backoffice.
