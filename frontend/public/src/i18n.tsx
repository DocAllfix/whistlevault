import { createContext, ReactNode, useContext, useState } from "react";

export type Lang = "it" | "en";

// Right-to-left languages (framework-ready; none among it/en).
const RTL: Lang[] = [];

const dict: Record<Lang, Record<string, string>> = {
  it: {
    skip: "Salta al contenuto",
    brand: "Canale di segnalazione",
    footer:
      "Questo canale è riservato e protetto. Le segnalazioni sono cifrate e gestite secondo la Direttiva (UE) 2019/1937 e il D.lgs. 24/2023. Non vengono registrati indirizzi IP né dati di navigazione.",
    privacy_link: "Informativa privacy",
    legal_link: "Note legali",
    landing_h1: "Segnala in modo sicuro e riservato",
    landing_lead:
      "Questo canale ti permette di segnalare illeciti o irregolarità in modo confidenziale. La tua identità è protetta e nessuna ritorsione è ammessa.",
    before_start: "Prima di iniziare",
    bullet_device: "Non usare un dispositivo o una rete dell'organizzazione, se possibile.",
    bullet_anon: "Non sei obbligato a fornire il tuo nome né un indirizzo email.",
    bullet_receipt_pre: "Al termine riceverai un ",
    bullet_receipt_strong: "codice di 20 cifre",
    bullet_receipt_post:
      ": conservalo, è l'unico modo per rientrare e seguire la tua segnalazione.",
    cta_submit: "Invia una segnalazione",
    cta_check: "Ho già un codice",
    hero_pill: "Canale ufficiale · cifrato end-to-end",
    hero_h1: "Segnala in sicurezza, in totale riservatezza.",
    hero_lead:
      "Un canale cifrato per segnalare illeciti. La tua identità è protetta, nessuna ritorsione è ammessa e nessuno può leggere la segnalazione tranne i gestori autorizzati.",
    assure_account: "Nessun account",
    assure_ip: "Nessun IP registrato",
    assure_track: "Nessun tracciamento",
    trust_enc_t: "Cifratura end-to-end",
    trust_enc_d: "Il contenuto è cifrato sul tuo dispositivo. Solo i gestori autorizzati possono decifrarlo e leggerlo.",
    trust_anon_t: "Anonimato reale",
    trust_anon_d: "Nessun account, nessun indirizzo IP, nessun metadato di navigazione. Segnali senza lasciare tracce.",
    trust_legal_t: "Tutela di legge",
    trust_legal_d: "Procedura conforme alla Direttiva (UE) 2019/1937, al D.lgs. 24/2023 e al GDPR.",
    how_title: "Come funziona",
    how_sub: "Tre passi. Nessuna registrazione, nessun dato personale obbligatorio.",
    step1_t: "Compila la segnalazione",
    step1_d: "Un questionario guidato, anche in forma anonima. Puoi allegare documenti o un messaggio vocale.",
    step2_t: "Ricevi un codice",
    step2_d: "Un codice di 20 cifre, generato sul tuo dispositivo: è l'unica chiave per rientrare. Conservalo.",
    step3_t: "Dialoga in sicurezza",
    step3_d: "Rientra col codice per leggere le risposte dei gestori, aggiungere informazioni e seguire lo stato.",
    legal_title: "Protetto dalla legge",
    legal_text:
      "Le segnalazioni sono gestite secondo procedure di whistleblowing conformi alla normativa europea e italiana. Sono vietate ritorsioni nei confronti di chi segnala in buona fede. I dati sono conservati per il tempo strettamente necessario e poi cancellati o anonimizzati.",
    sec_title: "Come proteggiamo la tua identità",
    sec_lead: "La sicurezza non è una promessa: è il modo in cui è costruito il canale.",
    sec_1_t: "Cifrato sul dispositivo",
    sec_1_d: "La segnalazione viene cifrata nel tuo browser prima di partire. Il server riceve solo testo cifrato.",
    sec_2_t: "Il server non può leggere",
    sec_2_d: "Solo i gestori autorizzati possiedono la chiave per decifrare. Il canale di ritorno è zero-knowledge.",
    sec_3_t: "Nessuna traccia",
    sec_3_d: "Niente account, niente indirizzo IP, niente metadati di navigazione. Rientri solo col tuo codice.",
    cta_band_title: "Pronto a segnalare in sicurezza?",
    cta_band_sub: "Bastano pochi minuti. Nessun account, nessun dato obbligatorio.",
    nav_login: "Area gestori",
    hero_preview_label: "Anteprima canale",
    how_text:
      "Le segnalazioni vengono cifrate e rese leggibili solo ai gestori autorizzati. Puoi comunicare con loro in forma anonima tramite un canale di messaggi protetto, allegare documenti e ricevere aggiornamenti sullo stato del caso.",
    loading: "Caricamento…",
    problem: "Si è verificato un problema",
    choose_channel: "Scegli il canale",
    choose_channel_sub: "Seleziona l'ambito della tua segnalazione.",
    select: "Seleziona",
    review_title: "Rivedi e invia",
    review_sub: "Controlla le informazioni inserite prima dell'invio.",
    identity_optional: "Identità (facoltativa)",
    identity_note_pre: "Puoi segnalare in forma ",
    identity_note_anon: "anonima",
    identity_note_mid: ". Se scegli di fornire la tua identità, sarà ",
    identity_note_enc: "cifrata separatamente",
    identity_note_post: " e un gestore potrà vederla solo previa autorizzazione di un custode.",
    name: "Nome",
    contact: "Contatto (email o telefono)",
    back: "Indietro",
    submit_report: "Invia segnalazione",
    next: "Avanti",
    review: "Rivedi",
    fill_required: "Compila i campi obbligatori per continuare.",
    step: "Passo",
    summary: "Riepilogo",
    sent_title: "Segnalazione inviata",
    keep_code_strong: "Conserva questo codice.",
    keep_code:
      " È l'unico modo per rientrare, leggere le risposte e aggiungere informazioni. Non potrà essere recuperato se lo perdi.",
    copy_code: "Copia codice",
    copied: "Copiato",
    download_qr: "Scarica QR",
    print_receipt: "Stampa / Salva PDF",
    go_check: 'Vai a "Controlla la tua segnalazione"',
    check_title: "Controlla la tua segnalazione",
    check_sub: "Inserisci il codice di 20 cifre ricevuto al momento dell'invio.",
    code_label: "Codice segnalazione",
    access: "Accedi",
    verifying: "Verifica…",
    your_report: "La tua segnalazione",
    report_n: "Segnalazione n.",
    received_managed: "ricevuta e in gestione.",
    messages: "Messaggi",
    no_messages: "Nessun messaggio dai gestori per ora.",
    handler: "Gestore",
    you: "Tu",
    add_message: "Aggiungi un messaggio",
    send_message: "Invia messaggio",
    attachments: "Allegati",
    no_attachments: "Nessun allegato.",
    add_attachment: "Aggiungi un allegato",
    invalid_code: "Codice non valido",
    select_placeholder: "— Seleziona —",
    record_voice: "Registra messaggio vocale",
    stop_voice: "Ferma registrazione",
    mic_error: "Microfono non disponibile o permesso negato.",
  },
  en: {
    skip: "Skip to content",
    brand: "Reporting channel",
    footer:
      "This channel is confidential and protected. Reports are encrypted and handled under EU Directive 2019/1937 and Italian Decree 24/2023. No IP addresses or browsing data are recorded.",
    privacy_link: "Privacy notice",
    legal_link: "Legal notice",
    landing_h1: "Report safely and confidentially",
    landing_lead:
      "This channel lets you report wrongdoing confidentially. Your identity is protected and retaliation is not allowed.",
    before_start: "Before you start",
    bullet_device: "Avoid using an organization device or network, if possible.",
    bullet_anon: "You are not required to provide your name or an email address.",
    bullet_receipt_pre: "At the end you will receive a ",
    bullet_receipt_strong: "20-digit code",
    bullet_receipt_post: ": keep it, it is the only way to return and follow your report.",
    cta_submit: "Submit a report",
    cta_check: "I already have a code",
    hero_pill: "Official channel · end-to-end encrypted",
    hero_h1: "Report safely, in full confidence.",
    hero_lead:
      "An encrypted channel to report wrongdoing. Your identity is protected, retaliation is not allowed, and no one can read the report except the authorized handlers.",
    assure_account: "No account",
    assure_ip: "No IP logged",
    assure_track: "No tracking",
    trust_enc_t: "End-to-end encryption",
    trust_enc_d: "Content is encrypted on your device. Only authorized handlers can decrypt and read it.",
    trust_anon_t: "Real anonymity",
    trust_anon_d: "No account, no IP address, no browsing metadata. You report without leaving a trace.",
    trust_legal_t: "Protected by law",
    trust_legal_d: "Procedure compliant with EU Directive 2019/1937, Italian Decree 24/2023 and the GDPR.",
    how_title: "How it works",
    how_sub: "Three steps. No sign-up, no mandatory personal data.",
    step1_t: "Fill in the report",
    step1_d: "A guided questionnaire, anonymous if you wish. You can attach documents or a voice message.",
    step2_t: "Get a code",
    step2_d: "A 20-digit code, generated on your device: it is the only key to return. Keep it safe.",
    step3_t: "Talk securely",
    step3_d: "Return with the code to read handler replies, add information and follow the status.",
    legal_title: "Protected by law",
    legal_text:
      "Reports are handled under whistleblowing procedures compliant with European and Italian law. Retaliation against good-faith reporters is prohibited. Data is kept only as long as strictly necessary, then deleted or anonymized.",
    sec_title: "How we protect your identity",
    sec_lead: "Security is not a promise: it is how the channel is built.",
    sec_1_t: "Encrypted on your device",
    sec_1_d: "The report is encrypted in your browser before it leaves. The server only ever receives ciphertext.",
    sec_2_t: "The server cannot read it",
    sec_2_d: "Only authorized handlers hold the key to decrypt. The return channel is zero-knowledge.",
    sec_3_t: "No trace",
    sec_3_d: "No account, no IP address, no browsing metadata. You return only with your code.",
    cta_band_title: "Ready to report safely?",
    cta_band_sub: "It takes a few minutes. No account, no mandatory data.",
    nav_login: "Staff area",
    hero_preview_label: "Channel preview",
    how_text:
      "Reports are encrypted and readable only by authorized handlers. You can communicate with them anonymously via a secure message channel, attach documents and receive status updates.",
    loading: "Loading…",
    problem: "Something went wrong",
    choose_channel: "Choose the channel",
    choose_channel_sub: "Select the area of your report.",
    select: "Select",
    review_title: "Review and submit",
    review_sub: "Check the information before submitting.",
    identity_optional: "Identity (optional)",
    identity_note_pre: "You may report ",
    identity_note_anon: "anonymously",
    identity_note_mid: ". If you choose to provide your identity, it will be ",
    identity_note_enc: "encrypted separately",
    identity_note_post: " and a handler can see it only with a custodian's authorization.",
    name: "Name",
    contact: "Contact (email or phone)",
    back: "Back",
    submit_report: "Submit report",
    next: "Next",
    review: "Review",
    fill_required: "Fill in the required fields to continue.",
    step: "Step",
    summary: "Summary",
    sent_title: "Report submitted",
    keep_code_strong: "Keep this code.",
    keep_code:
      " It is the only way to return, read replies and add information. It cannot be recovered if you lose it.",
    copy_code: "Copy code",
    copied: "Copied",
    download_qr: "Download QR",
    print_receipt: "Print / Save PDF",
    go_check: 'Go to "Check your report"',
    check_title: "Check your report",
    check_sub: "Enter the 20-digit code you received when submitting.",
    code_label: "Report code",
    access: "Access",
    verifying: "Verifying…",
    your_report: "Your report",
    report_n: "Report no.",
    received_managed: "received and in handling.",
    messages: "Messages",
    no_messages: "No messages from handlers yet.",
    handler: "Handler",
    you: "You",
    add_message: "Add a message",
    send_message: "Send message",
    attachments: "Attachments",
    no_attachments: "No attachments.",
    add_attachment: "Add an attachment",
    invalid_code: "Invalid code",
    select_placeholder: "— Select —",
    record_voice: "Record voice message",
    stop_voice: "Stop recording",
    mic_error: "Microphone unavailable or permission denied.",
  },
};

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18n>({ lang: "it", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("it");
  function setLang(l: Lang) {
    setLangState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = RTL.includes(l) ? "rtl" : "ltr";
  }
  const t = (key: string) => dict[lang][key] ?? dict.it[key] ?? key;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

/** Resolve a localized JSON map ({it,en,...}) for the active language. */
export function loc(map: Record<string, string> | undefined, lang: Lang): string {
  if (!map) return "";
  return map[lang] ?? map["it"] ?? map["en"] ?? Object.values(map)[0] ?? "";
}
