# Accordo sul Trattamento dei Dati (DPA) — Art. 28 GDPR

*Tra [ORGANIZZAZIONE] ("Titolare") e [FORNITORE] ("Responsabile") — [DATA]*

> Da utilizzare nel modello **SaaS**, quando il fornitore della piattaforma ospita il servizio
> per conto del cliente.

## 1. Oggetto e durata
Il Responsabile tratta i dati personali per conto del Titolare al solo fine di erogare e
mantenere la piattaforma di whistleblowing, per la durata del contratto di servizio.

## 2. Natura e finalità del trattamento
Hosting, manutenzione, backup e supporto della piattaforma. Categorie di dati: contenuto delle
segnalazioni e allegati (cifrati), eventuali dati identificativi. Categorie di interessati:
segnalanti e persone coinvolte.

## 3. Obblighi del Responsabile (art. 28.3)
1. Trattare i dati solo su **istruzione documentata** del Titolare.
2. Garantire la **riservatezza** del personale autorizzato.
3. Adottare le misure di sicurezza dell'**art. 32** (cifratura a riposo, controllo accessi,
   2FA, audit log, isolamento per cliente, hosting in **UE**).
4. Non ricorrere a **sub-responsabili** senza autorizzazione; in tal caso applicare gli stessi
   obblighi. Elenco sub-responsabili: [ELENCO o "nessuno"].
5. Assistere il Titolare per il riscontro alle richieste degli interessati e per gli obblighi
   degli artt. 32-36.
6. **Notificare** al Titolare ogni violazione di dati senza ingiustificato ritardo (≤ [24/48] ore).
7. A fine contratto, **cancellare o restituire** i dati a scelta del Titolare.
8. Mettere a disposizione le informazioni necessarie a dimostrare la conformità e consentire
   **audit**.

## 4. Misure tecniche e organizzative (allegato)
- Cifratura dei contenuti a riposo (libsodium) e TLS in transito.
- Accesso basato sui ruoli (RBAC) e autenticazione a due fattori per i gestori.
- Registro degli accessi senza contenuto né IP del segnalante.
- Istanza e database **isolati per cliente**; data residency **UE**.
- Backup cifrati e procedura di ripristino documentata.
- Cancellazione automatica secondo la retention concordata.

## 5. Trasferimenti extra-UE
Assenti per impostazione predefinita. Eventuali trasferimenti solo con garanzie adeguate
(Cap. V GDPR) e previa autorizzazione del Titolare.

Titolare: ________________   Responsabile: ________________
