import datetime
import uuid
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Boolean, Integer, Float
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="viewer", nullable=False) # admin, analyst, viewer
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True) # e.g. ARN
    name = Column(String, nullable=False)
    type = Column(String, index=True, nullable=False) # ec2, s3, iam_user, etc.
    region = Column(String, index=True, nullable=False)
    configuration = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    findings = relationship("Finding", back_populates="asset", cascade="all, delete-orphan")

class Finding(Base):
    __tablename__ = "findings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_id = Column(String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(String, index=True, nullable=False) # critical, high, medium, low
    status = Column(String, index=True, default="open", nullable=False) # open, resolved, snoozed
    category = Column(String, index=True, nullable=False) # Network Security, Access Control, Data Protection, etc.
    compliance_mappings = Column(JSON, default=dict) # e.g. {"cis": ["1.1"], "nist": ["PR.AC-1"], "mitre": ["T1078"]}
    remediation_cli = Column(String, nullable=True)
    remediation_terraform = Column(String, nullable=True)
    business_risk_score = Column(Integer, default=0) # 0-100
    in_attack_path = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    asset = relationship("Asset", back_populates="findings")

class AssetRelationship(Base):
    __tablename__ = "asset_relationships"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    relationship_type = Column(String, nullable=False) # contains, attaches_to, monitors, logs_to, etc.

class AttackPath(Base):
    __tablename__ = "attack_paths"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    risk_level = Column(String, default="high") # critical, high, medium, low
    nodes = Column(JSON, default=list) # List of asset IDs in the path: ["arn1", "arn2", "arn3"]
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    event_name = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    region = Column(String, nullable=False)
    severity = Column(String, nullable=False) # critical, high, medium, low
    service = Column(String, nullable=False) # EC2, S3, IAM, CloudTrail, etc.
    details = Column(String, nullable=True)

class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running") # running, completed, failed
    total_assets_scanned = Column(Integer, default=0)
    total_findings_discovered = Column(Integer, default=0)
    security_score = Column(Float, default=100.0)
