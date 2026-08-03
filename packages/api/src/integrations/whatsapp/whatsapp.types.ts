export interface IncomingMessage {
  phoneE164: string;
  text: string;
}

export interface WhatsAppAdapter {
  start(): Promise<void>;
  sendMessage(phoneE164: string, text: string): Promise<void>;
  onMessage(handler: (message: IncomingMessage) => void | Promise<void>): void;
}
