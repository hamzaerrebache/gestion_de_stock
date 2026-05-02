import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import POS from "./pages/POS";
import Invoices from "./pages/Invoices";
import Suppliers from "./pages/Suppliers";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Users from "./pages/Users";

const Protected = ({ children, roles }) => (
  <ProtectedRoute roles={roles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/pos" element={<Protected><POS /></Protected>} />
          <Route path="/products" element={<Protected roles={["admin", "gestionnaire"]}><Products /></Protected>} />
          <Route path="/stock" element={<Protected><Stock /></Protected>} />
          <Route path="/invoices" element={<Protected><Invoices /></Protected>} />
          <Route path="/suppliers" element={<Protected roles={["admin", "gestionnaire"]}><Suppliers /></Protected>} />
          <Route path="/clients" element={<Protected><Clients /></Protected>} />
          <Route path="/reports" element={<Protected roles={["admin", "gestionnaire"]}><Reports /></Protected>} />
          <Route path="/users" element={<Protected roles={["admin"]}><Users /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
