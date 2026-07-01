import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Plus, FileText, MoreHorizontal } from "lucide-react";

import { api, type Pagina } from "../api/cliente";

export function Pastas() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: pastas, isLoading } = useQuery<Pagina[]>({
    queryKey: ["pastas"],
    queryFn: () => api.get<Pagina[]>("/documents/pages/"),
  });

  const criarPasta = useMutation({
    mutationFn: () => api.post<any>("/documents/pages/", { titulo: "Nova pasta", topo: true }),
    onSuccess: (nova) => {
      qc.invalidateQueries({ queryKey: ["pastas"] });
      qc.invalidateQueries({ queryKey: ["arvore"] });
      navigate(`/pagina/${nova.id}`);
    },
  });

  const pastasFiltradas = (pastas || []).filter(
    (p) => p.titulo && p.titulo.toLowerCase().includes("pasta")
  );

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="px-8 max-w-4xl w-full mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-txt flex items-center gap-3">
              <FolderOpen size={28} className="text-accent" />
              Pastas
            </h1>
            <p className="text-sm text-txt-muted mt-1">Todas as suas pastas organizadas</p>
          </div>
          <button
            onClick={() => criarPasta.mutate()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Nova pasta
          </button>
        </div>

        {isLoading ? (
          <div className="text-txt-muted py-8 text-center">Carregando…</div>
        ) : pastasFiltradas.length === 0 ? (
          <div className="border-2 border-dashed border-surface-4 dark:border-[#3e3e3e] rounded-xl p-12 text-center">
            <FolderOpen size={48} className="text-txt-faint mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-txt mb-2">Nenhuma pasta ainda</h2>
            <p className="text-sm text-txt-muted mb-4">Crie sua primeira pasta para organizar suas páginas</p>
            <button
              onClick={() => criarPasta.mutate()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Criar pasta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastasFiltradas.map((pasta) => (
              <button
                key={pasta.id}
                onClick={() => navigate(`/pagina/${pasta.id}`)}
                className="card p-4 text-left hover:border-accent hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl shrink-0">{pasta.icone || "📁"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-txt truncate">{pasta.titulo}</div>
                    <div className="text-xs text-txt-muted mt-1">
                      {pasta.children?.length || 0} {pasta.children?.length === 1 ? "página" : "páginas"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Quick tips */}
        {pastasFiltradas.length > 0 && (
          <div className="mt-8 p-4 rounded-lg bg-surface-2 dark:bg-[#2e2e2e] border border-surface-4 dark:border-[#3e3e3e]">
            <h3 className="text-sm font-semibold text-txt mb-2">💡 Dica</h3>
            <p className="text-xs text-txt-muted">
              Passe o mouse sobre uma pasta na sidebar e clique no <strong>+</strong> para adicionar páginas dentro dela.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}