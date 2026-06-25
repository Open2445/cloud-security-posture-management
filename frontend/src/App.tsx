import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ExecutiveView from './components/ExecutiveView';
import AnalystDashboard from './components/AnalystDashboard';
import ScanCompare from './components/ScanCompare';
import AssetInventory from './components/AssetInventory';
import Findings from './components/Findings';
import IAMAnalyzer from './components/IAMAnalyzer';
import AssetGraph from './components/AssetGraph';
import Compliance from './components/Compliance';
import Recommendations from './components/Recommendations';
import Timeline from './components/Timeline';
import ConfigImport from './components/ConfigImport';
import { Shield, RefreshCw, LogOut, User as UserIcon, Search } from 'lucide-react';

const App: React.FC = () => {
  const { user, token, logout, loading, apiUrl } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('executive');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');

  // Global Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);

  // Local child search inputs
  const [childSearchFilter, setChildSearchFilter] = useState('');

  // Fetch index for search suggest on login
  useEffect(() => {
    if (!token) return;
    const fetchSearchIndex = async () => {
      try {
        const assetsRes = await fetch(`${apiUrl}/api/assets`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (assetsRes.ok) setAssets(await assetsRes.json());
        const findingsRes = await fetch(`${apiUrl}/api/findings`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (findingsRes.ok) setFindings(await findingsRes.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchSearchIndex();
  }, [apiUrl, token, scanning]);

  // Handle search suggestions logic
  useEffect(() => {
    if (!searchQuery) {
      setSearchSuggestions([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const suggestions: any[] = [];

    // Match assets
    assets.forEach(a => {
      if (a.id.toLowerCase().includes(query) || a.name.toLowerCase().includes(query)) {
        suggestions.push({ type: 'asset', label: `Asset: ${a.name}`, id: a.id, value: a.id });
      }
    });

    // Match findings
    findings.forEach(f => {
      if (f.title.toLowerCase().includes(query) || f.category.toLowerCase().includes(query)) {
        suggestions.push({ type: 'finding', label: `Risk: ${f.title}`, id: f.id, value: f.title });
      }
    });

    // Match Regions
    const uniqueRegions = Array.from(new Set(assets.map(a => a.region)));
    uniqueRegions.forEach(r => {
      if (r.toLowerCase().includes(query)) {
        suggestions.push({ type: 'region', label: `Region: ${r}`, id: r, value: r });
      }
    });

    setSearchSuggestions(suggestions.slice(0, 8));
  }, [searchQuery, assets, findings]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#080c14',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8'
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="glow-pulsing" style={{ animation: 'spin 2s linear infinite', color: '#6366f1' }} size={40} />
          <p style={{ marginTop: '1rem', fontFamily: 'Space Grotesk' }}>Initializing Posture Decoders...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const triggerScan = async () => {
    if (scanning) return;
    setScanning(true);
    setScanMessage('Initiating scan...');
    try {
      const response = await fetch(`${apiUrl}/api/scan/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setScanMessage('Postures updated!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const err = await response.json();
        setScanMessage(err.detail || 'Discovery scan failed');
      }
    } catch (error) {
      setScanMessage('Failed to connect to scanner');
    } finally {
      setTimeout(() => {
        setScanning(false);
        setScanMessage('');
      }, 3000);
    }
  };

  const handleSuggestionClick = (s: any) => {
    setSearchQuery('');
    setShowSuggestions(false);
    setChildSearchFilter(s.value);
    
    if (s.type === 'asset') {
      setActiveTab('inventory');
    } else if (s.type === 'finding') {
      setActiveTab('findings');
    } else if (s.type === 'region') {
      setActiveTab('inventory');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'executive':
        return <ExecutiveView setActiveTab={setActiveTab} />;
      case 'analyst':
        return <AnalystDashboard />;
      case 'compare':
        return <ScanCompare />;
      case 'inventory':
        return <AssetInventory initialSearch={childSearchFilter} clearInitialSearch={() => setChildSearchFilter('')} />;
      case 'findings':
        return <Findings initialSearch={childSearchFilter} clearInitialSearch={() => setChildSearchFilter('')} />;
      case 'iam':
        return <IAMAnalyzer />;
      case 'graph':
        return <AssetGraph />;
      case 'compliance':
        return <Compliance />;
      case 'recommendations':
        return <Recommendations />;
      case 'timeline':
        return <Timeline />;
      case 'import':
        return <ConfigImport />;
      default:
        return <ExecutiveView setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="main-content">
        {/* Top Navbar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(15, 21, 36, 0.4)',
          backdropFilter: 'blur(8px)',
          position: 'relative',
          zIndex: 10
        }}>
          {/* Platform Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield style={{ color: 'var(--accent-color)' }} size={24} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
              Discovery Desk
            </h2>
          </div>

          {/* Global Search Input in Header */}
          <div style={{ position: 'relative', width: '380px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem', paddingRight: '1rem', height: '36px' }}
              placeholder="Search assets, risks, compliance controls..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />

            {/* Suggestions list */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '42px',
                left: 0,
                width: '100%',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-main)',
                zIndex: 150,
                overflow: 'hidden'
              }}>
                {searchSuggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSuggestionClick(s)}
                    style={{
                      padding: '0.65rem 1rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.02)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {scanMessage && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {scanMessage}
              </span>
            )}
            
            {user.role !== 'viewer' && (
              <button 
                onClick={triggerScan}
                disabled={scanning}
                className="btn btn-secondary" 
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', height: '36px' }}
              >
                <RefreshCw size={14} className={scanning ? 'glow-pulsing' : ''} style={{ animation: scanning ? 'spin 1.5s linear infinite' : 'none' }} />
                Trigger Scan
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.email}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {user.role} role
                </div>
              </div>
              <UserIcon size={18} style={{ color: 'var(--text-secondary)' }} />
            </div>

            <button 
              onClick={logout} 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Dynamic page component body */}
        <div className="content-body">
          {renderContent()}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
