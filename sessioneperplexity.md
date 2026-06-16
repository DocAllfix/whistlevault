https://globaleaks.org/ , mi hanno chiesto una piattaforma di whistleblowing, questa dice di essere una piattaforma opensource, mica posso copiarla e venderla?controlla la licenza oppure cerca online dei rifeirmenti e di cosa ho bisogno per fare una piattacforma whistleblowing a volo a volo con claude code , voglio riferimenti, necessita obbligatorie, strutture che posso prendere e riadattare
Completati 6 passaggi
A livello di licenza, GlobaLeaks è sotto AGPL‑3.0: puoi usarla anche in contesti commerciali (es. vendere hosting, setup, consulenza), ma non puoi semplicemente “copiarla e rivenderla” come prodotto chiuso; qualsiasi derivato che offri via rete deve restare AGPL e con sorgente disponibile agli utenti, oltre a rispettare alcune clausole aggiuntive specifiche.

Per una tua piattaforma “minimal” di whistleblowing con Claude/Code, ha senso usare GlobaLeaks soprattutto come reference di requisiti, flussi e architettura, e poi implementare un tuo stack ispirato ma riscritto.

Che licenza usa GlobaLeaks e cosa implica
Il sito e la documentazione indicano chiaramente che GlobaLeaks è software libero/open source rilasciato con licenza AGPL‑3.0.

Il repository ufficiale ribadisce che GlobaLeaks è sotto AGPLv3 con “additional terms allowed under section 7”, pensati per informare i whistleblower sulla tecnologia usata e responsabilizzare gli amministratori nel mantenere i sistemi aggiornati.

L’AGPL‑3.0 è una copyleft “forte” pensata per applicazioni web/SaaS: se modifichi il software o crei un’opera derivata che viene utilizzata da utenti tramite rete (tipicamente web app), devi rendere disponibile il codice sorgente corrispondente a quegli utenti, alle stesse condizioni AGPL.

Questo non ti vieta di far pagare licenze, servizi o accesso: è perfettamente legittimo vendere l’uso o l’hosting di software AGPL, purché chi lo usa possa ottenere il sorgente del componente AGPL (e dei derivati) e i diritti previsti dalla licenza.

(Nota ovvia ma importante: non sono un avvocato; se vuoi fondare un business su questo ti conviene un giro con un legale IP/compliance.)

Posso “copiarla e venderla”?
Dipende da cosa intendi per “copiare e vendere”:

Fork/derivato di GlobaLeaks

Puoi clonare il repo, modificarlo (branding, feature, integrazioni) e offrire il servizio a pagamento, ma:

Devi mantenere la licenza AGPL sul codice derivato e offrire il sorgente agli utenti che ci accedono via rete.

Devi rispettare i termini aggiuntivi (es. informare chiaramente gli utenti sulla tecnologia, non rimuovere le note di licenza, ecc.).

In pratica non puoi trasformarlo in un prodotto proprietario chiuso; stai vendendo un servizio gestito sopra software libero.

Incorporare codice AGPL dentro una tua piattaforma “chiusa”

Se la tua app e GlobaLeaks/non‑GlobaLeaks AGPL diventano un’unica opera (es. wrapper stretto, integrazione lato codice), la parte tua eredita l’AGPL: sei tenuto a pubblicarne il sorgente a chi usa il servizio.

L’unico modo per evitare questo, in generale, è tenerli come programmi separati che comunicano solo via interfacce esterne ben separate (processi diversi, API ecc.), ma il confine legale è delicato quindi è materia da avvocato.

Studiare GlobaLeaks come reference, ma riscrivere da zero

Puoi usare liberamente la documentazione, i flussi UX e le idee di architettura per ispirarti, e implementare un tuo backend/frontend senza copiare porzioni sostanziali di codice.

In quel caso il tuo codice non è un derivato del loro, quindi puoi licenziarlo come vuoi (fermo restando che devi comunque rispettare direttive UE, GDPR ecc., ma quella è un’altra storia).

Per un prodotto commerciale che vuoi mantenere proprietario, la strada più tranquilla è: usare GlobaLeaks come “spec funzionale” e reference di best practice, non come base di codice.

Requisiti minimi (EU/Italia) per un canale di whistleblowing
La Direttiva (UE) 2019/1937 obbliga la maggior parte delle organizzazioni con almeno 50 dipendenti a istituire canali interni di segnalazione che garantiscano confidenzialità, accessibilità e protezione da ritorsioni.

