import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Nome não pode ser BASE_URL — Vite/Vitest reserva esse nome e injeta seu próprio
  // valor ("/") em process.env, o que quebraria a validação de URL aqui.
  APP_BASE_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),

  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY é obrigatório — rode npm run keys:generate'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY é obrigatório — rode npm run keys:generate'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(30),

  WHATSAPP_ENABLED: z.coerce.boolean().default(true),
  WHATSAPP_SESSION_DIR: z.string().default('./whatsapp-sessions'),

  HEARTBEAT_GRACE_MULTIPLIER: z.coerce.number().default(3),
  DOWN_DETECTION_CRON: z.string().default('* * * * *'),
  CRON_TZ: z.string().default('America/Recife'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
