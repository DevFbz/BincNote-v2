import { useState, useMemo, useCallback, useEffect } from "react";
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
import {
  Plus, Trash2, FileText, LayoutList, Kanban, Filter, ArrowDownUp, Search, Zap, ChevronDown,
  CircleDot, Hash, AlertTriangle, Calendar, User, AlignLeft, CheckSquare, ListTodo, HelpCircle
} from "lucide-react";

import type { Record as GridRecord, Cell, Field } from "../api/grids";
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
      style={{
        ...style,
        ...(column.bg ? { backgroundColor: column.bg, borderTop: `3px solid ${column.dot}`, borderRadius: '8px', padding: '8px' } : {}),
      }}
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
              cardColor={column.dot}
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
  cardColor,
}: {
  card: BoardCard;
  overId: string | null;
  onDelete: () => void;
  onClick: () => void;
  cardColor?: string;
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
        <CardContent card={card} onDelete={onDelete} cardColor={cardColor} />
      </div>
    </div>
  );
}

// ── Card Content ─────────────────────────────────────────────────────
function CardContent({ card, onDelete, cardColor }: { card: BoardCard; onDelete?: () => void; cardColor?: string }) {
  return (
    <div
      className="px-3 py-2.5 rounded-lg border hover:bg-[#252525] transition-colors cursor-grab active:cursor-grabbing shadow-sm flex items-center group"
      style={{
        background: cardColor ? hexToRgba(cardColor, 0.1) : "#1e1e1e",
        borderColor: cardColor ? hexToRgba(cardColor, 0.25) : "#2e2e2e",
      }}
    >
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

function getFieldIcon(field: Field) {
  const name = field.nome.toLowerCase();
  const kind = field.kind.toLowerCase();
  
  if (kind === "title" || kind === "text") {
    if (name === "tarefa" || name === "nome" || name === "título" || name === "titulo") {
      return <span className="font-bold text-[11px] select-none text-txt-muted mr-1.5 w-3.5 text-center inline-block">Aa</span>;
    }
    return <AlignLeft size={12} className="text-txt-muted mr-1.5" />;
  }
  if (kind === "select") {
    if (name === "status") {
      return <CircleDot size={12} className="text-txt-muted mr-1.5" />;
    }
    if (name === "prioridade") {
      return <AlertTriangle size={12} className="text-txt-muted mr-1.5" />;
    }
    return <ListTodo size={12} className="text-txt-muted mr-1.5" />;
  }
  if (kind === "person" || kind === "user" || kind === "collaborator" || name.includes("responsável") || name.includes("responsavel")) {
    return <User size={12} className="text-txt-muted mr-1.5" />;
  }
  if (kind === "date" || name.includes("data") || name.includes("prazo") || name.includes("término") || name.includes("termino") || name.includes("início") || name.includes("inicio")) {
    return <Calendar size={12} className="text-txt-muted mr-1.5" />;
  }
  if (kind === "number") {
    return <Hash size={12} className="text-txt-muted mr-1.5" />;
  }
  if (kind === "checkbox") {
    return <CheckSquare size={12} className="text-txt-muted mr-1.5" />;
  }
  return <AlignLeft size={12} className="text-txt-muted mr-1.5" />;
}

function renderCellValue(field: Field, cell?: Cell) {
  if (!cell || !cell.valor) return <span className="text-txt-faint/30">-</span>;
  
  const val = cell.valor;
  
  if (field.kind === "select") {
    const isStatus = field.nome.toLowerCase() === "status";
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border"
        style={{
          backgroundColor: `${val.color || "#9ca3af"}15`,
          borderColor: `${val.color || "#9ca3af"}30`,
          color: val.color || "#9ca3af",
        }}
      >
        {isStatus && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: val.color || "#9ca3af" }}
          />
        )}
        {val.label || ""}
      </span>
    );
  }
  
  if (field.kind === "date") {
    const dateStr = val.text ?? "";
    if (!dateStr) return <span className="text-txt-faint/30">-</span>;
    const date = new Date(dateStr + "T12:00:00");
    if (isNaN(date.getTime())) return dateStr;
    return (
      <span className="text-[13px] text-txt">
        {date.toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </span>
    );
  }
  
  if (field.kind === "person" || field.kind === "user" || field.kind === "collaborator" || field.nome.toLowerCase().includes("responsável") || field.nome.toLowerCase().includes("responsavel")) {
    const name = val.text ?? val.label ?? "";
    if (!name) return <span className="text-txt-faint/30">-</span>;
    const initial = name.charAt(0).toUpperCase();
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-surface-3 flex items-center justify-center text-[10px] font-bold text-txt-muted border border-surface-4 shrink-0">
          {initial}
        </div>
        <span className="text-[13px] text-txt truncate">{name}</span>
      </div>
    );
  }
  
  if (field.kind === "number") {
    return <span className="text-[13px] text-txt font-mono">{val.text ?? val.label ?? JSON.stringify(val)}</span>;
  }
  
  if (field.kind === "checkbox") {
    const checked = val.checked ?? false;
    return (
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="rounded border-surface-4 text-accent focus:ring-accent"
      />
    );
  }
  
  return (
    <span className="text-[13px] text-txt">
      {val.text ?? val.label ?? (typeof val === "object" ? JSON.stringify(val) : String(val))}
    </span>
  );
}

