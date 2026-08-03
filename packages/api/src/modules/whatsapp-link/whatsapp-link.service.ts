import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';

const PAIRING_CODE_TTL_MINUTES = 15;
const MAX_CODE_GENERATION_ATTEMPTS = 10;

function generateCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

// Um código de 6 dígitos tem só 1 milhão de combinações — com usuários o bastante
// gerando código ao mesmo tempo, duas pessoas podem colidir no mesmo código, e o
// confirmPairing() (que usa findFirst) vincularia o número a uma conta arbitrária
// entre as duas. Verificamos colisão contra códigos de OUTROS usuários antes de
// aceitar o código gerado.
async function generateUniqueCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
    const code = generateCode();
    const collision = await prisma.whatsAppLink.findFirst({
      where: { pairingCode: code, pairingExpiresAt: { gt: new Date() }, userId: { not: userId } },
    });
    if (!collision) return code;
  }
  throw new AppError('Não foi possível gerar um código de pareamento único. Tente novamente.', 500);
}

export async function generatePairingCode(userId: string) {
  const pairingCode = await generateUniqueCode(userId);
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

  try {
    return await prisma.whatsAppLink.update({
      where: { id: link.id },
      data: { phoneE164, verifiedAt: new Date() },
    });
  } catch (error) {
    // P2002 = violação do @unique em phoneE164: esse número já está vinculado a outra conta.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('Esse número de WhatsApp já está vinculado a outra conta.');
    }
    throw error;
  }
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
