import { randomBytes, createHash } from 'node:crypto';

const API_KEY_PREFIX = 'bop_';
const API_KEY_BYTES = 24;

export function generateApiKey() {
  const raw = `${API_KEY_PREFIX}${randomBytes(API_KEY_BYTES).toString('hex')}`;
  return { raw, hash: hashApiKey(raw) };
}

export function hashApiKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}
