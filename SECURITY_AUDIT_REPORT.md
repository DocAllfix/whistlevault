# WhistleVault — Security Audit Report

**Ambito:** intera codebase (`backend/`, `frontend/`, `deploy/`, `db/`, `migrations/`, `tests/`)
**Finalità:** deploy in **produzione** per clienti reali su `whistlevault.it`, multi-tenant a sottodomini
**Destinatari:** CTO, DPO
**Metodo:** revisione statica del codice riga per riga + analisi crittografica + modellazione delle minacce (8 livelli) + stress test sistemici (scenari A–F). Tutte le fix High/Medium/Low sono state **applicate nel codice** (vedi `SECURITY_FIXES.md`).
**Esito verifica:** `pytest` 84/84 verde · `pip-audit` 0 vulnerabilità note · build frontend pubblico verde.

---

## 1. Executive Summary — semaforo per area

| Area | Pre-audit | Post-fix | Note |
|------|-----------|----------|------|
| **Crittografia** | 🟡 | 🟢 | Sealed-box/Argon2id corretti; risolti ZK-KDF (H1) e lookup peppato (H2). Nonce file random per chunk già corretto. |
| **Anonimato / Privacy** | 🟡 | 🟢 | Nessuna colonna IP/UA; access-log disattivati (H3); audit content-free. |
| **Autenticazione / Sessioni** | 🟡 | 🟢 | Cookie httponly+secure+samesite=strict; 2FA admin reso obbligatorio (M5, segnale backend + gate UI). |
| **RBAC / Multi-tenant** | 🟠 | 🟢 | Accesso crypto-enforced (già robusto); risolto `DEFAULT_TENANT_ID` hardcoded con tenant resolver (H4). |
| **Superficie HTTP/API** | 🟠 | 🟢 | Rate-limit su submit/comment/file (M1); Content-Disposition (M3); download octet-stream (M6); reference_id validato (M7). |
| **Deploy / Infrastruttura** | 🔴 | 🟢 | CSP per la SPA (M2); access-log off (H3); SMTP autenticato (M4); lock dipendenze (M8). |
| **Compliance (D.lgs 24/2023 + GDPR)** | 🟡 | 🟢 | Vedi `COMPLIANCE_CHECKLIST.md` (tutti PASS post-fix; 1 PARTIAL UI). |
| **Supply chain** | 🟡 | 🟢 | Lock file pinnato + `pip-audit` (0 CVE). |

