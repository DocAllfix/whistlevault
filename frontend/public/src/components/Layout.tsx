import { ReactNode, useEffect, useState } from "react";
import { api } from "../api";

export function t(map: Record<string, string> | undefined, lang = "it"): string {
  if (!map) return "";
  return map[lang] ?? map["en"] ?? Object.values(map)[0] ?? "";
}

interface Branding {
  name?: string;
  primary_color?: string;
  logo_url?: string;
}

export function Layout({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Branding>({});

  useEffect(() => {
    api
      .publicConfig()
      .then((cfg) => {
        const b = (cfg.branding ?? {}) as Branding;
        setBrand(b);
        // Apply the client's primary colour as the accent (white-label).
        if (b.primary_color && /^#[0-9a-fA-F]{3,8}$/.test(b.primary_color)) {
          document.documentElement.style.setProperty("--color-accent", b.primary_color);
        }
        if (b.name) document.title = b.name;
      })
      .catch(() => {
        /* branding is optional; ignore failures */
      });
  }, []);

  const title = brand.name || "Canale di segnalazione";

  return (
    <>
      <a className="skip-link" href="#main">
        Salta al contenuto
      </a>
      <header className="header">
        {brand.logo_url ? (
          <img src={brand.logo_url} alt={title} style={{ height: 32, display: "block" }} />
        ) : (
          <div className="brand">{title}</div>
        )}
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
