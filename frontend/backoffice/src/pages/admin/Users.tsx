import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { ROLE_LABEL } from "../../components/Nav";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label, selectClass } from "../../components/ui/label";

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
      <h1 className="mb-6 text-2xl font-semibold text-wv-navy">Utenti</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-wv-surface2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Utente</th>
              <th className="px-4 py-2.5">Ruolo</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">2FA</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border first:border-t-0">
                <td className="px-4 py-3">
                  <span className="font-medium text-wv-navy">{u.name || u.username}</span>{" "}
                  <span className="text-muted-foreground">({u.username})</span>
                </td>
                <td className="px-4 py-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.mail_address || "—"}</td>
                <td className="px-4 py-3">
                  {u.two_factor_enabled ? <Badge variant="success">Attivo</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const p = prompt(`Nuova password per ${u.username} (recupero escrow, preserva i report):`);
                      if (p)
                        api
                          .recoverUser(token!, u.id, p)
                          .then((r) => alert(`Recupero eseguito. Codice di recupero:\n${r.recovery_key}`))
                          .catch((e) => setError(e.message));
                    }}
                  >
                    Recupera
                  </Button>{" "}
                  <Button size="sm" variant="destructive" onClick={() => api.deleteUser(token!, u.id).then(load).catch((e) => setError(e.message))}>
                    Elimina
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-wv-navy">Nuovo utente</h2>
      <Card className="p-6">
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nome utente</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <Label>Password iniziale</Label>
            <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.mail_address} onChange={(e) => setForm({ ...form, mail_address: e.target.value })} />
          </div>
          <div>
            <Label>Ruolo</Label>
            <select className={selectClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="recipient">Gestore</option>
              <option value="custodian">Custode</option>
              <option value="analyst">Analista</option>
              <option value="admin">Amministratore</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            {error && <p className="mb-3 text-sm font-semibold text-wv-danger">{error}</p>}
            <Button type="submit" disabled={busy || !form.username || !form.password}>Crea utente</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
