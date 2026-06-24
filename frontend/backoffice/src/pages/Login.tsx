import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { VaultMark } from "../components/icons";
import { useBrand } from "../lib/useBrand";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Notice } from "../components/ui/notice";

export function Login() {
  const brand = useBrand();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.login(username, password, totp || undefined);
      login(res.token, res.role, res.permissions, res.password_change_needed, res.two_factor_setup_required);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accesso non riuscito");
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await api.forgotPassword(username);
      setInfo("Se l'account esiste, è stata inviata un'email con un codice di reset.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.resetPassword(token.trim(), newPassword);
      setInfo("Password reimpostata. Ora puoi accedere.");
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token non valido o scaduto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <VaultMark size={28} className="text-wv-accent" />
          <span className="text-xl font-semibold tracking-tight text-foreground">{brand}</span>
        </div>

        {mode === "reset" ? (
          <Card className="p-6">
            <h1 className="mb-1 text-xl font-semibold text-foreground">Reimposta la password</h1>
            <p className="mb-5 text-sm text-muted-foreground">Inserisci il nome utente per ricevere un codice.</p>
            <form onSubmit={reset} className="space-y-4">
              <div>
                <Label htmlFor="ru">Nome utente</Label>
                <Input id="ru" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={forgot} disabled={busy || !username}>
                Invia codice via email
              </Button>
              <div>
                <Label htmlFor="rt">Codice ricevuto</Label>
                <Input id="rt" value={token} onChange={(e) => setToken(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rp">Nuova password</Label>
                <Input id="rp" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              {info && <Notice variant="ok">{info}</Notice>}
              {error && <Notice variant="warn" role="alert">{error}</Notice>}
              <div className="flex gap-3">
                <Button type="submit" disabled={busy || !token.trim() || !newPassword}>Reimposta</Button>
                <Button type="button" variant="secondary" onClick={() => setMode("login")}>Torna al login</Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="p-6">
            <h1 className="mb-1 text-xl font-semibold text-foreground">Accesso gestori</h1>
            <p className="mb-5 text-sm text-muted-foreground">Area riservata al personale autorizzato.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="u">Nome utente</Label>
                <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </div>
              <div>
                <Label htmlFor="p">Password</Label>
                <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              <div>
                <Label htmlFor="t">Codice 2FA (se attivo)</Label>
                <Input id="t" inputMode="numeric" value={totp} onChange={(e) => setTotp(e.target.value)} autoComplete="one-time-code" />
              </div>
              {info && <Notice variant="ok">{info}</Notice>}
              {error && <Notice variant="warn" role="alert">{error}</Notice>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Accesso…" : "Accedi"}
              </Button>
              <button type="button" className="w-full text-sm font-medium text-wv-accent hover:underline" onClick={() => setMode("reset")}>
                Password dimenticata?
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
