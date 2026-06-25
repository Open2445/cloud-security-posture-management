import React, { createContext, useState, useEffect, useContext } from 'react';

export interface User {
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  apiUrl: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_URL = "http://localhost:8000";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user from token in localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('cspm_token');
    const storedRole = localStorage.getItem('cspm_role');
    const storedEmail = localStorage.getItem('cspm_email');

    if (storedToken && storedRole && storedEmail) {
      setToken(storedToken);
      setUser({
        email: storedEmail,
        role: storedRole as 'admin' | 'analyst' | 'viewer'
      });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      localStorage.setItem('cspm_token', data.access_token);
      localStorage.setItem('cspm_role', data.role);
      localStorage.setItem('cspm_email', data.email);

      setToken(data.access_token);
      setUser({
        email: data.email,
        role: data.role as 'admin' | 'analyst' | 'viewer'
      });
    } catch (error) {
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('cspm_token');
    localStorage.removeItem('cspm_role');
    localStorage.removeItem('cspm_email');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, apiUrl: API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
