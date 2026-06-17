import { Link } from "react-router-dom";
import { ArrowRight, Check, EyeOff, KeyRound, Lock, Scale, ShieldCheck } from "../components/icons";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useI18n } from "../i18n";

/** Inline product preview: a faux secure-channel window (no external image). */
function ChannelPreview({ label }: { label: string }) {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-tr from-wv-accent/15 to-wv-accent-2/15 blur-2xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-lg ring-1 ring-wv-navy/5">
        <div className="flex items-center gap-2 border-b border-border bg-wv-surface2 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E2575C]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E8B339]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#3BB273]" />
          <span className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-border">
            <Lock size={12} /> whistlevault.eu
          </span>
        </div>
        <div className="space-y-4 p-6">
          <Badge variant="success"><Check size={13} /> Segnalazione inviata</Badge>
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
            <div className="rounded-xl bg-wv-navy px-4 py-3 text-center font-mono text-lg font-semibold tracking-[0.22em] text-white">
              8421 7390 5512 0146
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock size={15} className="text-wv-accent" /> Cifrato end-to-end nel tuo browser
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-wv-accent-tint px-3.5 py-2 text-sm text-wv-navy">
              Ho allegato i documenti richiesti.
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-wv-surface2 px-3.5 py-2 text-sm text-wv-navy">
              Grazie. La segnalazione è in gestione.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  const { t } = useI18n();

  const trust = [
    { icon: Lock, title: t("trust_enc_t"), body: t("trust_enc_d") },
    { icon: EyeOff, title: t("trust_anon_t"), body: t("trust_anon_d") },
    { icon: Scale, title: t("trust_legal_t"), body: t("trust_legal_d") },
  ];
  const steps = [
    { n: "01", title: t("step1_t"), body: t("step1_d") },
    { n: "02", title: t("step2_t"), body: t("step2_d") },
    { n: "03", title: t("step3_t"), body: t("step3_d") },
  ];
  const sec = [
    { icon: Lock, title: t("sec_1_t"), body: t("sec_1_d") },
    { icon: EyeOff, title: t("sec_2_t"), body: t("sec_2_d") },
    { icon: KeyRound, title: t("sec_3_t"), body: t("sec_3_d") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* mesh background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 15% 10%, rgba(37,99,235,0.10), transparent 70%), radial-gradient(50% 50% at 90% 0%, rgba(99,102,241,0.10), transparent 70%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge className="mb-6 animate-fade-up px-3 py-1">
              <Lock size={14} /> {t("hero_pill")}
            </Badge>
            <h1 className="animate-fade-up text-balance text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-wv-navy sm:text-6xl" style={{ animationDelay: "60ms" }}>
              {t("hero_h1")}
            </h1>
            <p className="mt-5 max-w-[48ch] animate-fade-up text-lg leading-relaxed text-muted-foreground" style={{ animationDelay: "120ms" }}>
              {t("hero_lead")}
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3" style={{ animationDelay: "180ms" }}>
              <Button asChild size="lg" className="bg-gradient-to-r from-wv-accent to-wv-accent-2 shadow-glow hover:opacity-95">
                <Link to="/segnala">{t("cta_submit")} <ArrowRight size={18} /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/controlla">{t("cta_check")}</Link>
              </Button>
            </div>
            <div className="mt-7 flex animate-fade-up flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground" style={{ animationDelay: "240ms" }}>
              {[t("assure_account"), t("assure_ip"), t("assure_track")].map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5">
                  <Check size={16} className="text-wv-success" /> {a}
                </span>
              ))}
            </div>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <ChannelPreview label={t("hero_preview_label")} />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-3">
          {trust.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className={"px-6 py-10 " + (i > 0 ? "border-t border-border md:border-l md:border-t-0" : "")}>
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-wv-accent-tint text-wv-accent">
                <Icon size={22} />
              </span>
              <h3 className="mb-2 text-lg text-wv-navy">{title}</h3>
              <p className="max-w-[34ch] text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security deep-dive (dark band) */}
      <section className="bg-wv-navy text-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-white">{t("sec_title")}</h2>
          <p className="mt-3 max-w-2xl text-lg text-white/70">{t("sec_lead")}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {sec.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-wv-accent/20 text-[#93B4FF]">
                  <Icon size={20} />
                </span>
                <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-wv-navy">{t("how_title")}</h2>
          <p className="mt-2 text-lg text-muted-foreground">{t("how_sub")}</p>
          <ol className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-2xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <span className="mb-4 inline-flex h-10 items-center justify-center rounded-lg bg-wv-accent-tint px-3 font-mono text-sm font-bold text-wv-accent">{s.n}</span>
                <h3 className="mb-2 text-lg text-wv-navy">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Legal band */}
      <section className="border-t border-border bg-wv-surface2">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-wv-accent shadow-sm">
            <ShieldCheck size={22} />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-wv-navy">{t("legal_title")}</h2>
          <p className="mt-3 max-w-[72ch] leading-relaxed text-wv-navy-600">{t("legal_text")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Direttiva (UE) 2019/1937", "D.lgs. 24/2023", "GDPR"].map((tag) => (
              <span key={tag} className="rounded-lg border border-wv-border-strong bg-white px-3 py-1.5 font-mono text-xs font-semibold text-wv-navy">{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA band */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-wv-navy to-[#1b2a4a] px-8 py-14 text-center shadow-lg">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{t("cta_band_title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">{t("cta_band_sub")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-wv-navy hover:bg-white/90">
              <Link to="/segnala">{t("cta_submit")} <ArrowRight size={18} /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
              <Link to="/controlla">{t("cta_check")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
