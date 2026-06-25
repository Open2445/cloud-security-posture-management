import io
import json
import datetime
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

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Aether CSPM Platform API",
    description="Backend REST APIs for Enterprise Cloud Security Posture Management (CSPM).",
    version="1.1.0"
)

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


# --- Multi-Cloud Provider Endpoint ---

@app.get("/api/providers")
def get_providers(current_user: User = Depends(auth.get_current_user)):
    return [
        {"id": "aws", "name": "Amazon Web Services (AWS)", "status": "active"},
        {"id": "azure", "name": "Microsoft Azure", "status": "coming_soon"},
        {"id": "gcp", "name": "Google Cloud Platform (GCP)", "status": "coming_soon"}
    ]


# --- Dashboard Stats with Dynamic Query Filtering ---

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    region: Optional[str] = None,
    service: Optional[str] = None,
    severity: Optional[str] = None,
    framework: Optional[str] = None,
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    # Core Queries
    asset_query = db.query(Asset)
    finding_query = db.query(Finding)

    # 1. Apply asset-level filters
    if region:
        asset_query = asset_query.filter(Asset.region == region)
        finding_query = finding_query.join(Asset).filter(Asset.region == region)
    
    if service:
        # Map generic services (compute, storage) to resource types
        if service.lower() == "ec2":
            asset_query = asset_query.filter(Asset.type == "ec2")
            finding_query = finding_query.join(Asset).filter(Asset.type == "ec2")
        elif service.lower() == "s3":
            asset_query = asset_query.filter(Asset.type == "s3")
            finding_query = finding_query.join(Asset).filter(Asset.type == "s3")
        elif service.lower() == "iam":
            asset_query = asset_query.filter(Asset.type.in_(["iam_user", "iam_role", "iam_policy"]))
            finding_query = finding_query.join(Asset).filter(Asset.type.in_(["iam_user", "iam_role", "iam_policy"]))

    if resource_type:
        asset_query = asset_query.filter(Asset.type == resource_type)
        finding_query = finding_query.join(Asset).filter(Asset.type == resource_type)

    # 2. Apply finding-level filters
    if severity:
        finding_query = finding_query.filter(Finding.severity == severity)
    if status:
        finding_query = finding_query.filter(Finding.status == status)

    # Fetch records
    assets = asset_query.all()
    all_findings = finding_query.all()

    # Apply Framework filter in Python since mapping is JSON
    if framework:
        fw_key = framework.lower()
        if "cis" in fw_key:
            all_findings = [f for f in all_findings if "cis" in (f.compliance_mappings or {})]
        elif "nist" in fw_key:
            all_findings = [f for f in all_findings if "nist" in (f.compliance_mappings or {})]
        elif "mitre" in fw_key:
            all_findings = [f for f in all_findings if "mitre" in (f.compliance_mappings or {})]

    # Calculate metrics based on filtered subset
    total_assets = len(assets)
    total_findings = len(all_findings)
    critical_findings = len([f for f in all_findings if f.severity == "critical"])
    
    # Posture Score: Average health of assets
    # Starts at 100, deducts based on open findings on that asset
    total_health = 0.0
    for asset in assets:
        asset_open_findings = [f for f in all_findings if f.asset_id == asset.id and f.status == "open"]
        health = 100.0
        for f in asset_open_findings:
            sev = f.severity.lower()
            if sev == "critical":
                health -= 30
            elif sev == "high":
                health -= 15
            elif sev == "medium":
                health -= 5
            elif sev == "low":
                health -= 1
        total_health += max(0.0, health)
    
    score = int(total_health / total_assets) if total_assets > 0 else 100
    
    avg_business_risk = int(sum([f.business_risk_score for f in all_findings]) / total_findings) if total_findings > 0 else 0

    # Framework Mappings
    cis_total, nist_total, mitre_total = 7, 5, 5
    cis_fail = len(set([f.title for f in all_findings if f.status == "open" and "cis" in (f.compliance_mappings or {})]))
    nist_fail = len(set([f.title for f in all_findings if f.status == "open" and "nist" in (f.compliance_mappings or {})]))
    mitre_fail = len(set([f.title for f in all_findings if f.status == "open" and "mitre" in (f.compliance_mappings or {})]))
    
    compliance = {
        "CIS AWS Foundations": float(max(10, 100 - (cis_fail * 14))),
        "NIST CSF": float(max(15, 100 - (nist_fail * 20))),
        "MITRE ATT&CK": float(max(20, 100 - (mitre_fail * 20)))
    }

    # Remediation progress
    remediation_progress = {
        "open": len([f for f in all_findings if f.status == "open"]),
        "resolved": len([f for f in all_findings if f.status == "resolved"]),
        "snoozed": len([f for f in all_findings if f.status == "snoozed"])
    }

    # Severity distribution
    findings_by_severity = {
        "critical": critical_findings,
        "high": len([f for f in all_findings if f.severity == "high"]),
        "medium": len([f for f in all_findings if f.severity == "medium"]),
        "low": len([f for f in all_findings if f.severity == "low"])
    }

    # Asset types distribution
    asset_types_distribution = {}
    for asset in assets:
        asset_types_distribution[asset.type] = asset_types_distribution.get(asset.type, 0) + 1

    # Resources by region
    resources_by_region = {}
    for asset in assets:
        resources_by_region[asset.region] = resources_by_region.get(asset.region, 0) + 1

    # Attack path counts
    attack_paths = db.query(AttackPath).all()
    total_attack_paths = len(attack_paths)
    critical_attack_paths = len([p for p in attack_paths if p.risk_level == "critical"])

    # Recent Security Events (last 6)
    recent_events_query = db.query(SecurityEvent)
    if region:
        recent_events_query = recent_events_query.filter(SecurityEvent.region == region)
    recent_events = recent_events_query.order_by(SecurityEvent.timestamp.desc()).limit(6).all()

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


