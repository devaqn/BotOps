import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { generateApiKey } from '../../lib/apiKey';

export async function createBot(userId: string, input: { name: string; heartbeatIntervalSeconds?: number }) {
  const { raw, hash } = generateApiKey();

  const bot = await prisma.bot.create({
    data: {
      userId,
      name: input.name,
      apiKeyHash: hash,
      heartbeatIntervalSeconds: input.heartbeatIntervalSeconds ?? 60,
    },
  });

  return { bot, apiKey: raw };
}

export async function listBots(userId: string) {
  return prisma.bot.findMany({ where: { userId }, orderBy: { name: 'asc' } });
}

export async function getBot(userId: string, botId: string) {
  const bot = await prisma.bot.findFirst({
    where: { id: botId, userId },
    include: {
      heartbeatEvents: { orderBy: { receivedAt: 'desc' }, take: 20 },
      alertEvents: { orderBy: { sentAt: 'desc' }, take: 20 },
    },
  });
  if (!bot) throw AppError.notFound('Bot não encontrado');
  return bot;
}

export async function regenerateApiKey(userId: string, botId: string) {
  const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
  if (!bot) throw AppError.notFound('Bot não encontrado');

  const { raw, hash } = generateApiKey();
  await prisma.bot.update({ where: { id: bot.id }, data: { apiKeyHash: hash } });
  return raw;
}

export async function deleteBot(userId: string, botId: string) {
  const result = await prisma.bot.deleteMany({ where: { id: botId, userId } });
  if (result.count === 0) throw AppError.notFound('Bot não encontrado');
}
