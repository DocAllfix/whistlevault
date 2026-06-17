import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Notice } from "../../components/ui/notice";
import { Textarea } from "../../components/ui/textarea";

const EVENTS = [
  { key: "new_report", label: "Nuova segnalazione" },
  { key: "new_comment", label: "Nuovo messaggio" },
  { key: "expiring", label: "Segnalazione in scadenza" },
] as const;

interface Branding {
  name?: string;
  primary_color?: string;
  logo_url?: string;
}
type MailTpl = Record<string, { subject?: string; body?: string }>;
type MailEvents = Record<string, boolean>;
type Ctx = {
  id: string;
  name: Record<string, string>;
  tip_ttl_days: number;
  tip_reminder_days: number;
  score_threshold_medium: number;
  score_threshold_high: number;
};

export function Organization() {
  const { token } = useAuth();
  // Whole settings blob is kept so saving one section never clobbers another (PUT replaces all).
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [contexts, setContexts] = useState<Ctx[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.getSettings(token), api.contexts(token)])
      .then(([s, cs]) => {
        setSettings(s ?? {});
        setContexts(cs as Ctx[]);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  const branding: Branding = settings.branding ?? {};
  const templates: MailTpl = settings.mail_templates ?? {};
  const events: MailEvents = settings.mail_events ?? {};

  function patch(updater: (s: Record<string, any>) => void) {
    setSettings((prev) => {
      const c = structuredClone(prev);
      updater(c);
      return c;
    });
  }

  async function saveSettings(label: string) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const saved = await api.updateSettings(token!, settings);
      setSettings(saved ?? settings);
      setMsg(`${label} salvato.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  function setCtx(id: string, key: keyof Ctx, value: number) {
    setContexts((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  }

  async function saveCtx(c: Ctx) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await api.updateContext(token!, c.id, {
        tip_ttl_days: c.tip_ttl_days,
        tip_reminder_days: c.tip_reminder_days,
        score_threshold_medium: c.score_threshold_medium,
        score_threshold_high: c.score_threshold_high,
      });
      setMsg("Canale salvato.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-10">
      <h1 className="text-2xl font-semibold text-wv-navy">Personalizza</h1>
      {msg && <Notice variant="ok">{msg}</Notice>}
      {error && <Notice variant="warn" role="alert">{error}</Notice>}

      {/* Branding */}
      <section data-tour="org-branding">
        <h2 className="mb-1 text-sm font-semibold text-wv-navy">Branding</h2>
        <p className="mb-3 text-sm text-muted-foreground">Logo, nome e colore mostrati nel portale pubblico.</p>
        <Card className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome organizzazione</Label>
              <Input value={branding.name ?? ""} onChange={(e) => patch((s) => { s.branding = { ...(s.branding ?? {}), name: e.target.value }; })} placeholder="Es. Acme S.p.A." />
            </div>
            <div>
              <Label>Colore principale</Label>
              <div className="flex items-center gap-3">
                <input type="color" aria-label="Colore principale" className="h-11 w-14 cursor-pointer rounded-md border border-wv-border-strong bg-white" value={branding.primary_color || "#0369A1"} onChange={(e) => patch((s) => { s.branding = { ...(s.branding ?? {}), primary_color: e.target.value }; })} />
                <Input value={branding.primary_color ?? ""} onChange={(e) => patch((s) => { s.branding = { ...(s.branding ?? {}), primary_color: e.target.value }; })} placeholder="#0369A1" />
              </div>
            </div>
          </div>
          <div>
            <Label>URL logo (facoltativo)</Label>
            <Input value={branding.logo_url ?? ""} onChange={(e) => patch((s) => { s.branding = { ...(s.branding ?? {}), logo_url: e.target.value }; })} placeholder="https://…/logo.svg" />
          </div>
          <Button disabled={busy} onClick={() => saveSettings("Branding")}>Salva branding</Button>
        </Card>
      </section>

      {/* Canali */}
      <section data-tour="org-canali">
        <h2 className="mb-1 text-sm font-semibold text-wv-navy">Canali</h2>
        <p className="mb-3 text-sm text-muted-foreground">Tempi di conservazione, promemoria (SLA) e soglie di rischio per canale.</p>
        <div className="space-y-4">
          {contexts.map((c) => (
            <Card key={c.id} className="space-y-4 p-6">
              <div className="font-medium text-wv-navy">{c.name?.it ?? c.name?.en ?? "Canale"}</div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Conservazione (giorni)</Label>
                  <Input type="number" min={0} value={c.tip_ttl_days} onChange={(e) => setCtx(c.id, "tip_ttl_days", +e.target.value)} />
                </div>
                <div>
                  <Label>Promemoria SLA (giorni)</Label>
                  <Input type="number" min={0} value={c.tip_reminder_days} onChange={(e) => setCtx(c.id, "tip_reminder_days", +e.target.value)} />
                </div>
                <div>
                  <Label>Soglia rischio medio</Label>
                  <Input type="number" min={0} value={c.score_threshold_medium} onChange={(e) => setCtx(c.id, "score_threshold_medium", +e.target.value)} />
                </div>
                <div>
                  <Label>Soglia rischio alto</Label>
                  <Input type="number" min={0} value={c.score_threshold_high} onChange={(e) => setCtx(c.id, "score_threshold_high", +e.target.value)} />
                </div>
              </div>
              <Button variant="secondary" disabled={busy} onClick={() => saveCtx(c)}>Salva canale</Button>
            </Card>
          ))}
          {contexts.length === 0 && <p className="text-sm text-muted-foreground">Nessun canale configurato.</p>}
        </div>
      </section>

      {/* Notifiche */}
      <section data-tour="org-notifiche">
        <h2 className="mb-1 text-sm font-semibold text-wv-navy">Notifiche email</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Avvisi ai gestori, sempre senza contenuto della segnalazione. Puoi disattivarli o personalizzarne il testo.
        </p>
        <Card className="space-y-6 p-6">
          {EVENTS.map((ev) => {
            const enabled = events[ev.key] !== false;
            const tpl = templates[ev.key] ?? {};
            return (
              <div key={ev.key} className="border-b border-border pb-6 last:border-b-0 last:pb-0">
                <label className="mb-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-wv-accent"
                    checked={enabled}
                    onChange={(e) => patch((s) => { s.mail_events = { ...(s.mail_events ?? {}), [ev.key]: e.target.checked }; })}
                  />
                  <span className="font-medium text-wv-navy">{ev.label}</span>
                </label>
                <div className={enabled ? "space-y-3" : "space-y-3 opacity-50"}>
                  <div>
                    <Label>Oggetto</Label>
                    <Input
                      disabled={!enabled}
                      value={tpl.subject ?? ""}
                      placeholder="(testo predefinito)"
                      onChange={(e) => patch((s) => { s.mail_templates = { ...(s.mail_templates ?? {}), [ev.key]: { ...(s.mail_templates?.[ev.key] ?? {}), subject: e.target.value } }; })}
                    />
                  </div>
                  <div>
                    <Label>Corpo</Label>
                    <Textarea
                      disabled={!enabled}
                      value={tpl.body ?? ""}
                      placeholder="(testo predefinito, content-free)"
                      onChange={(e) => patch((s) => { s.mail_templates = { ...(s.mail_templates ?? {}), [ev.key]: { ...(s.mail_templates?.[ev.key] ?? {}), body: e.target.value } }; })}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <Button disabled={busy} onClick={() => saveSettings("Notifiche")}>Salva notifiche</Button>
        </Card>
      </section>
    </div>
  );
}
