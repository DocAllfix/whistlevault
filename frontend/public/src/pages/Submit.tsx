import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Field, PublicContext, Questionnaire } from "../api";
import { FieldInput, FieldValue } from "../components/Field";
import { ArrowRight } from "../components/icons";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Notice } from "../components/ui/notice";
import { cn } from "../lib/utils";
import { loc, useI18n } from "../i18n";
import { generateReceipt, initZk, wbKeypair } from "../zk";

type Phase = "loading" | "channel" | "form" | "review" | "submitting" | "error";

function Stepper({ steps, current }: { steps: number; current: number }) {
  const { t } = useI18n();
  const pills = [...Array.from({ length: steps }).map((_, i) => `${t("step")} ${i + 1}`), t("summary")];
  return (
    <div className="mb-8 flex flex-wrap items-center gap-2" aria-label={t("step")}>
      {pills.map((label, i) => {
        const state = i === current ? "active" : i < current ? "done" : "todo";
        return (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
              state === "active" && "border-wv-navy bg-wv-navy text-white",
              state === "done" && "border-[#cbe3f0] bg-wv-accent-tint text-wv-accent-strong",
              state === "todo" && "border-border bg-wv-surface2 text-muted-foreground",
            )}
          >
            {state === "done" && "✓"} {label}
          </span>
        );
      })}
    </div>
  );
}

