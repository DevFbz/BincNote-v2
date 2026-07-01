import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRight, Plus, MoreHorizontal, Trash2 } from "lucide-react";

import type { Pagina } from "../api/cliente";

export function Sidebar({
  arvore,
  onAddSubpagina,
  onExcluirPagina,
}: {
  arvore: Pagina[];
  onAddSubpagina?: (parentId: number) => void;
  onExcluirPagina?: (paginaId: number) => void;
}) {
  if (!arvore.length) {
    return (
      <div className="px-2 py-4 text-center">
        <p className="text-xs text-txt-muted">Nenhuma página ainda.</p>
        <p className="text-[10px] text-txt-faint mt-1">Clique em "Novo" para criar</p>
      </div>
    );
  }
  return (
    <ul className="space-y-0.5">
      {arvore.map((p) => (
        <ItemArvore
          key={p.id}
          pagina={p}
          profundidade={0}
          onAddSubpagina={onAddSubpagina}
          onExcluirPagina={onExcluirPagina}
        />
      ))}
    </ul>
  );
}

function ItemArvore({
  pagina,
  profundidade,
  onAddSubpagina,
  onExcluirPagina,
}: {
  pagina: Pagina;
  profundidade: number;
  onAddSubpagina?: (parentId: number) => void;
  onExcluirPagina?: (paginaId: number) => void;
}) {
  const titulo = pagina.titulo || "Sem título";
  const temFilhos = pagina.children && pagina.children.length > 0;
  const [hover, setHover] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <li onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="flex items-center group">
        <NavLink
          to={`/pagina/${pagina.id}`}
          className={({ isActive }) =>
            `flex-1 flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors min-w-0 ${
              isActive
                ? "bg-surface-1 dark:bg-[#2e2e2e] text-txt font-medium"
                : "text-txt-muted hover:bg-surface-1 dark:hover:bg-[#2e2e2e] hover:text-txt"
            }`
          }
          style={{ paddingLeft: 8 + profundidade * 12 }}
        >
          <ChevronRight
            size={12}
            className="text-txt-faint shrink-0 transition-transform duration-150"
            style={{ transform: temFilhos ? "rotate(90deg)" : "rotate(0deg)" }}
          />
          <span className="text-base leading-none shrink-0">{pagina.icone || "📄"}</span>
          <span className="truncate">{titulo}</span>
        </NavLink>

        {/* "+" icon to add sub-page */}
        {onAddSubpagina && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddSubpagina(pagina.id);
            }}
            className={`p-1 rounded-md text-txt-muted hover:bg-surface-3 dark:hover:bg-[#3e3e3e] hover:text-txt transition-all ${
              hover ? "opacity-100" : "opacity-0"
            }`}
            title="Adicionar página"
          >
            <Plus size={14} />
          </button>
        )}

        {/* "..." icon with delete menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`p-1 rounded-md text-txt-muted hover:bg-surface-3 dark:hover:bg-[#3e3e3e] hover:text-txt transition-all ${
              hover || showMenu ? "opacity-100" : "opacity-0"
            }`}
            title="Mais opções"
          >
            <MoreHorizontal size={14} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#2e2e2e] rounded-lg shadow-xl border border-surface-4 dark:border-[#3e3e3e] p-1 z-50">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(false);
                    onExcluirPagina?.(pagina.id);
                  }}
                  className="flex items-center gap-2.5 px-2 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md w-full text-left transition-colors"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {temFilhos && (
        <ul className="space-y-0.5">
          {pagina.children!.map((c) => (
            <ItemArvore
              key={c.id}
              pagina={c}
              profundidade={profundidade + 1}
              onAddSubpagina={onAddSubpagina}
              onExcluirPagina={onExcluirPagina}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
