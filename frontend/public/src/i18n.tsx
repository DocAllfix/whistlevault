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
    landing_h1: "Segnala in modo sicuro e riservato",
    landing_lead:
      "Questo canale ti permette di segnalare illeciti o irregolarità in modo confidenziale. La tua identità è protetta e nessuna ritorsione è ammessa.",
    before_start: "Prima di iniziare",
    bullet_device: "Non usare un dispositivo o una rete dell'organizzazione, se possibile.",
    bullet_anon: "Non sei obbligato a fornire il tuo nome né un indirizzo email.",
    bullet_receipt_pre: "Al termine riceverai un ",
    bullet_receipt_strong: "codice di 16 cifre",
    bullet_receipt_post:
      ": conservalo, è l'unico modo per rientrare e seguire la tua segnalazione.",
    cta_submit: "Invia una segnalazione",
    cta_check: "Controlla la tua segnalazione",
    how_title: "Come funziona",
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
    copied: "Copiato ✓",
    go_check: 'Vai a "Controlla la tua segnalazione"',
    check_title: "Controlla la tua segnalazione",
    check_sub: "Inserisci il codice di 16 cifre ricevuto al momento dell'invio.",
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
    record_voice: "● Registra messaggio vocale",
    stop_voice: "■ Ferma registrazione",
    mic_error: "Microfono non disponibile o permesso negato.",
  },
  en: {
    skip: "Skip to content",
    brand: "Reporting channel",
    footer:
      "This channel is confidential and protected. Reports are encrypted and handled under EU Directive 2019/1937 and Italian Decree 24/2023. No IP addresses or browsing data are recorded.",
    landing_h1: "Report safely and confidentially",
    landing_lead:
      "This channel lets you report wrongdoing confidentially. Your identity is protected and retaliation is not allowed.",
    before_start: "Before you start",
    bullet_device: "Avoid using an organization device or network, if possible.",
    bullet_anon: "You are not required to provide your name or an email address.",
    bullet_receipt_pre: "At the end you will receive a ",
    bullet_receipt_strong: "16-digit code",
    bullet_receipt_post: ": keep it, it is the only way to return and follow your report.",
    cta_submit: "Submit a report",
    cta_check: "Check your report",
    how_title: "How it works",
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
    copied: "Copied ✓",
    go_check: 'Go to "Check your report"',
    check_title: "Check your report",
    check_sub: "Enter the 16-digit code you received when submitting.",
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
    record_voice: "● Record voice message",
    stop_voice: "■ Stop recording",
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
