# Sicurezza — Postura e hardening

Documento di riferimento per la sicurezza della piattaforma di whistleblowing.

## Controlli implementati

### Riservatezza / anonimato
- **Nessun dato identificativo del segnalante**: nessuna colonna né log per IP, user-agent o
  device. Verificato (grep) sull'intero backend.
- Accesso del segnalante tramite **codice-ricevuta a 16 cifre** (nessun account/email).
- Solo l'**hash** del receipt è in DB; la chiave del report è cifrata con una chiave derivata
  dal receipt (Argon2id + salt per-report).

### Crittografia
- **A riposo**: contenuti, risposte, messaggi e allegati cifrati con libsodium (PyNaCl).
- Ogni report ha una coppia di chiavi; la chiave privata è **wrappata per ogni destinatario**
  autorizzato (sealed box) → accesso crittografico, non solo logico.
- **Password gestori**: Argon2id (configurabile, default `interactive` ≥ minimo OWASP; usare
  `moderate` in produzione via `WB_ARGON2_LEVEL=moderate`). La password sblocca la chiave
  privata del gestore.
- **In transito**: TLS demandato al reverse proxy (vedi deploy).

### Controllo accessi
- **RBAC** (admin/recipient/custodian/analyst) + permessi granulari.
- **2FA TOTP** per i gestori.
- Un gestore decifra un report **solo se assegnato** (chiave wrappata per lui); altrimenti 403.
- **Delayed identity disclosure**: accesso all'identità solo previa autorizzazione del custode.

### Hardening applicativo
- Security headers: HSTS, CSP (`default-src 'none'`), X-Frame-Options DENY, nosniff,
  Referrer-Policy `no-referrer`, COOP/CORP.
- **Rate limiting** token-bucket su login e receipt (anti-bruteforce).
- Messaggi di errore generici; **confronto a tempo costante**; KDF "fittizio" su utente
  inesistente (anti-enumerazione).
- Validazione input con Pydantic; ORM SQLAlchemy (no SQL injection).
- Limite dimensione upload (50 MB); cookie `httponly`+`secure`(prod)+`samesite=strict`.
- Sessioni con materiale crittografico **solo in memoria**, mai in DB; scadenza + sweep.
- Audit log delle azioni dei gestori, **senza** contenuto/PII.
- Docs API disabilitate in produzione.

### Ciclo di vita dei dati
- Retention per canale + **job di cancellazione** automatica (incluso file su disco).

## Dipendenze
- `pip-audit`: **0 vulnerabilità note** (ultima esecuzione in Fase 11).

## Hardening per la PRODUZIONE (checklist deploy)
- [ ] TLS forte sul reverse proxy (Caddy/Nginx) + redirect HTTP→HTTPS.
- [ ] `WB_ENVIRONMENT=production` (cookie secure, docs disattivate).
- [ ] `WB_ARGON2_LEVEL=moderate`.
- [ ] Segreti via variabili d'ambiente / secret manager (mai in repo); ruotare la password DB.
- [ ] **Istanza e DB isolati per cliente**; hosting in UE.
- [ ] Backup cifrati + test di ripristino.
- [ ] Container non-root (già nel Dockerfile); rete backoffice non esposta pubblicamente.
- [ ] Monitoraggio/alert e log di sistema (senza PII del segnalante).

## Isolamento crittografico dell'identità (implementato)
L'identità (facoltativa) del segnalante è cifrata con una **chiave dedicata, separata** da quella
del report. I gestori — pur potendo leggere il contenuto — **non possono decifrare l'identità**:
la chiave privata dell'identità è wrappata solo per i **custodi** e viene rilasciata a uno specifico
gestore **solo dopo l'autorizzazione del custode** (re-wrap crittografico). Senza grant l'identità
resta crittograficamente inaccessibile.
- **Requisito**: deve esistere **almeno un custode** (con chiavi) al momento dell'invio, altrimenti
  l'identità resta sigillata e non rilasciabile (fail-closed). Custodi aggiunti dopo l'invio non
  possono rilasciare identità di segnalazioni preesistenti.

## Rafforzamenti futuri (rinviati)
- **Antivirus allegati** (ClamAV), **Tor/onion**, **PGP email**: rinviati (vedi piano).
- Rate limiting e sessioni sono **in-memory** (singola istanza); per multi-istanza usare Redis.
- I documenti in `compliance/` sono template da validare con legale/DPO.
