import React, { useEffect, useMemo, useState } from "react";
import { api, fmtMAD, formatApiErrorDetail } from "../lib/api";
import { Button, Input, Card, Badge, Modal, Label, Select, EmptyState } from "../components/ui/Primitives";
import { Search, ShoppingCart, Trash2, Plus, Minus, Banknote, CreditCard, Layers, X, ScanLine, FileText } from "lucide-react";
import { toast } from "sonner";

export default function POS() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [cart, setCart] = useState([]); // {product_id, name, qty, unit_price, vat_rate, stock}
  const [discount, setDiscount] = useState(0);
  const [clientId, setClientId] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [lastSale, setLastSale] = useState(null);
  const [scanInput, setScanInput] = useState("");

  const load = async () => {
    const [p, c, cl] = await Promise.all([
      api.get("/api/products"),
      api.get("/api/categories"),
      api.get("/api/clients"),
    ]);
    setProducts(p.data); setCategories(c.data); setClients(cl.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => (!catFilter || p.category_id === catFilter))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.barcode || "").includes(q));
  }, [products, search, catFilter]);

  const addToCart = (p) => {
    if (p.stock <= 0) { toast.error("Rupture de stock"); return; }
    setCart((c) => {
      const i = c.findIndex((x) => x.product_id === p.id);
      if (i >= 0) {
        const next = [...c];
        if (next[i].qty + 1 > p.stock) { toast.error("Stock insuffisant"); return c; }
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...c, { product_id: p.id, name: p.name, qty: 1, unit_price: p.sale_price, vat_rate: p.vat_rate, stock: p.stock }];
    });
  };

  const updateQty = (pid, delta) => {
    setCart((c) => c.flatMap((it) => {
      if (it.product_id !== pid) return [it];
      const q = it.qty + delta;
      if (q <= 0) return [];
      if (q > it.stock) { toast.error("Stock insuffisant"); return [it]; }
      return [{ ...it, qty: q }];
    }));
  };

  const remove = (pid) => setCart((c) => c.filter((x) => x.product_id !== pid));
  const clear = () => { setCart([]); setDiscount(0); setClientId(""); };

  const totals = useMemo(() => {
    let subHT = 0, vat = 0;
    for (const it of cart) {
      const ht = it.unit_price * it.qty;
      const v = ht * (it.vat_rate / 100);
      subHT += ht; vat += v;
    }
    const ttc = Math.max(0, subHT + vat - Number(discount || 0));
    return { subHT, vat, ttc };
  }, [cart, discount]);

  const handleScan = async (e) => {
    if (e.key !== "Enter") return;
    const code = scanInput.trim();
    if (!code) return;
    try {
      const { data } = await api.get(`/api/products/barcode/${encodeURIComponent(code)}`);
      addToCart(data);
      setScanInput("");
    } catch {
      toast.error("Code-barres introuvable");
      setScanInput("");
    }
  };

  const openPayment = () => {
    if (cart.length === 0) { toast.error("Panier vide"); return; }
    setMethod("cash"); setCashAmount(totals.ttc); setCardAmount(0);
    setPaymentOpen(true);
  };

  const finalize = async () => {
    try {
      const payload = {
        items: cart.map((it) => ({
          product_id: it.product_id, quantity: it.qty,
          unit_price: it.unit_price, vat_rate: it.vat_rate,
        })),
        discount: Number(discount || 0),
        payment_method: method,
        cash_amount: method === "card" ? 0 : Number(cashAmount || 0),
        card_amount: method === "cash" ? 0 : Number(cardAmount || 0),
        client_id: clientId || null,
      };
      const { data } = await api.post("/api/sales", payload);
      setLastSale(data);
      setPaymentOpen(false);
      clear();
      load();
      toast.success(`Vente ${data.receipt_number} enregistrée`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const generateInvoice = async () => {
    if (!lastSale) return;
    try {
      const { data } = await api.post(`/api/invoices/from-sale/${lastSale.id}`);
      window.open(`${process.env.REACT_APP_BACKEND_URL}/api/invoices/${data.id}/pdf`, "_blank");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px] lg:items-start" style={{ minHeight: "calc(100vh - 5rem)" }}>
      {/* Products area */}
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Caisse</p>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink-900">Point de vente</h1>
          </div>
        </header>

        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
              <Input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScan}
                placeholder="Scanner ou saisir un code-barres puis Entrée"
                className="pl-9 font-mono"
                data-testid="pos-scan-input"
                autoFocus
              />
            </div>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit…" className="pl-9" data-testid="pos-search" />
            </div>
            <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="sm:w-44">
              <option value="">Toutes catégories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock <= 0}
              className="group relative flex flex-col rounded-xl border border-ink-200 bg-white p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
              data-testid={`pos-product-${p.id}`}
            >
              <div className="relative mb-2 flex h-24 items-center justify-center rounded-lg bg-ink-50">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <span className="font-heading text-3xl font-extrabold text-ink-300">{p.name[0]}</span>
                )}
                <span className={`absolute right-1 top-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${p.stock <= p.stock_min ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700"}`}>
                  {p.stock}
                </span>
              </div>
              <p className="line-clamp-1 text-sm font-semibold text-ink-900">{p.name}</p>
              <p className="mt-1 font-heading text-base font-extrabold text-brand-700">{fmtMAD(p.sale_price)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <aside className="lg:sticky lg:top-6">
        <Card className="flex max-h-[calc(100vh-3rem)] flex-col p-0">
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-brand-600" />
              <h3 className="font-heading text-lg font-bold text-ink-900">Panier</h3>
              <Badge tone="brand">{cart.length}</Badge>
            </div>
            {cart.length > 0 && (
              <button onClick={clear} className="text-xs font-semibold text-red-500 hover:text-red-700" data-testid="pos-clear">
                Vider
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto px-5 py-4">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-sm text-ink-500">
                Ajoutez des produits pour commencer la vente.
              </div>
            ) : (
              <ul className="space-y-3">
                {cart.map((it) => (
                  <li key={it.product_id} className="flex items-center gap-3 rounded-lg bg-ink-50 p-3" data-testid={`pos-cart-${it.product_id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{it.name}</p>
                      <p className="text-xs text-ink-500">{fmtMAD(it.unit_price)} × {it.qty}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 shadow-soft">
                      <button onClick={() => updateQty(it.product_id, -1)} className="rounded p-1.5 hover:bg-ink-100"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-7 text-center font-mono text-sm font-bold">{it.qty}</span>
                      <button onClick={() => updateQty(it.product_id, +1)} className="rounded p-1.5 hover:bg-ink-100"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button onClick={() => remove(it.product_id)} className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t border-ink-200 p-5">
            <div>
              <Label>Client (optionnel)</Label>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)} data-testid="pos-client">
                <option value="">Client comptoir</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Remise (DH)</Label>
              <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} data-testid="pos-discount" />
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-ink-500"><span>Sous-total HT</span><span className="font-mono">{fmtMAD(totals.subHT)}</span></div>
              <div className="flex justify-between text-ink-500"><span>TVA</span><span className="font-mono">{fmtMAD(totals.vat)}</span></div>
              {Number(discount) > 0 && (
                <div className="flex justify-between text-amber-600"><span>Remise</span><span className="font-mono">- {fmtMAD(discount)}</span></div>
              )}
              <div className="mt-2 flex justify-between border-t border-ink-200 pt-2">
                <span className="font-heading text-base font-bold text-ink-900">Total TTC</span>
                <span className="font-heading text-2xl font-extrabold text-brand-700" data-testid="pos-total">{fmtMAD(totals.ttc)}</span>
              </div>
            </div>

            <Button size="pos" className="w-full" onClick={openPayment} disabled={cart.length === 0} data-testid="pos-pay">
              Encaisser
            </Button>
          </div>
        </Card>
      </aside>

      {/* Payment modal */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Paiement" size="md">
        <div className="space-y-5">
          <div className="rounded-xl bg-ink-900 p-5 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-300">Total à payer</p>
            <p className="mt-1 font-heading text-4xl font-extrabold tracking-tight">{fmtMAD(totals.ttc)}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <PayBtn active={method === "cash"} onClick={() => { setMethod("cash"); setCashAmount(totals.ttc); setCardAmount(0); }} icon={Banknote} label="Espèces" testid="pay-cash" />
            <PayBtn active={method === "card"} onClick={() => { setMethod("card"); setCardAmount(totals.ttc); setCashAmount(0); }} icon={CreditCard} label="Carte" testid="pay-card" />
            <PayBtn active={method === "mixed"} onClick={() => { setMethod("mixed"); setCashAmount(0); setCardAmount(0); }} icon={Layers} label="Mixte" testid="pay-mixed" />
          </div>

          {method === "cash" && (
            <div>
              <Label>Montant reçu (DH)</Label>
              <Input type="number" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="text-lg" data-testid="pay-cash-amount" />
              <p className="mt-2 text-sm text-ink-500">
                Monnaie à rendre : <span className="font-mono font-bold text-brand-700">{fmtMAD(Math.max(0, Number(cashAmount) - totals.ttc))}</span>
              </p>
            </div>
          )}
          {method === "mixed" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Espèces (DH)</Label>
                <Input type="number" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
              </div>
              <div>
                <Label>Carte (DH)</Label>
                <Input type="number" step="0.01" value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} />
              </div>
              <p className="col-span-2 text-sm text-ink-500">
                Total saisi : <span className="font-mono">{fmtMAD(Number(cashAmount) + Number(cardAmount))}</span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPaymentOpen(false)}>Annuler</Button>
            <Button size="lg" onClick={finalize} data-testid="pay-confirm">Confirmer le paiement</Button>
          </div>
        </div>
      </Modal>

      {/* Last sale receipt */}
      <Modal open={!!lastSale} onClose={() => setLastSale(null)} title={`Ticket ${lastSale?.receipt_number}`} size="md">
        {lastSale && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-ink-300 p-5">
              <p className="font-mono text-xs text-ink-500">N° {lastSale.receipt_number}</p>
              <p className="font-mono text-xs text-ink-500">{new Date(lastSale.created_at).toLocaleString("fr-FR")}</p>
              <p className="font-mono text-xs text-ink-500">Caissier : {lastSale.cashier_name}</p>
              <hr className="my-3 border-dashed" />
              <ul className="space-y-1 text-sm">
                {lastSale.items.map((it, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{it.product_name} × {it.quantity}</span>
                    <span className="font-mono">{fmtMAD(it.line_total_ttc)}</span>
                  </li>
                ))}
              </ul>
              <hr className="my-3 border-dashed" />
              <div className="flex justify-between font-heading text-lg font-extrabold">
                <span>TOTAL</span><span>{fmtMAD(lastSale.total_ttc)}</span>
              </div>
              <p className="mt-2 text-xs text-ink-500">Mode : {lastSale.payment_method}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.print()}>Imprimer</Button>
              <Button variant="secondary" onClick={generateInvoice} data-testid="receipt-invoice">
                <FileText className="h-4 w-4" /> Générer facture PDF
              </Button>
              <Button onClick={() => setLastSale(null)}>Fermer</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PayBtn({ active, onClick, icon: Icon, label, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all ${
        active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
      }`}
    >
      <Icon className="h-6 w-6" strokeWidth={1.6} />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
