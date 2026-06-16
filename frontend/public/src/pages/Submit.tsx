import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Field, PublicContext, Questionnaire } from "../api";
import { FieldInput, FieldValue } from "../components/Field";
import { t } from "../components/Layout";

type Phase = "loading" | "channel" | "form" | "review" | "submitting" | "error";

export function Submit() {
  const navigate = useNavigate();
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
    setError(e instanceof Error ? e.message : "Errore imprevisto");
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

  const missingRequired = useMemo(() => {
    if (!currentStep) return [];
    return currentStep.fields.filter((f) => f.required && isEmpty(answers[f.id]));
  }, [currentStep, answers]);

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
          const v = answers[field.id];
          if (v === undefined) continue;
          if (field.type === "file") {
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
      const res = await api.submit(
        contextId,
        payload,
        Object.keys(idPayload).length ? idPayload : undefined,
      );
      for (const f of fileUploads) {
        await api.uploadFile(res.token, f);
      }
      navigate("/ricevuta", { state: { receipt: res.receipt } });
    } catch (e) {
      fail(e);
    }
  }

  if (phase === "loading" || phase === "submitting") return <p>Caricamento…</p>;
  if (phase === "error")
    return (
      <>
        <h1>Si è verificato un problema</h1>
        <p className="error-text">{error}</p>
      </>
    );

  if (phase === "channel")
    return (
      <>
        <h1>Scegli il canale</h1>
        <p>Seleziona l'ambito della tua segnalazione.</p>
        {contexts.map((c) => (
          <div className="card" key={c.id}>
            <h2 style={{ marginTop: 0 }}>{t(c.name)}</h2>
            <p>{t(c.description)}</p>
            <button className="btn btn-primary" onClick={() => selectContext(c.id)}>
              Seleziona
            </button>
          </div>
        ))}
      </>
    );

  if (phase === "review")
    return (
      <>
        <Stepper steps={steps.length} current={steps.length} />
        <h1>Rivedi e invia</h1>
        <p>Controlla le informazioni inserite prima dell'invio.</p>
        {steps.map((s) =>
          s.fields.map((f) => (
            <div className="card" key={f.id} style={{ padding: 16 }}>
              <strong>{t(f.label)}</strong>
              <div className="muted">{formatValue(answers[f.id])}</div>
            </div>
          )),
        )}

        <h2>Identità (facoltativa)</h2>
        <div className="notice">
          Puoi segnalare in forma <strong>anonima</strong>. Se scegli di fornire la tua identità,
          sarà <strong>cifrata separatamente</strong> e un gestore potrà vederla solo previa
          autorizzazione di un custode.
        </div>
        <label htmlFor="id-nome">Nome</label>
        <input
          id="id-nome"
          type="text"
          value={identity.nome}
          onChange={(e) => setIdentity({ ...identity, nome: e.target.value })}
        />
        <label htmlFor="id-contatto">Contatto (email o telefono)</label>
        <input
          id="id-contatto"
          type="text"
          value={identity.contatto}
          onChange={(e) => setIdentity({ ...identity, contatto: e.target.value })}
        />

        <div className="btn-row">
          <button className="btn btn-secondary" onClick={() => setPhase("form")}>
            Indietro
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Invia segnalazione
          </button>
        </div>
      </>
    );

  // form phase
  return (
    <>
      <Stepper steps={steps.length} current={stepIndex} />
      <h1>{t(currentStep.label) || "Segnalazione"}</h1>
      {t(currentStep.description) && <p>{t(currentStep.description)}</p>}
      {currentStep.fields.map((f) => (
        <FieldInput key={f.id} field={f} value={answers[f.id]} onChange={(v) => setValue(f, v)} />
      ))}
      {missingRequired.length > 0 && (
        <p className="error-text" role="alert" style={{ marginTop: 16 }}>
          Compila i campi obbligatori per continuare.
        </p>
      )}
      <div className="btn-row">
        {stepIndex > 0 && (
          <button className="btn btn-secondary" onClick={() => setStepIndex(stepIndex - 1)}>
            Indietro
          </button>
        )}
        <button className="btn btn-primary" onClick={next} disabled={missingRequired.length > 0}>
          {stepIndex < steps.length - 1 ? "Avanti" : "Rivedi"}
        </button>
      </div>
    </>
  );
}

function Stepper({ steps, current }: { steps: number; current: number }) {
  return (
    <div className="stepper" aria-label="Avanzamento">
      {Array.from({ length: steps }).map((_, i) => (
        <span
          key={i}
          className={`step-pill ${i === current ? "active" : i < current ? "done" : ""}`}
        >
          Passo {i + 1}
        </span>
      ))}
      <span className={`step-pill ${current >= steps ? "active" : ""}`}>Riepilogo</span>
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
