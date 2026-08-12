import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findUniqueOrThrowMock, updateManyMock, createMock } = vi.hoisted(() => ({
  findUniqueOrThrowMock: vi.fn(),
  updateManyMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    refreshToken: {
      findUniqueOrThrow: findUniqueOrThrowMock,
      updateMany: updateManyMock,
      create: createMock,
    },
  },
}));

import { rotateRefreshToken } from '../src/modules/auth/auth.service';

describe('rotateRefreshToken', () => {
  beforeEach(() => {
    findUniqueOrThrowMock.mockReset();
    updateManyMock.mockReset();
    createMock.mockReset();
    createMock.mockResolvedValue({});
  });

  it('rotates a valid, unrevoked token and issues a new one', async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findUniqueOrThrowMock.mockResolvedValue({ id: 't1', userId: 'user-1', revokedAt: new Date() });

    const result = await rotateRefreshToken('raw-token');

    expect(result.userId).toBe('user-1');
    expect(result.refreshToken).toEqual(expect.any(String));
    // A checagem (revokedAt: null) precisa estar no WHERE do updateMany — é isso
    // que torna check+revoke atômico.
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tokenHash: expect.any(String), revokedAt: null }),
        data: { revokedAt: expect.any(Date) },
      })
    );
  });

  it('rejects a token that does not exist', async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(rotateRefreshToken('bogus-token')).rejects.toMatchObject({ statusCode: 401 });
    expect(findUniqueOrThrowMock).not.toHaveBeenCalled();
  });

  // Regressão central: reusar um refresh token que já foi rotacionado (ex.: token
  // roubado sendo reaproveitado depois que o dono legítimo já rotacionou) precisa
  // ser rejeitado — é essa checagem que impede replay.
  it('rejects reusing a token that was already rotated/revoked', async () => {
    // updateMany com revokedAt: null no WHERE não casa nenhuma linha quando o
    // token já está revogado — é exatamente esse comportamento que o mock simula.
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(rotateRefreshToken('already-used-token')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects an expired token', async () => {
    // expiresAt: { gte: now } no WHERE também não casa uma linha expirada.
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(rotateRefreshToken('expired-token')).rejects.toMatchObject({ statusCode: 401 });
  });
});
