import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    message: text || "Something went wrong",
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function checkAuthentication() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/me`,
          {
            credentials: "include",
          },
        );

        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Authentication failed");
        }

        if (isCancelled) return;

        setCurrentUser(data.user);
        setIsAuthenticated(true);
      } catch {
        if (isCancelled) return;

        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        if (!isCancelled) {
          setCheckingAuth(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function register(credentials) {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      },
    );

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    return data;
  }

  async function login(credentials) {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(credentials),
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    setCurrentUser(data.user);
    setIsAuthenticated(true);

    return data;
  }

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
        const data = await parseResponse(response);
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
    register,
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
