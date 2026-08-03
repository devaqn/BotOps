const { generateKeyPairSync } = require('node:crypto');

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const toEnvValue = (pem) => JSON.stringify(pem);

console.log('Cole estas linhas no seu packages/api/.env:\n');
console.log(`JWT_PRIVATE_KEY=${toEnvValue(privateKey)}`);
console.log(`JWT_PUBLIC_KEY=${toEnvValue(publicKey)}`);
