import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/authenticate';
import { generatePairingCode, getLinkStatus } from './whatsapp-link.service';

export async function whatsAppLinkRoutes(app: FastifyInstance) {
  app.post('/whatsapp-link/code', { preHandler: authenticate }, async (request, reply) => {
    const { pairingCode, expiresAt } = await generatePairingCode(request.userId);
    return reply.send({
      pairingCode,
      expiresAt,
      instructions: `Envie "vincular ${pairingCode}" para o número do bot no WhatsApp em até 15 minutos.`,
    });
  });

  app.get('/whatsapp-link/status', { preHandler: authenticate }, async (request, reply) => {
    const status = await getLinkStatus(request.userId);
    return reply.send(status);
  });
}
