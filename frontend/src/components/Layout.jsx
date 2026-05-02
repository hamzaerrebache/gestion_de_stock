import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, FileText,
  Truck, Users, BarChart3, UserCog, LogOut, Pill,
} from "lucide-react";
import { cn } from "../lib/api";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, roles: ["admin", "caissier", "gestionnaire"], end: true, testid: "nav-dashboard" },
  { to: "/pos", label: "Caisse (POS)", icon: ShoppingCart, roles: ["admin", "caissier", "gestionnaire"], testid: "nav-pos" },
  { to: "/products", label: "Produits", icon: Package, roles: ["admin", "gestionnaire"], testid: "nav-products" },
  { to: "/stock", label: "Stock", icon: Boxes, roles: ["admin", "gestionnaire", "caissier"], testid: "nav-stock" },
  { to: "/invoices", label: "Factures", icon: FileText, roles: ["admin", "gestionnaire", "caissier"], testid: "nav-invoices" },
  { to: "/suppliers", label: "Fournisseurs", icon: Truck, roles: ["admin", "gestionnaire"], testid: "nav-suppliers" },
  { to: "/clients", label: "Clients", icon: Users, roles: ["admin", "gestionnaire", "caissier"], testid: "nav-clients" },
  { to: "/reports", label: "Rapports", icon: BarChart3, roles: ["admin", "gestionnaire"], testid: "nav-reports" },
  { to: "/users", label: "Utilisateurs", icon: UserCog, roles: ["admin"], testid: "nav-users" },
];

export default function Layout({ children }) {
  const { user, logout, has } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-ink-200 bg-white p-5 lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-soft">
            <Pill className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <p className="font-heading text-base font-extrabold leading-tight text-ink-900">Parapharmacie</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Gestion</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.filter(n => has(...n.roles)).map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testid}
              className={({ isActive }) => cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              )}
            >
              {({ isActive }) => (
                <>
                  <n.icon className={cn("h-[18px] w-[18px]", isActive ? "text-brand-600" : "text-ink-500 group-hover:text-ink-700")} strokeWidth={1.6} />
                  <span>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
              {(user?.name || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900" data-testid="layout-username">{user?.name}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-ink-500 hover:bg-white hover:text-red-500"
              title="Se déconnecter"
              data-testid="layout-logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
        {/* Mobile bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2 font-heading font-extrabold text-ink-900">
            <Pill className="h-5 w-5 text-brand-500" /> Parapharmacie
          </div>
          <button onClick={handleLogout} className="text-sm text-ink-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
