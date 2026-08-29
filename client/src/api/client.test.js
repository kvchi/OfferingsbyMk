import { beforeEach, describe, expect, it, vi } from 'vitest';
import api, { API_BASE_URL, AUTH_UNAUTHORIZED_EVENT, normalizeApiBaseUrl } from './client';

describe('API client configuration', () => {
  beforeEach(() => localStorage.clear());

  it('normalizes configured URLs and provides the local default', () => {
    expect(normalizeApiBaseUrl('https://api.example.com///')).toBe('https://api.example.com');
    expect(normalizeApiBaseUrl('')).toBe('http://localhost:4000');
    expect(API_BASE_URL).toBe('http://localhost:4000');
  });

  it('attaches a Bearer token to configured API requests', async () => {
    localStorage.setItem('token', 'header.payload.signature');
    let request;

    await api.get('/api/auth/me', {
      adapter: async (config) => {
        request = config;
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
      },
    });

    expect(request.headers.Authorization).toBe('Bearer header.payload.signature');
  });

  it('does not attach authentication to an unrelated origin', async () => {
    localStorage.setItem('token', 'header.payload.signature');
    let request;

    await api.get('https://unrelated.example/resource', {
      adapter: async (config) => {
        request = config;
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
      },
    });

    expect(request.headers.Authorization).toBeUndefined();
  });

  it('clears rejected authentication and announces an API 401', async () => {
    localStorage.setItem('token', 'expired.token.value');
    localStorage.setItem('user', JSON.stringify({ id: 'user-1' }));
    const unauthorizedListener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, unauthorizedListener, { once: true });

    await expect(api.get('/api/checkout/preview', {
      adapter: async (config) => Promise.reject({
        config,
        response: { status: 401, data: { error: true } },
      }),
    })).rejects.toMatchObject({ response: { status: 401 } });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(unauthorizedListener).toHaveBeenCalledTimes(1);
  });
});
