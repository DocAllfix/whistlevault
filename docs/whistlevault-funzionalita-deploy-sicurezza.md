# Whistlevault

**Funzionalità, Deploy e Sicurezza · Panoramica di prodotto**

MAGGIO 2026


| | |
|---|---|
| **DOCUMENTO** | Riservato |
| **DATA** | Maggio 2026 |
| **PRODOTTO** | Whistlevault — canale di segnalazione EU-compliant |
| **AMBITO** | Funzionalità, modello di deploy, personalizzazione, sicurezza |
| **STATO** | Descrizione del sistema in produzione (build verificata end-to-end) |
| **CONFORMITÀ** | Direttiva (UE) 2019/1937 · D.lgs. 24/2023 · GDPR / UK DPA 2018 |
| **CLASSIFICAZIONE** | Riservato — Non distribuire |

---

## Indice

- **01** Scopo del documento
- **02** Architettura del sistema
- **03** Portale pubblico — funzionalità per il segnalante
- **04** Back-office — funzionalità per i gestori
- **05** Sicurezza e riservatezza in dettaglio
- **06** Deploy per il cliente
- **07** Personalizzazione e white-label
- **08** Il valore del prodotto
- **Appendice** Riferimenti normativi

---

## §01 — Scopo del documento

Questo documento descrive **cosa fa** Whistlevault e **come viene messo a disposizione del
cliente**. È pensato per chi deve valutare il prodotto dal punto di vista funzionale, di
conformità e di sicurezza, non economico: **non contiene prezzi né stime di costo**.

Whistlevault è un **canale di segnalazione interno** (whistleblowing) per organizzazioni,
costruito attorno a tre principi non negoziabili:

- **Riservatezza del segnalante** come requisito di progetto, non come opzione.
- **Cifratura** del contenuto e **minimizzazione** dei dati (nessun IP, nessun dato di
  navigazione, nessun account per il segnalante).
- **Conformità** alla Direttiva (UE) 2019/1937, al D.lgs. 24/2023 e al GDPR, con tracciabilità
  delle azioni dei gestori senza mai registrare il contenuto delle segnalazioni nei log.

Il sistema è composto da **due interfacce web separate** — il **portale pubblico** usato da chi
segnala e il **back-office** usato dal personale autorizzato — servite da un unico backend
applicativo con database isolato per cliente.

---

## §02 — Architettura del sistema

La piattaforma è organizzata in livelli, ciascuno con una responsabilità precisa. La separazione
tra portale pubblico e back-office è anche una scelta di sicurezza: il codice del back-office non
viene mai servito ai segnalanti.

| # | Livello | Funzione |
|---|---|---|
| 1 | **Portale pubblico** (SPA) | Invio segnalazione, ricevuta, rientro col codice, dialogo cifrato. Nessun account. |
| 2 | **Back-office** (SPA) | Gestione casi, workflow, utenti/ruoli, configurazione. Accesso autenticato. |
| 3 | **Backend applicativo** (API) | Logica di business, crittografia, RBAC, sessioni, job pianificati. |
| 4 | **Database relazionale** | Segnalazioni, registro NCR/azioni, **audit trail** delle azioni dei gestori. |
| 5 | **Storage allegati cifrato** | File e audio cifrati a riposo, con chiave sigillata alla segnalazione. |
| 6 | **Motore crittografico** | Coppie di chiavi per segnalazione, sealed-box, derivazione da ricevuta, escrow. |
| 7 | **Reverse proxy + HTTPS** | TLS automatico, header di sicurezza, instradamento same-origin verso l'API. |

**Tecnologie.** Backend Python/FastAPI con PostgreSQL; due frontend React (build statiche) serviti
dietro reverse proxy con HTTPS automatico; crittografia basata su libreria a curve ellittiche
(sealed-box) lato server e **anche lato browser** per il canale di ritorno. Tutto il sistema gira
su un'unica origine per applicazione: nessuna terza parte sul percorso del segnalante.

> **Nota architetturale.** Il portale pubblico **non dipende da CDN o servizi esterni** a runtime:
> i font sono auto-ospitati e non vengono effettuate chiamate verso terze parti. Questa scelta
> protegge la riservatezza della connessione del segnalante ed è compatibile con l'uso via Tor.

---

## §03 — Portale pubblico — funzionalità per il segnalante

