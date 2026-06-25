import io
import csv
import json
import datetime
from sqlalchemy.orm import Session
from app.models import Asset, Finding, AttackPath, ScanHistory
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_report(db: Session) -> io.BytesIO:
    buffer = io.BytesIO()
    
    # Setup document
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom Palette (sleek dark themed headers, clean text)
    primary_color = colors.HexColor("#0f172a") # Slate 900
    accent_color = colors.HexColor("#6366f1")  # Indigo 500
    danger_color = colors.HexColor("#ef4444")  # Red 500
    warning_color = colors.HexColor("#f59e0b") # Amber 500
    info_color = colors.HexColor("#3b82f6")    # Blue 500
    success_color = colors.HexColor("#10b981") # Emerald 500
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#64748b"), # Slate 500
        spaceAfter=25
    )
    
    heading2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        spaceBefore=15,
        spaceAfter=10
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

    # Document Header
    story.append(Paragraph("AWS CLOUD SECURITY POSTURE REPORT", title_style))
    story.append(Paragraph(f"Generated on {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Enterprise CSPM Platform", subtitle_style))
    story.append(Spacer(1, 10))

    # Fetch status
    total_assets = db.query(Asset).count()
    total_findings = db.query(Finding).count()
    critical_findings = db.query(Finding).filter(Finding.severity == "critical").count()
    high_findings = db.query(Finding).filter(Finding.severity == "high").count()
    medium_findings = db.query(Finding).filter(Finding.severity == "medium").count()
    low_findings = db.query(Finding).filter(Finding.severity == "low").count()
    
    # Calculate security score (latest scan score)
    last_scan = db.query(ScanHistory).filter(ScanHistory.status == "completed").order_by(ScanHistory.started_at.desc()).first()
    score = last_scan.security_score if last_scan else 100.0
    
    # Calculate average business risk
    findings = db.query(Finding).all()
    avg_risk = sum([f.business_risk_score for f in findings]) / len(findings) if findings else 0

    # Executive summary table
    summary_data = [
        [
            Paragraph("<b>Overall Security Posture Score</b>", body_style), 
            Paragraph(f"<font color='{accent_color.hexval()}'><b>{score}%</b></font>", body_style)
        ],
        [
            Paragraph("<b>Average Business Risk Score</b>", body_style), 
            Paragraph(f"<b>{int(avg_risk)} / 100</b>", body_style)
        ],
        [
            Paragraph("<b>Total Assets Discovered</b>", body_style), 
            Paragraph(str(total_assets), body_style)
        ],
        [
            Paragraph("<b>Total Security Findings</b>", body_style), 
            Paragraph(str(total_findings), body_style)
        ],
        [
            Paragraph("<b>Findings Breakdown</b>", body_style),
            Paragraph(
                f"<font color='{danger_color.hexval()}'>Critical: {critical_findings}</font> | "
                f"<font color='{warning_color.hexval()}'>High: {high_findings}</font> | "
                f"<font color='{info_color.hexval()}'>Medium: {medium_findings}</font> | "
                f"<font color='{success_color.hexval()}'>Low: {low_findings}</font>", body_style
            )
        ]
    ]
    
    t_summary = Table(summary_data, colWidths=[200, 320])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    story.append(Paragraph("Executive posture Summary", heading2_style))
    story.append(t_summary)
    story.append(Spacer(1, 20))

    # Attack Paths Section
    paths = db.query(AttackPath).all()
    story.append(Paragraph("Attack Path Analysis", heading2_style))
    if paths:
        path_text = f"The discovery engine identified <b>{len(paths)} Active Attack Paths</b> targeting sensitive assets in your cloud environments."
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
            
        t_paths = Table(path_table_data, colWidths=[150, 80, 290])
        t_paths.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(t_paths)
    else:
        story.append(Paragraph("No critical attack paths detected.", body_style))
    
    story.append(Spacer(1, 20))

    # Detailed Findings Section
    story.append(Paragraph("Top Business Security Risks & Findings", heading2_style))
    
    # Sort findings by severity weight and risk score
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    findings_sorted = sorted(
        findings, 
        key=lambda x: (severity_order.get(x.severity.lower(), 4), -x.business_risk_score)
    )

    for i, finding in enumerate(findings_sorted[:15]): # Include top 15 findings
        severity_color = danger_color if finding.severity == "critical" else (warning_color if finding.severity == "high" else info_color)
        
        # Heading of finding
        title_p = Paragraph(
            f"<b>{i+1}. {finding.title}</b> (Business Risk Score: <b>{finding.business_risk_score}/100</b>)", 
            body_style
        )
        
        details_data = [
            [Paragraph("<b>Target Resource:</b>", body_style), Paragraph(finding.asset_id, body_style)],
            [Paragraph("<b>Severity:</b>", body_style), Paragraph(f"<font color='{severity_color.hexval()}'><b>{finding.severity.upper()}</b></font>", body_style)],
            [Paragraph("<b>Category:</b>", body_style), Paragraph(finding.category, body_style)],
            [Paragraph("<b>Compliance:</b>", body_style), Paragraph(str(finding.compliance_mappings), body_style)],
            [Paragraph("<b>Description:</b>", body_style), Paragraph(finding.description, body_style)]
        ]
        
        if finding.remediation_cli:
            details_data.append([
                Paragraph("<b>Remediation CLI:</b>", body_style),
                Paragraph(finding.remediation_cli.replace('\n', '<br/>'), code_style)
            ])
            
        t_details = Table(details_data, colWidths=[120, 400])
        t_details.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#f1f5f9")),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#f8fafc")),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        story.append(KeepTogether([
            title_p,
            Spacer(1, 4),
            t_details,
            Spacer(1, 12)
        ]))

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_csv_report(db: Session) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
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
