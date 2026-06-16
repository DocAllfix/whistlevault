import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Field, PublicContext, Questionnaire } from "../api";
import { FieldInput, FieldValue } from "../components/Field";
import { loc, useI18n } from "../i18n";
import { generateReceipt, initZk, wbKeypair } from "../zk";

type Phase = "loading" | "channel" | "form" | "review" | "submitting" | "error";

function Stepper({ steps, current }: { steps: number; current: number }) {
  const { t } = useI18n();
  return (
    <div className="stepper" aria-label={t("step")}>
      {Array.from({ length: steps }).map((_, i) => (
        <span key={i} className={`step-pill ${i === current ? "active" : i < current ? "done" : ""}`}>
          {t("step")} {i + 1}
        </span>
      ))}
      <span className={`step-pill ${current >= steps ? "active" : ""}`}>{t("summary")}</span>
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

      // Zero-knowledge: generate the receipt + keypair client-side; the server
      // only receives the public key and never sees the receipt.
      await initZk();
      const receipt = generateReceipt();
      const kp = await wbKeypair(receipt);
      const res = await api.submit(
        contextId,
        payload,
        Object.keys(idPayload).length ? idPayload : undefined,
        kp.pubB64,
      );
      for (const f of fileUploads) await api.uploadFile(res.token, f);
      navigate("/ricevuta", { state: { receipt } });
    } catch (e) {
      fail(e);
    }
  }

  if (phase === "loading" || phase === "submitting") return <p>{t("loading")}</p>;
  if (phase === "error")
    return (
      <>
        <h1>{t("problem")}</h1>
        <p className="error-text">{error}</p>
      </>
    );

  if (phase === "channel")
    return (
      <>
        <h1>{t("choose_channel")}</h1>
        <p>{t("choose_channel_sub")}</p>
        {contexts.map((c) => (
          <div className="card" key={c.id}>
            <h2 style={{ marginTop: 0 }}>{loc(c.name, lang)}</h2>
            <p>{loc(c.description, lang)}</p>
            <button className="btn btn-primary" onClick={() => selectContext(c.id)}>
              {t("select")}
            </button>
          </div>
        ))}
      </>
    );

  if (phase === "review")
    return (
      <>
        <Stepper steps={steps.length} current={steps.length} />
        <h1>{t("review_title")}</h1>
        <p>{t("review_sub")}</p>
        {steps.map((s) =>
          s.fields.map((f) => (
            <div className="card" key={f.id} style={{ padding: 16 }}>
              <strong>{loc(f.label, lang)}</strong>
              <div className="muted">{formatValue(answers[f.id])}</div>
            </div>
          )),
        )}

        <h2>{t("identity_optional")}</h2>
        <div className="notice">
          {t("identity_note_pre")}
          <strong>{t("identity_note_anon")}</strong>
          {t("identity_note_mid")}
          <strong>{t("identity_note_enc")}</strong>
          {t("identity_note_post")}
        </div>
        <label htmlFor="id-nome">{t("name")}</label>
        <input id="id-nome" type="text" value={identity.nome} onChange={(e) => setIdentity({ ...identity, nome: e.target.value })} />
        <label htmlFor="id-contatto">{t("contact")}</label>
        <input id="id-contatto" type="text" value={identity.contatto} onChange={(e) => setIdentity({ ...identity, contatto: e.target.value })} />

        <div className="btn-row">
          <button className="btn btn-secondary" onClick={() => setPhase("form")}>
            {t("back")}
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {t("submit_report")}
          </button>
        </div>
      </>
    );

  return (
    <>
      <Stepper steps={steps.length} current={stepIndex} />
      <h1>{loc(currentStep.label, lang) || t("brand")}</h1>
      {loc(currentStep.description, lang) && <p>{loc(currentStep.description, lang)}</p>}
      {currentStep.fields.filter(isVisible).map((f) => (
        <FieldInput key={f.id} field={f} value={answers[f.id]} onChange={(v) => setValue(f, v)} />
      ))}
      {missingRequired.length > 0 && (
        <p className="error-text" role="alert" style={{ marginTop: 16 }}>
          {t("fill_required")}
        </p>
      )}
      <div className="btn-row">
        {stepIndex > 0 && (
          <button className="btn btn-secondary" onClick={() => setStepIndex(stepIndex - 1)}>
            {t("back")}
          </button>
        )}
        <button className="btn btn-primary" onClick={next} disabled={missingRequired.length > 0}>
          {stepIndex < steps.length - 1 ? t("next") : t("review")}
        </button>
      </div>
    </>
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
