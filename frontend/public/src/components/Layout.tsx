import { ReactNode } from "react";

export function t(map: Record<string, string> | undefined, lang = "it"): string {
  if (!map) return "";
  return map[lang] ?? map["en"] ?? Object.values(map)[0] ?? "";
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Salta al contenuto
      </a>
      <header className="header">
        <div className="brand">Canale di segnalazione</div>
      </header>
      <main id="main" className="container">
        {children}
      </main>
      <footer className="footer">
        <p className="muted">
          Questo canale è riservato e protetto. Le segnalazioni sono cifrate e gestite secondo la
          Direttiva (UE) 2019/1937 e il D.lgs. 24/2023. Non vengono registrati indirizzi IP né dati
          di navigazione.
        </p>
      </footer>
    </>
  );
}
