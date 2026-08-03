import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { AppError } from '../errors/AppError';
import { hashApiKey } from '../lib/apiKey';

export async function authenticateBot(request: FastifyRequest, _reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'];
  if (!apiKey || Array.isArray(apiKey)) {
    throw AppError.unauthorized('Cabeçalho X-Api-Key ausente');
  }

  const bot = await prisma.bot.findUnique({ where: { apiKeyHash: hashApiKey(apiKey) } });
  if (!bot) {
    throw AppError.unauthorized('API key inválida');
  }

  request.botId = bot.id;
}
