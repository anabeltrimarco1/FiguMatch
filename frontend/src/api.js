import axios from "axios";

const API_URL = import.meta.env.DEV
  ? "http://localhost:4000"
  : "https://figumatch-production.up.railway.app";

const ACCESS_TOKEN_KEY = "figuritas_token";
const REFRESH_TOKEN_KEY = "figuritas_refresh_token";
const USER_KEY = "figuritas_user";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

let refreshPromise = null;

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  delete api.defaults.headers.common.Authorization;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function saveRefreshToken(refreshToken) {
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    return;
  }

  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearStoredSession() {
  setAuthToken(null);
  saveRefreshToken(null);
  localStorage.removeItem(USER_KEY);
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No hay refresh token disponible.");
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_URL}/api/auth/refresh`,
        { refreshToken },
        {
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      .then((response) => {
        const {
          accessToken,
          refreshToken: rotatedRefreshToken,
          user,
        } = response.data;

        if (!accessToken || !rotatedRefreshToken) {
          throw new Error(
            "La respuesta de renovación no contiene los tokens esperados.",
          );
        }

        setAuthToken(accessToken);
        saveRefreshToken(rotatedRefreshToken);

        if (user) {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        }

        window.dispatchEvent(
          new CustomEvent("figuritas:session-refreshed", {
            detail: {
              accessToken,
              refreshToken: rotatedRefreshToken,
              user: user || null,
            },
          }),
        );

        return accessToken;
      })
      .catch((error) => {
        clearStoredSession();

        window.dispatchEvent(
          new CustomEvent("figuritas:session-expired"),
        );

        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const errorCode = error.response?.data?.code;

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout");

    const tokenExpired =
      status === 401 &&
      (
        errorCode === "AUTH_TOKEN_EXPIRED" ||
        errorCode === "AUTH_TOKEN_INVALID" ||
        !errorCode
      );

    if (
      tokenExpired &&
      !isAuthEndpoint &&
      !originalRequest?._retry &&
      getRefreshToken()
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

const savedToken = getAccessToken();

if (savedToken) {
  setAuthToken(savedToken);
}

export { API_URL };
export default api;
