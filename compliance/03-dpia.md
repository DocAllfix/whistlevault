# Valutazione d'Impatto sulla Protezione dei Dati (DPIA)

*Canale di Whistleblowing — [ORGANIZZAZIONE] — Versione [X.Y] del [DATA]*

> La DPIA è raccomandata/necessaria (art. 35 GDPR) per il trattamento di segnalazioni, che
> comporta dati potenzialmente sensibili e rischi per i diritti degli interessati.

## 1. Descrizione del trattamento
Raccolta e gestione di segnalazioni di illeciti tramite piattaforma web dedicata. Interessati:
segnalanti e persone coinvolte. Dati: contenuto della segnalazione, allegati, eventuali dati
identificativi forniti volontariamente. **Nessun dato di navigazione/IP.**

## 2. Necessità e proporzionalità
- **Minimizzazione**: si raccolgono solo i dati necessari alla valutazione; nessun campo
  identificativo obbligatorio; segnalazione anonima possibile.
- **Base giuridica**: obbligo legale (D.lgs. 24/2023).
- **Limitazione della conservazione**: retention definita e cancellazione automatica.

## 3. Rischi individuati e misure di mitigazione
| Rischio | Impatto | Misura di mitigazione | Stato |
|---------|---------|------------------------|-------|
| Identificazione del segnalante | Alto | Anonimato, niente IP/UA, codice-ricevuta, cifratura a riposo | ✅ Implementato |
| Accesso non autorizzato ai contenuti | Alto | RBAC, chiave del report wrappata per i soli destinatari, 2FA | ✅ Implementato |
| Divulgazione indebita dell'identità | Alto | Delayed identity disclosure con autorizzazione del custode + audit | ✅ Implementato |
| Esfiltrazione dati a riposo | Alto | Cifratura libsodium dei contenuti e degli allegati | ✅ Implementato |
| Intercettazione in transito | Medio | TLS obbligatorio (reverse proxy) | ✅ Previsto in deploy |
| Conservazione eccessiva | Medio | Job di retention con cancellazione automatica | ✅ Implementato |
| Logging invasivo (caso Bologna Airport) | Alto | Audit log privo di IP/UA/contenuto | ✅ Implementato |
| Compromissione fornitore (SaaS) | Medio | Nomina a Responsabile (art. 28), istanza/DB isolati per cliente, UE | ✅ Previsto |
| Perdita dati | Medio | Backup cifrati e procedura di ripristino | ⏳ Da configurare in deploy |

## 4. Rischio residuo
A valle delle misure, il rischio residuo è valutato **[Basso/Medio]**. Non emergono rischi
elevati non mitigati che richiedano consultazione preventiva del Garante (art. 36 GDPR).
*(valutazione finale a cura del DPO)*

## 5. Riesame
La DPIA è riesaminata almeno **annualmente** o in caso di modifiche sostanziali al trattamento o
alla piattaforma.

Approvazione DPO: ________________  Data: __________
