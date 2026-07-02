import { useState, useMemo, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, FileText, GripVertical, MessageSquare } from "lucide-react";

import { api } from "../api/cliente";
import { useRecords, useDatabaseDetail, getValorTexto, getCell } from "../api/grids";
import type { Record as GridRecord, Field } from "../api/grids";
import { CardDetailPanel } from "./CardDetailPanel";

// ── Column config ────────────────────────────────────────────────────
const DEFAULT_COLUMNS = [
  { id: "a-fazer",          nome: "A fazer",           dot: "#9ca3af", bg: "#1e1e1e", border: "#2e2e2e" },
  { id: "em-andamento",     nome: "Em andamento",      dot: "#3b82f6", bg: "#1a1e2e", border: "#2a2e3e" },
  { id: "aguardando-testes",nome: "Aguardando Testes", dot: "#8b5cf6", bg: "#1e1a2e", border: "#2e2a3e" },
  { id: "concluido",        nome: "Concluído",          dot: "#10b981", bg: "#1a2a1e", border: "#2a3a2e" },
];

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
  id: number;
  titulo: string;
  status: string;
}

interface ColumnDef {
  id: string;
  nome: string;
  dot: string;
  bg: string;
  border: string;
}

// ── BoardView ─────────────────────────────────────────────────────────
interface BoardViewProps {
  databaseId: number;
  onOpenAI?: () => void;
}

