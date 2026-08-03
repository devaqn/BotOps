'use client';

import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../../lib/api';

interface Bot {
  id: string;
  name: string;
  status: 'UNKNOWN' | 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  lastHeartbeatAt: string | null;
  heartbeatIntervalSeconds: number;
}

const STATUS_LABEL: Record<Bot['status'], string> = {
  UNKNOWN: 'Nunca conectou',
  ONLINE: 'Online',
  DEGRADED: 'Com erros',
  OFFLINE: 'Offline',
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: bots, isLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: () => api.get<Bot[]>('/bots'),
    refetchInterval: 15000,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const createBot = useMutation({
    mutationFn: () => api.post<{ apiKey: string }>('/bots', { name, heartbeatIntervalSeconds: intervalSeconds }),
    onSuccess: (data) => {
      setCreatedKey(data.apiKey);
      setName('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['bots'] });
    },
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createBot.mutate();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Seus bots</h2>
        <button onClick={() => setShowCreate((v) => !v)}>{showCreate ? 'Cancelar' : '+ Novo bot'}</button>
      </div>

      {showCreate && (
        <form className="card" onSubmit={handleCreate}>
          <label>
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Intervalo esperado de heartbeat (segundos)
            <input
              type="number"
              min={10}
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(Number(e.target.value))}
            />
          </label>
          <button type="submit" disabled={createBot.isPending}>
            Criar
          </button>
        </form>
      )}

      {createdKey && (
        <div className="card highlight">
          <p>API key gerada — copie agora, ela não aparece de novo:</p>
          <code>{createdKey}</code>
          <button onClick={() => setCreatedKey(null)}>Ok, copiei</button>
        </div>
      )}

      {isLoading && <p>Carregando...</p>}

      <div className="bot-list">
        {bots?.map((bot) => (
          <Link key={bot.id} href={`/bots/${bot.id}`} className={`bot-row status-${bot.status.toLowerCase()}`}>
            <span className="dot" />
            <span className="bot-name">{bot.name}</span>
            <span className="bot-status">{STATUS_LABEL[bot.status]}</span>
            <span className="bot-last-seen">
              {bot.lastHeartbeatAt ? new Date(bot.lastHeartbeatAt).toLocaleString('pt-BR') : 'nunca'}
            </span>
          </Link>
        ))}
        {bots?.length === 0 && <p>Nenhum bot cadastrado ainda.</p>}
      </div>
    </div>
  );
}
