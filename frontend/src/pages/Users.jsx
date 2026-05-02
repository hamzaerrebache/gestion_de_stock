import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Card, Badge, Button, Input, Modal, Label, Select, EmptyState } from "../components/ui/Primitives";
import { Plus, Edit2, Trash2, UserCog, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const empty = { email: "", name: "", role: "caissier", password: "" };
const ROLE_LABELS = { admin: "Administrateur", caissier: "Caissier", gestionnaire: "Gestionnaire" };

export default function Users() {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => { const { data } = await api.get("/api/users"); setList(data); };
  useEffect(() => { load(); }, []);

  const open = (u = null) => {
    if (u) { setForm({ email: u.email, name: u.name, role: u.role, password: "", active: u.active }); setModal(u); }
    else { setForm(empty); setModal("create"); }
  };

  const save = async () => {
    try {
      if (modal === "create") {
        await api.post("/api/users", form);
        toast.success("Utilisateur créé");
      } else {
        const payload = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        if (typeof form.active === "boolean") payload.active = form.active;
        await api.put(`/api/users/${modal.id}`, payload);
        toast.success("Utilisateur mis à jour");
      }
      setModal(null); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Supprimer ${u.email} ?`)) return;
    try { await api.delete(`/api/users/${u.id}`); toast.success("Supprimé"); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Sécurité</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink-900">Utilisateurs & rôles</h1>
        </div>
        <Button onClick={() => open()} data-testid="user-new"><Plus className="h-4 w-4" /> Nouvel utilisateur</Button>
      </header>

      {list.length === 0 ? (
        <EmptyState icon={UserCog} title="Aucun utilisateur" />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="p-3">Nom</th>
                <th className="p-3">Email</th>
                <th className="p-3">Rôle</th>
                <th className="p-3">Statut</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-t border-ink-100" data-testid={`user-row-${u.id}`}>
                  <td className="p-3 font-semibold text-ink-900">{u.name}</td>
                  <td className="p-3 font-mono text-xs text-ink-600">{u.email}</td>
                  <td className="p-3">
                    <Badge tone={u.role === "admin" ? "dark" : u.role === "gestionnaire" ? "info" : "brand"}>
                      <ShieldCheck className="h-3 w-3" /> {ROLE_LABELS[u.role]}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {u.active ? <Badge tone="brand">Actif</Badge> : <Badge tone="danger">Désactivé</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => open(u)} className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-700"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => remove(u)} className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Nouvel utilisateur" : `Modifier ${modal?.name}`}>
        <div className="grid grid-cols-1 gap-3">
          {modal === "create" && (
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-email" /></div>
          )}
          <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-name" /></div>
          <div>
            <Label>Rôle</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="user-role">
              <option value="caissier">Caissier</option>
              <option value="gestionnaire">Gestionnaire</option>
              <option value="admin">Administrateur</option>
            </Select>
          </div>
          <div>
            <Label>{modal === "create" ? "Mot de passe *" : "Nouveau mot de passe (optionnel)"}</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-password" />
          </div>
          {modal !== "create" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-brand-500" />
              Compte actif
            </label>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          <Button onClick={save} data-testid="user-save">Enregistrer</Button>
        </div>
      </Modal>
    </div>
  );
}
