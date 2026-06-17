import { format } from "date-fns";
import { it } from "date-fns/locale";
import { History, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Input } from "../components/ui/input";

interface Entry {
  id: number;
  occurred_at: string;
  type: string;
  user_id: string | null;
  object_id: string | null;
  data?: unknown;
}

export function AuditLog() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .auditLog(token)
      .then((r) => setRows(r as Entry[]))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.type} ${r.user_id ?? ""} ${r.object_id ?? ""}`.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-wv-navy">Registro attività</h1>
        <div className="relative w-64 max-w-full">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 pl-9 text-sm" placeholder="Cerca azione, utente…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Eventi di sistema e azioni dei gestori. Nessun contenuto delle segnalazioni né dato personale del segnalante.
      </p>

      {loading && <p className="text-muted-foreground">Caricamento…</p>}
      {error && <p className="text-sm font-semibold text-wv-danger">{error}</p>}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white py-16 text-center">
          <History className="mb-3 text-muted-foreground" size={32} />
          <p className="text-sm text-muted-foreground">Nessun evento registrato.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-wv-surface2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Data / ora</th>
                <th className="px-4 py-2.5">Azione</th>
                <th className="px-4 py-2.5">Attore</th>
                <th className="px-4 py-2.5">Oggetto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border first:border-t-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {format(new Date(r.occurred_at), "d MMM yyyy, HH:mm", { locale: it })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-wv-surface2 px-2 py-0.5 font-mono text-xs font-medium text-wv-navy">{r.type}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.user_id ? r.user_id.slice(0, 8) : "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.object_id ? r.object_id.slice(0, 8) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
