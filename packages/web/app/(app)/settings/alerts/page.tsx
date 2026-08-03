'use client';

import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';

interface AlertChannel {
  id: string;
  kind: 'WEBHOOK' | 'WHATSAPP';
  config: { url?: string };
}

interface WhatsAppLinkStatus {
  linked: boolean;
  phoneE164: string | null;
}

interface PairingCode {
  pairingCode: string;
  instructions: string;
}

export default function AlertsSettingsPage() {
  const queryClient = useQueryClient();

  const { data: channels } = useQuery({
    queryKey: ['alert-channels'],
    queryFn: () => api.get<AlertChannel[]>('/alert-channels'),
  });

  const { data: linkStatus } = useQuery({
    queryKey: ['whatsapp-link-status'],
    queryFn: () =>
      api.get<WhatsAppLinkStatus>('/whatsapp-link/status').catch(() => ({ linked: false, phoneE164: null })),
  });

  const [webhookUrl, setWebhookUrl] = useState('');
  const [pairing, setPairing] = useState<PairingCode | null>(null);

  const addWebhook = useMutation({
    mutationFn: () => api.post('/alert-channels/webhook', { url: webhookUrl }),
    onSuccess: () => {
      setWebhookUrl('');
      queryClient.invalidateQueries({ queryKey: ['alert-channels'] });
    },
  });

  const generateCode = useMutation({
    mutationFn: () => api.post<PairingCode>('/whatsapp-link/code'),
    onSuccess: setPairing,
  });

  const addWhatsApp = useMutation({
    mutationFn: () => api.post('/alert-channels/whatsapp'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-channels'] }),
  });

  const removeChannel = useMutation({
    mutationFn: (channelId: string) => api.delete(`/alert-channels/${channelId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-channels'] }),
  });

  function handleAddWebhook(event: FormEvent) {
    event.preventDefault();
    addWebhook.mutate();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Canais de alerta</h2>
      </div>

      <section className="card">
        <h3>Webhook</h3>
        <p className="subtitle">Recebe um POST com assinatura HMAC (header X-BotOps-Signature) a cada alerta.</p>
        <form onSubmit={handleAddWebhook}>
          <input
            placeholder="https://seu-servico.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            required
          />
          <button type="submit" disabled={addWebhook.isPending}>
            Adicionar
          </button>
        </form>
      </section>

      <section className="card">
        <h3>WhatsApp</h3>
        {linkStatus?.linked ? (
          <>
            <p className="subtitle">Número vinculado: {linkStatus.phoneE164}</p>
            <button onClick={() => addWhatsApp.mutate()} disabled={addWhatsApp.isPending}>
              Ativar alertas por WhatsApp
            </button>
          </>
        ) : (
          <>
            <button onClick={() => generateCode.mutate()} disabled={generateCode.isPending}>
              Gerar código de vínculo
            </button>
            {pairing && <p className="subtitle">{pairing.instructions}</p>}
          </>
        )}
      </section>

      <section className="card">
        <h3>Canais ativos</h3>
        {channels?.length ? (
          <ul className="flex flex-col gap-2">
            {channels.map((channel) => (
              <li key={channel.id} className="flex items-center justify-between rounded-md bg-slate-800/50 px-3 py-2">
                <span>{channel.kind === 'WEBHOOK' ? channel.config.url : '📱 WhatsApp'}</span>
                <button onClick={() => removeChannel.mutate(channel.id)}>Remover</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="subtitle">Nenhum canal configurado ainda.</p>
        )}
      </section>
    </div>
  );
}
