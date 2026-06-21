"""METFPA Sprint S4 — Real Cabinet Brief PDF export (reportlab).
Generated on demand from server-side data. Watermark when provisional/demo."""
import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable)
from reportlab.lib.enums import TA_CENTER

from .db import mdb, audit
from .auth import get_identity
from .router import cabinet, budget_consolidated
from .alerts import build_alerts

pdf_router = APIRouter(prefix="/api/metfpa")

ORANGE = colors.HexColor("#FF8200")
GREEN = colors.HexColor("#009E49")
SLATE = colors.HexColor("#1A202C")
GREY = colors.HexColor("#718096")
RED = colors.HexColor("#C53030")


def _styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle("MTitle", parent=ss["Title"], fontSize=18, textColor=SLATE, spaceAfter=2))
    ss.add(ParagraphStyle("MSub", parent=ss["Normal"], fontSize=9, textColor=GREY))
    ss.add(ParagraphStyle("MH2", parent=ss["Heading2"], fontSize=12, textColor=SLATE, spaceBefore=10, spaceAfter=4))
    ss.add(ParagraphStyle("MBody", parent=ss["Normal"], fontSize=8.5, textColor=SLATE, leading=12))
    ss.add(ParagraphStyle("MSmall", parent=ss["Normal"], fontSize=7.5, textColor=GREY, leading=10))
    ss.add(ParagraphStyle("MWatermark", parent=ss["Normal"], fontSize=9, textColor=RED, alignment=TA_CENTER))
    return ss


def _fmt_m(n):
    if n is None:
        return "Donnée absente"
    if n >= 1_000_000:
        return f"{n/1_000_000:.2f} Bn"
    if n >= 1000:
        return f"{n/1000:.1f} Md"
    return f"{round(n):,} M".replace(",", " ")


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GREY)
    canvas.drawString(18 * mm, 12 * mm, "METFPA · Cockpit Secteur 4.02 · document de démonstration")
    canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


def _table(rows, col_widths, header=True):
    t = Table(rows, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [("FONTSIZE", (0, 0), (-1, -1), 7.5), ("VALIGN", (0, 0), (-1, -1), "TOP"),
             ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
             ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
             ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), SLATE), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                  ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold")]
    t.setStyle(TableStyle(style))
    return t


