# BincNote — Documento de Requisitos de Produto (PRD)

> **BincNote** é um aplicativo pessoal de anotações, documentos e banco de dados
> estruturado, inspirado no AppFlowy (https://github.com/AppFlowy-IO/AppFlowy),
> reescrito do zero com stack Python (Django + Django Templates) no backend e
> React + Tailwind CSS no frontend. Uso particular, local, em português (pt-BR).

---

## 1. Visão Geral

O BincNote é um "segundo cérebro" pessoal que combina:

- **Documents**: editor de texto rico com páginas aninhadas (estilo Notion/Obsidian).
- **Grid**: tabelas tipo planilha/banco de dados com campos tipados
  (texto, número, data, seleção, relação, etc).
- **Board**: quadro Kanban com cartões movidos entre colunas.
- **Calendar**: agenda calendário com eventos criados a partir de campos de data.
- **AI**: assistente de escrita/conversa com modelos de linguagem.

Tudo em um único produto, executando localmente para um único usuário, em
português brasileiro, sem dependência de nuvem.

### 1.1 Objetivos

- Reescrever as ideias centrais do AppFlowy em uma stack maintainable
  (Django + React) para um único usuário.
- Servir de plataforma pessoal para estudos, notas e organização.
- Oferecer uma base extensível para futuras integrações (sync multi-device, IA).

### 1.2 Não-objetivos (v1)

- Colaboração multiusuário em tempo real.
- Aplicativo mobile nativo (apesar de responsivo via web).
- Criptografia ponta-a-ponta de sincronização.

---

## 2. Personas

### 2.1 Persona Principal — "Eu"

Um único usuário (o dono do sistema), responsável por:
- anotar estudos, trabalho e pessoal;
- organizar conhecimento por páginas e databases;
- manter tudo local, privado e em português.

---

## 3. Requisitos Funcionais

### 3.1 Módulo Documents (RF-D)

| ID | Descrição |
|----|-----------|
| RF-D01 | Criar página com título e conteúdo em texto rico. |
| RF-D02 | Aninhar páginas em árvore (subpáginas) com profundidade ilimitada. |
| RF-D03 | Editor com blocos: título, parágrafo, cabeçalho (H1-H3), lista (bullets/numerada), citação, código, divisor, checklist. |
| RF-D04 | Negrito, itálico, sublinhado, riscado, código inline, link. |
| RF-D05 | Trecho destacado (highlight) colorido. |
| RF-D06 | Arrastar e reordenar blocos. |
| RF-D07 | Buscar texto dentro das páginas. |
| RF-D08 | Persistência automática (auto-save). |
| RF-D09 | Suporte a emojis/ícones e capa nas páginas. |
| RF-D10 | Alternar tema claro/escuro. |
| RF-D11 | Exportar página como Markdown. |
| RF-D12 | Lixeira (soft delete) com restauração. |

### 3.2 Módulo Grid (RF-G)

| ID | Descrição |
|----|-----------|
| RF-G01 | Criar um banco de dados (grid) num workspace. |
| RF-G02 | Adicionar/remover linhas (records) e colunas (fields). |
| RF-G03 | Tipos de campo: Texto, Número, Data, Seleção (single/multi), Checkbox, URL, Email, Fórmula simples, Relação (para outra grid), Rollup. |
| RF-G04 | Filtros por campo. |
| RF-G05 | Ordenação por campo. |
| RF-G06 | Agrupar linhas por campo de seleção. |
| RF-G07 | Visualizações alternativas: Grid, Board, Calendar a partir da mesma fonte de dados. |
| RF-G08 | Pesquisar registros. |
| RF-G09 | Lixeira de records. |

### 3.3 Módulo Board (RF-B)

| ID | Descrição |
|----|-----------|
| RF-B01 | Quadro Kanban com colunas baseadas em campo de seleção ou status. |
| RF-B02 | Cartões arrastáveis entre colunas (drag-and-drop). |
| RF-B03 | Reordenar cartões dentro da coluna. |
| RF-B04 | Abrir cartão num drawer/modal para editar campos. |
| RF-B05 | Adicionar/colapsar colunas. |

### 3.4 Módulo Calendar (RF-C)

| ID | Descrição |
|----|-----------|
| RF-C01 | Visualização mensal/semanal/diária. |
| RF-C02 | Eventos/records com campo de data aparecem no calendário. |
| RF-C03 | Criar record a partir de uma data clicada. |
| RF-C04 | Arrastar evento para mudar a data. |
| RF-C05 | Filtrar por fonte de dados (grid). |

### 3.5 Módulo AI (RF-A)

| ID | Descrição |
|----|-----------|
| RF-A01 | Chat lateral com modelo de linguagem. |
| RF-A02 | Ações de IA no editor: resumir, traduzir, reformular, continuar texto, corrigir. |
| RF-A03 | Gerar conteúdo em pt-BR. |
| RF-A04 | Histórico de conversas persistido localmente. |
| RF-A05 | Configuração de endpoint/chave de API (OpenAI, Anthropic ou servidor local). |

### 3.6 Transversal (RF-T)

| ID | Descrição |
|----|-----------|
| RF-T01 | Workspace único e local. |
| RF-T02 | Sidebar com árvore de páginas e listagem de bancos. |
| RF-T03 | Busca global (Cmd/Ctrl+K). |
| RF-T04 | Temas claro/escuro; língua pt-BR fixa. |
| RF-T05 | Atalhos de teclado. |
| RF-T06 | Importar/exportar Markdown e JSON. |
| RF-T07 | Backup manual do banco (exportar SQLite). |

---

## 4. Requisitos Não-Funcionais

| ID | Categoria | Descrição |
|----|-----------|-----------|
| RNF-01 | Desempenho | Carregamento inicial da página < 2s em máquina local. |
| RNF-02 | Desempenho | Editor fluído a 60fps até 5k blocos por página. |
| RNF-03 | Usabilidade | Interface 100% em pt-BR. |
| RNF-04 | Segurança | Servidor local; sem exposure de portas para internet por padrão. |
| RNF-05 | Portabilidade | Roda em Windows, macOS e Linux. |
| RNF-06 | Manutenibilidade | Código Pythonhandler com type hints (Django) e TypeScript no frontend. |
| RNF-07 | Privacidade | Dados ficam no SQLite local do usuário. |
| RNF-08 | Acessibilidade | Contraste adequado e navegação por teclado no editor. |

---

## 5. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.11+ |
| Framework backend | Django 5.x |
| Templates | Django Templates (para algumas páginas de bootstrap e SSR leve) |
| API | Django REST Framework (JSON para o React) |
| Banco de dados | SQLite (default) — Wagtail/FieldFile não requerido |
| Frontend | React 18 + TypeScript |
| Bundler | Vite |
| Estilos | Tailwind CSS + shadcn/ui-style components |
| Editor | TipTap (baseado em ProseMirror) |
| Estado | Zustand (UI) + React Query (server state) |
| Drag-and-drop | dnd-kit |
| Ícones | lucide-react |
| Empacotamento | (futuro) Electron/Tauri para app desktop |

Veja `../docs/STACK.md` para justificativas.

---

## 6. Arquitetura

```
┌──────────────────────────────┐
│  Frontend (React + Vite)      │   localhost:5173
│  - TipTap editor             │
│  - dnd-kit (board/reorder)   │
└─────────────┬────────────────┘
              │ JSON / REST
              ▼
┌──────────────────────────────┐
│  Backend Django (DRF)         │   localhost:8000
│  - apps: accounts, documents,│
│    grids, boards, calendar,  │
│    ai                        │
│  - Django Templates p/ index │
└─────────────┬────────────────┘
              │ ORM
              ▼
┌──────────────────────────────┐
│  SQLite local (db.sqlite3)    │
└──────────────────────────────┘
```

Detalhes: `../docs/ARQUITETURA.md`.

---

## 7. Modelo de Dados (alto nível)

- **Workspace**: root singleton.
- **Page**: tree (parent_id self-ref), título, ícone, capa, tipo (`document` | `grid` | `board` | `calendar`).
- **Block**: conteúdo serializado (JSON TipTap) pertencente a uma Page tipo document.
- **Database**: metadado de um grid vinculado a uma Page.
- **Field**: coluna tipada de um Database.
- **Record**: linha de um Database.
- **CellValue**: valor de uma célula (Field × Record).
- **View**: configuração de visualização (grid/board/calendar) sob um Database.
- **AIConversation / AIMessage**: histórico do chat de IA.
- **User**: usuário único local (login opcional viadjango.contrib.auth).
- **Setting**: configurações do app (tema, IA endpoint).

---

## 8. Roadmap (resumo)

- **M0** (pronto): scaffold, docs, PRD.
- **M1**: Documents completo — árvore de páginas + editor TipTap + auto-save + busca.
- **M2**: Grid — campos, filtros, ordenação.
- **M3**: Board a partir do Grid.
- **M4**: Calendar a partir do Grid.
- **M5**: IA (chat + ações no editor).
- **M6**: Polimento (temas, atalhos, import/export, backup).

Detalhes em `../docs/ROADMAP.md`.

---

## 9. Métricas de Sucesso

- Editor suporta 5k blocos sem travar.
- Imports Markdown mantêm árvore de páginas.
- Backup/restauração SQLite funciona 100%.
- Toda UI em pt-BR sem strings em outro idioma.

---

## 10. Riscos & Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| AppFlowy é enorme; escopo v1 "tudo" é inviável numa sessão | Alto | Priorizar M1 (Documents), scaffoliar demais módulos e evoluir incrementalmente. |
| Editor TipTap complexo | Médio | Começar com extensões oficiais, customizar gradual. |
| IA depende de chave externa | Baixo | Permitir endpoint local (llama.cpp/Ollama) como fallback. |
| Long paths no Windows no clone de referência | Baixo | Já mitigado via `core.longpaths=true`. |

---

## 11. Glossário

- **Página**: unidade de conteúdo; pode ser document, grid, board ou calendar.
- **Bloco**: parágrafo/elemento atômico dentro de um document.
- **Database/Grid**: coleção de registros tabulares.
- **Field**: coluna tipada.
- **Record**: linha do database.
- **View**: aparência alternativa do mesmo database (grid/board/calendar).