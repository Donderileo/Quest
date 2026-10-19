# Tend — Contexto de decisões (handoff)

Documento de transferência de contexto para outro agente/dev. Registra **o quê**, **por quê**, **alternativas rejeitadas** e **armadilhas** — não só o estado final (para o estado final, ver `README.md`).

Data de referência: outubro/2026. Autor do produto: Leo (donderileo@gmail.com). O dono delegou a decisão de stack ao agente, pedindo análise de prós/contras.

---

## 1. Decisões de produto

### 1.1 Modelo Casa → Ambientes → Tarefas (não "um convite por ambiente")
- **Decisão:** nível raiz é a **Casa**. Pessoas entram na casa por um código único e depois são adicionadas a **ambientes** específicos. Tarefas vivem dentro de ambientes.
- **Por quê:** o dono avaliou que "um convite por ambiente perde o sentido" — a unidade natural é a casa. Um único ponto de entrada (código da casa) + curadoria de quem participa de cada ambiente.
- **Rejeitado:** convite por ambiente; estrutura plana sem o nível "Casa".

### 1.2 Atribuição: fixo ou rodízio (sem "aleatório")
- **Decisão:** ao criar a tarefa escolhe-se **Fixo** (sempre a mesma pessoa) ou **Rodízio** (fila circular, ordem definida, cada um faz uma vez na sequência). Dá pra mudar na edição.
- **Por quê:** o dono explicitamente removeu "aleatório" — rodízio determinístico é mais justo e previsível.
- **Como funciona o rodízio:** a n-ésima ocorrência vai para `fila[n % tamanho]`. Determinístico e **idempotente** — rodar a geração duas vezes não muda a atribuição. Ver `src/lib/rotation.ts`.

### 1.3 Gamificação opcional por ambiente
- **Decisão:** cada ambiente é **simples** (só marcar feito) ou **gamificado** (pontos por tarefa). Escolhido pelo criador do ambiente.
- **Por quê:** nem toda tarefa doméstica combina com pontos; a escolha por ambiente dá flexibilidade sem forçar o jogo em todo mundo.
- **Consequências:** `space_member_points` (acumulado) + ranking "Esta semana / Sempre". "Esta semana" é agregado das ocorrências concluídas desde segunda; "Sempre" usa o acumulado.

### 1.4 Nome e identidade
- **Decisão:** "Tend". Verde `#4a7c59`, Hanken Grotesk, tom adulto/minimalista, mobile-first 375px.
- **Histórico:** o dono considerou "Rota"/"Keep"/"Keepy" antes de fechar em "Tend". Pediu algo universal e simples em inglês.
- **Fonte visual:** handoff do Claude Design (arquivos `.dc.html` das telas 01–08). O código foi alinhado a esse handoff fielmente, incluindo tokens de cor e layout.

### 1.5 "Dashboard" como tela inicial da aba
- **Decisão:** a aba antes chamada "Casas" virou **"Dashboard"** e abre **direto na casa** do usuário (sem lista intermediária). Um seletor no topo troca de casa — e só aparece quando há 2+.
- **Por quê:** "não vai ser comum a pessoa ter duas casas"; o fluxo de dois cliques era desnecessário.
- **Extra:** há um **dashboard de métricas da casa** (`/homes/[id]/dashboard`) com tarefas concluídas **por pessoa** (hoje/semana/sempre), somando todos os ambientes — não por ambiente.

### 1.6 Tela de ambiente: abas Hoje / Esta semana / Tudo
- **Decisão:** o detalhe do ambiente tem segmented control. "Hoje" e "Esta semana" mostram **ocorrências** (instâncias datadas, com responsável e "feito por X"); "Tudo" mostra as **definições de tarefa** (uma por tarefa, editáveis).
- **Por quê:** uma lista plana de ocorrências dava a impressão de "infinitas tarefas diárias". Separar "o que fazer quando" (ocorrências) de "as regras" (tarefas) resolve isso e segue o design (tela 05).

### 1.7 Remover alguém de um ambiente → desvincula das tarefas (órfãs ok)
- **Decisão:** ao tirar uma pessoa do ambiente, as tarefas fixas dela ficam **sem responsável** (órfãs), as entradas de rodízio dela saem da fila, e ocorrências futuras pendentes dela são liberadas. Só afeta aquele ambiente.
- **Por quê:** pedido explícito do dono ("tudo bem existirem tarefas órfãs"). Evita tarefas atribuídas a quem não está mais no ambiente.

### 1.8 Push e e-mail: ADIADOS
- **Decisão:** infraestrutura pronta (service worker com handlers de push, tabela `push_subscriptions`, placeholders VAPID; dep `resend` instalada), mas **não implementar** até o dono definir a UX.
- **Por quê:** "ainda tenho que definir como isso vai funcionar para não ficar chato para o usuário." Notificação mal calibrada afasta o usuário.
- **Para o próximo agente:** NÃO sugerir implementar push/e-mail até o Leo trazer a estratégia. Quando vier: gerar VAPID, endpoint de subscribe gravando em `push_subscriptions`, disparo no `due_date` dentro do cron; convite por e-mail via Resend.

