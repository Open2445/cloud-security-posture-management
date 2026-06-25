import io
import csv
import json
import datetime
from sqlalchemy.orm import Session
from app.models import Asset, Finding, AttackPath, ScanHistory
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_report(db: Session) -> io.BytesIO:
    buffer = io.BytesIO()
    
    # Setup document
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=45, leftMargin=45, topMargin=45, bottomMargin=45
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Color palette
    primary_color = colors.HexColor("#0f172a") # Slate 900
    accent_color = colors.HexColor("#6366f1")  # Indigo 500
    accent_purple = colors.HexColor("#a855f7") # Purple 500
    danger_color = colors.HexColor("#ef4444")  # Red 500
    warning_color = colors.HexColor("#f59e0b") # Amber 500
    info_color = colors.HexColor("#3b82f6")    # Blue 500
    success_color = colors.HexColor("#10b981") # Emerald 500
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=primary_color,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=15
    )
    
    heading2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        spaceBefore=15,
        spaceAfter=12,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155")
    )
    
    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderColor=colors.HexColor("#cbd5e1"),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=4
    )

    # ------------------ COVER PAGE ------------------
    story.append(Spacer(1, 100))
    # Colored graphic accent bar
    accent_bar_data = [[""]]
    t_accent_bar = Table(accent_bar_data, colWidths=[520], rowHeights=[6])
    t_accent_bar.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), accent_color),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_accent_bar)
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("AETHER CLOUD COMPLIANCE AUDIT", title_style))
    story.append(Paragraph("Enterprise Cloud Security Posture Assessment Report", subtitle_style))
    story.append(Spacer(1, 80))
    
    # Metadata Block
    now_str = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    meta_data = [
        [Paragraph("<b>Target Account ID:</b>", body_style), Paragraph("123456789012 (AWS Sandbox)", body_style)],
        [Paragraph("<b>Assessment Date:</b>", body_style), Paragraph(now_str, body_style)],
        [Paragraph("<b>Discovery Scope:</b>", body_style), Paragraph("Compute, Identity, Storage, Databases, Network", body_style)],
        [Paragraph("<b>Framework Target:</b>", body_style), Paragraph("CIS AWS Foundations, NIST CSF, MITRE ATT&CK", body_style)],
        [Paragraph("<b>Assessor Engine:</b>", body_style), Paragraph("Cloud Asset Discovery & Risk Intelligence Engine", body_style)],
    ]
    t_meta = Table(meta_data, colWidths=[150, 370])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    
    # End Cover Page
    story.append(PageBreak())
    
    # ------------------ EXECUTIVE SUMMARY ------------------
    story.append(Paragraph("Executive Posture Assessment Summary", heading2_style))
    story.append(Spacer(1, 5))
    
    # Fetch database statistics
    total_assets = db.query(Asset).count()
    total_findings = db.query(Finding).count()
    critical_findings = db.query(Finding).filter(Finding.severity == "critical").count()
    high_findings = db.query(Finding).filter(Finding.severity == "high").count()
    medium_findings = db.query(Finding).filter(Finding.severity == "medium").count()
    low_findings = db.query(Finding).filter(Finding.severity == "low").count()
    
    last_scan = db.query(ScanHistory).filter(ScanHistory.status == "completed").order_by(ScanHistory.started_at.desc()).first()
    score = last_scan.security_score if last_scan else 100.0
    
    findings = db.query(Finding).all()
    avg_risk = sum([f.business_risk_score for f in findings]) / len(findings) if findings else 0

    summary_data = [
        [Paragraph("<b>Overall Security Posture Score</b>", body_style), Paragraph(f"<font color='{accent_color.hexval()}'><b>{score}%</b></font>", body_style)],
        [Paragraph("<b>Average Business Risk Index</b>", body_style), Paragraph(f"<b>{int(avg_risk)} / 100</b>", body_style)],
        [Paragraph("<b>Discovered Cloud Assets</b>", body_style), Paragraph(str(total_assets), body_style)],
        [Paragraph("<b>Compliance Findings</b>", body_style), Paragraph(str(total_findings), body_style)],
        [Paragraph("<b>Vulnerability Breakdown</b>", body_style), Paragraph(
            f"<font color='{danger_color.hexval()}'>Critical: {critical_findings}</font> | "
            f"<font color='{warning_color.hexval()}'>High: {high_findings}</font> | "
            f"<font color='{info_color.hexval()}'>Medium: {medium_findings}</font> | "
            f"<font color='{success_color.hexval()}'>Low: {low_findings}</font>", body_style
        )],
    ]
    t_summary = Table(summary_data, colWidths=[200, 320])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 15))

    # Business Risk Summary description
    risk_desc = (
        "Based on dynamic risk modeling, your current posture health stands at "
        f"<b>{score}%</b> with an average business risk index of <b>{int(avg_risk)}/100</b>. "
        f"A total of <b>{critical_findings} critical</b> and <b>{high_findings} high-severity</b> misconfigurations "
        "have been discovered. Immediate remediation is highly recommended for credentials lacking MFA "
        "and public buckets exposing database endpoints."
    )
    story.append(Paragraph(risk_desc, body_style))
    story.append(Spacer(1, 15))

    # ------------------ ATTACK PATHS SECTION ------------------
    paths = db.query(AttackPath).all()
    story.append(Paragraph("Attack Path Analysis", heading2_style))
    if paths:
        path_text = f"The risk engine isolated <b>{len(paths)} Active Attack Pathways</b> targeting sensitive cloud data resources."
        story.append(Paragraph(path_text, body_style))
        story.append(Spacer(1, 8))
        
        path_table_data = [[
            Paragraph("<b>Path Name</b>", body_style), 
            Paragraph("<b>Risk Level</b>", body_style), 
            Paragraph("<b>Hops</b>", body_style)
        ]]
        for path in paths:
            path_table_data.append([
                Paragraph(path.name, body_style),
                Paragraph(f"<font color='{danger_color.hexval()}'><b>{path.risk_level.upper()}</b></font>", body_style),
                Paragraph(" → ".join([n.split(":")[-1].split("/")[-1] for n in path.nodes if n != "Internet"]), body_style)
            ])
            
        t_paths = Table(path_table_data, colWidths=[150, 70, 300])
        t_paths.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(t_paths)
    else:
        story.append(Paragraph("No active attack paths identified.", body_style))
    
    story.append(PageBreak())

    # ------------------ COMPLIANCE ALIGNMENT SUMMARY ------------------
    story.append(Paragraph("Regulatory Framework Compliance Summary", heading2_style))
    story.append(Spacer(1, 5))
    
    # Calculate coverage percentages dynamically
    cis_fail = len(set([f.title for f in findings if f.status == "open" and "cis" in f.compliance_mappings]))
    nist_fail = len(set([f.title for f in findings if f.status == "open" and "nist" in f.compliance_mappings]))
    mitre_fail = len(set([f.title for f in findings if f.status == "open" and "mitre" in f.compliance_mappings]))
    cis_cov = max(10, 100 - (cis_fail * 12))
    nist_cov = max(15, 100 - (nist_fail * 15))
    mitre_cov = max(20, 100 - (mitre_fail * 16))

    compliance_data = [
        [Paragraph("<b>Regulatory Framework</b>", body_style), Paragraph("<b>Compliance Percentage</b>", body_style), Paragraph("<b>Status</b>", body_style)],
        [Paragraph("CIS AWS Foundations Benchmark", body_style), Paragraph(f"<b>{cis_cov}%</b>", body_style), Paragraph("Action Recommended" if cis_cov < 90 else "Aligned", body_style)],
        [Paragraph("NIST CSF v1.1 Standard", body_style), Paragraph(f"<b>{nist_cov}%</b>", body_style), Paragraph("Action Recommended" if nist_cov < 90 else "Aligned", body_style)],
        [Paragraph("MITRE ATT&CK Cloud Matrix", body_style), Paragraph(f"<b>{mitre_cov}%</b>", body_style), Paragraph("Action Recommended" if mitre_cov < 90 else "Aligned", body_style)],
    ]
    t_comp = Table(compliance_data, colWidths=[240, 140, 140])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 20))

    # ------------------ DETAILED REMEDIATION PRIORITIES ------------------
    story.append(Paragraph("High-Priority Findings & Remediation Steps", heading2_style))
    
    # Sort findings by severity and business risk score
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    findings_sorted = sorted(
        findings, 
        key=lambda x: (severity_order.get(x.severity.lower(), 4), -x.business_risk_score)
    )

    for i, finding in enumerate(findings_sorted[:10]): # Top 10 findings
        severity_color = danger_color if finding.severity == "critical" else (warning_color if finding.severity == "high" else info_color)
        
        # Keep each finding details together to prevent awkward page cuts
        finding_details = []
        
        title_p = Paragraph(
            f"<b>{i+1}. {finding.title}</b> (Business Risk: <b>{finding.business_risk_score}/100</b>)", 
            body_style
        )
        finding_details.append(title_p)
        finding_details.append(Spacer(1, 4))
        
        details_data = [
            [Paragraph("<b>Target Resource:</b>", body_style), Paragraph(finding.asset_id, body_style)],
            [Paragraph("<b>Severity / Status:</b>", body_style), Paragraph(f"<font color='{severity_color.hexval()}'><b>{finding.severity.upper()}</b></font> | <b>{finding.status.upper()}</b>", body_style)],
            [Paragraph("<b>Compliance Scope:</b>", body_style), Paragraph(str(finding.compliance_mappings), body_style)],
            [Paragraph("<b>Risk Description:</b>", body_style), Paragraph(finding.description, body_style)]
        ]
        
        if finding.remediation_cli:
            details_data.append([
                Paragraph("<b>AWS CLI Command:</b>", body_style),
                Paragraph(finding.remediation_cli.replace('\n', '<br/>'), code_style)
            ])
            
        t_details = Table(details_data, colWidths=[120, 400])
        t_details.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#f1f5f9")),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#f8fafc")),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        finding_details.append(t_details)
        finding_details.append(Spacer(1, 15))
        
        story.append(KeepTogether(finding_details))

    # Build PDF Document
    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_csv_report(db: Session) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Finding ID", "Asset ID", "Asset Name", "Asset Type", "Severity", 
        "Title", "Status", "Category", "Business Risk Score", 
        "In Attack Path", "Compliance Mappings", "CLI Remediation"
    ])
    
    findings = db.query(Finding).all()
    for f in findings:
        asset = db.query(Asset).filter(Asset.id == f.asset_id).first()
        asset_name = asset.name if asset else "Unknown"
        asset_type = asset.type if asset else "Unknown"
        
        writer.writerow([
            f.id, f.asset_id, asset_name, asset_type, f.severity.upper(),
            f.title, f.status, f.category, f.business_risk_score,
            "Yes" if f.in_attack_path else "No",
            json.dumps(f.compliance_mappings),
            f.remediation_cli or ""
        ])
        
    return output.getvalue()

