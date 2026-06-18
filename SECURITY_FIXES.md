# WhistleVault — Security Fixes (patch log)

Registro delle modifiche di sicurezza applicate. Verifica: `pytest` 84/84 · `pip-audit` 0 CVE · build frontend pubblico OK.

---

## H1 — ZK key derivation memory-hard (`frontend/public/src/zk.ts`)
**Prima:** `const prv = await sha256(sodium.from_string(receipt));`
**Dopo:** `sodium.crypto_pwhash(32, receipt, salt, OPSLIMIT_INTERACTIVE, MEMLIMIT_INTERACTIVE, ALG_ARGON2ID13)` con `salt = sha256(receipt+"wv-zk-v2")[:16]`.
**Perché:** la derivazione veloce permetteva il bruteforce offline del receipt (2^53) su DB/ciphertext rubati → de-anonimizzazione. Argon2id (64 MiB memory-hard) rende il costo per tentativo proibitivo; il salt deterministico evita round-trip al server. INTERACTIVE per compatibilità mobile del segnalante legittimo (una sola derivazione).

## H2 — Peppered receipt lookup (`backend/app/crypto/__init__.py`)
**Prima:** `return hashlib.sha256(receipt.encode()).hexdigest()`
**Dopo:** `hmac.new(get_settings().receipt_pepper.encode(), value.encode(), hashlib.sha256).hexdigest()`
**Perché:** un dump del DB non deve consentire di confermare i tentativi di bruteforce. Con HMAC e pepper server-side (mai in DB) il lookup è computazionalmente chiuso. Coerenza ZK: il client invia `wb_pub` e il **server** applica l'HMAC (`auth/router.py` receipt re-entry aggiornato; `frontend/.../zk.ts` `lookupFor`→`lookupValue` invia `pubB64`).
**Config:** `core/config.py` aggiunge `receipt_pepper` (+ `validate_for_production()` fail-fast, L7) richiamato in `app/main.py` lifespan.

## H3 — Niente IP nei log (`deploy/docker-compose.prod.yml`, `deploy/Caddyfile`)
**Prima:** `uvicorn app.main:app --host 0.0.0.0 --port 8000`
**Dopo:** `... --no-access-log`; Caddy access-log mantenuto disattivato (default) con commento esplicito.
**Perché:** evitare che dati di richiesta (con `X-Forwarded-For` → IP reale del segnalante) finiscano nei log. Difesa in profondità sull'anonimato.

## H4 — Tenant resolver multi-tenant (`backend/app/core/tenancy.py` nuovo + router)
**Prima:** `DEFAULT_TENANT_ID = 1` hardcoded in `reports/router.py`, `public/router.py`, `auth/router.py`.
**Dopo:** `resolve_tenant_id(request, db)` risolve il tenant dall'Host (`Tenant.public_domain`/`backoffice_domain`), con fallback al singolo tenant attivo. Dependency iniettata in submit/login/forgot/public.
**Schema:** `db/models.py` Tenant + colonne dominio (index); migrazione `migrations/versions/0002_tenant_domains.py` (idempotente).
**Perché:** su host condiviso multi-tenant il valore hardcoded avrebbe mescolato i tenant. Il resolver lo impedisce restando retrocompatibile con i deploy single-tenant.

## M1 — Rate-limiting endpoint pubblici/sessione (`backend/app/reports/router.py`)
**Dopo:** submit → `ratelimit.allow("report_submit:{tenant}", 30/min)`; comment → `wbcomment:{report_id}` 20/min; file → `wbfile:{report_id}` 20/5min.
**Perché:** prevenire DoS applicativo e spam, senza tracciare l'IP (chiavi non-PII).

## M2 — CSP per la SPA (`deploy/Caddyfile`)
**Dopo:** header `Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"` + HSTS preload, COOP, Permissions-Policy.
**Perché:** contenere l'impatto di eventuali XSS. `script-src 'self'` (Vite emette moduli esterni); `'unsafe-inline'` solo per attributi `style` runtime.

## M3 — Content-Disposition anti-injection (`backend/app/cases/router.py`)
**Prima:** `safe = name.replace('"', "")`
**Dopo:** helper `_content_disposition()` che rimuove CR/LF/control e usa RFC 5987 `filename*=UTF-8''…`.
**Perché:** un filename con `\r\n` (caricato dal segnalante) poteva iniettare header alla scarico del gestore.

## M4 — SMTP autenticato (`backend/app/core/config.py`, `notifications/mailer.py`)
**Dopo:** `smtp_username/password/starttls` in Settings; `mailer.send` passa `username/password` e `start_tls` in produzione.
**Perché:** i relay reali richiedono autenticazione su TLS; prima l'invio sarebbe fallito o non autenticato.

## M5 — 2FA obbligatorio admin (`backend/app/auth/router.py`)
**Dopo:** la risposta di login include `two_factor_setup_required = (role==admin and not two_factor_secret)`.
**Perché:** un admin senza 2FA è un vettore ad alto privilegio (blast radius via escrow). Il backoffice deve forzare l'enrolment quando il flag è true (gate UI da completare, pattern `ForcePasswordChange`).

## M6 — Download non eseguibile (`backend/app/cases/router.py`)
**Prima:** `media_type=content_type` (fidato dal client)
**Dopo:** `media_type="application/octet-stream"` (+ `nosniff`).
**Perché:** evitare MIME spoofing di allegati malevoli scaricati dal gestore.

## M7 — Validazione reference_id (`backend/app/files/storage.py`)
**Dopo:** `_resolve()` accetta solo `^(\d+/)?[0-9a-f]{32}$` prima del join → traversal impossibile.

## M8 — Lock dipendenze (`backend/requirements.lock`, `backend/Dockerfile`)
**Dopo:** `requirements.lock` (64 pkg pinnati) usato come `-c` constraints in `pip install`. `pip-audit` = 0 CVE.

## M9 — Signup (verificato sicuro) (`backend/app/public/router.py`)
Confermato: notifica **solo** a `settings.signup_notify_email` (owner), mai all'email fornita. Commento esplicito aggiunto.

## L2 — Audit cancellazioni (`backend/app/cases/service.py`, `backend/app/jobs/tasks.py`)
Eventi `redaction_delete` (utente) e `retention_delete` (sistema) aggiunti all'audit log.

## L4 — Namespacing file per tenant (`backend/app/files/storage.py`)
`store_encrypted(..., tenant_id=...)` → path `<tenant_id>/<uuid>`; call-site `reports/service.add_whistleblower_file` aggiornato.

## L6 — Entropia receipt (`backend/app/crypto/__init__.py`, `frontend/public/src/zk.ts`, i18n)
Receipt da 16 → **20 cifre** (2^66) su client e server; testo UI aggiornato.

## L7 — Guard di produzione (`backend/app/core/config.py`, `app/main.py`)
`validate_for_production()` rifiuta `receipt_pepper` placeholder/assente al boot.

## Test
- Adeguati: `test_crypto.py`, `test_reports.py`, `test_zk.py` (lookup = wb_pub, receipt 20).
- Nuovi: `tests/test_security_fixes.py` (H2 pepper, M3 CRLF, M7 traversal).
