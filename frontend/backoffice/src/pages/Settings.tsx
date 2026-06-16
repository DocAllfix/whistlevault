import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

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
    <>
      <h1>Impostazioni</h1>

      <h2>Cambia password</h2>
      <ChangePassword />

      <h2>Autenticazione a due fattori (2FA)</h2>
      <div className="card">
        {!uri && recovery.length === 0 && (
          <div className="btn-row">
            <button className="btn btn-primary" onClick={init}>
              Attiva 2FA
            </button>
            <button className="btn btn-secondary" onClick={disable}>
              Disattiva 2FA
            </button>
          </div>
        )}

        {uri && (
          <div>
            <p className="muted">
              Inserisci questa chiave nella tua app di autenticazione (es. Google Authenticator),
              poi digita il codice generato.
            </p>
            <p>
              <strong>Chiave:</strong> <code>{secret}</code>
            </p>
            <p className="muted" style={{ wordBreak: "break-all" }}>{uri}</p>
            <label htmlFor="code">Codice a 6 cifre</label>
            <input id="code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
            <div className="btn-row">
              <button className="btn btn-primary" disabled={!code.trim()} onClick={confirm}>
                Conferma e attiva
              </button>
            </div>
          </div>
        )}

        {recovery.length > 0 && (
          <div className="card" style={{ background: "#fef9e7" }}>
            <strong>Codici di recupero (mostrati una sola volta):</strong>
            <ul>
              {recovery.map((c) => (
                <li key={c}>
                  <code>{c}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {msg && <p style={{ color: "var(--color-success)" }}>{msg}</p>}
        {error && <p className="error-text">{error}</p>}
      </div>
    </>
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
    <form className="card" onSubmit={submit}>
      <label htmlFor="cur">Password attuale</label>
      <input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <label htmlFor="nw">Nuova password</label>
      <input id="nw" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      {msg && <p style={{ color: "var(--color-success)" }}>{msg}</p>}
      {error && <p className="error-text">{error}</p>}
      <div className="btn-row">
        <button className="btn btn-primary" type="submit" disabled={!current || !next}>
          Aggiorna password
        </button>
      </div>
    </form>
  );
}
