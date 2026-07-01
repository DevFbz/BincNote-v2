import { useState, useCallback } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Search, Plus, FileText, ChevronRight, Trash2, HelpCircle, Lightbulb, Keyboard, X } from "lucide-react";

import { useArvorePagina } from "../api/paginas";
import { api } from "../api/cliente";
import { useUI } from "../stores/ui";
import { Sidebar } from "./Sidebar";

function AjudaModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-surface-4 dark:border-[#3e3e3e] w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-4 dark:border-[#3e3e3e] shrink-0">
          <div className="flex items-center gap-3">
            <HelpCircle size={22} className="text-accent" />
            <div>
              <h2 className="text-lg font-semibold text-txt">Ajuda</h2>
              <p className="text-sm text-txt-muted">Tire o máximo do BincNote</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-3 dark:hover:bg-[#3e3e3e] text-txt-muted hover:text-txt transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <Section icon={<Lightbulb size={18} />} title="Primeiros passos">
            <p>Crie páginas usando o botão <strong>Novo</strong> no final da sidebar.</p>
            <p>Organize suas páginas para manter tudo no lugar.</p>
          </Section>

          <Section icon={<Keyboard size={18} />} title="Atalhos de teclado">
            <ul className="space-y-1.5">
              <li className="flex justify-between"><kbd className="px-1.5 py-0.5 rounded bg-surface-3 dark:bg-[#3e3e3e] text-xs text-txt-muted font-mono">⌘K</kbd><span className="text-txt-muted">Busca rápida</span></li>
              <li className="flex justify-between"><kbd className="px-1.5 py-0.5 rounded bg-surface-3 dark:bg-[#3e3e3e] text-xs text-txt-muted font-mono">⌘N</kbd><span className="text-txt-muted">Nova página</span></li>
              <li className="flex justify-between"><kbd className="px-1.5 py-0.5 rounded bg-surface-3 dark:bg-[#3e3e3e] text-xs text-txt-muted font-mono">⌘S</kbd><span className="text-txt-muted">Salvar</span></li>
              <li className="flex justify-between"><kbd className="px-1.5 py-0.5 rounded bg-surface-3 dark:bg-[#3e3e3e] text-xs text-txt-muted font-mono">⌘/</kbd><span className="text-txt-muted">Atalhos</span></li>
            </ul>
          </Section>

          <Section icon={<FileText size={18} />} title="Templates úteis">
            <p>Ao editar uma página, clique em <strong>Templates</strong> para escolher entre diversos modelos:</p>
            <ul className="list-disc pl-4 space-y-1 text-txt-muted">
              <li>Kanban, Sprint Planning, Roadmap</li>
              <li>Checklist, Planner semanal, OKRs</li>
              <li>Ata de reunião, PRD, 5W2H, RACI</li>
              <li>SWOT, Mapa mental, Pipeline de vendas</li>
            </ul>
          </Section>

          <Section icon={<Trash2 size={18} />} title="Lixeira">
            <p>Itens excluídos vão para a <strong>Lixeira</strong>. Você pode restaurá-los ou removê-los permanentemente.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="pb-3 border-b border-surface-4 dark:border-[#3e3e3e] last:border-0 last:pb-0">
      <h3 className="text-sm font-semibold text-txt flex items-center gap-2 mb-2">
        <span className="text-accent">{icon}</span>
        {title}
      </h3>
      <div className="text-xs text-txt-muted space-y-1.5 leading-relaxed">{children}</div>
    </div>
  );
}

