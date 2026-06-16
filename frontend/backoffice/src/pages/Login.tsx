import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
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
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Accesso…" : "Accedi"}
          </button>
        </div>
      </form>
    </div>
  );
}
