import { ReactNode, useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";

interface Branding {
  name?: string;
  primary_color?: string;
  logo_url?: string;
}

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const [brand, setBrand] = useState<Branding>({});

  useEffect(() => {
    api
      .publicConfig()
      .then((cfg) => {
        const b = (cfg.branding ?? {}) as Branding;
        setBrand(b);
        if (b.primary_color && /^#[0-9a-fA-F]{3,8}$/.test(b.primary_color)) {
          document.documentElement.style.setProperty("--color-accent", b.primary_color);
        }
        if (b.name) document.title = b.name;
      })
      .catch(() => {});
  }, []);

  const title = brand.name || t("brand");

  return (
    <>
      <a className="skip-link" href="#main">
        {t("skip")}
      </a>
      <header className="header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {brand.logo_url ? (
          <img src={brand.logo_url} alt={title} style={{ height: 32, display: "block" }} />
        ) : (
          <div className="brand">{title}</div>
        )}
        <span style={{ flex: 1 }} />
        <select
          aria-label="Lingua / Language"
          value={lang}
          onChange={(e) => setLang(e.target.value as "it" | "en")}
          style={{ width: "auto", padding: "4px 8px", background: "#fff" }}
        >
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
      </header>
      <main id="main" className="container">
        {children}
      </main>
      <footer className="footer">
        <p className="muted">{t("footer")}</p>
      </footer>
    </>
  );
}
