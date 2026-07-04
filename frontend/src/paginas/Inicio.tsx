import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Folder, Layout, FileText, ChevronRight, Clock, Zap } from "lucide-react";
import { api } from "../api/cliente";
import { useArvorePagina } from "../api/paginas";

export function Inicio() {
  const navigate = useNavigate();
  const arvore = useArvorePagina();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentPages = arvore.data?.slice(0, 6) || [];

  const handleCriarPagina = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<any>("/documents/pages/", {
        titulo: "",
        kind: "document",
        topo: true,
      });
      arvore.refetch();
      if (response?.id) {
        navigate(`/pagina/${response.id}`);
      } else {
        setError("Resposta inválida ao criar página.");
      }
    } catch (err) {
      console.error("Erro ao criar página:", err);
      setError("Não foi possível criar a página. Verifique se o servidor está rodando.");
    } finally {
      setLoading(false);
    }
  };

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div
      className="min-h-full flex flex-col"
      style={{ background: "var(--bg-app)", color: "var(--txt)" }}
    >
      {/* Hero section */}
      <div
        className="relative overflow-hidden shrink-0"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          borderBottom: "1px solid var(--divider)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #a8dcff 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }}
        />

        <div className="relative max-w-4xl mx-auto px-8 py-14">
          <p className="text-sm font-medium mb-2" style={{ color: "#a8dcff" }}>
            ✦ {saudacao}!
          </p>
          <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
            Bem-vindo ao <span style={{ color: "#a8dcff" }}>BincNote</span>
          </h1>
          <p className="text-lg mb-8" style={{ color: "#94a3b8" }}>
            Seu espaço de trabalho inteligente. Escreva, organize e colabore — tudo em um só lugar.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCriarPagina}
              disabled={loading}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #a8dcff, #8b5cf6)",
                color: "#0a0a0a",
                boxShadow: "0 4px 24px rgba(168,220,255,0.3)",
              }}
            >
              <Plus size={18} />
              {loading ? "Criando..." : "Nova Página"}
            </button>

            <button
              onClick={() => navigate("/pastas")}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium text-sm border transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.07)",
                borderColor: "rgba(255,255,255,0.15)",
                color: "#e2e8f0",
              }}
            >
              <Folder size={16} />
              Ver Pastas
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-2 inline-block">
              ⚠️ {error}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-8 space-y-10">
        {/* Quick actions */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--txt-muted)" }}>
            <Zap size={12} className="inline mr-1.5" />
            Criar rapidamente
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                icon: "📄",
                label: "Página em branco",
                desc: "Comece do zero",
                action: handleCriarPagina,
                primary: true,
              },
              {
                icon: "📋",
                label: "Kanban",
                desc: "Gestão visual de tarefas",
                action: () => {
                  // Create a page and navigate
                  handleCriarPagina();
                },
              },
              {
                icon: "📁",
                label: "Explorar páginas",
                desc: "Ver todas as suas páginas",
                action: () => navigate("/pastas"),
              },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                disabled={loading && item.primary}
                className="flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-100 group disabled:opacity-60"
                style={{
                  background: "var(--bg-sidebar)",
                  borderColor: "var(--divider)",
                }}
              >
                <span className="text-2xl shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-sm" style={{ color: "var(--txt)" }}>
                    {item.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--txt-muted)" }}>
                    {item.desc}
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className="ml-auto shrink-0 self-center opacity-0 group-hover:opacity-60 transition-opacity"
                  style={{ color: "var(--txt-muted)" }}
                />
              </button>
            ))}
          </div>
        </section>

        {/* Recent pages */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--txt-muted)" }}>
            <Clock size={12} className="inline mr-1.5" />
            Páginas recentes
          </h2>

          {recentPages.length > 0 ? (
            <div className="space-y-1">
              {recentPages.map((pagina) => (
                <button
                  key={pagina.id}
                  onClick={() => navigate(`/pagina/${pagina.id}`)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all duration-150 hover:scale-[1.01] group"
                  style={{
                    background: "var(--bg-sidebar)",
                    borderColor: "var(--divider)",
                  }}
                >
                  <span className="text-lg w-7 text-center shrink-0">
                    {pagina.icone || (pagina.kind === "database" ? "📊" : "📄")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium text-sm truncate"
                      style={{ color: "var(--txt)" }}
                    >
                      {pagina.titulo || "Sem título"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--txt-muted)" }}>
                      {pagina.kind === "database" ? "Banco de dados / Kanban" : "Documento"}
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ color: "var(--txt-muted)" }}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl border-2 border-dashed p-10 text-center"
              style={{ borderColor: "var(--divider)" }}
            >
              <FileText
                size={40}
                className="mx-auto mb-3 opacity-30"
                style={{ color: "var(--txt-muted)" }}
              />
              <p className="font-medium mb-1" style={{ color: "var(--txt)" }}>
                Nenhuma página ainda
              </p>
              <p className="text-sm mb-4" style={{ color: "var(--txt-muted)" }}>
                Crie sua primeira página para começar a organizar suas ideias.
              </p>
              <button
                onClick={handleCriarPagina}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "#a8dcff", color: "#0a0a0a" }}
              >
                <Plus size={16} />
                {loading ? "Criando..." : "Criar primeira página"}
              </button>
            </div>
          )}
        </section>

        {/* Tips */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--txt-muted)" }}>
            <Layout size={12} className="inline mr-1.5" />
            Dicas rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { emoji: "⌨️", tip: "Use a sidebar para navegar entre suas páginas e subpáginas." },
              { emoji: "🖱️", tip: "Clique com botão direito em uma página na sidebar para renomear ou excluir." },
              { emoji: "📐", tip: "Use Templates ao criar uma página para começar com conteúdo rico." },
              { emoji: "🗑️", tip: "Páginas excluídas vão para a Lixeira e podem ser restauradas." },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: "var(--bg-sidebar)", border: "1px solid var(--divider)" }}
              >
                <span className="text-lg shrink-0">{item.emoji}</span>
                <p className="text-xs leading-relaxed" style={{ color: "var(--txt-muted)" }}>
                  {item.tip}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}