import axios from "axios";

console.log("API.JS CARGADO");

const API_URL = import.meta.env.DEV
  ? "http://localhost:4000"
  : "https://figumatch-production.up.railway.app";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("figuritas_token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("figuritas_token");
  }
}

const savedToken = localStorage.getItem("figuritas_token");

if (savedToken) {
  setAuthToken(savedToken);
}

export default api;