export function BoardView({ databaseId, onOpenAI }: BoardViewProps) {
  const queryClient = useQueryClient();
  const { data: db } = useDatabaseDetail(databaseId);
  const { data: records, refetch } = useRecords(databaseId);

  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [overId, setOverId] = useState<string | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>(
    DEFAULT_COLUMNS.map((c) => c.id)
  );
  const [pendingCardCol, setPendingCardCol] = useState<Record<number, string>>({});

  // ── Column-local card order (for same-column reordering) ──────────
  // Key = status name, value = ordered array of card IDs
  const [cardOrder, setCardOrder] = useState<Record<string, number[]>>({});

  // Detail panel
  const [detailRecordId, setDetailRecordId] = useState<number | null>(null);
  const detailRecord = useMemo(
    () => records?.find((r) => r.id === detailRecordId) ?? null,
    [records, detailRecordId]
  );

  const tituloField = db?.fields?.find((f) => f.kind === "text" || f.kind === "title");
  const statusField = db?.fields?.find((f) => f.kind === "select");
  const tituloFieldId = tituloField?.id ?? 0;
  const statusFieldId = statusField?.id ?? 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const resolvedCards: BoardCard[] = useMemo(
    () =>
      (records ?? []).map((r) => ({
        id: r.id,
        titulo: tituloFieldId ? getValorTexto(r, tituloFieldId) || "Sem título" : "Sem título",
        status: getSelectValue(r, statusFieldId) || "A fazer",
      })),
    [records, tituloFieldId, statusFieldId]
  );

  // Merge resolved + pending moves for live visual feedback during drag
  const allCards: BoardCard[] = useMemo(
    () =>
      resolvedCards.map((c) => ({
        ...c,
        status: pendingCardCol[c.id] ?? c.status,
      })),
    [resolvedCards, pendingCardCol]
  );

  // Apply column-local card order when available
  const getCardsByColumn = useCallback(
    (colId: string) => {
      const statusName = COLUMN_STATUS_MAP[colId];
      let filtered = allCards.filter((c) => c.status === statusName);
      const orderKey = statusName;
      const orderArr = cardOrder[orderKey];
      if (orderArr && orderArr.length > 0) {
        const ordered = orderArr
          .map((id) => filtered.find((c) => c.id === id))
          .filter(Boolean) as BoardCard[];
        // Append any new cards not yet in the order list
        const orderedIds = new Set(ordered.map((c) => c.id));
        filtered = [...ordered, ...filtered.filter((c) => !orderedIds.has(c.id))];
      }
      return filtered;
    },
    [allCards, cardOrder]
  );

  const sortedColumns = useMemo(
    () => columnOrder.map((id) => DEFAULT_COLUMNS.find((c) => c.id === id)!).filter(Boolean),
    [columnOrder]
  );

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
      setPendingCardCol({});
    },
    onError: () => {
      setPendingCardCol({});
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
      const r = await api.post<GridRecord>(`/grids/databases/${databaseId}/records/`, {
        database: databaseId,
      });
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
    onError: (err) => {
      console.error("Erro ao criar cartão:", err);
    },
  });

  // ── Helpers ─────────────────────────────────────────────────────
  function findColumnOfCard(cardId: number): string | null {
    const card = allCards.find((c) => c.id === cardId);
    return card ? REVERSE_STATUS_MAP[card.status] ?? null : null;
  }

  function resolveDropColumn(overId: string): string | null {
    if (COLUMN_STATUS_MAP[overId]) return overId;
    const overCard = allCards.find((c) => c.id === Number(overId));
    if (overCard) return REVERSE_STATUS_MAP[overCard.status] ?? null;
    return null;
  }

  /** Reorder a card within the same column. */
  function reorderSameColumn(
    activeId: number,
    overId: string,
    colCards: BoardCard[]
  ) {
    const statusName = colCards[0]?.status;
    if (!statusName) return;
    const ids = colCards.map((c) => c.id);
    const fromIdx = ids.indexOf(activeId);
    const toIdx = ids.indexOf(Number(overId));
    if (fromIdx === -1 || toIdx === -1) return;
    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, activeId);
    setCardOrder((prev) => ({ ...prev, [statusName]: newIds }));
  }

  // ── Drag handlers ────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const card = allCards.find((c) => c.id === Number(event.active.id));
    if (card) setActiveCard(card);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) { setOverId(null); return; }

    const overIdStr = String(over.id);
    if (COLUMN_STATUS_MAP[overIdStr] || !allCards.find((c) => c.id === Number(overIdStr))) {
      setOverId(null);
    } else {
      setOverId(overIdStr);
    }

    if (active.data.current?.type === "column") return;

    const activeCol = findColumnOfCard(Number(active.id));
    const overCol = resolveDropColumn(overIdStr);
    if (!activeCol || !overCol || activeCol === overCol) return;

    const cardId = Number(active.id);
    setPendingCardCol((prev) => ({ ...prev, [cardId]: COLUMN_STATUS_MAP[overCol] }));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    setOverId(null);

    const { active, over } = event;
    if (!over) { setPendingCardCol({}); return; }

    // ── Column reorder ────────────────────────────────────────────
    if (active.data.current?.type === "column") {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...columnOrder];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, active.id as string);
        setColumnOrder(newOrder);
      }
      return;
    }

    // ── Card drop ─────────────────────────────────────────────────
    const cardId = Number(active.id);
    const targetColId = resolveDropColumn(String(over.id));
    if (!targetColId) { setPendingCardCol({}); return; }

    const newStatus = COLUMN_STATUS_MAP[targetColId];
    const card = resolvedCards.find((c) => c.id === cardId);
    if (!card) { setPendingCardCol({}); return; }

    // Same column → reorder only
    if (card.status === newStatus) {
      const colCards = getCardsByColumn(targetColId);
      reorderSameColumn(cardId, String(over.id), colCards);
      setPendingCardCol({});
      return;
    }

    // Different column → update status
    updateStatus.mutate({ recordId: cardId, newStatus });
  }

  // ── Card actions ─────────────────────────────────────────────────
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
    <div className="flex h-full" style={{ background: "var(--bg-app)" }}>
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0" style={{ borderColor: "#2e2e2e" }}>
          <h2 className="font-semibold text-sm text-[#ffffff]">
            {db?.nome ?? "Quadro Kanban"}
          </h2>
          <span className="text-xs text-[#999]">
            {allCards.length} {allCards.length === 1 ? "cartão" : "cartões"}
          </span>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-y-auto p-5">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-4 gap-4 items-start">
              <SortableContext
                items={columnOrder}
                strategy={horizontalListSortingStrategy}
              >
                {sortedColumns.map((col) => (
                  <ColumnContainer
                    key={col.id}
                    column={col}
                    cards={getCardsByColumn(col.id)}
                    isAdding={addingTo === col.id}
                    inputText={inputText}
                    overId={overId}
                    activeCardId={activeCard?.id ?? null}
                    onInputChange={setInputText}
                    onStartAdd={() => { setInputText(""); setAddingTo(col.id); }}
                    onConfirmAdd={() => handleAddCard(col.id)}
                    onCancelAdd={() => setAddingTo(null)}
                    onDelete={handleDeleteCard}
                    onCardClick={(id) => setDetailRecordId(id)}
                  />
                ))}
              </SortableContext>
            </div>

            <DragOverlay>
              {activeCard ? (
                <div className="w-72 rounded-xl bg-[#2d2d2d] border-2 border-[#3b82f688] shadow-2xl shadow-black/60 opacity-95">
                  <CardContent card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Detail Panel */}
      {detailRecord && (
        <CardDetailPanel
          record={detailRecord}
          fields={db?.fields}
          databaseId={databaseId}
          onClose={() => setDetailRecordId(null)}
          onRefresh={refetch}
          onOpenAI={onOpenAI}
        />
      )}
    </div>
  );
}

