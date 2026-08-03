export type HeartbeatStatus = 'OK' | 'ERROR';

export interface HeartbeatPayload {
  status: HeartbeatStatus;
  uptimeSeconds?: number;
  errorCount?: number;
  lastError?: string;
  metadata?: Record<string, unknown>;
}

export interface BotOpsAgentOptions {
  /** API key gerada ao criar o bot no painel do BotOps. */
  apiKey: string;
  /** URL base da API do BotOps. Default: https://api.botops.dev */
  baseUrl?: string;
  /** Intervalo entre heartbeats, em segundos. Deve bater com o configurado no painel. */
  intervalSeconds?: number;
  /** Chamado quando um heartbeat falha (rede fora do ar, API retornando erro etc). */
  onError?: (error: unknown) => void;
}

export class BotOpsAgent {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly intervalMs: number;
  private readonly onError?: (error: unknown) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = Date.now();
  private errorCount = 0;
  private lastError: string | undefined;

  constructor(options: BotOpsAgentOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://api.botops.dev';
    this.intervalMs = (options.intervalSeconds ?? 60) * 1000;
    this.onError = options.onError;
  }

  /** Manda o primeiro heartbeat imediatamente e agenda os próximos. */
  start(): this {
    this.startedAt = Date.now();
    void this.sendHeartbeat('OK');
    this.timer = setInterval(() => void this.sendHeartbeat('OK'), this.intervalMs);
    this.timer.unref?.();
    return this;
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Chame quando seu bot capturar um erro — manda um heartbeat imediato marcado como ERROR. */
  reportError(error: unknown): void {
    this.errorCount += 1;
    this.lastError = error instanceof Error ? error.message : String(error);
    void this.sendHeartbeat('ERROR');
  }

  private async sendHeartbeat(status: HeartbeatStatus): Promise<void> {
    const payload: HeartbeatPayload = {
      status,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      errorCount: this.errorCount || undefined,
      lastError: this.lastError,
    };

    try {
      const response = await fetch(`${this.baseUrl}/v1/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        this.onError?.(new Error(`BotOps: heartbeat retornou HTTP ${response.status}`));
      }
    } catch (error) {
      this.onError?.(error);
    }
  }
}
