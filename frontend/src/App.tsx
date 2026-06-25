import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ExecutiveView from './components/ExecutiveView';
import AnalystDashboard from './components/AnalystDashboard';
import AssetInventory from './components/AssetInventory';
import Findings from './components/Findings';
import IAMAnalyzer from './components/IAMAnalyzer';
import AssetGraph from './components/AssetGraph';
import Compliance from './components/Compliance';
import Recommendations from './components/Recommendations';
import Timeline from './components/Timeline';
import ConfigImport from './components/ConfigImport';
import { Shield, RefreshCw, LogOut, User as UserIcon } from 'lucide-react';

const App: React.FC = () => {
  const { user, token, logout, loading, apiUrl } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('executive');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');

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
          // Force active component reload or simple window reload to pick up new stats
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

  const renderContent = () => {
    switch (activeTab) {
      case 'executive':
        return <ExecutiveView setActiveTab={setActiveTab} />;
      case 'analyst':
        return <AnalystDashboard />;
      case 'inventory':
        return <AssetInventory />;
      case 'findings':
        return <Findings />;
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
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield style={{ color: 'var(--accent-color)' }} size={24} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
              Cloud Asset Discovery Engine
            </h2>
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
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
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
