import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, has } = useAuth();
  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !has(...roles)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 p-8">
        <div className="rounded-2xl bg-white p-8 text-center shadow-soft">
          <h2 className="font-heading text-2xl font-bold text-ink-900">Accès refusé</h2>
          <p className="mt-2 text-ink-600">Vous n'avez pas la permission d'accéder à cette page.</p>
        </div>
      </div>
    );
  }
  return children;
}
