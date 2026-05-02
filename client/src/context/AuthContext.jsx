import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  // When superadmin is viewing a specific user's data
  const [viewingAs, setViewingAs] = useState(null); // { _id, name, email }

  useEffect(() => {
    const storedToken = localStorage.getItem('tms_token');
    const storedUser = localStorage.getItem('tms_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        const storedViewing = localStorage.getItem('tms_viewing_as');
        if (storedViewing) setViewingAs(JSON.parse(storedViewing));
      } catch {
        localStorage.removeItem('tms_token');
        localStorage.removeItem('tms_user');
        localStorage.removeItem('tms_viewing_as');
      }
    }
    setLoading(false);
  }, []);

  function login(tokenValue, userValue) {
    localStorage.setItem('tms_token', tokenValue);
    localStorage.setItem('tms_user', JSON.stringify(userValue));
    setToken(tokenValue);
    setUser(userValue);
    setViewingAs(null);
  }

  function logout() {
    localStorage.removeItem('tms_token');
    localStorage.removeItem('tms_user');
    setToken(null);
    setUser(null);
    setViewingAs(null);
  }

  function startViewingAs(targetUser) {
    localStorage.setItem('tms_viewing_as', JSON.stringify(targetUser));
    setViewingAs(targetUser);
  }

  function stopViewingAs() {
    localStorage.removeItem('tms_viewing_as');
    setViewingAs(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      isSuperAdmin: user?.role === 'superadmin',
      viewingAs,
      startViewingAs,
      stopViewingAs,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
