import { useEffect, useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Image as ImageIcon, Smile, ChevronLeft, LayoutTemplate, Lock, Share2, Link2, Star, MoreHorizontal, Sparkles, Database, FileText, FormInput, Wand2, Plus
} from "lucide-react";

import { api, type Pagina } from "../api/cliente";
import { usePagina } from "../api/paginas";
import { buscarDatabasePorPagina, criarTemplateKanban } from "../api/grids";
import { NotionPageEditor } from "../components/blocks/NotionPageEditor";
import { BoardView } from "../components/BoardView";
import { AIChatPanel } from "../components/AIChatPanel";
import { setFavicon, emojiToFavicon } from "../utils/favicon";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { useToast } from "../components/ui/ConfirmDialog";
import {
  ALL_TEMPLATES,
  TEMPLATES,
  preencherTemplate,
  getTemplate,
  gerarConteudoTemplate,
} from "../templates";
import { t } from "../i18n";

const EMOJIS_RAPIDOS = ["📄","📘","✅","🗓️","🗂️","📝","💡","🎯","🚀","📚","🧠","📌","🎨","🔬","📈","🌱","☕","🏠","💼","🎵"];
const CAPAS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
  "linear-gradient(135deg, #fccb90 0%, #e58c88 100%)",
  "linear-gradient(135deg, #d299c2 0%, #fef3bd 100%)",
  "linear-gradient(135deg, #81eda1 0%, #52c5a8 100%)",
];

function useTemplateCategorias() {
  const idsPorCategoria: Record<string, string[]> = {
    "Gestão de Projetos": ["kanban-simples", "kanban-lecom", "sprint-planning", "roadmap", "adr"],
    "Produtividade Pessoal": ["checklist-diario", "planner-semanal", "weekly-review", "metas-mensais"],
    "Corporativo / Equipes": ["ata-reuniao", "pauta-reuniao", "prd", "onboarding", "5w2h", "status-report", "raci"],
    "Brainstorm & Estratégia": ["swot", "mapa-mental", "visao-produto", "ideias"],
    "Dados & Acompanhamento": ["metas-table", "bug-log", "inventario", "pipeline-vendas"],
  };
  const icones: Record<string, string> = {
    "Gestão de Projetos": "📁",
    "Produtividade Pessoal": "✅",
    "Corporativo / Equipes": "🏢",
    "Brainstorm & Estratégia": "💡",
    "Dados & Acompanhamento": "📊",
  };
  return Object.entries(idsPorCategoria).map(([categoria, ids]) => ({
    categoria,
    icone: icones[categoria],
    items: ids.map((id) => {
      const t = getTemplate(id);
      return {
        id: t?.id ?? id,
        nome: t?.nome ?? id,
        descricao: t?.descricao ?? "",
        icone: t?.icone ?? "📄",
      };
    }),
  }));
}

