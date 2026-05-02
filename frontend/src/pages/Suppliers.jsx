import React, { useEffect, useState } from "react";
import { api, fmtMAD, formatApiErrorDetail } from "../lib/api";
import { Card, Badge, Button, Input, Modal, Label, Textarea, EmptyState, Select } from "../components/ui/Primitives";
import { Truck, Plus, Edit2, Trash2, Banknote, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const empty = { name: "", phone: "", email: "", address: "", notes: "" };

export default function Suppliers() {
  const { has } = useAuth();
  const canEdit = has("admin", "gestionnaire");
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(null); // null|"create"|supplier
  const [form, setForm] = useState(empty);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: 0, note: "" });
  const [purchaseModal, setPurchaseModal] = useState(null);
  const [purchaseRows, setPurchaseRows] = useState([]);

  const load = async () => {
    const [s, p] = await Promise.all([api.get("/api/suppliers"), api.get("/api/products")]);
    setList(s.data); setProducts(p.data);
  };
  useEffect(() => { load(); }, []);

  const open = (s = null) => {
    if (s) { setForm({ ...empty, ...s }); setModal(s); }
    else { setForm(empty); setModal("create"); }
  };

  const save = async () => {
    try {
      if (modal === "create") await api.post("/api/suppliers", form);
      else await api.put(`/api/suppliers/${modal.id}`, form);
      toast.success("Fournisseur enregistré");
      setModal(null); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Supprimer ${s.name} ?`)) return;
    await api.delete(`/api/suppliers/${s.id}`); toast.success("Supprimé"); load();
  };

  const pay = async () => {
    try {
      await api.post(`/api/suppliers/${payModal.id}/payments`, { amount: Number(payForm.amount), note: payForm.note });
      toast.success("Paiement enregistré");
      setPayModal(null); setPayForm({ amount: 0, note: "" }); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const addPurchaseRow = () => setPurchaseRows([...purchaseRows, { product_id: "", quantity: 1, unit_price: 0 }]);
  const updatePurchaseRow = (i, field, val) => {
    const next = [...purchaseRows];
    next[i] = { ...next[i], [field]: val };
    setPurchaseRows(next);
  };

  const submitPurchase = async () => {
    const items = purchaseRows
      .filter((r) => r.product_id && r.quantity > 0)
      .map((r) => ({ product_id: r.product_id, quantity: parseInt(r.quantity), unit_price: Number(r.unit_price) }));
    if (items.length === 0) { toast.error("Aucun article"); return; }
    try {
      await api.post(`/api/suppliers/${purchaseModal.id}/purchase`, items);
      toast.success("Commande enregistrée");
      setPurchaseModal(null); setPurchaseRows([]); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Achats</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink-900">Fournisseurs</h1>
          <p className="mt-1 text-sm text-ink-500">{list.length} fournisseur{list.length > 1 ? "s" : ""}</p>
        </div>
        {canEdit && <Button onClick={() => open()} data-testid="supplier-new"><Plus className="h-4 w-4" /> Nouveau fournisseur</Button>}
      </header>

      {list.length === 0 ? (
        <EmptyState icon={Truck} title="Aucun fournisseur" hint="Ajoutez votre premier fournisseur pour commencer." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <Card key={s.id} className="p-5" data-testid={`supplier-${s.id}`}>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-ink-900">{s.name}</h3>
                  {s.phone && <p className="mt-0.5 text-sm text-ink-500">{s.phone}</p>}
                  {s.email && <p className="text-sm text-ink-500">{s.email}</p>}
                </div>
                {Number(s.debt) > 0 ? (
                  <Badge tone="danger">{fmtMAD(s.debt)}</Badge>
                ) : (
                  <Badge tone="brand">À jour</Badge>
                )}
              </div>
              {s.address && <p className="text-xs text-ink-500">{s.address}</p>}
              {canEdit && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                  <Button size="sm" variant="outline" onClick={() => { setPurchaseModal(s); setPurchaseRows([{ product_id: "", quantity: 1, unit_price: 0 }]); }}>
                    <ShoppingBag className="h-3.5 w-3.5" /> Achat
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setPayModal(s); setPayForm({ amount: s.debt || 0, note: "" }); }} disabled={!s.debt}>
                    <Banknote className="h-3.5 w-3.5" /> Payer
                  </Button>
                  <button onClick={() => open(s)} className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-700"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => remove(s)} className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nouveau fournisseur" : "Modifier fournisseur"}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          <Button onClick={save} data-testid="supplier-save">Enregistrer</Button>
        </div>
      </Modal>

      {/* Pay debt */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Régler ${payModal?.name}`}>
        <div className="space-y-3">
          <p className="text-sm text-ink-500">Dette actuelle : <span className="font-bold text-red-600">{fmtMAD(payModal?.debt)}</span></p>
          <div><Label>Montant à payer (DH)</Label><Input type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
          <div><Label>Note</Label><Input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} /></div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setPayModal(null)}>Annuler</Button><Button onClick={pay}>Confirmer</Button></div>
        </div>
      </Modal>

      {/* Purchase order */}
      <Modal open={!!purchaseModal} onClose={() => setPurchaseModal(null)} title={`Achat fournisseur — ${purchaseModal?.name}`} size="lg">
        <div className="space-y-3">
          {purchaseRows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Select className="col-span-6" value={row.product_id} onChange={(e) => updatePurchaseRow(i, "product_id", e.target.value)}>
                <option value="">— Produit —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Input className="col-span-2" type="number" min="1" value={row.quantity} onChange={(e) => updatePurchaseRow(i, "quantity", e.target.value)} placeholder="Qté" />
              <Input className="col-span-3" type="number" step="0.01" value={row.unit_price} onChange={(e) => updatePurchaseRow(i, "unit_price", e.target.value)} placeholder="PU" />
              <button onClick={() => setPurchaseRows(purchaseRows.filter((_, idx) => idx !== i))} className="col-span-1 rounded-lg text-ink-500 hover:bg-red-50 hover:text-red-600">✕</button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPurchaseRow}><Plus className="h-3 w-3" /> Ajouter une ligne</Button>
          <div className="flex justify-end gap-2 border-t border-ink-100 pt-3">
            <Button variant="ghost" onClick={() => setPurchaseModal(null)}>Annuler</Button>
            <Button onClick={submitPurchase}>Enregistrer l'achat</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