// ── BoardView ─────────────────────────────────────────────────────────
export function BoardView({
  databaseId,
  onOpenAI,
  onCardChange,
}: {
  databaseId: number;
  onOpenAI: () => void;
  onCardChange?: (card: { id: number; title: string } | null) => void;
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

  const tituloField = db?.fields?.find((f) => f.kind === "text" || f.kind === "title");
  const statusField = db?.fields?.find((f) => f.kind === "select");
  const tituloFieldId = tituloField?.id ?? 0;
  const statusFieldId = statusField?.id ?? 0;

  // Notify parent about card context change (tag ambiente)
  useEffect(() => {
    if (!onCardChange) return;
    if (detailRecord && tituloFieldId) {
      onCardChange({ id: detailRecord.id, title: getValorTexto(detailRecord, tituloFieldId) || "Sem título" });
    } else if (!detailRecordId) {
      onCardChange(null);
    }
  }, [detailRecord, detailRecordId, tituloFieldId, onCardChange]);

  // Column-local card order (for same-column reordering)
  const [cardOrder, setCardOrder] = useState<Record<string, number[]>>({});

  const columnsToRender = useMemo(() => {
    if (!db?.fields) return [];
    // Deduplicate by name (safety net against backend duplicates)
    const seenNames = new Set<string>();
    const deduped = db.fields.filter((f) => {
      const key = f.nome?.toLowerCase() ?? "";
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });
    const sorted = [...deduped].sort((a, b) => a.ordem - b.ordem);
    const titleF = sorted.find((f) => f.kind === "title" || f.kind === "text");
    if (!titleF) return sorted;
    const others = sorted.filter((f) => f.id !== titleF.id);
    return [titleF, ...others];
  }, [db?.fields]);

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
      setDetailRecordId(null);
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
          <div className="notion-table-container">
            <table className="notion-table">
              <thead>
                <tr>
                  {columnsToRender.map((field) => (
                    <th
                      key={field.id}
                      style={{
                        width: field.kind === "title" || field.kind === "text" ? "300px" : "150px",
                        minWidth: field.kind === "title" || field.kind === "text" ? "300px" : "150px",
                      }}
                    >
                      <div className="flex items-center justify-between group/header">
                        <div className="flex items-center">
                          {getFieldIcon(field)}
                          <span>{field.nome}</span>
                        </div>
                        <span className="opacity-0 group-hover/header:opacity-100 text-txt-faint text-[10px] cursor-pointer hover:text-txt transition-opacity ml-2 select-none">
                          ⓘ
                        </span>
                      </div>
                    </th>
                  ))}
                  {/* Empty header for actions/delete button */}
                  <th style={{ width: "60px", minWidth: "60px" }}></th>
                </tr>
              </thead>
              <tbody>
                {(records ?? []).map((record) => {
                  const titleVal = tituloFieldId ? getValorTexto(record, tituloFieldId) || "Sem título" : "Sem título";
                  return (
                    <tr
                      key={record.id}
                      className="group/row"
                      onClick={() => setDetailRecordId(record.id)}
                    >
                      {columnsToRender.map((field) => {
                        const cell = getCell(record, field.id);
                        const isTitle = field.id === tituloFieldId;
                        return (
                          <td key={field.id}>
                            {isTitle ? (
                              <div className="flex items-center justify-between min-w-0">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText size={13} className="text-[#b0b0b0] shrink-0" />
                                  <span className="font-medium text-[13px] text-txt truncate">
                                    {titleVal}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailRecordId(record.id);
                                  }}
                                  className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-3 hover:bg-surface-4 text-[10px] text-txt-muted hover:text-txt transition-all shrink-0 ml-2"
                                >
                                  ABRIR
                                </button>
                              </div>
                            ) : (
                              <div className="truncate">
                                {renderCellValue(field, cell)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      {/* Delete column cell */}
                      <td className="text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(record.id);
                          }}
                          className="opacity-0 group-hover/row:opacity-100 p-1 rounded text-[#555] hover:text-[#ef4444] hover:bg-[#3a1a1a] transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* Row for adding new record */}
                <tr className="hover:bg-[#1f1f1f] transition-colors">
                  <td colSpan={columnsToRender.length + 1} className="p-0">
                    <button
                      onClick={() => {
                        const defaultStatusCol = DEFAULT_COLUMNS[0]?.id; // "a-fazer"
                        const statusName = COLUMN_STATUS_MAP[defaultStatusCol] || "A fazer";
                        const title = prompt("Digite o título da nova tarefa:");
                        if (title && title.trim()) {
                          addRecord.mutate({ titulo: title.trim(), status: statusName });
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-txt-muted hover:text-txt w-full text-left text-xs transition-colors"
                    >
                      <Plus size={13} /> Novo registro
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
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