def generate_json_report(db: Session) -> dict:
    findings = db.query(Finding).all()
    assets = db.query(Asset).all()
    paths = db.query(AttackPath).all()
    scans = db.query(ScanHistory).all()
    
    return {
        "metadata": {
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "scope": "aws-cloud-security"
        },
        "stats": {
            "total_assets": len(assets),
            "total_findings": len(findings),
            "critical_findings": len([f for f in findings if f.severity == "critical"]),
            "high_findings": len([f for f in findings if f.severity == "high"]),
            "medium_findings": len([f for f in findings if f.severity == "medium"]),
            "low_findings": len([f for f in findings if f.severity == "low"]),
            "attack_paths_count": len(paths)
        },
        "findings": [
            {
                "id": f.id,
                "asset_id": f.asset_id,
                "title": f.title,
                "description": f.description,
                "severity": f.severity,
                "status": f.status,
                "category": f.category,
                "compliance_mappings": f.compliance_mappings,
                "business_risk_score": f.business_risk_score,
                "in_attack_path": f.in_attack_path,
                "remediation": {
                    "cli": f.remediation_cli,
                    "terraform": f.remediation_terraform
                }
            } for f in findings
        ],
        "assets": [
            {
                "id": a.id,
                "name": a.name,
                "type": a.type,
                "region": a.region,
                "configuration": a.configuration
            } for a in assets
        ],
        "attack_paths": [
            {
                "id": p.id,
                "name": p.name,
                "risk_level": p.risk_level,
                "nodes": p.nodes,
                "description": p.description
            } for p in paths
        ],
        "scans": [
            {
                "id": s.id,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                "status": s.status,
                "total_assets_scanned": s.total_assets_scanned,
                "total_findings_discovered": s.total_findings_discovered,
                "security_score": s.security_score
            } for s in scans
        ]
    }
