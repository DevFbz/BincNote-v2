import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Sparkles,
  AlignLeft,
  Calendar,
  User,
  Hash,
  Layers,
  CheckSquare,
  List,
  Plus,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { List as ListIcon } from "lucide-react";

import { api } from "../api/cliente";
import BlockEditor from "./blocks/BlockEditor";
import { atualizarCelula, getCell, getValorTexto, ensureFields } from "../api/grids";
import type { Record as GridRecord, Field } from "../api/grids";

interface Props {
  record: GridRecord;
  fields?: Field[];
  databaseId: number;
  onClose: () => void;
  onRefresh: () => void;
  onOpenAI?: () => void;
}

// ── Field icons ──────────────────────────────────────────────────────────────
function FieldIcon({ kind }: { kind: string }) {
  const cls = "w-3.5 h-3.5 shrink-0 text-[#6b6b6b]";
  switch (kind) {
    case "select":
    case "status":
      return <Layers size={14} className={cls} />;
    case "date":
      return <Calendar size={14} className={cls} />;
    case "person":
    case "user":
    case "collaborator":
      return <User size={14} className={cls} />;
    case "number":
      return <Hash size={14} className={cls} />;
    case "checkbox":
      return <CheckSquare size={14} className={cls} />;
    case "text":
    case "title":
      return <AlignLeft size={14} className={cls} />;
    default:
      return <ListIcon size={14} className={cls} />;
  }
}

