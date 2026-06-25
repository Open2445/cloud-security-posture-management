import datetime
import uuid
from sqlalchemy.orm import Session
from app.models import Asset, Finding, AssetRelationship, AttackPath, SecurityEvent, ScanHistory
from typing import List, Dict, Any

# Remediation guides map
REMEDIATION_GUIDES = {
    "Public S3 Buckets": {
        "description": "The S3 bucket allows public access (Read/Write) from the internet, which exposes sensitive business data.",
        "impact": "Data exfiltration, unauthorized file uploads, compliance violation (NIST, CIS).",
        "cli": "aws s3api put-public-access-block --bucket <bucket-name> --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'",
        "terraform": """resource "aws_s3_bucket_public_access_block" "block" {
  bucket = aws_s3_bucket.bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}""",
        "category": "Data Protection",
        "compliance": {"cis": ["1.21", "2.3"], "nist": ["PR.DS-5", "PR.AC-1"], "mitre": ["T1567"]}
    },
    "IAM Users without MFA": {
        "description": "Multi-factor authentication (MFA) is not enabled for this active IAM user, increasing the risk of credential compromise.",
        "impact": "Account takeover, unauthorized access via console or API.",
        "cli": "aws iam create-virtual-mfa-device --virtual-mfa-device-name <user-mfa> --outfile QRCode.png --bootstrap-method QRCodePNG\\naws iam enable-mfa-device --user-name <username> --serial-number <mfa-arn> --authentication-code1 <code1> --authentication-code2 <code2>",
        "terraform": "# Note: Virtual MFA devices cannot be managed easily in Terraform; enforce via policy:\\nresource \"aws_iam_policy\" \"force_mfa\" {\\n  name = \"ForceMFAPolicy\"\\n  # Policy JSON forcing MFA\\n}",
        "category": "Access Control",
        "compliance": {"cis": ["1.2"], "nist": ["PR.AC-1"], "mitre": ["T1078"]}
    },
    "Root Account Usage": {
        "description": "The AWS root account has been accessed recently. Root account credentials should be locked away.",
        "impact": "Unrestricted administrative access vulnerability, bypass of individual audits.",
        "cli": "# Secure root user credentials in vault. Do not use root API keys.\\naws iam delete-access-key --access-key-id <key-id> --user-name <root>",
        "terraform": "# Avoid configuring AWS Provider using Root user credentials. Always use IAM Roles.",
        "category": "Access Control",
        "compliance": {"cis": ["1.1"], "nist": ["PR.AC-1"], "mitre": ["T1078"]}
    },
    "Public EC2 Instances": {
        "description": "The EC2 instance has a public IP address and is accessible directly from the internet.",
        "impact": "Increased attack surface, brute-force attacks, port scanning.",
        "cli": "aws ec2 modify-subnet-attribute --subnet-id <subnet-id> --no-map-public-ip-on-launch",
        "terraform": """resource "aws_instance" "secure" {
  # ...
  associate_public_ip_address = false
}""",
        "category": "Network Security",
        "compliance": {"cis": ["4.1"], "nist": ["PR.IP-1"], "mitre": ["T1133"]}
    },
    "Security Groups allowing 0.0.0.0/0": {
        "description": "The security group ingress rules permit traffic from any IP address (0.0.0.0/0) to sensitive administrative ports (22 SSH, 3389 RDP).",
        "impact": "Direct port exposure, exploit injection, remote access threats.",
        "cli": "aws ec2 revoke-security-group-ingress --group-id <sg-id> --protocol tcp --port 22 --cidr 0.0.0.0/0",
        "terraform": """resource "aws_security_group_rule" "restricted_ingress" {
  type        = "ingress"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["10.0.0.0/8"] # Restrict to internal network
  security_group_id = aws_security_group.sg.id
}""",
        "category": "Network Security",
        "compliance": {"cis": ["4.1", "4.2"], "nist": ["PR.IP-1"], "mitre": ["T1133"]}
    },
    "Unencrypted EBS Volumes": {
        "description": "The EBS volume is not encrypted at rest. Data could be exposed if disk media is accessed offline.",
        "impact": "Compliance failure, sensitive data leaks from snapshots.",
        "cli": "aws ec2 enable-ebs-encryption-by-default",
        "terraform": """resource "aws_ebs_volume" "encrypted_vol" {
  availability_zone = "us-east-1a"
  size              = 40
  encrypted         = true
}""",
        "category": "Data Protection",
        "compliance": {"cis": ["2.2"], "nist": ["PR.DS-1"], "mitre": ["T1567"]}
    },
    "Disabled CloudTrail": {
        "description": "AWS CloudTrail is disabled or misconfigured in this region, which prevents monitoring user API actions.",
        "impact": "Loss of security auditing capabilities, inability to track threat activities.",
        "cli": "aws cloudtrail start-logging --name <trail-name>",
        "terraform": """resource "aws_cloudtrail" "main" {
  name                          = "audit-trail"
  s3_bucket_name                = aws_s3_bucket.trail_bucket.id
  enable_logging                = true
  is_multi_region_trail         = true
}""",
        "category": "Security Monitoring",
        "compliance": {"cis": ["2.1"], "nist": ["DE.AE-1"], "mitre": ["T1562"]}
    },
    "Disabled GuardDuty": {
        "description": "Amazon GuardDuty threat detection is disabled in this active region.",
        "impact": "Failure to detect anomalous behavior, cryptomining, or credential theft.",
        "cli": "aws guardduty create-detector --enable",
        "terraform": """resource "aws_guardduty_detector" "gd" {
  enable = true
}""",
        "category": "Security Monitoring",
        "compliance": {"cis": ["2.8"], "nist": ["DE.AE-1"], "mitre": ["T1562"]}
    },
    "Disabled Security Hub": {
        "description": "AWS Security Hub is disabled, preventing unified compliance dashboard reports.",
        "impact": "Lack of centralized posture visibility and compliance checking.",
        "cli": "aws securityhub enable-security-hub",
        "terraform": """resource "aws_securityhub_account" "hub" {}""",
        "category": "Security Monitoring",
        "compliance": {"cis": ["2.9"], "nist": ["DE.AE-1"], "mitre": ["T1562"]}
    },
    "Overly Permissive IAM Policies": {
        "description": "IAM policy grants wildcard access '*' or allows full service scope management controls to a wide target.",
        "impact": "Excessive privileges, potential privilege escalation, compliance violations.",
        "cli": "aws iam create-policy-version --policy-arn <policy-arn> --policy-document file://restricted-policy.json --set-as-default",
        "terraform": """resource "aws_iam_policy" "least_privilege" {
  name        = "least_privilege_policy"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["s3:GetObject"]
        Effect   = "Allow"
        Resource = ["arn:aws:s3:::my-bucket/*"]
      }
    ]
  })
}""",
        "category": "Access Control",
        "compliance": {"cis": ["1.16"], "nist": ["PR.AC-1"], "mitre": ["T1083"]}
    },
    # IAM Analyzer Detections
    "AdministratorAccess Role Assigned": {
        "description": "The AdministratorAccess AWS managed policy is attached directly to an IAM identity. This should be restricted to admin sessions.",
        "impact": "Complete compromise potential, breach of least privilege.",
        "cli": "aws iam detach-role-policy --role-name <role-name> --policy-arn arn:aws:iam::aws:policy/AdministratorAccess",
        "terraform": "# Refactor configurations to attach granular scope policies instead of the AdministratorAccess managed policy.",
        "category": "Access Control",
        "compliance": {"cis": ["1.16"], "nist": ["PR.AC-1"], "mitre": ["T1078"]}
    },
    "Privilege Escalation Potential": {
        "description": "The IAM policy contains actions that can lead to privilege escalation (e.g. iam:CreatePolicyVersion, iam:PassRole).",
        "impact": "Identity escalation to full Administrator capability.",
        "cli": "# Audit the policy document and delete the permissive statements.",
        "terraform": "# Review IAM policy definition blocks. Do not grant permissions to IAM update calls to non-admin roles.",
        "category": "Access Control",
        "compliance": {"cis": ["1.16"], "nist": ["PR.AC-1"], "mitre": ["T1078"]}
    },
    "Unused IAM Access Keys": {
        "description": "The IAM user possesses an active access key that has not been used for over 90 days.",
        "impact": "High risk of dormant credential theft or exposure.",
        "cli": "aws iam update-access-key --access-key-id <key-id> --status Inactive --user-name <username>",
        "terraform": "# Deactivate/remove unused key resources from terraform manifests.",
        "category": "Access Control",
        "compliance": {"cis": ["1.4"], "nist": ["PR.AC-1"], "mitre": ["T1078"]}
    },
    "AssumeRole Chains Enabled": {
        "description": "The IAM Role configuration allows cascading STS AssumeRole setups with weak trust policy validation.",
        "impact": "Lateral movement across account environments.",
        "cli": "# Tighten Trust Relationship document under aws iam update-assume-role-policy.",
        "terraform": "# Modify trust relationship json block to validate specific Principal ARNs.",
        "category": "Access Control",
        "compliance": {"cis": ["1.16"], "nist": ["PR.AC-1"], "mitre": ["T1078"]}
    }
}

