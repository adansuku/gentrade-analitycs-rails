import { useState } from 'react';

const API_BASE = '';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!sessionStorage.getItem('auth_token');
    }
    return false;
  });

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      sessionStorage.setItem('auth_token', data.token);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

  return { isAuthenticated, login, logout };
}

/**
 * Get the stored auth token
 */
export function getAuthToken() {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('auth_token');
  }
  return null;
}

export default useAuth;
