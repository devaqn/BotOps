import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey } from '../src/lib/apiKey';

describe('apiKey', () => {
  it('generates a key with the bop_ prefix and a matching hash', () => {
    const { raw, hash } = generateApiKey();
    expect(raw).toMatch(/^bop_[0-9a-f]{48}$/);
    expect(hash).toBe(hashApiKey(raw));
  });

  it('produces a different key on every call', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });

  it('hashing is deterministic for the same input', () => {
    const { raw } = generateApiKey();
    expect(hashApiKey(raw)).toBe(hashApiKey(raw));
  });
});