Il portale pubblico è ciò che il dipendente (o un terzo) usa per segnalare. È progettato per
abbassare la soglia psicologica e tecnica della segnalazione.

### 3.1 Invio guidato della segnalazione
- **Questionario dinamico** definito dall'organizzazione: passi e domande configurabili.
- **Logica condizionale**: alcune domande compaiono solo in base alle risposte precedenti
  (riduce il rumore e guida il segnalante).
- **Tipi di campo** supportati: testo, testo lungo, selezione singola/multipla, data,
  **allegato file**, **registrazione vocale** (segnalazione orale, requisito della Direttiva).
- **Validazione** dei campi obbligatori passo per passo, con riepilogo prima dell'invio.
- **Scelta del canale** quando l'organizzazione espone più canali (es. generale, anticorruzione).

### 3.2 Anonimato reale
- **Nessun account**: non servono email, nome o registrazione.
- **Nessun indirizzo IP** e nessun metadato di navigazione vengono registrati.
- **Identità facoltativa**: se il segnalante sceglie di fornirla, viene **cifrata separatamente**
  e resa visibile a un gestore solo previa autorizzazione di un **custode** (rilascio differito).

### 3.3 Ricevuta e rientro sicuro
- Al termine il segnalante riceve un **codice di 16 cifre** generato **sul suo dispositivo**,
  accompagnato da un **QR code** per conservarlo facilmente.
- Il codice è **l'unica chiave** per rientrare: non è recuperabile se perso, ed è ciò che rende
  possibile il dialogo senza identificare la persona.
- Rientrando col codice, il segnalante vede lo **stato** della pratica, i **messaggi** dei gestori
  e può **rispondere** e **aggiungere allegati**.

### 3.4 Canale di ritorno zero-knowledge
- Il dialogo di ritorno è **zero-knowledge**: il server **non conosce il codice** e **non può
  decifrare** la conversazione del segnalante. La decifratura avviene **nel browser** del
  segnalante a partire dal codice.

### 3.5 Accessibilità e lingue
- Interfaccia **bilingue (IT/EN)** con selettore di lingua, struttura **pronta per RTL**.
- Progettazione orientata a **WCAG 2.1 AAA**: contrasto elevato, navigazione da tastiera, focus
  visibile, annunci per screen reader, rispetto di `prefers-reduced-motion`.

---

## §04 — Back-office — funzionalità per i gestori

Il back-office è l'area riservata al personale autorizzato. L'accesso è regolato da **ruoli**
(Amministratore, Gestore, Custode, Analista), ciascuno con permessi distinti.

### 4.1 Dashboard segnalazioni
- Elenco dei casi **raggruppato per tempo** (Oggi / Ultimi 7 giorni / Ultimo mese / Archivio).
- **Ricerca** per testo o numero, **filtri** per stato e per canale, **ordinamento** per data o
  scadenza, badge di **novità** e indicatore di **scadenza/SLA**.

### 4.2 Dettaglio del caso
- **Contenuto decifrato** della segnalazione, visibile **solo** ai gestori autorizzati (che
  possiedono la chiave del report).
- **Workflow di stato** configurabile (es. Nuova → In gestione → Chiusa) secondo ISO 37002.
- **Dialogo bidirezionale** con il segnalante, con **tre livelli di visibilità** per ogni
  messaggio: visibile al segnalante, solo interno, personale.
- **Allegati**: download con **decifratura** lato gestore (round-trip verificato).
- **Punteggio di rischio** e flag di importanza calcolati automaticamente dalle risposte.

### 4.3 Strumenti di gestione e tutela
- **Oscuramento (redaction)** di testi sensibili nelle risposte, in forma **reversibile** o
  **permanente**, con registrazione dell'azione.
- **Export del caso** in archivio **ZIP** (risposte + messaggi + allegati decifrati) per
  istruttoria o consegna.
- **Assegnazione tra gestori**: **concedi**, **trasferisci** o **revoca** l'accesso a un caso,
  ri-cifrando la chiave per il nuovo gestore (chi non è assegnato non può leggere).
- **Promemoria/scadenze** (SLA) per la gestione nei tempi.

### 4.4 Identità differita e custode
- Quando il segnalante ha fornito l'identità, un gestore può **richiederne l'accesso** con
  motivazione; un **Custode** approva o nega dalla propria coda dedicata. È l'**unico** percorso
  per svelare l'identità.

