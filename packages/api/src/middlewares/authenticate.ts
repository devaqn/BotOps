import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors/AppError';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw AppError.unauthorized('Token inválido ou expirado');
  }
  request.userId = request.user.sub;
}
