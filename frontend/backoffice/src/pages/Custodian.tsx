import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export function Custodian() {
  const { token } = useAuth();
  const [items, setItems] = useState<{ id: string; report_id: string; motivation: string; request_date: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token) return;
    setItems(await api.pendingIdentity(token));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  async function resolve(iarId: string, grant: boolean) {
    setBusy(true);
    try {
      const m = prompt(grant ? "Motivazione approvazione:" : "Motivazione diniego:") ?? "";
      await api.resolveIdentity(token!, iarId, grant, m);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Richieste di accesso all'identità</h1>
      {items.length === 0 && <p className="muted">Nessuna richiesta in attesa.</p>}
      {items.map((it) => (
        <div className="card" key={it.id}>
          <p>
            <strong>Segnalazione</strong> {it.report_id.slice(0, 8)}… —{" "}
            {new Date(it.request_date).toLocaleString("it-IT")}
          </p>
          <p>{it.motivation || <span className="muted">Nessuna motivazione</span>}</p>
          <div className="btn-row">
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => resolve(it.id, true)}>
              Approva
            </button>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => resolve(it.id, false)}>
              Nega
            </button>
          </div>
        </div>
      ))}
      {error && <p className="error-text">{error}</p>}
    </>
  );
}
