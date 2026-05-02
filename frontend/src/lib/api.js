import axios from "axios";

const baseURL = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const fmtMAD = (v) => {
  const n = Number(v || 0);
  return new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " DH";
};

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Une erreur est survenue.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const cn = (...classes) => classes.filter(Boolean).join(" ");
