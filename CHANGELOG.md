# Changelog

Versionamento [SemVer](https://semver.org/lang/pt-BR/): `MAJOR.MINOR.PATCH`.
Enquanto o app está em beta fechado, usamos `0.MINOR.PATCH`: **MINOR** = funcionalidade nova ou
mudança de comportamento; **PATCH** = correção. A versão fica em `package.json`; o admin a vê em
**Perfil**, junto do commit e da data do build.

## Regra: **toda mudança de código commitada sobe a versão**
1. `npm version patch --no-git-tag-version` (correção) ou `minor` (funcionalidade nova).
2. Uma entrada nova neste arquivo, no topo, com a data e o que mudou.
3. Mensagem do commit começa com o tipo e termina com `(vX.Y.Z)`.
4. Commits só de documentação não sobem a versão.
5. Se houver migration nova, `npx supabase db push` **antes** do deploy.

## 0.4.0 — Balancear tarefas (2026-10-23)
- **Rodízio não joga mais tudo na mesma pessoa no mesmo dia.** A causa: cada tarefa escolhia o responsável só pelo próprio
  histórico, então tarefas criadas juntas, com a mesma fila, caíam todas na mesma pessoa. Agora o início do rodízio é
  escalonado por tarefa (6 tarefas iguais saem 2 para cada uma de 3 pessoas já no primeiro dia).
- **Balancear tarefas** (Casa → engrenagem → *Balancear tarefas*): mostra a carga de cada pessoa nos próximos 7 dias,
  **Agora × Depois**, por **dia** ou na **semana**, em **tarefas** ou **pontos**, na **casa toda** ou em **ambientes** escolhidos,
  e aplica com um toque. Tarefas fixas e já concluídas contam como carga, mas não mudam; só rodízios são movidos, sempre para
  quem está na fila da tarefa. Aviso **Desfazer** depois de aplicar. Idempotente: rodar de novo não muda nada.
- Aviso na tela da **Casa** quando há desequilíbrio que o botão consegue corrigir.
- Banco: migration 12 (`apply_balance`, atômica, com validações). Editar um rodízio refaz a distribuição dele.

## 0.3.1 — Rodízio já começa com todo mundo (2026-10-22)
- Ao escolher **Rodízio** na criação/edição da tarefa, **todos do ambiente entram por padrão**; toque em quem não
  participa para tirar. Salvar um rodízio sem ninguém é bloqueado (deixava a tarefa sem responsável).

## 0.3.0 — Tarefas do dia, datas e redistribuição (2026-10-22)
- **Redistribuir tarefas** (Casa → engrenagem → *Redistribuir tarefas*): passa tudo de uma pessoa para outra com dois toques,
  ou **divide** entre as duas; na casa toda ou só em ambientes escolhidos. Mostra antes quantas tarefas (fixas + rodízios) serão
  afetadas. A pessoa que recebe entra nos ambientes, os rodízios trocam a pessoa na fila e as ocorrências de hoje em diante são
  recalculadas. Aparece um convite na tela da Casa quando alguém ainda não tem tarefas. Banco: migration 11.
- **Atrasadas:** deslizando para a esquerda a partir de **Hoje** (ou tocando na chip "Atrasadas") aparece uma seção
  só com as pendências de dias anteriores (últimos 30 dias), mais antigas primeiro, com "Ontem" / "há N dias".
  O app continua abrindo em Hoje. A chip mostra a contagem e fica laranja quando há pendência.
- **Robustez:** um erro momentâneo ao consultar o acesso ou as casas não é mais confundido com "sem acesso"/"sem casa"
  (antes podia levar uma pessoa aprovada para "Aguardando liberação" ou para criar outra casa); agora aparece "Tentar de novo".
- **Tarefas é a tela inicial**: mostra as tarefas do dia e, deslizando para o lado (ou tocando na faixa de dias),
  os próximos 7 dias. **O dia de hoje não some** ao concluir tudo: continua visível com o progresso e "Tudo feito 🎉".
  Menu agora: Tarefas · Casa · Perfil.
- **Duas visões** (botão no topo): lista normal e **agrupada por ambiente**, em cards com cabeçalho, as primeiras 3 tarefas
  e "Mostrar mais N". Filtro **Minhas | Da casa**. A escolha fica salva no aparelho.
- Aba **Tudo** do ambiente mostra a **tarefa em si** (repetição, responsável ou rodízio, pontos, período), sem check nem
  "feita por"; aviso de que mudar altera de hoje em diante.
- **Data de início e de término** nas tarefas: começo **imediato** (padrão) ou **agendado**, e término opcional.
  Para "a cada N dias" dá para informar **a última vez** que foi feito (ex.: remédio a cada 30 dias dado em 05/10
  → próxima em 04/11). A tela mostra a **primeira ocorrência** antes de salvar. Listas mostram "Começa…/Até…/Encerrada".
- **Editar tarefa** a partir de **Hoje**, **Esta semana** e **Tarefas** (antes só pela aba Tudo, e parecia não dar para editar).
- Banco: migration 10 (`tasks.end_date`).

## 0.2.0 — Beta fechado (2026-10-19)
### Acesso
- Cadastro com código de 6 a 8 dígitos por e-mail e **aprovação pelo admin** do sistema (`/admin`);
  quem não foi aprovado não acessa nenhum dado (travado no banco, não só na tela).
- Primeiro admin só por SQL; nenhuma rota do app promove admin.
### Casa
- Qualquer membro cria e edita ambientes e tarefas; só dono/admin excluem ambiente, renomeiam a
  casa e geram novo código; só o dono exclui a casa.
- Tela **Gerenciar casa**: renomear, novo código de convite, sair da casa, excluir casa.
- Ícone de ambiente é **qualquer emoji** (teclado do aparelho + sugestões).
### Experiência
- Redesign inspirado nos princípios da Apple: materiais translúcidos, mola nas interações, tipografia
  por tamanho, respeito a "reduzir movimento".
- **Tema escuro** (Automático / Claro / Escuro).
- Concluir tarefa é otimista e **reversível** (Desfazer, com estorno de pontos).
- Nova tarefa abre em **sheet** arrastável.
### Desempenho
- Verificação local do JWT, cache por requisição, realtime agrupado e cache de navegação de 20 s.
- Funções na mesma região do banco. Medido local: 177–246 ms → 19–59 ms por página.
### Correções
- Datas no fuso `America/Sao_Paulo` (antes UTC: "hoje" errado das 21h à meia-noite).
- Cron exige `CRON_SECRET`; login bloqueia redirecionamento externo; rodízio idempotente.
### Banco (migrations 6 a 9)
- Desfazer com estorno de pontos; aprovação de acesso (`user_access`); permissões de membro e gestão da casa.

## 0.1.0 — Fundação (2026-06 a 2026-09)
- Casas, ambientes e tarefas recorrentes (diária, semanal, intervalo), responsável fixo ou rodízio.
- Gamificação opcional por ambiente (pontos e ranking), dashboard da casa, realtime.
- PWA instalável, RLS em todas as tabelas, cron diário de ocorrências.
