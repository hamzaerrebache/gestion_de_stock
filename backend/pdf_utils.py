"""PDF invoice generation with reportlab."""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)


def _fmt(v: float) -> str:
    return f"{v:,.2f}".replace(",", " ")


def generate_invoice_pdf(invoice: dict, currency: str = "MAD") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("title", parent=styles["Heading1"], fontSize=22,
                           textColor=colors.HexColor("#0F172A"), spaceAfter=4)
    sub = ParagraphStyle("sub", parent=styles["Normal"], fontSize=10,
                         textColor=colors.HexColor("#475569"))
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=10,
                          textColor=colors.HexColor("#0F172A"))
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=9,
                           textColor=colors.HexColor("#64748B"))

    story = []
    # Header
    header_data = [[
        Paragraph("<b>PARAPHARMACIE</b>", title),
        Paragraph(
            f"<b>FACTURE</b><br/>"
            f"N° <b>{invoice['number']}</b><br/>"
            f"Date: {datetime.fromisoformat(str(invoice['created_at']).replace('Z','+00:00')).strftime('%d/%m/%Y %H:%M') if isinstance(invoice['created_at'], str) else invoice['created_at'].strftime('%d/%m/%Y %H:%M')}",
            sub,
        ),
    ]]
    header = Table(header_data, colWidths=[100 * mm, 70 * mm])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header)
    story.append(Spacer(1, 8 * mm))

    # Client
    story.append(Paragraph("<b>Facturé à</b>", small))
    story.append(Paragraph(invoice.get("client_name") or "Client comptoir", body))
    story.append(Spacer(1, 6 * mm))

    # Items table
    rows = [["Désignation", "Qté", f"PU HT ({currency})", "TVA", f"Total HT ({currency})"]]
    for it in invoice["items"]:
        rows.append([
            it["product_name"],
            str(it["quantity"]),
            _fmt(it["unit_price"]),
            f"{it['vat_rate']:.0f}%",
            _fmt(it["line_total"]),
        ])
    tbl = Table(rows, colWidths=[80 * mm, 18 * mm, 28 * mm, 18 * mm, 30 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#059669")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 6 * mm))

    # Totals
    total_rows = [
        ["Sous-total HT", f"{_fmt(invoice['subtotal_ht'])} {currency}"],
        ["TVA", f"{_fmt(invoice['vat_total'])} {currency}"],
    ]
    if invoice.get("discount", 0) > 0:
        total_rows.append(["Remise", f"- {_fmt(invoice['discount'])} {currency}"])
    total_rows.append(["TOTAL TTC", f"{_fmt(invoice['total_ttc'])} {currency}"])
    tot = Table(total_rows, colWidths=[60 * mm, 50 * mm], hAlign="RIGHT")
    tot.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#0F172A")),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tot)

    if invoice.get("notes"):
        story.append(Spacer(1, 8 * mm))
        story.append(Paragraph(f"<b>Notes</b>: {invoice['notes']}", small))

    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph("Merci pour votre confiance — Parapharmacie", small))

    doc.build(story)
    return buf.getvalue()
