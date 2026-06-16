import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

export function Login() {
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
      login(res.token, res.role);
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

  if (mode === "reset")
    return (
      <div className="center">
        <h1>Reimposta la password</h1>
        <form className="card" onSubmit={reset}>
          <label htmlFor="ru">Nome utente</label>
          <input id="ru" value={username} onChange={(e) => setUsername(e.target.value)} />
          <div className="btn-row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={forgot} disabled={busy || !username}>
              Invia codice via email
            </button>
          </div>
          <label htmlFor="rt">Codice ricevuto</label>
          <input id="rt" value={token} onChange={(e) => setToken(e.target.value)} />
          <label htmlFor="rp">Nuova password</label>
          <input id="rp" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          {info && <p style={{ color: "var(--color-success)" }}>{info}</p>}
          {error && <p className="error-text">{error}</p>}
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy || !token.trim() || !newPassword}>
              Reimposta
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode("login")}>
              Torna al login
            </button>
          </div>
        </form>
      </div>
    );

  return (
    <div className="center">
      <h1>Accesso gestori</h1>
      <form className="card" onSubmit={submit}>
        <label htmlFor="u">Nome utente</label>
        <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        <label htmlFor="p">Password</label>
        <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <label htmlFor="t">Codice 2FA (se attivo)</label>
        <input id="t" inputMode="numeric" value={totp} onChange={(e) => setTotp(e.target.value)} autoComplete="one-time-code" />
        {info && <p style={{ color: "var(--color-success)" }}>{info}</p>}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Accesso…" : "Accedi"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setMode("reset")}>
            Password dimenticata?
          </button>
        </div>
      </form>
    </div>
  );
}
