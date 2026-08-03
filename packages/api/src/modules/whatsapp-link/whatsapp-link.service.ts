import { randomInt } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';

const PAIRING_CODE_TTL_MINUTES = 15;

function generateCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function generatePairingCode(userId: string) {
  const pairingCode = generateCode();
  const pairingExpiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MINUTES * 60 * 1000);

  const link = await prisma.whatsAppLink.upsert({
    where: { userId },
    update: { pairingCode, pairingExpiresAt },
    create: { userId, pairingCode, pairingExpiresAt },
  });

  return { pairingCode: link.pairingCode, expiresAt: link.pairingExpiresAt };
}

export async function confirmPairing(rawCode: string, phoneE164: string) {
  const code = rawCode.trim();
  const link = await prisma.whatsAppLink.findFirst({
    where: { pairingCode: code, pairingExpiresAt: { gt: new Date() } },
  });

  if (!link) {
    return null;
  }

  return prisma.whatsAppLink.update({
    where: { id: link.id },
    data: { phoneE164, verifiedAt: new Date() },
  });
}

export async function getLinkStatus(userId: string) {
  const link = await prisma.whatsAppLink.findUnique({ where: { userId } });
  if (!link) {
    throw AppError.notFound('Nenhum código gerado ainda');
  }
  return {
    linked: Boolean(link.verifiedAt),
    phoneE164: link.verifiedAt ? link.phoneE164 : null,
  };
}

export async function getVerifiedPhoneForUser(userId: string) {
  const link = await prisma.whatsAppLink.findUnique({ where: { userId } });
  return link?.verifiedAt ? link.phoneE164 : null;
}
