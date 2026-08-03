import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    botId: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}
