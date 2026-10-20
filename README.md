# Tend

**Tend** é um PWA mobile-first para gestão colaborativa de tarefas domésticas. A ideia: você cria uma **casa**, convida quem mora com você, organiza a casa em **ambientes** (cozinha, banheiro, quintal…) e cadastra **tarefas recorrentes** — com responsável fixo ou em rodízio. Ambientes podem ser simples (só marcar "feito") ou gamificados (pontos por tarefa concluída).

> Tom visual adulto e minimalista, verde `#4a7c59`, fonte Hanken Grotesk. Base de design 375px.

---

## Conceito

```
Casa (ex: "Casa do Leo")          ← nível raiz, com código de convite
 ├─ Membros                        ← entram pelo código; papéis: owner / admin / member
 └─ Ambientes (Spaces)             ← Cozinha, Banheiro, Quintal…
     ├─ modo: simples | gamificado
     ├─ Membros do ambiente        ← subconjunto dos membros da casa
     └─ Tarefas
         ├─ recorrência: diária | semanal (dias) | intervalo (a cada N dias)
         ├─ responsável: fixo (uma pessoa) | rodízio (fila circular)
         └─ pontos (quando gamificado)
```

As **ocorrências** (`task_occurrences`) são as instâncias de uma tarefa num dia específico — é o que a pessoa marca como feito. São geradas para os próximos 7 dias ao criar/editar a tarefa e, diariamente, por um cron.

---

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | UI + lógica de servidor + cron num só deploy |
| Banco + Auth | **Supabase** (Postgres + Auth + Realtime) | Auth integrado ao **RLS**, realtime, um só serviço de dados |
| Segurança | **Row Level Security** | Isolamento multi-tenant garantido no banco |
| UI | **Tailwind CSS v4** + tokens do design | Design system via CSS custom properties |
| Validação | **Zod v4** | Schemas tipados nas server actions |
| Datas | **date-fns v4** | Cálculo de recorrência |
| Ícones | **lucide-react** | — |
| Testes | **Vitest** | Lógica pura (recorrência, rodízio) |
| Push (futuro) | **web-push** (VAPID) | Infra pronta, implementação adiada |

