# WhistleVault — Compliance Checklist (D.lgs 24/2023 + GDPR)

Stato post-fix. Legenda: **PASS** = garantito tecnicamente · **PARTIAL** = parziale (residuo indicato) · **FAIL** = non conforme.
Ogni voce cita la funzione/file che la implementa.

> Nota: gli adempimenti **organizzativi** (nomina RPCT/gestore, informativa ai lavoratori, registri cartacei, formazione) restano in capo all'organizzazione titolare. Qui si certifica la copertura **tecnica**.

## D.lgs 24/2023 (recepimento Direttiva UE 2019/1937)

| Art. | Requisito | Stato | Riferimento tecnico |
|------|-----------|-------|---------------------|
| **4** | Canale interno dedicato e distinto | **PASS** | Istanza isolata per cliente (`deploy/docker-compose.prod.yml`); tenant risolto da Host (`core/tenancy.py`). DB e API non esposti, solo via Caddy. |
| **12** | Riservatezza dell'identità del segnalante (anche verso il gestore) | **PASS** | Identità su keypair separato, avvolta **solo per i custodi** (`reports/service.create_report` → `identity_custodian_keys`); rilascio controllato (`cases/service.resolve_identity_request`). Receipt non bruteforzabile (H1 Argon2id + H2 pepper). Nessun IP loggato (H3). |
| **13** | Segnalazione in forma scritta e **orale** | **PARTIAL** | Scritta + allegati + **vocale** (campo `voice`/upload audio cifrato) supportati a livello di questionario. Incontro di persona = adempimento organizzativo (non bloccante tecnicamente). |
| **14** | Conservazione e tracciabilità della gestione | **PASS** | Audit log content-free di tutte le azioni dei gestori (`app/audit`); ora anche `redaction_delete`/`retention_delete` (L2). Retention automatica (`jobs/tasks.run_retention`). |
| **18** | Misure di sicurezza e protezione dei dati | **PASS** | Cifratura a riposo (sealed-box), TLS in transito (Caddy), RBAC crypto-enforced (`cases/service`), 2FA (M5), CSP (M2), rate-limit (M1). |
| **19** | Divieto/condizioni che impediscano l'identificazione | **PASS** | Anche con violazione del DB il segnalante non è identificabile: nessun IP, contenuti cifrati, receipt peppato/Argon2id, identità gated dai custodi (vedi `SECURITY_AUDIT_REPORT.md` §4 scenario A). |

## GDPR

| Art. | Requisito | Stato | Riferimento tecnico |
|------|-----------|-------|---------------------|
| **5(1)(c)** | Minimizzazione | **PASS** | Nessuna colonna IP/UA/device (`db/models.py`, invariante "by absence"); identità opzionale. |
| **5(1)(e)** | Limitazione conservazione | **PASS** | `jobs/tasks.run_retention`: cancella file su disco **e** righe DB su **tutti i tenant** alla scadenza (`expiration_date`). |
| **5(1)(f)** | Integrità e riservatezza | **PASS** | Cifratura at-rest + TLS; isolamento tenant (H4); file namespaced per tenant (L4); path validati (M7). |
| **25** | Privacy by design/default | **PASS** | Anonimato di default (nessun account/email/IP); ZK return channel (`zk.ts`, `reports/service`); access-log off (H3). |
| **32** | Misure tecniche adeguate | **PASS** | Argon2id (password + ZK), sealed-box, HMAC pepper (H2), 2FA, security headers/CSP, rate-limit, lock dipendenze + pip-audit (M8), backend non-root. Backup cifrati = vedi `HARDENING_GUIDE.md`. |
| **28** | Responsabile del trattamento (DPA) | **PARTIAL** | Modello tecnico coerente (provider = responsabile; titolare = cliente). Il **DPA contrattuale** va firmato per cliente (documento legale, fuori codice). |
| **30** | Registro dei trattamenti | **PARTIAL** | L'audit log copre le azioni; il **registro art.30** è documentale (a cura del titolare/provider). |
| **32(1)(b)** | Riservatezza/disponibilità servizi | **PASS** | Istanza isolata, healthcheck, restart policy (`docker-compose.prod.yml`). |
| **35** | DPIA | **PARTIAL** | DPIA predisposta in `/compliance` (template); da finalizzare per cliente con i dati reali. |

## Riepilogo
- **Tecnicamente PASS:** D.lgs art.4,12,14,18,19; GDPR art.5(c)(e)(f),25,32. 
- **PARTIAL (residui dichiarati):** D.lgs art.13 (incontro di persona = organizzativo); GDPR art.28/30/35 (documenti legali per cliente) e il **gate UI 2FA** (M5). 
- **Nessun FAIL.**
