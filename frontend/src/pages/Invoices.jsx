import React, { useEffect, useState } from "react";
import { api, fmtMAD } from "../lib/api";
import { Card, Badge, Button, EmptyState } from "../components/ui/Primitives";
import { FileText, Download, Eye } from "lucide-react";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);

  const load = async () => {
    const { data } = await api.get("/api/invoices");
    setInvoices(data);
  };
  useEffect(() => { load(); }, []);

  const openPdf = (id) => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/invoices/${id}/pdf`, "_blank");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Comptabilité</p>
        <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-ink-900">Factures</h1>
        <p className="mt-1 text-sm text-ink-500">{invoices.length} facture{invoices.length > 1 ? "s" : ""} émise{invoices.length > 1 ? "s" : ""}</p>
      </header>

      {invoices.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune facture" hint="Les factures sont générées depuis la caisse après une vente." />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="p-3">Numéro</th>
                <th className="p-3">Date</th>
                <th className="p-3">Client</th>
                <th className="p-3 text-right">HT</th>
                <th className="p-3 text-right">TVA</th>
                <th className="p-3 text-right">TTC</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-ink-100 hover:bg-ink-50/50" data-testid={`invoice-row-${inv.id}`}>
                  <td className="p-3 font-mono font-bold text-ink-900">{inv.number}</td>
                  <td className="p-3 font-mono text-xs text-ink-500">{new Date(inv.created_at).toLocaleString("fr-FR")}</td>
                  <td className="p-3 text-ink-700">{inv.client_name}</td>
                  <td className="p-3 text-right font-mono">{fmtMAD(inv.subtotal_ht)}</td>
                  <td className="p-3 text-right font-mono">{fmtMAD(inv.vat_total)}</td>
                  <td className="p-3 text-right font-mono font-bold text-brand-700">{fmtMAD(inv.total_ttc)}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => openPdf(inv.id)} data-testid={`invoice-pdf-${inv.id}`}>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
