import { useState } from "react";
import { api, ReportView } from "../api";

export function Check() {
  const [receipt, setReceipt] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [report, setReport] = useState<ReportView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.receiptAuth(receipt.trim());
      setToken(res.token);
      setReport(await api.myReport(res.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codice non valido");
    } finally {
      setBusy(false);
    }
  }

  async function refresh(tk: string) {
    setReport(await api.myReport(tk));
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !reply.trim()) return;
    setBusy(true);
    try {
      await api.addComment(token, reply.trim());
      setReply("");
      await refresh(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'invio");
    } finally {
      setBusy(false);
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!token || !e.target.files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(e.target.files)) await api.uploadFile(token, f);
      await refresh(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento");
    } finally {
      setBusy(false);
    }
  }

  if (!report)
    return (
      <>
        <h1>Controlla la tua segnalazione</h1>
        <p>Inserisci il codice di 16 cifre ricevuto al momento dell'invio.</p>
        <form onSubmit={login}>
          <label htmlFor="receipt">Codice segnalazione</label>
          <input
            id="receipt"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={receipt}
            onChange={(e) => setReceipt(e.target.value)}
          />
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy || receipt.trim().length === 0}>
              {busy ? "Verifica…" : "Accedi"}
            </button>
          </div>
        </form>
      </>
    );

  return (
    <>
      <h1>La tua segnalazione</h1>
      <div className="notice ok">Segnalazione n. {report.progressive} — ricevuta e in gestione.</div>

      <h2>Messaggi</h2>
      {report.comments.length === 0 && <p className="muted">Nessun messaggio dai gestori per ora.</p>}
      {report.comments.map((c) => (
        <div key={c.id} className={`thread-msg ${c.author_kind === "recipient" ? "from-handler" : ""}`}>
          <div className="who">{c.author_kind === "recipient" ? "Gestore" : "Tu"}</div>
          <div>{c.content}</div>
        </div>
      ))}

      <form onSubmit={sendReply}>
        <label htmlFor="reply">Aggiungi un messaggio</label>
        <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} />
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={busy || !reply.trim()}>
            Invia messaggio
          </button>
        </div>
      </form>

      <h2>Allegati</h2>
      {report.files.length === 0 && <p className="muted">Nessun allegato.</p>}
      <ul>
        {report.files.map((f) => (
          <li key={f.id}>
            {f.name} <span className="muted">({Math.round(f.size / 1024)} KB)</span>
          </li>
        ))}
      </ul>
      <label htmlFor="upload">Aggiungi un allegato</label>
      <input id="upload" type="file" multiple onChange={upload} disabled={busy} />

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
