# Changelog

Versionamento [SemVer](https://semver.org/lang/pt-BR/): `MAJOR.MINOR.PATCH`.
Enquanto o app está em beta fechado, usamos `0.MINOR.PATCH`: **MINOR** = funcionalidade nova ou
mudança de comportamento; **PATCH** = correção. A versão fica em `package.json`; o admin a vê em
**Perfil**, junto do commit e da data do build.

## Como lançar uma versão
1. Atualize este arquivo (mova o que está em *Não lançado* para a nova versão).
2. `npm version minor --no-git-tag-version` (ou `patch`) para atualizar o `package.json`.
3. Commit `release: vX.Y.Z`, tag `git tag vX.Y.Z` e `git push --follow-tags`.
4. Se houver migration nova, `npx supabase db push` **antes** do deploy.

## Não lançado
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
