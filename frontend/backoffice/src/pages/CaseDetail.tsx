import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AlertTriangle, Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, CaseDetail as Detail } from "../api";
import { useAuth } from "../auth";
import { ROLE_LABEL } from "../components/Nav";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label, selectClass } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../lib/utils";

const VIS_LABEL: Record<string, string> = {
  public: "Visibile al segnalante",
  internal: "Solo interna",
  personal: "Personale",
};

export function CaseDetail() {
  const { token, role } = useAuth();
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [statuses, setStatuses] = useState<{ id: string; label: string }[]>([]);
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<{ id: string; username: string; role: string }[]>([]);
  const [target, setTarget] = useState("");
  const [maskText, setMaskText] = useState("");

  async function load() {
    if (!token) return;
    const [d, st] = await Promise.all([api.caseDetail(token, id), api.statuses(token)]);
    setDetail(d);
    setStatuses(st.map((s) => ({ id: s.id, label: s.label.it ?? s.label.en ?? "" })));
    if (role === "admin") {
      try {
        setUsers(await api.users(token));
      } catch {
        /* non-admin cannot list users */
      }
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token, id]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function blobDownload(url: string, name: string) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (error && !detail) return <p className="text-sm font-semibold text-wv-danger">{error}</p>;
  if (!detail) return <p className="text-muted-foreground">Caricamento…</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-wv-navy">Segnalazione n. {detail.progressive}</h1>
          {detail.score > 0 && <Badge variant={detail.important ? "danger" : "default"}>Rischio {detail.score}</Badge>}
          {detail.important && (
            <Badge variant="warning">
              <AlertTriangle size={13} /> Importante
            </Badge>
          )}
        </div>
        <Button data-tour="case-export" variant="secondary" size="sm" disabled={busy} onClick={() => blobDownload(api.exportUrl(id), `segnalazione-${detail.progressive}.zip`)}>
          <Download size={16} /> Esporta caso (ZIP)
        </Button>
      </div>

      <div data-tour="case-status" className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="st">Stato</Label>
          <select id="st" className={selectClass} value={detail.status_id ?? ""} onChange={(e) => act(() => api.changeStatus(token!, id, e.target.value))}>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Identità segnalante</Label>
          <div className="flex h-11 items-center">
            {!detail.identity_available ? (
              <span className="text-sm text-muted-foreground">Non fornita dal segnalante</span>
            ) : detail.identity_granted ? (
              <Badge variant="success">Accesso concesso</Badge>
            ) : detail.identity_request_status === "pending" ? (
              <Badge variant="warning">Richiesta in attesa del custode</Badge>
            ) : detail.identity_request_status === "denied" ? (
              <Badge variant="danger">Richiesta negata</Badge>
            ) : (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => {
                const m = prompt("Motivazione della richiesta di accesso all'identità:");
                if (m !== null) act(() => api.requestIdentity(token!, id, m));
              }}>
                Richiedi accesso identità
              </Button>
            )}
          </div>
        </div>
      </div>

      <section data-tour="case-content">
        <h2 className="mb-3 text-sm font-semibold text-wv-navy">Contenuto della segnalazione</h2>
        <Card className="space-y-2 p-5">
          {Object.values(detail.answers).length === 0 && <p className="text-sm text-muted-foreground">Nessuna risposta.</p>}
          {Object.values(detail.answers).map((v, i) => (
            <p key={i} className="text-sm leading-relaxed text-secondary-foreground/90">
              {Array.isArray(v) ? v.join(", ") : String(v)}
            </p>
          ))}
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-wv-navy">Oscura un testo nelle risposte</h2>
        <Card className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-60 flex-1">
              <Input value={maskText} onChange={(e) => setMaskText(e.target.value)} placeholder="testo da oscurare" />
            </div>
            <Button size="sm" variant="secondary" disabled={busy || !maskText.trim()} onClick={() => act(async () => { await api.createRedaction(token!, id, "answers", [maskText.trim()], false); setMaskText(""); })}>
              Oscura (reversibile)
            </Button>
            <Button size="sm" variant="destructive" disabled={busy || !maskText.trim()} onClick={() => {
              if (confirm("Oscuramento permanente e irreversibile. Procedere?"))
                act(async () => { await api.createRedaction(token!, id, "answers", [maskText.trim()], true); setMaskText(""); });
            }}>
              Oscura permanentemente
            </Button>
          </div>
        </Card>
      </section>

      {role === "admin" && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-wv-navy">Accesso al caso</h2>
          <Card className="p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-60 flex-1">
                <Label htmlFor="tgt">Gestore</Label>
                <select id="tgt" className={selectClass} value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {users.filter((u) => u.role === "recipient" || u.role === "admin").map((u) => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>
              <Button size="sm" variant="secondary" disabled={busy || !target} onClick={() => act(() => api.grantAccess(token!, id, target))}>Concedi accesso</Button>
              <Button size="sm" variant="secondary" disabled={busy || !target} onClick={() => act(() => api.transferAccess(token!, id, target))}>Trasferisci</Button>
              <Button size="sm" variant="destructive" disabled={busy || !target} onClick={() => act(() => api.revokeAccess(token!, id, target))}>Revoca</Button>
            </div>
          </Card>
        </section>
      )}

      {detail.identity && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-wv-navy">Identità del segnalante</h2>
          <Card className="space-y-1 p-5">
            {Object.entries(detail.identity).map(([k, v]) => (
              <p key={k} className="text-sm">
                <strong className="font-semibold text-wv-navy">{k}:</strong> {String(v)}
              </p>
            ))}
          </Card>
        </section>
      )}

      <section data-tour="case-messages">
        <h2 className="mb-3 text-sm font-semibold text-wv-navy">Messaggi</h2>
        <div className="space-y-3">
          {detail.comments.map((c) => {
            const handler = c.author_kind === "recipient";
            return (
              <div key={c.id} className={cn("rounded-lg border p-4", handler ? "border-border bg-white" : "border-[#cbe3f0] bg-wv-accent-tint")}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {handler ? "Gestore" : "Segnalante"}
                  </span>
                  <Badge variant="outline">{VIS_LABEL[c.visibility] ?? c.visibility}</Badge>
                </div>
                <div className="text-sm leading-relaxed">{c.content}</div>
                <div className="mt-1 text-xs text-muted-foreground">{format(new Date(c.created_at), "d MMM yyyy, HH:mm", { locale: it })}</div>
              </div>
            );
          })}
          {detail.comments.length === 0 && <p className="text-sm text-muted-foreground">Nessun messaggio.</p>}
        </div>
        <Card className="mt-4 p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div>
              <Label htmlFor="cm">Nuovo messaggio</Label>
              <Textarea id="cm" value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="vis">Visibilità</Label>
              <select id="vis" className={selectClass} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="public">Visibile al segnalante</option>
                <option value="internal">Solo interna</option>
                <option value="personal">Personale</option>
              </select>
            </div>
          </div>
          <Button className="mt-4" disabled={busy || !comment.trim()} onClick={() => act(async () => { await api.addComment(token!, id, comment.trim(), visibility); setComment(""); })}>
            Invia messaggio
          </Button>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-wv-navy">Allegati</h2>
        {detail.files.length === 0 && <p className="text-sm text-muted-foreground">Nessun allegato.</p>}
        <ul className="grid gap-2">
          {detail.files.map((f) => (
            <li key={f.id}>
              <button onClick={() => blobDownload(api.fileUrl(id, f.id), f.name)} className="flex w-full items-center gap-3 rounded-md border border-border bg-white px-4 py-3 text-left text-sm transition-colors hover:bg-wv-surface2">
                <FileText size={18} className="shrink-0 text-muted-foreground" />
                <span className="flex-1">{f.name}</span>
                <span className="text-muted-foreground">{Math.round(f.size / 1024)} KB</span>
                <Download size={16} className="text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="text-sm font-semibold text-wv-danger">{error}</p>}
      <p className="text-xs text-muted-foreground">Ruolo: {ROLE_LABEL[role ?? ""] ?? role}</p>
    </div>
  );
}
