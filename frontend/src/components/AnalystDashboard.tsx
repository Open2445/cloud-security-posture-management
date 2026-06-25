import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Server, 
  Globe, 
  ListTodo, 
  History,
  Info
} from 'lucide-react';

const AnalystDashboard: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/dashboard/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [apiUrl, token]);

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Decrypting scanning metrics...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Analyst Security Desk</h2>
          <p className="page-subtitle">Granular posture assessments, threat notifications, and discovery inventories</p>
        </div>
      </div>

      {/* Grid containing cards */}
      <div className="dashboard-grid">
        
        {/* Core numbers */}
        <div className="col-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem' }}>
          
          <div className="glass-panel" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}>
              {stats.security_score}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.2rem' }}>
              Posture Score
            </div>
          </div>

          <div className="glass-panel" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-display)' }}>
              {stats.business_risk_score}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.2rem' }}>
              Business Risk
            </div>
          </div>

          <div className="glass-panel" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {stats.total_assets}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.2rem' }}>
              Total Assets
            </div>
          </div>

          <div className="glass-panel" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--severity-critical)', fontFamily: 'var(--font-display)' }}>
              {stats.total_findings}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.2rem' }}>
              Discovered Risks
            </div>
          </div>

          <div className="glass-panel" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-secondary)', fontFamily: 'var(--font-display)' }}>
              {stats.total_attack_paths}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.2rem' }}>
              Attack Pathways
            </div>
          </div>

        </div>

        {/* Severity chart and Remediation status */}
        <div className="glass-panel col-4" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={16} style={{ color: 'var(--severity-critical)' }} />
            Risks by Severity
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(stats.findings_by_severity).map(([sev, count]: any) => {
              const colors: Record<string, string> = {
                critical: 'var(--severity-critical)',
                high: 'var(--severity-high)',
                medium: 'var(--severity-medium)',
                low: 'var(--severity-low)'
              };
              const percentage = stats.total_findings > 0 ? (count / stats.total_findings) * 100 : 0;
              return (
                <div key={sev}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{sev}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{count} ({Math.round(percentage)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: colors[sev] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assets Types Distribution */}
        <div className="glass-panel col-4" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={16} style={{ color: 'var(--accent-color)' }} />
            Asset Catalog Breakdown
          </h3>

          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
            {Object.entries(stats.asset_types_distribution).map(([type, count]: any) => {
              if (count === 0) return null;
              return (
                <div key={type} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.03)'
                }}>
                  <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {type.replace('_', ' ')}
                  </span>
                  <span style={{ fontWeight: 700 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resources by Region */}
        <div className="glass-panel col-4" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={16} style={{ color: 'var(--accent-secondary)' }} />
            Resources by Region
          </h3>

          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
            {Object.entries(stats.resources_by_region).map(([region, count]: any) => (
              <div key={region} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                padding: '0.4rem 0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.03)'
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {region}
                </span>
                <span style={{ fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Remediation Progress checklist */}
        <div className="glass-panel col-4" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ListTodo size={16} style={{ color: 'var(--status-resolved)' }} />
            Remediation Progress
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Resolved Findings</span>
                <span style={{ fontWeight: 700, color: 'var(--status-resolved)' }}>{stats.remediation_progress.resolved}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats.total_findings > 0 ? (stats.remediation_progress.resolved / stats.total_findings) * 100 : 0}%`, 
                  height: '100%', 
                  backgroundColor: 'var(--status-resolved)' 
                }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Snoozed/Accepted Risks</span>
                <span style={{ fontWeight: 700, color: 'var(--status-snoozed)' }}>{stats.remediation_progress.snoozed}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats.total_findings > 0 ? (stats.remediation_progress.snoozed / stats.total_findings) * 100 : 0}%`, 
                  height: '100%', 
                  backgroundColor: 'var(--status-snoozed)' 
                }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Outstanding Open Issues</span>
                <span style={{ fontWeight: 700, color: 'var(--status-open)' }}>{stats.remediation_progress.open}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats.total_findings > 0 ? (stats.remediation_progress.open / stats.total_findings) * 100 : 0}%`, 
                  height: '100%', 
                  backgroundColor: 'var(--status-open)' 
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent timeline events */}
        <div className="glass-panel col-8" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={16} style={{ color: 'var(--accent-color)' }} />
            Recent Security Events
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.recent_events.map((e: any) => {
              const severityColors: Record<string, string> = {
                critical: 'var(--severity-critical)',
                high: 'var(--severity-high)',
                medium: 'var(--severity-medium)',
                low: 'var(--text-muted)'
              };
              return (
                <div key={e.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: severityColors[e.severity] || 'var(--text-muted)',
                      marginTop: '0.35rem',
                      flexShrink: 0
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{e.event_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {e.details}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <span>Service: {e.service}</span>
                        <span>•</span>
                        <span>Region: {e.region}</span>
                        <span>•</span>
                        <span>Resource: {e.resource_id.split('/').pop()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '1.5rem' }}>
                    {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalystDashboard;