Il recepimento in Italia (D.lgs. 24/2023) protegge chi segnala violazioni che ledono l’interesse pubblico o l’integrità dell’ente, estendendo la protezione a dipendenti, fornitori, consulenti ecc. e imponendo canali designati di segnalazione interna ed esterna.

Da questi testi + best practice ISO 37002 si possono estrarre alcuni blocchi obbligatori/fortemente attesi:

Canale interno strutturato

Un canale (piattaforma, linea dedicata, ecc.) accessibile a dipendenti, collaboratori e soggetti equiparati, per segnalare violazioni in aree coperte dal diritto UE (appalti, finanza, salute pubblica, privacy, sicurezza reti, ecc.).

Possibilità di segnalazione scritta e spesso anche orale (telefonica o tramite sistema di messaggistica/audio).

Confidenzialità e protezione

Obbligo di mantenere la confidenzialità dell’identità del segnalante e delle persone coinvolte, salvo eccezioni legali.

Divieto di ritorsioni e misure organizzative per prevenirle (policy, procedure, canale HR/legale).

Processo di gestione del caso

Ricezione, valutazione, istruttoria e chiusura del caso, lungo le 4 fasi che ISO 37002 identifica come: ricevere, valutare, trattare, concludere.

Politiche e procedure documentate, che definiscono ruoli (es. RPCT, compliance officer, legal) e tempi di gestione; ISO 37002 funge da linee guida di best practice per tutto il ciclo.

Informativa e trasparenza

Policy di whistleblowing chiara e accessibile su chi può segnalare, cosa, come, a chi, come vengono trattati i dati.

Informativa privacy completa per whistleblower e persone menzionate, spiegando trattamenti, basi giuridiche, retention e diritti GDPR.

Requisiti GDPR & sicurezza per la piattaforma
Oltre al layer “legale”, la piattaforma stessa deve incarnare “privacy by design e by default” e misure di sicurezza adeguate.

Elementi chiave:

Minimizzazione dei dati e logging prudente

Raccogli solo le informazioni strettamente necessarie per valutare la segnalazione; evitare “campi curiosi” che aumentano il rischio privacy senza reale utilità.

Caso emblematico: nel sistema del Bologna Airport la registrazione di IP e comportamento di navigazione del whistleblower è stata considerata violazione dei principi di privacy by design/default.

Access control e separazione dei ruoli

Ruoli e permessi granulari: pochi utenti autorizzati, minimo accesso necessario, ruoli distinti per intake e analisi specialistica, backup documentato.

Piattaforme commerciali serie mettono forte enfasi su crittografia, controllo accessi e certificazioni ISO 27001 / simili come base di fiducia.

DPIA e misure tecniche-organizzative

Per un sistema che tratta segnalazioni sensibili, è altamente raccomandata (spesso necessaria) una Data Protection Impact Assessment (DPIA) per mappare rischi, minacce e contromisure.

Misure tipiche: TLS forte, crittografia lato server per contenuto delle segnalazioni, hardening dell’infrastruttura, logging limitato e sicuro, backup protetti.

Retention e cancellazione

Policy di conservazione: tenere i dati il tempo necessario alla gestione del caso e agli obblighi legali, poi anonimizzare o cancellare.

Guardando GlobaLeaks e soluzioni simili vedi pattern ricorrenti: portale sicuro, crittografia end‑to‑end o at‑rest, multi‑lingua, questionari custom, gestione retention, ecc., tutti in chiave “GDPR by design”.

Struttura minimale riusabile per una tua piattaforma
Userei GlobaLeaks come blueprint concettuale: framework multi‑uso adottato da migliaia di progetti, conforme a ISO 37002, Direttiva UE 2019/1937 e GDPR.

Puoi estrarne una struttura minimale e farla implementare “a volo a volo” con Claude Code/Godot/stack web che preferisci, senza toccare il loro codice.

a) Modello dati base
Al minimo, ti servono entità tipo:

Report

ID univoco, canale/progetto, categoria, testo descrittivo, severity, timestamp, stato (nuovo, in review, chiuso), eventuali metadati non identificativi.

Utenti e ruoli interni

Amministratore del sistema, referenti compliance/legale, eventualmente auditor; ciascuno con permessi specifici sul set di report.

Whistleblower session/token

