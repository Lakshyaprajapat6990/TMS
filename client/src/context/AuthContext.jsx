import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('tms_token');
    const storedUser = localStorage.getItem('tms_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('tms_token');
        localStorage.removeItem('tms_user');
      }
    }
    setLoading(false);
  }, []);

  function login(tokenValue, userValue) {
    localStorage.setItem('tms_token', tokenValue);
    localStorage.setItem('tms_user', JSON.stringify(userValue));
    setToken(tokenValue);
    setUser(userValue);
  }

  function logout() {
    localStorage.removeItem('tms_token');
    localStorage.removeItem('tms_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isSuperAdmin: user?.role === 'superadmin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
