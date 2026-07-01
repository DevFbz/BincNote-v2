import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  FileText,
  Edit3,
  Palette,
  Check,
  X,
} from "lucide-react";

import { api } from "../api/cliente";
import { useRecords, useDatabaseDetail, getValorTexto, getCell } from "../api/grids";
import type { Record as GridRecord } from "../api/grids";

// ── Column configuration ──────────────────────────────────────────────
const DEFAULT_COLUMNS = [
  { id: "a-fazer",          nome: "A fazer",           dot: "#9ca3af", bg: "#1e1e1e", border: "#2e2e2e" },
  { id: "em-andamento",     nome: "Em andamento",      dot: "#3b82f6", bg: "#1a1e2e", border: "#2a2e3e" },
  { id: "aguardando-testes",nome: "Aguardando Testes", dot: "#8b5cf6", bg: "#1e1a2e", border: "#2e2a3e" },
  { id: "concluido",        nome: "Concluído",          dot: "#10b981", bg: "#1a2a1e", border: "#2a3a2e" },
] as const;

const COLUMN_STATUS_MAP: Record<string, string> = {
  "a-fazer":           "A fazer",
  "em-andamento":      "Em andamento",
  "aguardando-testes": "Aguardando Testes",
  "concluido":         "Concluído",
};

const REVERSE_STATUS_MAP = Object.fromEntries(
  Object.entries(COLUMN_STATUS_MAP).map(([k, v]) => [v, k])
);

