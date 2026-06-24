import { useEffect, useState } from "react";
import { Status, api } from "../../api";
import { useAuth } from "../../auth";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

/**
 * Configurable case workflow (offer §8 "Workflow del caso configurabile").
 * Admin defines the statuses a handler can move a case through, plus optional
 * sub-statuses (e.g. on "Chiusa": Archiviata / Spam). No transition rules:
 * any status is reachable from any other, like the established practice.
 */
export function Workflow() {
  const { token } = useAuth();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newStatus, setNewStatus] = useState({ it: "", en: "" });
  const [newSub, setNewSub] = useState<Record<string, string>>({});

  async function load() {
    if (!token) return;
    setStatuses(await api.statuses(token));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  async function run(fn: () => Promise<unknown>) {
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

  // Local edits to a status/sub-status label (kept in component state until saved).
  function editStatus(id: string, lang: "it" | "en", value: string) {
    setStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, label: { ...s.label, [lang]: value } } : s)),
    );
  }
  function editSub(statusId: string, subId: string, lang: "it" | "en", value: string) {
    setStatuses((prev) =>
      prev.map((s) =>
        s.id !== statusId
          ? s
          : {
              ...s,
              substatuses: s.substatuses.map((ss) =>
                ss.id === subId ? { ...ss, label: { ...ss.label, [lang]: value } } : ss,
              ),
            },
      ),
    );
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Workflow</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Definisci gli stati attraverso cui far passare una segnalazione e gli eventuali sotto-stati
        (es. su "Chiusa": Archiviata / Spam). Gli stati di sistema non possono essere eliminati.
      </p>

      {error && <p className="mb-4 text-sm font-semibold text-wv-danger">{error}</p>}

      <div className="space-y-4">
        {statuses.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[160px] flex-1">
                <Label>Stato (Italiano)</Label>
                <Input value={s.label.it ?? ""} onChange={(e) => editStatus(s.id, "it", e.target.value)} />
              </div>
              <div className="min-w-[160px] flex-1">
                <Label>Stato (English)</Label>
                <Input value={s.label.en ?? ""} onChange={(e) => editStatus(s.id, "en", e.target.value)} />
              </div>
              <div className="w-20">
                <Label>Ordine</Label>
                <Input
                  type="number"
                  value={s.order}
                  onChange={(e) =>
                    setStatuses((prev) =>
                      prev.map((x) => (x.id === s.id ? { ...x, order: +e.target.value } : x)),
                    )
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                {s.system_defined && <Badge>Sistema</Badge>}
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => run(() => api.updateStatus(token!, s.id, { label: s.label, order: s.order }))}
                >
                  Salva
                </Button>
                {!s.system_defined && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Eliminare lo stato "${s.label.it ?? ""}"?`))
                        run(() => api.deleteStatus(token!, s.id));
                    }}
                  >
                    Elimina
                  </Button>
                )}
              </div>
            </div>

            {/* Sub-statuses */}
            <div className="mt-4 border-t border-border pt-4">
              <Label>Sotto-stati</Label>
              <div className="mt-2 space-y-2">
                {s.substatuses.map((ss) => (
                  <div key={ss.id} className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[140px] flex-1">
                      <Input
                        aria-label="Sotto-stato (Italiano)"
                        placeholder="Italiano"
                        value={ss.label.it ?? ""}
                        onChange={(e) => editSub(s.id, ss.id, "it", e.target.value)}
                      />
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <Input
                        aria-label="Sotto-stato (English)"
                        placeholder="English"
                        value={ss.label.en ?? ""}
                        onChange={(e) => editSub(s.id, ss.id, "en", e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => run(() => api.updateSubstatus(token!, ss.id, { label: ss.label }))}
                    >
                      Salva
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => run(() => api.deleteSubstatus(token!, ss.id))}
                    >
                      Elimina
                    </Button>
                  </div>
                ))}
                {s.substatuses.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nessun sotto-stato.</p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Input
                    aria-label={`Nuovo sotto-stato per ${s.label.it ?? ""}`}
                    placeholder="Nuovo sotto-stato (IT)…"
                    className="max-w-xs"
                    value={newSub[s.id] ?? ""}
                    onChange={(e) => setNewSub({ ...newSub, [s.id]: e.target.value })}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || !(newSub[s.id] ?? "").trim()}
                    onClick={() =>
                      run(async () => {
                        const it = (newSub[s.id] ?? "").trim();
                        await api.createSubstatus(token!, s.id, { it, en: it }, s.substatuses.length);
                        setNewSub({ ...newSub, [s.id]: "" });
                      })
                    }
                  >
                    Aggiungi sotto-stato
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-foreground">Nuovo stato</h2>
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Stato (Italiano)</Label>
            <Input value={newStatus.it} onChange={(e) => setNewStatus({ ...newStatus, it: e.target.value })} />
          </div>
          <div>
            <Label>Stato (English)</Label>
            <Input value={newStatus.en} onChange={(e) => setNewStatus({ ...newStatus, en: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button
              disabled={busy || !newStatus.it.trim()}
              onClick={() =>
                run(async () => {
                  await api.createStatus(
                    token!,
                    { it: newStatus.it.trim(), en: (newStatus.en || newStatus.it).trim() },
                    statuses.length,
                  );
                  setNewStatus({ it: "", en: "" });
                })
              }
            >
              Crea stato
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
