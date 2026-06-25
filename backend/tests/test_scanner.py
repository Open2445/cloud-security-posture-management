from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Asset, Finding
from app.scanner import calculate_security_score, calculate_business_risk_score

def test_scoring_logic():
    # Setup in-memory SQLite database for test
    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)
    session = Session()
    Base.metadata.create_all(bind=engine)

    # Test empty database score
    assert calculate_security_score(session) == 100.0

    # Test asset score calculations
    asset1 = Asset(id="arn:aws:s3:::bucket1", name="bucket1", type="s3", region="us-east-1", configuration={})
    asset2 = Asset(id="arn:aws:s3:::bucket2", name="bucket2", type="s3", region="us-east-1", configuration={})
    session.add(asset1)
    session.add(asset2)
    session.commit()

    # Asset health initially 100. Average is 100
    assert calculate_security_score(session) == 100.0

    # Add critical finding on asset1
    f1 = Finding(
        asset_id=asset1.id,
        title="Public S3 Buckets",
        description="Public S3",
        severity="critical",
        status="open",
        category="Data Protection",
        compliance_mappings={},
        business_risk_score=75
    )
    session.add(f1)
    session.commit()

    # asset1 health: 100 - 30 = 70
    # asset2 health: 100
    # Average: (70 + 100)/2 = 85.0
    assert calculate_security_score(session) == 85.0

    # Add a resolved high finding on asset2 (resolved findings shouldn't deduct points)
    f2 = Finding(
        asset_id=asset2.id,
        title="IAM User no MFA",
        description="no MFA",
        severity="high",
        status="resolved",
        category="Access Control",
        compliance_mappings={},
        business_risk_score=50
    )
    session.add(f2)
    session.commit()

    assert calculate_security_score(session) == 85.0

    # Add a medium finding on asset2
    f3 = Finding(
        asset_id=asset2.id,
        title="Disabled Sec Hub",
        description="disabled sec hub",
        severity="medium",
        status="open",
        category="Security Monitoring",
        compliance_mappings={},
        business_risk_score=20
    )
    session.add(f3)
    session.commit()

    # asset1 health: 70
    # asset2 health: 100 - 5 = 95
    # Average: (70 + 95)/2 = 82.5
    assert calculate_security_score(session) == 82.5

    session.close()

def test_business_risk_score_factors():
    # S3 bucket, sensitive, public
    asset = Asset(
        id="arn:aws:s3:::sensitive-public-bucket",
        name="sensitive-public-bucket",
        type="s3",
        region="global",
        configuration={"public_policy": True, "sensitive_data": True}
    )
    
    # Base for critical is 50.
    # +25 public
    # +20 sensitive S3 data
    # Expected: 95
    risk = calculate_business_risk_score(asset, "Public S3 Buckets", "critical")
    assert risk == 95
