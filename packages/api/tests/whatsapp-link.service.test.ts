import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const { findFirstMock, upsertMock, updateMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  upsertMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    whatsAppLink: {
      findFirst: findFirstMock,
      upsert: upsertMock,
      update: updateMock,
    },
  },
}));

import { generatePairingCode, confirmPairing } from '../src/modules/whatsapp-link/whatsapp-link.service';
import { AppError } from '../src/errors/AppError';

describe('generatePairingCode', () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    upsertMock.mockReset();
  });

  it('regenerates the code when it collides with another user\'s active code', async () => {
    findFirstMock
      .mockResolvedValueOnce({ id: 'other-link' })
      .mockResolvedValueOnce(null);
    upsertMock.mockResolvedValue({ pairingCode: '123456', pairingExpiresAt: new Date() });

    await generatePairingCode('user-1');

    expect(findFirstMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after exhausting retry attempts instead of creating a colliding code', async () => {
    findFirstMock.mockResolvedValue({ id: 'other-link' });

    await expect(generatePairingCode('user-1')).rejects.toThrow(AppError);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe('confirmPairing', () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    updateMock.mockReset();
  });

  it('returns null when no active pairing code matches', async () => {
    findFirstMock.mockResolvedValue(null);
    const result = await confirmPairing('000000', '+5581999998888');
    expect(result).toBeNull();
  });

  it('throws a 409 AppError when the phone is already linked to a different account', async () => {
    findFirstMock.mockResolvedValue({ id: 'link-1' });
    updateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`phoneE164`)', {
        code: 'P2002',
        clientVersion: 'test',
      })
    );

    await expect(confirmPairing('123456', '+5581999998888')).rejects.toMatchObject({ statusCode: 409 });
  });
});
