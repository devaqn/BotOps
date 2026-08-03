import { logger } from '../../lib/logger';
import { AppError } from '../../errors/AppError';
import { whatsapp, IncomingMessage } from '../../integrations/whatsapp';
import { confirmPairing } from './whatsapp-link.service';

export async function routeIncomingMessage(message: IncomingMessage) {
  const match = message.text.trim().match(/^vincular\s+(\d{6})/i);

  if (!match) {
    await whatsapp.sendMessage(
      message.phoneE164,
      'Oi! Eu só sei responder ao comando "vincular <código>" — gere o código no painel do BotOps para receber alertas aqui.'
    );
    return;
  }

  let link;
  try {
    link = await confirmPairing(match[1], message.phoneE164);
  } catch (error) {
    const text =
      error instanceof AppError ? error.message : 'Não consegui vincular seu número agora. Tenta de novo em instantes.';
    logger.error({ err: error, phoneE164: message.phoneE164 }, 'Falha ao confirmar pareamento do WhatsApp');
    await whatsapp.sendMessage(message.phoneE164, `❌ ${text}`);
    return;
  }

  if (!link) {
    await whatsapp.sendMessage(message.phoneE164, '❌ Código inválido ou expirado. Gere um novo no painel.');
    return;
  }

  await whatsapp.sendMessage(
    message.phoneE164,
    '✅ Número vinculado! A partir de agora você recebe por aqui os alertas dos seus bots.'
  );
}

export function startWhatsAppBot() {
  whatsapp.onMessage(routeIncomingMessage);
  return whatsapp.start();
}