**Conclusione:** dopo le fix la piattaforma è **idonea al deploy in produzione**. Nessun percorso di attacco identificato resta privo di fix o mitigazione documentata. Un solo elemento è **PARTIAL**: il *gate UI* del 2FA obbligatorio admin (il segnale è applicato lato server; la schermata di enrolment forzato nel backoffice replica il pattern `ForcePasswordChange` ed è l'unico residuo da completare lato frontend).

---

## 2. Tabella vulnerabilità

| ID | Sev (CVSS3) | Componente / file:riga | Vettore d'attacco | Impatto normativo | Fix |
|----|-------------|------------------------|-------------------|-------------------|-----|
| **H1** | High (7.4) | `frontend/public/src/zk.ts:39` `wbKeypair` | Con DB+ciphertext rubati, derivazione `sha256(receipt)` (fast) → bruteforce offline dello spazio 2^53 → **de-anonimizzazione e lettura del report**. Modello di minaccia diretto: il datore di lavoro. | D.lgs 24/2023 art.12; GDPR art.32 | KDF **Argon2id** (`crypto_pwhash`, 64 MiB memory-hard) + entropia receipt 2^66 → keyspace computazionalmente chiuso. |
| **H2** | High (7.1) | `backend/app/crypto/__init__.py:127` `hash_receipt` | Lookup `sha256(x)` senza pepper → con DB rubato l'attaccante **conferma** ogni tentativo di bruteforce a costo nullo (rainbow/precompute). | D.lgs 24/2023 art.12; GDPR art.32 | **HMAC-SHA256(pepper, x)**; pepper server-side (`WB_RECEIPT_PEPPER`), mai in DB; obbligatorio in prod (fail-fast). |
| **H3** | High (5.9) | `deploy/docker-compose.prod.yml:38`, `deploy/Caddyfile` | Access-log (uvicorn/Caddy) potevano registrare dati di richiesta che, via `X-Forwarded-For`, includono l'IP del segnalante → de-anonimizzazione via log. | GDPR art.25; D.lgs 24/2023 art.12 | uvicorn `--no-access-log`; Caddy access-log mantenuto **off** (default) e documentato; nessun handling IP nell'app. |
| **H4** | High (8.1, solo Opzione B) | `reports/router.py`, `public/router.py`, `auth/router.py`, `db/seed.py` | `DEFAULT_TENANT_ID=1` hardcoded → su host multi-tenant condiviso submission/login finiscono **tutti sul tenant 1** → cross-tenant. (Mitigato in Opzione A, 1 VPS/cliente.) | GDPR art.32/5(1)(f); D.lgs 24/2023 art.4 | `core/tenancy.py::resolve_tenant_id` risolve il tenant dall'**Host**; colonne `Tenant.public_domain/backoffice_domain` + migrazione `0002`; fallback single-tenant retrocompatibile. |
| **M1** | Medium (5.3) | `reports/router.py:31,84,97` | Nessun rate-limit su submit/comment/file → DoS applicativo + spam di segnalazioni false. | ISO 37002 (integrità del canale) | `core/ratelimit.py`: submit = bucket per-istanza (30/min); comment 20/min, file 20/5min per-sessione. Roadmap: Proof-of-Work. |
| **M2** | Medium (6.1) | `deploy/Caddyfile` | CSP assente sulla SPA → un XSS riflesso/stored avrebbe esecuzione libera. | GDPR art.32 | CSP restrittiva (`default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; script-src 'self'`) sui due host. |
| **M3** | Medium (5.4) | `cases/router.py:78` download | `Content-Disposition` sanitizzava solo `"` non `\r\n` → **header injection** via filename caricato dal segnalante. | GDPR art.32 | Helper `_content_disposition`: strip CRLF/control + RFC 5987 `filename*`. |
| **M4** | Medium (5.0) | `core/config.py`, `notifications/mailer.py` | SMTP senza username/password/TLS → invio fallito o non autenticato verso relay reali. | (operativo) | `smtp_username/password/starttls` in Settings; `mailer` autentica + STARTTLS in prod. |
| **M5** | Medium (6.5) | `auth/router.py:114` | 2FA opzionale → admin senza 2FA = vettore d'accesso ad alto privilegio (blast radius via escrow). | GDPR art.32 | Login restituisce `two_factor_setup_required` per admin senza 2FA (segnale di enforcement). **Gate UI** da completare nel backoffice (pattern `ForcePasswordChange`). |
| **M6** | Medium (4.3) | `cases/service.py:308`, `reports/router.py:103` | `content_type` fidato dal client → MIME spoofing di allegati malevoli scaricati dal gestore. | GDPR art.32 | Download forzato `application/octet-stream` + `nosniff`. ClamAV consigliato (hardening). |
| **M7** | Medium (5.0) | `files/storage.py:39` | `reference_id` concatenato nel path → potenziale traversal se mai influenzabile. | GDPR art.32 | Validazione regex `^(\d+/)?[0-9a-f]{32}$` in `_resolve`; rifiuta `..`/separatori. |
| **M8** | Medium (4.0) | `backend/pyproject.toml` | Dipendenze `>=` senza lock → build non riproducibili / drift transitivo. | GDPR art.32 | `requirements.lock` pinnato (64 pkg) usato come constraints nel Dockerfile; `pip-audit` = 0 CVE. |
| **M9** | Medium (3.1) | `public/router.py:30` | (Verificato) Il signup notifica **solo** `settings.signup_notify_email` (owner), mai l'email fornita → **niente** relay/bombing. | — | Confermato sicuro; commento esplicito aggiunto. PASS. |
| **L1** | Low | 4 file | `DEFAULT_TENANT_ID` duplicato | — | Assorbito da H4 (resolver unico). |
| **L2** | Low | `cases/service.py`, `jobs/tasks.py` | Cancellazioni (redaction, retention) non tracciate in audit | D.lgs 24/2023 art.14 | Eventi audit `redaction_delete` e `retention_delete` aggiunti. |
| **L3** | Low | `frontend/*` | Bundle SPA condiviso multi-tenant | — | Confermato: branding/config arrivano da `/api/public` a runtime; nessun dato tenant nel bundle. |
| **L4** | Low | `files/storage.py` | Volume condiviso non namespaced per tenant (Opzione B) | GDPR art.5(1)(f) | Path file ora namespaced `<tenant_id>/<uuid>`. |
| **L5** | Low | DNS wildcard | Subdomain takeover di tenant dismessi | — | Runbook in `HARDENING_GUIDE.md`. |
| **L6** | Low | `crypto.generate_receipt`, `zk.ts` | Receipt 16 cifre (2^53) | D.lgs 24/2023 art.12 | Portato a **20 cifre (2^66)** su client e server. |
| **L7** | Low | `config.py`, startup | Segreti d'esempio in produzione | GDPR art.32 | `validate_for_production()` rifiuta `change-me-*`/pepper assente al boot. |

---

## 3. Catena di anonimato end-to-end (dal submit HTTP alla vista gestore)

1. **Browser del segnalante** → `generateReceipt()` crea 20 cifre **solo sul dispositivo** (`zk.ts`).
2. `wbKeypair(receipt)` → **Argon2id** (memory-hard) → scalare Curve25519 → `wb_pub`. *Punto critico H1: ora il receipt non è bruteforzabile offline.*
3. `POST /api/report` invia **solo** `answers` + `wb_pub` (mai il receipt). Nessun IP/UA registrato (modello dati senza colonne IP). *Rate-limit M1.*
4. Server (`reports/service.create_report`): genera la keypair del **report**, cifra le risposte verso `report_pub` (sealed-box), sigilla `report_prv` a `wb_pub`, memorizza `receipt_hash = HMAC(pepper, wb_pub)`. *Punto critico H2: il lookup non è confrontabile senza pepper.* Il server **non conserva** alcuna chiave del report (modalità ZK).
5. **Identità** (facoltativa): cifrata su keypair separato, avvolta **solo per i custodi** → invisibile ai gestori finché un custode non la rilascia (`cases/service.resolve_identity_request`).
6. **Notifica** ai gestori: **content-free** (solo "nuova segnalazione"), via SMTP autenticato (M4).
7. **Rientro**: il client ri-deriva `wb_pub` (Argon2id) e invia `wb_pub` come lookup; il server applica `HMAC(pepper, wb_pub)`, trova il report e restituisce **ciphertext**; la decifratura avviene **nel browser**. *Access-log off (H3): nessuna traccia IP.*
8. **Gestore** (`cases/service.get_detail`): `_get_report` verifica `tenant_id`, `_report_key` esige l'**assegnazione** e fa l'unwrap crittografico con la chiave privata del gestore (in sessione). Senza assegnazione → 403, anche nello stesso tenant. Ogni azione → audit content-free.

**Punti dove il sistema NON può de-anonimizzare:** (a) il server non vede mai il receipt; (b) non logga IP; (c) l'identità è gated dai custodi; (d) i contenuti sono cifrati a riposo con chiavi che il server non detiene (ZK).

---

## 4. Stress test sistemici (scenari A–F)

- **A — Dump completo del DB.** Risposte/commenti/identità = blob cifrati (sealed-box) → **illeggibili**. Receipt: `receipt_hash` è HMAC peppato → non bruteforzabile senza il pepper (env, non in DB). Nessun IP presente. **Esito: nessuna de-anonimizzazione, nessuna lettura.**
- **B — Accesso al filesystem (`files_data`).** Ogni file è cifrato (chiave per-file sigillata al `report_pub`) → senza la chiave del report **illeggibile**. **Esito: allegati protetti.**
- **C — Gestore "recipient" tenta cross-tenant.** `_get_report` → 404 per tenant ≠ sessione; `_report_key` → 403 senza assegnazione (unwrap crittografico). **Esito: bloccato (verificato in `tests/test_cases.py`).**
- **D — Attaccante conosce un receipt a 20 cifre.** Accede alla **sua** segnalazione (per design). Per un receipt altrui: bruteforce gated da Argon2id (H1) su 2^66 + rate-limit re-entry (5/min) → **infattibile**.
- **E — Admin compromesso.** Via escrow recupera le chiavi degli utenti → legge **tutti i contenuti del tenant**, MA **non l'identità** (sigillata ai soli custodi). Mitigazioni: 2FA admin obbligatorio (M5); roadmap escrow M-di-N. **Esito: blast radius = contenuti del tenant; identità preservata.**
- **F — Subdomain takeover** (record DNS verso VPS spenta). Mitigazione operativa: rimozione record dei tenant dismessi, monitoraggio, CAA (vedi `HARDENING_GUIDE.md`). **Esito: rischio gestito a livello operativo.**

---

## 5. Aree verificate e già conformi (nessuna azione)
- `crypto.encrypt_file`: nonce **random per chunk** (PyNaCl `SecretBox.encrypt`) → nessun riuso di nonce.
- Isolamento chiave identità vs chiave report: chiavi distinte, identità avvolta solo per i custodi.
- Escrow vs recovery key: derivazioni indipendenti, non correlabili.
- RBAC: accesso ai casi **crypto-enforced** (oltre al check `tenant_id`).
- Retention (`jobs/tasks.run_retention`): cancella **file su disco + righe DB** su **tutti i tenant** (nessun filtro tenant), ora anche audit-logged (L2).
- Statistiche analyst: solo conteggi aggregati per-tenant, nessun contenuto/PII.
- Cookie di sessione: `httponly`, `secure` (prod), `samesite=strict`; token di sessione non in localStorage.
