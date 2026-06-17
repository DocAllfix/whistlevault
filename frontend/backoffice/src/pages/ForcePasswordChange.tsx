import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { VaultMark } from "../components/icons";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Notice } from "../components/ui/notice";

export function ForcePasswordChange() {
  const { token, clearPwdChange } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("Le due password non coincidono.");
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(token!, current, next);
      clearPwdChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <VaultMark size={28} className="text-wv-accent" />
          <span className="text-xl font-semibold tracking-tight text-foreground">Whistlevault</span>
        </div>
        <Card className="p-6">
          <h1 className="mb-1 text-xl font-semibold text-foreground">Imposta una nuova password</h1>
          <p className="mb-5 text-sm text-muted-foreground">
            Per sicurezza, al primo accesso devi sostituire la password temporanea.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="cur">Password attuale</Label>
              <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            </div>
            <div>
              <Label htmlFor="nw">Nuova password</Label>
              <Input id="nw" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <Label htmlFor="cf">Conferma nuova password</Label>
              <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            {error && <Notice variant="warn" role="alert">{error}</Notice>}
            <Button type="submit" className="w-full" disabled={busy || !current || !next || !confirm}>
              {busy ? "Aggiornamento…" : "Aggiorna e continua"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
