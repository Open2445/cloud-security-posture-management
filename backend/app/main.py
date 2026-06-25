import io
import json
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.database import get_db, Base, engine
from app.models import User, Asset, Finding, AssetRelationship, AttackPath, SecurityEvent, ScanHistory
from app import schemas
from app import auth
from app import scanner
from app import importer
from app import reports
from app import seed

# Create Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Enterprise CSPM Platform API",
    description="Backend APIs for Cloud Security Posture Management (CSPM) inspired by Wiz and Prisma Cloud.",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Endpoints ---

@app.post("/api/auth/login", response_model=schemas.Token)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not auth.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: User = Depends(auth.get_current_user)):
    return current_user


# --- Dashboard Statistics Endpoint ---

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    # Posture Score
    last_scan = db.query(ScanHistory).filter(ScanHistory.status == "completed").order_by(ScanHistory.started_at.desc()).first()
    score = int(last_scan.security_score) if last_scan else 100
    
    # Asset count
    total_assets = db.query(Asset).count()
    
    # Findings count
    total_findings = db.query(Finding).count()
    critical_findings = db.query(Finding).filter(Finding.severity == "critical").count()
    
    # Attack Path statistics
    attack_paths = db.query(AttackPath).all()
    total_attack_paths = len(attack_paths)
    critical_attack_paths = len([p for p in attack_paths if p.risk_level == "critical"])
    
    # Business Risk Score calculation (average of all findings)
    all_findings = db.query(Finding).all()
    avg_business_risk = int(sum([f.business_risk_score for f in all_findings]) / len(all_findings)) if all_findings else 0
    
    # Compliance Coverage mapping (mock mapping calculations based on passed controls)
    # E.g. what % of rules are passing?
    # Total controls checked per framework:
    # CIS: 10 checks. NIST: 8 checks. MITRE: 6 checks.
    # Count passed checks:
    # A check passes if there are no open findings of that category
    finding_titles = [f.title for f in all_findings if f.status == "open"]
    
    cis_total, nist_total, mitre_total = 10, 8, 6
    cis_fail = len(set([f.title for f in all_findings if f.status == "open" and "cis" in f.compliance_mappings]))
    nist_fail = len(set([f.title for f in all_findings if f.status == "open" and "nist" in f.compliance_mappings]))
    mitre_fail = len(set([f.title for f in all_findings if f.status == "open" and "mitre" in f.compliance_mappings]))
    
    cis_cov = max(10, 100 - (cis_fail * 12))
    nist_cov = max(15, 100 - (nist_fail * 15))
    mitre_cov = max(20, 100 - (mitre_fail * 16))
    
    compliance = {
        "CIS AWS Foundations": float(cis_cov),
        "NIST CSF": float(nist_cov),
        "MITRE ATT&CK": float(mitre_cov)
    }

    # Remediation progress
    open_count = db.query(Finding).filter(Finding.status == "open").count()
    resolved_count = db.query(Finding).filter(Finding.status == "resolved").count()
    snoozed_count = db.query(Finding).filter(Finding.status == "snoozed").count()
    remediation_progress = {
        "open": open_count,
        "resolved": resolved_count,
        "snoozed": snoozed_count
    }

    # Severity distribution
    findings_by_severity = {
        "critical": critical_findings,
        "high": db.query(Finding).filter(Finding.severity == "high").count(),
        "medium": db.query(Finding).filter(Finding.severity == "medium").count(),
        "low": db.query(Finding).filter(Finding.severity == "low").count()
    }

    # Asset types distribution
    asset_types = ["ec2", "s3", "iam_user", "iam_role", "iam_policy", "lambda", "rds", "vpc", "security_group", "cloudtrail", "guardduty", "security_hub"]
    asset_types_distribution = {}
    for t in asset_types:
        asset_types_distribution[t] = db.query(Asset).filter(Asset.type == t).count()

    # Resources by region
    regions_list = db.query(Asset.region).distinct().all()
    resources_by_region = {}
    for r in regions_list:
        region_name = r[0]
        resources_by_region[region_name] = db.query(Asset).filter(Asset.region == region_name).count()

    # Recent Security Events (last 6)
    recent_events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(6).all()

    return {
        "security_score": score,
        "business_risk_score": avg_business_risk,
        "total_assets": total_assets,
        "total_findings": total_findings,
        "critical_findings": critical_findings,
        "total_attack_paths": total_attack_paths,
        "critical_attack_paths": critical_attack_paths,
        "compliance_coverage": compliance,
        "remediation_progress": remediation_progress,
        "findings_by_severity": findings_by_severity,
        "asset_types_distribution": asset_types_distribution,
        "resources_by_region": resources_by_region,
        "recent_events": [schemas.SecurityEventResponse.model_validate(e) for e in recent_events]
    }


