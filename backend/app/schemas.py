from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Dict, Any, Optional
import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# --- Asset Schemas ---
class AssetResponse(BaseModel):
    id: str
    name: str
    type: str
    region: str
    configuration: Dict[str, Any]
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Finding Schemas ---
class FindingResponse(BaseModel):
    id: str
    asset_id: str
    title: str
    description: str
    severity: str
    status: str
    category: str
    compliance_mappings: Dict[str, Any]
    remediation_cli: Optional[str] = None
    remediation_terraform: Optional[str] = None
    business_risk_score: int
    in_attack_path: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    asset: Optional[AssetResponse] = None

    model_config = ConfigDict(from_attributes=True)

class FindingUpdateStatus(BaseModel):
    status: str # open, resolved, snoozed

# --- Relationship Schemas ---
class AssetRelationshipResponse(BaseModel):
    id: str
    source_id: str
    target_id: str
    relationship_type: str

    model_config = ConfigDict(from_attributes=True)

# --- Attack Path Schemas ---
class AttackPathResponse(BaseModel):
    id: str
    name: str
    risk_level: str
    nodes: List[str]
    description: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Security Event Schemas ---
class SecurityEventResponse(BaseModel):
    id: str
    timestamp: datetime.datetime
    event_name: str
    resource_id: str
    resource_type: str
    region: str
    severity: str
    service: str
    details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Scan History Schemas ---
class ScanHistoryResponse(BaseModel):
    id: str
    started_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None
    status: str
    total_assets_scanned: int
    total_findings_discovered: int
    security_score: float

    model_config = ConfigDict(from_attributes=True)

# --- Dashboard Stats Schemas ---
class DashboardStats(BaseModel):
    security_score: int
    business_risk_score: int
    total_assets: int
    total_findings: int
    critical_findings: int
    total_attack_paths: int
    critical_attack_paths: int
    compliance_coverage: Dict[str, float] # framework name -> coverage %
    remediation_progress: Dict[str, int] # status -> count
    findings_by_severity: Dict[str, int]
    asset_types_distribution: Dict[str, int]
    resources_by_region: Dict[str, int]
    recent_events: List[SecurityEventResponse]
