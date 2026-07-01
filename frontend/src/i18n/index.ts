import appflowy from "./locales/pt-BR.json";

/** Dicionário próprio do BincNote. Chaves próprias (não no AppFlowy) ou
 *  atalhos convenientes. Quando uma chave não existir aqui, tenta no JSON
 *  do AppFlowy. Se não existir em nenhum, retorna a própria chave. */
const BINC: Record<string, string> = {
  "app.nome": "BincNote",
  "app.lema": "Seu caderno pessoal",
  // Comuns
  "common.loading": "Carregando",
  "common.saving": "Salvando",
  "common.saved": "Salvo",
  "common.delete": "Mover para a lixeira",
  "common.cancel": "Cancelar",
  "common.confirm": "Confirmar",
  "common.collapseMenu": "Recolher menu",
  "common.expandMenu": "Expandir menu",
  // Sidebar
  "sidebar.meuEspaco": "Meu Espaço",
  "sidebar.novaPagina": "Nova página",
  "sidebar.buscar": "Buscar",
  // Barra de comandos
  "commandBar.placeholder": "Buscar ou digite um comando…",
  // Toolbar
  "toolbar.addPage": "Nova página",
  "toolbar.addBlock": "Adicionar bloco",
  "toolbar.h1": "Título 1",
  "toolbar.h2": "Título 2",
  "toolbar.h3": "Título 3",
  // Aparência
  "appearance.lightMode": "Modo claro",
  "appearance.darkMode": "Modo escuro",
  // Editor
  "editor.placeholder": "Digite '/' para comandos…",
  "editor.text": "Texto",
  "editor.bulletList": "Lista com marcadores",
  "editor.orderedList": "Lista numerada",
  "editor.taskList": "Lista de tarefas",
  "editor.quote": "Citação",
  "editor.code": "Código",
  "editor.strike": "Tachado",
  // Página
  "page.titlePlaceholder": "Sem título",
  "page.addSubpage": "Adicionar subpágina",
  "page.icon": "Ícone",
  "page.cover": "Capa",
  "page.removeCover": "Remover capa",
  "page.removeIcon": "Remover ícone",
  // Início/Templates
  "home.titulo": "Bem-vindo ao BincNote",
  "home.subtitulo": "Escolha um modelo para começar",
  // Lixeira
  "lixeira.vazia": "A lixeira está vazia.",
  "lixeira.restaurar": "Restaurar",
  // Página - pastas
  "page.folder": "Pasta",
  "page.newFolder": "Nova pasta",
  "page.newDocument": "Novo documento",
  // Barra lateral personalizada
  "sideBar.personal": "Pessoal",
  // Outros
  "document.blankContentSubtitle": "Tudo fica salvo localmente, em português.",
};

function buscar(chave: string, vars?: Record<string, string | number>): string | undefined {
  // 1) dicionário próprio
  if (chave in BINC) return BINC[chave];
  // 2) JSON do AppFlowy (por caminho pontuado)
  const partes = chave.split(".");
  let cur: any = appflowy;
  for (const p of partes) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else { cur = undefined; break; }
  }
  if (typeof cur === "string") return cur;
  return undefined;
}

export function t(chave: string, vars?: Record<string, string | number>): string {
  let str = buscar(chave) ?? chave;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  // Resolve referências @:chave
  str = str.replace(/@:([a-zA-Z0-9._]+)/g, (_, ref) => t(ref));
  return str;
}

export const LOCALE = "pt-BR";
export default appflowy;