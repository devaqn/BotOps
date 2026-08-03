import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

process.env.NODE_ENV = 'test';
process.env.APP_BASE_URL ||= 'http://localhost:4000';
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_PRIVATE_KEY ||= privateKey;
process.env.JWT_PUBLIC_KEY ||= publicKey;
process.env.WHATSAPP_ENABLED = 'false';
