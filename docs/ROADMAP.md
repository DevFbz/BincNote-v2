# Roadmap — BincNote

Marco a marco. Cada marco gera uma versão `vX.Y` local.

## M0 — Fundação (entrega inicial deste scaffolding)
- [x] Clone de referência AppFlowy em `AppFlowy-reference/`.
- [x] Documentação: PRD, arquitetura, stack, roadmap.
- [x] Scaffold backend Django + DRF + apps.
- [x] Scaffold frontend React + Vite + Tailwind + TS.
- [x] Settings/i18n pt-BR base.
- [ ] Backend rodando `runserver` + migrações.
- [ ] Frontend rodando `vite` exibindo shell.

## M1 — Documents
- [ ] Árvore de páginas (sidebar) com criar/renomear/excluir/aninhar.
- [ ] Editor TipTap com blocos: título, parágrafo, H1-H3, listas, citação, código, divisor, checklist.
- [ ] Marcadores de texto: negrito, itálico, sublinhado, riscado, link, highlight, código inline.
- [ ] Auto-save com debounce.
- [ ] Ícone/capa da página.
- [ ] Busca dentro das páginas.
- [ ] Lixeira + restauração.
- [ ] Tema claro/escuro.
- [ ] Exportar Markdown.

## M2 — Grid
- [ ] Criar database a partir de uma página.
- [ ] Campos tipados (texto, número, data, single/multi select, checkbox, URL, email).
- [ ] Adicionar/remover/renomear campos.
- [ ] Adicionar/remover records.
- [ ] Filtros e ordenação.
- [ ] Agrupar por seleção.
- [ ] Lixeira de records.

## M3 — Board
- [ ] View Kanban a partir de database.
- [ ] Colunas por campo single-select/status.
- [ ] Drag-and-drop de cartões entre colunas e dentro da coluna.
- [ ] Drawer de edição do cartão.
- [ ] Adicionar/colapsar colunas.

## M4 — Calendar
- [ ] View mensal/semanal/diária.
- [ ] Records com campo de data viram eventos.
- [ ] Criar record a partir de clique no dia.
- [ ] Arrastar evento p/ mudar data.
- [ ] Filtrar por database.

## M5 — IA
- [ ] Tela de configuração (endpoint, chave, modelo).
- [ ] Chat lateral com histórico persistido.
- [ ] Ações no editor: resumir, traduzir, reformular, continuar, corrigir.
- [ ] Streaming de resposta (sse ou ws).
- [ ] Prompt-sistema em pt-BR.

## M6 — Polimento
- [ ] Atalhos de teclado globais.
- [ ] Paleta de comandos (Cmd/Ctrl+K).
- [ ] Importar Markdown/JSON.
- [ ] Backup/restauração SQLite.
- [ ] Empacotamento desktop (Electron opcional).
- [ ] Testes de regressão.