import makeWASocket, { DisconnectReason, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { IncomingMessage, WhatsAppAdapter } from './whatsapp.types';

function jidToPhoneE164(jid?: string | null): string | null {
  if (!jid) return null;
  const digits = jid.split('@')[0].replace(/\D/g, '');
  return digits ? `+${digits}` : null;
}

class BaileysAdapter implements WhatsAppAdapter {
  private socket: WASocket | null = null;
  private handler: ((message: IncomingMessage) => void | Promise<void>) | null = null;

  async start() {
    const { state, saveCreds } = await useMultiFileAuthState(env.WHATSAPP_SESSION_DIR);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: logger.child({ module: 'baileys' }) as any,
    });
    this.socket = socket;

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('Escaneie o QR Code abaixo no WhatsApp (Aparelhos conectados):');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        logger.warn({ statusCode, shouldReconnect }, 'Conexão do WhatsApp encerrada');
        if (shouldReconnect) {
          // Espera um pouco antes de tentar de novo — sem isso, uma falha de conexão
          // persistente (credencial ruim, rede instável) vira um loop de reconexão em
          // sequência rápida, hostil com o servidor do WhatsApp.
          setTimeout(() => {
            this.start().catch((error) => logger.error({ err: error }, 'Falha ao reconectar ao WhatsApp'));
          }, 3000);
        }
      } else if (connection === 'open') {
        logger.info('WhatsApp conectado.');
      }
    });

    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const message of messages) {
        if (message.key.fromMe) continue;

        const phoneE164 = jidToPhoneE164(message.key.remoteJid);
        const text = message.message?.conversation ?? message.message?.extendedTextMessage?.text ?? '';
        if (!phoneE164 || !text) continue;

        if (this.handler) {
          try {
            await this.handler({ phoneE164, text });
          } catch (error) {
            logger.error({ err: error }, 'Erro ao processar mensagem recebida do WhatsApp');
          }
        }
      }
    });
  }

  async sendMessage(phoneE164: string, text: string) {
    if (!this.socket) {
      throw new Error('WhatsApp adapter ainda não conectado');
    }
    const jid = `${phoneE164.replace(/\D/g, '')}@s.whatsapp.net`;
    await this.socket.sendMessage(jid, { text });
  }

  onMessage(handler: (message: IncomingMessage) => void | Promise<void>) {
    this.handler = handler;
  }
}

export const baileysAdapter = new BaileysAdapter();
