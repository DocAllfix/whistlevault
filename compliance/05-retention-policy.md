# Politica di Conservazione e Cancellazione

*Canale di Whistleblowing — [ORGANIZZAZIONE] — Versione [X.Y] del [DATA]*

## 1. Principio
I dati sono conservati per il **tempo strettamente necessario** alla gestione della segnalazione
e all'adempimento degli obblighi di legge, poi **cancellati o anonimizzati** (art. 5.1.e GDPR;
art. 14 D.lgs. 24/2023).

## 2. Periodi di conservazione
| Dato | Periodo | Note |
|------|---------|------|
| Segnalazione e documentazione correlata | Fino a **5 anni** dalla comunicazione dell'esito finale | Configurabile per canale |
| Allegati cifrati | Stesso periodo della segnalazione | Cancellati col report |
| Audit log (accessi gestori) | [24 / 60] mesi | Privo di contenuto/PII del segnalante |
| Coda email di notifica | Fino all'invio + [N] giorni | Corpo generico, senza contenuto |

## 3. Attuazione tecnica
- Ogni segnalazione ha una **data di scadenza** (`expiration_date`) calcolata dal TTL del canale
  (`tip_ttl_days`).
- Un **job automatico** elimina periodicamente i report scaduti **e i relativi allegati cifrati
  dal disco** (cascata sulle tabelle correlate).
- La cancellazione è **irreversibile**: la chiave del report e i dati cifrati vengono rimossi.

## 4. Configurazione per canale
Il TTL è impostabile per ciascun canale (es. 12/24/60 mesi) in base al profilo di rischio,
dall'area di amministrazione.

## 5. Sospensione della cancellazione (legal hold)
In presenza di contenzioso o richiesta dell'Autorità, la cancellazione di una specifica
segnalazione può essere **sospesa** estendendone la scadenza, con annotazione nell'audit log.

## 6. Riesame
La presente politica è riesaminata almeno annualmente dal [RPCT] con il [DPO].
