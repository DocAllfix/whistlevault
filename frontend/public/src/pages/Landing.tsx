import { motion, type Variants } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Check, EyeOff, Lock, Scale, ShieldCheck } from "../components/icons";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useI18n } from "../i18n";

const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

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

  return (
    <>
      {/* Hero */}
      <section className="px-5 pb-16 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div variants={fade} initial="hidden" animate="show" custom={0}>
            <Badge className="mb-6 px-3 py-1">
              <Lock size={14} />
              {t("hero_pill")}
            </Badge>
          </motion.div>
          <motion.h1
            variants={fade}
            initial="hidden"
            animate="show"
            custom={1}
            className="text-balance text-4xl font-bold leading-[1.1] text-wv-navy sm:text-5xl"
          >
            {t("hero_h1")}
          </motion.h1>
          <motion.p
            variants={fade}
            initial="hidden"
            animate="show"
            custom={2}
            className="mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-muted-foreground"
          >
            {t("hero_lead")}
          </motion.p>
          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Button asChild size="lg">
              <Link to="/segnala">
                {t("cta_submit")}
                <ArrowRight size={18} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/controlla">{t("cta_check")}</Link>
            </Button>
          </motion.div>
          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground"
          >
            {[t("assure_account"), t("assure_ip"), t("assure_track")].map((a) => (
              <span key={a} className="inline-flex items-center gap-1.5">
                <Check size={16} className="text-wv-success" />
                {a}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-3">
          {trust.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className={
                "px-6 py-10 " +
                (i > 0 ? "border-t md:border-l md:border-t-0" : "")
              }
            >
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-wv-accent-tint text-wv-accent">
                <Icon size={22} />
              </span>
              <h3 className="mb-2 text-base font-semibold text-wv-navy">{title}</h3>
              <p className="max-w-[34ch] text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold text-wv-navy">{t("how_title")}</h2>
          <p className="mt-2 text-lg text-muted-foreground">{t("how_sub")}</p>
          <ol className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-lg border bg-white p-6 shadow-sm">
                <span className="mb-4 inline-flex h-9 items-center justify-center rounded-md bg-wv-accent-tint px-2.5 font-mono text-sm font-semibold text-wv-accent">
                  {s.n}
                </span>
                <h3 className="mb-2 text-base font-semibold text-wv-navy">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Legal band */}
      <section className="border-t bg-wv-surface2">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-wv-accent-tint text-wv-accent">
            <ShieldCheck size={22} />
          </span>
          <h2 className="text-2xl font-semibold text-wv-navy">{t("legal_title")}</h2>
          <p className="mt-3 max-w-[72ch] text-secondary-foreground/80">{t("legal_text")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Direttiva (UE) 2019/1937", "D.lgs. 24/2023", "GDPR"].map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-wv-border-strong bg-white px-2.5 py-1 font-mono text-xs font-semibold text-wv-navy"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
