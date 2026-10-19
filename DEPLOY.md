# Tend — roteiro de deploy (rollout fechado)

Objetivo: colocar no ar para um grupo pequeno e controlado. Só quem estiver na **allowlist**
consegue criar conta (travado no banco, não só na tela).

Legenda: 🧑 = ação sua (precisa de login/segredo) · 🤖 = o Claude pode fazer · ✅ = já pronto

---

## 0. Pré-voo ✅
- Build, lint e testes passam (`npm run build && npm run lint && npm test`).
- 7 migrations versionadas (a `…000007_beta_allowlist.sql` fecha o cadastro).
- Cron protegido (`CRON_SECRET` obrigatório) e datas no fuso `America/Sao_Paulo`.
- `vercel.json`: funções em `gru1` (São Paulo) + cron diário 06:00 UTC (03:00 em Brasília).

## 1. Supabase de produção 🧑
1. https://supabase.com/dashboard → **New project**. Região: **South America (São Paulo)**. Guarde a senha do banco.
2. Aplicar o schema (no seu terminal, na raiz do repo):
   ```bash
   npx supabase login
   npx supabase link --project-ref <REF>      # o REF está na URL do projeto
   npx supabase db push                        # aplica as 7 migrations. NÃO roda o seed.
   ```
3. **Liberar quem pode entrar** (SQL Editor do dashboard). Faça **antes** de qualquer um tentar se cadastrar:
   ```sql
   insert into public.beta_allowlist (email, note) values
     ('voce@exemplo.com', 'Leo'),
     ('fulano@exemplo.com', 'beta 1');
   ```
   E-mails em minúsculas. Para revogar o cadastro de alguém que ainda não entrou: `delete from public.beta_allowlist where email = '…';`
4. **Authentication → Providers → Email**: desligar **Confirm email** (não há SMTP ainda).
5. **Authentication → URL Configuration**: Site URL = `https://<seu-dominio>`; Redirect URLs = `https://<seu-dominio>/**`. (Preencha depois do passo 2 da Vercel, quando souber o domínio.)
6. **Project Settings → API**: copie `Project URL`, a chave **anon** e a **service_role** (aba *Legacy API Keys*; é o formato testado localmente).

## 2. Vercel 🧑
1. **Add New → Project** → importar `Donderileo/Quest`. Framework: Next.js (automático). Plano Hobby serve (uso não comercial; cron 1×/dia é o nosso).
2. Em **Environment Variables** (Production), *antes* do primeiro deploy — as `NEXT_PUBLIC_*` são gravadas no build:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role (**nunca** com prefixo `NEXT_PUBLIC`) |
   | `CRON_SECRET` | `openssl rand -hex 32` |
   | `APP_TIMEZONE` | opcional (padrão `America/Sao_Paulo`) |

   Não precisa de VAPID/Resend (push e e-mail estão adiados) nem de `NEXT_PUBLIC_APP_URL` (o link de convite usa a origem atual).
3. **Deploy**. Depois volte ao passo 1.5 e preencha as URLs do Auth com o domínio final.
4. Domínio próprio (opcional): Settings → Domains.

## 3. Teste de fumaça (10 min) 🧑 (+ 🤖 se quiser que eu confira por URL)
Faça numa janela anônima, no celular se possível:
- [ ] `/` abre a landing; `/homes` sem login redireciona para `/login`.
- [ ] Cadastro com e-mail **fora** da allowlist → "O Tend está em acesso por convite…".
- [ ] Cadastro com e-mail **da** allowlist → entra e cai em criar casa.
- [ ] Criar casa → ambiente → tarefa; a tarefa aparece em **Hoje**.
- [ ] Concluir tarefa, ver o aviso **Desfazer**, desfazer.
- [ ] Segundo celular/aba: entrar pelo código da casa; marcar tarefa e ver atualizar ao vivo (realtime).
- [ ] Instalar na tela inicial (iOS: Compartilhar → Adicionar; Android: Instalar).
- [ ] Cron (substitua os valores):
  ```bash
  curl -s https://<dominio>/api/cron/generate-occurrences -H "Authorization: Bearer <CRON_SECRET>"   # {"ok":true,...}
  curl -s -o /dev/null -w "%{http_code}\n" https://<dominio>/api/cron/generate-occurrences           # 401
  ```