export function Submit() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [contexts, setContexts] = useState<PublicContext[]>([]);
  const [contextId, setContextId] = useState<string>("");
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, FieldValue>>({});
  const [identity, setIdentity] = useState({ nome: "", contatto: "" });

  useEffect(() => {
    api
      .publicConfig()
      .then((cfg) => {
        setContexts(cfg.contexts);
        if (cfg.contexts.length === 1) selectContext(cfg.contexts[0].id);
        else setPhase("channel");
      })
      .catch((e) => fail(e));
  }, []);

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : "Error");
    setPhase("error");
  }

  async function selectContext(id: string) {
    setContextId(id);
    setPhase("loading");
    try {
      const ctx = await api.context(id);
      setQuestionnaire(ctx.questionnaire);
      setStepIndex(0);
      setPhase("form");
    } catch (e) {
      fail(e);
    }
  }

  const steps = questionnaire?.steps ?? [];
  const currentStep = steps[stepIndex];

  const keyToId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of steps) for (const f of s.fields) if (f.key) m[f.key] = f.id;
    return m;
  }, [steps]);

  function isVisible(field: Field): boolean {
    if (!field.trigger_field_key) return true;
    const v = answers[keyToId[field.trigger_field_key]];
    return Array.isArray(v) ? (v as string[]).includes(field.trigger_value) : v === field.trigger_value;
  }

  const missingRequired = useMemo(() => {
    if (!currentStep) return [];
    return currentStep.fields.filter((f) => isVisible(f) && f.required && isEmpty(answers[f.id]));
  }, [currentStep, answers, keyToId]);

  function setValue(field: Field, v: FieldValue) {
    setAnswers((prev) => ({ ...prev, [field.id]: v }));
  }

  function next() {
    if (missingRequired.length > 0) return;
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
    else setPhase("review");
  }

  async function submit() {
    setPhase("submitting");
    try {
      const payload: Record<string, unknown> = {};
      const fileUploads: File[] = [];
      for (const step of steps) {
        for (const field of step.fields) {
          if (!isVisible(field)) continue;
          const v = answers[field.id];
          if (v === undefined) continue;
          if (field.type === "file" || field.type === "voice") {
            const files = v as File[];
            if (files.length) {
              payload[field.id] = files.map((f) => f.name);
              fileUploads.push(...files);
            }
          } else if (!isEmpty(v)) {
            payload[field.id] = v;
          }
        }
      }
      const idPayload: Record<string, string> = {};
      if (identity.nome.trim()) idPayload["nome"] = identity.nome.trim();
      if (identity.contatto.trim()) idPayload["contatto"] = identity.contatto.trim();

      await initZk();
      const receipt = generateReceipt();
      const kp = await wbKeypair(receipt);
      const res = await api.submit(contextId, payload, Object.keys(idPayload).length ? idPayload : undefined, kp.pubB64);
      for (const f of fileUploads) await api.uploadFile(res.token, f);
      navigate("/ricevuta", { state: { receipt } });
    } catch (e) {
      fail(e);
    }
  }

  const wrap = "mx-auto max-w-2xl px-5 py-12";

  if (phase === "loading" || phase === "submitting")
    return <div className={wrap}><p className="text-muted-foreground">{t("loading")}</p></div>;

  if (phase === "error")
    return (
      <div className={wrap}>
        <h1 className="mb-4 text-3xl">{t("problem")}</h1>
        <Notice variant="warn" role="alert">{error}</Notice>
      </div>
    );

  if (phase === "channel")
    return (
      <div className={wrap}>
        <h1 className="text-3xl">{t("choose_channel")}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{t("choose_channel_sub")}</p>
        <div className="mt-6 grid gap-4">
          {contexts.map((c) => (
            <Card key={c.id} className="p-6">
              <h2 className="text-xl text-wv-navy">{loc(c.name, lang)}</h2>
              <p className="mt-1 text-muted-foreground">{loc(c.description, lang)}</p>
              <Button className="mt-4" onClick={() => selectContext(c.id)}>
                {t("select")}
                <ArrowRight size={18} />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    );

  if (phase === "review")
    return (
      <div className={wrap}>
        <Stepper steps={steps.length} current={steps.length} />
        <h1 className="text-3xl">{t("review_title")}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{t("review_sub")}</p>

        <Card className="mt-6 divide-y px-6">
          {steps.map((s) =>
            s.fields.filter(isVisible).map((f) => (
              <div key={f.id} className="py-4">
                <div className="text-sm font-semibold text-wv-navy">{loc(f.label, lang)}</div>
                <div className="mt-0.5 text-secondary-foreground/80">{formatValue(answers[f.id])}</div>
              </div>
            )),
          )}
        </Card>

        <h2 className="mt-10 text-2xl">{t("identity_optional")}</h2>
        <div className="mt-3">
          <Notice variant="info">
            {t("identity_note_pre")}
            <strong>{t("identity_note_anon")}</strong>
            {t("identity_note_mid")}
            <strong>{t("identity_note_enc")}</strong>
            {t("identity_note_post")}
          </Notice>
        </div>
        <Card className="mt-4 space-y-4 p-6">
          <div>
            <Label htmlFor="id-nome">{t("name")}</Label>
            <Input id="id-nome" value={identity.nome} onChange={(e) => setIdentity({ ...identity, nome: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="id-contatto">{t("contact")}</Label>
            <Input id="id-contatto" value={identity.contatto} onChange={(e) => setIdentity({ ...identity, contatto: e.target.value })} />
          </div>
        </Card>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setPhase("form")}>{t("back")}</Button>
          <Button onClick={submit}>{t("submit_report")}</Button>
        </div>
      </div>
    );

  return (
    <div className={wrap}>
      <Stepper steps={steps.length} current={stepIndex} />
      <h1 className="text-3xl">{loc(currentStep.label, lang) || t("cta_submit")}</h1>
      {loc(currentStep.description, lang) && <p className="mt-2 text-lg text-muted-foreground">{loc(currentStep.description, lang)}</p>}
      <Card className="mt-6 space-y-5 p-6">
        {currentStep.fields.filter(isVisible).map((f) => (
          <FieldInput key={f.id} field={f} value={answers[f.id]} onChange={(v) => setValue(f, v)} />
        ))}
      </Card>
      {missingRequired.length > 0 && (
        <p className="mt-4 text-sm font-semibold text-wv-danger" role="alert">
          {t("fill_required")}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {stepIndex > 0 && (
          <Button variant="secondary" onClick={() => setStepIndex(stepIndex - 1)}>{t("back")}</Button>
        )}
        <Button onClick={next} disabled={missingRequired.length > 0}>
          {stepIndex < steps.length - 1 ? t("next") : t("review")}
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}

function isEmpty(v: FieldValue | undefined): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  return (v as unknown[]).length === 0;
}

function formatValue(v: FieldValue | undefined): string {
  if (isEmpty(v)) return "—";
  if (Array.isArray(v)) return (v as (string | File)[]).map((x) => (x instanceof File ? x.name : x)).join(", ");
  return String(v);
}
