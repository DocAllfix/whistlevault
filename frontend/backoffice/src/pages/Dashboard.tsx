import { differenceInCalendarDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { AlertTriangle, ChevronRight, Flag, Inbox, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, CaseSummary } from "../api";
import { useAuth } from "../auth";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { selectClass } from "../components/ui/label";
import { cn } from "../lib/utils";

const GROUPS = ["Oggi", "Ultimi 7 giorni", "Ultimo mese", "Archivio"] as const;
type Group = (typeof GROUPS)[number];

function bucket(dateStr: string): Group {
  const d = differenceInCalendarDays(new Date(), new Date(dateStr));
  if (d <= 0) return "Oggi";
  if (d <= 7) return "Ultimi 7 giorni";
  if (d <= 31) return "Ultimo mese";
  return "Archivio";
}

export function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<{ id: string; label: string }[]>([]);
  const [contextNames, setContextNames] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("");
  const [contextFilter, setContextFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "expiry">("recent");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.cases(token, statusFilter || undefined), api.statuses(token)])
      .then(([cs, st]) => {
        setCases(cs);
        setStatuses(st.map((s) => ({ id: s.id, label: s.label.it ?? s.label.en ?? "" })));
        setStatusLabels(Object.fromEntries(st.map((s) => [s.id, s.label.it ?? s.label.en ?? ""])));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, statusFilter]);

  // Channel names from the public config (same-origin, no auth) → context filter labels.
  useEffect(() => {
    fetch("/api/public")
      .then((r) => r.json())
      .then((cfg) => {
        const m: Record<string, string> = {};
        for (const c of cfg.contexts ?? []) m[c.id] = c.name?.it ?? c.name?.en ?? "Canale";
        setContextNames(m);
      })
      .catch(() => {});
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = cases;
    if (contextFilter) rows = rows.filter((c) => c.context_id === contextFilter);
    if (q) rows = rows.filter((c) => `${c.label} #${c.progressive}`.toLowerCase().includes(q));
    rows = [...rows].sort((a, b) => {
      if (sort === "expiry") {
        const ea = a.expiration_date ? +new Date(a.expiration_date) : Infinity;
        const eb = b.expiration_date ? +new Date(b.expiration_date) : Infinity;
        return ea - eb;
      }
      return +new Date(b.created_at) - +new Date(a.created_at);
    });
    return rows;
  }, [cases, contextFilter, search, sort]);

  const grouped = useMemo(() => {
    const m = new Map<Group, CaseSummary[]>();
    for (const g of GROUPS) m.set(g, []);
    for (const c of visible) m.get(bucket(c.created_at))!.push(c);
    return m;
  }, [visible]);

  const contextOptions = useMemo(
    () => Array.from(new Set(cases.map((c) => c.context_id))).map((id) => ({ id, name: contextNames[id] ?? "Canale" })),
    [cases, contextNames],
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Segnalazioni</h1>
      </div>

      <div data-tour="dash-tools" className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 pl-9 text-sm" placeholder="Cerca per testo o numero…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select aria-label="Filtra per stato" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cn(selectClass, "h-9 w-auto text-sm")}>
          <option value="">Tutti gli stati</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select aria-label="Filtra per canale" value={contextFilter} onChange={(e) => setContextFilter(e.target.value)} className={cn(selectClass, "h-9 w-auto text-sm")}>
          <option value="">Tutti i canali</option>
          {contextOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select aria-label="Ordina" value={sort} onChange={(e) => setSort(e.target.value as "recent" | "expiry")} className={cn(selectClass, "h-9 w-auto text-sm")}>
          <option value="recent">Più recenti</option>
          <option value="expiry">Scadenza vicina</option>
        </select>
      </div>

      {loading && <p className="text-muted-foreground">Caricamento…</p>}
      {error && <p className="text-sm font-semibold text-wv-danger">{error}</p>}

      {!loading && visible.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
          <Inbox className="mb-3 text-muted-foreground" size={36} />
          <p className="font-medium text-foreground">Nessuna segnalazione</p>
          <p className="text-sm text-muted-foreground">Modifica i filtri o attendi nuove segnalazioni.</p>
        </div>
      )}

      <div data-tour="dash-list" className="space-y-8">
        {GROUPS.map((g) => {
          const rows = grouped.get(g)!;
          if (rows.length === 0) return null;
          return (
            <section key={g}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</h2>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {rows.map((c, i) => {
                  const daysLeft = c.expiration_date
                    ? differenceInCalendarDays(new Date(c.expiration_date), new Date())
                    : null;
                  const overdue = daysLeft !== null && daysLeft < 0;
                  const inWindow =
                    daysLeft !== null && !overdue && c.reminder_days > 0 && daysLeft <= c.reminder_days;
                  return (
                    <button
                      key={c.report_id}
                      onClick={() => navigate(`/cases/${c.report_id}`)}
                      className={
                        "flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted " +
                        (i > 0 ? "border-t border-border" : "")
                      }
                    >
                      <Flag size={18} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-foreground">
                            {c.label || `Segnalazione n. ${c.progressive}`}
                          </span>
                          {c.new && <Badge variant="success">Novità</Badge>}
                          {inWindow && <Badge variant="warning">In scadenza</Badge>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                          <span>#{c.progressive}</span>
                          {contextNames[c.context_id] && <span>{contextNames[c.context_id]}</span>}
                          <span>Aperta il {format(new Date(c.created_at), "d MMM yyyy", { locale: it })}</span>
                          {c.expiration_date && (
                            <span className={overdue ? "inline-flex items-center gap-1 font-medium text-wv-danger" : ""}>
                              {overdue && <AlertTriangle size={13} />}
                              Scadenza {format(new Date(c.expiration_date), "d MMM yyyy", { locale: it })}
                            </span>
                          )}
                        </div>
                      </div>
                      {c.status_id && <Badge variant="outline">{statusLabels[c.status_id] ?? "—"}</Badge>}
                      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
