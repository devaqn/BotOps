import { env } from '../../config/env';
import { stubAdapter } from './stub.adapter';
import { baileysAdapter } from './baileys.adapter';
import { WhatsAppAdapter } from './whatsapp.types';

export const whatsapp: WhatsAppAdapter = env.WHATSAPP_ENABLED ? baileysAdapter : stubAdapter;
export { stubAdapter };
export * from './whatsapp.types';
