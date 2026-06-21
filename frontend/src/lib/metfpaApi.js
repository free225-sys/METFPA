import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const METFPA_API = `${BACKEND_URL}/api/metfpa`;
const TOKEN_KEY = "metfpa_token";

const metfpaApi = axios.create({ baseURL: METFPA_API });

metfpaApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

metfpaApi.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    if (status === 401 && !url.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default metfpaApi;