---

## 2. Decisões arquiteturais

### 2.1 Stack unificada TypeScript sobre Supabase (sem back-end separado)
- **Decisão:** **Next.js 16 (App Router) + Supabase**. Toda a lógica de servidor vive no Next (Server Components, Server Actions, Route Handlers). Sem serviço Go/Express à parte.
- **Por quê:** escopo doméstico (dezenas de usuários) não precisa da concorrência do Go. Stack unificada entrega mais rápido e ganha **RLS**, **Realtime** e **Auth** integrados de graça.
- **Rejeitado e por quê:**
  - *Back-end Go separado* — complexidade sem ganho no escopo.
  - *Clerk (auth)* — redundante com Supabase Auth e quebra a integração nativa do RLS (`auth.uid()`).
  - *Vite SPA puro* — precisaria de Edge Functions para qualquer segredo (push, e-mail); o Next mantém tudo num codebase com cron embutido.
- **Riscos aceitos:** lock-in Supabase (mitigado: é Postgres open-source, exportável); Vercel Hobby proíbe uso comercial (migra pra Pro se necessário).

### 2.2 RLS como fronteira primária de segurança
- **Decisão:** **Row Level Security** em todas as tabelas é a fronteira final. Mesmo com bug na aplicação, o banco isola as casas.
- **Padrão anti-recursão:** helpers `SECURITY DEFINER` (`is_home_member`, `home_role`, `space_home`, `task_space`) — sem eles, policies que consultam `home_members` entram em recursão.
- **ARMADILHA crítica (já resolvida):** RLS exige `ENABLE ROW LEVEL SECURITY` **E** `GRANT ... TO authenticated`. Sem o grant, o Postgres bloqueia **antes** de avaliar as policies e você recebe 404/linhas vazias sem erro claro. Ver migration `...000004_grants.sql`. `bypassrls` é atributo de *role*, não privilégio de tabela — não tentar usar como grant.

### 2.3 Três formas de acessar o Supabase (e quando usar cada uma)
- **Server Components** (`createClient`, `src/lib/supabase/server.ts`): anon key + cookie de sessão. Leitura das telas. Passa pelo RLS.
- **Server Actions** (`"use server"`): mutações, também sob RLS.
- **Service role** (`createServiceClient`): **ignora RLS**. Só em contextos confiáveis no servidor: o cron (protegido por `CRON_SECRET`) e `src/lib/occurrences.ts` (geração de ocorrências). A chave é server-only (sem prefixo `NEXT_PUBLIC`).

### 2.4 Geração de ocorrências: cron + inline, compartilhando a mesma função
- **Decisão:** ocorrências dos próximos 7 dias são geradas (a) diariamente pelo cron da Vercel e (b) **imediatamente** ao criar/editar uma tarefa.
- **Por quê:** tarefa recém-criada precisa aparecer já nas abas Hoje/Semana — antes, ela ficava "sem ninguém" até o cron rodar.
- **Implementação:** `generateOccurrencesForTask()` em `src/lib/occurrences.ts`, usada pelo cron e pelas actions. Upsert idempotente com `onConflict (task_id, due_date)`. Usa service role (INSERT em `task_occurrences` é restrito por RLS).
- **Edição:** apaga ocorrências **futuras pendentes** e recria; preserva as concluídas (histórico).

### 2.4b Datas sempre no fuso do app (`src/lib/tz.ts`)
- **Decisão:** nenhum `new Date()` para datas de calendário; usar `todayISO()`, `addDaysISO`, `weekStartISO`, `startOfDayInstant` (fuso `APP_TIMEZONE`, padrão America/Sao_Paulo).
- **Por quê:** o servidor roda em UTC; das 21h às 00h em Brasília ele já está no dia seguinte e "hoje", semana e ocorrências saíam erradas.
- **Rodízio:** a posição na fila é (ocorrências antes da janela) + índice, não a contagem total — rodar a geração duas vezes não desloca ninguém.
- **Cron** e actions compartilham `generateOccurrences()` (consultas em lote, upsert por tarefa).

### 2.5 Realtime via router.refresh()
- **Decisão:** componente client `RealtimeRefresh` assina `postgres_changes` nas tabelas (`task_occurrences`, `space_member_points`, `tasks`) e chama `router.refresh()` ao receber evento.
- **Por quê:** o refetch acontece no **servidor**, sob RLS — o navegador só é avisado "algo mudou". Sem vazamento; pior caso é um refresh desnecessário.
- **Requisito:** tabelas precisam estar na publication `supabase_realtime` (migration `...000005_realtime.sql`).

### 2.6 Validação com Zod nas server actions
- **Decisão:** todo input de action passa por um schema Zod.
- **ARMADILHAS do Zod v4 (mordidas já levadas):**
  - `.errors` virou **`.issues`** para acessar os erros.
  - `.uuid()` ficou **estrito** (exige versão/variante RFC 4122). UUIDs do seed (`b0000000-0000-0000-…`) são rejeitados. **Decisão:** trocar `.uuid()` por `.min(1)` nas actions — o tipo `uuid` do Postgres já valida o formato real; não perde segurança.
  - `.default()` só substitui `undefined`, **não `null`**. `formData.get()` retorna `null` para campo ausente → sempre usar `formData.get(x) ?? undefined` quando o campo é opcional/tem default. (Foi a causa dos erros "expected string, received null".)