# --- Scan Comparison Endpoint ---

@app.get("/api/scan/compare")
def compare_scans(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    scans = db.query(ScanHistory).filter(ScanHistory.status == "completed").order_by(ScanHistory.started_at.desc()).all()
    if not scans:
        return {
            "score_change": 0.0,
            "new_findings": [],
            "resolved_findings": [],
            "new_assets": []
        }
    
    latest = scans[0]
    
    if len(scans) > 1:
        previous = scans[1]
        score_change = round(latest.security_score - previous.security_score, 2)
        
        # New assets: added after previous completed
        new_assets = db.query(Asset).filter(Asset.created_at > previous.completed_at).all()
        # New findings: created after previous completed
        new_findings = db.query(Finding).filter(Finding.created_at > previous.completed_at).all()
        # Resolved findings: updated to resolved state after previous completed
        resolved_findings = db.query(Finding).filter(
            Finding.status == "resolved", 
            Finding.updated_at > previous.completed_at
        ).all()
    else:
        # Compare against baseline (start of history)
        score_change = round(latest.security_score - 100.0, 2)
        new_assets = db.query(Asset).all()
        new_findings = db.query(Finding).filter(Finding.status == "open").all()
        resolved_findings = db.query(Finding).filter(Finding.status == "resolved").all()

    return {
        "latest_scan_id": latest.id,
        "score_change": score_change,
        "new_findings": [schemas.FindingResponse.model_validate(f) for f in new_findings],
        "resolved_findings": [schemas.FindingResponse.model_validate(f) for f in resolved_findings],
        "new_assets": [schemas.AssetResponse.model_validate(a) for a in new_assets]
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
    rels = db.query(AssetRelationship).filter(
        (AssetRelationship.source_id == asset_id) | (AssetRelationship.target_id == asset_id)
    ).all()
    return rels

@app.get("/api/assets/graph/all", response_model=Dict[str, Any])
def get_all_graph_nodes_edges(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    assets = db.query(Asset).limit(100).all()
    rels = db.query(AssetRelationship).all()
    
    asset_ids = set([a.id for a in assets])
    filtered_rels = [r for r in rels if r.source_id in asset_ids and r.target_id in asset_ids]
    
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

    scanner.calculate_security_score(db)
    
    return finding


# --- Attack Paths Endpoints ---

@app.get("/api/attack-paths", response_model=List[schemas.AttackPathResponse])
def get_attack_paths(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    return db.query(AttackPath).all()


# --- IAM Permission Analyzer Endpoint ---

@app.get("/api/iam-analyzer", response_model=Dict[str, Any])
def get_iam_analyzer_summary(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
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
    findings = db.query(Finding).filter(Finding.status == "open").all()
    
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
    seed.seed_data(db)
    return {"status": "success", "message": "Demo Database seeded with 300+ AWS Assets and 100+ Findings"}
