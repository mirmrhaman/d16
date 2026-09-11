import React, { createContext, useContext, useState, useEffect } from "react";
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const AuthContext = createContext(null);

function AuthProviderBase({ children }) {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Database identity comes only from the server's HttpOnly session cookie.
  useEffect(() => {
    let active = true;
    const expireSession = () => {
      if (!active) return;
      setUser(null);
      setAuthError('Your session has expired. Please sign in again.');
      queryClient.clear();
    };
    window.addEventListener('d16-session-expired', expireSession);
    base44.auth.me().then((current) => { if (active) setUser(current); })
      .catch((error) => { if (active) setAuthError(error.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; window.removeEventListener('d16-session-expired', expireSession); };
  }, [queryClient]);

  const loginWithCredentials = async ({ email, password, otp, otpMethod, authApi }) => {
    try {
      setAuthError(null);
      const loggedIn = await authApi.login({ email, password, otp, otpMethod });
      queryClient.clear();
      setUser(loggedIn);
      return loggedIn;
    } catch (err) {
      setAuthError(err.message || "Login failed");
      throw err;
    }
  };

  const logout = async () => {
    try {
      await base44.auth.logout();
      setUser(null);
      queryClient.clear();
    } catch (error) { setAuthError(error.message); }
  };

  return (
    <AuthContext.Provider value={{ user, authError, isLoading, loginWithCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const AuthProvider = AuthProviderBase;

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
