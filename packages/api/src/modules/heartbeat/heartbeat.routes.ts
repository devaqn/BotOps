import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateBot } from '../../middlewares/authenticateBot';
import { parseOrThrow } from '../../middlewares/validate';
import { recordHeartbeat } from './heartbeat.service';

const heartbeatSchema = z.object({
  status: z.enum(['OK', 'ERROR']),
  uptimeSeconds: z.number().int().nonnegative().optional(),
  errorCount: z.number().int().nonnegative().optional(),
  lastError: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function heartbeatRoutes(app: FastifyInstance) {
  app.post('/v1/heartbeat', { preHandler: authenticateBot }, async (request, reply) => {
    const body = parseOrThrow(heartbeatSchema, request.body);
    await recordHeartbeat(request.botId, body);
    return reply.send({ received: true });
  });
}
