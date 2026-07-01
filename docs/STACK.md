# Decisão de Stack — BincNote

Este documento justifica a escolha de tecnologias, contrastando com a stack
original do AppFlowy (Rust + Flutter).

## Resumo

| Camada | AppFlowy (original) | BincNote (reescrita) |
|--------|---------------------|----------------------|
| Lógica/Backend | Rust (backend nativo embarcado) | Python + Django |
| Frontend desktop/mobile | Flutter (Dart) | React 18 + TypeScript |
| Estilos | Flutter widgets | Tailwind CSS |
| Banco | SQLite via `flowy-sqlite` (Rust) | SQLite via Django ORM |
| Editor | Editor custom Rust/Flutter | TipTap (ProseMirror) |
| Comunicação | FFI/gRPC local | REST (DRF) |

## Por que Django + React?

1. **Manutenção pessoal**: Python/Django tem curva baixa e é excelente para
   CRUDs e models com relacionamentos (perfeito para o modelo de dados
   "páginas + database + fields + records").
2. **Django Templates** para bootstrap rápido e renderização server-side leve
   (página inicial, login simples, servindo o bundle do Vite).
3. **React** traz ecossistema maduro de editores (TipTap), drag-and-drop
   (dnd-kit) e componentes (shadcn/ui), acelerando muito a UI rica.
4. **Tailwind** permite iterar visualmente sem CSS espalhado.
5. **TypeScript** dá segurança de tipos equivalente ao que Rust oferecia.

## Por que SQLite?

Uso pessoal e local: SQLite é zero-config, arquivo único, fácil de backupar e
rápido o suficiente para um usuário. Django suporta nativamente.

## Por que não manter Flutter/Rust?

- Requer toolchain pesada (Rust nightly, Flutter SDK).
- Menos facilitado para iteração de um único desenvolvedor em projeto pessoal.
- Pouco reaproveitável entre platform targets neste caso de uso.

## Bundler: Vite

HMR instantâneo, build minimalista, integra Tailwind e TS sem config complexa.

## Empacotamento desktop (futuro)

Para entregar um "app" local, M6 poderá empacotar via Electron (mais simples
com Django) ou Tauri (mais leve, mas pediria backend Rust). Como o backend é
Django, Electron ou um atalho "start Django+Vite" é o caminho mais natural.