# --- Assets Endpoints ---

@app.get("/api/assets", response_model=List[schemas.AssetResponse])
def get_assets(
    type: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    query = db.query(Asset)
    if type:
        query = query.filter(Asset.type == type)
    if region:
        query = query.filter(Asset.region == region)
    return query.all()

@app.get("/api/assets/{asset_id}", response_model=schemas.AssetResponse)
def get_asset(asset_id: str, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@app.get("/api/assets/{asset_id}/relationships", response_model=List[schemas.AssetRelationshipResponse])
def get_asset_relationships(asset_id: str, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    # Returns all relationships where source_id or target_id matches the asset_id
    rels = db.query(AssetRelationship).filter(
        (AssetRelationship.source_id == asset_id) | (AssetRelationship.target_id == asset_id)
    ).all()
    return rels

@app.get("/api/assets/graph/all", response_model=Dict[str, Any])
def get_all_graph_nodes_edges(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """
    Exposes nodes and edges for visualizing relationships.
    To avoid rendering thousands of nodes, we query a structured sample showing a realistic layout.
    """
    # Core assets to display in graph
    assets = db.query(Asset).limit(100).all()
    rels = db.query(AssetRelationship).all()
    
    # We will filter relationships so they only connect nodes we returned
    asset_ids = set([a.id for a in assets])
    filtered_rels = [r for r in rels if r.source_id in asset_ids and r.target_id in asset_ids]
    
    # Also find which nodes are in attack paths or misconfigured
    findings = db.query(Finding).filter(Finding.status == "open").all()
    misconfigured_ids = set([f.asset_id for f in findings])
    attack_paths = db.query(AttackPath).all()
    attack_path_nodes = set()
    for path in attack_paths:
        for node in path.nodes:
            attack_path_nodes.add(node)

    nodes_list = []
    for a in assets:
        nodes_list.append({
            "id": a.id,
            "name": a.name,
            "type": a.type,
            "region": a.region,
            "is_public": a.configuration.get("public_ip") is not None or a.configuration.get("public_policy") == True,
            "has_critical_findings": db.query(Finding).filter(Finding.asset_id == a.id, Finding.severity == "critical").count() > 0,
            "has_findings": a.id in misconfigured_ids,
            "in_attack_path": a.id in attack_path_nodes
        })

    edges_list = []
    for r in filtered_rels:
        edges_list.append({
            "id": r.id,
            "source": r.source_id,
            "target": r.target_id,
            "type": r.relationship_type
        })

    return {
        "nodes": nodes_list,
        "edges": edges_list
    }


# --- Findings Endpoints ---

@app.get("/api/findings", response_model=List[schemas.FindingResponse])
def get_findings(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    in_attack_path: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    query = db.query(Finding)
    if severity:
        query = query.filter(Finding.severity == severity)
    if status:
        query = query.filter(Finding.status == status)
    if category:
        query = query.filter(Finding.category == category)
    if in_attack_path is not None:
        query = query.filter(Finding.in_attack_path == in_attack_path)
    return query.all()

@app.get("/api/findings/{finding_id}", response_model=schemas.FindingResponse)
def get_finding(finding_id: str, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding

@app.put("/api/findings/{finding_id}/status", response_model=schemas.FindingResponse)
def update_finding_status(
    finding_id: str, 
    request: schemas.FindingUpdateStatus, 
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.require_role(["admin", "analyst"]))
):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    finding.status = request.status
    db.commit()
    db.refresh(finding)
    
    # Log event
    event = SecurityEvent(
        event_name="Finding Status Changed",
        resource_id=finding.id,
        resource_type="finding",
        region="global",
        severity="low",
        service="Access Control",
        details=f"Finding status for '{finding.title}' updated to '{request.status}' by user '{current_user.email}'."
    )
    db.add(event)
    db.commit()

    # Recalculate health posture score
    scanner.calculate_security_score(db)
    
    return finding


# --- Attack Paths Endpoints ---

@app.get("/api/attack-paths", response_model=List[schemas.AttackPathResponse])
def get_attack_paths(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    return db.query(AttackPath).all()


# --- IAM Permission Analyzer Endpoint ---

@app.get("/api/iam-analyzer", response_model=Dict[str, Any])
def get_iam_analyzer_summary(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """
    Gathers metrics on AdministratorAccess, wildcards, unused keys, etc.
    """
    total_users = db.query(Asset).filter(Asset.type == "iam_user").count()
    total_roles = db.query(Asset).filter(Asset.type == "iam_role").count()
    total_policies = db.query(Asset).filter(Asset.type == "iam_policy").count()

    admin_policies = db.query(Asset).filter(
        Asset.type == "iam_policy",
        Asset.configuration["is_admin"] == True
    ).count()
    
    wildcard_policies = db.query(Asset).filter(
        Asset.type == "iam_policy",
        Asset.configuration["has_wildcards"] == True
    ).count()
    
    priv_escalations = db.query(Asset).filter(
        Asset.type == "iam_policy",
        Asset.configuration["has_priv_escalation"] == True
    ).count()
    
    inactive_users = db.query(Asset).filter(
        Asset.type == "iam_user",
        Asset.configuration["inactive"] == True
    ).count()

    mfa_disabled = db.query(Asset).filter(
        Asset.type == "iam_user",
        Asset.configuration["mfa_enabled"] == False
    ).count()

    unused_keys = db.query(Asset).filter(
        Asset.type == "iam_user",
        Asset.configuration["unused_access_keys"] == True
    ).count()

    # Findings related to IAM
    iam_findings = db.query(Finding).filter(
        (Finding.category == "Access Control") & (Finding.status == "open")
    ).all()

    return {
        "summary": {
            "total_users": total_users,
            "total_roles": total_roles,
            "total_policies": total_policies,
            "admin_policies_count": admin_policies,
            "wildcard_policies_count": wildcard_policies,
            "privilege_escalations_count": priv_escalations,
            "inactive_users_count": inactive_users,
            "mfa_disabled_count": mfa_disabled,
            "unused_keys_count": unused_keys
        },
        "findings": [schemas.FindingResponse.model_validate(f) for f in iam_findings]
    }


# --- Cloud Security Recommendations Endpoint ---

@app.get("/api/recommendations", response_model=List[Dict[str, Any]])
def get_recommendations(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """
    Groups open findings into high-level, actionable tasks with estimated effort scores.
    """
    findings = db.query(Finding).filter(Finding.status == "open").all()
    
    # Define recommendations templates
    rec_categories = {
        "Identity Security": {
            "title": "Enforce Identity Access Controls",
            "findings": [],
            "remed_cli": "aws iam create-virtual-mfa-device ...",
            "remed_tf": "resource \"aws_iam_policy\" ...",
            "effort": "Low",
            "impacted_frameworks": ["CIS AWS Foundations 1.2", "NIST CSF PR.AC-1"]
        },
        "Storage Security": {
            "title": "Secure AWS Storage Data Encryption",
            "findings": [],
            "remed_cli": "aws s3api put-public-access-block ...",
            "remed_tf": "resource \"aws_s3_bucket_public_access_block\" ...",
            "effort": "Medium",
            "impacted_frameworks": ["NIST CSF PR.DS-5", "MITRE ATT&CK T1567"]
        },
        "Network Security": {
            "title": "Restrict Public Ingress Access Gateways",
            "findings": [],
            "remed_cli": "aws ec2 revoke-security-group-ingress ...",
            "remed_tf": "resource \"aws_security_group_rule\" ...",
            "effort": "Medium",
            "impacted_frameworks": ["CIS AWS Foundations 4.1", "NIST CSF PR.IP-1"]
        },
        "Logging": {
            "title": "Enable Continuous Audit Trail Monitoring",
            "findings": [],
            "remed_cli": "aws cloudtrail start-logging ...",
            "remed_tf": "resource \"aws_cloudtrail\" ...",
            "effort": "Low",
            "impacted_frameworks": ["CIS AWS Foundations 2.1", "DE.AE-1 (Security Monitoring)"]
        }
    }

    for f in findings:
        cat = f.category
        if cat == "Access Control":
            rec_categories["Identity Security"]["findings"].append(f.id)
        elif cat == "Data Protection":
            rec_categories["Storage Security"]["findings"].append(f.id)
        elif cat == "Network Security":
            rec_categories["Network Security"]["findings"].append(f.id)
        elif cat == "Security Monitoring":
            rec_categories["Logging"]["findings"].append(f.id)

    # Convert to list and return only those containing findings
    result = []
    for cat_name, rec in rec_categories.items():
        if rec["findings"]:
            result.append({
                "category": cat_name,
                "title": rec["title"],
                "findings_count": len(rec["findings"]),
                "findings_ids": rec["findings"],
                "remediation_cli": rec["remed_cli"],
                "remediation_terraform": rec["remed_tf"],
                "effort": rec["effort"],
                "impacted_frameworks": rec["impacted_frameworks"]
            })
            
    return result


# --- Security Events Timeline Endpoint ---

@app.get("/api/events", response_model=List[schemas.SecurityEventResponse])
def get_security_events(
    resource_id: Optional[str] = None,
    region: Optional[str] = None,
    severity: Optional[str] = None,
    service: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    query = db.query(SecurityEvent)
    if resource_id:
        query = query.filter(SecurityEvent.resource_id == resource_id)
    if region:
        query = query.filter(SecurityEvent.region == region)
    if severity:
        query = query.filter(SecurityEvent.severity == severity)
    if service:
        query = query.filter(SecurityEvent.service == service)
    return query.order_by(SecurityEvent.timestamp.desc()).all()


# --- AWS Config Snapshots Importer Endpoint ---

@app.post("/api/config/import")
async def import_config_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.require_role(["admin", "analyst"]))
):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON configuration snapshots are accepted.")
    
    try:
        content = await file.read()
        json_data = json.loads(content.decode("utf-8"))
        result = importer.import_aws_config_json(db, json_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process config: {str(e)}")


# --- Reports Exporters ---

@app.get("/api/reports/pdf")
def export_pdf_report(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    pdf_buffer = reports.generate_pdf_report(db)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cspm-compliance-report.pdf"}
    )

@app.get("/api/reports/csv")
def export_csv_report(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    csv_str = reports.generate_csv_report(db)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cspm-compliance-findings.csv"}
    )

@app.get("/api/reports/json")
def export_json_report(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    json_data = reports.generate_json_report(db)
    return Response(
        content=json.dumps(json_data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=cspm-compliance-snapshot.json"}
    )


# --- Scanning Trigger Endpoint ---

@app.post("/api/scan/trigger")
def trigger_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.require_role(["admin", "analyst"]))
):
    scan_history = scanner.trigger_cloud_asset_discovery(db)
    return {
        "status": "success",
        "scan_id": scan_history.id,
        "score": scan_history.security_score,
        "total_assets": scan_history.total_assets_scanned,
        "total_findings": scan_history.total_findings_discovered
    }


# --- Admin Seed Endpoints ---

@app.post("/api/admin/seed")
def trigger_db_seed(db: Session = Depends(get_db)):
    # Run the database seeder helper
    seed.seed_data(db)
    return {"status": "success", "message": "Demo Database seeded with 300+ AWS Assets and 100+ Findings"}
