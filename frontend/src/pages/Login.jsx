import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button, Input, Label } from "../components/ui/Primitives";
import { Pill, Lock, Mail } from "lucide-react";

export default function Login() {
  const { user, login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@parapharmacie.ma");
  const [password, setPassword] = useState("Admin@2026");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate("/", { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — visual */}
      <div
        className="relative hidden bg-cover bg-center lg:block"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(15,23,42,0.65), rgba(16,185,129,0.45)), url("https://static.prod-images.emergentagent.com/jobs/a76d134c-94bb-449b-af7d-91379b63ec22/images/598ce33e16e8f53d53062d573cde25c451aab956f95aa86dba8915c07af06578.png")',
        }}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Pill className="h-5 w-5" />
            </div>
            <span className="font-heading text-lg font-extrabold tracking-tight">Parapharmacie</span>
          </div>
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-100">Système de gestion intégré</p>
            <h1 className="mt-3 font-heading text-4xl font-extrabold leading-tight">
              Caisse, stock et facturation — simple, rapide, fiable.
            </h1>
            <p className="mt-3 text-sm text-white/80">
              Une plateforme complète pour gérer votre parapharmacie au quotidien.
            </p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="login-form">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white">
              <Pill className="h-5 w-5" />
            </div>
            <span className="font-heading text-lg font-extrabold tracking-tight text-ink-900">Parapharmacie</span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Connexion</p>
          <h2 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink-900">Bon retour parmi nous</h2>
          <p className="mt-2 text-sm text-ink-500">Entrez vos identifiants pour accéder au tableau de bord.</p>

          <div className="mt-8 space-y-4">
            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@parapharmacie.ma"
                  className="pl-9"
                  data-testid="login-email"
                />
              </div>
            </div>
            <div>
              <Label>Mot de passe</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  data-testid="login-password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="login-error">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading} data-testid="login-submit">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </div>

          <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-4 text-xs text-ink-600">
            <p className="mb-1 font-semibold text-ink-700">Comptes de démonstration</p>
            <p>Admin : <span className="font-mono">admin@parapharmacie.ma / Admin@2026</span></p>
            <p>Caissier : <span className="font-mono">caissier@parapharmacie.ma / Cashier@2026</span></p>
            <p>Gestionnaire : <span className="font-mono">gestionnaire@parapharmacie.ma / Manager@2026</span></p>
          </div>
        </form>
      </div>
    </div>
  );
}
