import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, CaseDetail as Detail } from "../api";
import { useAuth } from "../auth";

export function CaseDetail() {
  const { token, role } = useAuth();
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [statuses, setStatuses] = useState<{ id: string; label: string }[]>([]);
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token) return;
    const [d, st] = await Promise.all([api.caseDetail(token, id), api.statuses(token)]);
    setDetail(d);
    setStatuses(st.map((s) => ({ id: s.id, label: s.label.it ?? s.label.en ?? "" })));
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

  async function download(fileId: string, name: string) {
    const res = await fetch(api.fileUrl(id, fileId), { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error && !detail) return <p className="error-text">{error}</p>;
  if (!detail) return <p>Caricamento…</p>;

  return (
    <>
      <h1>Segnalazione n. {detail.progressive}</h1>

      <div className="row">
        <div>
          <label htmlFor="st">Stato</label>
          <select
            id="st"
            value={detail.status_id ?? ""}
            onChange={(e) => act(() => api.changeStatus(token!, id, e.target.value))}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Identità segnalante</label>
          <div>
            {detail.identity_disclosed ? (
              <span className="badge">Divulgata</span>
            ) : detail.identity_request_status ? (
              <span className="badge">Richiesta: {detail.identity_request_status}</span>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => {
                  const m = prompt("Motivazione della richiesta di accesso all'identità:");
                  if (m !== null) act(() => api.requestIdentity(token!, id, m));
                }}
              >
                Richiedi accesso identità
              </button>
            )}
          </div>
        </div>
      </div>

      <h2>Contenuto della segnalazione</h2>
      <div className="card">
        {Object.values(detail.answers).length === 0 && <p className="muted">Nessuna risposta.</p>}
        {Object.values(detail.answers).map((v, i) => (
          <p key={i} style={{ margin: "4px 0" }}>
            {Array.isArray(v) ? v.join(", ") : String(v)}
          </p>
        ))}
      </div>

      <h2>Messaggi</h2>
      {detail.comments.map((c) => (
        <div key={c.id} className={`thread-msg ${c.author_kind === "recipient" ? "from-handler" : ""}`}>
          <span className="vis">{c.visibility}</span>
          <div className="who">{c.author_kind === "recipient" ? "Gestore" : "Segnalante"}</div>
          <div>{c.content}</div>
        </div>
      ))}
      <div className="row" style={{ marginTop: 12 }}>
        <div style={{ flex: 3 }}>
          <label htmlFor="cm">Nuovo messaggio</label>
          <textarea id="cm" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <div>
          <label htmlFor="vis">Visibilità</label>
          <select id="vis" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="public">Visibile al segnalante</option>
            <option value="internal">Solo interna</option>
            <option value="personal">Personale</option>
          </select>
        </div>
      </div>
      <div className="btn-row">
        <button
          className="btn btn-primary"
          disabled={busy || !comment.trim()}
          onClick={() =>
            act(async () => {
              await api.addComment(token!, id, comment.trim(), visibility);
              setComment("");
            })
          }
        >
          Invia messaggio
        </button>
      </div>

      <h2>Allegati</h2>
      {detail.files.length === 0 && <p className="muted">Nessun allegato.</p>}
      <ul>
        {detail.files.map((f) => (
          <li key={f.id}>
            <button className="btn btn-secondary btn-sm" onClick={() => download(f.id, f.name)}>
              {f.name} ({Math.round(f.size / 1024)} KB)
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="error-text">{error}</p>}
      <p className="muted">Ruolo: {role}</p>
    </>
  );
}
