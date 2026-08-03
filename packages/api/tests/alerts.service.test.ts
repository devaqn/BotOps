import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

const { findManyMock, createMock, sendMessageMock, getVerifiedPhoneForUserMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  createMock: vi.fn(),
  sendMessageMock: vi.fn(),
  getVerifiedPhoneForUserMock: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    alertChannel: { findMany: (...args: unknown[]) => findManyMock(...args) },
    alertEvent: { create: (...args: unknown[]) => createMock(...args) },
  },
}));

vi.mock('../src/integrations/whatsapp', () => ({
  whatsapp: { sendMessage: sendMessageMock },
}));

vi.mock('../src/modules/whatsapp-link/whatsapp-link.service', () => ({
  getVerifiedPhoneForUser: getVerifiedPhoneForUserMock,
}));

import { dispatchAlert } from '../src/modules/alerts/alerts.service';

const bot = { id: 'bot-1', userId: 'user-1', name: 'Meu Bot' } as any;

describe('dispatchAlert', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    findManyMock.mockReset();
    createMock.mockReset();
    sendMessageMock.mockReset();
    getVerifiedPhoneForUserMock.mockReset();
  });

  it('sends a signed webhook payload for WEBHOOK channels', async () => {
    const hmacSecret = 'test-secret';
    findManyMock.mockResolvedValue([
      { id: 'chan-1', kind: 'WEBHOOK', config: { url: 'https://example.com/hook', hmacSecret } },
    ]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await dispatchAlert(bot, 'DOWN', 'Meu Bot caiu');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.com/hook');

    const expectedSignature = createHmac('sha256', hmacSecret).update(init.body as string).digest('hex');
    expect(init.headers['X-BotOps-Signature']).toBe(expectedSignature);

    const payload = JSON.parse(init.body as string);
    expect(payload).toMatchObject({
      event: 'DOWN',
      bot: { id: 'bot-1', name: 'Meu Bot' },
      message: 'Meu Bot caiu',
    });

    expect(createMock).toHaveBeenCalledWith({
      data: { botId: 'bot-1', channelId: 'chan-1', kind: 'DOWN', message: 'Meu Bot caiu' },
    });
  });

  it('sends a WhatsApp message when the user has a verified phone', async () => {
    findManyMock.mockResolvedValue([{ id: 'chan-2', kind: 'WHATSAPP', config: {} }]);
    getVerifiedPhoneForUserMock.mockResolvedValue('+5581999998888');

    await dispatchAlert(bot, 'RECOVERED', 'Meu Bot voltou');

    expect(sendMessageMock).toHaveBeenCalledWith('+5581999998888', expect.stringContaining('Meu Bot voltou'));
    expect(createMock).toHaveBeenCalledWith({
      data: { botId: 'bot-1', channelId: 'chan-2', kind: 'RECOVERED', message: 'Meu Bot voltou' },
    });
  });

  it('skips the WhatsApp channel silently when no phone is linked yet', async () => {
    findManyMock.mockResolvedValue([{ id: 'chan-3', kind: 'WHATSAPP', config: {} }]);
    getVerifiedPhoneForUserMock.mockResolvedValue(null);

    await dispatchAlert(bot, 'DOWN', 'Meu Bot caiu');

    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalled();
  });
});