// ── Column Container ─────────────────────────────────────────────────
function ColumnContainer({
  column,
  cards,
  isAdding,
  inputText,
  overId,
  activeCardId,
  onInputChange,
  onStartAdd,
  onConfirmAdd,
  onCancelAdd,
  onDelete,
  onCardClick,
}: {
  column: ColumnDef;
  cards: BoardCard[];
  isAdding: boolean;
  inputText: string;
  overId: string | null;
  activeCardId: number | null;
  onInputChange: (t: string) => void;
  onStartAdd: () => void;
  onConfirmAdd: () => void;
  onCancelAdd: () => void;
  onDelete: (id: number) => void;
  onCardClick: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setColRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column" },
  });

  // Separate droppable ID from the sortable ID to avoid conflict
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${column.id}`,
    data: { columnId: column.id },
  });

  const colStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isHighlighted = isOver && activeCardId !== null;
  const cardIds = cards.map((c) => String(c.id));

  return (
    <div
      ref={setColRef}
      style={colStyle}
      className={`flex flex-col rounded-xl overflow-hidden transition-shadow duration-200 min-w-0 w-full ${
        isHighlighted ? "ring-2 ring-[#3b82f6]" : "shadow-sm"
      }`}
      data-col-id={column.id}
    >
      {/* Column Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing select-none"
        style={{ background: column.bg, borderBottom: `1px solid ${column.border}` }}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} className="text-[#555] shrink-0" />
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: column.dot }} />
        <span className="text-sm font-semibold text-[#ffffff] flex-1 truncate">
          {column.nome}
        </span>
        <span
          className="text-xs text-[#aaa] px-1.5 py-0.5 rounded-full min-w-[22px] text-center font-medium"
          style={{ background: column.border }}
        >
          {cards.length}
        </span>
      </div>

      {/* Card List */}
      <div
        ref={setDropRef}
        className={`flex-1 overflow-y-auto p-2 space-y-1.5 transition-all duration-200 min-w-0 ${
          isHighlighted ? "bg-[#3b82f610]" : ""
        }`}
        style={{
          background: isHighlighted ? undefined : column.bg,
          borderLeft: `1px solid ${column.border}`,
          borderRight: `1px solid ${column.border}`,
        }}
      >
        {cardIds.length > 0 ? (
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <DraggableCard
                key={card.id}
                card={card}
                overId={overId}
                onDelete={() => onDelete(card.id)}
                onClick={() => onCardClick(card.id)}
              />
            ))}
          </SortableContext>
        ) : (
          <div className="text-[11px] text-[#666] text-center py-6 select-none">
            {isHighlighted ? "Solte aqui" : "Vazio"}
          </div>
        )}

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
              className="w-full bg-transparent outline-none text-sm text-[#ffffff] placeholder-[#777] mb-2"
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
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#aaa] hover:text-[#ffffff] hover:bg-[#ffffff08] transition-colors"
          style={{
            background: column.bg,
            borderTop: `1px solid ${column.border}`,
          }}
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
  onClick,
}: {
  card: BoardCard;
  overId: string | null;
  onDelete: () => void;
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

  const isOverTarget = overId === String(card.id) && !isDragging;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group"
      {...attributes}
      {...listeners}
    >
      {isOverTarget && (
        <div className="absolute -top-[3px] left-2 right-2 h-[3px] bg-[#3b82f6] rounded-full shadow-[0_0_8px_#3b82f6cc] z-10" />
      )}
      <div onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <CardContent card={card} onDelete={onDelete} />
      </div>
    </div>
  );
}

// ── Card Content ─────────────────────────────────────────────────────
function CardContent({ card, onDelete }: { card: BoardCard; onDelete?: () => void }) {
  return (
    <div className="px-2.5 py-1.5 rounded-lg bg-[#2d2d2d] border border-[#3d3d3d] hover:border-[#555] transition-colors cursor-grab active:cursor-grabbing">
      <div className="flex items-start gap-2">
        <div className="shrink-0 pt-0.5">
          <FileText size={13} className="text-[#b0b0b0]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#ffffff] leading-snug break-words whitespace-pre-wrap">
            {card.titulo}
          </div>
          <div className="text-[11px] text-[#b0b0b0] leading-snug mt-0.5">
            {card.status}
          </div>
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
            className="p-0.5 rounded text-[#555] hover:text-[#ef4444] hover:bg-[#3a1a1a] opacity-0 group-hover:opacity-100 transition-all shrink-0 self-center"
            title="Excluir"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Helper ───────────────────────────────────────────────────────────
function getSelectValue(record: GridRecord, fieldId: number): string | null {
  const c = getCell(record, fieldId);
  return c?.valor?.label ?? null;
}
