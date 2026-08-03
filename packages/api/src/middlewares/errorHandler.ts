import { FastifyInstance, FastifyError } from 'fastify';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        details: error.details,
      });
    }

    if ('validation' in error && error.validation) {
      return reply.status(422).send({ error: 'Dados inválidos', details: error.validation });
    }

    if ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    logger.error({ err: error, url: request.url }, 'Erro não tratado');
    return reply.status(500).send({ error: 'Erro interno do servidor' });
  });
}