- [ ] Vercel → **Settings → Cron Jobs**: o job aparece e roda no horário.

## 4. Rollout controlado (sugestão)
| Fase | Quem | Gate para avançar |
|---|---|---|
| 1 — Dogfooding | você + 1 pessoa da casa, 3–5 dias | cron gerou ocorrências todo dia; nenhum erro nos logs |
| 2 — Beta fechado | 3–5 casas (adicione cada e-mail à allowlist) | nenhuma tarefa no dia errado; feedback de UX coletado |
| 3 — Decidir abertura | — | cumprir a seção 6 antes de abrir |

Operação do dia a dia:
- **Liberar alguém:** `insert` na `beta_allowlist` (passo 1.3). A pessoa se cadastra e entra na casa pelo código/link de convite.
- **Esqueceu a senha:** ainda não há "esqueci minha senha" (precisa de SMTP). Reset manual pelo SQL Editor:
  ```sql
  update auth.users set encrypted_password = extensions.crypt('NOVA-SENHA-TEMPORARIA', extensions.gen_salt('bf'))
  where email = 'pessoa@exemplo.com';
  ```
  Combine de a pessoa trocar depois. Avise os testers dessa limitação.
- **Remover usuário:** Authentication → Users → Delete. Atenção: se a pessoa for **dona de uma casa**, o delete **falha** (`homes.owner_id` é `restrict`). Antes, transfira o dono: `update homes set owner_id = '<novo-uuid>' where id = '<casa>';` (e ajuste `home_members.role`). Tarefas/ocorrências dela ficam sem responsável (`set null`).
- **Fechar mais o acesso:** `delete from beta_allowlist where email = '…'` impede cadastros pendentes (quem já tem conta continua). Para tirar o app do ar: Vercel → Settings → Deployment Protection.

## 5. Operação e risco
- **Backups:** o plano Free do Supabase **não tem backup restaurável**. Antes de convidar gente de fora, ou assine o Pro (backup diário), ou rode um dump semanal:
  ```bash
  npx supabase db dump --linked -f backup-$(date +%F).sql          # esquema
  npx supabase db dump --linked --data-only -f dados-$(date +%F).sql
  ```
- **Projeto Free pausa após 7 dias sem atividade.** O cron diário toca o banco, o que ajuda, mas não é garantia contratual; confira o painel semanalmente na fase 1.
- **Rollback do app:** Vercel → Deployments → ⋯ no deploy anterior → *Promote to Production* (instantâneo).
- **Rollback do banco:** as migrations só andam para frente. Mudança de schema = nova migration; antes de aplicar em produção, tire um dump.
- **Segredos:** se `SUPABASE_SERVICE_ROLE_KEY` ou `CRON_SECRET` vazarem, rotacione (Supabase → API → *Reset*; gere novo segredo) e atualize na Vercel + redeploy.
- **Onde olhar quando algo quebra:** Vercel → *Logs* (runtime) e Supabase → *Logs* (Auth/Postgres). Erros do cron aparecem como 500 em `/api/cron/generate-occurrences`.
- **Deployment Protection:** mantenha ligada para *Preview* (padrão), assim PRs não ficam públicos.

## 6. Antes de abrir ao público (não é necessário para o beta fechado)
1. **Recuperação de senha** (exige SMTP: Resend/Postmark) e e-mail de convite.
2. **LGPD:** política de privacidade, termos, exclusão de conta pelo usuário.
3. **Rate limiting / quotas** por usuário (casas, tarefas) e revisão dos limites do Supabase Auth.
4. **Remover a allowlist:** `drop trigger trg_beta_allowlist on auth.users;` (em nova migration).
5. **Push/e-mail** só quando a UX estiver definida (ver HANDOFF 1.8).
6. Monitoramento (Sentry ou similar) e testes automatizados das server actions / RLS.