# --- Cloud Provider Abstraction Layer ---

class CloudProvider:
    def discover_assets(self, db: Session) -> int:
        raise NotImplementedError()
    def evaluate_posture(self, db: Session) -> int:
        raise NotImplementedError()

class AWSProvider(CloudProvider):
    def discover_assets(self, db: Session) -> int:
        # Returns total asset count
        return db.query(Asset).count()

    def evaluate_posture(self, db: Session) -> int:
        # Clear existing findings (we will regenerate)
        db.query(Finding).delete()
        db.commit()

        assets = db.query(Asset).all()
        findings_count = 0

        # Model relationships to find which assets are in attack paths
        attack_paths = rebuild_attack_paths(db)
        in_path_ids = set()
        for path in attack_paths:
            for node in path.nodes:
                if node != "Internet":
                    in_path_ids.add(node)

        for asset in assets:
            config = asset.configuration or {}

            # 1. Public S3
            if asset.type == "s3" and (config.get("public_policy") or config.get("acl_public")):
                guide = REMEDIATION_GUIDES["Public S3 Buckets"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Public S3 Buckets",
                    description=guide["description"],
                    severity="critical",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Public S3 Buckets", "critical"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 2. IAM User without MFA
            elif asset.type == "iam_user" and not config.get("mfa_enabled") and asset.id != "arn:aws:iam::123456789012:root":
                guide = REMEDIATION_GUIDES["IAM Users without MFA"]
                finding = Finding(
                    asset_id=asset.id,
                    title="IAM Users without MFA",
                    description=guide["description"],
                    severity="high",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "IAM Users without MFA", "high"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 3. Root Account Usage
            elif asset.type == "iam_user" and asset.id == "arn:aws:iam::123456789012:root" and config.get("last_login_days", 100) < 30:
                guide = REMEDIATION_GUIDES["Root Account Usage"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Root Account Usage",
                    description=guide["description"],
                    severity="critical",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Root Account Usage", "critical"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 4. Public EC2
            elif asset.type == "ec2" and config.get("public_ip") is not None:
                guide = REMEDIATION_GUIDES["Public EC2 Instances"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Public EC2 Instances",
                    description=guide["description"],
                    severity="high",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Public EC2 Instances", "high"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 5. Security Groups allowing 0.0.0.0/0
            elif asset.type == "security_group" and config.get("allow_all_ingress"):
                guide = REMEDIATION_GUIDES["Security Groups allowing 0.0.0.0/0"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Security Groups allowing 0.0.0.0/0",
                    description=guide["description"],
                    severity="high",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Security Groups allowing 0.0.0.0/0", "high"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 6. Unencrypted EBS Volumes
            elif asset.type == "ec2" and not config.get("ebs_encrypted", True):
                guide = REMEDIATION_GUIDES["Unencrypted EBS Volumes"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Unencrypted EBS Volumes",
                    description=guide["description"],
                    severity="medium",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Unencrypted EBS Volumes", "medium"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 7. Disabled CloudTrail
            elif asset.type == "cloudtrail" and config.get("status") == "disabled":
                guide = REMEDIATION_GUIDES["Disabled CloudTrail"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Disabled CloudTrail",
                    description=guide["description"],
                    severity="high",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Disabled CloudTrail", "high"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 8. Disabled GuardDuty
            elif asset.type == "guardduty" and config.get("status") == "disabled":
                guide = REMEDIATION_GUIDES["Disabled GuardDuty"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Disabled GuardDuty",
                    description=guide["description"],
                    severity="high",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Disabled GuardDuty", "high"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 9. Disabled Security Hub
            elif asset.type == "security_hub" and config.get("status") == "disabled":
                guide = REMEDIATION_GUIDES["Disabled Security Hub"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Disabled Security Hub",
                    description=guide["description"],
                    severity="medium",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Disabled Security Hub", "medium"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 10. Overly Permissive IAM Policy
            elif asset.type == "iam_policy" and config.get("is_permissive"):
                guide = REMEDIATION_GUIDES["Overly Permissive IAM Policies"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Overly Permissive IAM Policies",
                    description=guide["description"],
                    severity="high",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Overly Permissive IAM Policies", "high"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 11. AdministratorAccess Policy Assigned
            if asset.type == "iam_policy" and config.get("is_admin"):
                guide = REMEDIATION_GUIDES["AdministratorAccess Role Assigned"]
                finding = Finding(
                    asset_id=asset.id,
                    title="AdministratorAccess Role Assigned",
                    description=guide["description"],
                    severity="critical",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "AdministratorAccess Role Assigned", "critical"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 12. Privilege Escalation Potential
            if asset.type == "iam_policy" and config.get("has_priv_escalation"):
                guide = REMEDIATION_GUIDES["Privilege Escalation Potential"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Privilege Escalation Potential",
                    description=guide["description"],
                    severity="high",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Privilege Escalation Potential", "high"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 13. Unused Access Keys
            if asset.type == "iam_user" and config.get("inactive") and config.get("unused_access_keys"):
                guide = REMEDIATION_GUIDES["Unused IAM Access Keys"]
                finding = Finding(
                    asset_id=asset.id,
                    title="Unused IAM Access Keys",
                    description=guide["description"],
                    severity="medium",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "Unused IAM Access Keys", "medium"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

            # 14. AssumeRole chains
            if asset.type == "iam_role" and config.get("assume_role_chain"):
                guide = REMEDIATION_GUIDES["AssumeRole Chains Enabled"]
                finding = Finding(
                    asset_id=asset.id,
                    title="AssumeRole Chains Enabled",
                    description=guide["description"],
                    severity="medium",
                    status="open",
                    category=guide["category"],
                    compliance_mappings=guide["compliance"],
                    remediation_cli=guide["cli"],
                    remediation_terraform=guide["terraform"],
                    business_risk_score=calculate_business_risk_score(asset, "AssumeRole Chains Enabled", "medium"),
                    in_attack_path=(asset.id in in_path_ids)
                )
                db.add(finding)
                findings_count += 1

        db.commit()
        return findings_count

class AzureProvider(CloudProvider):
    def discover_assets(self, db: Session) -> int:
        return 0
    def evaluate_posture(self, db: Session) -> int:
        return 0

class GCPProvider(CloudProvider):
    def discover_assets(self, db: Session) -> int:
        return 0
    def evaluate_posture(self, db: Session) -> int:
        return 0

# --- Calculation Helpers ---

def calculate_business_risk_score(asset: Asset, finding_title: str, severity: str) -> int:
    severity_bases = {"critical": 50, "high": 30, "medium": 15, "low": 5}
    score = severity_bases.get(severity.lower(), 5)

    config = asset.configuration or {}
    if config.get("public_ip") or config.get("public_policy") or config.get("acl_public") or config.get("is_public"):
        score += 25

    if "admin" in finding_title.lower() or "permissive" in finding_title.lower() or "privilege escalation" in finding_title.lower():
        score += 20

    if asset.type in ["rds", "s3"] or config.get("sensitive_data") or "sensitive" in asset.name.lower():
        score += 20

    if "assumerole" in finding_title.lower() or "passrole" in finding_title.lower() or "escalation" in finding_title.lower():
        score += 15

    if asset.type in ["vpc", "subnet", "security_group"]:
        score += 10
        
    return min(100, score)

def rebuild_attack_paths(db: Session) -> List[AttackPath]:
    db.query(AttackPath).delete()
    db.commit()

    public_ec2s = db.query(Asset).filter(Asset.type == "ec2").all()
    public_ec2s = [e for e in public_ec2s if e.configuration.get("public_ip") is not None]
    
    admin_policies = db.query(Asset).filter(
        Asset.type == "iam_policy", 
        Asset.configuration["is_admin"] == True
    ).all() if db.query(Asset).filter(Asset.type == "iam_policy").first() else []

    sensitive_s3s = db.query(Asset).filter(
        Asset.type == "s3",
        Asset.configuration["sensitive_data"] == True
    ).all()

    paths_created = []

    if public_ec2s and admin_policies and sensitive_s3s:
        ec2 = public_ec2s[0]
        policy = admin_policies[0]
        s3 = sensitive_s3s[0]
        
        role = db.query(Asset).filter(Asset.type == "iam_role").first()
        role_id = role.id if role else "arn:aws:iam::123456789012:role/EC2AccessRole"

        node_list = ["Internet", ec2.id, role_id, policy.id, s3.id]
        
        path1 = AttackPath(
            name="Exposed EC2 to Sensitive S3 Administrative Takeover",
            risk_level="critical",
            nodes=node_list,
            description="Internet exposure on EC2 combined with AdministratorAccess credentials attached to its profile allows an attacker to compromise the EC2 instance and exfiltrate sensitive customer data from the target S3 bucket."
        )
        db.add(path1)
        paths_created.append(path1)

    lambdas = db.query(Asset).filter(Asset.type == "lambda").all()
    rds_dbs = db.query(Asset).filter(Asset.type == "rds").all()
    if lambdas and rds_dbs:
        lam = lambdas[0]
        rds = rds_dbs[0]
        sec_mgr_id = "arn:aws:secretsmanager:us-east-1:123456789012:secret:rds-master-credentials"
        role = db.query(Asset).filter(Asset.type == "iam_role").all()
        role_id = role[1].id if len(role) > 1 else "arn:aws:iam::123456789012:role/LambdaExecutionRole"
        
        node_list2 = ["Internet", lam.id, role_id, sec_mgr_id, rds.id]
        path2 = AttackPath(
            name="Public Lambda Privilege Escalation to Production RDS",
            risk_level="high",
            nodes=node_list2,
            description="Public Lambda function with vulnerable assume-role permissions exposes secrets stored in Secrets Manager, granting full root credential privileges to the backend PostgreSQL/RDS Instance."
        )
        db.add(path2)
        paths_created.append(path2)

    db.commit()
    return paths_created

def evaluate_findings(db: Session) -> int:
    provider = AWSProvider()
    return provider.evaluate_posture(db)

def calculate_security_score(db: Session) -> float:
    assets = db.query(Asset).all()
    if not assets:
        return 100.0

    total_health = 0.0
    for asset in assets:
        open_findings = db.query(Finding).filter(
            Finding.asset_id == asset.id,
            Finding.status == "open"
        ).all()
        
        health = 100.0
        for f in open_findings:
            sev = f.severity.lower()
            if sev == "critical":
                health -= 30
            elif sev == "high":
                health -= 15
            elif sev == "medium":
                health -= 5
            elif sev == "low":
                health -= 1
        
        health = max(0.0, health)
        total_health += health

    return round(total_health / len(assets), 2)

def trigger_cloud_asset_discovery(db: Session) -> ScanHistory:
    scan = ScanHistory(
        started_at=datetime.datetime.utcnow(),
        status="running"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    try:
        num_findings = evaluate_findings(db)
        score = calculate_security_score(db)
        num_assets = db.query(Asset).count()

        scan.completed_at = datetime.datetime.utcnow()
        scan.status = "completed"
        scan.total_assets_scanned = num_assets
        scan.total_findings_discovered = num_findings
        scan.security_score = score
        db.commit()

        event = SecurityEvent(
            event_name="Cloud Asset Discovery Completed",
            resource_id=scan.id,
            resource_type="scan_history",
            region="global",
            severity="low",
            service="Cloud Asset Discovery Engine",
            details=f"Discovered {num_assets} assets, identified {num_findings} security findings, posture score calculated at {score}%."
        )
        db.add(event)
        db.commit()

    except Exception as e:
        scan.completed_at = datetime.datetime.utcnow()
        scan.status = "failed"
        db.commit()
        raise e

    return scan
