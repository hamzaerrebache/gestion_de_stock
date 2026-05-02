import React, { useEffect, useState } from "react";
import { api, fmtMAD } from "../lib/api";
import { Card } from "../components/ui/Primitives";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function Reports() {
  const [data, setData] = useState(null);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    (async () => {
      const [d, s] = await Promise.all([api.get("/api/dashboard"), api.get("/api/sales?limit=200")]);
      setData(d.data); setSales(s.data);
    })();
  }, []);

  if (!data) return <div className="text-ink-500">Chargement…</div>;

  const top = data.top_products;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Analyse</p>
        <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink-900">Rapports & statistiques</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="CA aujourd'hui" value={fmtMAD(data.kpis.ca_today)} />
        <Stat label="CA du mois" value={fmtMAD(data.kpis.ca_month)} />
        <Stat label="Bénéfice estimé (mois)" value={fmtMAD(data.kpis.profit_month)} />
        <Stat label="Valeur stock" value={fmtMAD(data.kpis.stock_value)} />
      </div>

      <Card className="p-5">
        <h3 className="mb-4 font-heading text-lg font-bold text-ink-900">Top produits du mois</h3>
        {top.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">Pas de données ce mois</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={top} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={12} width={180} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0" }} formatter={(v) => `${v} unités`} />
                <Bar dataKey="qty" fill="#10B981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-ink-200 px-5 py-4">
          <h3 className="font-heading text-lg font-bold text-ink-900">Historique des ventes</h3>
        </div>
        {sales.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">Aucune vente</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="p-3">Ticket</th>
                <th className="p-3">Date</th>
                <th className="p-3">Caissier</th>
                <th className="p-3">Mode</th>
                <th className="p-3 text-right">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="p-3 font-mono font-bold text-ink-900">{s.receipt_number}</td>
                  <td className="p-3 font-mono text-xs text-ink-500">{new Date(s.created_at).toLocaleString("fr-FR")}</td>
                  <td className="p-3">{s.cashier_name || "—"}</td>
                  <td className="p-3 capitalize">{s.payment_method}</td>
                  <td className="p-3 text-right font-mono font-bold text-brand-700">{fmtMAD(s.total_ttc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-ink-900">{value}</p>
    </Card>
  );
}
