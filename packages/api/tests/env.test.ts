import { describe, it, expect, vi, afterEach } from 'vitest';

describe('env WHATSAPP_ENABLED parsing', () => {
  const originalValue = process.env.WHATSAPP_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) delete process.env.WHATSAPP_ENABLED;
    else process.env.WHATSAPP_ENABLED = originalValue;
    vi.resetModules();
  });

  // Regressão: z.coerce.boolean() faz Boolean(str) por baixo dos panos, e
  // Boolean("false") é `true` em JS — qualquer string não-vazia é truthy.
  it('parses the string "false" as boolean false', async () => {
    process.env.WHATSAPP_ENABLED = 'false';
    vi.resetModules();
    const { env } = await import('../src/config/env');
    expect(env.WHATSAPP_ENABLED).toBe(false);
  });

  it('parses the string "true" as boolean true', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    vi.resetModules();
    const { env } = await import('../src/config/env');
    expect(env.WHATSAPP_ENABLED).toBe(true);
  });

  it('defaults to true when unset', async () => {
    delete process.env.WHATSAPP_ENABLED;
    vi.resetModules();
    const { env } = await import('../src/config/env');
    expect(env.WHATSAPP_ENABLED).toBe(true);
  });
});
