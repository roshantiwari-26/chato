import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Checking existing login session
  useEffect(() => {
    async function checkAuthentication() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/me`,
          {
            credentials: "include",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message);
        }

        setCurrentUser(data.user);
        setIsAuthenticated(true);
      } catch (error) {
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuthentication();
  }, []);

  // Login
  async function login(credentials) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(credentials),
        },
      );

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }
      const data = await response.json();

      setCurrentUser(data.user);
      setIsAuthenticated(true);

      return data;
    } catch (err) {
      console.log(err.message);
    }
  }

  // Logout
  async function logout() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Logout failed");
      }
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  }

  const value = {
    currentUser,
    isAuthenticated,
    checkingAuth,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export default AuthProvider;
