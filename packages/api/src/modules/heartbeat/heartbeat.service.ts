import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { dispatchAlert } from '../alerts/alerts.service';
import { isBotDown } from './down-detection';

export interface HeartbeatInput {
  status: 'OK' | 'ERROR';
  uptimeSeconds?: number;
  errorCount?: number;
  lastError?: string;
  metadata?: Record<string, unknown>;
}

export async function recordHeartbeat(botId: string, input: HeartbeatInput) {
  const bot = await prisma.bot.findUniqueOrThrow({ where: { id: botId } });
  const wasOffline = bot.status === 'OFFLINE';

  await prisma.heartbeatEvent.create({
    data: {
      botId,
      status: input.status,
      uptimeSeconds: input.uptimeSeconds,
      errorCount: input.errorCount,
      lastError: input.lastError,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  await prisma.bot.update({
    where: { id: botId },
    data: {
      status: input.status === 'OK' ? 'ONLINE' : 'DEGRADED',
      lastHeartbeatAt: new Date(),
    },
  });

  if (wasOffline) {
    await dispatchAlert(bot, 'RECOVERED', `"${bot.name}" voltou a mandar heartbeat.`);
  }
}

export async function runDownDetection() {
  const bots = await prisma.bot.findMany({ where: { status: { in: ['ONLINE', 'DEGRADED'] } } });
  const now = new Date();

  for (const bot of bots) {
    const down = isBotDown(bot.lastHeartbeatAt, bot.heartbeatIntervalSeconds, env.HEARTBEAT_GRACE_MULTIPLIER, now);
    if (!down) continue;

    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'OFFLINE' } });

    const missedFor = bot.heartbeatIntervalSeconds * env.HEARTBEAT_GRACE_MULTIPLIER;
    try {
      await dispatchAlert(bot, 'DOWN', `"${bot.name}" está sem heartbeat há mais de ${missedFor}s.`);
    } catch (error) {
      logger.error({ err: error, botId: bot.id }, 'Falha ao disparar alerta de queda');
    }
  }
}