export function PaginaView({ id }: { id: number }) {
  const qc = useQueryClient();
  const { data: pagina, isLoading } = usePagina(id);
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [icone, setIcone] = useState("");
  const [capa, setCapa] = useState("");
  const [status, setStatus] = useState<"ocioso" | "salvando" | "salvo">("ocioso");
  const [abrirEmoji, setAbrirEmoji] = useState(false);
  const [abrirCapa, setAbrirCapa] = useState(false);
  const [dbId, setDbId] = useState<number | null>(null);
  const [mostrarTemplates, setMostrarTemplates] = useState(false);
  const [abrirPainelTemplates, setAbrirPainelTemplates] = useState(false);
  const [aiAberto, setAiAberto] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [showParticular, setShowParticular] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [chatContext, setChatContext] = useState<{ type: 'page'; id: number; title: string } | { type: 'card'; id: number; title: string; pageTitle: string } | null>(null);

  const { confirm, ConfirmModal } = useConfirm();
  const { addToast } = useToast();

  // Check if this is a new page (no content yet)
  const isNewPage = !pagina?.conteudo || (pagina.conteudo as any)?.content?.length === 0;

  // Ref for block editor (used by AI chat panel)
  const blockEditorRef = useRef<{ setContent: (content: any, emitUpdate?: boolean) => void } | null>(null);

  // Card open/close → update chat context (tag ambiente)
  const handleCardChange = useCallback((card: { id: number; title: string } | null) => {
    if (card) {
      setChatContext({ type: 'card', id: card.id, title: card.title, pageTitle: pagina?.titulo ?? "" });
    } else {
      setChatContext(pagina ? { type: 'page', id: pagina.id, title: pagina.titulo } : null);
    }
  }, [pagina]);

  // Initialize chat context when page loads
  useEffect(() => {
    if (pagina && !chatContext) {
      setChatContext({ type: 'page', id: pagina.id, title: pagina.titulo });
    }
  }, [pagina, chatContext]);

  // Listen for text selection from CardDetailPanel
  useEffect(() => {
    const handleSelection = (event: CustomEvent<string>) => {
      setSelectedText(event.detail);
    };
    window.addEventListener('card-text-selected', handleSelection as EventListener);
    return () => window.removeEventListener('card-text-selected', handleSelection as EventListener);
  }, []);

  // Handler functions for page menu
    const renomear = () => {
      if (!pagina) return;
      // Focus the title input to rename
      setShowPageMenu(false);
      const input = document.querySelector('input[placeholder="Nova página"]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    };

    const duplicar = async () => {
      if (!pagina) return;
      setShowPageMenu(false);
      try {
        const novaPagina = await api.post<{ id: number }>("/documents/pages/", {
          titulo: `${pagina.titulo} (cópia)`,
          icone: pagina.icone,
          capa: pagina.capa,
          parent: pagina.parent,
          conteudo: pagina.conteudo,
          kind: pagina.kind,
        });
        qc.invalidateQueries({ queryKey: ["arvore"] });
        navigate(`/pagina/${novaPagina.id}`);
      } catch (e) {
        console.error("Erro ao duplicar:", e);
      }
    };

    const moverLixeira = async () => {
      if (!pagina) return;
      setShowPageMenu(false);
      const confirmed = await confirm({
        title: "Mover esta página para a lixeira?",
        description: "A página será movida para a lixeira e poderá ser restaurada posteriormente.",
        confirmLabel: "Mover",
        variant: "warning",
      });
      if (confirmed) {
        try {
          await api.del(`/documents/pages/${id}/`);
          qc.invalidateQueries({ queryKey: ["arvore"] });
          navigate("/lixeira");
          addToast("Página movida para a lixeira", "success");
        } catch (e) {
          console.error("Erro ao mover para lixeira:", e);
          addToast("Erro ao mover página", "error");
        }
      }
    };

    const criarIrma = async () => {
      if (!pagina) return;
      setShowPageMenu(false);
      try {
        const novaPagina = await api.post<{ id: number }>("/documents/pages/", {
          titulo: "Nova página",
          parent: pagina.parent,
          kind: "page",
        });
        qc.invalidateQueries({ queryKey: ["arvore"] });
        navigate(`/pagina/${novaPagina.id}`);
      } catch (e) {
        console.error("Erro ao criar página irmã:", e);
      }
    };

  useEffect(() => {
    if (pagina?.kind === "database") {
      buscarDatabasePorPagina(pagina.id).then(setDbId);
    } else {
      setDbId(null);
    }
  }, [pagina]);

  useEffect(() => {
    if (pagina) {
      setTitulo(pagina.titulo);
      setIcone(pagina.icone);
      setFavicon(emojiToFavicon(pagina.icone || "📄"));
      setCapa(pagina.capa);
      if (!pagina.conteudo || pagina.conteudo === null) {
        setMostrarTemplates(true);
      } else {
        const c = pagina.conteudo as any;
        if (c.type === "doc" && c.content?.length === 1 && c.content[0]?.type === "paragraph" && (!c.content[0]?.content || c.content[0]?.content?.length === 0)) {
          setMostrarTemplates(true);
        }
      }
    }
  }, [pagina]);

  // Reset favicon when leaving the page
  useEffect(() => {
    return () => {
      // Restore default favicon
      setFavicon("");
      // Remove the link element entirely so browser uses default
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.remove();
    };
  }, []);

  const salvarConteudo = useMutation({
    mutationFn: (conteudo: object) =>
      api.patch(`/documents/pages/${id}/conteudo/`, { conteudo }),
    onMutate: () => setStatus("salvando"),
    onSuccess: () => {
      setStatus("salvo");
      qc.invalidateQueries({ queryKey: ["arvore"] });
      qc.invalidateQueries({ queryKey: ["pagina", id] });
      setTimeout(() => setStatus("ocioso"), 1500);
    },
    onError: () => setStatus("ocioso"),
  });

  const salvar = useMutation({
    mutationFn: (dados: Partial<Pagina>) => api.patch(`/documents/pages/${id}/`, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["arvore"] }),
  });

  async function aplicarTemplate(templateId: string) {
    setMostrarTemplates(false);
    setAbrirPainelTemplates(false);

    // Check if this is a board template
    const tplEntry = ALL_TEMPLATES.find((t) => t.id === templateId);
    if (tplEntry?.isBoard && tplEntry.boardTemplateId) {
      try {
        const result = await criarTemplateKanban(tplEntry.boardTemplateId, tplEntry.nome);
        if (result.pagina_id) {
          navigate(`/pagina/${result.pagina_id}`);
        }
        return;
      } catch (e) {
        console.error("Erro ao criar template kanban:", e);
      }
    }

    const tpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
    const conteudo = preencherTemplate(tpl);
    salvarConteudo.mutate(conteudo);
    if (!pagina?.icone) {
      api.patch(`/documents/pages/${id}/`, { icone: tpl.icone, capa: tpl.capa });
    }
  }

  async function aplicarTemplateSimples(templateIdParam: string) {
    setAbrirPainelTemplates(false);
    const catItem = ALL_TEMPLATES.find((t) => t.id === templateIdParam);
    const nome = catItem?.nome ?? templateIdParam;
    const iconeTpl = catItem?.icone ?? "📄";

    // Board template — create a database via API
    if (catItem?.isBoard && catItem.boardTemplateId) {
      try {
        const boardTemplateId = catItem.boardTemplateId;
        const result = await criarTemplateKanban(boardTemplateId, nome);
        // criarTemplateKanban creates a new page linked to the database
        // Redirect to the new page
        if (result.pagina_id) {
          navigate(`/pagina/${result.pagina_id}`);
        } else {
          // Fallback: just reload this page
          window.location.reload();
        }
        return;
      } catch (e) {
        console.error("Erro ao criar template kanban:", e);
        // Fallback: generate content as a document
        const conteudo = gerarConteudoTemplate(templateIdParam) ?? {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: nome }] },
            { type: "paragraph", content: [{ type: "text", text: catItem?.descricao ?? "" }] },
          ],
        };
        salvarConteudo.mutate(conteudo);
      }
      return;
    }

    // Document template — generate rich content
    const conteudo = gerarConteudoTemplate(templateIdParam) ?? {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: nome }] },
        { type: "paragraph", content: [{ type: "text", text: catItem?.descricao ?? "" }] },
        { type: "paragraph" },
      ],
    };
    salvarConteudo.mutate(conteudo);
    if (!pagina?.icone) {
      api.patch(`/documents/pages/${id}/`, { icone: iconeTpl });
    }
  }

  if (isLoading || !pagina) {
    return <div className="p-8 text-txt-muted">{t("common.loading")}…</div>;
  }

  if (pagina.kind !== "database") {
    return (
      <NotionPageEditor
        pagina={pagina}
        onSave={(updates) => salvar.mutate(updates)}
        onSaveConteudo={(conteudo) => salvarConteudo.mutate(conteudo)}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Cover */}
      {capa && (
        <div className="h-40 w-full relative group shrink-0" style={{ background: capa }}>
          <button
            onClick={() => setAbrirCapa((v) => !v)}
            className="absolute right-3 bottom-3 btn btn-primary backdrop-blur-sm rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-all shadow-lg"
          >
            <ImageIcon size={14} /> {t("page.cover")}
          </button>
          {abrirCapa && (
            <div className="absolute right-3 bottom-16 card p-3 flex flex-wrap gap-2 z-40 shadow-pop-lg bg-[#2e2e2e] border border-surface-4 border-[#3e3e3e]">
              {CAPAS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { setCapa(c); salvar.mutate({ capa: c }); setAbrirCapa(false); }}
                  className="w-14 h-10 rounded-lg border-2 border-transparent hover:border-accent hover:scale-105 transition-all duration-200 shadow-md"
                  style={{ background: c }}
                  title={`Capa ${i + 1}`}
                />
              ))}
              <button
                onClick={() => { setCapa(""); salvar.mutate({ capa: "" }); setAbrirCapa(false); }}
                className="w-14 h-10 rounded-lg border border-surface-4 text-xs text-txt-muted hover:text-danger hover:border-danger transition-colors flex items-center justify-center"
              >
                Remover
              </button>
            </div>
          )}
        </div>
      )}

      {/* Breadcrumb bar - page tab style */}
      <div className="sticky top-0 z-10 bg-[var(--bg-sidebar)] border-b border-[var(--divider)] shrink-0">
        <div className="h-9 flex items-center justify-between px-4">
          {/* Left: breadcrumb */}
          <div className="flex items-center gap-1 min-w-0">
            {pagina.parent ? (
              <button
                onClick={() => navigate(`/pagina/${pagina.parent}`)}
                className="flex items-center gap-1.5 text-xs text-txt-muted hover:text-txt transition-colors shrink-0 p-1 -ml-1 rounded hover:bg-surface-1 hover:bg-[#2e2e2e]"
              >
                <ChevronLeft size={14} />
              </button>
            ) : (
              <ChevronLeft size={14} className="text-txt-faint shrink-0" />
            )}
            <span className="text-xs text-txt-muted truncate">{pagina.titulo || "Nova página"}</span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-0.5">
            {/* Save indicator */}
            <span className={`text-[10px] mr-2 ${status === "salvando" ? "text-accent" : status === "salvo" ? "text-success" : "text-txt-faint"}`}>
              {status === "salvando" ? "Salvando…" : status === "salvo" ? "Salvo" : ""}
            </span>

            {/* Visibility */}
            <div className="relative">
              <button
                onClick={() => setShowParticular(!showParticular)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-txt-muted hover:text-txt hover:bg-surface-1 hover:bg-[#2e2e2e] rounded transition-colors"
              >
                <Lock size={12} />
                Particular
              </button>
              {showParticular && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowParticular(false)} />
                  <div className="absolute top-full right-0 mt-1 w-44 bg-[#2e2e2e] rounded-lg shadow-xl border border-surface-4 border-[#3e3e3e] p-1.5 z-40 text-xs">
                    <div className="px-2 py-1.5 text-txt-muted">Apenas você pode ver esta página</div>
                    <div className="flex items-center gap-2 px-2 py-1.5 text-txt">
                      <Lock size={14} />
                      Particular
                    </div>
                    <button className="w-full text-left px-2 py-1.5 text-txt-muted hover:text-txt hover:bg-surface-3 hover:bg-[#3e3e3e] rounded-md">
                      Compartilhar com equipe…
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Three-dot menu */}
            <div className="relative">
              <button
                onClick={() => setShowPageMenu(!showPageMenu)}
                className="p-1.5 rounded hover:bg-surface-1 hover:bg-[#2e2e2e] text-txt-muted hover:text-txt transition-colors"
                title="Mais opções"
              >
                <MoreHorizontal size={14} />
              </button>
              {showPageMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowPageMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 w-48 bg-[#2e2e2e] rounded-lg shadow-xl border border-surface-4 border-[#3e3e3e] p-1 z-40 text-xs">
                    <button
                      onClick={renomear}
                      className="flex items-center gap-2 px-2 py-1.5 w-full text-left text-txt hover:bg-surface-3 hover:bg-[#3e3e3e] rounded transition-colors"
                    >
                      ✏️ Renomear
                    </button>
                    <button
                      onClick={duplicar}
                      className="flex items-center gap-2 px-2 py-1.5 w-full text-left text-txt hover:bg-surface-3 hover:bg-[#3e3e3e] rounded transition-colors"
                    >
                      📋 Duplicar
                    </button>
                    <div className="border-t border-surface-3 border-[#3e3e3e] my-1" />
                    <button
                      onClick={moverLixeira}
                      className="flex items-center gap-2 px-2 py-1.5 w-full text-left text-danger hover:bg-danger/10 rounded transition-colors"
                    >
                      🗑️ Mover para lixeira
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Plus - create sibling page */}
            <button
              onClick={criarIrma}
              className="p-1.5 rounded hover:bg-surface-1 hover:bg-[#2e2e2e] text-txt-muted hover:text-txt transition-colors"
              title="Nova página"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Page content area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="max-w-6xl mx-auto px-8 py-6 w-full shrink-0">
          {/* Title area with icon */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative shrink-0">
              <button
                onClick={() => setAbrirEmoji((v) => !v)}
                className="text-5xl leading-none hover:opacity-80 transition-opacity p-1 -ml-1 rounded-lg hover:bg-surface-3 hover:bg-[#3e3e3e]"
              >
                {icone || "📄"}
              </button>
              {abrirEmoji && (
                <div className="absolute left-0 top-16 card p-4 z-40 w-80 shadow-xl bg-[#2e2e2e] border border-surface-4 border-[#3e3e3e]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-surface-3 border-[#3e3e3e]">
                    <h3 className="text-sm font-semibold">Escolher ícone</h3>
                    <button onClick={() => setAbrirEmoji(false)} className="text-xs text-txt-muted hover:text-txt p-1 rounded hover:bg-surface-3 hover:bg-[#3e3e3e] transition-colors">✕</button>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {EMOJIS_RAPIDOS.map((e) => (
                      <button
                        key={e}
                        onClick={() => { setIcone(e); setFavicon(emojiToFavicon(e)); salvar.mutate({ icone: e }); setAbrirEmoji(false); }}
                        className="aspect-square text-lg hover:bg-surface-3 hover:bg-[#3e3e3e] rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setIcone(""); setFavicon(emojiToFavicon("📄")); salvar.mutate({ icone: "" }); setAbrirEmoji(false); }}
                    className="mt-3 w-full text-xs text-txt-muted hover:text-danger py-1.5 px-3 rounded-lg hover:bg-danger/10 transition-colors border border-surface-3 border-[#3e3e3e] hover:border-danger/30"
                  >
                    Remover ícone
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <input
                value={titulo}
                placeholder="Nova página"
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={() => {
                  if (titulo !== pagina.titulo) salvar.mutate({ titulo });
                }}
                className="text-4xl font-bold bg-transparent outline-none w-full text-txt placeholder-txt-muted/50"
                style={{ lineHeight: "1.2" }}
              />

              {/* Action pills under title */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => setAbrirEmoji(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-txt-muted hover:text-txt hover:bg-surface-1 hover:bg-[#2e2e2e] border border-surface-4 border-[#3e3e3e] transition-colors"
                >
                  <Smile size={14} />
                  Ícone
                </button>
                <button
                  onClick={() => setAbrirCapa(!abrirCapa)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-txt-muted hover:text-txt hover:bg-surface-1 hover:bg-[#2e2e2e] border border-surface-4 border-[#3e3e3e] transition-colors"
                >
                  <ImageIcon size={14} />
                  {capa ? "Trocar capa" : "Capa"}
                </button>
                <button
                  onClick={() => setAbrirPainelTemplates(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-accent hover:text-white hover:bg-accent hover:border-accent border border-surface-4 border-[#3e3e3e] transition-colors"
                >
                  <LayoutTemplate size={14} />
                  Templates
                </button>
              </div>
            </div>
          </div>

          {/* Comece a usar section for new pages */}
          {isNewPage && pagina.kind !== "database" && (
            <div className="mb-10">
              <p className="text-xs text-txt-faint uppercase tracking-wider mb-3 font-medium">Comece a usar</p>
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-txt-muted hover:text-txt border border-surface-4 border-[#3e3e3e] hover:border-accent hover:bg-surface-1 hover:bg-[#2e2e2e] transition-all">
                  <Sparkles size={16} className="text-accent" />
                  Pedir à IA
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-txt-muted hover:text-txt border border-surface-4 border-[#3e3e3e] hover:border-accent hover:bg-surface-1 hover:bg-[#2e2e2e] transition-all">
                  <FileText size={16} className="text-accent" />
                  Anotações IA
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-txt-muted hover:text-txt border border-surface-4 border-[#3e3e3e] hover:border-accent hover:bg-surface-1 hover:bg-[#2e2e2e] transition-all">
                  <Database size={16} className="text-accent" />
                  Base de dados
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-txt-muted hover:text-txt border border-surface-4 border-[#3e3e3e] hover:border-accent hover:bg-surface-1 hover:bg-[#2e2e2e] transition-all">
                  <FormInput size={16} className="text-accent" />
                  Formulário
                </button>
                <button
                  onClick={() => setAbrirPainelTemplates(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-txt-muted hover:text-txt border border-surface-4 border-[#3e3e3e] hover:border-accent hover:bg-surface-1 hover:bg-[#2e2e2e] transition-all"
                >
                  <LayoutTemplate size={16} className="text-accent" />
                  Modelos
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-txt-muted hover:text-txt border border-surface-4 border-[#3e3e3e] hover:border-accent hover:bg-surface-1 hover:bg-[#2e2e2e] transition-all">
                  <MoreHorizontal size={16} className="text-txt-muted" />
                </button>
              </div>
            </div>
          )}


          {/* Main editor */}
          <div className="px-8 pb-6 flex-1 min-h-[400px]">
            <BoardView databaseId={dbId ?? 0} onOpenAI={() => setAiAberto(true)} onCardChange={handleCardChange} />
          </div>
        </div>

        {/* AI assistant FAB */}
        <button
          onClick={() => setAiAberto(true)}
          className={`fixed bottom-6 right-6 z-[9999] w-11 h-11 rounded-full bg-gradient-to-br from-[#a8dcff] to-[#8b5cf6] shadow-lg shadow-[#a8dcff]/20 border-0 flex items-center justify-center hover:scale-110 hover:shadow-[#a8dcff]/40 transition-all text-white ${aiAberto ? 'opacity-0 pointer-events-none scale-90' : ''}`}
          title="Assistente IA"
        >
          <Sparkles size={18} />
        </button>

        {/* AI Chat Panel */}
        <AIChatPanel
          isOpen={aiAberto}
          onClose={() => setAiAberto(false)}
          paginaId={id}
          paginaTitulo={pagina?.titulo ?? ""}
          selectedText={selectedText}
          activeCardId={chatContext?.type === 'card' ? chatContext.id : null}
          activeCardTitle={chatContext?.type === 'card' ? chatContext.title : undefined}
          contextTags={[
            chatContext?.type === 'card'
              ? { id: 'card-' + chatContext.id, label: chatContext.title, icon: '📇', type: 'database' as const, fullText: `Card: ${chatContext.title} (${chatContext.pageTitle})` }
              : { id: 'page-' + (pagina?.id ?? id), label: pagina?.titulo ?? '', icon: pagina?.icone || '📄', type: 'pagina' as const },
          ]}
          suggestions={
            pagina?.kind === 'database'
              ? [
                  { icon: '📊', label: 'Gerar Relatório SLA', action: () => {} },
                  { icon: '🔍', label: 'Analisar dados para obter insights', action: () => {} },
                  { icon: '📋', label: 'Resumir este quadro', action: () => {} },
                ]
              : undefined
          }
          onApplyContent={(content) => {
            // Also dispatch event for CardDetailPanel (notes editor)
            window.dispatchEvent(new CustomEvent('apply-notes-content', { detail: content }));
            if (blockEditorRef.current) {
              blockEditorRef.current.setContent(content, true);
            }
            setAiAberto(false);
          }}
        />
      </div>

      {/* Categorized Template Panel */}
      {abrirPainelTemplates && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setAbrirPainelTemplates(false)}>
          <div
            className="bg-[#1e1e1e] rounded-xl shadow-2xl border border-surface-4 border-[#3e3e3e] w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-4 border-[#3e3e3e] shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-txt">Escolher template</h2>
                <p className="text-sm text-txt-muted mt-0.5">Modelos para agilizar seu trabalho</p>
              </div>
              <button
                onClick={() => setAbrirPainelTemplates(false)}
                className="p-1.5 rounded-md hover:bg-surface-3 hover:bg-[#3e3e3e] text-txt-muted hover:text-txt transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {useTemplateCategorias().map((cat) => (
                <div key={cat.categoria}>
                  <h3 className="text-sm font-semibold text-txt flex items-center gap-2 mb-3">
                    <span>{cat.icone}</span>
                    <span>{cat.categoria}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => aplicarTemplateSimples(item.id)}
                        className="flex items-start gap-3 p-3 rounded-lg border border-surface-4 border-[#3e3e3e] hover:border-accent hover:bg-surface-2 hover:bg-[#2e2e2e] transition-all text-left group"
                      >
                        <span className="text-2xl shrink-0 mt-0.5">{item.icone}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-txt group-hover:text-accent transition-colors">{item.nome}</div>
                          <div className="text-xs text-txt-muted mt-0.5">{item.descricao}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {ConfirmModal}
    </div>
  );
}