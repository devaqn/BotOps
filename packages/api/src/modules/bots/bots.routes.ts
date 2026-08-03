import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { parseOrThrow } from '../../middlewares/validate';
import { createBot, listBots, getBot, regenerateApiKey, deleteBot } from './bots.service';

const createBotSchema = z.object({
  name: z.string().min(2),
  heartbeatIntervalSeconds: z.number().int().min(10).max(86400).optional(),
});

export async function botsRoutes(app: FastifyInstance) {
  app.post('/bots', { preHandler: authenticate }, async (request, reply) => {
    const body = parseOrThrow(createBotSchema, request.body);
    const { bot, apiKey } = await createBot(request.userId, body);
    return reply.status(201).send({ ...bot, apiKey });
  });

  app.get('/bots', { preHandler: authenticate }, async (request, reply) => {
    const bots = await listBots(request.userId);
    return reply.send(bots);
  });

  app.get('/bots/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const bot = await getBot(request.userId, id);
    return reply.send(bot);
  });

  app.post('/bots/:id/regenerate-key', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const apiKey = await regenerateApiKey(request.userId, id);
    return reply.send({ apiKey });
  });

  app.delete('/bots/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteBot(request.userId, id);
    return reply.status(204).send();
  });
}