### 2.7 Guarda contra tampering cross-tenant em updates + service role
- **ARMADILHA/padrão importante:** um `update().eq("id", x)` bloqueado pelo RLS afeta **0 linhas sem erro**. Se logo depois você usa o **service client** (ignora RLS) sobre o mesmo `x` vindo do formulário, um usuário pode adulterar dados de outra casa.
- **Decisão/regra:** antes de qualquer operação com service role derivada de um id do usuário, **confirmar que a escrita RLS afetou uma linha** — ex.: `update(...).select("id").maybeSingle()` e abortar se vier `null`. Aplicado no `updateTask`.

### 2.8 Next.js 16 — convenções que mudaram
- `middleware.ts` → **`proxy.ts`** (export nomeado `proxy`). É onde mora a proteção de rota + refresh de sessão.
- **AGENTS.md do repo manda ler `node_modules/next/dist/docs/` antes de escrever código** — as APIs divergem do conhecimento de treino. Seguir isso (foi assim que a PWA e o manifest foram feitos certos).
- Build usa **Turbopack**. Por isso **não** usamos Serwist (requer config webpack) para o service worker — fizemos manifest via `app/manifest.ts` e `public/sw.js` registrado manualmente.

### 2.9 Proteção de rotas em camadas
1. `proxy.ts` redireciona rotas não-públicas para `/login`. Públicas: `/login`, `/signup`, `/auth`, `/api/cron`. `/join/[code]` exige login (guarda destino).
2. `(app)/layout.tsx` revalida a sessão no servidor.
3. RLS no banco.

---

## 3. Decisões de projeto / processo

### 3.1 Supabase local + seed idempotente
- **Decisão:** dev roda Supabase local (Docker). `seed.sql` cria **3 usuários fake** (`leo@`, `ana@`, `pedro@tend.app`, senha `tend1234`) na "Casa de Teste", com ambientes e tarefas — roda em todo `db reset`.
- **ARMADILHAS do seed em `auth.users`:** inserir usuário direto na tabela do GoTrue exige colunas de token como **string vazia** (`confirmation_token`, `recovery_token`, etc.) — `NULL` quebra o login com "Database error querying schema". Senha via `extensions.crypt(..., extensions.gen_salt('bf'))`. Precisa de linha em `auth.identities` com `provider_id`.
- **Importante:** seed **nunca** vai para produção — `db push` aplica só migrations. UUIDs do seed são "não-RFC" de propósito (ver 2.6).

### 3.2 Migrations versionadas
Ordem: `...001_schema` → `...002_functions` → `...003_rls` → `...004_grants` → `...005_realtime`. A de grants e a de realtime foram adicionadas depois de bugs reais (404 por falta de grant; realtime sem publication).

### 3.3 Tipos gerados do banco
`npm run db:types` gera `src/types/database.ts` do Supabase local. Regenerar após mudar schema. (Começou como stub `any`; depois virou tipado.)

### 3.4 Testes
Vitest nas funções puras `recurrence.ts` e `rotation.ts` (casos de borda: virada de semana/mês, fila de 1 pessoa).

### 3.5 Lógica de recorrência
`src/lib/recurrence.ts` — `isDueOn` / `dueDatesInRange`. Suporta diária, semanal (dias 0=dom..6=sáb) e custom (a cada X dias a partir de `start_date`). date-fns.

---

## 4. Estado atual e próximos passos

- **Fases 0–4** (fundação, auth, casas/membros, ambientes/tarefas, conclusão+pontos+realtime): ✅
- **Fase 5** (PWA): instalável ✅; **push e e-mail adiados** (ver 1.8).
- **Fase 6** (deploy): runbook pronto no README; falta executar logins interativos (Supabase CLI + Vercel) — ações do dono.
- **Gap consciente:** sem **rate limiting / quotas** por usuário. Um usuário autenticado pode criar casas/tarefas sem limite (bloat no free tier). Aceitável para lançamento privado; recomendado antes de abrir ao público.
- **Build de produção passa limpo.** Código todo commitado em `main` (`Donderileo/Quest`).

### Para o próximo agente — regras de ouro
1. Ler `AGENTS.md` e `node_modules/next/dist/docs/` antes de mexer em convenções do Next 16.
2. RLS + GRANT andam juntos; não confie em `.uuid()` do Zod v4; `formData.get() ?? undefined` para opcionais.
3. Service role só server-side e só após verificar a permissão RLS — nunca derivar operação privilegiada de um id de formulário sem checar.
4. Não implementar push/e-mail até o dono definir a UX.
5. Rodar `npm run build`, `npm run lint` e `npm run test` antes de dar trabalho por concluído.
</content>
