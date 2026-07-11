import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wand2, Send, X, RotateCcw, Sparkles, Check,
  ChevronDown, MessageSquarePlus, Minus, Plus,
  SlidersHorizontal, ArrowUp, Search, BarChart3, Filter,
  FileText, Paperclip
} from "lucide-react";
import { api } from "../api/cliente";

// ── Types ─────────────────────────────────────────────────────────────

interface Message {
  id: number;
  conversa: number;
  role: "user" | "assistant" | "system";
  conteudo: string;
  criada_em: string;
}

interface Conversation {
  id: number;
  titulo: string;
  criada_em: string;
  messages: Message[];
}

export interface ContextTag {
  id: string;
  icon: string;
  label: string;
  type: "pagina" | "trecho" | "database" | "arquivo";
  fullText?: string;
}

export interface SuggestionItem {
  icon: string;
  label: string;
  action: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────

const MODEL_OPTIONS = [
  { value: "auto", label: "Automático" },
  { value: "rapido", label: "Rápido" },
  { value: "preciso", label: "Máxima qualidade" },
] as const;

const CONTEXT_ICONS: Record<ContextTag["type"], string> = {
  pagina: "📄",
  trecho: "🔤",
  database: "🗂️",
  arquivo: "📎",
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

// ── ContextTagPill ────────────────────────────────────────────────────

function ContextTagPill({
  tag,
  onRemove,
  onClick,
}: {
  tag: ContextTag;
  onRemove: (id: string) => void;
  onClick: () => void;
}) {
  const [hovering, setHovering] = useState(false);
  const [hoveringX, setHoveringX] = useState(false);

  return (
    <div
      className="relative inline-flex items-center gap-1 max-w-[200px] px-2 py-1 rounded-full text-xs cursor-pointer select-none transition-colors duration-150"
      style={{
        background: "#2A2A2A",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "#D4D4D4",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setHoveringX(false); }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={tag.fullText || tag.label}
    >
      <span className="shrink-0 text-xs leading-none">{tag.icon}</span>

      {/* Label area — truncates */}
      <span className="truncate max-w-[120px]">{tag.label}</span>

      {/* X remove button */}
      <span
        className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full transition-all duration-150 ease"
        style={{
          opacity: hovering ? 1 : 0,
          background: hoveringX ? "rgba(255,255,255,0.1)" : "transparent",
        }}
        onMouseEnter={() => setHoveringX(true)}
        onMouseLeave={() => setHoveringX(false)}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(tag.id);
        }}
      >
        <X size={10} style={{ color: "#9B9B9B" }} />
      </span>

      {/* Reserve space for X to prevent layout shift */}
      <span
        className="shrink-0 w-4 h-4"
        style={{ opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  paginaId?: number;
  paginaTitulo?: string;
  onApplyContent?: (content: string) => void;
  activeCardId?: number | null;
  activeCardTitle?: string;
  selectedText?: string;
  suggestions?: SuggestionItem[];
  contextTags?: ContextTag[];
  onAddContext?: () => void;
  onRemoveContext?: (id: string) => void;
}

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  {
    icon: "🦆",
    label: "Personalize sua IA do BincNote",
    action: () => {},
  },
  {
    icon: "🔍",
    label: "Analisar dados para obter insights",
    action: () => {},
  },
  {
    icon: "📊",
    label: "Criar um gráfico",
    action: () => {},
  },
  {
    icon: "☰",
    label: "Filtrar e ordenar dados",
    action: () => {},
  },
];

export function AIChatPanel({
  isOpen,
  onClose,
  paginaId,
  paginaTitulo,
  onApplyContent,
  activeCardId,
  activeCardTitle,
  selectedText,
  suggestions,
  contextTags: externalContextTags,
  onAddContext,
  onRemoveContext: externalRemoveContext,
}: AIChatPanelProps) {
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [conversaId, setConversaId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingApply, setPendingApply] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [localTags, setLocalTags] = useState<ContextTag[]>([]);

  const activeSuggestions = suggestions ?? DEFAULT_SUGGESTIONS;

  // Merge external + local context tags
  const contextTags = [...(externalContextTags ?? []), ...localTags];

  const handleRemoveContext = useCallback(
    (id: string) => {
      // Try external first
      if (externalRemoveContext) {
        externalRemoveContext(id);
      } else {
        setLocalTags((prev) => prev.filter((t) => t.id !== id));
      }
    },
    [externalRemoveContext]
  );

  // Add selected text as a context tag if present
  useEffect(() => {
    if (selectedText && selectedText.trim()) {
      const exists = contextTags.some(
        (t) => t.type === "trecho" && t.fullText === selectedText
      );
      if (!exists) {
        setLocalTags((prev) => [
          ...prev,
          {
            id: `trecho-${Date.now()}`,
            icon: "🔤",
            label: truncate(selectedText, 40),
            type: "trecho",
            fullText: selectedText,
          },
        ]);
      }
    }
  }, [selectedText]); // only on selectedText change

  // Fetch conversations
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["ai-conversas"],
    queryFn: () => api.get<Conversation[]>("/ai/conversas/"),
    enabled: isOpen,
  });

  // Active conversation messages
  const { data: activeConversation } = useQuery<Conversation>({
    queryKey: ["ai-conversa", conversaId],
    queryFn: () => api.get<Conversation>(`/ai/conversas/${conversaId}/`),
    enabled: Boolean(conversaId) && isOpen,
  });

  // Create new conversation
  const createConversa = useMutation({
    mutationFn: () =>
      api.post<Conversation>("/ai/conversas/", { titulo: "Nova conversa" }),
    onSuccess: (data) => {
      setConversaId(data.id);
      qc.invalidateQueries({ queryKey: ["ai-conversas"] });
    },
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!conversaId) throw new Error("No conversation");
      return api.post<Message>(`/ai/conversas/${conversaId}/chat/`, {
        conteudo: content,
        pagina_id: paginaId,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ai-conversa", conversaId] });
      qc.invalidateQueries({ queryKey: ["ai-conversas"] });
      setPendingApply(null);
      // Auto-apply AI response to notes if content looks substantial
      if (data?.conteudo && onApplyContent) {
        const c = data.conteudo;
        if (c.length > 30 || c.includes("# ") || c.includes("1. ") || c.includes("- ")) {
          onApplyContent(c);
        }
      }
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-create conversation on first open
  useEffect(() => {
    if (isOpen && !conversaId && !showArchived) {
      createConversa.mutate();
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || sendMessage.isPending || !conversaId) return;
    setInputValue("");
    sendMessage.mutate(text);
  }, [inputValue, sendMessage, conversaId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Suggest using suggestion — fill input
  const handleSuggestionClick = useCallback((suggestion: SuggestionItem) => {
    setInputValue(suggestion.label);
    inputRef.current?.focus();
    suggestion.action();
  }, []);

  const messages = activeConversation?.messages ?? [];

  // Check if a message looks like content to apply
  const suggestApply = (content: string): boolean => {
    const lower = content.toLowerCase();
    return (
      content.includes("# ") ||
      content.includes("## ") ||
      content.includes("- ") ||
      content.includes("1. ") ||
      content.includes("| ") ||
      content.length > 100
    );
  };

  const handleApplyContent = (content: string) => {
    onApplyContent?.(content);
    setPendingApply(null);
  };

  if (!isOpen) return null;

  const chatTitle = activeConversation?.titulo || "Novo chat de IA";

  return (
    <div className="absolute pointer-events-none" style={{ bottom: 16, right: 16, zIndex: 9999 }}>
      {/* ── Floating Panel ── */}
      <div
        className="pointer-events-auto flex flex-col shadow-2xl"
        style={{
          width: 450,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          background: "#1F1F1F",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.06)",
          animation: "aichatSlideIn 0.2s ease-out",
        }}
      >
        {/* ════════════ HEADER ════════════ */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            height: 52,
            paddingLeft: 16,
            paddingRight: 12,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Left: title + dropdown */}
          <div className="relative flex items-center gap-1.5 min-w-0">
            <button
              className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity"
              onClick={() => setShowChatDropdown(!showChatDropdown)}
            >
              <span
                className="text-sm font-semibold truncate"
                style={{ color: "#FFFFFF" }}
              >
                {chatTitle}
              </span>
              <ChevronDown size={14} style={{ color: "#9B9B9B", flexShrink: 0 }} />
            </button>

            {/* Chat dropdown */}
            {showChatDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowChatDropdown(false)}
                />
                <div
                  className="absolute top-full left-0 mt-1 w-56 z-50 rounded-xl overflow-hidden"
                  style={{
                    background: "#252525",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setConversaId(null);
                        setShowChatDropdown(false);
                        createConversa.mutate();
                      }}
                      className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded-lg"
                      style={{ color: "#D4D4D4" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Plus size={14} />
                      Novo chat
                    </button>
                  </div>
                  {conversations && conversations.length > 0 && (
                    <>
                      <div
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                        }}
                      />
                      <div className="p-1 max-h-48 overflow-y-auto">
                        {conversations.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setConversaId(c.id);
                              setShowChatDropdown(false);
                            }}
                            className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded-lg text-left"
                            style={{
                              color: conversaId === c.id ? "#FFFFFF" : "#9B9B9B",
                              background:
                                conversaId === c.id
                                  ? "rgba(255,255,255,0.06)"
                                  : "transparent",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(255,255,255,0.06)")
                            }
                            onMouseLeave={(e) => {
                              if (conversaId !== c.id)
                                e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <Sparkles size={14} style={{ color: "#a8dcff" }} />
                            <span className="truncate">{c.titulo}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right: 3 action icons */}
          <div className="flex items-center gap-0.5">
            <button
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#9B9B9B" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#D4D4D4")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "#9B9B9B")
              }
              title="Compartilhar"
            >
              <MessageSquarePlus size={16} />
            </button>
            <button
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#9B9B9B" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#D4D4D4")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "#9B9B9B")
              }
              title="Expandir"
            >
              <span
                className="block"
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid currentColor",
                  borderRadius: 2,
                  position: "relative",
                }}
              >
                <span
                  className="absolute"
                  style={{
                    width: 6,
                    height: 6,
                    background: "#1F1F1F",
                    top: 1,
                    left: 1,
                  }}
                />
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#9B9B9B" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#D4D4D4")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "#9B9B9B")
              }
              title="Fechar"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>

        {/* ════════════ BODY ════════════ */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {messages.length === 0 && !sendMessage.isPending ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center px-6 py-8">
              {/* Avatar */}
              <div
                className="flex items-center justify-center rounded-full mb-5"
                style={{
                  width: 64,
                  height: 64,
                  background: "#3A3A3A",
                }}
              >
                <Sparkles size={28} style={{ color: "#9B9B9B" }} />
              </div>

              {/* Welcome */}
              <h2
                className="text-xl font-bold mb-5 text-center"
                style={{ color: "#FFFFFF" }}
              >
                Como posso lhe ajudar hoje?
              </h2>

              {/* Suggestions */}
              <div className="w-full max-w-sm space-y-2">
                {activeSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors"
                    style={{ color: "#D4D4D4", fontSize: 14 }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.04)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span className="text-base leading-none shrink-0">
                      {s.icon}
                    </span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Messages ── */
            <div className="px-3 py-3 space-y-3">
              {messages
                .filter((m) => m.role !== "system")
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed"
                      style={{
                        background:
                          msg.role === "user" ? "rgba(168,220,255,0.15)" : "#2A2A2A",
                        color: "#FFFFFF",
                        border:
                          msg.role === "assistant"
                            ? "1px solid rgba(255,255,255,0.06)"
                            : "none",
                        borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      }}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {msg.conteudo}
                      </div>

                      {/* Apply button */}
                      {msg.role === "assistant" &&
                        suggestApply(msg.conteudo) &&
                        onApplyContent && (
                          <button
                            onClick={() => handleApplyContent(msg.conteudo)}
                            className="mt-2 flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg w-full transition-colors"
                            style={{
                              background: "rgba(77,171,109,0.15)",
                              color: "#4DAB6D",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(77,171,109,0.25)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(77,171,109,0.15)")
                            }
                          >
                            <Check size={12} />
                            Aplicar conteúdo na página
                          </button>
                        )}
                    </div>
                  </div>
                ))}

              {/* Typing indicator */}
              {sendMessage.isPending && (
                <div className="flex justify-start">
                  <div
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      background: "#2A2A2A",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "14px 14px 14px 4px",
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          background: "#a8dcff",
                          animationDelay: "0ms",
                        }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          background: "#a8dcff",
                          animationDelay: "150ms",
                        }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          background: "#a8dcff",
                          animationDelay: "300ms",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ════════════ CONTEXT TAGS ════════════ */}
        {contextTags.length > 0 && (
          <div
            className="flex flex-wrap gap-1.5 shrink-0 px-4 pt-2 pb-1"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {contextTags.map((tag) => (
              <ContextTagPill
                key={tag.id}
                tag={tag}
                onRemove={handleRemoveContext}
                onClick={onAddContext || (() => {})}
              />
            ))}
          </div>
        )}

        {/* ════════════ INPUT AREA ════════════ */}
        <div className="shrink-0 px-4 pt-2 pb-4">
          <div
            className="rounded-xl transition-colors focus-within:ring-0 focus-within:outline-none"
            style={{
              background: "#2A2A2A",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Text input */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Crie o que quiser com a IA..."
              rows={1}
              className="w-full bg-transparent outline-none resize-none px-3 pt-3 pb-1 text-sm leading-relaxed placeholder-[#8A8A8A]"
              style={{
                color: "#FFFFFF",
                scrollbarWidth: "thin" as any,
                minHeight: 36,
                outline: "none",
                boxShadow: "none",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              {/* Left: attach + settings */}
              <div className="flex items-center gap-0.5">
                <button
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "#9B9B9B" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#D4D4D4")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#9B9B9B")
                  }
                  title="Anexar"
                >
                  <Plus size={15} />
                </button>
                <button
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "#9B9B9B" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#D4D4D4")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#9B9B9B")
                  }
                  title="Configurações"
                >
                  <SlidersHorizontal size={14} />
                </button>
              </div>

              {/* Right: model selector + send */}
              <div className="flex items-center gap-2">
                {/* Model selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
                    style={{ color: "#9B9B9B" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#D4D4D4")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#9B9B9B")
                    }
                  >
                    <span>
                      {MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label ||
                        "Automático"}
                    </span>
                    <ChevronDown size={10} />
                  </button>

                  {showModelDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowModelDropdown(false)}
                      />
                      <div
                        className="absolute bottom-full right-0 mb-1 w-40 z-50 rounded-xl overflow-hidden"
                        style={{
                          background: "#252525",
                          border: "1px solid rgba(255,255,255,0.08)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                      >
                        <div className="p-1">
                          {MODEL_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setSelectedModel(opt.value);
                                setShowModelDropdown(false);
                              }}
                              className="flex items-center gap-2 w-full px-2.5 py-2 text-xs rounded-lg text-left"
                              style={{
                                color:
                                  selectedModel === opt.value
                                    ? "#FFFFFF"
                                    : "#9B9B9B",
                                background:
                                  selectedModel === opt.value
                                    ? "rgba(255,255,255,0.06)"
                                    : "transparent",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(255,255,255,0.06)")
                              }
                              onMouseLeave={(e) => {
                                if (selectedModel !== opt.value)
                                  e.currentTarget.style.background =
                                    "transparent";
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sendMessage.isPending || !conversaId}
                  className="p-1.5 rounded-lg transition-all shrink-0 flex items-center justify-center"
                  style={{
                    width: 30,
                    height: 30,
                    background: inputValue.trim()
                      ? "#DEDEDE"
                      : "rgba(255,255,255,0.06)",
                    color: inputValue.trim() ? "#1F1F1F" : "#555",
                    cursor:
                      inputValue.trim() && !sendMessage.isPending && conversaId
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  <ArrowUp size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aichatSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