Token univoco generato alla creazione del report, che permette al segnalante di rientrare, leggere risposte, allegare info aggiuntiva, senza doversi registrare o fornire email.

Messaggi / follow‑up

Thread tra whistleblower e gestore del caso, con possibilità di domande di chiarimento, sempre veicolate via interfaccia anonima.

Allegati

File criptati associati a un report; metadati ridotti al minimo, niente filename “parlanti”, attenzione a EXIF/IP/log.

b) Flussi applicativi principali
Ricalcando i 4 step di ISO 37002 (ricevere, valutare, trattare, concludere):

Invio segnalazione (canale pubblico)

Landing page con spiegazione sintetica del canale e dei rischi (es. non usare device aziendali, ecc.).

Form multi‑step (tipo GlobaLeaks: questionario customizzabile) con categorie, descrizione, possibilità di allegati.

Al submit: crei il record, generi un token, lo mostri e inviti l’utente a salvarlo.

Gestione interna (backend protetto)

Dashboard con lista dei report, filtri per stato/canale, assegnazione a gestori.

Vista dettaglio: cronologia, allegati, note interne, thread di comunicazione anonima col segnalante.

Azioni: cambiare stato, richiedere info aggiuntive, chiudere il caso, impostare retention.

Canale di ritorno per il segnalante

Pagina “controlla la tua segnalazione” accessibile solo con token, per vedere aggiornamenti e rispondere a domande.

Nessuna autenticazione legata a identità reale, niente email obbligatoria (puoi renderla opzionale con warning).

Audit log interno

Log minimale e interno di chi ha visto cosa e quando (per accountability), ma senza loggare IP o dati non necessari del whistleblower, in coerenza con i casi GDPR citati.

c) Layer sicurezza & privacy che puoi standardizzare
Front pubblico separato dal backend: due servizi separati (es. public-gateway e case-management) che comunicano tramite API interne, con backend accessibile solo via VPN o SSO aziendale.

Crittografia: cifrare a riposo i campi sensibili (testo segnalazione, allegati) con chiavi gestite lato server e gestione key rotation.

RBAC: ruoli e permessi configurabili per canale/area (es. HR vede solo segnalazioni HR, Internal Audit vede tutto).

Configurazione retention per canale: es. 12/24/60 mesi in base a policy e risk profile, ispirandoti a come le soluzioni di mercato gestiscono retention e data lifecycle.

Come usarla “al volo” con Claude Code
Dato il tuo profilo, un approccio pragmatico potrebbe essere:

Step 1 – Definisci lo schema

Specifica a Claude Code uno schema SQL (PostgreSQL/SQLite) con tabelle reports, attachments, users, roles, messages, report_events, includendo i vincoli di privacy (no IP, no user agent, timestamp sì ma niente logging invasivo).

Step 2 – API backend

Genera un micro‑backend in FastAPI/Express o quello che preferisci con endpoint:

POST /api/report (crea report anonimo e restituisce token)

GET/POST /api/report/{token} (lettura e follow‑up lato whistleblower)

GET/POST /api/admin/reports/... protetti con JWT/SSO per la gestione interna.

Step 3 – UI minimale

Due SPA o pagine:

Front pubblico: wizard di segnalazione + pagina di consultazione con token.

Backoffice: lista report, dettaglio, note interne, thread, chiusura.

Puoi prendere ispirazione dai wizard/documentazione di setup di GlobaLeaks (scelta lingua, nome progetto, account admin, ecc.) per il flow di onboarding.

Step 4 – Layer compliance “documentale”

Genera con Claude i template di:

Policy di whistleblowing (allineata a Direttiva UE 2019/1937 e D.lgs. 24/2023).

Informativa GDPR specifica per il canale (basata sui concetti di privacy by design/default, DPIA, minimizzazione).

Questi testi li affianchi alla piattaforma (link footer, pagina dedicata, PDF da scaricare).

Se vuoi, nel prossimo passo posso aiutarti a:

derivare uno schema DB concreto pronto da incollare in Claude Code, e

proporre uno skeleton di API (es. FastAPI) + punti di hardening, il tutto pensato per restare “ispirato” a GlobaLeaks ma pulito da vincoli AGPL sul codice.

Preparato da Deep Research
Allora, riassumi tutto quello che hai gia detto piu linkami la repo, piu dirmi precisamente cercando attentamente ogni singola encessita per una piattaforma whistleblowing, come prendere diciamo la blueprint scaricando la repo del progetto opensource e modificnadola, dammi tutto cio che serve per poter creare questa cosa al volo e venderla

