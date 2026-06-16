import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, CaseSummary } from "../api";
import { useAuth } from "../auth";

export function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.cases(token), api.statuses(token)])
      .then(([cs, st]) => {
        setCases(cs);
        setStatusLabels(Object.fromEntries(st.map((s) => [s.id, s.label.it ?? s.label.en ?? ""])));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p>Caricamento…</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <>
      <h1>Segnalazioni</h1>
      {cases.length === 0 && <p className="muted">Nessuna segnalazione assegnata.</p>}
      {cases.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Stato</th>
              <th>Ricevuta</th>
              <th>Aggiornata</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.report_id} className="clickable" onClick={() => navigate(`/cases/${c.report_id}`)}>
                <td>{c.progressive}</td>
                <td>{c.status_id ? statusLabels[c.status_id] ?? "—" : "—"}</td>
                <td>{new Date(c.created_at).toLocaleDateString("it-IT")}</td>
                <td>{new Date(c.updated_at).toLocaleDateString("it-IT")}</td>
                <td>{c.new && <span className="badge new">Nuova</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
