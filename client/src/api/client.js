import axios from 'axios';

const LOCAL_API_URL = 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 10000;

export const normalizeApiBaseUrl = (value = import.meta.env.VITE_API_URL) =>
  (value || LOCAL_API_URL).trim().replace(/\/+$/, '');

export const API_BASE_URL = normalizeApiBaseUrl();
export const AUTH_UNAUTHORIZED_EVENT = 'shopsphare:auth-unauthorized';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

const isApiRequest = (config) => {
  const requestUrl = new URL(config.url || '', config.baseURL || API_BASE_URL);
  return requestUrl.origin === new URL(API_BASE_URL).origin;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token && isApiRequest(config)) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && isApiRequest(error.config || {})) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

export default api;