Não há back-end separado: a **camada de servidor do próprio Next.js** (Server Components, Server Actions, Route Handlers) conversa com o Supabase, e o **RLS do Postgres** é a fronteira final de segurança. Veja [Arquitetura](#arquitetura).

---

## Arquitetura

```
Navegador  ──►  Next.js (servidor)         ──►  Supabase
               • Server Components (leitura)      Postgres + RLS
               • Server Actions (escrita)         Auth (cookies httpOnly)
               • Route Handler /api/cron          Realtime
```

- **Server Components** usam a *anon key* + cookie de sessão → toda query passa pelo RLS.
- **Server Actions** (`"use server"`) fazem as mutações, também sob RLS.
- **Service role** (ignora RLS) só é usado no servidor em contextos confiáveis: o cron (protegido por `CRON_SECRET`) e a geração de ocorrências após uma escrita já verificada pelo RLS.
- **Realtime**: um componente client assina mudanças e chama `router.refresh()`, que refaz o fetch no servidor (sob RLS).

### Modelo de dados

`profiles` · `homes` · `home_members` · `spaces` · `space_members` · `tasks` · `task_rotation_queue` · `task_occurrences` · `space_member_points` · `push_subscriptions`

Todas com RLS. Helpers `SECURITY DEFINER` (`is_home_member`, `home_role`, `space_home`, `task_space`) evitam recursão nas policies. Funções `create_home` / `join_home` cuidam de criação e entrada por código. Um trigger credita pontos ao concluir tarefa em ambiente gamificado.

> **Importante:** RLS exige `ENABLE ROW LEVEL SECURITY` **e** `GRANT` aos roles — sem o grant, o Postgres bloqueia antes de avaliar as policies (migration `...000004_grants.sql`).

---

## Estrutura

```
src/
├─ app/
│  ├─ (auth)/            login, signup
│  ├─ (app)/
│  │  ├─ homes/          redireciona p/ a casa; /[id] overview + dashboard/invite/members
│  │  ├─ spaces/[id]/    detalhe (abas Hoje/Semana/Tudo), edit, leaderboard
│  │  └─ tasks/          minhas tarefas; new; [id]/edit
│  ├─ api/cron/generate-occurrences/   (service role, protegido por CRON_SECRET)
│  ├─ manifest.ts        PWA manifest
│  └─ layout.tsx
├─ components/           TaskForm, TaskRow, SpaceTasks, HomeSwitcher, RealtimeRefresh, ui/…
├─ lib/
│  ├─ supabase/{client,server,middleware}.ts
│  ├─ recurrence.ts      cálculo de datas de recorrência (puro, testado)
│  ├─ rotation.ts        fila circular do rodízio (puro, testado)
│  └─ occurrences.ts     geração de ocorrências (compartilhado cron + actions)
├─ proxy.ts              sessão + proteção de rotas (Next 16: era middleware.ts)
└─ types/database.ts     gerado do Supabase
supabase/
├─ migrations/           schema, functions, rls, grants, realtime
└─ seed.sql              3 usuários fake de dev (só em `db reset`)
```

> **Next.js 16:** `middleware.ts` virou `proxy.ts` (export `proxy`). As APIs diferem do que você conhece — consulte `node_modules/next/dist/docs/` antes de alterar convenções.

---

## Rodando localmente

Pré-requisitos: Node 20+, Docker (para o Supabase local), Supabase CLI (`npx supabase`).

```bash
# 1. instalar deps
npm install

# 2. subir o Supabase local (Postgres, Auth, Realtime, Studio)
npx supabase start        # no Colima: npx supabase start -x vector

# 3. criar .env.local a partir do exemplo e preencher com os valores do `supabase status`
cp .env.local.example .env.local

# 4. aplicar migrations + seed (usuários fake)
npx supabase db reset

# 5. rodar o app
npm run dev        # http://localhost:3000
```

### Usuários de teste (seed)

Todos com a senha **`tend1234`**, na casa **"Casa de Teste"** (código `TESTE123`):

| E-mail | Papel |
|---|---|
| `leo@tend.app` | dono (e **admin do sistema**) |
| `ana@tend.app` | admin |
| `pedro@tend.app` | membro |

> O seed usa a tabela interna `auth.users` do GoTrue (padrão para dev local) e **nunca** roda em produção — `db push` aplica só as migrations.

### Cron local (gerar ocorrências)

```bash
curl http://localhost:3000/api/cron/generate-occurrences \
  -H "Authorization: Bearer <CRON_SECRET do .env.local>"
```

### Scripts

| Comando | O quê |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
| `npm run test` | testes (Vitest) |
| `npm run db:types` | regenera `src/types/database.ts` do Supabase local |

---

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (segura; protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only**; ignora RLS (cron/geração) |
| `CRON_SECRET` | protege o endpoint do cron |
| `NEXT_PUBLIC_APP_URL` | base p/ links de convite |
| `APP_TIMEZONE` | fuso do calendário (padrão `America/Sao_Paulo`); "hoje", semana e ocorrências usam este fuso, não o UTC do servidor |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push (adiado) |
| `RESEND_API_KEY` / `RESEND_FROM` | e-mail transacional (adiado) |

---

## Deploy

> **Roteiro completo para o rollout fechado: [DEPLOY.md](DEPLOY.md)** (Supabase + SMTP, Vercel, primeiro admin, teste de fumaça, operação).

1. **Supabase prod:** `supabase login` → `supabase link --project-ref <ref>` → `supabase db push`. Pegar as 3 chaves em *Project Settings → API*. Em *Auth → Email*, desativar "Confirm email" (ou configurar SMTP) enquanto não há envio de e-mail.
2. **Vercel:** importar o repositório, configurar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`. Deploy.
3. **Cron:** `vercel.json` já agenda `generate-occurrences` diariamente às 06:00 UTC; a Vercel injeta o `CRON_SECRET` no header automaticamente.

> Vercel Hobby proíbe uso comercial e limita cron a 1×/dia (compatível com o nosso).

---

## Status

| Fase | Status |
|---|---|
| 0–4 — fundação, auth, casas/membros, ambientes/tarefas, conclusão + pontos + realtime | ✅ |
| 5 — PWA instalável | ✅ · **push e e-mail adiados** (definir UX antes) |
| 6 — deploy | ⏳ runbook pronto; falta executar logins interativos |

**Segurança:** rotas protegidas em 3 camadas (proxy + layout + RLS), isolamento multi-tenant via RLS, chaves de serviço server-only. Gap conhecido: sem rate limiting / quotas por usuário (recomendado antes de abrir ao público).

---

## Funcionalidades

- Casas com **seletor** (abre direto na casa; troca só aparece com 2+)
- Convite por **código / link** (Web Share nativo no mobile)
- Gestão de **membros** por casa e por ambiente
- Ambientes: CRUD, modo simples/gamificado; remover alguém **desvincula** das tarefas daquele ambiente
- Tarefas: CRUD, recorrência (diária/semanal/intervalo), responsável **fixo ou rodízio** (fila ordenável)
- Detalhe do ambiente com abas **Hoje / Esta semana / Tudo**
- Conclusão de tarefas, **pontos** e **ranking** (Esta semana / Sempre) com atividade recente
- **Dashboard da casa**: tarefas concluídas por pessoa (hoje/semana/sempre)
- **Realtime**: listas e ranking atualizam ao vivo
- **PWA** instalável (manifest, ícones, service worker, dica de instalação iOS)
- **Acesso controlado:** cadastro com código de 6 dígitos por e-mail + aprovação do admin (`/admin`); pendentes não acessam dados (RLS)
- **Tema escuro** (Automático / Claro / Escuro em Perfil → Aparência), sem flash na carga
- **Permissões:** qualquer membro cria/edita ambientes e tarefas; só dono/admin excluem ambiente, renomeiam a casa e geram novo código; só o dono exclui a casa (tela **Gerenciar casa**)
- **Ícone de ambiente = qualquer emoji** (teclado do aparelho + sugestões)
- **Concluir com desfazer** (otimista; reverte pontos) e **sheet arrastável** para nova tarefa
</content>
