import React, { useState, useEffect, createContext, useContext } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  plan: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/auth-v1/me');
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setUser(data);
        } else {
          console.warn("Auth check returned non-JSON response");
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch('/server-ping');
        if (!res.ok) {
          console.error(`API Health Check Failed: ${res.status} ${res.statusText}`);
          const text = await res.text();
          console.error(`Response body: ${text.substring(0, 100)}`);
        } else {
          console.log("API is reachable");
        }
      } catch (err) {
        console.error("API Health Check Network Error:", err);
      }
    };
    checkApi();
    refreshUser();
  }, []);

  const login = (userData: User) => setUser(userData);
  const logout = async () => {
    await fetch('/auth-v1/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
