import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import { useAuth } from "../auth";
import { Card } from "../components/ui/card";

type Stats = Awaited<ReturnType<typeof api.stats>>;

const PIE = ["#0369A1", "#15803D", "#B45309", "#075985", "#51607A"];
const axis = { fontSize: 12, fill: "#51607A" };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-wv-navy">{title}</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function Statistics() {
  const { token } = useAuth();
  const [s, setS] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.stats(token).then(setS).catch((e) => setError(e.message));
  }, [token]);

  if (error) return <p className="text-sm font-semibold text-wv-danger">{error}</p>;
  if (!s) return <p className="text-muted-foreground">Caricamento…</p>;

  const monthData = Object.entries(s.by_month).map(([m, c]) => ({ month: m, count: c }));

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold text-wv-navy">Statistiche</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Segnalazioni totali</div>
          <div className="mt-1 text-3xl font-bold text-wv-navy">{s.total}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Importanti</div>
          <div className="mt-1 text-3xl font-bold text-wv-warning">{s.important}</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Per stato">
          <BarChart data={s.by_status} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="#E2E8F0" />
            <XAxis type="number" tick={axis} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={axis} width={120} />
            <Tooltip cursor={{ fill: "#F0F4F8" }} />
            <Bar dataKey="count" fill="#0369A1" radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </Panel>

        <Panel title="Per canale">
          <PieChart>
            <Pie data={s.by_context} dataKey="count" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {s.by_context.map((_, i) => (
                <Cell key={i} fill={PIE[i % PIE.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </Panel>

        <Panel title="Per mese">
          <LineChart data={monthData} margin={{ left: 4, right: 16 }}>
            <CartesianGrid stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={axis} />
            <YAxis tick={axis} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#0369A1" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </Panel>
      </div>
    </>
  );
}