// ── Select Property Row ──────────────────────────────────────────────────────
function SelectPropertyRow({
  field,
  record,
  onUpdate,
}: {
  field: Field;
  record: GridRecord;
  onUpdate: (fieldId: number, valor: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const cell = getCell(record, field.id);
  const current = cell?.valor ?? null;
  const currentLabel: string = current?.label ?? "";
  const currentColor: string = current?.color ?? "#6b6b6b";
  const options: Array<{ id: string; label: string; color: string }> =
    field.config?.options ?? [];

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="cdp-prop-row" ref={ref}>
      <div className="cdp-prop-label">
        <FieldIcon kind={field.kind} />
        <span>{field.nome}</span>
      </div>
      <div className="cdp-prop-value-cell">
        <button
          className="cdp-select-trigger"
          onClick={() => setOpen((v) => !v)}
        >
          {currentLabel ? (
            <span
              className="cdp-badge"
              style={{ background: currentColor + "33", color: currentColor, border: `1px solid ${currentColor}55` }}
            >
              {currentLabel}
            </span>
          ) : (
            <span className="cdp-empty-value">Vazio</span>
          )}
          <ChevronDown size={12} className="text-[#555] ml-auto" />
        </button>

        {open && options.length > 0 && (
          <div className="cdp-dropdown">
            {options.map((opt) => (
              <button
                key={opt.id}
                className="cdp-dropdown-item"
                onClick={() => {
                  onUpdate(field.id, { label: opt.label, color: opt.color });
                  setOpen(false);
                }}
              >
                <span
                  className="cdp-badge"
                  style={{ background: opt.color + "33", color: opt.color, border: `1px solid ${opt.color}55` }}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Custom Date Picker Dropdown ──────────────────────────────────────────────
function CustomDatePicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(() => {
    try {
      return value ? new Date(value + "T12:00:00").getFullYear() : new Date().getFullYear();
    } catch {
      return new Date().getFullYear();
    }
  });
  const [viewMonth, setViewMonth] = useState(() => {
    try {
      return value ? new Date(value + "T12:00:00").getMonth() : new Date().getMonth();
    } catch {
      return new Date().getMonth();
    }
  });
  const [selectedDate, setSelectedDate] = useState(value);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function firstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay(); // 0=Sun
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(iso);
    onChange(iso);
    onClose();
  }

  function clearDate() {
    setSelectedDate("");
    onChange("");
    onClose();
  }

  function goToday() {
    const iso = todayStr;
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(iso);
    onChange(iso);
    onClose();
  }

  const dim = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= dim; i++) days.push(i);

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="cdp-calendar-dropdown" ref={menuRef}>
      {/* Header: month/year + nav arrows */}
      <div className="cdp-cal-header">
        <button className="cdp-cal-nav-btn" onClick={prevMonth}>&lt;</button>
        <span className="cdp-cal-title">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button className="cdp-cal-nav-btn" onClick={nextMonth}>&gt;</button>
      </div>
      {/* Weekday labels */}
      <div className="cdp-cal-weekdays">
        {weekdays.map((wd) => (
          <span key={wd} className="cdp-cal-weekday">{wd}</span>
        ))}
      </div>
      {/* Day grid */}
      <div className="cdp-cal-days">
        {days.map((d, i) => {
          if (d === null) return <span key={`e-${i}`} className="cdp-cal-day cdp-cal-empty" />;
          const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isToday = iso === todayStr;
          const isSelected = iso === selectedDate;
          return (
            <button
              key={iso}
              className={`cdp-cal-day${isToday ? " cdp-cal-today" : ""}${isSelected ? " cdp-cal-selected" : ""}`}
              onClick={() => selectDay(d)}
            >
              {d}
            </button>
          );
        })}
      </div>
      {/* Action buttons */}
      <div className="cdp-cal-actions">
        <button className="cdp-cal-btn cdp-cal-btn-today" onClick={goToday}>Hoje</button>
        <button className="cdp-cal-btn cdp-cal-btn-clear" onClick={clearDate}>Limpar</button>
      </div>
    </div>
  );
}

// ── Date Property Row ────────────────────────────────────────────────────────
function DatePropertyRow({
  field,
  record,
  onUpdate,
}: {
  field: Field;
  record: GridRecord;
  onUpdate: (fieldId: number, valor: any) => void;
}) {
  const cell = getCell(record, field.id);
  const raw: string = cell?.valor?.text ?? "";
  const [open, setOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  function formatDate(s: string) {
    if (!s) return "";
    try {
      return new Date(s + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return s;
    }
  }

  function handleChange(val: string) {
    onUpdate(field.id, { text: val });
  }

  return (
    <div className="cdp-prop-row">
      <div className="cdp-prop-label">
        <FieldIcon kind={field.kind} />
        <span>{field.nome}</span>
      </div>
      <div className="cdp-prop-value-cell cdp-date-value-cell" ref={cellRef}>
        <div
          className="cdp-date-preview"
          onClick={() => setOpen(!open)}
        >
          <Calendar size={13} className="cdp-date-icon" />
          {raw ? (
            <span className="cdp-date-display">{formatDate(raw)}</span>
          ) : (
            <span className="cdp-empty-value">Vazio</span>
          )}
        </div>
        {open && (
          <CustomDatePicker
            value={raw}
            onChange={handleChange}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── Checkbox Property Row ────────────────────────────────────────────────────
function CheckboxPropertyRow({
  field,
  record,
  onUpdate,
}: {
  field: Field;
  record: GridRecord;
  onUpdate: (fieldId: number, valor: any) => void;
}) {
  const cell = getCell(record, field.id);
  const checked: boolean = cell?.valor?.checked ?? false;

  return (
    <div className="cdp-prop-row">
      <div className="cdp-prop-label">
        <FieldIcon kind={field.kind} />
        <span>{field.nome}</span>
      </div>
      <div className="cdp-prop-value-cell">
        <input
          type="checkbox"
          defaultChecked={checked}
          className="cdp-checkbox"
          onChange={(e) => onUpdate(field.id, { checked: e.target.checked })}
        />
      </div>
    </div>
  );
}

// ── Text Property Row ────────────────────────────────────────────────────────
function TextPropertyRow({
  field,
  record,
  onUpdate,
}: {
  field: Field;
  record: GridRecord;
  onUpdate: (fieldId: number, valor: any) => void;
}) {
  const cell = getCell(record, field.id);
  const val: string = cell?.valor?.text ?? cell?.valor?.label ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(val);

  function handleSave() {
    setEditing(false);
    if (draft !== val) onUpdate(field.id, { text: draft });
  }

  return (
    <div className="cdp-prop-row">
      <div className="cdp-prop-label">
        <FieldIcon kind={field.kind} />
        <span>{field.nome}</span>
      </div>
      <div className="cdp-prop-value-cell">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setDraft(val); setEditing(false); }
            }}
            className="cdp-inline-input"
          />
        ) : (
          <button className="cdp-text-value" onClick={() => { setDraft(val); setEditing(true); }}>
            {val || <span className="cdp-empty-value">Vazio</span>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Number Property Row ──────────────────────────────────────────────────────
function NumberPropertyRow({
  field,
  record,
  onUpdate,
}: {
  field: Field;
  record: GridRecord;
  onUpdate: (fieldId: number, valor: any) => void;
}) {
  const cell = getCell(record, field.id);
  const val: string = cell?.valor?.text ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(val);

  function handleSave() {
    setEditing(false);
    if (draft !== val) onUpdate(field.id, { text: draft });
  }

  return (
    <div className="cdp-prop-row">
      <div className="cdp-prop-label">
        <FieldIcon kind={field.kind} />
        <span>{field.nome}</span>
      </div>
      <div className="cdp-prop-value-cell">
        {editing ? (
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setDraft(val); setEditing(false); }
            }}
            className="cdp-inline-input"
          />
        ) : (
          <button className="cdp-text-value" onClick={() => { setDraft(val); setEditing(true); }}>
            {val || <span className="cdp-empty-value">Vazio</span>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Comment Item ─────────────────────────────────────────────────────────────
function CommentItem({ text, createdAt }: { text: string; createdAt: string }) {
  const initials = "B";
  return (
    <div className="cdp-comment-item">
      <div className="cdp-comment-avatar">{initials}</div>
      <div className="cdp-comment-body">
        <p className="cdp-comment-text">{text}</p>
        {createdAt && <span className="cdp-comment-date">{createdAt}</span>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CardDetailPanel({ record, fields, databaseId, onClose, onRefresh, onOpenAI }: Props) {
  const tituloField = fields?.find((f) => f.kind === "text" || f.kind === "title");
  const tituloFieldId = tituloField?.id ?? 0;
  // Notes field: second text field (first after title), or any text field not the title
  const notesField = useMemo(() => {
    if (!fields) return undefined;
    const textFields = fields.filter((f) => f.kind === "text" || f.kind === "title");
    if (textFields.length <= 1) return undefined;
    return textFields.find((f) => f.id !== tituloFieldId) ?? textFields[1];
  }, [fields, tituloFieldId]);

  const [title, setTitle] = useState(
    record && tituloFieldId ? getValorTexto(record, tituloFieldId) || "" : ""
  );
  const [visible, setVisible] = useState(false);
  const [comments, setComments] = useState<Array<{ text: string; createdAt: string }>>([]);
  const [commentText, setCommentText] = useState("");

  // Auto-create "Notas" text field if it doesn't exist yet
  const ensureRanRef = useRef(false);
  useEffect(() => {
    if (ensureRanRef.current || notesField || !record || !databaseId) return;
    ensureRanRef.current = true;
    ensureFields(databaseId, [{ nome: "Notas", kind: "text" }])
      .then(() => onRefresh?.())
      .catch(() => {});
  }, [notesField, record, databaseId, onRefresh]);
  // Resizable panel width (persisted in localStorage)
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem("cdp-panel-width");
    return saved ? Math.max(360, Math.min(960, Number(saved))) : 720;
  });
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Sync title when record changes
  useEffect(() => {
    if (record && tituloFieldId) {
      setTitle(getValorTexto(record, tituloFieldId) || "");
    }
  }, [record, tituloFieldId]);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      setVisible(true);
      titleRef.current?.focus();
    });
  }, []);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Resize handler
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const newW = resizeRef.current.startW - (e.clientX - resizeRef.current.startX);
      const clamped = Math.max(360, Math.min(960, newW));
      setPanelWidth(clamped);
    };
    const onMouseUp = () => {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);
  
  // Persist panel width
  useEffect(() => {
    localStorage.setItem("cdp-panel-width", String(panelWidth));
  }, [panelWidth]);

  // Title mutation
  const titleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!tituloField || !record) return;
      await api.patch(`/grids/cells/${record.id}/${tituloField.id}/`, {
        valor: { text: newTitle },
      });
    },
    onSuccess: () => {
      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
    },
  });

  // Generic cell update
  const cellMutation = useMutation({
    mutationFn: async ({ fieldId, valor }: { fieldId: number; valor: any }) => {
      await atualizarCelula(record.id, fieldId, valor);
    },
    onSuccess: () => {
      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
    },
  });

  const handleCellUpdate = useCallback((fieldId: number, valor: any) => {
    cellMutation.mutate({ fieldId, valor });
  }, [record.id]);

  function handleSaveTitle() {
    if (!record) return;
    const current = getValorTexto(record, tituloFieldId);
    if (title.trim() && title !== current) {
      titleMutation.mutate(title.trim());
    }
  }

  // AI action handler — inserts generated content into the block editor notes
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  async function handleAIAction(acao: string) {
    if (!blockEditorRef.current) return;
    setAiLoading(acao);
    try {
      const res = await api.post<{ resultado: string }>("/ai/acao/", { acao, trecho: "" });
      if (res.resultado) {
        blockEditorRef.current.setContent(res.resultado);
      }
    } catch (err) {
      console.error("IA action error:", err);
    } finally {
      setAiLoading(null);
    }
  }

  function handleAddComment() {
    if (!commentText.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        text: commentText.trim(),
        createdAt: new Date().toLocaleDateString("pt-BR", {
          day: "numeric", month: "long", year: "numeric"
        }),
      },
    ]);
    setCommentText("");
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

    // Load saved content from notes field
  const notaSalva = notesField && record ? getCell(record, notesField.id)?.valor : null;
  const conteudoInicial = notaSalva?.json ?? (notaSalva?.text ? { type: "doc", content: [{ type: "paragraph" }] } : null);

  // Debounced save via atualizarCelula + refresh to update detailRecord
  const saveDebounce = useRef<number | null>(null);
  const handleNotesChange = useCallback((docJson: any) => {
    if (saveDebounce.current) window.clearTimeout(saveDebounce.current);
    saveDebounce.current = window.setTimeout(() => {
      if (notesField && record) {
        atualizarCelula(record.id, notesField.id, { json: docJson })
          .then(() => onRefresh?.())
          .catch(() => {});
      }
    }, 800);
  }, [notesField, record, onRefresh]);

  // Dispatch selected text to chatbot (for context tag)
  const handleBlockSelect = useCallback((text: string) => {
    if (text.trim()) {
      window.dispatchEvent(new CustomEvent('card-text-selected', { detail: text }));
    }
  }, []);

  // Listen for AI content to auto-apply to the notes editor
  const blockEditorRef = useRef<{ setContent: (html: string) => void } | null>(null);
  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      if (!notesField || !record) return;
      if (blockEditorRef.current) {
        blockEditorRef.current.setContent(e.detail);
      }
    };
    document.addEventListener('apply-notes-content', handler as EventListener);
    return () => document.removeEventListener('apply-notes-content', handler as EventListener);
  }, [notesField, record]);
    

  // Property fields - exclude specific fields by name
  const EXCLUDED_FIELD_NAMES = ["titulo", "título", "responsavel", "responsável"];
  const displayFields = fields?.filter(
    (f) => f.kind !== "title" && !EXCLUDED_FIELD_NAMES.includes(f.nome?.toLowerCase() ?? "")
  ) ?? [];

  // Sort: date fields first ("data inicio", "data abertura", "data termino"), then rest
  const datePriority: Record<string, number> = {
    "data inicio": 0,
    "data abertura": 1,
    "data termino": 2,
  };
  const fieldKindPriority: Record<string, number> = {
    "date": 3,
    "number": 4,
    "checkbox": 5,
    "select": 6,
    "status": 6,
  };
  const sortedFields = [...displayFields].sort((a, b) => {
    const aDatePrio = datePriority[a.nome?.toLowerCase() ?? ""] ?? -1;
    const bDatePrio = datePriority[b.nome?.toLowerCase() ?? ""] ?? -1;
    if (aDatePrio !== -1 || bDatePrio !== -1) {
      if (aDatePrio === -1) return 1;
      if (bDatePrio === -1) return -1;
      return aDatePrio - bDatePrio;
    }
    return (fieldKindPriority[a.kind] ?? 99) - (fieldKindPriority[b.kind] ?? 99);
  });

  // Status field (select)
  function renderPropertyRow(field: Field) {
    switch (field.kind) {
      case "select":
      case "status":
        return (
          <SelectPropertyRow
            key={field.id}
            field={field}
            record={record}
            onUpdate={handleCellUpdate}
          />
        );
      case "date":
        return (
          <DatePropertyRow
            key={field.id}
            field={field}
            record={record}
            onUpdate={handleCellUpdate}
          />
        );
      case "checkbox":
        return (
          <CheckboxPropertyRow
            key={field.id}
            field={field}
            record={record}
            onUpdate={handleCellUpdate}
          />
        );
      case "number":
        return (
          <NumberPropertyRow
            key={field.id}
            field={field}
            record={record}
            onUpdate={handleCellUpdate}
          />
        );
      default:
        return (
          <TextPropertyRow
            key={field.id}
            field={field}
            record={record}
            onUpdate={handleCellUpdate}
          />
        );
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="cdp-overlay"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Panel — resizable slide-in */}
      <div
        className="cdp-panel"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)", width: panelWidth }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            resizeRef.current = { startX: e.clientX, startW: panelWidth };
            document.body.style.cursor = "ew-resize";
            document.body.style.userSelect = "none";
          }}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-accent/20 active:bg-accent/30 transition-colors z-10"
        />
        {/* Top bar */}
        <div className="cdp-topbar">
          <div className="cdp-topbar-left">
            <span className="cdp-topbar-id">ID #{record.id}</span>
          </div>
          <div className="cdp-topbar-right">
            <button onClick={handleClose} className="cdp-icon-btn" title="Fechar">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="cdp-body">
          <div className="cdp-inner">

            {/* ── Title ── */}
            <div className="cdp-title-wrap">
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleSaveTitle(); }
                }}
                placeholder="Sem título"
                className="cdp-title-input"
              />
            </div>

            {/* ── Properties ── */}
            {sortedFields.length > 0 && (
              <div className="cdp-props-section">
                {sortedFields.map(renderPropertyRow)}
                <button className="cdp-add-property">
                  <Plus size={13} className="text-[#555]" />
                  <span>Add a property</span>
                </button>
              </div>
            )}

            {/* ── Comments ── */}
            <div className="cdp-comments-section">
              <div className="cdp-section-label">
                <MessageSquare size={13} />
                <span>Comentários</span>
              </div>

              {comments.length > 0 && (
                <div className="cdp-comments-list">
                  {comments.map((c, i) => (
                    <CommentItem key={i} text={c.text} createdAt={c.createdAt} />
                  ))}
                </div>
              )}

              {/* Comment input */}
              <div className="cdp-comment-input-wrap">
                <div className="cdp-comment-avatar-sm">B</div>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddComment();
                  }}
                  placeholder="Adicionar um comentário..."
                  className="cdp-comment-input"
                />
              </div>
            </div>

            {/* ── Notes / Rich text body ── */}
            <div className="cdp-notes-section">
              <BlockEditor
                ref={blockEditorRef}
                initialContent={conteudoInicial}
                onChange={handleNotesChange}
                onSelect={handleBlockSelect}
              />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
