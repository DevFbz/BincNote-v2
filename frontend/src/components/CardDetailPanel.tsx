import { useState, useRef, useEffect } from "react";
import { X, FileText, MessageSquare, Sparkles, ChevronDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/cliente";
import { getCell, getValorTexto } from "../api/grids";
import type { Record as GridRecord, Field } from "../api/grids";

interface Props {
  record: GridRecord;
  fields?: Field[];
  databaseId: number;
  onClose: () => void;
  onRefresh: () => void;
  onOpenAI?: () => void;
}

export function CardDetailPanel({ record, fields, databaseId, onClose, onRefresh, onOpenAI }: Props) {
  const tituloField = fields?.find((f) => f.kind === "text" || f.kind === "title");
  const statusField = fields?.find((f) => f.kind === "select");
  const tituloFieldId = tituloField?.id ?? 0;

  const [title, setTitle] = useState(
    record && tituloFieldId ? getValorTexto(record, tituloFieldId) || "" : ""
  );
  const [description, setDescription] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [commentText, setCommentText] = useState("");
  const [visible, setVisible] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400); // Resizable width state

  const titleRef = useRef<HTMLInputElement>(null);

  // Sync title when record changes (e.g., switching between cards)
  useEffect(() => {
    if (record && tituloFieldId) {
      setTitle(getValorTexto(record, tituloFieldId) || "");
    }
  }, [record, tituloFieldId]);

  // Focus the title input on open
  useEffect(() => {
    requestAnimationFrame(() => {
      setVisible(true);
      if (titleRef.current) {
        titleRef.current.focus();
      }
    });
  }, []);

  const queryClient = useQueryClient();

  const titleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!tituloField || !record) return;
      await api.patch(`/grids/cells/${record.id}/${tituloField.id}/`, {
        valor: { text: newTitle },
      });
    },
    onSuccess: () => {
      if (onRefresh) onRefresh();
      else queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!statusField || !record) return;
      await api.patch(`/grids/cells/${record.id}/${statusField.id}/`, {
        valor: { label: newStatus, color: "#9ca3af" },
      });
    },
    onSuccess: () => {
      if (onRefresh) onRefresh();
      else queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
    },
  });

  function handleSaveTitle() {
    if (!record) return;
    if (title.trim() && title !== getValorTexto(record, tituloFieldId)) {
      titleMutation.mutate(title.trim());
    }
  }

  function handleAddComment() {
    if (!commentText.trim()) return;
    setComments((prev) => [...prev, commentText.trim()]);
    setCommentText("");
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  // ── Property rows from all fields ────────────────────────────────
  function renderPropertyRow(field: Field) {
    if (!record) return null;
    const cell = getCell(record, field.id);
    if (!cell) return null;

    if (field.kind === "title" || field.kind === "text") {
      return null; // handled separately as the title
    }

    if (field.kind === "select") {
      return null; // handled by StatusDropdown component
    }

    if (field.kind === "date") {
      const dateStr = cell.valor?.text ?? "";
      return (
        <div key={field.id} className="flex items-center gap-3 py-1.5">
          <span className="text-[11px] text-[#888] w-24 shrink-0">{field.nome}</span>
          <span className="text-[13px] text-[#ddd]">{dateStr || "Vazio"}</span>
        </div>
      );
    }

    if (field.kind === "number" || field.kind === "priority") {
      const priorityLabels: Record<string, string> = {
        "1": "Baixa", "2": "Média", "3": "Alta", "4": "Urgente"
      };
      const val = cell.valor?.text ?? cell.valor?.label ?? "";
      const display = priorityLabels[val] ?? val;
      return (
        <div key={field.id} className="flex items-center gap-3 py-1.5">
          <span className="text-[11px] text-[#888] w-24 shrink-0">{field.nome}</span>
          <span className="text-[13px] text-[#ddd]">{display || "Vazio"}</span>
        </div>
      );
    }

    if (field.kind === "person" || field.kind === "user" || field.kind === "collaborator") {
      const name = cell.valor?.text ?? cell.valor?.label ?? "";
      return (
        <div key={field.id} className="flex items-center gap-3 py-1.5">
          <span className="text-[11px] text-[#888] w-24 shrink-0">{field.nome}</span>
          <span className="text-[13px] text-[#ddd]">{name || "Vazio"}</span>
        </div>
      );
    }

    return (
      <div key={field.id} className="flex items-center gap-3 py-1.5">
        <span className="text-[11px] text-[#888] w-24 shrink-0">{field.nome}</span>
        <span className="text-[13px] text-[#ddd]">
          {cell.valor?.text ?? cell.valor?.label ?? JSON.stringify(cell.valor ?? "")}
        </span>
      </div>
    );
  }

  // Status Dropdown Component
  function StatusDropdown({ record, field, onChange }: { record: GridRecord; field: Field; onChange: (status: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    
    const cell = getCell(record, field.id);
    const currentStatus = cell?.valor?.label ?? "";

    const statusGroups = [
      { group: "A fazer", statuses: ["A fazer"], color: "#9ca3af" },
      { group: "Em andamento", statuses: ["Em andamento", "Aguardando Testes"], color: "#3b82f6" },
      { group: "Concluídos", statuses: ["Concluído"], color: "#10b981" },
    ];

    return (
      <div key={field.id} className="relative">
        <div className="flex items-center gap-3 py-1.5">
          <span className="text-[11px] text-[#888] w-24 shrink-0">{field.nome}</span>
          <div className="flex items-center gap-1.5 flex-1">
            <div className="relative flex-1">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors text-left ${
                  isOpen ? "border-[#3b82f6]" : "border-[#3a3a3a]"
                } bg-[#2a2a2a] hover:bg-[#333]`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusGroups.find(g => g.statuses.includes(currentStatus))?.color || "#9ca3af" }} />
                <span className="text-[13px] text-[#ddd] truncate flex-1">{currentStatus || "Selecione"}</span>
                <ChevronDown size={12} className={`text-[#888] transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg shadow-xl z-50 overflow-hidden">
                  {statusGroups.map((group) => (
                    <div key={group.group} className="py-1">
                      <div className="px-2 py-1 text-[10px] font-medium text-[#888] uppercase tracking-wider border-b border-[#2e2e2e]">
                        {group.group}
                      </div>
                      {group.statuses.map((status) => (
                        <button
                          key={status}
                          onClick={() => { onChange(status); setIsOpen(false); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-[13px] transition-colors ${
                            currentStatus === status ? "bg-[#3b82f6]/20 text-[#3b82f6]" : "text-[#ddd] hover:bg-[#2a2a2a]"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: group.color }} />
                          {status}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity duration-250 ease-out z-40 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full flex flex-col transition-transform duration-250 ease-out shadow-2xl shadow-black/50 z-50 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "#1e1e1e",
          borderLeft: "1px solid #2e2e2e",
          width: panelWidth,
          minWidth: 320,
          maxWidth: 600,
        }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[#3b82f6] hover:bg-opacity-50 transition-colors select-none"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startWidth = panelWidth;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = startWidth + (startX - moveEvent.clientX);
              setPanelWidth(Math.max(320, Math.min(600, newWidth)));
            };
            const onMouseUp = () => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
            };
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          }}
        />
        <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b" style={{ borderColor: "#2e2e2e" }}>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[#888]" />
              <span className="text-[11px] text-[#888]">ID: {record.id}</span>
            </div>
            <div className="flex items-center gap-1">
              {onOpenAI && (
                <button
                  onClick={onOpenAI}
                  className="p-1.5 rounded-lg hover:bg-[#2e2e2e] text-[#888] hover:text-[#a8dcff] transition-colors"
                  title="Assistente IA"
                >
                  <Sparkles size={16} />
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1 rounded-md text-[#888] hover:text-[#fff] hover:bg-[#2e2e2e] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Title */}
          <div>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveTitle();
                }
              }}
              className="w-full bg-transparent outline-none text-xl font-bold text-[#ffffff] placeholder-[#555]"
              placeholder="Sem título"
            />
          </div>

          {/* Properties */}
          {fields && fields.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-[#888] uppercase tracking-wider mb-2">
                Propriedades
              </div>
              <div className="space-y-0.5">
                {fields.map(renderPropertyRow)}
                {/* Status Dropdown */}
                {statusField && (
                  <StatusDropdown
                    record={record}
                    field={statusField}
                    onChange={(newStatus) => statusMutation.mutate(newStatus)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="text-[10px] font-medium text-[#888] uppercase tracking-wider mb-2">
              Descrição
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descrição…"
              rows={6}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ddd] placeholder-[#555] outline-none resize-none focus:border-[#3b82f6] transition-colors"
            />
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={12} className="text-[#888]" />
              <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">
                Comentários
              </span>
            </div>

            <div className="space-y-2 mb-3">
              {comments.length === 0 && (
                <p className="text-xs text-[#555]">Nenhum comentário ainda.</p>
              )}
              {comments.map((c, i) => (
                <div
                  key={i}
                  className="text-sm text-[#ccc] px-3 py-2 rounded-lg bg-[#232323] border border-[#2e2e2e]"
                >
                  {c}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddComment();
                }}
                placeholder="Adicionar comentário…"
                className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-1.5 text-sm text-[#ddd] placeholder-[#555] outline-none focus:border-[#3b82f6] transition-colors"
              />
              <button
                onClick={handleAddComment}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-[#3b82f6] hover:bg-[#2563eb] transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>

          {/* Anotações / Notes field */}
          <div className="mt-6">
            <div className="text-[10px] font-medium text-[#888] uppercase tracking-wider mb-2">
              Anotações
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Escreva suas anotações aqui..."
              rows={10}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ddd] placeholder-[#555] outline-none resize-none focus:border-[#3b82f6] transition-colors"
              onSelect={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const selected = target.value.substring(target.selectionStart, target.selectionEnd);
                if (selected.trim()) {
                  // Emit selection to parent for AI context
                  window.dispatchEvent(new CustomEvent('card-text-selected', { detail: selected }));
                }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
