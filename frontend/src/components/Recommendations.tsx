import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, AlertOctagon, HelpCircle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

const Recommendations: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/recommendations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [apiUrl, token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Generating posture correction guidelines...
      </div>
    );
  }

  const effortColors: Record<string, string> = {
    Low: 'var(--severity-low)',
    Medium: 'var(--status-open)',
    High: 'var(--severity-critical)'
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Cloud Posture Recommendations</h2>
          <p className="page-subtitle">Actionable correction lists compiled by security domains to maximize posture health scores</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {recommendations.map((rec) => (
          <div key={rec.category} className="glass-panel glowing-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            padding: '2rem'
          }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-medium" style={{ fontSize: '0.65rem', marginBottom: '0.5rem' }}>
                  {rec.category}
                </span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
                  {rec.title}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Remediation Effort:
                </span>
                <span className="badge" style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderColor: effortColors[rec.effort] || 'var(--border-color)',
                  color: effortColors[rec.effort] || 'var(--text-primary)',
                  fontSize: '0.7rem'
                }}>
                  {rec.effort}
                </span>
              </div>
            </div>

            {/* Middle body info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '0.5rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Impacted Frameworks
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                    {rec.impacted_frameworks.map((fw: string) => (
                      <span key={fw} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fw}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--severity-critical)',
                  fontSize: '0.8rem'
                }}>
                  <AlertTriangle size={16} />
                  <span>Affects <b>{rec.findings_count}</b> open vulnerabilities.</span>
                </div>
              </div>

              {/* Remediation sample */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  AWS CLI Remediation Example
                </span>
                <pre className="code-block" style={{ fontSize: '0.75rem', height: '100px' }}>
                  {rec.reremediation_cli || rec.remediation_cli}
                </pre>
              </div>

            </div>

          </div>
        ))}

        {recommendations.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <Sparkles size={30} style={{ color: 'var(--status-resolved)', marginBottom: '1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>No Actionable Recommendations</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Your cloud environment aligns with all active posture security profiles. Keep up the clean work!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
