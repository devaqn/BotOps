import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { registerErrorHandler } from './middlewares/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { whatsAppLinkRoutes } from './modules/whatsapp-link/whatsapp-link.routes';
import { botsRoutes } from './modules/bots/bots.routes';
import { heartbeatRoutes } from './modules/heartbeat/heartbeat.routes';
import { alertsRoutes } from './modules/alerts/alerts.routes';

export async function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'production'
        ? true
        : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } },
    trustProxy: true,
  });

  await app.register(helmet);
  // CORS liberado para qualquer origem no MVP — restrinja à origem do painel em produção.
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(jwt, {
    secret: { private: env.JWT_PRIVATE_KEY, public: env.JWT_PUBLIC_KEY },
    sign: { algorithm: 'RS256' },
  });

  registerErrorHandler(app);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(whatsAppLinkRoutes);
  await app.register(botsRoutes);
  await app.register(heartbeatRoutes);
  await app.register(alertsRoutes);

  return app;
}
