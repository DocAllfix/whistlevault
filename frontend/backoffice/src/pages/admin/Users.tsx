import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";

export function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", password: "", role: "recipient", name: "", mail_address: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token) return;
    setUsers(await api.users(token));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createUser(token!, form);
      setForm({ username: "", password: "", role: "recipient", name: "", mail_address: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Utenti</h1>
      <table>
        <thead>
          <tr>
            <th>Utente</th>
            <th>Ruolo</th>
            <th>Email</th>
            <th>2FA</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>{u.mail_address || <span className="muted">—</span>}</td>
              <td>{u.two_factor_enabled ? "✓" : "—"}</td>
              <td>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => api.deleteUser(token!, u.id).then(load).catch((e) => setError(e.message))}
                >
                  Elimina
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Nuovo utente</h2>
      <form className="card" onSubmit={create}>
        <div className="row">
          <div>
            <label>Nome utente</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label>Password iniziale</label>
            <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label>Ruolo</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="recipient">recipient</option>
              <option value="custodian">custodian</option>
              <option value="analyst">analyst</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div>
            <label>Nome</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label>Email</label>
            <input value={form.mail_address} onChange={(e) => setForm({ ...form, mail_address: e.target.value })} />
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="btn-row">
          <button className="btn btn-primary" disabled={busy || !form.username || !form.password}>
            Crea utente
          </button>
        </div>
      </form>
    </>
  );
}