### 4.5 Configurazione (Amministratore)
- **Utenti e ruoli**: creazione, gestione, **recupero account** (escrow) con chiave di recupero,
  eliminazione.
- **Editor questionari**: passi, domande, tipi di campo, obbligatorietà, **logica condizionale**,
  **peso di rischio** per opzione, etichette **multilingua**.
- **Personalizza** (vedi §07): branding, testi, canali, SLA/retention, notifiche.
- **Statistiche** (ruolo Analista/Admin): numeri **aggregati** (per stato, canale, mese) **senza
  alcun contenuto** né dato personale, con grafici.
- **Registro attività (audit)**: elenco ricercabile di **tutti** gli eventi e azioni dei gestori
  (data, attore, azione, oggetto) **senza** contenuti delle segnalazioni.

### 4.6 Sicurezza dell'account
- **Autenticazione a due fattori (2FA)** attivabile via QR con **codici di recupero**.
- **Cambio password forzato** al primo accesso; **reset self-service** via email; cambio password
  che **preserva** l'accesso ai report (non rigenera le chiavi).

### 4.7 Esperienza d'uso
- **Tema chiaro/scuro** con interruttore.
- **Tour guidato interattivo** che parte al primo accesso e spiega ogni pagina, ri-attivabile in
  qualsiasi momento; aiuti contestuali inline sui campi tecnici.

---

## §05 — Sicurezza e riservatezza in dettaglio

La sicurezza non è uno strato aggiunto: è il modo in cui il sistema è costruito.

### 5.1 Crittografia
- **Cifratura del contenuto a riposo**: risposte, messaggi e allegati sono cifrati; ogni
  segnalazione ha una propria coppia di chiavi.
- **Accesso per chiave, non per ruolo nominale**: un gestore può decifrare un caso **solo** se la
  chiave del report è stata sigillata per lui. Chi non è assegnato non può leggere, punto.
- **Canale di ritorno zero-knowledge**: il server non vede il codice del segnalante e non può
  decifrare il suo dialogo di rientro (decifratura nel browser).
- **In transito**: tutto il traffico è protetto da **HTTPS/TLS** con certificati validi.

### 5.2 Anonimato e minimizzazione
- **Nessun IP**, nessun user-agent, nessun metadato di navigazione registrato.
- **Nessun account** per il segnalante; identità solo facoltativa e cifrata a parte.
- **Retention configurabile** per canale: i dati sono conservati per il tempo necessario e poi
  cancellati o anonimizzati.

### 5.3 Controllo degli accessi
- **RBAC** per ruolo (Amministratore, Gestore, Custode, Analista) con permessi granulari.
- **2FA** per il personale; reset e cambio password che preservano l'accesso crittografico ai dati
  tramite **escrow** controllato (recupero amministrativo senza perdita di dati).
- **Separazione dei portali**: back-office su host distinto, non collegato dal pubblico,
  **`noindex`** (non indicizzato dai motori di ricerca), opzionale **allow-list IP/VPN**.

### 5.4 Tracciabilità
- **Audit trail** delle azioni dei gestori (accesso al caso, cambio stato, oscuramento, export,
  download, grant, creazione utenti…), **senza** contenuti né dati personali del segnalante.

### 5.5 Hardening dell'infrastruttura
- HTTPS automatico con rinnovo dei certificati; **header di sicurezza** (HSTS, anti-sniffing,
  anti-clickjacking, referrer policy).
- **Firewall** ridotto alle sole porte necessarie; **fail2ban**; accesso al server **solo via
  chiave SSH**; backend eseguito come utente **non privilegiato**; database **non esposto**
  pubblicamente; API raggiungibile **solo** attraverso il proxy.

