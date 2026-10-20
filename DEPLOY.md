# Tend — roteiro de deploy (rollout fechado)

Objetivo: colocar no ar para um grupo pequeno e controlado.

**Como o acesso funciona:** qualquer pessoa pode se cadastrar, mas precisa (1) **confirmar o e-mail com um
código de 6 dígitos** e (2) ser **aprovada pelo admin do sistema** no painel `/admin`. Enquanto não aprovada,
não lê nem escreve nenhum dado — o bloqueio é no banco (RLS), valendo também para chamadas diretas à API.

Legenda: 🧑 = ação sua (precisa de login/segredo) · 🤖 = o Claude pode fazer · ✅ = já pronto

---

## 0. Pré-voo ✅
- Build, lint e testes passam (`npm run build && npm run lint && npm test`).
- 9 migrations versionadas (a `…000008_user_access.sql` cria a aprovação por admin e substitui a allowlist da 7).
- Cron protegido (`CRON_SECRET` obrigatório) e datas no fuso `America/Sao_Paulo`.
- `vercel.json`: funções em `gru1` (São Paulo) + cron diário 06:00 UTC (03:00 em Brasília).

## 1. Supabase de produção 🧑
1. https://supabase.com/dashboard → **New project**. Região: **South America (São Paulo)**. Guarde a senha do banco.
2. Aplicar o schema (no seu terminal, na raiz do repo):
   ```bash
   npx supabase login
   npx supabase link --project-ref <REF>      # o REF está na URL do projeto
   npx supabase db push                        # aplica as migrations pendentes. NÃO roda o seed.
   ```
3. **Authentication → Providers → Email**: deixe **Confirm email LIGADO** (é ele que envia o código) e confira que o tamanho do código (*Email OTP Length*) é 6.
4. **Authentication → Emails → Templates → Confirm signup**: assunto `Seu código do Tend` e cole o conteúdo de [`supabase/templates/confirmation.html`](supabase/templates/confirmation.html). Esse template mostra `{{ .Token }}` (o código); sem ele o e-mail sairia com *link* em vez de código.
5. **SMTP próprio** (obrigatório: o envio padrão do Supabase só entrega para membros da sua própria equipe). **Project Settings → Authentication → SMTP Settings**:
   - *Sem domínio (beta pequeno):* **Gmail** — ative a verificação em duas etapas na conta, crie uma **Senha de app** (myaccount.google.com/apppasswords) e use: host `smtp.gmail.com`, porta `465`, usuário = seu Gmail, senha = a senha de app, remetente = o mesmo Gmail. Limite ~500 e-mails/dia — sobra para o beta. A senha de app só existe no painel do Supabase (nunca no repositório). Em *Rate Limits* deixe o limite de e-mails/hora baixo (ex.: 20) para conter abuso.
   - *Com domínio (recomendado antes de abrir mais):* **Resend** — verifique o domínio (SPF/DKIM) e use as credenciais SMTP deles. A troca não exige mudança de código.
7. **Project Settings → API**: copie `Project URL`, a chave **anon** e a **service_role** (aba *Legacy API Keys*; é o formato testado localmente).

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

## 2b. Criar o primeiro admin (ANTES de divulgar a URL) 🧑
Não existe senha de admin no código, no `.env` nem na Vercel: o admin é **um usuário comum** com a flag `is_admin`, e essa flag **só é ligada por SQL** pelo dono do projeto Supabase — nenhuma rota do app promove ninguém.
1. No app em produção, **cadastre-se** com o seu e-mail e confirme o código. Você cai em "Aguardando liberação".
2. No Supabase → **SQL Editor**, rode (trocando o e-mail):
   ```sql
   update public.user_access set status = 'approved', is_admin = true
   where user_id = (select id from auth.users where email = 'voce@exemplo.com');
   ```
3. Recarregue o app: você entra, e em **Perfil → Gerenciar acessos** (ou `/admin`) vê a fila.

Como o admin fica protegido: a senha existe só como hash no Supabase Auth; `/admin` devolve 404 a quem não é admin (checado no servidor, no banco e na camada de ação); as ações usam a service role só depois de confirmar `is_admin`; ninguém altera o próprio acesso nem o de outro admin pelo painel; `user_access` não tem permissão de escrita para usuários (nem para o próprio). **Use uma senha longa e única** e, se possível, um gerenciador de senhas. MFA obrigatório para o admin ficou para depois (ver seção 6).

## 3. Teste de fumaça (10 min) 🧑 (+ 🤖 se quiser que eu confira por URL)
Faça numa janela anônima, no celular se possível:
- [ ] `/` abre a landing; `/homes` sem login redireciona para `/login`.
- [ ] Cadastro com um e-mail novo → chega o **código de 6 dígitos** (confira a caixa de spam) → tela "Aguardando liberação".
- [ ] Nessa conta pendente, `/homes` e `/admin` voltam para a tela de espera.
- [ ] No painel `/admin` (como admin): **Aprovar** → a tela de espera da outra aba avança sozinha (até ~8 s).
- [ ] Depois de aprovada, a conta cai em criar casa.
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
| 2 — Beta fechado | 3–5 casas (aprove cada pessoa em `/admin`) | nenhuma tarefa no dia errado; feedback de UX coletado |
| 3 — Decidir abertura | — | cumprir a seção 6 antes de abrir |

Operação do dia a dia:
- **Liberar alguém:** a pessoa se cadastra, confirma o código, e você **aprova em `/admin`**. Depois ela entra na casa pelo código/link de convite. Pessoas não convidadas que se cadastrarem ficam na fila: é só não aprovar (ou **Bloquear**).
- **Esqueceu a senha:** ainda não há "esqueci minha senha" (precisa de SMTP). Reset manual pelo SQL Editor:
  ```sql
  update auth.users set encrypted_password = extensions.crypt('NOVA-SENHA-TEMPORARIA', extensions.gen_salt('bf'))
  where email = 'pessoa@exemplo.com';
  ```
  Combine de a pessoa trocar depois. Avise os testers dessa limitação.
- **Remover usuário:** Authentication → Users → Delete. Atenção: se a pessoa for **dona de uma casa**, o delete **falha** (`homes.owner_id` é `restrict`). Antes, transfira o dono: `update homes set owner_id = '<novo-uuid>' where id = '<casa>';` (e ajuste `home_members.role`). Tarefas/ocorrências dela ficam sem responsável (`set null`).
- **Suspender alguém:** `/admin` → **Bloquear** (perde o acesso na hora, mesmo logada). Para tirar o app do ar: Vercel → Settings → Deployment Protection.

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
1. **Recuperação de senha** (o SMTP do passo 1.5 já viabiliza) e e-mail de convite.
2. **LGPD:** política de privacidade, termos, exclusão de conta pelo usuário.
3. **Rate limiting / quotas** por usuário (casas, tarefas) e revisão dos limites do Supabase Auth.
4. **MFA (app autenticador) obrigatório para o admin** e, se abrir ao público, **CAPTCHA** (Cloudflare Turnstile) no cadastro para evitar disparo de e-mails a terceiros. Notificação por e-mail ao admin de novos cadastros e ao usuário quando aprovado.
5. **Push/e-mail** só quando a UX estiver definida (ver HANDOFF 1.8).
6. Monitoramento (Sentry ou similar) e testes automatizados das server actions / RLS.
