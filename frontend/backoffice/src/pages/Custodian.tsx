import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

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
      <h1 className="mb-6 text-2xl font-semibold text-wv-navy">Richieste di accesso all'identità</h1>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white py-16 text-center">
          <ShieldCheck className="mb-3 text-muted-foreground" size={32} />
          <p className="text-sm text-muted-foreground">Nessuna richiesta in attesa.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((it2) => (
          <Card key={it2.id} className="p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-medium text-wv-navy">Segnalazione {it2.report_id.slice(0, 8)}…</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(it2.request_date), "d MMM yyyy, HH:mm", { locale: it })}
              </span>
            </div>
            <p className="text-sm text-secondary-foreground/80">
              {it2.motivation || <span className="text-muted-foreground">Nessuna motivazione fornita</span>}
            </p>
            <div className="mt-4 flex gap-3">
              <Button size="sm" disabled={busy} onClick={() => resolve(it2.id, true)}>
                Approva
              </Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => resolve(it2.id, false)}>
                Nega
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {error && <p className="mt-4 text-sm font-semibold text-wv-danger">{error}</p>}
    </>
  );
}
