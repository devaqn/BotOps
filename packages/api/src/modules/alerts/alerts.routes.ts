import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { parseOrThrow } from '../../middlewares/validate';
import { listAlertChannels, createWebhookChannel, createWhatsAppChannel, deleteAlertChannel } from './alerts.service';

const webhookSchema = z.object({ url: z.string().url() });

export async function alertsRoutes(app: FastifyInstance) {
  app.get('/alert-channels', { preHandler: authenticate }, async (request, reply) => {
    const channels = await listAlertChannels(request.userId);
    return reply.send(channels);
  });

  app.post('/alert-channels/webhook', { preHandler: authenticate }, async (request, reply) => {
    const { url } = parseOrThrow(webhookSchema, request.body);
    const channel = await createWebhookChannel(request.userId, url);
    return reply.status(201).send(channel);
  });

  app.post('/alert-channels/whatsapp', { preHandler: authenticate }, async (request, reply) => {
    const channel = await createWhatsAppChannel(request.userId);
    return reply.status(201).send(channel);
  });

  app.delete('/alert-channels/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteAlertChannel(request.userId, id);
    return reply.status(204).send();
  });
}
