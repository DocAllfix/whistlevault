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
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Utenti</h1>

      <div className="mb-8 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-semibold">Utente</th>
              <th className="px-5 py-3 font-semibold">Ruolo</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">2FA</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border align-middle transition-colors hover:bg-muted">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wv-accent/10 text-xs font-bold text-wv-accent">
                      {(u.name || u.username || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{u.name || u.username}</div>
                      <div className="truncate text-xs text-muted-foreground">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="px-5 py-3 text-muted-foreground">{u.mail_address || "—"}</td>
                <td className="px-5 py-3">
                  {u.two_factor_enabled ? <Badge variant="success">Attivo</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
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
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => api.deleteUser(token!, u.id).then(load).catch((e) => setError(e.message))}>
                      Elimina
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  Nessun utente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-foreground">Nuovo utente</h2>
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
