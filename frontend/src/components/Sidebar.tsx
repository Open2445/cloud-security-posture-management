import React from 'react';
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
  Lock
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'executive', label: 'Executive View', icon: BarChart3 },
    { id: 'analyst', label: 'Analyst Dashboard', icon: LayoutDashboard },
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
      {/* Platform Title Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '2.5rem',
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

      {/* Menu Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
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
                padding: '0.75rem 1rem',
                border: 'none',
                borderRadius: '8px',
                background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                transition: 'var(--transition-smooth)'
              }}
              className={isActive ? 'glow-active' : ''}
            >
              <Icon size={18} style={{ color: isActive ? 'var(--accent-color)' : 'inherit' }} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: '1rem 0.5rem 0 0.5rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <div>System Version: 1.2.0-prod</div>
        <div>Discovery Engine Active</div>
      </div>
    </div>
  );
};

export default Sidebar;
