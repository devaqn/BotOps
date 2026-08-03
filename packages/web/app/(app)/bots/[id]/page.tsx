'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../../lib/api';

interface HeartbeatEvent {
  id: string;
  status: 'OK' | 'ERROR';
  uptimeSeconds: number | null;
  errorCount: number | null;
  lastError: string | null;
  receivedAt: string;
}

interface BotDetail {
  id: string;
  name: string;
  status: string;
  heartbeatIntervalSeconds: number;
  lastHeartbeatAt: string | null;
  heartbeatEvents: HeartbeatEvent[];
}

export default function BotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: bot, refetch } = useQuery({
    queryKey: ['bot', id],
    queryFn: () => api.get<BotDetail>(`/bots/${id}`),
    refetchInterval: 15000,
  });

  const regenerate = useMutation({
    mutationFn: () => api.post<{ apiKey: string }>(`/bots/${id}/regenerate-key`),
    onSuccess: (data) => setNewKey(data.apiKey),
  });

  if (!bot) return <p>Carregando...</p>;

  return (
    <div>
      <h2>{bot.name}</h2>
      <p className="subtitle">
        Status: {bot.status} · intervalo esperado: {bot.heartbeatIntervalSeconds}s
      </p>

      <div className="card">
        <button onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
          Gerar nova API key
        </button>
        {newKey && (
          <div>
            <p>Nova API key (copie agora, ela não aparece de novo):</p>
            <code>{newKey}</code>
          </div>
        )}
      </div>

      <h3>Últimos heartbeats</h3>
      <table>
        <thead>
          <tr>
            <th>Quando</th>
            <th>Status</th>
            <th>Uptime</th>
            <th>Erros</th>
            <th>Último erro</th>
          </tr>
        </thead>
        <tbody>
          {bot.heartbeatEvents.map((event) => (
            <tr key={event.id}>
              <td>{new Date(event.receivedAt).toLocaleString('pt-BR')}</td>
              <td>{event.status}</td>
              <td>{event.uptimeSeconds !== null ? `${event.uptimeSeconds}s` : '—'}</td>
              <td>{event.errorCount ?? 0}</td>
              <td>{event.lastError ?? '—'}</td>
            </tr>
          ))}
          {bot.heartbeatEvents.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum heartbeat recebido ainda.</td>
            </tr>
          )}
        </tbody>
      </table>

      <button className="mt-4" onClick={() => refetch()}>
        Atualizar agora
      </button>
    </div>
  );
}
