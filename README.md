# BincNote

Aplicativo pessoal de anotações, documentos e banco de dados estruturado,
**inspirado no [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy)** e reescrito
do zero com Django + React + Tailwind, em português (pt-BR), para uso local.

> Status atual: **M0 — fundação** (scaffold + documentação). Veja `docs/ROADMAP.md`.

## Por que "BincNote"?

Variação pessoal de "think note" — minha anota/caderno de estudos. Uso privado.

## Stack

- **Backend**: Python 3.11+, Django 5, Django REST Framework, Django Templates.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TipTap, dnd-kit.
- **Banco**: SQLite local.

Justificativa: `docs/STACK.md`.

## Como rodar

### Pré-requisitos
- Python 3.11+
- Node.js 20+

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Servidor em http://localhost:8000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Servidor em http://localhost:5173

## Estrutura de pastas
```
BincNotev2/
├── AppFlowy-reference/   # clone do AppFlowy original (somente referência)
├── docs/                 # PRD, arquitetura, roadmap, stack
├── backend/              # Django + DRF
└── frontend/             # React + Vite + Tailwind
```

## Documentação
- `docs/PRD.md` — Requisitos do produto.
- `docs/ARQUITETURA.md` — Arquitetura técnica.
- `docs/STACK.md` — Decisões de stack.
- `docs/ROADMAP.md` — Roadmap por marcos.

## Idioma
Interface e dados em **português brasileiro (pt-BR)**.

## Licença
Uso pessoal. Veja `LICENSE` do AppFlowy original para a referência.