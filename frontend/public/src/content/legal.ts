// Public legal content (Informativa privacy + Note legali) for the reporting
// portal. Concise, system-accurate text; the client organization's legal team
// finalizes specifics. Localized IT/EN. No PII, no tracking is described because
// none is collected.

export interface LegalSection {
  h: string;
  p: string[];
}
export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const privacy: Record<"it" | "en", LegalDoc> = {
  it: {
    title: "Informativa sulla privacy",
    updated: "Documento informativo · da personalizzare a cura del titolare",
    intro:
      "Questa informativa descrive come vengono trattati i dati nell'ambito del canale di segnalazione (whistleblowing), nel rispetto del Regolamento (UE) 2016/679 (GDPR) e del D.lgs. 24/2023.",
    sections: [
      {
        h: "Titolare e responsabile del trattamento",
        p: [
          "Titolare del trattamento è l'organizzazione che mette a disposizione questo canale. Il fornitore della piattaforma agisce come responsabile del trattamento e non accede ai contenuti delle segnalazioni.",
        ],
      },
      {
        h: "Quali dati trattiamo (minimizzazione)",
        p: [
          "Vengono trattati esclusivamente i dati che inserisci nella segnalazione e, se decidi di fornirla, la tua identità.",
          "Non vengono raccolti né registrati indirizzi IP, user-agent o dati di navigazione: la segnalazione può essere inviata in forma anonima.",
        ],
      },
      {
        h: "Finalità e base giuridica",
        p: [
          "I dati sono trattati per ricevere e gestire le segnalazioni di illeciti secondo il D.lgs. 24/2023. La base giuridica è l'adempimento di un obbligo legale e il perseguimento dell'interesse pubblico connesso.",
        ],
      },
      {
        h: "Come proteggiamo i dati",
        p: [
          "I contenuti sono cifrati e leggibili solo dalle persone autorizzate alla gestione. L'eventuale identità è cifrata separatamente e svelabile solo previa autorizzazione di un custode. Il dialogo di rientro è protetto e i dati sono conservati in regioni UE.",
        ],
      },
      {
        h: "Conservazione",
        p: [
          "I dati sono conservati per il tempo necessario alla gestione della segnalazione e agli adempimenti di legge, quindi cancellati o anonimizzati secondo la policy di conservazione del titolare.",
        ],
      },
      {
        h: "Comunicazione dei dati",
        p: [
          "I dati sono accessibili solo ai gestori autorizzati e, per l'identità, ai custodi. Non sono mai comunicati alla persona segnalata. La riservatezza dell'identità del segnalante è garantita anche verso i gestori.",
        ],
      },
      {
        h: "Diritti dell'interessato",
        p: [
          "Puoi esercitare i diritti previsti dagli artt. 15-22 GDPR (accesso, rettifica, cancellazione, limitazione), nei limiti compatibili con la tutela della riservatezza e con gli obblighi della normativa whistleblowing. Per esercitarli contatta il titolare del trattamento.",
        ],
      },
      {
        h: "Contatti",
        p: [
          "Per qualsiasi richiesta relativa al trattamento dei dati, contatta il titolare del trattamento (o il suo Responsabile della protezione dei dati, ove nominato).",
        ],
      },
    ],
  },
  en: {
    title: "Privacy notice",
    updated: "Informational document · to be finalized by the data controller",
    intro:
      "This notice describes how data is processed within the whistleblowing reporting channel, in compliance with Regulation (EU) 2016/679 (GDPR) and Italian Legislative Decree 24/2023.",
    sections: [
      {
        h: "Controller and processor",
        p: [
          "The data controller is the organization providing this channel. The platform vendor acts as data processor and does not access the content of reports.",
        ],
      },
      {
        h: "What data we process (minimization)",
        p: [
          "Only the data you enter in the report is processed, plus your identity if you choose to provide it.",
          "No IP address, user-agent or browsing data is collected or stored: a report can be submitted anonymously.",
        ],
      },
      {
        h: "Purpose and legal basis",
        p: [
          "Data is processed to receive and handle reports of wrongdoing under Decree 24/2023. The legal basis is compliance with a legal obligation and the related public interest.",
        ],
      },
      {
        h: "How we protect data",
        p: [
          "Content is encrypted and readable only by authorized handlers. Any identity is encrypted separately and disclosed only upon a custodian's authorization. The return channel is protected and data is stored in EU regions.",
        ],
      },
      {
        h: "Retention",
        p: [
          "Data is kept for the time needed to handle the report and to meet legal obligations, then deleted or anonymized according to the controller's retention policy.",
        ],
      },
      {
        h: "Disclosure",
        p: [
          "Data is accessible only to authorized handlers and, for identity, to custodians. It is never disclosed to the reported person. The reporter's identity is kept confidential, including from handlers.",
        ],
      },
      {
        h: "Your rights",
        p: [
          "You may exercise the rights under GDPR Art. 15-22 (access, rectification, erasure, restriction), within the limits compatible with confidentiality and whistleblowing obligations. Contact the data controller to exercise them.",
        ],
      },
      {
        h: "Contact",
        p: ["For any request regarding data processing, contact the data controller (or its Data Protection Officer, where appointed)."],
      },
    ],
  },
};

export const legal: Record<"it" | "en", LegalDoc> = {
  it: {
    title: "Note legali",
    updated: "Documento informativo · da personalizzare a cura del titolare",
    intro: "Condizioni d'uso del canale di segnalazione.",
    sections: [
      {
        h: "Natura del servizio",
        p: [
          "Questo canale consente di segnalare illeciti in modo riservato, ai sensi del D.lgs. 24/2023 e della Direttiva (UE) 2019/1937. È riservato alle finalità di whistleblowing previste dalla normativa.",
        ],
      },
      {
        h: "Uso corretto",
        p: [
          "Le segnalazioni devono essere effettuate in buona fede. L'uso improprio o le segnalazioni manifestamente infondate effettuate in mala fede possono avere conseguenze secondo la legge applicabile.",
        ],
      },
      {
        h: "Riservatezza e tutela",
        p: [
          "L'identità del segnalante è tutelata e non può essere rivelata senza le garanzie previste dalla normativa. È vietata ogni forma di ritorsione nei confronti di chi segnala.",
        ],
      },
      {
        h: "Riferimenti normativi",
        p: ["Direttiva (UE) 2019/1937 · D.lgs. 24/2023 · Regolamento (UE) 2016/679 (GDPR)."],
      },
    ],
  },
  en: {
    title: "Legal notice",
    updated: "Informational document · to be finalized by the data controller",
    intro: "Terms of use for the reporting channel.",
    sections: [
      {
        h: "Nature of the service",
        p: [
          "This channel allows confidential reporting of wrongdoing under Decree 24/2023 and Directive (EU) 2019/1937. It is reserved for the whistleblowing purposes set out by law.",
        ],
      },
      {
        h: "Acceptable use",
        p: [
          "Reports must be made in good faith. Misuse or manifestly unfounded reports made in bad faith may have consequences under applicable law.",
        ],
      },
      {
        h: "Confidentiality and protection",
        p: [
          "The reporter's identity is protected and cannot be disclosed without the safeguards required by law. Any form of retaliation against reporters is prohibited.",
        ],
      },
      {
        h: "Legal references",
        p: ["Directive (EU) 2019/1937 · Decree 24/2023 · Regulation (EU) 2016/679 (GDPR)."],
      },
    ],
  },
};
