import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRight, Plus, MoreHorizontal, Trash2, Edit3 } from "lucide-react";

import type { Pagina } from "../api/cliente";
import { api } from "../api/cliente";
import { useConfirm } from "./ui/ConfirmDialog";
import { useToast } from "./ui/ConfirmDialog";

export function Sidebar({
  arvore,
  onAddSubpagina,
  onExcluirPagina,
  onRefetch,
}: {
  arvore: Pagina[];
  onAddSubpagina?: (parentId: number) => void;
  onExcluirPagina?: (paginaId: number) => void;
  onRefetch?: () => void;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const { addToast } = useToast();

  if (!arvore.length) {
    return (
      <div className="px-2 py-4 text-center">
        <p className="text-xs text-txt-muted">Nenhuma página ainda.</p>
        <p className="text-[10px] text-txt-faint mt-1">Clique em "Novo" para criar</p>
      </div>
    );
  }
  return (
    <>
      <ul className="space-y-0.5">
        {arvore.map((p) => (
          <ItemArvore
            key={p.id}
            pagina={p}
            profundidade={0}
            onAddSubpagina={onAddSubpagina}
            onExcluirPagina={onExcluirPagina}
            onRefetch={onRefetch}
          />
        ))}
      </ul>
      {ConfirmModal}
    </>
  );
}

function ItemArvore({
  pagina,
  profundidade,
  onAddSubpagina,
  onExcluirPagina,
  onRefetch,
}: {
  pagina: Pagina;
  profundidade: number;
  onAddSubpagina?: (parentId: number) => void;
  onExcluirPagina?: (paginaId: number) => void;
  onRefetch?: () => void;
}) {
  const titulo = pagina.titulo || "Sem título";
  const temFilhos = pagina.children && pagina.children.length > 0;
  const [hover, setHover] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // Rename inline state
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(titulo);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return;
    function close(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [ctxMenu]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const startRename = useCallback(() => {
    setRenameValue(titulo);
    setRenaming(true);
    setCtxMenu(null);
  }, [titulo]);

  const saveRename = useCallback(async () => {
    const newTitle = renameValue.trim();
    if (!newTitle || newTitle === titulo) {
      setRenaming(false);
      return;
    }
    try {
      await api.patch(`/documents/pages/${pagina.id}/`, { titulo: newTitle });
      onRefetch?.();
    } catch (e) {
      console.error("Erro ao renomear:", e);
    }
    setRenaming(false);
  }, [renameValue, titulo, pagina.id, onRefetch]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveRename();
      }
      if (e.key === "Escape") {
        setRenaming(false);
      }
    },
    [saveRename]
  );

  return (
    <li
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-center group">
        {/* NavLink with context menu */}
        <div
          className="flex-1 min-w-0"
          onContextMenu={handleContextMenu}
        >
          <NavLink
            to={`/pagina/${pagina.id}`}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors min-w-0 ${
                isActive
                  ? "bg-surface-1 bg-[#2e2e2e] text-txt font-medium"
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

            {renaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={saveRename}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-[#3a3a3a] text-[#ffffff] text-sm px-1 py-0 rounded outline-none border border-[#a8dcff] min-w-0"
              />
            ) : (
              <span className="truncate">{titulo}</span>
            )}
          </NavLink>
        </div>

        {/* "+" icon */}
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

        {/* "..." menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(!showMenu);
              setCtxMenu(null);
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
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#2e2e2e] rounded-lg shadow-xl border border-surface-4 border-[#3e3e3e] p-1 z-50">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(false);
                    startRename();
                  }}
                  className="flex items-center gap-2.5 px-2 py-2 text-sm text-txt hover:bg-surface-3 dark:hover:bg-[#3e3e3e] rounded-md w-full text-left transition-colors"
                >
                  <Edit3 size={16} className="text-txt-muted" />
                  Renomear
                </button>
                <hr className="border-surface-4 border-[#3e3e3e] mx-2 my-1" />
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

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          {/* Invisible overlay to catch clicks outside */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setCtxMenu(null)} />
          <div
            ref={ctxRef}
            className="fixed z-[9999] w-44 py-1 rounded-xl bg-[#252525] border border-[#3a3a3a] shadow-2xl shadow-black/50 backdrop-blur-sm"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
          <button
            onClick={startRename}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#e0e0e0] hover:bg-[#333] transition-colors"
          >
            <Edit3 size={14} className="text-[#3b82f6]" />
            Editar
          </button>
          <hr className="border-[#3a3a3a] mx-2 my-1" />
          <button
            onClick={async () => {
              setCtxMenu(null);
              const confirmed = await confirm({
                title: `Excluir "${titulo}"?`,
                description: "Essa ação não poderá ser desfeita. A página e todo o seu conteúdo serão removidos permanentemente.",
                confirmLabel: "Excluir",
                variant: "destructive",
              });
              if (confirmed) {
                onExcluirPagina?.(pagina.id);
                addToast("Página excluída", "success");
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#ef4444] hover:bg-[#3a1a1a] transition-colors"
          >
            <Trash2 size={14} />
            Excluir
          </button>
        </div>
      </>
      )}

      {/* Children */}
      {temFilhos && (
        <ul className="space-y-0.5">
          {pagina.children!.map((c) => (
            <ItemArvore
              key={c.id}
              pagina={c}
              profundidade={profundidade + 1}
              onAddSubpagina={onAddSubpagina}
              onExcluirPagina={onExcluirPagina}
              onRefetch={onRefetch}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
