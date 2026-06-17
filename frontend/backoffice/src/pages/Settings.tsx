import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Notice } from "../components/ui/notice";

export function Settings() {
  const { token } = useAuth();
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function init() {
    setError("");
    setMsg("");
    try {
      const r = await api.twofaInit(token!);
      setSecret(r.secret);
      setUri(r.otpauth_uri);
      setRecovery([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    }
  }

  async function confirm() {
    setError("");
    try {
      const r = await api.twofaConfirm(token!, secret, code.trim());
      setRecovery(r.recovery_codes);
      setSecret("");
      setUri("");
      setCode("");
      setMsg("2FA attivato. Conserva i codici di recupero qui sotto.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Codice non valido");
    }
  }

  async function disable() {
    setError("");
    const c = prompt("Inserisci un codice 2FA o un codice di recupero per disattivare:");
    if (c === null) return;
    try {
      await api.twofaDisable(token!, c.trim());
      setMsg("2FA disattivato.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Codice non valido");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-wv-navy">Impostazioni</h1>

      <h2 className="mb-3 text-sm font-semibold text-wv-navy">Cambia password</h2>
      <ChangePassword />

      <h2 className="mb-3 mt-8 text-sm font-semibold text-wv-navy">Autenticazione a due fattori (2FA)</h2>
      <Card className="space-y-4 p-6">
        {!uri && recovery.length === 0 && (
          <div className="flex gap-3">
            <Button onClick={init}>Attiva 2FA</Button>
            <Button variant="secondary" onClick={disable}>Disattiva 2FA</Button>
          </div>
        )}

        {uri && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Inserisci questa chiave nella tua app di autenticazione (es. Google Authenticator), poi digita il codice generato.
            </p>
            <p className="text-sm">
              <strong className="font-semibold">Chiave:</strong>{" "}
              <code className="rounded bg-wv-surface2 px-1.5 py-0.5 font-mono text-xs">{secret}</code>
            </p>
            <p className="break-all font-mono text-xs text-muted-foreground">{uri}</p>
            <div>
              <Label htmlFor="code">Codice a 6 cifre</Label>
              <Input id="code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <Button disabled={!code.trim()} onClick={confirm}>Conferma e attiva</Button>
          </div>
        )}

        {recovery.length > 0 && (
          <Notice variant="warn">
            <strong>Codici di recupero (mostrati una sola volta):</strong>
            <ul className="mt-2 grid grid-cols-2 gap-1 font-mono">
              {recovery.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Notice>
        )}

        {msg && <Notice variant="ok">{msg}</Notice>}
        {error && <Notice variant="warn" role="alert">{error}</Notice>}
      </Card>
    </div>
  );
}

function ChangePassword() {
  const { token } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await api.changePassword(token!, current, next);
      setMsg("Password aggiornata.");
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="cur">Password attuale</Label>
          <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="nw">Nuova password</Label>
          <Input id="nw" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        {msg && <Notice variant="ok">{msg}</Notice>}
        {error && <Notice variant="warn" role="alert">{error}</Notice>}
        <Button type="submit" disabled={!current || !next}>Aggiorna password</Button>
      </form>
    </Card>
  );
}
