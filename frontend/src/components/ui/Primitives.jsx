import React from "react";
import { cn } from "../../lib/api";

export function Button({ as: As = "button", variant = "primary", size = "md", className = "", children, ...rest }) {
  const variants = {
    primary: "bg-brand-500 hover:bg-brand-600 text-white shadow-soft",
    secondary: "bg-ink-900 hover:bg-ink-800 text-white",
    outline: "bg-white border border-ink-200 hover:bg-ink-50 text-ink-800",
    ghost: "hover:bg-ink-100 text-ink-700",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    warn: "bg-amber-500 hover:bg-amber-600 text-white",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-lg",
    md: "h-10 px-4 text-sm rounded-lg",
    lg: "h-12 px-5 text-base rounded-lg",
    pos: "h-14 px-5 text-lg rounded-xl font-semibold",
  };
  return (
    <As
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brand-500/30",
        variants[variant], sizes[size], className
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

export function Input({ className = "", ...rest }) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
        className
      )}
      {...rest}
    />
  );
}

export function Textarea({ className = "", ...rest }) {
  return (
    <textarea
      className={cn(
        "min-h-[80px] w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
        className
      )}
      {...rest}
    />
  );
}

export function Select({ className = "", children, ...rest }) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Card({ className = "", children, ...rest }) {
  return (
    <div
      className={cn("rounded-xl border border-ink-200 bg-white shadow-soft transition-shadow hover:shadow-md", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Badge({ tone = "default", className = "", children }) {
  const tones = {
    default: "bg-ink-100 text-ink-700",
    brand: "bg-brand-100 text-brand-700",
    warn: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    dark: "bg-ink-900 text-white",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children, size = "md" }) {
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn("w-full rounded-2xl bg-white shadow-pop", sizes[size])}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
            <h3 className="font-heading text-lg font-bold text-ink-900">{title}</h3>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-ink-100" data-testid="modal-close">✕</button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Label({ children, className = "" }) {
  return <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500", className)}>{children}</label>;
}

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/40 px-6 py-14 text-center">
      {Icon && <Icon className="h-10 w-10 text-ink-400" strokeWidth={1.5} />}
      <p className="mt-3 font-heading text-base font-semibold text-ink-800">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}
