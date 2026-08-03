import { logger } from '../../lib/logger';
import { IncomingMessage, WhatsAppAdapter } from './whatsapp.types';

class StubAdapter implements WhatsAppAdapter {
  private handler: ((message: IncomingMessage) => void | Promise<void>) | null = null;

  async start() {
    logger.info('[whatsapp:stub] adapter iniciado — mensagens só serão logadas no console.');
  }

  async sendMessage(phoneE164: string, text: string) {
    logger.info({ phoneE164, text }, '[whatsapp:stub] mensagem simulada enviada');
  }

  onMessage(handler: (message: IncomingMessage) => void | Promise<void>) {
    this.handler = handler;
  }

  async simulateIncoming(phoneE164: string, text: string) {
    if (this.handler) {
      await this.handler({ phoneE164, text });
    }
  }
}

export const stubAdapter = new StubAdapter();
