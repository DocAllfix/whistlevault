import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";

type OptDraft = { label: string };
type FieldDraft = { label: string; hint: string; type: string; required: boolean; options: OptDraft[] };
type StepDraft = { label: string; description: string; fields: FieldDraft[] };
type Draft = { name: string; steps: StepDraft[] };

const FIELD_TYPES = ["text", "textarea", "select", "multiselect", "date", "file"];

const emptyDraft = (): Draft => ({ name: "", steps: [{ label: "", description: "", fields: [] }] });

export function Questionnaires() {
  const { token } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token) return;
    setList(await api.questionnaires(token));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  function edit(q: any) {
    setSelected(q.id);
    setDraft({
      name: q.name,
      steps: q.steps.map((s: any) => ({
        label: s.label?.it ?? "",
        description: s.description?.it ?? "",
        fields: s.fields.map((f: any) => ({
          label: f.label?.it ?? "",
          hint: f.hint?.it ?? "",
          type: f.type,
          required: f.required,
          options: f.options.map((o: any) => ({ label: o.label?.it ?? "" })),
        })),
      })),
    });
  }

  function toPayload(d: Draft) {
    return {
      name: d.name,
      steps: d.steps.map((s, si) => ({
        label: { it: s.label },
        description: { it: s.description },
        order: si,
        fields: s.fields.map((f, fi) => ({
          label: { it: f.label },
          hint: { it: f.hint },
          type: f.type,
          required: f.required,
          order: fi,
          options: f.options.map((o, oi) => ({ label: { it: o.label }, order: oi })),
        })),
      })),
    };
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (selected === "new") await api.createQuestionnaire(token!, toPayload(draft));
      else if (selected) await api.updateQuestionnaire(token!, selected, toPayload(draft));
      await load();
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  // --- mutators (immutable updates) ---
  const update = (fn: (d: Draft) => void) => setDraft((prev) => { const c = structuredClone(prev); fn(c); return c; });

  if (selected === null)
    return (
      <>
        <h1>Questionari</h1>
        <table>
          <thead><tr><th>Nome</th><th>Passi</th><th></th></tr></thead>
          <tbody>
            {list.map((q) => (
              <tr key={q.id}>
                <td>{q.name}</td>
                <td>{q.steps.length}</td>
                <td><button className="btn btn-secondary btn-sm" onClick={() => edit(q)}>Modifica</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => { setSelected("new"); setDraft(emptyDraft()); }}>
            Nuovo questionario
          </button>
        </div>
      </>
    );

  return (
    <>
      <h1>{selected === "new" ? "Nuovo questionario" : "Modifica questionario"}</h1>
      <label>Nome</label>
      <input value={draft.name} onChange={(e) => update((d) => { d.name = e.target.value; })} />

      {draft.steps.map((step, si) => (
        <div className="card" key={si}>
          <div className="row">
            <div>
              <label>Titolo passo</label>
              <input value={step.label} onChange={(e) => update((d) => { d.steps[si].label = e.target.value; })} />
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => update((d) => { d.steps.splice(si, 1); })}>
              Rimuovi passo
            </button>
          </div>

          {step.fields.map((f, fi) => (
            <div className="editor-field" key={fi}>
              <div className="row">
                <div>
                  <label>Domanda</label>
                  <input value={f.label} onChange={(e) => update((d) => { d.steps[si].fields[fi].label = e.target.value; })} />
                </div>
                <div>
                  <label>Tipo</label>
                  <select value={f.type} onChange={(e) => update((d) => { d.steps[si].fields[fi].type = e.target.value; })}>
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: "0 0 auto" }}>
                  <label>Obbligatoria</label>
                  <input type="checkbox" checked={f.required} onChange={(e) => update((d) => { d.steps[si].fields[fi].required = e.target.checked; })} style={{ width: 20, height: 20 }} />
                </div>
              </div>
              {(f.type === "select" || f.type === "multiselect") && (
                <div>
                  <label>Opzioni</label>
                  {f.options.map((o, oi) => (
                    <div className="row" key={oi}>
                      <input value={o.label} onChange={(e) => update((d) => { d.steps[si].fields[fi].options[oi].label = e.target.value; })} />
                      <button className="btn btn-secondary btn-sm" style={{ flex: "0 0 auto" }} onClick={() => update((d) => { d.steps[si].fields[fi].options.splice(oi, 1); })}>×</button>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => update((d) => { d.steps[si].fields[fi].options.push({ label: "" }); })}>+ Opzione</button>
                </div>
              )}
              <div className="btn-row">
                <button className="btn btn-danger btn-sm" onClick={() => update((d) => { d.steps[si].fields.splice(fi, 1); })}>Rimuovi domanda</button>
              </div>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={() => update((d) => { d.steps[si].fields.push({ label: "", hint: "", type: "text", required: false, options: [] }); })}>
            + Domanda
          </button>
        </div>
      ))}

      <button className="btn btn-secondary btn-sm" onClick={() => update((d) => { d.steps.push({ label: "", description: "", fields: [] }); })}>
        + Passo
      </button>

      {error && <p className="error-text">{error}</p>}
      <div className="btn-row">
        <button className="btn btn-primary" disabled={busy || !draft.name} onClick={save}>Salva</button>
        <button className="btn btn-secondary" onClick={() => setSelected(null)}>Annulla</button>
      </div>
    </>
  );
}
