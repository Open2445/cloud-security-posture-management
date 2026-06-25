import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GitCompare, TrendingUp, TrendingDown, Plus, CheckCircle, ShieldAlert } from 'lucide-react';

const ScanCompare: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/scan/compare`, {
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
    fetchComparison();
  }, [apiUrl, token]);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Comparing historical posture snapshots...
      </div>
    );
  }

  const scoreColor = data.score_change >= 0 ? 'var(--severity-low)' : 'var(--severity-critical)';
  const ScoreIcon = data.score_change >= 0 ? TrendingUp : TrendingDown;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Historical Scan Comparison</h2>
          <p className="page-subtitle">Inspect posture drift, newly discovered endpoints, and security delta trackers</p>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Core Posture Drift Card */}
        <div className="glass-panel col-12" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              color: 'var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <GitCompare size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                Posture Score Shift
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Comparing the active posture scan against the previous historical baseline.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScoreIcon size={24} style={{ color: scoreColor }} />
            <span style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: scoreColor }}>
              {data.score_change > 0 ? `+${data.score_change}` : data.score_change}%
            </span>
          </div>
        </div>

        {/* Newly Discovered Assets */}
        <div className="glass-panel col-4" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} style={{ color: 'var(--accent-color)' }} />
            Newly Discovered Assets ({data.new_assets.length})
          </h3>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {data.new_assets.map((asset: any) => (
              <div key={asset.id} style={{
                padding: '0.65rem',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{asset.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>{asset.type.toUpperCase()}</span>
                  <span>{asset.region}</span>
                </div>
              </div>
            ))}
            {data.new_assets.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.8rem' }}>
                No new assets discovered.
              </div>
            )}
          </div>
        </div>

        {/* Newly Discovered Vulnerabilities */}
        <div className="glass-panel col-4" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldAlert size={16} style={{ color: 'var(--severity-critical)' }} />
            New Open Findings ({data.new_findings.length})
          </h3>

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {data.new_findings.map((f: any) => (
              <div key={f.id} style={{
                padding: '0.65rem',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{f.title}</span>
                  <span className={`badge badge-${f.severity}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}>
                    {f.severity}
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  Target: {f.asset_id.split('/').pop()}
                </div>
              </div>
            ))}
            {data.new_findings.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.8rem' }}>
                No new security risks identified.
              </div>
            )}
          </div>
        </div>

        {/* Resolved Vulnerabilities */}
        <div className="glass-panel col-4" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={16} style={{ color: 'var(--severity-low)' }} />
            Resolved Findings ({data.resolved_findings.length})
          </h3>

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {data.resolved_findings.map((f: any) => (
              <div key={f.id} style={{
                padding: '0.65rem',
                backgroundColor: 'rgba(16, 185, 129, 0.03)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '6px'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{f.title}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  Target: {f.asset_id.split('/').pop()}
                </div>
              </div>
            ))}
            {data.resolved_findings.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.8rem' }}>
                No findings resolved since previous scan.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScanCompare;
