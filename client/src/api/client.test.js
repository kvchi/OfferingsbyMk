import { beforeEach, describe, expect, it } from 'vitest';
import api, { API_BASE_URL, normalizeApiBaseUrl } from './client';

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
});