async def _build_pdf(note: str, identity: dict) -> tuple[bytes, bool]:
    cab = await cabinet(identity)
    budget = await budget_consolidated(identity)
    alerts = await build_alerts()
    ss = _styles()
    el = []
    provisional = True  # data is demo/provisional in Phase 1

    el.append(Paragraph("Note de Cabinet — Secteur 4.02 (EFTP)", ss["MTitle"]))
    el.append(Paragraph("Ministère de l'Enseignement Technique, de la Formation Professionnelle et de l'Apprentissage", ss["MSub"]))
    gen = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    el.append(Paragraph(f"Généré le {gen} · Période de reporting : 2026-2030", ss["MSub"]))
    el.append(Spacer(1, 4))
    el.append(HRFlowable(width="100%", thickness=1.2, color=ORANGE))
    if provisional:
        el.append(Spacer(1, 4))
        el.append(Paragraph("⚠ Données de démonstration / provisoires — non encore validées par le METFPA. "
                            "Aucun budget engagé/exécuté ni liste de directions officielle n'est présenté comme validé.", ss["MWatermark"]))
    el.append(Spacer(1, 8))

    # ① Decisions
    el.append(Paragraph("① Décisions requises", ss["MH2"]))
    if cab["decisions_required"]:
        rows = [["Objet", "Type", "Priorité", "Statut", "Échéance"]]
        for d in cab["decisions_required"][:12]:
            rows.append([Paragraph(d.get("title", ""), ss["MBody"]), d.get("decision_type", ""), d.get("priority", ""),
                         d.get("status", ""), (d.get("due_date") or "")[:10]])
        el.append(_table(rows, [70 * mm, 25 * mm, 22 * mm, 25 * mm, 25 * mm]))
    else:
        el.append(Paragraph("Aucune décision en attente.", ss["MSmall"]))

    # ② Alerts (critical/high)
    el.append(Paragraph("② Alertes critiques & élevées", ss["MH2"]))
    crit = [a for a in alerts if a["severity"] in ("critique", "eleve")][:14]
    if crit:
        rows = [["Sévérité", "Catégorie", "Alerte"]]
        for a in crit:
            rows.append([a["severity"], a["category"], Paragraph(f"{a['title']} — {a['description']}", ss["MBody"])])
        el.append(_table(rows, [22 * mm, 30 * mm, 115 * mm]))
    else:
        el.append(Paragraph("Aucune alerte critique ou élevée.", ss["MSmall"]))

    # ③ Deadlines
    el.append(Paragraph("③ Échéances proches & retards", ss["MH2"]))
    up, ov = cab["deadlines_upcoming"], cab["deadlines_overdue"]
    rows = [["Type", "Code", "Activité", "Échéance"]]
    for a in up[:8]:
        rows.append(["Proche", a.get("code_action", ""), Paragraph(a.get("intitule", ""), ss["MBody"]), a.get("echeance", "")])
    for a in ov[:8]:
        rows.append(["Retard", a.get("code_action", ""), Paragraph(a.get("intitule", ""), ss["MBody"]), a.get("echeance", "")])
    if len(rows) == 1:
        el.append(Paragraph("Aucune échéance proche ni retard.", ss["MSmall"]))
    else:
        el.append(_table(rows, [20 * mm, 22 * mm, 110 * mm, 25 * mm]))

    # ④ Risks
    el.append(Paragraph("④ Risques critiques & élevés", ss["MH2"]))
    if cab["risks_critical_high"]:
        rows = [["Risque", "Cat.", "P×I", "Score", "Sévérité"]]
        for r in cab["risks_critical_high"][:12]:
            rows.append([Paragraph(r.get("title", ""), ss["MBody"]), r.get("category", ""),
                         f"{r.get('probability')}×{r.get('impact')}", str(r.get("risk_score")), r.get("severity", "")])
        el.append(_table(rows, [78 * mm, 28 * mm, 18 * mm, 18 * mm, 25 * mm]))
    else:
        el.append(Paragraph("Aucun risque critique ou élevé enregistré.", ss["MSmall"]))

    # ⑤ Budget
    el.append(Paragraph("⑤ Situation budgétaire (normalisée)", ss["MH2"]))
    rows = [["Cadre", "Période", "Total", "Moyenne/an", "Recouvr. 2026-2030", "Statut"]]
    for f in budget["items"]:
        rows.append([f["framework"], f["period"], _fmt_m(f["total"]), _fmt_m(f["annual_average"]),
                     _fmt_m(f["overlap_value"]), "à valider"])
    el.append(_table(rows, [16 * mm, 28 * mm, 26 * mm, 26 * mm, 34 * mm, 22 * mm]))
    el.append(Spacer(1, 3))
    el.append(Paragraph("Avertissement : les montants relèvent d'horizons et de périmètres différents ; "
                        "la comparaison directe des totaux peut être trompeuse. Engagé/exécuté par activité : "
                        "donnée absente (missing). Répartition État 15% / Bailleurs 85% applicable à la Stratégie digitale uniquement.", ss["MSmall"]))

    # ⑥ Progress
    el.append(Paragraph("⑥ Avancement physique & KPI", ss["MH2"]))
    k = cab["kpis"]
    kpi_rows = [["Décisions en attente", "Risques critiques", "Bloquées", "En retard", "Alertes", "Avanc. moyen"],
                [str(k["decisions_en_attente"]), str(k["risques_critiques"]), str(k["bloques"]),
                 str(k["en_retard"]), str(k["alertes"]), f"{k['avancement_moyen']}%"]]
    el.append(_table(kpi_rows, [30 * mm] * 6))
    el.append(Spacer(1, 4))
    ps = cab["progress_summary"]
    rows = [["Statut", "Nombre"]] + [[s, str(n)] for s, n in ps["by_statut"].items()]
    rows.append(["Avancement moyen", f"{ps['avancement_moyen']}%"])
    el.append(_table(rows, [60 * mm, 30 * mm]))

    # ⑦ Director note
    el.append(Paragraph("⑦ Note du Directeur", ss["MH2"]))
    el.append(Paragraph(note.strip() or "—", ss["MBody"]))

    # Sources / validation summary
    el.append(Paragraph("Sources & statut de validation", ss["MH2"]))
    el.append(Paragraph("Référentiels : référence HTML croisée (Politique EFTP .docx, Stratégie digitale .pdf) — "
                        "statut « en attente de validation METFPA ». Suivi opérationnel, décisions et risques : "
                        "données de démonstration (demo_tracking). Aucune donnée officielle inventée.", ss["MSmall"]))

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=18 * mm,
                            title="METFPA Cabinet Brief", author="Cockpit METFPA")
    doc.build(el, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue(), provisional


@pdf_router.get("/cabinet/export/pdf")
async def export_cabinet_pdf(note: str = Query(default=""), identity: dict = Depends(get_identity)):
    pdf_bytes, provisional = await _build_pdf(note, identity)
    await audit("export_cabinet_pdf", "cabinet_brief", None,
                apres={"provisional": provisional, "bytes": len(pdf_bytes)}, user=identity["email"])
    fname = f"METFPA_Cabinet_Brief_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.pdf"
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{fname}"'})
