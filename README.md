# 💜 BotOps

**Observabilidade multi-tenant para bots de WhatsApp (Baileys).**

Seu bot roda via Baileys? Sessão cai, processo morre, número toma ban — e normalmente você só descobre quando um cliente reclama. O BotOps recebe um heartbeat periódico do seu bot, detecta quando ele para de responder e te avisa por webhook ou WhatsApp antes que o cliente perceba.

## Índice

- [Visão geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Stack técnica](#-stack-técnica)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Fluxos principais](#-fluxos-principais)
- [Como rodar localmente](#-como-rodar-localmente)
- [Scripts](#-scripts)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [API — endpoints](#-api--endpoints)
- [Segurança](#-segurança)
- [Testes e CI](#-testes-e-ci)
- [Decisões de arquitetura (trade-offs)](#-decisões-de-arquitetura-trade-offs)
- [Roadmap](#-roadmap)

## 🔭 Visão geral

Baileys é uma API não-oficial do WhatsApp — sessões caem, números tomam ban se abusarem de volume, e processos gerenciados por PM2 morrem silenciosamente. Ferramentas genéricas de observabilidade (Datadog, Grafana) não entendem "sessão do WhatsApp desconectou" como conceito de primeira classe. O BotOps é isso: um painel multi-tenant onde qualquer dev que roda bots Baileys (pros próprios clientes ou pra si mesmo) cadastra um bot, cola uma API key no processo dele, e passa a ver status, uptime e histórico de erros num painel — com alerta automático quando o bot para de mandar sinal de vida.

## ✨ Funcionalidades

- **Heartbeat**: um SDK leve (`@botops/agent`) que o processo do bot importa e usa pra mandar heartbeat periódico, com `status`, `uptimeSeconds`, `errorCount` e `lastError`
- **Detecção de queda**: cron que marca um bot como `OFFLINE` quando ele fica sem heartbeat além do esperado, e dispara alerta de recuperação quando ele volta
- **Painel web**: lista de bots com status em tempo quase real (polling), detalhe com histórico de heartbeats, geração/regeneração de API key
- **Alertas em dois canais**: webhook genérico (com assinatura HMAC) e WhatsApp (mesmo mecanismo de vínculo por código de pareamento)
- **Multi-tenant**: cada conta só vê os próprios bots, canais e histórico

## 🏗️ Arquitetura

```
┌──────────────────┐        heartbeat (X-Api-Key)        ┌────────────────────────┐
│  Bot do cliente   │ ───────────────────────────────────►│                        │
│  (@botops/agent)  │                                      │   BotOps API (:4000)  │
└──────────────────┘                                      │   Fastify 5 + Prisma   │
                                                            │                        │
┌──────────────────┐        login / dados (JWT)            │   node-cron: detecção  │
│  Painel (:4100)   │◄──────────────────────────────────────│   de queda + alertas   │
│  Next.js 15        │───────────────────────────────────► │                        │
└──────────────────┘                                      └───────────┬────────────┘
                                                                       │
                                                     ┌─────────────────┼─────────────────┐
                                                     ▼                                   ▼
                                          ┌────────────────────┐            ┌────────────────────┐
                                          │ Webhook do usuário  │            │  WhatsApp (Baileys) │
                                          │ (HMAC assinado)     │            │  alerta ao dono     │
                                          └────────────────────┘            └────────────────────┘
                                                     │
                                                     ▼
                                          ┌────────────────────┐
                                          │ PostgreSQL 16       │
                                          │ (Prisma)            │
                                          └────────────────────┘
```

## 📦 Stack técnica

| Pacote | Tecnologias |
|---|---|
| `packages/api` | Node.js 20 · TypeScript · Fastify 5 · Zod · Prisma 6 · PostgreSQL 16 · `node-cron` |
| `packages/web` | Next.js 15 (App Router) · React 19 · Tailwind CSS · TanStack Query (polling) |
| `packages/agent` | TypeScript puro, zero dependências pesadas (só `fetch`) |
| Auth (painel) | JWT RS256 (`@fastify/jwt`) + refresh tokens rotativos |
| Auth (bot) | API key por bot, hash SHA-256 |
| WhatsApp | `@whiskeysockets/baileys` (adapter `stub`\|`baileys`) |
| Testes | Vitest |
| CI | GitHub Actions (lint + typecheck + test + build nos 3 pacotes) |
| Monorepo | npm workspaces (sem Turborepo — não se justifica pra 3 pacotes) |

## 📁 Estrutura do projeto

```
BotOps/
├── packages/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/env.ts
│   │   │   ├── lib/            # prisma client, logger, hash de API key
│   │   │   ├── middlewares/     # authenticate (JWT), authenticateBot (API key), validate, errorHandler
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # registro, login, refresh, /me
│   │   │   │   ├── whatsapp-link/   # pareamento telefone↔usuário + bot mínimo do WhatsApp
│   │   │   │   ├── bots/             # CRUD de bots + API key
│   │   │   │   ├── heartbeat/         # ingestão + detecção de queda (função pura testável)
│   │   │   │   └── alerts/             # canais (webhook/WhatsApp) + dispatch
│   │   │   ├── integrations/whatsapp/  # adapter stub | baileys
│   │   │   ├── jobs/                    # cron da detecção de queda
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── prisma/schema.prisma
│   │   └── tests/
│   ├── web/
│   │   ├── app/
│   │   │   ├── login/, register/           # públicas
│   │   │   └── (app)/dashboard/, bots/[id]/, settings/alerts/  # autenticadas
│   │   └── lib/                             # cliente da API (com refresh automático) + contexto de auth
│   └── agent/
│       └── src/index.ts                      # classe BotOpsAgent
├── docker-compose.yml    # PostgreSQL 16
├── scripts/generate-keys.js
└── .github/workflows/ci.yml
```

## 🔄 Fluxos principais

1. **Cadastro do bot**: no painel, o usuário cria um bot e recebe a API key **uma única vez** (como um token de CI/CD) — só o hash fica salvo.
2. **Heartbeat**: o processo do bot roda `new BotOpsAgent({ apiKey, baseUrl }).start()`, que manda `POST /v1/heartbeat` no intervalo configurado.
3. **Detecção de queda**: a cada minuto (`DOWN_DETECTION_CRON`), a API verifica todo bot `ONLINE`/`DEGRADED` sem heartbeat dentro de `heartbeatIntervalSeconds × HEARTBEAT_GRACE_MULTIPLIER` e marca `OFFLINE`, disparando alerta `DOWN`. Quando o heartbeat volta, o bot vira `ONLINE`/`DEGRADED` de novo e um alerta `RECOVERED` é disparado.
4. **Alertas**: cada canal habilitado do dono do bot recebe o evento — `WEBHOOK` via POST assinado (HMAC-SHA256 no header `X-BotOps-Signature`), `WHATSAPP` via Baileys pro número vinculado (mesmo pareamento por código usado no GranaZap).
5. **Painel**: lista de bots atualiza a cada 15s (polling via TanStack Query); a página de detalhe mostra os últimos 20 heartbeats e permite regenerar a API key.

## ⚡ Como rodar localmente

### Pré-requisitos
- Node.js ≥ 20
- Docker (para o PostgreSQL)

### Passo a passo

```bash
# 1. Instalar dependências (workspaces)
npm install

# 2. Subir o PostgreSQL
docker compose up -d

# 3. Configurar variáveis de ambiente
cp packages/api/.env.example packages/api/.env
npm run keys:generate   # gera JWT_PRIVATE_KEY/JWT_PUBLIC_KEY — cole no packages/api/.env
cp packages/web/.env.local.example packages/web/.env.local

# 4. Rodar as migrations
npm run db:migrate

# 5. Subir API (:4000) + painel (:4100) juntos
npm run dev
```

- Painel: http://localhost:4100 · API: http://localhost:4000 (health check em `/health`)
- Na primeira execução com `WHATSAPP_ENABLED=true` (padrão), um QR Code aparece no terminal da API — escaneie em **WhatsApp → Aparelhos conectados** com o número que vai mandar os alertas. Para desenvolver sem WhatsApp real, defina `WHATSAPP_ENABLED=false` no `.env` da API (o adapter `stub` assume e só loga no console).
- Para testar um heartbeat manualmente:
  ```bash
  curl -X POST http://localhost:4000/v1/heartbeat \
    -H "X-Api-Key: SUA_API_KEY" -H "Content-Type: application/json" \
    -d '{"status":"OK","uptimeSeconds":120}'
  ```

## 📜 Scripts

Na raiz (orquestram os workspaces):

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe `api` (:4000) e `web` (:4100) juntos via `concurrently` |
| `npm run build` | Build de todos os pacotes |
| `npm run lint` / `npm run typecheck` / `npm test` | Rodam em todos os pacotes que tiverem o script |
| `npm run db:migrate` / `npm run db:seed` | Atalhos pro workspace `api` |
| `npm run keys:generate` | Gera o par de chaves JWT RS256 |

## 🔑 Variáveis de ambiente

Ver [`packages/api/.env.example`](packages/api/.env.example) e [`packages/web/.env.local.example`](packages/web/.env.local.example). Principais:

- **API**: `PORT`, `APP_BASE_URL`, `DATABASE_URL`, `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`, `WHATSAPP_ENABLED`, `HEARTBEAT_GRACE_MULTIPLIER`, `DOWN_DETECTION_CRON`
- **Web**: `NEXT_PUBLIC_API_BASE_URL`

> `APP_BASE_URL`, não `BASE_URL` — o Vite/Vitest reserva esse nome e injeta seu próprio valor (`"/"`), o que quebraria a validação de URL nos testes (mesmo cuidado tomado no GranaZap).

## 🔌 API — endpoints

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| POST | `/auth/register` | pública | Cria conta no painel |
| POST | `/auth/login` | pública | Login → `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | pública | Rotaciona o refresh token |
| POST | `/auth/logout` | pública | Revoga um refresh token |
| GET | `/auth/me` | JWT | Dados do usuário autenticado |
| POST | `/whatsapp-link/code` | JWT | Gera código de pareamento do WhatsApp |
| GET | `/whatsapp-link/status` | JWT | Status do vínculo |
| POST | `/bots` | JWT | Cria bot → retorna a API key (uma vez só) |
| GET | `/bots` | JWT | Lista os bots do usuário |
| GET | `/bots/:id` | JWT | Detalhe + últimos heartbeats/alertas |
| POST | `/bots/:id/regenerate-key` | JWT | Gera uma nova API key para o bot |
| DELETE | `/bots/:id` | JWT | Remove o bot |
| POST | `/v1/heartbeat` | API key do bot (`X-Api-Key`) | Ingestão de heartbeat |
| GET | `/alert-channels` | JWT | Lista canais de alerta |
| POST | `/alert-channels/webhook` | JWT | Cria canal de webhook |
| POST | `/alert-channels/whatsapp` | JWT | Ativa alerta pro WhatsApp vinculado |
| DELETE | `/alert-channels/:id` | JWT | Remove canal |
| GET | `/health` | pública | Health check |

## 🔐 Segurança

- API key do bot exibida **uma única vez** na criação; só o hash (SHA-256) fica no banco
- JWT RS256 + refresh tokens rotativos e revogáveis (hash, nunca texto puro) — mesmo padrão do GranaZap
- `userId`/`botId` sempre resolvidos via autenticação (JWT ou API key), nunca aceitos do body/params
- Webhooks de alerta assinados com HMAC-SHA256 (segredo por canal, gerado no cadastro) no header `X-BotOps-Signature`
- Rate limiting global (100 req/min por IP)

**Vulnerabilidade conhecida e aceita**: `npm audit` reporta 3 CVEs de severidade alta (`postcss`, `sharp`) — mas são versões **empacotadas internamente pelo próprio Next.js** (`node_modules/next/node_modules/*`), não dependências que este projeto controla diretamente. Testado tanto na última versão estável 15.x quanto na 16.x (`latest`) — ambas ainda vendorizam as mesmas versões vulneráveis, então não há correção disponível via bump de versão hoje. O risco prático é baixo: as CVEs de `postcss` exigem processar CSS controlado por atacante (aqui o PostCSS só processa os próprios arquivos `.css` do projeto em build-time) e as de `sharp`/libvips afetam otimização de imagem (`next/image`, que esta aplicação não usa). Vale reavaliar a cada atualização do Next.js.

## 🧪 Testes e CI

```bash
npm test
```

Cobertura atual (`packages/api/tests/`):
- `down-detection.test.ts` — lógica pura de detecção de queda (janela de tolerância)
- `api-key.test.ts` — geração/hash de API key (determinístico, único por chamada)
- `alerts.service.test.ts` — payload e assinatura HMAC do webhook, envio ao WhatsApp, canais desabilitados
- `heartbeat.routes.test.ts` — rejeição de heartbeat sem API key ou com key desconhecida

CI (`.github/workflows/ci.yml`) roda em todo push/PR: sobe um PostgreSQL de serviço, instala dependências, gera o Prisma Client, e roda lint + typecheck + test + build nos 3 pacotes.

## 🧭 Decisões de arquitetura (trade-offs)

- **npm workspaces, sem Turborepo**: só 3 pacotes, nenhum precisa de cache de build distribuído — Turborepo seria complexidade sem retorno aqui.
- **Painel com localStorage + refresh sob demanda, não cookie httpOnly**: mais simples de implementar entre origens diferentes (`:4000` e `:4100`) num MVP; o cliente da API já tenta um refresh automático uma vez antes de deslogar. Para produção real, mover pra cookie httpOnly com o mesmo domínio seria o próximo passo.
- **Sem WebSocket no painel**: polling de 15s é suficiente pra "meu bot está de pé ou não" — não é um caso de uso que precise de latência sub-segundo.
- **API key com hash simples (SHA-256), não bcrypt**: diferente de senha de usuário, a API key já nasce com alta entropia (24 bytes aleatórios) — não precisa de um hash lento contra força bruta, o mesmo raciocínio usado pros refresh tokens no GranaZap.
- **Agente não publicado no npm**: publicar exige conta npm, versionamento semântico e manutenção de compatibilidade — fora do escopo do MVP. Por enquanto é um workspace package que se copia pro projeto do bot.

## 🗺️ Roadmap

- Publicar `@botops/agent` no npm de verdade
- Cookie httpOnly + CSRF no painel em vez de token em localStorage
- Canal de alerta por e-mail (Resend, mesmo provedor usado no GranaZap)
- WebSocket para status em tempo real no painel
- Gráfico de uptime histórico por bot (não só a lista dos últimos 20 heartbeats)
- Suporte a equipes (múltiplos usuários por conta)

## 📄 Licença

Projeto pessoal — todos os direitos reservados.
