from sqlalchemy.orm import Session
from app.models import Asset, AssetRelationship, SecurityEvent
from app.scanner import trigger_cloud_asset_discovery
from typing import Dict, Any, List

AWS_TYPE_MAPPINGS = {
    "AWS::EC2::Instance": "ec2",
    "AWS::S3::Bucket": "s3",
    "AWS::IAM::User": "iam_user",
    "AWS::IAM::Role": "iam_role",
    "AWS::IAM::Policy": "iam_policy",
    "AWS::Lambda::Function": "lambda",
    "AWS::RDS::DBInstance": "rds",
    "AWS::EC2::VPC": "vpc",
    "AWS::EC2::SecurityGroup": "security_group",
    "AWS::CloudTrail::Trail": "cloudtrail",
    "AWS::GuardDuty::Detector": "guardduty",
    "AWS::SecurityHub::Hub": "security_hub"
}

def import_aws_config_json(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Imports AWS Config snapshots, parsing configurationItems.
    Also handles flat lists of custom assets for flexible testing.
    """
    assets_created = 0
    relationships_created = 0
    
    # 1. AWS Config Snapshot format (configurationItems)
    items = data.get("configurationItems", [])
    
    # 2. Simple list formats
    if not items and isinstance(data, list):
        items = data
    elif not items and "assets" in data:
        items = data["assets"]

    for item in items:
        # Determine asset properties based on format
        raw_type = item.get("resourceType") or item.get("type", "unknown")
        mapped_type = AWS_TYPE_MAPPINGS.get(raw_type, raw_type.lower())
        
        resource_id = item.get("resourceId") or item.get("id") or item.get("arn")
        resource_name = item.get("resourceName") or item.get("name") or resource_id
        region = item.get("awsRegion") or item.get("region", "us-east-1")
        configuration = item.get("configuration", {})

        if not resource_id:
            continue

        # Check if asset already exists
        asset = db.query(Asset).filter(Asset.id == resource_id).first()
        if not asset:
            asset = Asset(id=resource_id)
            db.add(asset)
        
        asset.name = resource_name
        asset.type = mapped_type
        asset.region = region
        asset.configuration = configuration
        assets_created += 1

        # Check relationships (in standard AWS Config)
        rels = item.get("relationships", []) or item.get("relations", [])
        for rel in rels:
            source_id = resource_id
            target_id = rel.get("resourceId") or rel.get("target_id")
            rel_name = rel.get("relationshipName") or rel.get("type", "connected_to")
            
            if target_id and source_id:
                # Add relationship record
                exists = db.query(AssetRelationship).filter(
                    AssetRelationship.source_id == source_id,
                    AssetRelationship.target_id == target_id,
                    AssetRelationship.relationship_type == rel_name
                ).first()
                
                if not exists:
                    relationship = AssetRelationship(
                        source_id=source_id,
                        target_id=target_id,
                        relationship_type=rel_name
                    )
                    db.add(relationship)
                    relationships_created += 1

    db.commit()

    # Log Security Event for import action
    event = SecurityEvent(
        event_name="AWS Config Imported",
        resource_id=f"import-{assets_created}-assets",
        resource_type="config_import",
        region="global",
        severity="low",
        service="AWS Config Import Importer",
        details=f"Successfully imported {assets_created} assets and {relationships_created} relationships via AWS Config snapshots."
    )
    db.add(event)
    db.commit()

    # Trigger scan to rebuild findings and scores
    scan_history = trigger_cloud_asset_discovery(db)

    return {
        "status": "success",
        "assets_imported": assets_created,
        "relationships_imported": relationships_created,
        "new_security_score": scan_history.security_score,
        "new_findings_count": scan_history.total_findings_discovered
    }
