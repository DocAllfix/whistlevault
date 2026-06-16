import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

type Stats = Awaited<ReturnType<typeof api.stats>>;

export function Statistics() {
  const { token } = useAuth();
  const [s, setS] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.stats(token).then(setS).catch((e) => setError(e.message));
  }, [token]);

  if (error) return <p className="error-text">{error}</p>;
  if (!s) return <p>Caricamento…</p>;

  return (
    <>
      <h1>Statistiche</h1>
      <div className="row">
        <div className="card">
          <div className="muted">Segnalazioni totali</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{s.total}</div>
        </div>
        <div className="card">
          <div className="muted">Importanti</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{s.important}</div>
        </div>
      </div>

      <h2>Per stato</h2>
      <table>
        <thead><tr><th>Stato</th><th>Conteggio</th></tr></thead>
        <tbody>
          {s.by_status.map((x) => (
            <tr key={x.status_id ?? "none"}><td>{x.label}</td><td>{x.count}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>Per canale</h2>
      <table>
        <thead><tr><th>Canale</th><th>Conteggio</th></tr></thead>
        <tbody>
          {s.by_context.map((x) => (
            <tr key={x.context_id}><td>{x.name}</td><td>{x.count}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>Per mese</h2>
      <table>
        <thead><tr><th>Mese</th><th>Conteggio</th></tr></thead>
        <tbody>
          {Object.entries(s.by_month).map(([m, c]) => (
            <tr key={m}><td>{m}</td><td>{c}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
