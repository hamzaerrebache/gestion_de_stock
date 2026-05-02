import React, { useEffect, useState } from "react";
import { api, fmtMAD } from "../lib/api";
import { Card, Badge } from "../components/ui/Primitives";
import {
  TrendingUp, ShoppingBag, Package, AlertTriangle, Calendar, DollarSign, Activity,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

const Kpi = ({ icon: Icon, label, value, hint, tone = "brand" }) => {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    info: "bg-blue-50 text-blue-700",
    warn: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    ink: "bg-ink-100 text-ink-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</p>
          <p className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-ink-900" data-testid={`kpi-${label.replace(/\s+/g, "-").toLowerCase()}`}>{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </div>
      </div>
    </Card>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);

  const load = async () => {
    const { data } = await api.get("/api/dashboard");
    setData(data);
  };
  useEffect(() => { load(); }, []);

  if (!data) return <div className="text-ink-500">Chargement…</div>;
  const { kpis, top_products, daily_sales, alerts } = data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Aperçu</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Tableau de bord</h1>
          <p className="mt-1 text-sm text-ink-500">Performance, alertes et activité de la parapharmacie en temps réel.</p>
        </div>
        <Badge tone="brand">Devise : MAD (DH)</Badge>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} tone="brand" label="CA aujourd'hui" value={fmtMAD(kpis.ca_today)} hint={`${kpis.count_today} ventes`} />
        <Kpi icon={TrendingUp} tone="info" label="CA du mois" value={fmtMAD(kpis.ca_month)} hint={`Bénéfice: ${fmtMAD(kpis.profit_month)}`} />
        <Kpi icon={Package} tone="ink" label="Produits" value={kpis.products_count} hint={`Valeur stock: ${fmtMAD(kpis.stock_value)}`} />
        <Kpi icon={AlertTriangle} tone={kpis.low_stock_count + kpis.expired_count > 0 ? "danger" : "warn"} label="Alertes" value={kpis.low_stock_count + kpis.expiring_count + kpis.expired_count} hint={`Stock bas: ${kpis.low_stock_count} • Expiré: ${kpis.expired_count}`} />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Tendance</p>
              <h3 className="font-heading text-lg font-bold text-ink-900">Ventes des 7 derniers jours</h3>
            </div>
            <Activity className="h-5 w-5 text-brand-600" />
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={daily_sales}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0" }}
                  formatter={(v) => fmtMAD(v)}
                />
                <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: "#10B981" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Top du mois</p>
              <h3 className="font-heading text-lg font-bold text-ink-900">Produits stars</h3>
            </div>
            <ShoppingBag className="h-5 w-5 text-brand-600" />
          </div>
          {top_products.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-500">Aucune vente ce mois-ci</p>
          ) : (
            <ul className="space-y-3">
              {top_products.map((p, i) => (
                <li key={p.product_id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 font-mono text-sm font-bold text-brand-700">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-500">{p.qty} unités · {fmtMAD(p.revenue)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Alerts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AlertCard
          title="Stock faible"
          tone="warn"
          icon={AlertTriangle}
          items={alerts.low_stock}
          renderItem={(p) => (
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-ink-800">{p.name}</span>
              <Badge tone="warn">{p.stock} / min {p.stock_min}</Badge>
            </div>
          )}
          empty="Tous les stocks sont au-dessus du seuil"
        />
        <AlertCard
          title="Bientôt expirés (60j)"
          tone="info"
          icon={Calendar}
          items={alerts.expiring}
          renderItem={(p) => (
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-ink-800">{p.name}</span>
              <Badge tone="info">{new Date(p.expiry_date).toLocaleDateString("fr-FR")}</Badge>
            </div>
          )}
          empty="Aucune expiration imminente"
        />
        <AlertCard
          title="Expirés"
          tone="danger"
          icon={AlertTriangle}
          items={alerts.expired}
          renderItem={(p) => (
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-ink-800">{p.name}</span>
              <Badge tone="danger">{new Date(p.expiry_date).toLocaleDateString("fr-FR")}</Badge>
            </div>
          )}
          empty="Aucun produit expiré"
        />
      </section>
    </div>
  );
}

function AlertCard({ title, tone, icon: Icon, items, renderItem, empty }) {
  const tones = { warn: "text-amber-600", info: "text-blue-600", danger: "text-red-600" };
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${tones[tone]}`} strokeWidth={1.6} />
        <h3 className="font-heading text-base font-bold text-ink-900">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-500">{empty}</p>
      ) : (
        <ul className="space-y-2">{items.map((it) => <li key={it.id}>{renderItem(it)}</li>)}</ul>
      )}
    </Card>
  );
}
