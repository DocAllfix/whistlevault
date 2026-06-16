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

  async function exportZip() {
    const res = await fetch(api.exportUrl(id), { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `segnalazione-${detail?.progressive ?? "export"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
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
      <h1>
        Segnalazione n. {detail.progressive}{" "}
        {detail.score ? (
          <span className="badge">
            Rischio {detail.score}
            {detail.important ? " ⚠" : ""}
          </span>
        ) : null}
      </h1>

      <div className="btn-row">
        <button className="btn btn-secondary btn-sm" onClick={exportZip} disabled={busy}>
          Esporta caso (ZIP)
        </button>
      </div>

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
            {!detail.identity_available ? (
              <span className="muted">Non fornita dal segnalante</span>
            ) : detail.identity_granted ? (
              <span className="badge">Accesso concesso</span>
            ) : detail.identity_request_status === "pending" ? (
              <span className="badge">Richiesta in attesa del custode</span>
            ) : detail.identity_request_status === "denied" ? (
              <span className="badge">Richiesta negata</span>
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

      <div className="card">
        <label htmlFor="mask">Oscura un testo nelle risposte</label>
        <input
          id="mask"
          value={maskText}
          onChange={(e) => setMaskText(e.target.value)}
          placeholder="testo da oscurare"
        />
        <div className="btn-row">
          <button
            className="btn btn-secondary btn-sm"
            disabled={busy || !maskText.trim()}
            onClick={() =>
              act(async () => {
                await api.createRedaction(token!, id, "answers", [maskText.trim()], false);
                setMaskText("");
              })
            }
          >
            Oscura (reversibile)
          </button>
          <button
            className="btn btn-danger btn-sm"
            disabled={busy || !maskText.trim()}
            onClick={() => {
              if (confirm("Oscuramento permanente e irreversibile. Procedere?"))
                act(async () => {
                  await api.createRedaction(token!, id, "answers", [maskText.trim()], true);
                  setMaskText("");
                });
            }}
          >
            Oscura permanentemente
          </button>
        </div>
      </div>

      {role === "admin" && (
        <>
          <h2>Accesso al caso</h2>
          <div className="row">
            <div>
              <label htmlFor="tgt">Gestore</label>
              <select id="tgt" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">— Seleziona —</option>
                {users
                  .filter((u) => u.role === "recipient" || u.role === "admin")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
              </select>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              disabled={busy || !target}
              onClick={() => act(() => api.grantAccess(token!, id, target))}
            >
              Concedi accesso
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={busy || !target}
              onClick={() => act(() => api.transferAccess(token!, id, target))}
            >
              Trasferisci
            </button>
          </div>
        </>
      )}

      {detail.identity && (
        <>
          <h2>Identità del segnalante</h2>
          <div className="card">
            {Object.entries(detail.identity).map(([k, v]) => (
              <p key={k} style={{ margin: "4px 0" }}>
                <strong>{k}:</strong> {String(v)}
              </p>
            ))}
          </div>
        </>
      )}

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
