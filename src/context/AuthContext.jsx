import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

function AuthProviderBase({ children }) {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Restore mock session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("authUser", JSON.stringify(user));
    } else {
      localStorage.removeItem("authUser");
    }
  }, [user]);

  const loginWithCredentials = async ({ email, password, otp, otpMethod, authApi }) => {
    try {
      setAuthError(null);
      const loggedIn = await authApi.login({ email, password, otp, otpMethod });
      setUser(loggedIn);
      return loggedIn;
    } catch (err) {
      setAuthError(err.message || "Login failed");
      throw err;
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, authError, loginWithCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const AuthProvider = AuthProviderBase;

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
