import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label, selectClass } from "../../components/ui/label";
import { LabelWithHelp } from "../../components/ui/label-help";

type OptDraft = { label_it: string; label_en: string; score: number };
type FieldDraft = {
  label_it: string;
  label_en: string;
  hint_it: string;
  hint_en: string;
  type: string;
  required: boolean;
  key: string;
  trigger_field_key: string;
  trigger_value: string;
  options: OptDraft[];
};
type StepDraft = { label_it: string; label_en: string; description_it: string; description_en: string; fields: FieldDraft[] };
type Draft = { name: string; steps: StepDraft[] };

const FIELD_TYPES = ["text", "textarea", "select", "multiselect", "date", "file", "voice"];
const emptyField = (): FieldDraft => ({ label_it: "", label_en: "", hint_it: "", hint_en: "", type: "text", required: false, key: "", trigger_field_key: "", trigger_value: "", options: [] });
const emptyStep = (): StepDraft => ({ label_it: "", label_en: "", description_it: "", description_en: "", fields: [] });
const emptyDraft = (): Draft => ({ name: "", steps: [emptyStep()] });

/** Build a localized map, omitting empty languages. */
function loc(itVal: string, enVal: string): Record<string, string> {
  const m: Record<string, string> = {};
  if (itVal) m.it = itVal;
  if (enVal) m.en = enVal;
  return m;
}

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
        label_it: s.label?.it ?? "",
        label_en: s.label?.en ?? "",
        description_it: s.description?.it ?? "",
        description_en: s.description?.en ?? "",
        fields: s.fields.map((f: any) => ({
          label_it: f.label?.it ?? "",
          label_en: f.label?.en ?? "",
          hint_it: f.hint?.it ?? "",
          hint_en: f.hint?.en ?? "",
          type: f.type,
          required: f.required,
          key: f.key ?? "",
          trigger_field_key: f.trigger_field_key ?? "",
          trigger_value: f.trigger_value ?? "",
          options: f.options.map((o: any) => ({ label_it: o.label?.it ?? "", label_en: o.label?.en ?? "", score: o.score ?? 0 })),
        })),
      })),
    });
  }

  function toPayload(d: Draft) {
    return {
      name: d.name,
      steps: d.steps.map((s, si) => ({
        label: loc(s.label_it, s.label_en),
        description: loc(s.description_it, s.description_en),
        order: si,
        fields: s.fields.map((f, fi) => ({
          label: loc(f.label_it, f.label_en),
          hint: loc(f.hint_it, f.hint_en),
          type: f.type,
          required: f.required,
          order: fi,
          key: f.key,
          trigger_field_key: f.trigger_field_key,
          trigger_value: f.trigger_value,
          options: f.options.map((o, oi) => ({ label: loc(o.label_it, o.label_en), order: oi, score: o.score })),
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

  const update = (fn: (d: Draft) => void) => setDraft((prev) => { const c = structuredClone(prev); fn(c); return c; });

  if (selected === null)
    return (
      <>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Questionari</h1>
          <Button data-tour="qx-new" onClick={() => { setSelected("new"); setDraft(emptyDraft()); }}>
            <Plus size={18} /> Nuovo questionario
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {list.map((q, i) => (
            <div key={q.id} className={"flex items-center gap-4 px-4 py-3.5 " + (i > 0 ? "border-t border-border" : "")}>
              <div className="flex-1">
                <div className="font-medium text-foreground">{q.name}</div>
                <div className="text-xs text-muted-foreground">{q.steps.length} passi</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => edit(q)}>Modifica</Button>
            </div>
          ))}
          {list.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nessun questionario.</p>}
        </div>
        {error && <p className="mt-4 text-sm font-semibold text-wv-danger">{error}</p>}
      </>
    );

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        {selected === "new" ? "Nuovo questionario" : "Modifica questionario"}
      </h1>
      <div className="mb-4 max-w-md">
        <Label>Nome</Label>
        <Input value={draft.name} onChange={(e) => update((d) => { d.name = e.target.value; })} />
      </div>

      {draft.steps.map((step, si) => (
        <Card key={si} className="mb-4 space-y-4 p-5">
          <div className="flex items-end gap-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Titolo passo (IT)</Label>
                <Input value={step.label_it} onChange={(e) => update((d) => { d.steps[si].label_it = e.target.value; })} />
              </div>
              <div>
                <Label>Titolo passo (EN, facoltativo)</Label>
                <Input value={step.label_en} onChange={(e) => update((d) => { d.steps[si].label_en = e.target.value; })} />
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={() => update((d) => { d.steps.splice(si, 1); })}>
              <Trash2 size={16} /> Rimuovi passo
            </Button>
          </div>

          {step.fields.map((f, fi) => (
            <div key={fi} className="rounded-md border border-border bg-muted/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Domanda (IT)</Label>
                  <Input value={f.label_it} onChange={(e) => update((d) => { d.steps[si].fields[fi].label_it = e.target.value; })} />
                </div>
                <div>
                  <Label>Domanda (EN, facoltativo)</Label>
                  <Input value={f.label_en} onChange={(e) => update((d) => { d.steps[si].fields[fi].label_en = e.target.value; })} />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_auto]">
                <div>
                  <Label>Tipo</Label>
                  <select className={selectClass} value={f.type} onChange={(e) => update((d) => { d.steps[si].fields[fi].type = e.target.value; })}>
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <label className="flex flex-col">
                  <span className="mb-2 block text-sm font-semibold text-foreground">Obbligatoria</span>
                  <input type="checkbox" className="h-5 w-5 accent-wv-accent" checked={f.required} onChange={(e) => update((d) => { d.steps[si].fields[fi].required = e.target.checked; })} />
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <LabelWithHelp help="Identificatore stabile del campo (es. 'categoria'). Serve a far comparire altri campi in base alla risposta a questo.">Chiave (logica condizionale)</LabelWithHelp>
                  <Input value={f.key} placeholder="es. categoria" onChange={(e) => update((d) => { d.steps[si].fields[fi].key = e.target.value; })} />
                </div>
                <div>
                  <LabelWithHelp help="Mostra questo campo solo quando il campo con questa chiave ha un certo valore. Lascia vuoto per mostrarlo sempre.">Mostra se campo (chiave)</LabelWithHelp>
                  <Input value={f.trigger_field_key} placeholder="chiave trigger" onChange={(e) => update((d) => { d.steps[si].fields[fi].trigger_field_key = e.target.value; })} />
                </div>
                <div>
                  <LabelWithHelp help="Valore che il campo trigger deve avere perché questo campo compaia.">…uguale a</LabelWithHelp>
                  <Input value={f.trigger_value} placeholder="valore atteso" onChange={(e) => update((d) => { d.steps[si].fields[fi].trigger_value = e.target.value; })} />
                </div>
              </div>

              {(f.type === "select" || f.type === "multiselect") && (
                <div className="mt-3">
                  <Label>Opzioni (con peso di rischio)</Label>
                  <div className="space-y-2">
                    {f.options.map((o, oi) => (
                      <div key={oi} className="grid grid-cols-[1fr_1fr_88px_auto] gap-2">
                        <Input placeholder="IT" value={o.label_it} onChange={(e) => update((d) => { d.steps[si].fields[fi].options[oi].label_it = e.target.value; })} />
                        <Input placeholder="EN (facolt.)" value={o.label_en} onChange={(e) => update((d) => { d.steps[si].fields[fi].options[oi].label_en = e.target.value; })} />
                        <Input type="number" min={0} title="Peso di rischio" value={o.score} onChange={(e) => update((d) => { d.steps[si].fields[fi].options[oi].score = +e.target.value; })} />
                        <Button size="icon" variant="secondary" onClick={() => update((d) => { d.steps[si].fields[fi].options.splice(oi, 1); })}>
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => update((d) => { d.steps[si].fields[fi].options.push({ label_it: "", label_en: "", score: 0 }); })}>
                    <Plus size={16} /> Opzione
                  </Button>
                </div>
              )}
              <div className="mt-3">
                <Button size="sm" variant="ghost" className="text-wv-danger hover:bg-[#FDF0EF]" onClick={() => update((d) => { d.steps[si].fields.splice(fi, 1); })}>
                  <Trash2 size={16} /> Rimuovi domanda
                </Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => update((d) => { d.steps[si].fields.push(emptyField()); })}>
            <Plus size={16} /> Domanda
          </Button>
        </Card>
      ))}

      <Button variant="secondary" onClick={() => update((d) => { d.steps.push(emptyStep()); })}>
        <Plus size={16} /> Passo
      </Button>

      {error && <p className="mt-4 text-sm font-semibold text-wv-danger">{error}</p>}
      <div className="mt-6 flex gap-3">
        <Button disabled={busy || !draft.name} onClick={save}>Salva</Button>
        <Button variant="secondary" onClick={() => setSelected(null)}>Annulla</Button>
      </div>
    </>
  );
}
