# Referência de inspiração

O clone do AppFlowy foi baixado em `../AppFlowy-reference/` apenas como **fonte
de inspiração de produto** (UX, modelo de dados, features). Sua stack
(Rust + Flutter) **não é reaproveitada diretamente** — o BincNote é uma
reescrita com Django + React + Tailwind.

## Pontos-chave observados para inspiração

- **Sidebar com árvore pages/databases**: experiência Notion-like.
- **Blocos** no editor: cada parágrafo é um bloco autônomo, arrastável.
- **Databases multi-view**: mesmo conjunto de dados renderiza como grid,
  board ou calendar.
- **Campos tipados** por coluna, com seleções e relações entre databases.
- **IA integrada** no editor e como chat.
- **Temas e emoji/ícone/capa** nas páginas.

## O que NÃO será herdado

- Toda camada Rust (FFI/gRPC) substituída por Django REST.
- Flutter → React.
- Sync em tempo real multi-device (fora do escopo v1).

## Mapas úteis no clone de referência

- `AppFlowy-reference/README.md` — visão geral do original.
- `AppFlowy-reference/doc/roadmap.md` — roadmap original (para ideias).
- `AppFlowy-reference/frontend/appflowy_flutter/` — estrutura da UI mobile.
  Estudar comportamentos, **não** portar código Dart.