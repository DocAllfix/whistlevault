import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { VaultMark } from "../components/icons";
import { useBrand } from "../lib/useBrand";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Notice } from "../components/ui/notice";

/**
 * Mandatory 2FA enrolment gate for admins (M5). The backend signals
 * `two_factor_setup_required`; an admin cannot operate until TOTP is active.
 */
export function Force2FA() {
  const brand = useBrand();
  const { token, clearTwoFa } = useAuth();
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .twofaInit(token!)
      .then((r) => {
        setSecret(r.secret);
        setUri(r.otpauth_uri);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"));
  }, [token]);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api.twofaConfirm(token!, secret, code.trim());
      setRecovery(r.recovery_codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codice non valido");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <VaultMark size={28} className="text-wv-accent" />
          <span className="text-xl font-semibold tracking-tight text-foreground">{brand}</span>
        </div>
        <Card className="p-6">
          {recovery ? (
            <>
              <h1 className="mb-1 text-xl font-semibold text-foreground">Salva i codici di recupero</h1>
              <p className="mb-4 text-sm text-muted-foreground">
                Conservali in un luogo sicuro: permettono l'accesso se perdi il dispositivo. Non saranno mostrati di nuovo.
              </p>
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted p-4 font-mono text-sm">
                {recovery.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <Button className="w-full" onClick={clearTwoFa}>
                Ho salvato i codici, continua
              </Button>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-semibold text-foreground">Attiva l'autenticazione a due fattori</h1>
              <p className="mb-4 text-sm text-muted-foreground">
                Per gli amministratori il 2FA è obbligatorio. Aggiungi questo account alla tua app di autenticazione
                (Google Authenticator, Authy…), poi inserisci il codice generato.
              </p>
              <div className="mb-4">
                <Label>Chiave segreta (inserimento manuale)</Label>
                <div className="select-all break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
                  {secret || "…"}
                </div>
                {uri && (
                  <p className="mt-1 break-all text-xs text-muted-foreground">{uri}</p>
                )}
              </div>
              <form onSubmit={confirm} className="space-y-4">
                <div>
                  <Label htmlFor="c2">Codice a 6 cifre</Label>
                  <Input id="c2" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                {error && <Notice variant="warn" role="alert">{error}</Notice>}
                <Button type="submit" className="w-full" disabled={busy || !secret || code.trim().length < 6}>
                  {busy ? "Verifica…" : "Attiva 2FA"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
