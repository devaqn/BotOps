export function isBotDown(
  lastHeartbeatAt: Date | null,
  heartbeatIntervalSeconds: number,
  graceMultiplier: number,
  now: Date = new Date()
): boolean {
  if (!lastHeartbeatAt) {
    // Bot ainda não mandou nenhum heartbeat — está "não configurado", não "caído".
    return false;
  }
  const deadline = lastHeartbeatAt.getTime() + heartbeatIntervalSeconds * graceMultiplier * 1000;
  return now.getTime() > deadline;
}
