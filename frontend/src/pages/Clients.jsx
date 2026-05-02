import React, { useEffect, useState } from "react";
import { api, fmtMAD, formatApiErrorDetail } from "../lib/api";
import { Card, Badge, Button, Input, Modal, Label, EmptyState } from "../components/ui/Primitives";
import { Users, Plus, Edit2, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const empty = { name: "", phone: "", email: "", address: "" };

export default function Clients() {
  const { has } = useAuth();
  const canDelete = has("admin", "gestionnaire");
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => { const { data } = await api.get("/api/clients"); setList(data); };
  useEffect(() => { load(); }, []);

  const open = (c = null) => { setForm(c || empty); setModal(c || "create"); };
  const save = async () => {
    try {
      if (modal === "create") await api.post("/api/clients", form);
      else await api.put(`/api/clients/${modal.id}`, form);
      toast.success("Enregistré"); setModal(null); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const remove = async (c) => {
    if (!window.confirm(`Supprimer ${c.name} ?`)) return;
    await api.delete(`/api/clients/${c.id}`); toast.success("Supprimé"); load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Fidélisation</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink-900">Clients</h1>
          <p className="mt-1 text-sm text-ink-500">{list.length} client{list.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => open()} data-testid="client-new"><Plus className="h-4 w-4" /> Nouveau client</Button>
      </header>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="Aucun client enregistré" hint="Créez vos clients fidèles pour suivre leurs achats et leurs points." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Card key={c.id} className="p-5" data-testid={`client-${c.id}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-heading text-lg font-bold text-ink-900">{c.name}</h3>
                  {c.phone && <p className="text-sm text-ink-500">{c.phone}</p>}
                  {c.email && <p className="truncate text-sm text-ink-500">{c.email}</p>}
                </div>
                <Badge tone="info" className="ml-2"><Star className="h-3 w-3" /> {c.loyalty_points}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-3 text-xs">
                <div><p className="text-ink-500">Total dépensé</p><p className="font-bold text-brand-700">{fmtMAD(c.total_spent)}</p></div>
                <div><p className="text-ink-500">Points</p><p className="font-bold text-ink-900">{c.loyalty_points}</p></div>
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <button onClick={() => open(c)} className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-700"><Edit2 className="h-4 w-4" /></button>
                {canDelete && <button onClick={() => remove(c)} className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nouveau client" : "Modifier client"}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          <Button onClick={save} data-testid="client-save">Enregistrer</Button>
        </div>
      </Modal>
    </div>
  );
}
