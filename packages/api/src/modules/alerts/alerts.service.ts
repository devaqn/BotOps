import { randomBytes, createHmac } from 'node:crypto';
import { AlertChannel, AlertKind, Bot, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { AppError } from '../../errors/AppError';
import { whatsapp } from '../../integrations/whatsapp';
import { getVerifiedPhoneForUser } from '../whatsapp-link/whatsapp-link.service';

interface WebhookConfig {
  url: string;
  hmacSecret: string;
}

export async function listAlertChannels(userId: string) {
  return prisma.alertChannel.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

export async function createWebhookChannel(userId: string, url: string) {
  const config: WebhookConfig = { url, hmacSecret: randomBytes(24).toString('hex') };
  return prisma.alertChannel.create({
    data: { userId, kind: 'WEBHOOK', config: config as unknown as Prisma.InputJsonValue },
  });
}

export async function createWhatsAppChannel(userId: string) {
  const phone = await getVerifiedPhoneForUser(userId);
  if (!phone) {
    throw AppError.conflict('Vincule seu número de WhatsApp antes de criar este canal');
  }
  return prisma.alertChannel.create({ data: { userId, kind: 'WHATSAPP', config: {} } });
}

export async function deleteAlertChannel(userId: string, channelId: string) {
  await prisma.alertChannel.deleteMany({ where: { id: channelId, userId } });
}

async function sendWebhookAlert(channel: AlertChannel, payload: Record<string, unknown>) {
  const config = channel.config as unknown as WebhookConfig;
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', config.hmacSecret).update(body).digest('hex');

  const response = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-BotOps-Signature': signature },
    body,
  });

  if (!response.ok) {
    logger.warn({ status: response.status, url: config.url }, 'Webhook de alerta retornou erro');
  }
}

export async function dispatchAlert(bot: Bot, kind: AlertKind, message: string) {
  const channels = await prisma.alertChannel.findMany({ where: { userId: bot.userId, enabled: true } });

  for (const channel of channels) {
    try {
      if (channel.kind === 'WEBHOOK') {
        await sendWebhookAlert(channel, {
          event: kind,
          bot: { id: bot.id, name: bot.name },
          message,
          sentAt: new Date().toISOString(),
        });
      } else if (channel.kind === 'WHATSAPP') {
        const phone = await getVerifiedPhoneForUser(bot.userId);
        if (phone) {
          const emoji = kind === 'DOWN' ? '🚨' : '✅';
          await whatsapp.sendMessage(phone, `${emoji} ${message}`);
        }
      }

      await prisma.alertEvent.create({ data: { botId: bot.id, channelId: channel.id, kind, message } });
    } catch (error) {
      logger.error({ err: error, channelId: channel.id, botId: bot.id }, 'Falha ao disparar alerta');
    }
  }
}