// ── Card colors for the palette ──────────────────────────────────────
const CARD_COLORS = [
  { label: "Padrão",  value: null },
  { label: "Vermelho",value: "#ef4444" },
  { label: "Laranja", value: "#f97316" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Verde",   value: "#22c55e" },
  { label: "Ciano",   value: "#06b6d4" },
  { label: "Azul",    value: "#3b82f6" },
  { label: "Roxo",    value: "#8b5cf6" },
  { label: "Rosa",    value: "#ec4899" },
];

interface BoardCard {
  id: number;
  titulo: string;
  status: string;
  cor?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────
export function BoardView({ databaseId }: { databaseId: number }) {
  const queryClient = useQueryClient();
  const { data: db } = useDatabaseDetail(databaseId);
  const { data: records } = useRecords(databaseId);

  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    card: BoardCard;
  } | null>(null);

  // Edit modal state
  const [editCard, setEditCard] = useState<BoardCard | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);

  // Track which column is being dragged over (for highlight)
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);

  const ctxRef = useRef<HTMLDivElement>(null);

  // Find fields
  const tituloField = db?.fields?.find((f) => f.kind === "text" || f.kind === "title");
  const statusField = db?.fields?.find((f) => f.kind === "select");
  const tituloFieldId = tituloField?.id ?? 0;
  const statusFieldId = statusField?.id ?? 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  // Convert records to BoardCards
  const allCards: BoardCard[] = (records ?? []).map((r) => {
    const cor = getCellValue(r, tituloFieldId)?.cor ?? null;
    return {
      id: r.id,
      titulo: tituloFieldId ? getValorTexto(r, tituloFieldId) || "Sem título" : "Sem título",
      status: getSelectValue(r, statusFieldId) || "A fazer",
      cor,
    };
  });

  const getCardsByColumn = useCallback(
    (colId: string) => {
      const statusName = COLUMN_STATUS_MAP[colId];
      return allCards.filter((c) => c.status === statusName);
    },
    [allCards]
  );

  // ── Mutations ────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({
      recordId,
      newStatus,
    }: {
      recordId: number;
      newStatus: string;
    }) => {
      if (!statusField) return;
      await api.patch(`/grids/cells/${recordId}/${statusField.id}/`, {
        valor: { label: newStatus, color: "#9ca3af" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
    },
  });

  const deleteRecord = useMutation({
    mutationFn: async (recordId: number) => {
      await api.del(`/grids/records/${recordId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
      queryClient.invalidateQueries({ queryKey: ["db", databaseId] });
    },
  });

  const addRecord = useMutation({
    mutationFn: async ({
      titulo,
      status,
    }: {
      titulo: string;
      status: string;
    }) => {
      const r = await api.post<GridRecord>(
        `/grids/databases/${databaseId}/records/`,
        {}
      );
      if (tituloField) {
        await api.patch(`/grids/cells/${r.id}/${tituloField.id}/`, {
          valor: { text: titulo },
        });
      }
      if (statusField) {
        await api.patch(`/grids/cells/${r.id}/${statusField.id}/`, {
          valor: { label: status, color: "#9ca3af" },
        });
      }
      return r;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
    },
  });

  const updateTitle = useMutation({
    mutationFn: async ({
      recordId,
      titulo,
    }: {
      recordId: number;
      titulo: string;
    }) => {
      if (!tituloField) return;
      await api.patch(`/grids/cells/${recordId}/${tituloField.id}/`, {
        valor: { text: titulo },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
    },
  });

  const updateColor = useMutation({
    mutationFn: async ({
      recordId,
      cor,
    }: {
      recordId: number;
      cor: string | null;
    }) => {
      if (!tituloField) return;
      // We store the color in the title cell's valor alongside text
      const cell = (records ?? [])
        .find((r) => r.id === recordId)
        ?.cells?.find((c) => c.field === tituloField.id);
      const currentText = cell?.valor?.text ?? "";
      await api.patch(`/grids/cells/${recordId}/${tituloField.id}/`, {
        valor: { text: currentText, cor },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
    },
  });

  // ── Drag handlers ────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const card = allCards.find((c) => c.id === Number(active.id));
    if (card) setActiveCard(card);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (over && COLUMN_STATUS_MAP[over.id as string]) {
      setDraggedOverCol(over.id as string);
    } else {
      setDraggedOverCol(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    setDraggedOverCol(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = Number(active.id);
    let targetColId: string | null = null;

    if (COLUMN_STATUS_MAP[over.id as string]) {
      targetColId = over.id as string;
    } else {
      const overCard = allCards.find((c) => c.id === Number(over.id));
      if (overCard) {
        targetColId = REVERSE_STATUS_MAP[overCard.status] ?? null;
      }
    }

    if (!targetColId) return;
    const newStatus = COLUMN_STATUS_MAP[targetColId];
    const card = allCards.find((c) => c.id === cardId);
    if (!card || card.status === newStatus) return;

    updateStatus.mutate({ recordId: cardId, newStatus });
  }

  async function handleAddCard(columnId: string) {
    if (!inputText.trim()) return;
    const statusName = COLUMN_STATUS_MAP[columnId];
    addRecord.mutate({ titulo: inputText.trim(), status: statusName });
    setInputText("");
    setAddingTo(null);
  }

  async function handleDeleteCard(cardId: number) {
    if (window.confirm("Excluir este cartão?")) {
      deleteRecord.mutate(cardId);
    }
    setCtxMenu(null);
    setEditCard(null);
  }

  // ── Context menu handlers ────────────────────────────────────────
  function handleContextMenu(e: React.MouseEvent, card: BoardCard) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, card });
  }

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    }
    if (ctxMenu) {
      document.addEventListener("mousedown", close);
      return () => document.removeEventListener("mousedown", close);
    }
  }, [ctxMenu]);

  // ── Edit modal handlers ──────────────────────────────────────────
  function openEdit(card: BoardCard) {
    setEditCard(card);
    setEditTitle(card.titulo);
    // Try to get existing color from the cell
    const cell = (records ?? [])
      .find((r) => r.id === card.id)
      ?.cells?.find((c) => c.field === tituloFieldId);
    setEditColor(cell?.valor?.cor ?? null);
    setCtxMenu(null);
  }

  function saveEdit() {
    if (!editCard) return;
    if (editTitle.trim() && editTitle !== editCard.titulo) {
      updateTitle.mutate({ recordId: editCard.id, titulo: editTitle.trim() });
    }
    if (editColor !== getCardColor(editCard)) {
      updateColor.mutate({ recordId: editCard.id, cor: editColor });
    }
    setEditCard(null);
  }

  function getCardColor(card: BoardCard): string | null {
    const cell = (records ?? [])
      .find((r) => r.id === card.id)
      ?.cells?.find((c) => c.field === tituloFieldId);
    return cell?.valor?.cor ?? null;
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full bg-[#191919] select-none"
      onClick={() => setCtxMenu(null)}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-6 py-2.5 border-b shrink-0"
        style={{ borderColor: "#2e2e2e" }}
      >
        <h2 className="font-semibold text-sm text-[#ffffff]">
          {db?.nome ?? "Quadro Kanban"}
        </h2>
        <span className="text-xs text-[#cccccc]">
          {allCards.length} {allCards.length === 1 ? "cartão" : "cartões"}
        </span>
        <div className="flex-1" />
        <span className="text-xs text-[#888]">Banco #{databaseId}</span>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto p-5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-4 h-full items-start">
            {DEFAULT_COLUMNS.map((col) => (
              <Column
                key={col.id}
                column={col}
                cards={getCardsByColumn(col.id)}
                isAdding={addingTo === col.id}
                inputText={inputText}
                isDragOver={draggedOverCol === col.id}
                onInputChange={setInputText}
                onStartAdd={() => {
                  setInputText("");
                  setAddingTo(col.id);
                }}
                onConfirmAdd={() => handleAddCard(col.id)}
                onCancelAdd={() => setAddingTo(null)}
                onDelete={handleDeleteCard}
                onContextMenu={handleContextMenu}
                onClickCard={openEdit}
                getCardColor={getCardColor}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="w-72 p-3 bg-[#2a2a2a] rounded-xl border-2 border-[#a8dcff] shadow-2xl shadow-[#a8dcff]/30 rotate-2 scale-105 opacity-95">
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-[#a8dcff] mt-0.5 shrink-0" />
                  <span className="text-sm font-medium text-[#ffffff] leading-snug">
                    {activeCard.titulo}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* ── Right-click Context Menu ─────────────────────────────── */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="fixed z-50 w-44 py-1 rounded-xl bg-[#252525] border border-[#3a3a3a] shadow-2xl shadow-black/50 backdrop-blur-sm"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button
            onClick={() => openEdit(ctxMenu.card)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#e0e0e0] hover:bg-[#333] transition-colors"
          >
            <Edit3 size={14} className="text-[#3b82f6]" />
            Editar
          </button>
          <button
            onClick={() => {
              setEditCard(ctxMenu.card);
              const cell = (records ?? [])
                .find((r) => r.id === ctxMenu.card.id)
                ?.cells?.find((c) => c.field === tituloFieldId);
              setEditColor(cell?.valor?.cor ?? null);
              setEditTitle(ctxMenu.card.titulo);
              setCtxMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#e0e0e0] hover:bg-[#333] transition-colors"
          >
            <Palette size={14} className="text-[#8b5cf6]" />
            Cor
          </button>
          <hr className="border-[#3a3a3a] mx-2 my-1" />
          <button
            onClick={() => {
              if (window.confirm(`Excluir "${ctxMenu.card.titulo}"?`)) {
                handleDeleteCard(ctxMenu.card.id);
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#ef4444] hover:bg-[#3a1a1a] transition-colors"
          >
            <Trash2 size={14} />
            Excluir
          </button>
        </div>
      )}

      {/* ── Card Edit Modal ──────────────────────────────────────── */}
      {editCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setEditCard(null)}
        >
          <div
            className="w-80 p-5 rounded-xl bg-[#1e1e1e] border border-[#3a3a3a] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[#ffffff] mb-4">
              Editar cartão
            </h3>

            {/* Title */}
            <label className="text-xs text-[#888] mb-1 block">Nome</label>
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditCard(null);
              }}
              className="w-full px-3 py-2 rounded-lg bg-[#2a2a2a] border border-[#3a3a3a] text-sm text-[#ffffff] outline-none focus:border-[#a8dcff] transition-colors mb-4"
            />

            {/* Color palette */}
            <label className="text-xs text-[#888] mb-2 block">Cor</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CARD_COLORS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => setEditColor(c.value)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    c.value
                      ? "hover:scale-110"
                      : "bg-[#2a2a2a] border border-[#3a3a3a]"
                  } ${editColor === c.value ? "ring-2 ring-[#a8dcff] ring-offset-2 ring-offset-[#1e1e1e]" : ""}`}
                  title={c.label}
                  style={c.value ? { background: c.value } : undefined}
                >
                  {!c.value && (
                    <span className="text-[#666] text-xs">—</span>
                  )}
                  {editColor === c.value && (
                    <Check
                      size={10}
                      className={c.value ? "text-white" : "text-[#a8dcff]"}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setEditCard(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-[#fff] hover:bg-[#2a2a2a] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: "#3b82f6" }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper to get cell value (including cor) ──────────────────────────
function getCellValue(
  record: GridRecord,
  fieldId: number
): { text?: string; cor?: string | null } | null {
  return getCell(record, fieldId)?.valor ?? null;
}

// ── Column Component ─────────────────────────────────────────────────
function Column({
  column,
  cards,
  isAdding,
  inputText,
  isDragOver,
  onInputChange,
  onStartAdd,
  onConfirmAdd,
  onCancelAdd,
  onDelete,
  onContextMenu,
  onClickCard,
  getCardColor,
}: {
  column: typeof DEFAULT_COLUMNS[number];
  cards: BoardCard[];
  isAdding: boolean;
  inputText: string;
  isDragOver: boolean;
  onInputChange: (t: string) => void;
  onStartAdd: () => void;
  onConfirmAdd: () => void;
  onCancelAdd: () => void;
  onDelete: (id: number) => void;
  onContextMenu: (e: React.MouseEvent, card: BoardCard) => void;
  onClickCard: (card: BoardCard) => void;
  getCardColor: (card: BoardCard) => string | null;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border max-h-full min-w-0 transition-all duration-300 ${
        isDragOver ? "scale-[1.02] shadow-lg" : ""
      }`}
      style={{
        background: isDragOver ? "#2a2a2a" : column.bg,
        borderColor: isDragOver ? column.dot : column.border,
        boxShadow: isDragOver ? `0 0 20px ${column.dot}22` : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
        style={{ borderColor: column.border }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: column.dot }}
        />
        <span className="text-sm font-semibold text-[#ffffff] flex-1 truncate">
          {column.nome}
        </span>
        <span
          className="text-xs text-[#cccccc] px-1.5 py-0.5 rounded-full min-w-[22px] text-center font-medium"
          style={{ background: column.border }}
        >
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        <SortableContext
          items={cards.map((c) => String(c.id))}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <DraggableCard
              key={card.id}
              card={card}
              accentColor={getCardColor(card)}
              onDelete={() => onDelete(card.id)}
              onContextMenu={(e) => onContextMenu(e, card)}
              onClick={() => onClickCard(card)}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && !isAdding && (
          <div className="text-xs text-[#888] text-center py-4">
            Nenhum cartão
          </div>
        )}

        {/* Add input */}
        {isAdding && (
          <div
            className="p-2 rounded-lg transition-all"
            style={{ background: column.border }}
          >
            <input
              autoFocus
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirmAdd();
                if (e.key === "Escape") onCancelAdd();
              }}
              placeholder="Título do cartão…"
              className="w-full bg-transparent outline-none text-sm text-[#ffffff] placeholder-[#888] mb-2"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={onConfirmAdd}
                className="flex-1 px-2 py-1 rounded text-xs font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: column.dot }}
              >
                Adicionar
              </button>
              <button
                onClick={onCancelAdd}
                className="p-1 rounded text-[#888] hover:text-[#ffffff] hover:bg-black/20 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isAdding && (
        <button
          onClick={onStartAdd}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#cccccc] hover:text-[#ffffff] hover:bg-black/10 transition-all rounded-b-xl border-t"
          style={{ borderColor: column.border }}
        >
          <Plus size={14} />
          Nova página
        </button>
      )}
    </div>
  );
}

// ── Draggable Card ───────────────────────────────────────────────────
function DraggableCard({
  card,
  accentColor,
  onDelete,
  onContextMenu,
  onClick,
}: {
  card: BoardCard;
  accentColor: string | null;
  onDelete: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(card.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition
      ? `${transition}, box-shadow 0.2s ease, transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)`
      : undefined,
    opacity: isDragging ? 0.35 : 1,
    borderColor: accentColor ?? "#3a3a3a",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 rounded-xl bg-[#2a2a2a] border border-[#3a3a3a] hover:border-[#555] hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-grab active:cursor-grabbing group"
      {...attributes}
      {...listeners}
      onContextMenu={onContextMenu}
      onClick={(e) => {
        // Only trigger click if we didn't drag
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          size={14}
          className="text-[#666] mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
        />
        {/* Accent stripe */}
        {accentColor && (
          <span
            className="w-1 rounded-full shrink-0 mt-0.5"
            style={{ background: accentColor, height: "1.2em" }}
          />
        )}
        <FileText
          size={14}
          className="mt-0.5 shrink-0"
          style={{ color: accentColor ? accentColor : "#ffffff/70" }}
        />
        <span className="text-sm leading-snug flex-1 min-w-0 break-words"
          style={{ color: accentColor ? accentColor : "#ffffff" }}
        >
          {card.titulo}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded text-[#666] hover:text-[#ef4444] hover:bg-[#3a1a1a] opacity-0 group-hover:opacity-100 transition-all shrink-0"
          title="Excluir"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function getSelectValue(record: GridRecord, fieldId: number): string | null {
  const c = getCell(record, fieldId);
  return c?.valor?.label ?? null;
}
