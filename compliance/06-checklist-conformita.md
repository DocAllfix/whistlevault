# Checklist di Conformità — Requisiti → Documento + Funzione della piattaforma

Mappatura 1:1 tra i requisiti normativi e (a) il documento che li copre e (b) la funzione
tecnica che li attua. Utile come traccia per l'audit.

## Direttiva (UE) 2019/1937 + D.lgs. 24/2023

| Requisito | Documento | Funzione piattaforma | Stato |
|-----------|-----------|----------------------|-------|
| Canale interno strutturato | Policy §4 | Portale pubblico + wizard di segnalazione | ✅ |
| Segnalazione scritta | Policy §4 | `POST /api/report` + questionario dinamico | ✅ |
| Segnalazione orale | Policy §4 | Verbale caricato come allegato *(processo)* | ⏳ Organizzativo |
| Riservatezza dell'identità | Policy §5, Informativa §6 | Anonimato, no IP/UA, cifratura, codice-ricevuta | ✅ |
| Accesso identità controllato | Policy §5 | Delayed identity disclosure + custode + audit | ✅ |
| Avviso di ricevimento (7 gg) | Policy §7 | Notifica + gestione stato | ✅ (processo) |
| Riscontro entro 3 mesi | Policy §7 | Workflow stati + thread | ✅ (processo) |
| Divieto di ritorsione | Policy §6 | — (misura organizzativa) | ✅ Documentale |
| Canale esterno (ANAC) | Policy §4 | — (rinvio) | ✅ Documentale |

## GDPR (privacy by design/default)

| Requisito | Documento | Funzione piattaforma | Stato |
|-----------|-----------|----------------------|-------|
| Informativa (artt. 13-14) | Informativa privacy | Link in footer del portale | ✅ |
| Minimizzazione dei dati | DPIA §2 | Nessun campo identificativo obbligatorio; no IP/UA | ✅ |
| Cifratura (art. 32) | DPIA §3 | libsodium a riposo + TLS in transito | ✅ |
| Controllo accessi | DPIA §3 | RBAC + 2FA + chiave wrappata per destinatario | ✅ |
| Limitazione conservazione | Retention policy | `expiration_date` + job di cancellazione | ✅ |
| Registro trattamenti/accessi | — | Audit log senza contenuto né PII | ✅ |
| DPIA (art. 35) | DPIA | — | ✅ Documentale |
| Responsabile del trattamento (art. 28) | DPA art.28 | Isolamento per cliente, hosting UE | ✅ Documentale |
| Diritti interessati (artt. 15-22) | Informativa §9 | Gestione via DPO; limiti ex art. 2-undecies | ✅ |

## ISO 37002:2021 (ciclo di gestione)

| Fase | Documento | Funzione piattaforma | Stato |
|------|-----------|----------------------|-------|
| Ricevere | Policy §7 | Submission + receipt | ✅ |
| Valutare | Policy §7 | Stati + score (questionario) | ✅ |
| Trattare | Policy §7 | Thread riservato + allegati + redaction | ✅ |
| Concludere | Policy §7 | Cambio stato finale + retention | ✅ |

## Voci da completare prima del go-live
- [ ] Compilare tutti i segnaposto `[…]` nei documenti.
- [ ] Revisione legale/DPO dei testi.
- [ ] Configurare TLS (reverse proxy) e backup cifrati nel deploy.
- [ ] Definire il processo per le segnalazioni orali.
- [ ] Firmare il DPA art.28 con ciascun cliente (modello SaaS).
