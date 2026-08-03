import { ZodSchema, z } from 'zod';
import { AppError } from '../errors/AppError';

export function parseOrThrow<S extends ZodSchema>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw AppError.unprocessable('Dados inválidos', result.error.flatten().fieldErrors);
  }
  return result.data;
}
