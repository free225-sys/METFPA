import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const METFPA_API = `${BACKEND_URL}/api/metfpa`;

const metfpaApi = axios.create({ baseURL: METFPA_API });
metfpaApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("pnd_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default metfpaApi;