Ti puoi basare su GlobaLeaks sia come blueprint tecnica/funzionale sia come prodotto da rivendere come servizio gestito, ma se usi il loro codice resti sotto AGPL e devi pubblicare il sorgente modificato ai tuoi clienti; se vuoi qualcosa 100% proprietario ti conviene copiarne solo le idee e riscrivere il codice.

Repo ufficiale e tecnologia
Repo GitHub: https://github.com/globaleaks/globaleaks-whistleblowing-software.

Stack principale: backend in Python, frontend in TypeScript/Angular, HTML/CSS/JS, shell, pensato per Debian e uso opzionale via Tor.

La licenza indicata nel README è AGPLv3 con termini addizionali (sezione 7): serve a garantire che gli utenti (i whistleblower) siano informati sulla tecnologia e che gli admin mantengano i sistemi aggiornati.

Cosa ti permette l’AGPL (in soldoni)
Puoi:

Forkare il progetto, modificarlo (branding, feature, integrazioni) e offrire un servizio a pagamento (hosting gestito, setup, supporto, consulenza) basato su GlobaLeaks.

Devi:

Mantenere il codice derivato sotto AGPL e rendere disponibile il sorgente a chi usa il servizio (gli utenti che accedono via rete).

Conservare note di licenza/copyright, rispettare i termini addizionali.

Non puoi:

Prendere il codice, chiuderlo, cambiare licenza e venderlo come prodotto proprietario senza offrire il sorgente corrispondente.

Quindi il modello “veloce da vendere” realistico è: servizio gestito + personalizzazioni di GlobaLeaks, oppure prodotto proprietario riscritto da zero ispirato a GlobaLeaks se non vuoi obblighi di rilascio codice.

(Non è consulenza legale, ma è il quadro standard per AGPL.)

Necessità “hard” per una piattaforma di whistleblowing
Ti metto la checklist ragionata: legale, funzionale, sicurezza, operativa.

1. Requisiti normativi minimi
Direttiva (UE) 2019/1937 + D.lgs. 24/2023 (Italia)

Canale interno per le segnalazioni, accessibile a dipendenti, fornitori, freelance ecc., con protezione da ritorsioni.

Confidenzialità dell’identità del segnalante e delle persone citate, salvo eccezioni previste dalla legge.

Possibilità di segnalazione scritta e spesso orale (telefono/voce/sistema).

ISO 37002:2021 (linee guida)

Ciclo completo: ricevere, valutare, trattare, concludere la segnalazione.

Policy e procedure documentate con ruoli e responsabilità chiare (es. RPCT, compliance, legal).

GDPR + privacy by design/by default

Minimizzazione: raccogli solo i dati strettamente necessari; niente logging invasivo del whistleblower.

DPIA raccomandata/necessaria per valutare rischi e misure di sicurezza.

Policy di retention: conservare solo per il tempo necessario alla gestione del caso e obblighi legali, poi cancellare/anonimizzare.

2. Requisiti funzionali di base
Da GlobaLeaks e da altre soluzioni “serie” si ricava un minimo comune denominatore:

Canale di segnalazione anonimo/confidenziale

Form web protetto per invio segnalazioni, con categorie, descrizione, allegati, multilingua.

Testo introduttivo che spiega chi può segnalare, che cosa e con quali protezioni.

Token/sessione per il whistleblower

Generi un token o codice univoco alla creazione del report; tramite quello il segnalante torna a leggere aggiornamenti e rispondere senza login/email.

Gestione casi per i referenti interni

Dashboard per vedere le segnalazioni, filtrarle (stato, categoria, area, canale).

Vista dettaglio con cronologia, allegati, note interne, thread di comunicazione con il segnalante.

Workflow e stati

Stati: ricevuta, in valutazione, in istruttoria, chiusa (fondata/non fondata), archiviata.

Possibilità di assegnare casi a persone/ruoli (HR, internal audit, legal).

Configurabilità

Questionari custom per cliente/ente (es. modulo specifico anticorruzione, sicurezza lavoro, privacy).

Multi‑lingua, branding, testi di policy/editabili.

3. Requisiti di sicurezza & privacy tecnica
Transport & storage security

HTTPS forte ovunque; supporto a Tor o simili è considerato best practice per l’anonimato.

