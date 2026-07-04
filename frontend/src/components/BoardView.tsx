import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, FileText } from "lucide-react";

import type { Record as GridRecord } from "../api/grids";
import { useDatabaseDetail, useRecords, getCell, getValorTexto } from "../api/grids";
import { api } from "../api/cliente";
import { CardDetailPanel } from "./CardDetailPanel";

// ── Column config ────────────────────────────────────────────────────
const DEFAULT_COLUMNS = [
  { id: "a-fazer",           nome: "A fazer",           dot: "#9ca3af", bg: "#1e1e1e", border: "#2e2e2e" },
  { id: "em-andamento",      nome: "Em andamento",      dot: "#3b82f6", bg: "#1a1e2e", border: "#2a2e3e" },
  { id: "aguardando-testes", nome: "Aguardando Testes", dot: "#8b5cf6", bg: "#1e1a2e", border: "#2e2a3e" },
  { id: "concluido",         nome: "Concluído",          dot: "#10b981", bg: "#1a2a1e", border: "#2a3a2e" },
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

// ── Helper ────────────────────────────────────────────────────────────
function getSelectValue(record: GridRecord, fieldId: number): string | null {
  const c = getCell(record, fieldId);
  return c?.valor?.label ?? null;
}

// ── ColumnContainer ────────────────────────────────────────────────────
function ColumnContainer({
  column,
  cards,
  isAdding,
  inputText,
  overId,
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
  onInputChange: (v: string) => void;
  onStartAdd: () => void;
  onConfirmAdd: () => void;
  onCancelAdd: () => void;
  onDelete: (id: number) => void;
  onCardClick: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col min-w-[240px] max-w-[240px] bg-[#252525] rounded-xl border border-[#2e2e2e] shadow-md"
    >
      {/* Column header */}
      <div
        className="px-4 py-3 border-b border-[#2e2e2e] cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-[#ffffff]">{column.nome}</h3>
            <p className="text-xs text-[#888]">{cards.length} {cards.length === 1 ? "cartão" : "cartões"}</p>
          </div>
          <button
            onClick={() => onStartAdd()}
            className="p-1.5 rounded-lg bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors"
            title="Adicionar cartão"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        <SortableContext items={cards.map((c) => String(c.id))}>
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

        {isAdding && (
          <div className="p-3 bg-[#2a2a2a] rounded-lg border border-dashed border-[#404040]">
            <textarea
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onConfirmAdd();
                }
              }}
              placeholder="Digite o título do cartão..."
              className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#ffffff] focus:outline-none focus:border-[#3b82f6] transition-colors resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={onConfirmAdd}
                disabled={!inputText.trim()}
                className="flex-1 px-3 py-1.5 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Adicionar
              </button>
              <button
                onClick={onCancelAdd}
                className="px-3 py-1.5 bg-[#404040] text-[#ddd] rounded-lg hover:bg-[#555] transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Draggable Card ────────────────────────────────────────────────────
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
      <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick(); }}>
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

  // Detail panel state
  const [detailRecordId, setDetailRecordId] = useState<number | null>(null);
  const detailRecord = useMemo(
    () => records?.find((r) => r.id === detailRecordId) ?? null,
    [records, detailRecordId]
  );

  // Column-local card order (for same-column reordering)
  const [cardOrder, setCardOrder] = useState<Record<string, number[]>>({});

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

  const allCards: BoardCard[] = useMemo(
    () =>
      resolvedCards.map((c) => ({
        ...c,
        status: pendingCardCol[c.id] ?? c.status,
      })),
    [resolvedCards, pendingCardCol]
  );

  const getCardsByColumn = useCallback(
    (colId: string) => {
      const statusName = COLUMN_STATUS_MAP[colId];
      let filtered = allCards.filter((c) => c.status === statusName);
      const orderArr = cardOrder[statusName];
      if (orderArr && orderArr.length > 0) {
        const ordered = orderArr
          .map((id) => filtered.find((c) => c.id === id))
          .filter(Boolean) as BoardCard[];
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

  function resolveDropColumn(id: string): string | null {
    if (COLUMN_STATUS_MAP[id]) return id;
    const overCard = allCards.find((c) => c.id === Number(id));
    if (overCard) return REVERSE_STATUS_MAP[overCard.status] ?? null;
    return null;
  }

  function reorderSameColumn(activeId: number, overIdStr: string, colCards: BoardCard[]) {
    const statusName = colCards[0]?.status;
    if (!statusName) return;
    const ids = colCards.map((c) => c.id);
    const fromIdx = ids.indexOf(activeId);
    const toIdx = ids.indexOf(Number(overIdStr));
    if (fromIdx === -1 || toIdx === -1) return;
    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, activeId);
    setCardOrder((prev) => ({ ...prev, [statusName]: newIds }));
  }

  // ── Drag handlers ────────────────────────────────────────────────
  function handleDragStart(event: any) {
    const card = allCards.find((c) => c.id === Number(event.active.id));
    if (card) setActiveCard(card);
  }

  function handleDragOver(event: any) {
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

  function handleDragEnd(event: any) {
    setActiveCard(null);
    setOverId(null);

    const { active, over } = event;
    if (!over) { setPendingCardCol({}); return; }

    // Column reorder
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

    // Card drop
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
  function handleAddCard(columnId: string) {
    if (!inputText.trim()) return;
    const statusName = COLUMN_STATUS_MAP[columnId];
    addRecord.mutate({ titulo: inputText.trim(), status: statusName });
    setInputText("");
    setAddingTo(null);
  }

  function handleDeleteCard(cardId: number) {
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
        <div className="flex-1 overflow-x-auto overflow-y-auto p-5">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 items-start w-max">
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
                <div className="w-60 rounded-xl bg-[#2d2d2d] border-2 border-[#3b82f688] shadow-2xl shadow-black/60 opacity-95">
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