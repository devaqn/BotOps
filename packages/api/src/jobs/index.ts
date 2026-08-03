import { scheduleDownDetectionJob } from './down-detection.job';

export function startScheduledJobs() {
  scheduleDownDetectionJob();
}
