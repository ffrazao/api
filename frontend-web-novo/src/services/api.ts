import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from './authService';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8081/api';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

/**
 * Request Interceptor:
 * Automatically injects Keycloak JWT Token and Active Context Headers:
 * - Authorization: Bearer <token>
 * - X-Current-Tenant: <activeOrganization.id>
 * - X-Current-Role: <activeRole.code>
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { token, activeOrganization, activeRole } = useAuthStore.getState();

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    if (activeOrganization) {
      config.headers.set('X-Current-Tenant', activeOrganization.id || activeOrganization.code);
    }

    if (activeRole) {
      config.headers.set('X-Current-Role', activeRole.code);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor:
 * Handles 401 (Unauthorized) with automatic Silent Refresh retry, and 403 (Multi-tenant Security Violation).
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      console.warn('[API Interceptor] Token expirado (401). Executando Silent Refresh...');
      const refreshed = await authService.refreshToken();

      if (refreshed) {
        const { token } = useAuthStore.getState();
        if (token) {
          originalRequest.headers.set('Authorization', `Bearer ${token}`);
        }
        return api(originalRequest);
      }
    } else if (error.response && error.response.status === 403) {
      console.error(
        '[API Interceptor] Acesso negado (403): Violação de isolamento multi-tenant ou permissão insuficiente.',
        error.response.data
      );
    }

    return Promise.reject(error);
  }
);

export default api;