### 5.6 Conformità
Architettura allineata a **Direttiva (UE) 2019/1937** e **D.lgs. 24/2023** (canale dedicato,
riservatezza dell'identità, divieto di ritorsione, gestione tracciata) e a **GDPR / UK DPA 2018**
(minimizzazione, residenza dati UE/UK, retention, privacy-by-design).

---

## §06 — Deploy per il cliente

Il prodotto è progettato per essere messo online per un cliente in modo **semplice, isolato e
sicuro**, mantenendo intatte tutte le garanzie di sicurezza.

### 6.1 Modello "tutto-su-istanza dedicata"
- Un'**istanza isolata per cliente** (database e dati separati), eseguita in container.
- I due portali e l'API girano su **un'unica origine per applicazione** dietro il reverse proxy:
  niente terze parti sul percorso del segnalante, nessuna complessità cross-origin.
- **HTTPS automatico** al primo avvio; **migrazioni** del database e **provisioning** del primo
  amministratore eseguiti automaticamente.

### 6.2 La questione del dominio
- Il cliente può usare un **proprio (sotto)dominio** (es. `segnalazioni.cliente.it` per il portale
  e `gestione.cliente.it` per il back-office), puntandolo all'istanza: il certificato HTTPS viene
  emesso e rinnovato automaticamente.
- In alternativa si può usare un **sottodominio del marchio** della piattaforma,esempio:(aziendax.whistlevault.it/eu) così il cliente
  **non deve toccare i propri DNS**.
- I **due portali su host separati** rispecchiano (e rinforzano) la separazione pubblico/gestori.

### 6.3 Avvio operativo
- Al primo avvio viene creato l'**amministratore iniziale**, che al primo accesso è **obbligato a
  cambiare la password**.
- Da quel momento l'amministratore configura canali, questionari, utenti e branding **in
  autonomia**, senza interventi tecnici.

> **Posture di deployment.** Il modello standard è cloud in regione **UE/UK**. Per clienti con

> garanzie operative; scenari on-premise/air-gapped sono valutabili come progetto dedicato.

---

## §07 — Personalizzazione e white-label

L'organizzazione rende il portale **proprio** senza interventi di sviluppo, dalla pagina
**"Personalizza"** del back-office, o puo tranquillamente richiedere la personalizzazione inizialmente pre deploy e poi modificare liberamente in app.

### 7.1 Branding personalizzato
- **Nome dell'organizzazione**, **colore principale** e **logo** mostrati nel portale pubblico.
- Le modifiche **si propagano immediatamente** al portale dei segnalanti.

### 7.2 Canali e politiche
- Creazione e configurazione dei **canali** di segnalazione.
- Per canale: **giorni di conservazione (retention)**, **promemoria/SLA**, **soglie di rischio**.

### 7.3 Questionari su misura
- Costruzione dei questionari (passi, domande, tipi di campo, logica condizionale, pesi di rischio,
  etichette multilingua) dall'editor visuale.

### 7.4 Notifiche
- **Template** e **interruttori** per evento (nuova segnalazione, nuovo messaggio, scadenza):
  attivabili/disattivabili e personalizzabili nel testo, sempre **senza contenuti** della
  segnalazione.

---

## §08 — Il valore del prodotto

- **Conformità reale, non dichiarata, sostenuta da architettura privacy-first.** La riservatezza è incorporata nell'architettura
  (cifratura, anonimato, zero-knowledge, audit senza contenuti), non promessa a parole.
- **Fiducia del segnalante e dell'auditor insieme.** Esperienza calma e accessibile per chi
  segnala; rigore, tracciabilità e controllo per chi gestisce e per chi verifica.
- **Pronto per il cliente in tempi brevi.** Istanza isolata, HTTPS automatico, branding e canali
  configurabili in autonomia, dominio del cliente o sottodominio del marchio.
- **White-label completo.** Il cliente vede il *proprio* canale; la piattaforma resta invisibile.
- **Sicurezza di livello enterprise** su tutta la catena: trasporto, riposo, accessi, infrastruttura.

---

## Appendice — Riferimenti normativi

- **Direttiva (UE) 2019/1937** — protezione delle persone che segnalano violazioni del diritto
  dell'Unione.
- **D.lgs. 24/2023** — recepimento italiano della Direttiva whistleblowing.
- **Regolamento (UE) 2016/679 (GDPR)** / **UK Data Protection Act 2018** — protezione dei dati
  personali, minimizzazione, privacy-by-design.
- **ISO 37002** — linee guida per i sistemi di gestione del whistleblowing (ricezione →
  valutazione → gestione → chiusura).

*Documento descrittivo delle funzionalità, del modello di deploy e dell'architettura di sicurezza.
Non contiene prezzi né impegni contrattuali. Riservato — Non distribuire.*
