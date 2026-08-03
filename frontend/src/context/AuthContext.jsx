import { createContext, useContext, useEffect, useState } from "react";
import { setAuthToken } from "../api";

const AuthContext = createContext(null);

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("figuritas_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("figuritas_token");
    const savedUser = localStorage.getItem("figuritas_user");

    if (savedToken) {
      setAuthToken(savedToken);
      setToken(savedToken);
    }

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error(error);

        localStorage.removeItem("figuritas_token");
        localStorage.removeItem("figuritas_user");

        setAuthToken(null);
        setToken(null);
        setUser(null);
      }
    }

    setLoading(false);
  }, []);

  function saveSession(newToken, newUser) {
    localStorage.setItem("figuritas_token", newToken);
    localStorage.setItem(
      "figuritas_user",
      JSON.stringify(newUser)
    );

    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }

  async function login(username, password) {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      console.log("LOGIN:", data);

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          "No se pudo iniciar sesión"
        );
      }

      saveSession(data.token, data.user);

      return data;
    } catch (error) {
      console.error("ERROR LOGIN:", error);
      throw error;
    }
  }

  async function register(username, email, password) {
    const response = await fetch(
      `${API_URL}/api/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "No se pudo registrar"
      );
    }

    saveSession(data.token, data.user);

    return data;
  }

  function logout() {
    localStorage.removeItem("figuritas_token");
    localStorage.removeItem("figuritas_user");

    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: Boolean(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  return context;
}