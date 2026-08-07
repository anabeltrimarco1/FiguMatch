import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  API_URL,
  clearStoredSession,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  saveRefreshToken,
  setAuthToken,
} from "../api";

import {
  connectSocket,
  disconnectSocket,
  reconnectSocket,
} from "../socket";

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "figuritas_token";
const REFRESH_TOKEN_KEY = "figuritas_refresh_token";
const USER_KEY = "figuritas_user";

function parseStoredUser() {
  const savedUser = localStorage.getItem(USER_KEY);

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    console.error("Usuario guardado inválido:", error);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(parseStoredUser);
  const [token, setToken] = useState(getAccessToken);
  const [loading, setLoading] = useState(true);

  function saveSession(sessionData) {
    const accessToken =
      sessionData.accessToken || sessionData.token;

    const refreshToken =
      sessionData.refreshToken || getRefreshToken();

    const sessionUser =
      sessionData.user || user;

    if (!accessToken || !sessionUser) {
      throw new Error(
        "La respuesta del servidor no contiene una sesión válida.",
      );
    }

    setAuthToken(accessToken);
    setToken(accessToken);

    if (refreshToken) {
      saveRefreshToken(refreshToken);
    }

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(sessionUser),
    );

    setUser(sessionUser);

    connectSocket(accessToken);
  }

  function updateUser(updatedUser) {
    if (!updatedUser) {
      return;
    }

    const mergedUser = {
      ...(user || {}),
      ...updatedUser,
    };

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(mergedUser),
    );

    setUser(mergedUser);
  }

  function clearSession() {
    disconnectSocket();
    clearStoredSession();

    setToken(null);
    setUser(null);

    window.dispatchEvent(
      new CustomEvent("figuritas:logout-complete"),
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const savedAccessToken =
        localStorage.getItem(ACCESS_TOKEN_KEY);

      const savedRefreshToken =
        localStorage.getItem(REFRESH_TOKEN_KEY);

      const savedUser =
        parseStoredUser();

      if (savedUser && isMounted) {
        setUser(savedUser);
      }

      if (savedAccessToken) {
        setAuthToken(savedAccessToken);
        connectSocket(savedAccessToken);

        if (isMounted) {
          setToken(savedAccessToken);
        }
      }

      if (savedRefreshToken) {
        try {
          const newAccessToken =
            await refreshAccessToken();

          reconnectSocket(newAccessToken);

          if (isMounted) {
            setToken(newAccessToken);
            setUser(parseStoredUser());
          }
        } catch (error) {
          console.error(
            "No se pudo restaurar la sesión:",
            error,
          );

          if (isMounted) {
            clearSession();
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    restoreSession();

    function handleSessionRefreshed(event) {
      const refreshedAccessToken =
        event.detail?.accessToken;

      const refreshedUser =
        event.detail?.user ||
        parseStoredUser();

      if (refreshedAccessToken) {
        setToken(refreshedAccessToken);
        reconnectSocket(refreshedAccessToken);
      }

      if (refreshedUser) {
        setUser(refreshedUser);
      }
    }

    function handleSessionExpired() {
      clearSession();
    }

    window.addEventListener(
      "figuritas:session-refreshed",
      handleSessionRefreshed,
    );

    window.addEventListener(
      "figuritas:session-expired",
      handleSessionExpired,
    );

    return () => {
      isMounted = false;

      window.removeEventListener(
        "figuritas:session-refreshed",
        handleSessionRefreshed,
      );

      window.removeEventListener(
        "figuritas:session-expired",
        handleSessionExpired,
      );
    };
  }, []);

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
            username: String(username || "").trim(),
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "No se pudo iniciar sesión.",
        );
      }

      saveSession(data);

      return data;
    } catch (error) {
      console.error("ERROR LOGIN:", error);
      throw error;
    }
  }

  async function register(username, email, password) {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: String(username || "").trim(),
            email: String(email || "").trim(),
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "No se pudo registrar.",
        );
      }

      saveSession(data);

      return data;
    } catch (error) {
      console.error("ERROR REGISTER:", error);
      throw error;
    }
  }

  async function logout() {
    const refreshToken =
      getRefreshToken();

    clearSession();

    if (!refreshToken) {
      return;
    }

    try {
      await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken,
          }),
          keepalive: true,
        },
      );
    } catch (error) {
      console.error(
        "No se pudo informar el logout al backend:",
        error,
      );
    }
  }

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      updateUser,
      isAuthenticated: Boolean(token && user),
    }),
    [
      user,
      token,
      loading,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider",
    );
  }

  return context;
}