Crittografia a riposo per testo delle segnalazioni e allegati, chiavi gestite con attenzione (key rotation).

Access control

Ruoli/gruppi (admin, case handler, auditor) con principle of least privilege.

Backoffice raggiungibile solo da rete interna/VPN/SSO, non pubblico.

Logging minimizzato

Nessuna memorizzazione di IP/user‑agent del whistleblower salvo motivi davvero stringenti; caso Bologna Airport mostra che logging eccessivo viola privacy by design/default.

Audit log interno su chi accede ai casi (per accountability) ma ridotto al necessario.

Data lifecycle

Meccanismi per impostare retention per canale e cancellazione automatica/anonimizzazione allo scadere.

Come usare GlobaLeaks come blueprint (fork + vendita servizio)
Se accetti il vincolo AGPL, il flusso è:

Clonare e studiare il progetto

git clone https://github.com/globaleaks/globaleaks-whistleblowing-software.git per ottenere il codice.

Consultare la documentazione ufficiale su docs.globaleaks.org per setup, configurazione e sviluppo.

Setup ambiente

Seguire le istruzioni di installazione (tipicamente Debian‑based, con dipendenze Python, database, servizi di background).

Configurare HTTPS, eventuale integrazione con Tor, backup, monitoring secondo le linee guida GlobaLeaks.

Branding e personalizzazione

Modificare logo, colori, testi, lingue e questionari tramite configurazione o modifiche al frontend (Angular/TS) e alle template HTML.

Creare preset di questionari per diversi tipi di clienti (PA, PMI, corporate) che rispettano Direttiva UE, D.lgs. 24/2023 e ISO 37002.

Hardening e compliance “out‑of‑the‑box”

Pre‑configurare il sistema con: logging ridotto (no IP), retention default sensata (es. 24/60 mesi), ruoli base, informativa privacy e policy whistleblowing pronte da mostrare.

Documentare le misure di sicurezza (es. criteri probabilmente simili a ISO 27001, OWASP, ecc.), come fanno molte piattaforme sul proprio trust center.

Modello di business

Vendere:

setup e personalizzazione iniziale,

hosting gestito (SaaS) con SLA, backup, aggiornamenti,

consulenza per DPIA, policy, formazione, integrazione con processi interni.

Mettere a disposizione il sorgente della tua versione (repo pubblica o su richiesta ai clienti) per rispettare l’AGPL; tu monetizzi su infrastruttura, supporto e know‑how, non sulla chiusura del codice.

Come usarla solo come “spec” e vendere una piattaforma proprietaria
Se preferisci mantenere il codice chiuso:

Prendere GlobaLeaks come reference funzionale

Usi i flussi, la struttura UI e le feature di GlobaLeaks per definire i tuoi requisiti (flussi di segnalazione, gestione casi, questionari, ruoli).

Usi le linee guida ISO 37002 e la Direttiva UE per definire il workflow e i requisiti formali.

Riscrivere il backend+frontend

Implementi un tuo stack (es. FastAPI + React/Vue, oppure altro) con il modello dati e le API che rispettano tutti i requisiti sopra (anonimato, token, logging minimo, retention, RBAC).

Integra direttamente nel codice/meccanismi le logiche GDPR (minimizzazione, privacy by default) che hai desunto dai casi studio e dalle best practice.

Documentare e vendere il prodotto

Scrivi policy, informativa privacy e guida utente ispirandoti alle raccomandazioni di compliance e alle pratiche dei vendor esistenti.

A questo punto la piattaforma è tua, e puoi licenziarla commercialmente come vuoi (fermo restando, ovviamente, il rispetto di tutte le normative).

TL;DR operativo per “farla al volo e venderla”
Se vuoi andare più veloce possibile:

Forki GlobaLeaks, lo brandizzi, pre‑configuri security/compliance sensate, impacchetti deploy (Docker/Ansible/whatever), e vendi servizi (setup/hosting/supporto) con codice AGPL disponibile.

Se vuoi un prodotto proprietario:

Usi GlobaLeaks + normative/ISO come blueprint dei requisiti, ma scrivi backend/frontend nuovi; vendi la piattaforma come proprietaria perché non è un’opera derivata del loro codice.

Se mi dici quale delle due strade ti interessa di più (fork AGPL vs rewrite proprietario), posso aiutarti a buttare giù uno schema DB e un’architettura pronta da incollare in Claude Code per partire davvero “a volo a volo”.