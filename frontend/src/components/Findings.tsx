import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Check, 
  Copy, 
  Eye, 
  X, 
  Flame, 
  FileTerminal,
  Grid,
  ShieldCheck,
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface FindingsProps {
  initialSearch?: string;
  clearInitialSearch?: () => void;
}

const Findings: React.FC<FindingsProps> = ({ initialSearch, clearInitialSearch }) => {
  const { token, user, apiUrl } = useAuth();
  const [findings, setFindings] = useState<any[]>([]);
  const [filteredFindings, setFilteredFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('open'); // default to open
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  
  const [copyCliSuccess, setCopyCliSuccess] = useState(false);
  const [copyTfSuccess, setCopyTfSuccess] = useState(false);

  const fetchFindings = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/findings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFindings(data);
        setFilteredFindings(data);

        // If redirecting from global search
        if (initialSearch) {
          setSearch(initialSearch);
          // Look for title matching initialSearch
          const matched = data.find((f: any) => f.title.toLowerCase().includes(initialSearch.toLowerCase()));
          if (matched) {
            setSelectedFinding(matched);
          }
          if (clearInitialSearch) clearInitialSearch();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [apiUrl, token, initialSearch]);

  useEffect(() => {
    let result = findings;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(f => 
        f.title.toLowerCase().includes(lower) || 
        f.asset_id.toLowerCase().includes(lower) ||
        f.description.toLowerCase().includes(lower)
      );
    }

    if (severityFilter) {
      result = result.filter(f => f.severity === severityFilter);
    }

    if (statusFilter) {
      result = result.filter(f => f.status === statusFilter);
    }

    const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
      const weightDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (weightDiff !== 0) return weightDiff;
      return b.business_risk_score - a.business_risk_score;
    });

    setFilteredFindings(result);
  }, [search, severityFilter, statusFilter, findings]);

  const handleStatusChange = async (findingId: string, newStatus: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/findings/${findingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setFindings(prev => prev.map(f => f.id === findingId ? updated : f));
        if (selectedFinding && selectedFinding.id === findingId) {
          setSelectedFinding(updated);
        }
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const copyToClipboard = (text: string, target: 'cli' | 'tf') => {
    navigator.clipboard.writeText(text);
    if (target === 'cli') {
      setCopyCliSuccess(true);
      setTimeout(() => setCopyCliSuccess(false), 2000);
    } else {
      setCopyTfSuccess(true);
      setTimeout(() => setCopyTfSuccess(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Decrypting vulnerabilities registry...
      </div>
    );
  }

  // Hardcoded technical metadata mapping to enrich Finding Detail View
  const getExtendedDetails = (title: string) => {
    switch (title) {
      case 'Public S3 Buckets':
        return {
          rootCause: 'Bucket policy allows Principal "*" or ACL contains public read/write grants.',
          remedEffort: 'Low (SSM / AWS CLI command takes less than 2 minutes)',
          references: ['https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html', 'https://cisbenchmarks.com/aws/s3-hardening']
        };
      case 'IAM Users without MFA':
        return {
          rootCause: 'IAM account profile created without virtual/hardware MFA token bindings.',
          remedEffort: 'Medium (Requires users to sign in and register a mobile MFA application)',
          references: ['https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html', 'https://cisbenchmarks.com/aws/iam-hardening']
        };
      default:
        return {
          rootCause: 'Misconfigured infrastructure configuration violating AWS cloud posture best practices.',
          remedEffort: 'Medium (15-30 minutes development and apply cycle)',
          references: ['https://aws.amazon.com/security/security-hub/', 'https://cisbenchmarks.com/aws/']
        };
    }
  };

  const ext = selectedFinding ? getExtendedDetails(selectedFinding.title) : null;

  return (
    <div style={{ position: 'relative' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Vulnerabilities & Findings</h2>
          <p className="page-subtitle">Detailed ledger of compliance breaches, risk indexes, and remediations</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        padding: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by Title, Asset ID, or Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
          <AlertTriangle size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.5rem' }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
          <ShieldCheck size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.5rem' }}
          >
            <option value="open">Open Issues</option>
            <option value="resolved">Resolved</option>
            <option value="snoozed">Snoozed</option>
            <option value="">All Statuses</option>
          </select>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {filteredFindings.length} of {findings.length} findings
        </div>
      </div>

      {/* Findings Table */}
      <div className="glass-panel" style={{ padding: '0' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Risk / Finding Title</th>
                <th>Target Asset ID</th>
                <th>Severity</th>
                <th>Business Risk</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFindings.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</span>
                        {f.in_attack_path && (
                          <span className="badge glow-pulsing" style={{
                            fontSize: '0.65rem',
                            background: 'rgba(239,68,68,0.15)',
                            borderColor: 'rgba(239,68,68,0.4)',
                            color: 'var(--severity-critical)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            fontWeight: 700
                          }}>
                            <Flame size={10} />
                            Attack Path
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.category}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      maxWidth: '240px',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={f.asset_id}>
                      {f.asset_id.split('/').pop()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${f.severity.toLowerCase()}`}>
                      {f.severity}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: f.business_risk_score > 60 ? 'var(--severity-critical)' : 'var(--text-primary)' }}>
                        {f.business_risk_score}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 100</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${f.status.toLowerCase()}`}>
                      {f.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedFinding(f)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <Eye size={12} />
                      Remediate
                    </button>
                  </td>
                </tr>
              ))}
              {filteredFindings.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No security findings matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Finding Detail View Drawer */}
      {selectedFinding && ext && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '650px',
          height: '100vh',
          backgroundColor: '#0c101b',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-10px 0 35px rgba(0,0,0,0.6)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          padding: '2.5rem',
          overflowY: 'auto',
          transition: 'var(--transition-smooth)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge badge-${selectedFinding.severity.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                  {selectedFinding.severity}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Business Risk Score: {selectedFinding.business_risk_score}/100
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {selectedFinding.title}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedFinding(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Finding Details Page */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            
            {selectedFinding.in_attack_path && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#ff8a8a',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600
              }} className="glow-pulsing">
                <Flame size={16} />
                <span>Critical Risk: This resource participates in an active internet-facing Attack Path!</span>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Executive Summary</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.4' }}>
                {selectedFinding.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Technical Root Cause</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {ext.rootCause}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Remediation Effort</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                  {ext.remedEffort}
                </p>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Impact Description</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Unauthorized command executions, data breaches, and non-compliance with industry standards (e.g. NIST CSF).
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Affected Cloud Resource</label>
              <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                {selectedFinding.asset_id}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Category</label>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)', marginTop: '0.1rem' }}>{selectedFinding.category}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Compliance standards</label>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                  {Object.entries(selectedFinding.compliance_mappings).map(([fw, rules]: any) => (
                    <div key={fw} style={{ fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 600 }}>{fw.toUpperCase()}:</span> {rules.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Attack Path Visualizer diagram inside drawer */}
            {selectedFinding.in_attack_path && (
              <div>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>Attack Vector hops</label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(9, 13, 22, 0.4)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-color)' }}>Internet</span>
                  <ArrowRight size={12} style={{ color: 'var(--severity-critical)' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--severity-critical)', textDecoration: 'underline' }}>
                    {selectedFinding.asset_id.split('/').pop().substring(0, 15)}...
                  </span>
                  <ArrowRight size={12} style={{ color: 'var(--severity-critical)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target asset</span>
                </div>
              </div>
            )}

            {/* CLI / Terraform Remediation snippets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <FileTerminal size={12} style={{ color: 'var(--accent-color)' }} />
                    <span>AWS CLI Remediation Guide</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(selectedFinding.remediation_cli, 'cli')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}
                  >
                    <Copy size={10} /> Copy
                  </button>
                </div>
                <pre className="code-block" style={{ fontSize: '0.75rem' }}>
                  {selectedFinding.remediation_cli || '# CLI command not available'}
                </pre>
              </div>

              {selectedFinding.remediation_terraform && (
                <div>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Grid size={12} style={{ color: 'var(--accent-secondary)' }} />
                      <span>Terraform Code Remediation</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(selectedFinding.remediation_terraform, 'tf')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}
                    >
                      <Copy size={10} /> Copy
                    </button>
                  </div>
                  <pre className="code-block" style={{ fontSize: '0.75rem', color: '#a78bfa' }}>
                    {selectedFinding.remediation_terraform}
                  </pre>
                </div>
              )}
            </div>

            {/* References */}
            <div>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <BookOpen size={12} style={{ color: 'var(--accent-color)' }} />
                Standards References
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem' }}>
                {ext.references.map((r, idx) => (
                  <a key={idx} href={r} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textDecoration: 'underline' }}>
                    {r}
                  </a>
                ))}
              </div>
            </div>

            {/* State Controls */}
            {user.role !== 'viewer' && (
              <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1.5rem',
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Update Finding State</label>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    onClick={() => handleStatusChange(selectedFinding.id, 'open')}
                    disabled={selectedFinding.status === 'open'}
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.8rem', border: selectedFinding.status === 'open' ? '1px solid var(--status-open)' : 'none' }}
                  >
                    Open Risk
                  </button>
                  <button 
                    onClick={() => handleStatusChange(selectedFinding.id, 'resolved')}
                    disabled={selectedFinding.status === 'resolved'}
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.8rem', background: selectedFinding.status === 'resolved' ? 'none' : 'var(--accent-gradient)', backgroundColor: selectedFinding.status === 'resolved' ? 'var(--bg-tertiary)' : '' }}
                  >
                    Mark Resolved
                  </button>
                  <button 
                    onClick={() => handleStatusChange(selectedFinding.id, 'snoozed')}
                    disabled={selectedFinding.status === 'snoozed'}
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.8rem', border: selectedFinding.status === 'snoozed' ? '1px solid var(--status-snoozed)' : 'none' }}
                  >
                    Snooze
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Findings;
