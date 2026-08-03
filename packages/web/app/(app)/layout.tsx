'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="center-screen">Carregando...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>💜 BotOps</h1>
        <nav>
          <Link href="/dashboard">Bots</Link>
          <Link href="/settings/alerts">Alertas</Link>
        </nav>
        <div className="sidebar-footer">
          <span>{user.name}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
