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
import { Plus, Trash2, FileText, LayoutList, Kanban, Filter, ArrowDownUp, Search, Zap, ChevronDown } from "lucide-react";

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
      className="flex flex-col flex-1 min-w-0 shrink-0"
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing w-full"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: column.bg, border: `1px solid ${column.border}` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: column.dot }} />
            <h3 className="font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: column.dot }}>{column.nome}</h3>
          </div>
          <span className="text-xs text-txt-muted">{cards.length}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onStartAdd()}
            className="p-1 rounded text-txt-muted hover:bg-surface-3 transition-colors"
            title="Adicionar"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Cards list */}
      <div className="flex flex-col gap-2 min-h-[10px]">
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

        {/* Add button at the bottom */}
        {!isAdding && (
          <button
            onClick={onStartAdd}
            className="flex items-center gap-2 px-2 py-1.5 mt-1 text-txt-muted hover:text-txt hover:bg-surface-2 rounded-md transition-colors text-sm w-full text-left"
          >
            <Plus size={14} /> Nova página
          </button>
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
    <div className="px-3 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e] hover:bg-[#252525] transition-colors cursor-grab active:cursor-grabbing shadow-sm flex items-center group">
      <div className="flex items-start gap-2">
        <div className="shrink-0 pt-0.5">
          <FileText size={13} className="text-[#b0b0b0]" />
        </div>
        <div className="flex-1 min-w-0 flex items-center">
          <div className="text-[13px] font-medium text-txt leading-snug break-words whitespace-pre-wrap">
            {card.titulo}
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
export function BoardView({
  databaseId,
  onOpenAI,
}: {
  databaseId: number;
  onOpenAI: () => void;
}) {
  const queryClient = useQueryClient();
  const [viewType, setViewType] = useState<"board" | "table">("board");
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
    <div className="flex flex-col h-full bg-transparent">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-4 mb-4">
        <div className="flex items-center gap-1 bg-surface-2 rounded-md p-0.5">
                  <button
                    id="view-toggle-table"
                    onClick={() => setViewType("table")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${viewType === "table" ? "bg-surface-3 text-txt shadow-sm" : "text-txt-muted hover:text-txt hover:bg-surface-3"}`}
                  >
                    <LayoutList size={14} /> Tabela
                  </button>
                  <button
                    id="view-toggle-board"
                    onClick={() => setViewType("board")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${viewType === "board" ? "bg-surface-3 text-txt shadow-sm" : "text-txt-muted hover:text-txt hover:bg-surface-3"}`}
                  >
                    <Kanban size={14} /> Quadro
                  </button>
                </div>
        <div className="flex items-center gap-1.5 text-txt-muted">
          <button className="p-1.5 rounded hover:bg-surface-3 transition-colors"><Filter size={14} /></button>
          <button className="p-1.5 rounded hover:bg-surface-3 transition-colors"><ArrowDownUp size={14} /></button>
          <button className="p-1.5 rounded hover:bg-surface-3 transition-colors"><Zap size={14} /></button>
          <button className="p-1.5 rounded hover:bg-surface-3 transition-colors"><Search size={14} /></button>
          <div className="w-px h-4 bg-surface-4 mx-1" />
          <button className="flex items-center gap-1 bg-accent text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-accent-hover transition-colors ml-1">
            Nova <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {viewType === "board" ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Board */}
          <div className="flex-1 overflow-hidden overflow-y-auto pb-6">
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 items-start min-w-0">
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
      ) : (
        /* Table View */
        <div id="table-view-container" className="flex-1 overflow-auto p-4">
          <div id="table-view-grid" className="grid grid-cols-4 gap-4">
            {sortedColumns.map((col) => (
              <div id={`table-column-${col.id}`} key={col.id} className="flex flex-col min-w-0">
                {/* Column header */}
                <div id={`table-column-header-${col.id}`} className="flex items-center justify-between mb-3">
                  <div id={`table-column-header-content-${col.id}`} className="flex items-center gap-2">
                    <div id={`table-column-pill-${col.id}`} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                      <div id={`table-column-dot-${col.id}`} className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                      <h3 id={`table-column-title-${col.id}`} className="font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: col.dot }}>{col.nome}</h3>
                    </div>
                    <span id={`table-column-count-${col.id}`} className="text-xs text-txt-muted">{getCardsByColumn(col.id).length}</span>
                  </div>
                </div>
                {/* Cards list */}
                <div id={`table-column-cards-${col.id}`} className="flex flex-col gap-2 min-h-[10px]">
                  {getCardsByColumn(col.id).map((card) => (
                    <div
                      id={`table-card-${card.id}`}
                      key={card.id}
                      className="px-3 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e] hover:bg-[#252525] transition-colors cursor-pointer group"
                      onClick={() => setDetailRecordId(card.id)}
                    >
                      <div id={`table-card-content-${card.id}`} className="flex items-start gap-2">
                        <div id={`table-card-icon-wrapper-${card.id}`} className="shrink-0 pt-0.5">
                          <FileText id={`table-card-icon-${card.id}`} size={13} className="text-[#b0b0b0]" />
                        </div>
                        <div id={`table-card-title-wrapper-${card.id}`} className="flex-1 min-w-0 flex items-center">
                          <div id={`table-card-title-${card.id}`} className="text-[13px] font-medium text-txt leading-snug break-words whitespace-pre-wrap">
                            {card.titulo}
                          </div>
                        </div>
                        <button
                          id={`table-card-delete-${card.id}`}
                          onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                          className="p-0.5 rounded text-[#555] hover:text-[#ef4444] hover:bg-[#3a1a1a] opacity-0 group-hover:opacity-100 transition-all shrink-0 self-center"
                          title="Excluir"
                        >
                          <Trash2 id={`table-card-delete-icon-${card.id}`} size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    id={`table-column-add-btn-${col.id}`}
                    onClick={() => { setInputText(""); setAddingTo(col.id); }}
                    className="flex items-center gap-2 px-2 py-1.5 mt-1 text-txt-muted hover:text-txt hover:bg-surface-2 rounded-md transition-colors text-sm w-full text-left"
                  >
                    <Plus id={`table-column-add-icon-${col.id}`} size={14} /> Nova página
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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