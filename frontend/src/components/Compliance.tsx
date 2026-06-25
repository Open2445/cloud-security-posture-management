import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, ShieldCheck, AlertOctagon, HelpCircle, FileText, CheckCircle2, XCircle } from 'lucide-react';

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

  // Helper to check if a specific finding title has active "open" items
  const hasOpenFinding = (title: string) => {
    return findings.some(f => f.title === title && f.status === 'open');
  };

  // Define framework controls
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
    switch (activeFramework) {
      case 'cis':
        return {
          title: 'CIS AWS Foundations Benchmark',
          subtitle: 'System hardening parameters defined by the Center for Internet Security',
          controls: cisControls.map(c => ({
            ...c,
            status: hasOpenFinding(c.finding) ? 'fail' : 'pass'
          }))
        };
      case 'nist':
        return {
          title: 'NIST CyberSecurity Framework (CSF)',
          subtitle: 'Standards for infrastructure data protection, access controls, and boundary monitors',
          controls: nistControls.map(c => ({
            ...c,
            status: c.findings.some(f => hasOpenFinding(f)) ? 'fail' : 'pass'
          }))
        };
      case 'mitre':
        return {
          title: 'MITRE ATT&CK Cloud Matrix',
          subtitle: 'Threat vectors, defenses impairment, and credential abuse indicators',
          controls: mitreControls.map(c => ({
            ...c,
            status: c.findings.some(f => hasOpenFinding(f)) ? 'fail' : 'pass'
          }))
        };
    }
  };

  const current = getFrameworkDetails();
  const passCount = current.controls.filter(c => c.status === 'pass').length;
  const coveragePercent = Math.round((passCount / current.controls.length) * 100);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Compliance Dashboard</h2>
          <p className="page-subtitle">Align cloud infrastructure parameters against national standards and attack matrices</p>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Framework Selector Tabs */}
        <div className="glass-panel col-3" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
            Compliance frameworks
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
            NIST CSF v1.1
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

        {/* Framework Details List */}
        <div className="glass-panel col-9" style={{ padding: '2rem' }}>
          
          {/* Header Progress summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1.5rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>
                {current.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {current.subtitle}
              </p>
            </div>
            
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}>
                {coveragePercent}% Passed
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {passCount} of {current.controls.length} controls aligned
              </div>
            </div>
          </div>

          {/* Controls Checklist Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {current.controls.map((control) => (
              <div key={control.id} style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}>
                <div style={{ paddingRight: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--accent-color)',
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px'
                    }}>
                      {control.id}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {control.name}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: '1.4' }}>
                    {control.desc}
                  </p>
                </div>

                <div style={{ flexShrink: 0, marginTop: '0.2rem' }}>
                  {control.status === 'pass' ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: 'var(--severity-low)',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      <CheckCircle2 size={16} />
                      PASSED
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: 'var(--severity-critical)',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      <XCircle size={16} />
                      FAILED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};

export default Compliance;
