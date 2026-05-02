import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anonymous, object = logged
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    setError("");
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      setUser(data.user);
      return true;
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
      return false;
    }
  };

  const logout = async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    setUser(false);
  };

  const has = (...roles) => user && (user.role === "admin" || roles.includes(user.role));

  return (
    <AuthContext.Provider value={{ user, login, logout, refresh, error, has }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
