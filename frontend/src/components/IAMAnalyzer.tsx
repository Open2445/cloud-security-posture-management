import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldCheck, AlertOctagon, HelpCircle, ShieldAlert } from 'lucide-react';

const IAMAnalyzer: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIAMData = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/iam-analyzer`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchIAMData();
  }, [apiUrl, token]);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Analyzing IAM authorization graphs...
      </div>
    );
  }

  const metrics = [
    { label: 'AdministratorAccess Policies', count: data.summary.admin_policies_count, danger: true },
    { label: 'Wildcard * Policies', count: data.summary.wildcard_policies_count, danger: true },
    { label: 'Privilege Escalation Risks', count: data.summary.privilege_escalations_count, danger: true },
    { label: 'Dormant Inactive Users', count: data.summary.inactive_users_count, danger: false },
    { label: 'MFA Disabled Users', count: data.summary.mfa_disabled_count, danger: true },
    { label: 'Unused API Keys', count: data.summary.unused_keys_count, danger: false }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">IAM Permission Analyzer</h2>
          <p className="page-subtitle">Inspect identity permissions, administrative access policies, and dormant keys</p>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Core Summary Counters */}
        <div className="col-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-color)' }}>
              <KeyRound size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {data.summary.total_users}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Identity Users</div>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-secondary)' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {data.summary.total_roles}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assumable Service Roles</div>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--severity-low)' }}>
              <HelpCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {data.summary.total_policies}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Customer/AWS Managed Policies</div>
            </div>
          </div>
        </div>

        {/* Detailed IAM Alert Indicators */}
        <div className="glass-panel col-4" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem' }}>
            Identity Posture Counters
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {metrics.map((m) => (
              <div key={m.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.label}</span>
                <span style={{
                  fontWeight: 700,
                  color: m.danger && m.count > 0 ? 'var(--severity-critical)' : 'var(--text-primary)',
                  fontSize: '1rem'
                }}>
                  {m.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* IAM Findings Table */}
        <div className="glass-panel col-8" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={16} style={{ color: 'var(--severity-critical)' }} />
            Active Identity Misconfigurations
          </h3>

          <div style={{ maxHeight: '310px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {data.findings.map((f: any) => (
              <div key={f.id} style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{f.title}</span>
                  <span className={`badge badge-${f.severity.toLowerCase()}`} style={{ fontSize: '0.6rem' }}>
                    {f.severity}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {f.description}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.4rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  Target: {f.asset_id}
                </div>
              </div>
            ))}
            {data.findings.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                All identity parameters aligned! No IAM risks identified.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default IAMAnalyzer;
