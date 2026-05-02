import React, { useEffect, useState } from "react";
import { api, fmtMAD, formatApiErrorDetail } from "../lib/api";
import { Button, Input, Card, Badge, Modal, Label, Select, EmptyState } from "../components/ui/Primitives";
import { ArrowDownToLine, ArrowUpFromLine, History, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export default function Stock() {
  const { has } = useAuth();
  const canEdit = has("admin", "gestionnaire");
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState({ low_stock: [], expiring: [], expired: [] });
  const [tab, setTab] = useState("alerts");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ product_id: "", type: "in", quantity: 0, note: "" });

  const load = async () => {
    const [p, m, a] = await Promise.all([
      api.get("/api/products"),
      api.get("/api/stock/movements?limit=200"),
      api.get("/api/stock/alerts"),
    ]);
    setProducts(p.data); setMovements(m.data); setAlerts(a.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.product_id) { toast.error("Sélectionnez un produit"); return; }
    try {
      await api.post("/api/stock/movements", {
        ...form,
        quantity: parseInt(form.quantity || 0),
      });
      toast.success("Mouvement enregistré");
      setModal(null);
      setForm({ product_id: "", type: "in", quantity: 0, note: "" });
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const tabs = [
    { id: "alerts", label: "Alertes", icon: AlertTriangle, count: alerts.low_stock.length + alerts.expiring.length + alerts.expired.length },
    { id: "movements", label: "Mouvements", icon: History, count: movements.length },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Inventaire</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink-900">Gestion du stock</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => { setForm({ product_id: "", type: "in", quantity: 0, note: "" }); setModal("in"); }} data-testid="stock-in-btn">
              <ArrowDownToLine className="h-4 w-4" /> Entrée
            </Button>
            <Button variant="secondary" onClick={() => { setForm({ product_id: "", type: "out", quantity: 0, note: "" }); setModal("out"); }} data-testid="stock-out-btn">
              <ArrowUpFromLine className="h-4 w-4" /> Sortie
            </Button>
            <Button variant="outline" onClick={() => { setForm({ product_id: "", type: "adjustment", quantity: 0, note: "Inventaire" }); setModal("adj"); }} data-testid="stock-adj-btn">
              Ajustement
            </Button>
          </div>
        )}
      </header>

      <div className="flex gap-2 border-b border-ink-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`stock-tab-${t.id}`}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? "border-brand-500 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            <Badge tone={tab === t.id ? "brand" : "default"}>{t.count}</Badge>
          </button>
        ))}
      </div>

      {tab === "alerts" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <AlertList title="Stock faible" tone="warn" items={alerts.low_stock} render={(p) => (
            <span className="text-xs"><span className="font-mono font-bold">{p.stock}</span> / min {p.stock_min}</span>
          )} />
          <AlertList title="Expirent bientôt" tone="info" items={alerts.expiring} render={(p) => (
            <span className="text-xs">{new Date(p.expiry_date).toLocaleDateString("fr-FR")}</span>
          )} />
          <AlertList title="Expirés" tone="danger" items={alerts.expired} render={(p) => (
            <span className="text-xs">{new Date(p.expiry_date).toLocaleDateString("fr-FR")}</span>
          )} />
        </div>
      )}

      {tab === "movements" && (
        movements.length === 0 ? (
          <EmptyState icon={History} title="Aucun mouvement de stock" />
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Produit</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Quantité</th>
                  <th className="p-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-ink-100">
                    <td className="p-3 font-mono text-xs text-ink-500">{new Date(m.created_at).toLocaleString("fr-FR")}</td>
                    <td className="p-3 font-medium text-ink-900">{m.product_name}</td>
                    <td className="p-3">
                      <Badge tone={m.type === "in" ? "brand" : m.type === "out" ? "danger" : "info"}>
                        {m.type === "in" ? "Entrée" : m.type === "out" ? "Sortie" : "Ajust."}
                      </Badge>
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${m.quantity > 0 ? "text-brand-700" : "text-red-600"}`}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </td>
                    <td className="p-3 text-ink-600">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "in" ? "Entrée de stock" : modal === "out" ? "Sortie de stock" : "Ajustement d'inventaire"}>
        <div className="space-y-4">
          <div>
            <Label>Produit *</Label>
            <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} data-testid="movement-product">
              <option value="">— Sélectionner —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
            </Select>
          </div>
          <div>
            <Label>{form.type === "adjustment" ? "Stock réel constaté" : "Quantité"}</Label>
            <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="movement-qty" />
          </div>
          <div>
            <Label>Note</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Achat fournisseur, casse, inventaire…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
            <Button onClick={submit} data-testid="movement-save">Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AlertList({ title, tone, items, render }) {
  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-ink-900">
        <AlertTriangle className={`h-4 w-4 ${tone === "warn" ? "text-amber-600" : tone === "danger" ? "text-red-600" : "text-blue-600"}`} />
        {title}
        <Badge tone={tone}>{items.length}</Badge>
      </h3>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-500">Rien à signaler</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
              <span className="truncate text-sm text-ink-800">{p.name}</span>
              {render(p)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