export function Layout() {
  const aberta = useUI((s) => s.sidebarAberta);
  const toggle = useUI((s) => s.toggleSidebar);
  const arvore = useArvorePagina();
  const navigate = useNavigate();
  const [showNovoMenu, setShowNovoMenu] = useState(false);
  const [showAjuda, setShowAjuda] = useState(false);

  async function criarPagina() {
    setShowNovoMenu(false);
    try {
      const nova = await api.post<any>("/documents/pages/", { titulo: "", topo: true });
      arvore.refetch();
      if (nova?.id) navigate(`/pagina/${nova.id}`);
    } catch (e) {
      console.error("Erro ao criar página:", e);
    }
  }

  const excluirPagina = useCallback(async (paginaId: number) => {
    try {
      await api.del(`/documents/pages/${paginaId}/`);
      arvore.refetch();
    } catch (e) {
      console.error("Erro ao excluir página:", e);
    }
  }, [arvore]);

  const adicionarSubpagina = useCallback(async (parentId: number) => {
    try {
      const nova = await api.post<any>("/documents/pages/", {
        titulo: "Nova página",
        parent: parentId,
        kind: "page",
      });
      arvore.refetch();
      if (nova?.id) navigate(`/pagina/${nova.id}`);
    } catch (e) {
      console.error("Erro ao criar subpágina:", e);
    }
  }, [arvore, navigate]);

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: "var(--bg-app)" }}>
      {/* Sidebar */}
      <aside
        className={`w-64 shrink-0 flex flex-col border-r transition-all duration-300 ease-in-out ${
          !aberta ? '-translate-x-full absolute left-0 z-50 h-full' : 'translate-x-0 relative'
        }`}
        style={{ background: "var(--bg-sidebar)", borderColor: "var(--divider)" }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 h-11 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#a8dcff] grid place-items-center text-xs font-bold text-black">B</span>
            <span className="text-sm text-txt font-semibold truncate">BincNote</span>
          </div>
          <button onClick={toggle} className="p-1 rounded-md hover:bg-surface-1 dark:hover:bg-[#2e2e2e] text-txt-muted transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 shrink-0">
          <div className="notion-divider" />
        </div>
        <div className="px-2 pb-2 shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-1 dark:bg-[#2e2e2e] text-sm">
            <Search size={14} className="text-txt-muted shrink-0" />
            <input
              placeholder="Buscar páginas e pastas…"
              className="bg-transparent outline-none w-full text-txt placeholder-txt-muted text-sm"
            />
            <kbd className="text-[10px] px-1 py-0.5 rounded bg-surface-3 dark:bg-[#3e3e3e] text-txt-muted shrink-0 font-mono">⌘K</kbd>
          </div>
        </div>

        {/* Sidebar navigation */}
        <div className="flex-1 overflow-y-auto px-1.5 text-sm space-y-0.5">
          <button
            onClick={() => setShowAjuda(true)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-txt-muted hover:bg-surface-1 dark:hover:bg-[#2e2e2e] hover:text-txt transition-colors w-full text-left"
          >
            <HelpCircle size={16} className="shrink-0" />
            <span>Ajuda</span>
          </button>
          <NavLink
            to="/lixeira"
            className={({ isActive }) =>
              `flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-surface-1 dark:bg-[#2e2e2e] text-txt font-medium"
                  : "text-txt-muted hover:bg-surface-1 dark:hover:bg-[#2e2e2e] hover:text-txt"
              }`
            }
          >
            <Trash2 size={16} className="shrink-0" />
            <span>Lixeira</span>
          </NavLink>

          {/* Divider */}
          <div className="notion-divider my-2" />

          {/* Page tree */}
          <div className="text-[11px] font-medium text-txt-faint uppercase tracking-wider px-2 mb-1">Páginas</div>
          <Sidebar
            arvore={arvore.data ?? []}
            onAddSubpagina={adicionarSubpagina}
            onExcluirPagina={excluirPagina}
          />
        </div>

        {/* Bottom - Novo button */}
        <div className="px-2 py-2 shrink-0 border-t border-surface-4 dark:border-[#2e2e2e]">
          <div className="relative">
            <button
              onClick={() => setShowNovoMenu(!showNovoMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left text-sm text-txt hover:bg-surface-1 dark:hover:bg-[#2e2e2e] transition-colors font-medium"
            >
              <span className="w-5 h-5 rounded bg-surface-1 dark:bg-[#2e2e2e] flex items-center justify-center shrink-0 border border-surface-4 dark:border-[#3e3e3e]">
                <Plus size={14} />
              </span>
              Novo
            </button>

            {showNovoMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNovoMenu(false)} />
                <div className="absolute bottom-full left-2 mb-1.5 w-56 bg-white dark:bg-[#2e2e2e] rounded-lg shadow-xl border border-surface-4 dark:border-[#3e3e3e] p-1.5 z-50">
                  <div className="text-xs font-medium text-txt-muted px-2 py-1.5 uppercase tracking-wider">Criar novo</div>
                  <button
                    onClick={criarPagina}
                    className="flex items-center gap-2.5 px-2 py-2 text-sm text-txt hover:bg-surface-3 dark:hover:bg-[#3e3e3e] rounded-md w-full text-left transition-colors"
                  >
                    <FileText size={18} className="text-txt-muted shrink-0" />
                    Página
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!aberta && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggle} />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative" style={{ background: "var(--bg-app)" }}>
        {!aberta && (
          <button
            onClick={toggle}
            className="absolute top-2 left-2 z-10 p-1.5 rounded-md bg-surface-1 dark:bg-[#2e2e2e] border border-surface-4 dark:border-[#3e3e3e] hover:bg-surface-3 dark:hover:bg-[#3e3e3e] transition-colors text-txt-muted"
          >
            <ChevronRight size={16} />
          </button>
        )}
        <Outlet />
      </main>

      {/* Ajuda Modal */}
      {showAjuda && <AjudaModal onClose={() => setShowAjuda(false)} />}
    </div>
  );
}