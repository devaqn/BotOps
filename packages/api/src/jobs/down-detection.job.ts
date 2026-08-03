import cron from 'node-cron';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { runDownDetection } from '../modules/heartbeat/heartbeat.service';

export function scheduleDownDetectionJob() {
  cron.schedule(
    env.DOWN_DETECTION_CRON,
    async () => {
      try {
        await runDownDetection();
      } catch (error) {
        logger.error({ err: error }, '[job] falha na detecção de queda');
      }
    },
    { timezone: env.CRON_TZ }
  );
}
