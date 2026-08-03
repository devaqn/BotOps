# @botops/agent

SDK leve para o processo do seu bot mandar heartbeat pro BotOps.

> Ainda não publicado no npm — copie a pasta `src/` (ou o `dist/` depois de `npm run build`) pro seu projeto por enquanto. Ver roadmap no README raiz.

## Uso

```ts
import { BotOpsAgent } from '@botops/agent';

const agent = new BotOpsAgent({
  apiKey: process.env.BOTOPS_API_KEY!,
  baseUrl: process.env.BOTOPS_BASE_URL, // http://localhost:4000 em dev
  intervalSeconds: 60, // deve bater com o configurado no painel ao criar o bot
  onError: (error) => console.error('BotOps heartbeat falhou:', error),
});

agent.start();

// Quando seu bot capturar um erro:
try {
  await handleMessage(msg);
} catch (error) {
  agent.reportError(error);
}

// Ao encerrar o processo:
agent.stop();
```
