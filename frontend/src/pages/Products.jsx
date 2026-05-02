import React, { useEffect, useMemo, useState } from "react";
import { api, fmtMAD, formatApiErrorDetail } from "../lib/api";
import { Button, Input, Card, Badge, Modal, Label, Select, Textarea, EmptyState } from "../components/ui/Primitives";
import { Plus, Search, Edit2, Trash2, Package, Barcode } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const empty = {
  name: "", barcode: "", sku: "", category_id: "", description: "", image_url: "",
  purchase_price: 0, sale_price: 0, vat_rate: 20, stock: 0, stock_min: 5, expiry_date: "",
};

export default function Products() {
  const { has } = useAuth();
  const canEdit = has("admin", "gestionnaire");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [modal, setModal] = useState(null); // null | "create" | product object
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [p, c] = await Promise.all([
      api.get("/api/products"),
      api.get("/api/categories"),
    ]);
    setProducts(p.data); setCategories(c.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || (p.barcode || "").includes(q) || (p.sku || "").toLowerCase().includes(q)) &&
      (!catFilter || p.category_id === catFilter)
    );
  }, [products, search, catFilter]);

  const open = (p = null) => {
    if (p) {
      setForm({
        ...empty, ...p,
        expiry_date: p.expiry_date ? String(p.expiry_date).slice(0, 10) : "",
      });
      setModal(p);
    } else {
      setForm(empty);
      setModal("create");
    }
  };

  const save = async () => {
    const payload = {
      ...form,
      purchase_price: Number(form.purchase_price),
      sale_price: Number(form.sale_price),
      vat_rate: Number(form.vat_rate),
      stock: parseInt(form.stock || 0),
      stock_min: parseInt(form.stock_min || 0),
      category_id: form.category_id || null,
      expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
      barcode: form.barcode || null,
      sku: form.sku || null,
      image_url: form.image_url || null,
    };
    try {
      if (modal === "create") {
        await api.post("/api/products", payload);
        toast.success("Produit créé");
      } else {
        await api.put(`/api/products/${modal.id}`, payload);
        toast.success("Produit mis à jour");
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Erreur");
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Supprimer "${p.name}" ?`)) return;
    try {
      await api.delete(`/api/products/${p.id}`);
      toast.success("Produit supprimé");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Catalogue</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink-900">Produits</h1>
          <p className="mt-1 text-sm text-ink-500">{products.length} produits référencés</p>
        </div>
        {canEdit && (
          <Button onClick={() => open()} data-testid="products-new-btn">
            <Plus className="h-4 w-4" /> Nouveau produit
          </Button>
        )}
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, code-barres, SKU)…"
              className="pl-9"
              data-testid="products-search"
            />
          </div>
          <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-56" data-testid="products-cat-filter">
            <option value="">Toutes les catégories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="Aucun produit trouvé" hint="Modifiez votre recherche ou créez un produit." />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="p-3">Produit</th>
                <th className="p-3">Code-barres</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3 text-right">Prix vente</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-right">TVA</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50/50" data-testid={`product-row-${p.id}`}>
                  <td className="p-3">
                    <p className="font-semibold text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-500">PA: {fmtMAD(p.purchase_price)}</p>
                  </td>
                  <td className="p-3 font-mono text-xs text-ink-600">{p.barcode || "—"}</td>
                  <td className="p-3 text-ink-700">{catName(p.category_id)}</td>
                  <td className="p-3 text-right font-semibold text-brand-700">{fmtMAD(p.sale_price)}</td>
                  <td className="p-3 text-right">
                    {p.stock <= p.stock_min ? (
                      <Badge tone={p.stock === 0 ? "danger" : "warn"}>{p.stock}</Badge>
                    ) : (
                      <span className="font-mono text-ink-700">{p.stock}</span>
                    )}
                  </td>
                  <td className="p-3 text-right text-ink-600">{p.vat_rate}%</td>
                  <td className="p-3 text-right">
                    {canEdit && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => open(p)} className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-700" data-testid={`product-edit-${p.id}`}>
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(p)} className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600" data-testid={`product-delete-${p.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nouveau produit" : "Modifier le produit"} size="lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nom du produit *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="product-form-name" />
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category_id || ""} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <Label><Barcode className="inline h-3 w-3 mr-1" />Code-barres / SKU</Label>
            <Input value={form.barcode || ""} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="6111000123" data-testid="product-form-barcode" />
          </div>
          <div>
            <Label>Prix d'achat (DH)</Label>
            <Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
          </div>
          <div>
            <Label>Prix de vente (DH) *</Label>
            <Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} data-testid="product-form-price" />
          </div>
          <div>
            <Label>TVA (%)</Label>
            <Input type="number" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} />
          </div>
          <div>
            <Label>Stock initial</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <Label>Stock minimum (alerte)</Label>
            <Input type="number" value={form.stock_min} onChange={(e) => setForm({ ...form, stock_min: e.target.value })} />
          </div>
          <div>
            <Label>Date d'expiration</Label>
            <Input type="date" value={form.expiry_date || ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>URL image</Label>
            <Input value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          <Button onClick={save} data-testid="product-form-save">Enregistrer</Button>
        </div>
      </Modal>
    </div>
  );
}
