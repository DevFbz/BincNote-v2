import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wand2, Send, X, RotateCcw, Sparkles, Check } from "lucide-react";
import { api } from "../api/cliente";

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

// ── Component ────────────────────────────────────────────────────────
interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  paginaId?: number;
  paginaTitulo?: string;
  onApplyContent?: (content: string) => void;
}

export function AIChatPanel({ isOpen, onClose, paginaId, paginaTitulo, onApplyContent }: AIChatPanelProps) {
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [conversaId, setConversaId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingApply, setPendingApply] = useState<string | null>(null);

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
    mutationFn: () => api.post<Conversation>("/ai/conversas/", { titulo: "Nova conversa" }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-conversa", conversaId] });
      qc.invalidateQueries({ queryKey: ["ai-conversas"] });
      setPendingApply(null);
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

  const messages = activeConversation?.messages ?? [];

  // Check if a message looks like content to apply
  const suggestApply = (content: string): boolean => {
    const lower = content.toLowerCase();
    // If it has markdown headings or lists, it's likely content
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

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute top-0 right-0 bottom-0 w-[360px] max-w-[85vw] bg-[#1e1e1e] border-l border-[#2e2e2e] shadow-2xl flex flex-col pointer-events-auto animate-slide-in"
        style={{ animation: "slideIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2e2e2e] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#a8dcff] to-[#8b5cf6] flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-[#ffffff]">Assistente IA</h3>
              {paginaTitulo && (
                <p className="text-[11px] text-[#888] truncate">
                  em "{paginaTitulo}"
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setConversaId(null);
                setShowArchived(false);
                createConversa.mutate();
              }}
              className="p-1.5 rounded-lg hover:bg-[#2e2e2e] text-[#888] hover:text-[#fff] transition-colors"
              title="Nova conversa"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#2e2e2e] text-[#888] hover:text-[#fff] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Conversation selector (when conversations exist) */}
        {!showArchived && conversations && conversations.length > 1 && (
          <div className="flex gap-1 px-3 py-2 border-b border-[#2e2e2e] overflow-x-auto shrink-0">
            <button
              onClick={() => { setConversaId(null); createConversa.mutate(); }}
              className="px-2 py-1 text-xs rounded-md bg-[#a8dcff]/20 text-[#a8dcff] whitespace-nowrap"
            >
              + Nova
            </button>
            {conversations.slice(0, 5).map((c) => (
              <button
                key={c.id}
                onClick={() => setConversaId(c.id)}
                className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                  conversaId === c.id
                    ? "bg-[#3a3a3a] text-[#fff]"
                    : "bg-[#2a2a2a] text-[#999] hover:text-[#fff]"
                }`}
              >
                {c.titulo.slice(0, 20)}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Wand2 size={32} className="text-[#a8dcff] mb-3 opacity-50" />
              <p className="text-sm text-[#ccc] font-medium">O que você quer fazer?</p>
              <p className="text-xs text-[#888] mt-1">
                Peça para formatar anotações, criar um PRD, uma ata de reunião, ou qualquer documento
              </p>
            </div>
          )}

          {messages
            .filter((m) => m.role !== "system")
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm leading-snug ${
                    msg.role === "user"
                      ? "bg-[#a8dcff]/20 text-[#fff] rounded-br-sm"
                      : "bg-[#2a2a2a] text-[#ddd] rounded-bl-sm border border-[#3a3a3a]"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.conteudo}</div>

                  {/* Apply button for assistant messages that look like content */}
                  {msg.role === "assistant" && suggestApply(msg.conteudo) && onApplyContent && (
                    <button
                      onClick={() => handleApplyContent(msg.conteudo)}
                      className="mt-2 flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 transition-colors w-full"
                    >
                      <Check size={12} />
                      Aplicar conteúdo na página
                    </button>
                  )}
                </div>
              </div>
            ))}

          {sendMessage.isPending && (
            <div className="flex justify-start">
              <div className="bg-[#2a2a2a] rounded-xl rounded-bl-sm px-3 py-2.5 border border-[#3a3a3a]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a8dcff] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a8dcff] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a8dcff] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-[#2e2e2e] p-3">
          <div className="flex items-end gap-2 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] p-2 focus-within:border-[#a8dcff]/50 transition-colors">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Formate minhas anotações…"
              rows={1}
              className="flex-1 bg-transparent outline-none text-sm text-[#fff] placeholder-[#888] resize-none max-h-32"
              style={{ scrollbarWidth: "thin" }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessage.isPending || !conversaId}
              className="p-2 rounded-lg bg-[#a8dcff] text-[#191919] hover:bg-[#8dc8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[10px] text-[#666] mt-1.5 px-1">
            O assistente sabe qual página você está editando. Pressione Enter para enviar, Shift+Enter para nova linha.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
