import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseOrThrow } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { AppError } from '../../errors/AppError';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import {
  registerUser,
  validateCredentials,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from './auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const body = parseOrThrow(registerSchema, request.body);
    const user = await registerUser(body);
    const accessToken = app.jwt.sign({ sub: user.id }, { expiresIn: env.JWT_ACCESS_EXPIRES });
    const refreshToken = await issueRefreshToken(user.id);
    return reply.status(201).send({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });

  app.post('/auth/login', async (request, reply) => {
    const body = parseOrThrow(loginSchema, request.body);
    const user = await validateCredentials(body.email, body.password);
    const accessToken = app.jwt.sign({ sub: user.id }, { expiresIn: env.JWT_ACCESS_EXPIRES });
    const refreshToken = await issueRefreshToken(user.id);
    return reply.send({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = parseOrThrow(refreshSchema, request.body);
    const { userId, refreshToken } = await rotateRefreshToken(body.refreshToken);
    const accessToken = app.jwt.sign({ sub: userId }, { expiresIn: env.JWT_ACCESS_EXPIRES });
    return reply.send({ accessToken, refreshToken });
  });

  app.post('/auth/logout', async (request, reply) => {
    const body = parseOrThrow(refreshSchema, request.body);
    await revokeRefreshToken(body.refreshToken);
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.userId } });
    if (!user) throw AppError.notFound('Usuário não encontrado');
    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });
  });
}
