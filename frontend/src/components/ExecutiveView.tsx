import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  ShieldAlert, 
  Award, 
  Database,
  ArrowRight,
  Download,
  AlertOctagon,
  FileText,
  Filter,
  Globe,
  Server
} from 'lucide-react';

interface ExecutiveViewProps {
  setActiveTab: (tab: string) => void;
}

const ExecutiveView: React.FC<ExecutiveViewProps> = ({ setActiveTab }) => {
  const { token, apiUrl } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [topFindings, setTopFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [regionFilter, setRegionFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build filter params
      const params = new URLSearchParams();
      if (regionFilter) params.append('region', regionFilter);
      if (serviceFilter) params.append('service', serviceFilter);
      if (severityFilter) params.append('severity', severityFilter);

      const statsRes = await fetch(`${apiUrl}/api/dashboard/stats?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch top findings sorted by business risk score
      const findingsRes = await fetch(`${apiUrl}/api/findings?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (findingsRes.ok) {
        const findingsData = await findingsRes.json();
        const sorted = findingsData.sort((a: any, b: any) => b.business_risk_score - a.business_risk_score);
        setTopFindings(sorted.slice(0, 3));
      }
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl, token, regionFilter, serviceFilter, severityFilter]);

  const downloadReport = (type: 'pdf' | 'csv' | 'json') => {
    window.open(`${apiUrl}/api/reports/${type}?token=${token}`, '_blank');
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Interrogating executive security database...
      </div>
    );
  }

  // Determine posture status text and color
  const currentScore = stats ? stats.security_score : 100;
  let scoreColor = '#10b981'; // Green
  let statusText = 'Secured';
  if (currentScore < 75) {
    scoreColor = '#f97316'; // Orange
    statusText = 'Warning';
  }
  if (currentScore < 50) {
    scoreColor = '#ef4444'; // Red
    statusText = 'Critical';
  }

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = stats ? circumference - (stats.security_score / 100) * circumference : 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Executive Posture Dashboard</h2>
          <p className="page-subtitle">A high-level view of cloud security compliance and business risks</p>
        </div>
        
        {/* Reports Download Panel */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => downloadReport('pdf')} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            <FileText size={16} />
            PDF Executive Report
          </button>
          <button onClick={() => downloadReport('csv')} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Dynamic filters selector widget */}
      <div className="glass-panel" style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        padding: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '150px' }}>
          <Globe size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={regionFilter} 
            onChange={(e) => setRegionFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.4rem' }}
          >
            <option value="">All Regions</option>
            <option value="us-east-1">us-east-1</option>
            <option value="us-east-2">us-east-2</option>
            <option value="us-west-1">us-west-1</option>
            <option value="us-west-2">us-west-2</option>
            <option value="eu-west-1">eu-west-1</option>
            <option value="ap-southeast-1">ap-southeast-1</option>
            <option value="global">Global AWS</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '150px' }}>
          <Server size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={serviceFilter} 
            onChange={(e) => setServiceFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.4rem' }}
          >
            <option value="">All Services</option>
            <option value="ec2">EC2 Compute</option>
            <option value="s3">S3 Storage</option>
            <option value="iam">IAM Access</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '150px' }}>
          <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.4rem' }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {loading && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Refreshing metrics...</span>
        )}
      </div>

      {/* Grid containing cards */}
      {stats && (
        <div className="dashboard-grid">
          
          {/* Posture Ring Score Gauge */}
          <div className="glass-panel col-4" style={{ textAlign: 'center', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
              Cloud Posture Score
            </h3>
            
            <div className="score-gauge-container">
              <svg className="score-gauge-svg" width="150" height="150" viewBox="0 0 150 150">
                <circle className="score-gauge-circle-bg" cx="75" cy="75" r={radius} />
                <circle 
                  className="score-gauge-circle-val" 
                  cx="75" 
                  cy="75" 
                  r={radius} 
                  stroke={scoreColor}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="score-gauge-label">
                <div className="score-gauge-number" style={{ color: scoreColor }}>{stats.security_score}</div>
                <div className="score-gauge-text" style={{ color: scoreColor }}>{statusText}</div>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1.5rem', lineHeight: '1.4' }}>
              Posture score calculated dynamically across {stats.total_assets} resources matching active criteria filters.
            </p>
          </div>

          {/* Business Risk Score Gauge */}
          <div className="glass-panel col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                Avg Business Risk
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '1rem 0' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {stats.business_risk_score}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>/ 100</div>
              </div>

              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div style={{ 
                  width: `${stats.business_risk_score}%`, 
                  height: '100%', 
                  background: stats.business_risk_score > 60 ? 'var(--severity-critical)' : 'var(--accent-color)',
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)'
                }} />
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Weighted risk index based on exposed VM nodes, credential security profiles, and compliance breaches.
            </p>
          </div>

          {/* Summary Metrics Cards */}
          <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, padding: '1rem 1.5rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--severity-critical)' }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{stats.critical_findings}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Filtered Critical Risks</div>
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, padding: '1rem 1.5rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-secondary)' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{stats.total_attack_paths}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Attack Pathways</div>
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, padding: '1rem 1.5rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--severity-medium)' }}>
                <Database size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{stats.total_assets}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Discovery Assets</div>
              </div>
            </div>

          </div>

          {/* Compliance Mappings */}
          <div className="glass-panel col-6" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} style={{ color: 'var(--accent-color)' }} />
              Regulatory Compliance Alignment
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Object.entries(stats.compliance_coverage).map(([framework, value]: any) => (
                <div key={framework}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{framework}</span>
                    <span style={{ color: 'var(--accent-color)', marginLeft: 'auto' }}>{value}% compliant</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${value}%`, height: '100%', background: 'var(--accent-gradient)' }} />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setActiveTab('compliance')} 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '1.5rem', fontSize: '0.8rem', padding: '0.5rem 0' }}
            >
              Review Compliance Maps
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Top Business Risks Table */}
          <div className="glass-panel col-6" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertOctagon size={18} style={{ color: 'var(--severity-critical)' }} />
                Top Business Security Risks
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {topFindings.map((f: any) => (
                  <div key={f.id} style={{
                    display: 'flex',
                    justifyBetween: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '1rem', flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{f.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.asset_id}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                        Risk: {f.business_risk_score}
                      </span>
                    </div>
                  </div>
                ))}
                {topFindings.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No open risks found under the current filters.</div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setActiveTab('findings')} 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '1.5rem', fontSize: '0.8rem', padding: '0.5rem 0' }}
            >
              Investigate All Findings
              <ArrowRight size={14} />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default ExecutiveView;
