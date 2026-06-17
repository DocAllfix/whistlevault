import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n";
import { VaultMark } from "./icons";

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
          document.documentElement.style.setProperty("--wv-accent", b.primary_color);
        }
        if (b.name) document.title = b.name;
      })
      .catch(() => {});
  }, []);

  const title = brand.name || "Whistlevault";

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-wv-navy focus:px-4 focus:py-2 focus:text-white"
        href="#main"
      >
        {t("skip")}
      </a>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-wv-navy text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-white">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={title} className="h-7" />
            ) : (
              <>
                <VaultMark size={26} className="text-[#7cc3ea]" />
                <span className="text-lg">{title}</span>
              </>
            )}
          </Link>
          <div className="flex-1" />
          <select
            aria-label="Lingua / Language"
            value={lang}
            onChange={(e) => setLang(e.target.value as "it" | "en")}
            className="h-9 cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 [&>option]:text-wv-navy"
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-white/10 bg-wv-navy text-white/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-5 px-5 py-8">
          <span className="flex items-center gap-2 font-semibold text-white">
            <VaultMark size={18} className="text-[#7cc3ea]" />
            {title}
          </span>
          <p className="max-w-[70ch] text-sm leading-relaxed">{t("footer")}</p>
        </div>
      </footer>
    </div>
  );
}
