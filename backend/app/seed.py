import datetime
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal
from app.models import User, Asset, Finding, AssetRelationship, AttackPath, SecurityEvent, ScanHistory
from app.auth import get_password_hash
from app.scanner import trigger_cloud_asset_discovery

def seed_data(db: Session):
    # 1. Create tables
    Base.metadata.create_all(bind=engine)

    # 2. Clear existing tables
    db.query(User).delete()
    db.query(Asset).delete()
    db.query(Finding).delete()
    db.query(AssetRelationship).delete()
    db.query(AttackPath).delete()
    db.query(SecurityEvent).delete()
    db.query(ScanHistory).delete()
    db.commit()

    # 3. Seed Users
    users = [
        User(
            email="admin@cspm.local",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        ),
        User(
            email="analyst@cspm.local",
            hashed_password=get_password_hash("analyst123"),
            role="analyst"
        ),
        User(
            email="viewer@cspm.local",
            hashed_password=get_password_hash("viewer123"),
            role="viewer"
        )
    ]
    db.add_all(users)
    db.commit()

    # 4. Seed 330+ Assets
    regions = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
    
    # VPCs (10)
    for i in range(1, 11):
        vpc = Asset(
            id=f"arn:aws:ec2:us-east-1:123456789012:vpc/vpc-{i}",
            name=f"Production-VPC-0{i}" if i < 5 else f"Staging-VPC-0{i}",
            type="vpc",
            region="us-east-1" if i <= 5 else "us-west-2",
            configuration={"cidr_block": f"10.{i}.0.0/16", "is_default": False}
        )
        db.add(vpc)

    # Security Groups (30)
    for i in range(1, 31):
        # SGs 1-15 allow all ingress
        allow_all = (i <= 15)
        sg = Asset(
            id=f"arn:aws:ec2:us-east-1:123456789012:security-group/sg-{i}",
            name=f"default-sg-{i}" if not allow_all else f"open-ssh-rdp-sg-{i}",
            type="security_group",
            region=regions[i % len(regions)],
            configuration={
                "vpc_id": f"arn:aws:ec2:us-east-1:123456789012:vpc/vpc-{(i % 10) + 1}",
                "allow_all_ingress": allow_all,
                "ingress_rules": [
                    {"cidr": "0.0.0.0/0", "port": 22, "protocol": "tcp"} if allow_all else {"cidr": "10.0.0.0/8", "port": 80, "protocol": "tcp"}
                ]
            }
        )
        db.add(sg)

    # EC2 Instances (50)
    for i in range(1, 51):
        # i-1 to i-5 are public
        # i-6 to i-13 have unencrypted EBS
        is_public = (i <= 5)
        ebs_encrypted = (i > 13)
        ec2 = Asset(
            id=f"arn:aws:ec2:us-east-1:123456789012:instance/i-{1000 + i}",
            name=f"Web-Server-{i}" if is_public else f"App-Backend-{i}",
            type="ec2",
            region=regions[i % len(regions)],
            configuration={
                "public_ip": f"54.210.12.{i}" if is_public else None,
                "private_ip": f"10.1.12.{i}",
                "instance_type": "t3.medium" if i % 2 == 0 else "m5.large",
                "ebs_encrypted": ebs_encrypted,
                "block_devices": [{"device": "/dev/sda1", "encrypted": ebs_encrypted}],
                "vpc_id": f"arn:aws:ec2:us-east-1:123456789012:vpc/vpc-{(i % 10) + 1}"
            }
        )
        db.add(ec2)

    # S3 Buckets (40)
    for i in range(1, 41):
        # buckets 1-5 are public
        # buckets 6-10 are sensitive
        is_public = (i <= 5)
        is_sensitive = (i <= 10)
        s3 = Asset(
            id=f"arn:aws:s3:::cspm-data-bucket-0{i}",
            name=f"cspm-data-bucket-0{i}",
            type="s3",
            region="global",
            configuration={
                "public_policy": is_public,
                "acl_public": is_public,
                "sensitive_data": is_sensitive,
                "versioning": True if i % 2 == 0 else False,
                "kms_encryption": "aws:kms" if i > 10 else None
            }
        )
        db.add(s3)

    # IAM Users (30) + 1 Root User
    root_user = Asset(
        id="arn:aws:iam::123456789012:root",
        name="root",
        type="iam_user",
        region="global",
        configuration={
            "mfa_enabled": True,
            "last_login_days": 5, # triggers Root Account Usage check if < 30
            "arn": "arn:aws:iam::123456789012:root"
        }
    )
    db.add(root_user)

    for i in range(1, 31):
        # users 1-10 have no MFA
        # users 11-15 are inactive & have unused keys
        mfa = (i > 10)
        inactive = (11 <= i <= 15)
        user = Asset(
            id=f"arn:aws:iam::123456789012:user/iam-user-{i}",
            name=f"iam-user-{i}",
            type="iam_user",
            region="global",
            configuration={
                "mfa_enabled": mfa,
                "inactive": inactive,
                "unused_access_keys": inactive,
                "last_login_days": 180 if inactive else 2,
                "access_keys": [{"id": f"AKIAIOSFODNN7{i}", "status": "Active"}]
            }
        )
        db.add(user)

    # IAM Roles (40)
    for i in range(1, 41):
        # roles 1-5 have assume role chain vulnerability
        has_chain = (i <= 5)
        role = Asset(
            id=f"arn:aws:iam::123456789012:role/app-execution-role-0{i}",
            name=f"app-execution-role-0{i}",
            type="iam_role",
            region="global",
            configuration={
                "assume_role_policy": {},
                "assume_role_chain": has_chain,
                "trust_relationship": {"Principal": "*"} if has_chain else {"Principal": "ec2.amazonaws.com"}
            }
        )
        db.add(role)

    # IAM Policies (50)
    for i in range(1, 51):
        # policy-1 is Admin
        # policy-2 to policy-8 have wildcards
        # policy-9 to policy-12 have privilege escalation
        # policy-1 to policy-10 are overly permissive
        is_admin = (i == 1)
        wildcards = (2 <= i <= 8)
        priv_escalation = (9 <= i <= 12)
        is_permissive = (i <= 10)
        
        name = "AdministratorAccess" if is_admin else (f"permissive-policy-0{i}" if is_permissive else f"readonly-policy-0{i}")
        
        policy = Asset(
            id=f"arn:aws:iam::aws:policy/{name}-{i}",
            name=name,
            type="iam_policy",
            region="global",
            configuration={
                "is_admin": is_admin,
                "has_wildcards": wildcards,
                "has_priv_escalation": priv_escalation,
                "is_permissive": is_permissive,
                "statements": [
                    {"Effect": "Allow", "Action": "*", "Resource": "*"} if is_admin else {"Effect": "Allow", "Action": "s3:*", "Resource": "*"}
                ]
            }
        )
        db.add(policy)

    # RDS DB Instances (20)
    for i in range(1, 21):
        # RDS DBs are attached to subnets and have credentials
        rds = Asset(
            id=f"arn:aws:rds:us-east-1:123456789012:db/db-instance-{i}",
            name=f"prod-rds-postgres-{i}" if i <= 10 else f"dev-rds-mysql-{i}",
            type="rds",
            region=regions[i % len(regions)],
            configuration={
                "engine": "postgres" if i <= 10 else "mysql",
                "vpc_id": f"arn:aws:ec2:us-east-1:123456789012:vpc/vpc-{(i % 10) + 1}",
                "publicly_accessible": False,
                "storage_encrypted": True if i > 5 else False,
                "sensitive_data": True if i <= 5 else False
            }
        )
        db.add(rds)

    # Lambda Functions (30)
    for i in range(1, 31):
        lam = Asset(
            id=f"arn:aws:lambda:us-east-1:123456789012:function:lambda-fn-{i}",
            name=f"lambda-data-processor-{i}",
            type="lambda",
            region=regions[i % len(regions)],
            configuration={
                "runtime": "python3.11",
                "handler": "main.handler",
                "role_arn": f"arn:aws:iam::123456789012:role/app-execution-role-0{(i % 40) + 1}",
                "vpc_id": f"arn:aws:ec2:us-east-1:123456789012:vpc/vpc-{(i % 10) + 1}"
            }
        )
        db.add(lam)

    # CloudTrail (10)
    for i in range(1, 11):
        trail_status = "enabled" if i > 3 else "disabled"
        trail = Asset(
            id=f"arn:aws:cloudtrail:us-east-1:123456789012:trail/audit-trail-0{i}",
            name=f"audit-trail-0{i}",
            type="cloudtrail",
            region=regions[i % len(regions)],
            configuration={
                "status": trail_status,
                "is_multi_region": True if i > 5 else False
            }
        )
        db.add(trail)

    # GuardDuty (10)
    for i in range(1, 11):
        gd_status = "enabled" if i > 3 else "disabled"
        gd = Asset(
            id=f"arn:aws:guardduty:us-east-1:123456789012:detector/detector-0{i}",
            name=f"detector-0{i}",
            type="guardduty",
            region=regions[i % len(regions)],
            configuration={
                "status": gd_status
            }
        )
        db.add(gd)

    # Security Hub (10)
    for i in range(1, 11):
        sh_status = "enabled" if i > 3 else "disabled"
        sh = Asset(
            id=f"arn:aws:securityhub:us-east-1:123456789012:hub/securityhub-0{i}",
            name=f"securityhub-0{i}",
            type="security_hub",
            region=regions[i % len(regions)],
            configuration={
                "status": sh_status
            }
        )
        db.add(sh)

    db.commit()

    # 5. Seed Relationships (120+ relationship rows)
    # Map EC2s to VPCs
    for i in range(1, 51):
        rel = AssetRelationship(
            source_id=f"arn:aws:ec2:us-east-1:123456789012:vpc/vpc-{(i % 10) + 1}",
            target_id=f"arn:aws:ec2:us-east-1:123456789012:instance/i-{1000 + i}",
            relationship_type="contains"
        )
        db.add(rel)

    # Map SGs to EC2s
    for i in range(1, 51):
        rel = AssetRelationship(
            source_id=f"arn:aws:ec2:us-east-1:123456789012:security-group/sg-{(i % 30) + 1}",
            target_id=f"arn:aws:ec2:us-east-1:123456789012:instance/i-{1000 + i}",
            relationship_type="attaches_to"
        )
        db.add(rel)

    # Map Policies to Roles
    for i in range(1, 41):
        rel = AssetRelationship(
            source_id=f"arn:aws:iam::aws:policy/readonly-policy-0{(i % 50) + 1}" if i > 1 else "arn:aws:iam::aws:policy/AdministratorAccess-1",
            target_id=f"arn:aws:iam::123456789012:role/app-execution-role-0{i}",
            relationship_type="attaches_to"
        )
        db.add(rel)

    # Map Roles to EC2s
    for i in range(1, 51):
        rel = AssetRelationship(
            source_id=f"arn:aws:iam::123456789012:role/app-execution-role-0{(i % 40) + 1}",
            target_id=f"arn:aws:ec2:us-east-1:123456789012:instance/i-{1000 + i}",
            relationship_type="attaches_to"
        )
        db.add(rel)

    # Map S3 buckets to Roles/IAM
    for i in range(1, 41):
        rel = AssetRelationship(
            source_id=f"arn:aws:iam::123456789012:role/app-execution-role-0{(i % 40) + 1}",
            target_id=f"arn:aws:s3:::cspm-data-bucket-0{i}",
            relationship_type="accesses"
        )
        db.add(rel)

    db.commit()

    # 6. Seed Chronological Security Events (35 events)
    now = datetime.datetime.utcnow()
    events = [
        SecurityEvent(
            timestamp=now - datetime.timedelta(minutes=15),
            event_name="Root User API Login Detected",
            resource_id="arn:aws:iam::123456789012:root",
            resource_type="iam_user",
            region="global",
            severity="critical",
            service="IAM",
            details="Console login detected for the AWS root account from unauthorized IP: 198.51.100.42"
        ),
        SecurityEvent(
            timestamp=now - datetime.timedelta(hours=2),
            event_name="S3 Public Access Block Deleted",
            resource_id="arn:aws:s3:::cspm-data-bucket-01",
            resource_type="s3",
            region="global",
            severity="critical",
            service="S3",
            details="Public access configuration updated, bucket policy exposes read permissions to all users."
        ),
        SecurityEvent(
            timestamp=now - datetime.timedelta(hours=6),
            event_name="Security Group Ingress Opened to Internet",
            resource_id="arn:aws:ec2:us-east-1:123456789012:security-group/sg-1",
            resource_type="security_group",
            region="us-east-1",
            severity="high",
            service="EC2",
            details="Ingress rule added allowing SSH (Port 22) traffic from 0.0.0.0/0."
        ),
        SecurityEvent(
            timestamp=now - datetime.timedelta(days=1, hours=3),
            event_name="CloudTrail Trail Stopped",
            resource_id="arn:aws:cloudtrail:us-east-1:123456789012:trail/audit-trail-01",
            resource_type="cloudtrail",
            region="us-east-1",
            severity="high",
            service="CloudTrail",
            details="The audit trail logs recording was deactivated by IAM user: iam-user-2."
        ),
        SecurityEvent(
            timestamp=now - datetime.timedelta(days=2),
            event_name="GuardDuty Detector Suspended",
            resource_id="arn:aws:guardduty:us-east-1:123456789012:detector/detector-01",
            resource_type="guardduty",
            region="us-east-1",
            severity="high",
            service="GuardDuty",
            details="Detector was disabled via API command in us-east-1 region."
        ),
        SecurityEvent(
            timestamp=now - datetime.timedelta(days=3),
            event_name="IAM policy modified",
            resource_id="arn:aws:iam::aws:policy/AdministratorAccess-1",
            resource_type="iam_policy",
            region="global",
            severity="medium",
            service="IAM",
            details="AdministratorAccess trust policy updated to permit broader assume-role principals."
        )
    ]
    
    # Generate remaining events programmatically
    for idx in range(7, 36):
        day_offset = idx // 2
        hr_offset = idx % 24
        service = ["EC2", "S3", "IAM", "RDS", "Lambda"][idx % 5]
        res_type = service.lower() if service != "IAM" else "iam_user"
        sev = ["medium", "low"][idx % 2]
        
        events.append(
            SecurityEvent(
                timestamp=now - datetime.timedelta(days=day_offset, hours=hr_offset),
                event_name=f"{service} Resource Configuration Scanned",
                resource_id=f"arn:aws:{res_type}:us-west-2:123456789012:resource-{idx}",
                resource_type=res_type,
                region="us-west-2" if idx % 2 == 0 else "eu-west-1",
                severity=sev,
                service=service,
                details=f"Discovery engine completed configuration scan for resource-{idx}. Posture aligned."
            )
        )

    db.add_all(events)
    db.commit()

    # 7. Trigger the initial scan discovery to compute health, score, findings, and attack paths
    trigger_cloud_asset_discovery(db)

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_data(db)
        print("Demo Database seeded successfully with 300+ resources, 100+ findings, and audit trails.")
    finally:
        db.close()
