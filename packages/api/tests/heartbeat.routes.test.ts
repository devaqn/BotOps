import { describe, it, expect, vi, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    bot: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

import { buildApp } from '../src/app';

describe('POST /v1/heartbeat', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app?.close();
  });

  it('rejects requests without an X-Api-Key header', async () => {
    app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/heartbeat',
      payload: { status: 'OK' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects requests with an unknown API key', async () => {
    app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/heartbeat',
      headers: { 'x-api-key': 'bop_does-not-exist' },
      payload: { status: 'OK' },
    });
    expect(response.statusCode).toBe(401);
  });
});
