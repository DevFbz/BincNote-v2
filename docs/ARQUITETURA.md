# Arquitetura — BincNote

## Visão de alto nível

```
                 +--------------------------+
                 |   React + Vite (TS)      |  :5173
                 |  TipTap, dnd-kit, Zustand |
                 +-------------+------------+
                               | REST/JSON (DRF)
                               v
                 +--------------------------+
                 |   Django + DRF            |  :8000
                 |  apps: accounts, documents|
                 |        grids, boards,     |
                 |        calendar, ai       |
                 +-------------+------------+
                               | ORM
                               v
                 +--------------------------+
                 |   SQLite (db.sqlite3)     |
                 +--------------------------+
```

## Organização de pastas

```
BincNotev2/
├── AppFlowy-reference/        # clone do original (somente referência)
├── docs/                      # PRD, arquitetura, roadmap, stack
├── backend/                   # projeto Django
│   ├── manage.py
│   ├── requirements.txt
│   ├── bincnote/              # settings/urls/wsgi
│   └── apps/
│       ├── accounts/
│       ├── documents/
│       ├── grids/
│       ├── boards/
│       ├── calendar_app/
│       └── ai_app/
└── frontend/                  # React + Vite + Tailwind
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/
        ├── pages/
        ├── stores/
        ├── api/
        └── lib/
```

## Backend (Django)

### Apps

- **accounts**: usuário local, login/logout opcional, settings.
- **documents**: `Page` (árvore) + `Block` (conteúdo TipTap JSON).
- **grids**: `Database`, `Field`, `Record`, `CellValue`, `View`.
- **boards**: views Kanban sob um Database.
- **calendar_app**: views calendário sob um Database.
- **ai_app**: conversas e mensagens, proxy para endpoint IA.

### API

REST via Django REST Framework, prefixo `/api/`.
Exemplos de endpoints:

- `GET/POST /api/pages/`
- `GET/PATCH/DELETE /api/pages/{id}/`
- `PATCH /api/pages/{id}/blocks/` (salva conteúdo)
- `GET/POST /api/databases/`
- `GET/POST /api/databases/{id}/fields/`
- `GET/POST /api/databases/{id}/records/`
- `GET/POST /api/ai/conversations/`
- `POST /api/ai/chat/`

### Templates

Django Templates servem `index.html` que monta a shell e carrega o bundle Vite.
Em desenvolvimento, Vite dev server leva HMR; em produção, `collectstatic` +
WhiteNoise servem o build.

## Frontend (React)

- **Roteamento**: react-router.
- **Estado UI**: Zustand (sidebar aberta, tema, página atual).
- **Server state**: @tanstack/react-query.
- **Editor**: @tiptap/* (StarterKit + Placeholder + Link + Highlight + TaskList).
- **Drag-and-drop**: @dnd-kit/core + sortable, para blocos do editor, board e
  reordenação de páginas.
- **Ícones**: lucide-react.
- **Estilos**: Tailwind + tokens em `src/styles`.

## Modelo de dados simplório

```text
Workspace (1)
  └── Page (tree via parent)
        ├── kind=document -> Block[]
        └── kind=database -> Database
                                 ├── Field[]
                                 ├── Record[] -> CellValue[]
                                 └── View (grid | board | calendar)
```

## Fluxo de auto-save

1. Editor TipTap emite `onUpdate` (debounce ~500ms).
2. React Query chama `PATCH /api/pages/{id}/blocks/` com o JSON do documento.
3. Endpoint substitui os blocos atuais (ou patch incremental v1 simples).
4. Toast discreto "Salvo" no canto.

## Temas

Token CSS em :root e `.dark`. Zustand guarda preferência em localStorage;
Tailwind usa `darkMode: 'class'`.

## i18n

pt-BR é a única língua; strings moram em `src/i18n/pt-BR.ts`.
Nenhum texto fixo em inglês no código de UI.

## Segurança

- DEBUG=False e ALLOWED_HOSTS restrito em produção.
- CSRF + CORS configurados para dev (localhost) no settings.
- Dados sensíveis de IA somente em variáveis de ambiente (`.env`).

## Testes

- Backend: pytest + pytest-django (`backend/tests/`).
- Frontend: Vitest + Testing Library (`frontend/src/**/*.test.tsx`).