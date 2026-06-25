import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, CheckCircle2, XCircle, ShieldAlert, Database } from 'lucide-react';

const Compliance: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFramework, setActiveFramework] = useState<'cis' | 'nist' | 'mitre'>('cis');

  useEffect(() => {
    const fetchFindings = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/findings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFindings(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFindings();
  }, [apiUrl, token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Generating compliance audit metrics...
      </div>
    );
  }

  // Check if a specific finding has open items in db
  const getOpenFindingForTitle = (title: string) => {
    return findings.filter(f => f.title === title && f.status === 'open');
  };

  const cisControls = [
    { id: '1.1', name: 'Avoid Use of Root Account', desc: 'Secure root API keys and access root credential sessions only under break-glass audits.', finding: 'Root Account Usage' },
    { id: '1.2', name: 'Enforce MFA for IAM Users', desc: 'Enforce Multi-Factor Authentication (MFA) on all active developer account users.', finding: 'IAM Users without MFA' },
    { id: '1.16', name: 'Restrict Overly Permissive Policies', desc: 'Ensure customers do not create policies granting AdministratorAccess or wildcard scopes.', finding: 'Overly Permissive IAM Policies' },
    { id: '2.1', name: 'Enable CloudTrail Auditing', desc: 'Ensure CloudTrail event log capture is activated in all AWS region spaces.', finding: 'Disabled CloudTrail' },
    { id: '2.8', name: 'Enable GuardDuty Detector', desc: 'Confirm Amazon GuardDuty threat analysis detectors are active.', finding: 'Disabled GuardDuty' },
    { id: '2.9', name: 'Enable Security Hub Central', desc: 'Centralize standard checks via AWS Security Hub configs.', finding: 'Disabled Security Hub' },
    { id: '4.1', name: 'Restrict SSH Access (Port 22)', desc: 'Revoke Security Groups ingress rules permitting public access to port 22.', finding: 'Security Groups allowing 0.0.0.0/0' }
  ];

  const nistControls = [
    { id: 'PR.AC-1', name: 'Access Control Policies', desc: 'Restrict account identity privilege parameters using MFA and granular profiles.', findings: ['IAM Users without MFA', 'Root Account Usage'] },
    { id: 'PR.DS-1', name: 'Data at Rest Protected', desc: 'Encrypt S3 buckets, RDS database disks, and EBS block volumes.', findings: ['Unencrypted EBS Volumes'] },
    { id: 'PR.DS-5', name: 'Secure Storage Isolation', desc: 'Restrict open access permissions on cloud data buckets.', findings: ['Public S3 Buckets'] },
    { id: 'DE.AE-1', name: 'Continuous Security Audits', desc: 'Audit API transactions and network traffic anomalies continuously.', findings: ['Disabled CloudTrail', 'Disabled GuardDuty'] },
    { id: 'PR.IP-1', name: 'Network Boundary Defense', desc: 'Restrict public exposure of VM instances and database ports.', findings: ['Public EC2 Instances', 'Security Groups allowing 0.0.0.0/0'] }
  ];

  const mitreControls = [
    { id: 'T1078', name: 'Valid Accounts Abuse', desc: 'Mitigate risk of credential theft by enforcing MFA on IAM users.', findings: ['IAM Users without MFA', 'Root Account Usage'] },
    { id: 'T1562', name: 'Impair Defenses bypass', desc: 'Prevent adversary actions disabling CloudTrail recorders or GuardDuty alerts.', findings: ['Disabled CloudTrail', 'Disabled GuardDuty', 'Disabled Security Hub'] },
    { id: 'T1567', name: 'Exfiltration Over S3', desc: 'Audit public file structures to prevent data exfiltration endpoints.', findings: ['Public S3 Buckets'] },
    { id: 'T1083', name: 'File Discovery audits', desc: 'Detect overly broad IAM statement grants to reduce resource discovery scope.', findings: ['Overly Permissive IAM Policies'] },
    { id: 'T1133', name: 'External Services breach', desc: 'Revoke broad ingress ports to mitigate external connection exploits.', findings: ['Public EC2 Instances', 'Security Groups allowing 0.0.0.0/0'] }
  ];

  const getFrameworkDetails = () => {
    let rawControls: any[] = [];
    if (activeFramework === 'cis') {
      rawControls = cisControls.map(c => {
        const matchingOpen = getOpenFindingForTitle(c.finding);
        return {
          ...c,
          status: matchingOpen.length > 0 ? 'fail' : 'pass',
          affected_assets: matchingOpen.map(m => m.asset_id),
          findings_list: matchingOpen
        };
      });
      return {
        title: 'CIS AWS Foundations Benchmark',
        subtitle: 'Center for Internet Security guidelines for AWS cloud account baseline hardening',
        controls: rawControls
      };
    } else if (activeFramework === 'nist') {
      rawControls = nistControls.map(c => {
        const matchingOpen: any[] = [];
        c.findings.forEach(fTitle => {
          matchingOpen.push(...getOpenFindingForTitle(fTitle));
        });
        return {
          ...c,
          status: matchingOpen.length > 0 ? 'fail' : 'pass',
          affected_assets: matchingOpen.map(m => m.asset_id),
          findings_list: matchingOpen
        };
      });
      return {
        title: 'NIST CyberSecurity Framework (CSF)',
        subtitle: 'Standards for access authorization profiles, storage encryption parameters, and networks monitoring',
        controls: rawControls
      };
    } else {
      rawControls = mitreControls.map(c => {
        const matchingOpen: any[] = [];
        c.findings.forEach(fTitle => {
          matchingOpen.push(...getOpenFindingForTitle(fTitle));
        });
        return {
          ...c,
          status: matchingOpen.length > 0 ? 'fail' : 'pass',
          affected_assets: matchingOpen.map(m => m.asset_id),
          findings_list: matchingOpen
        };
      });
      return {
        title: 'MITRE ATT&CK Cloud Matrix',
        subtitle: 'Adversary threat categories, lateral assumes, and credential impairment audits',
        controls: rawControls
      };
    }
  };

  const current = getFrameworkDetails();
  const passedControls = current.controls.filter(c => c.status === 'pass');
  const failedControls = current.controls.filter(c => c.status === 'fail');
  const compliancePercent = Math.round((passedControls.length / current.controls.length) * 100);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Regulatory Compliance</h2>
          <p className="page-subtitle">Align cloud infrastructure parameters against national standards and attack matrices</p>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Framework Selector Tabs */}
        <div className="glass-panel col-3" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
            Compliance standards
          </h3>
          <button
            onClick={() => setActiveFramework('cis')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: '0.85rem',
              backgroundColor: activeFramework === 'cis' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              color: activeFramework === 'cis' ? 'var(--accent-color)' : 'var(--text-secondary)',
              transition: 'var(--transition-smooth)'
            }}
          >
            CIS AWS Foundations
          </button>
          <button
            onClick={() => setActiveFramework('nist')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: '0.85rem',
              backgroundColor: activeFramework === 'nist' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              color: activeFramework === 'nist' ? 'var(--accent-color)' : 'var(--text-secondary)',
              transition: 'var(--transition-smooth)'
            }}
          >
            NIST CSF v1.1 Standard
          </button>
          <button
            onClick={() => setActiveFramework('mitre')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: '0.85rem',
              backgroundColor: activeFramework === 'mitre' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              color: activeFramework === 'mitre' ? 'var(--accent-color)' : 'var(--text-secondary)',
              transition: 'var(--transition-smooth)'
            }}
          >
            MITRE ATT&CK Matrix
          </button>
        </div>

        {/* Detailed framework statistics */}
        <div className="glass-panel col-9" style={{ padding: '2rem' }}>
          
          {/* Summary metrics header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                {current.title}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {current.subtitle}
              </p>
            </div>
            
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: compliancePercent > 70 ? 'var(--status-resolved)' : 'var(--severity-high)', fontFamily: 'var(--font-display)' }}>
                {compliancePercent}% Compliance
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {passedControls.length} Passed / {failedControls.length} Failed Controls
              </div>
            </div>
          </div>

          {/* Sub-grid of Passed and Failed controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Column 1: FAILED controls */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--severity-critical)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
                <XCircle size={16} />
                Failed Controls ({failedControls.length})
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {failedControls.map(c => (
                  <div key={c.id} style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.02)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--severity-critical)' }}>{c.id}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.name}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{c.desc}</p>
                    
                    {/* Affected Assets & Linked Findings */}
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <Database size={10} />
                        <span>Affected Assets ({c.affected_assets.length}):</span>
                      </div>
                      <div style={{
                        maxHeight: '60px',
                        overflowY: 'auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.65rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.2rem',
                        paddingRight: '0.25rem'
                      }}>
                        {c.affected_assets.map((arn: string, idx: number) => (
                          <div key={idx} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            • {arn.split('/').pop()}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: PASSED controls */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--severity-low)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={16} />
                Passed Controls ({passedControls.length})
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {passedControls.map(c => (
                  <div key={c.id} style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.02)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--severity-low)' }}>{c.id}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.name}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Compliance;
