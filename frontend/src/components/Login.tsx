import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, AlertCircle, Info } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Incorrect credentials or connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: string) => {
    setError('');
    setSubmitting(true);
    const mockAccounts: Record<string, [string, string]> = {
      admin: ['admin@cspm.local', 'admin123'],
      analyst: ['analyst@cspm.local', 'analyst123'],
      viewer: ['viewer@cspm.local', 'viewer123']
    };
    const [mockEmail, mockPass] = mockAccounts[role];
    try {
      await login(mockEmail, mockPass);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#070a13',
      backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.08) 0%, transparent 60%)',
      padding: '2rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '2.5rem',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Header logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'var(--accent-gradient)',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Shield size={24} style={{ color: 'white' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800 }}>
            AETHER CSPM
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Enterprise Cloud Posture Intelligence
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '0.75rem',
            color: '#ff8a8a',
            fontSize: '0.8rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="operator@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem' }}
          >
            {submitting ? 'Verifying Identity...' : 'Access Cloud Shield'}
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.5rem',
          marginTop: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem'
          }}>
            <Info size={14} style={{ color: 'var(--accent-color)' }} />
            <span>Demo Roles Switcher</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button 
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '0.4rem 0' }}
            >
              Admin
            </button>
            <button 
              type="button"
              onClick={() => handleQuickLogin('analyst')}
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '0.4rem 0' }}
            >
              Analyst
            </button>
            <button 
              type="button"
              onClick={() => handleQuickLogin('viewer')}
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '0.4rem 0' }}
            >
              Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
