import React, { useState } from 'react';
import { 
  BarChart3, 
  LayoutDashboard, 
  Database, 
  AlertTriangle, 
  KeyRound, 
  Network, 
  Award, 
  CheckSquare, 
  Clock, 
  Upload,
  Lock,
  Globe,
  GitCompare
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [provider, setProvider] = useState('aws');

  const menuItems = [
    { id: 'executive', label: 'Executive View', icon: BarChart3 },
    { id: 'analyst', label: 'Analyst Dashboard', icon: LayoutDashboard },
    { id: 'compare', label: 'Scan Comparison', icon: GitCompare },
    { id: 'inventory', label: 'Asset Inventory', icon: Database },
    { id: 'findings', label: 'Security Findings', icon: AlertTriangle },
    { id: 'iam', label: 'IAM Analyzer', icon: KeyRound },
    { id: 'graph', label: 'Relationship Graph', icon: Network },
    { id: 'compliance', label: 'Compliance Dashboard', icon: Award },
    { id: 'recommendations', label: 'Recommendations', icon: CheckSquare },
    { id: 'timeline', label: 'Security Timeline', icon: Clock },
    { id: 'import', label: 'AWS Config Import', icon: Upload }
  ];

  return (
    <div style={{
      width: '260px',
      height: '100vh',
      background: 'linear-gradient(180deg, #090d16 0%, #0c1120 100%)',
      borderRight: '1px solid var(--border-color)',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      zIndex: 100
    }}>
      {/* Title Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        padding: '0.5rem'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'var(--accent-gradient)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Lock size={16} style={{ color: 'white' }} />
        </div>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'var(--accent-gradient)',
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }}>
            AETHER CSPM
          </h1>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Enterprise Cloud Shield
          </span>
        </div>
      </div>

      {/* Pluggable Cloud Provider Abstraction Selector */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '0.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.25rem', 
          fontSize: '0.65rem', 
          color: 'var(--text-muted)', 
          textTransform: 'uppercase', 
          fontWeight: 700, 
          marginBottom: '0.35rem' 
        }}>
          <Globe size={10} />
          Active Cloud Provider
        </label>
        <select 
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            padding: '0.35rem 0.5rem',
            cursor: 'pointer',
            fontFamily: 'var(--font-main)',
            outline: 'none'
          }}
        >
          <option value="aws">Amazon Web Services (AWS)</option>
          <option value="azure" disabled>Microsoft Azure (Coming Soon)</option>
          <option value="gcp" disabled>Google Cloud Platform (GCP) (Coming Soon)</option>
        </select>
      </div>

      {/* Menu Navigation */}
      <nav style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.25rem', 
        flex: 1, 
        overflowY: 'auto',
        paddingRight: '0.1rem' 
      }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                border: 'none',
                borderRadius: '8px',
                background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.85rem',
                borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                transition: 'var(--transition-smooth)',
                flexShrink: 0
              }}
            >
              <Icon size={16} style={{ color: isActive ? 'var(--accent-color)' : 'inherit' }} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer System Version */}
      <div style={{
        padding: '0.75rem 0.5rem 0 0.5rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        marginTop: '0.5rem'
      }}>
        <div>System Version: 1.2.0-prod</div>
        <div>Multi-Cloud Decoders Active</div>
      </div>
    </div>
  );
};

export default Sidebar;
