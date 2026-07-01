import { useState, useCallback, useRef } from "react";
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
import { GripVertical, Plus, Trash2, FileText } from "lucide-react";

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

// Map our column IDs to status values stored in records
const COLUMN_STATUS_MAP: Record<string, string> = {
  "a-fazer":           "A fazer",
  "em-andamento":      "Em andamento",
  "aguardando-testes": "Aguardando Testes",
  "concluido":         "Concluído",
};

const REVERSE_STATUS_MAP = Object.fromEntries(
  Object.entries(COLUMN_STATUS_MAP).map(([k, v]) => [v, k])
);

interface BoardCard {
  id: number;   // record.id
  titulo: string;
  status: string; // column status value
}

// ── Component ─────────────────────────────────────────────────────────
export function BoardView({ databaseId }: { databaseId: number }) {
  const queryClient = useQueryClient();
  const { data: db } = useDatabaseDetail(databaseId);
  const { data: records } = useRecords(databaseId);

  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [overId, setOverId] = useState<string | null>(null);

  // Find the title and status fields from the database
  const tituloField = db?.fields?.find((f) => f.kind === "text" || f.kind === "title");
  const statusField = db?.fields?.find((f) => f.kind === "select");
  const tituloFieldId = tituloField?.id ?? 0;
  const statusFieldId = statusField?.id ?? 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  // Convert backend records to BoardCards
  const allCards: BoardCard[] = (records ?? []).map((r) => ({
    id: r.id,
    titulo: tituloFieldId ? getValorTexto(r, tituloFieldId) || "Sem título" : "Sem título",
    status: getSelectValue(r, statusFieldId) || "A fazer",
  }));

  // Group cards by column
  const getCardsByColumn = useCallback((colId: string) => {
    const statusName = COLUMN_STATUS_MAP[colId];
    return allCards.filter((c) => c.status === statusName);
  }, [allCards]);

  // ── Mutations ────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ recordId, newStatus }: { recordId: number; newStatus: string }) => {
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
    mutationFn: async ({ titulo, status }: { titulo: string; status: string }) => {
      const r = await api.post<GridRecord>(`/grids/databases/${databaseId}/records/`, {});
      // Set the title field
      if (tituloField) {
        await api.patch(`/grids/cells/${r.id}/${tituloField.id}/`, {
          valor: { text: titulo },
        });
      }
      // Set the status field
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

  // ── Drag handlers ────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const card = allCards.find((c) => c.id === Number(active.id));
    if (card) setActiveCard(card);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    setOverId(over ? String(over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    setOverId(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = Number(active.id);
    let targetColId: string | null = null;

    // Check if dragged over a column
    if (COLUMN_STATUS_MAP[over.id as string]) {
      targetColId = over.id as string;
    } else {
      // Dragged over another card — find that card's column
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
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#191919]">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b shrink-0" style={{ borderColor: "#2e2e2e" }}>
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
                overId={overId}
                onInputChange={setInputText}
                onStartAdd={() => { setInputText(""); setAddingTo(col.id); }}
                onConfirmAdd={() => handleAddCard(col.id)}
                onCancelAdd={() => setAddingTo(null)}
                onDelete={handleDeleteCard}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="w-72 p-3 bg-[#2e2e2e] rounded-xl border-2 border-[#a8dcff] shadow-2xl opacity-95">
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
    </div>
  );
}

// ── Column Component ─────────────────────────────────────────────────
function Column({
  column,
  cards,
  isAdding,
  inputText,
  onInputChange,
  overId,
  onStartAdd,
  onConfirmAdd,
  onCancelAdd,
  onDelete,
}: {
  column: typeof DEFAULT_COLUMNS[number];
  cards: BoardCard[];
  isAdding: boolean;
  inputText: string;
  overId: string | null;
  onInputChange: (t: string) => void;
  onStartAdd: () => void;
  onConfirmAdd: () => void;
  onCancelAdd: () => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className="flex flex-col rounded-xl border max-h-full min-w-0"
      style={{ background: column.bg, borderColor: column.border }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0" style={{ borderColor: column.border }}>
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
              overId={overId}
              onDelete={() => onDelete(card.id)}
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
          <div className="p-2 rounded-lg" style={{ background: column.border }}>
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
                className="flex-1 px-2 py-1 rounded text-xs font-medium text-white"
                style={{ background: column.dot }}
              >
                Adicionar
              </button>
              <button
                onClick={onCancelAdd}
                className="p-1 rounded text-[#888] hover:text-[#ffffff] hover:bg-black/20 transition-colors"
              >
                <span className="text-sm">✕</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isAdding && (
        <button
          onClick={onStartAdd}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#cccccc] hover:text-[#ffffff] transition-colors rounded-b-xl border-t"
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
  overId,
  onDelete,
}: {
  card: BoardCard;
  overId: string | null;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(card.id) });

  const isOverTarget = overId === String(card.id) && !isDragging;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 rounded-xl bg-[#2a2a2a] border border-[#3a3a3a] hover:border-[#555] transition-colors cursor-grab active:cursor-grabbing group relative"
      {...attributes}
      {...listeners}
    >
      {/* Blue drop indicator line */}
      {isOverTarget && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#3b82f6] rounded-full shadow-[0_0_6px_#3b82f688] z-10" />
      )}
      <div className="flex items-start gap-2">
        <GripVertical
          size={14}
          className="text-[#666] mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <FileText
          size={14}
          className="text-[#ffffff]/70 mt-0.5 shrink-0"
        />
        <span className="text-sm text-[#ffffff] leading-snug flex-1">
          {card.titulo}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded text-[#666] hover:text-[#ef4444] hover:bg-[#3a3a3a] opacity-0 group-hover:opacity-100 transition-all shrink-0"
          title="Excluir"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Helper ───────────────────────────────────────────────────────────
function getSelectValue(record: GridRecord, fieldId: number): string | null {
  const c = getCell(record, fieldId);
  return c?.valor?.label ?? null;
}
