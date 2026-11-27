import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('GET /api/v1/health', () => {
  it('should return status ok', async () => {
    const server = await buildApp();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();

    await server.close();
  });
});
