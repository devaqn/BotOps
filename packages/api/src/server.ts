import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { startWhatsAppBot } from './modules/whatsapp-link/whatsapp-link.bot';
import { startScheduledJobs } from './jobs';

async function main() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info(`BotOps API rodando em ${env.APP_BASE_URL}`);

  startWhatsAppBot().catch((error) => logger.error({ err: error }, 'Falha ao iniciar o bot do WhatsApp'));
  startScheduledJobs();
}

main().catch((error) => {
  logger.error({ err: error }, 'Falha ao iniciar o servidor');
  process.exit(1);
});
