import { useState, useRef, useEffect, useCallback } from "react";
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
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import ImageExtension from "@tiptap/extension-image";
import HorizontalRule from "@tiptap/extension-horizontal-rule";

import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List as ListIcon,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
  Link,
  AlignCenter,
  AlignJustify,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  Highlighter,
  ImageIcon,
  Table2,
  Minus,
  RemoveFormatting,
  Indent,
  Outdent,
  Undo2,
  Redo2,
  Pilcrow,
  ChevronRight,
  MoreHorizontal,
  Smile,
  Pen,
  SlidersHorizontal,
  Sigma,
} from "lucide-react";

import { api } from "../api/cliente";
import { atualizarCelula, getCell, getValorTexto } from "../api/grids";
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

  const [title, setTitle] = useState(
    record && tituloFieldId ? getValorTexto(record, tituloFieldId) || "" : ""
  );
  const [visible, setVisible] = useState(false);
  const [comments, setComments] = useState<Array<{ text: string; createdAt: string }>>([]);
  const [commentText, setCommentText] = useState("");

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

  // Rich text editor for notes/description
  const debounce = useRef<number | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: "Adicione uma descrição ou notas..." }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      ImageExtension.configure({ inline: false }),
      HorizontalRule,
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "cdp-editor-content",
      },
      handlePaste: (_view: unknown, event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return true;
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl && editorRef.current) {
                editorRef.current.chain().focus().setImage({ src: dataUrl }).run();
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
    },
    onUpdate: ({ editor: e }) => {
      if (debounce.current) window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("card-text-selected", {
          detail: e.getText(),
        }));
      }, 500);
    },
  });

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

      {/* Panel — full-width slide-in */}
      <div
        className="cdp-panel"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Top bar */}
        <div className="cdp-topbar">
          <div className="cdp-topbar-left">
            <span className="cdp-topbar-id">ID #{record.id}</span>
          </div>
          <div className="cdp-topbar-right">
            {onOpenAI && (
              <button
                onClick={onOpenAI}
                className="cdp-icon-btn"
                title="Assistente IA"
              >
                <Sparkles size={15} />
              </button>
            )}
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
              {editor && (
                <>
                  {/* FloatingMenu — aparece ao clicar em linha vazia / novo parágrafo */}
                  <FloatingMenu
                    editor={editor}
                    className="cdp-float-menu"
                    tippyOptions={{ duration: 100, placement: "top-start" }}
                  >
                    <div className="cdp-float-group">
                      <button
                        onClick={() => editor.chain().focus().setParagraph().run()}
                        className={`cdp-float-btn${editor.isActive("paragraph") ? " active" : ""}`}
                        title="Texto normal"
                      ><Pilcrow size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`cdp-float-btn${editor.isActive("heading", { level: 1 }) ? " active" : ""}`}
                        title="Título 1"
                      ><Heading1 size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`cdp-float-btn${editor.isActive("heading", { level: 2 }) ? " active" : ""}`}
                        title="Título 2"
                      ><Heading2 size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={`cdp-float-btn${editor.isActive("heading", { level: 3 }) ? " active" : ""}`}
                        title="Título 3"
                      ><Heading3 size={14} /></button>
                    </div>
                    <div className="cdp-float-sep" />
                    <div className="cdp-float-group">
                      <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`cdp-float-btn${editor.isActive("bulletList") ? " active" : ""}`}
                        title="Lista"
                      ><ListIcon size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`cdp-float-btn${editor.isActive("orderedList") ? " active" : ""}`}
                        title="Lista numerada"
                      ><ListOrdered size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={`cdp-float-btn${editor.isActive("blockquote") ? " active" : ""}`}
                        title="Citação"
                      ><Quote size={14} /></button>
                    </div>
                  </FloatingMenu>

                  {/* BubbleMenu — caixa flutuante estilo Notion */}
                  <BubbleMenu
                    editor={editor}
                    className="cdp-bubble-menu"
                    tippyOptions={{ duration: 120, placement: "top", interactive: true }}
                  >
                    {/* Seção 1: Seletor de estilo de texto */}
                    <div className="cdp-bm-section">
                      <button
                        onClick={() => editor.chain().focus().setParagraph().run()}
                        className="cdp-bm-selector"
                      >
                        <span className="cdp-bm-selector-icon">
                          <span className="cdp-bm-t-icon">T</span>
                        </span>
                        <span className="cdp-bm-selector-text">Texto normal</span>
                        <ChevronRight size={12} className="cdp-bm-selector-arrow" />
                      </button>
                    </div>

                    {/* Seção 2: Grid de formatação básica (4 colunas) */}
                    <div className="cdp-bm-grid">
                      <button
                        onClick={() => {
                          const el = document.getElementById("cdp-bm-color-popup");
                          if (el) el.classList.toggle("show");
                        }}
                        className={`cdp-bm-grid-btn${editor.getAttributes("textStyle").color ? " active" : ""}`}
                        title="Cor do texto"
                      ><Palette size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`cdp-bm-grid-btn${editor.isActive("bold") ? " active" : ""}`}
                        title="Negrito"
                      ><Bold size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`cdp-bm-grid-btn${editor.isActive("italic") ? " active" : ""}`}
                        title="Itálico"
                      ><Italic size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`cdp-bm-grid-btn${editor.isActive("underline") ? " active" : ""}`}
                        title="Sublinhado"
                      ><UnderlineIcon size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().unsetAllMarks().run()}
                        className="cdp-bm-grid-btn"
                        title="Limpar formatação"
                      ><RemoveFormatting size={14} /></button>
                    </div>

                    {/* Popup de cores */}
                    <div id="cdp-bm-color-popup" className="cdp-bm-color-popup">
                      {["#e74c3c","#f39c12","#2ecc71","#3498db","#9b59b6","#1abc9c","#e67e22","#34495e"].map(c => (
                        <button
                          key={c}
                          onClick={() => editor.chain().focus().setColor(c).run()}
                          style={{ backgroundColor: c }}
                          className="cdp-bm-color-swatch"
                          title={c}
                        />
                      ))}
                    </div>

                    {/* Seção 3: Segunda linha (grid 4x) */}
                    <div className="cdp-bm-grid">
                      <button
                        onClick={() => {
                          const url = window.prompt("URL do link:", editor.getAttributes("link").href ?? "");
                          if (url === null) return;
                          if (url === "") { editor.chain().focus().unsetLink().run(); }
                          else { editor.chain().focus().setLink({ href: url }).run(); }
                        }}
                        className={`cdp-bm-grid-btn${editor.isActive("link") ? " active" : ""}`}
                        title="Link"
                      ><Link size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={`cdp-bm-grid-btn${editor.isActive("strike") ? " active" : ""}`}
                        title="Tachado"
                      ><Strikethrough size={14} /></button>
                      <button
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={`cdp-bm-grid-btn${editor.isActive("code") ? " active" : ""}`}
                        title="Código"
                      ><Code size={14} /></button>
                      <button
                        className="cdp-bm-grid-btn"
                        title="Fórmula"
                        onClick={() => editor.chain().focus().toggleCode().run()}
                      ><Sigma size={14} /></button>
                      <button className="cdp-bm-grid-btn" title="Mais opções">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>

                    {/* Divisor */}
                    <div className="cdp-bm-divider" />

                    {/* Seção 4: Comentário */}
                    <div className="cdp-bm-comment-row">
                      <div className="cdp-bm-comment-left">
                        <MessageSquare size={14} />
                        <span>Comentário</span>
                      </div>
                      <div className="cdp-bm-comment-right">
                        <button className="cdp-bm-icon-btn" title="Reação"><Smile size={14} /></button>
                        <button className="cdp-bm-icon-btn" title="Anotar"><Pen size={14} /></button>
                      </div>
                    </div>

                    {/* Divisor */}
                    <div className="cdp-bm-divider" />

                    {/* Seção 5: Habilidades (IA) */}
                    <div className="cdp-bm-section">
                      <div className="cdp-bm-section-header">
                        <span className="cdp-bm-section-title">Habilidades</span>
                        <SlidersHorizontal size={13} />
                      </div>
                      <div className="cdp-bm-ai-list">
                        <button className="cdp-bm-ai-item" onClick={() => alert("Melhorar escrita: funcionalidade em breve")}>Melhorar escrita</button>
                        <button className="cdp-bm-ai-item" onClick={() => alert("Revisão: funcionalidade em breve")}>Revisão</button>
                        <button className="cdp-bm-ai-item" onClick={() => alert("Explicar: funcionalidade em breve")}>Explicar</button>
                        <button className="cdp-bm-ai-item disabled" disabled>Reformatar</button>
                      </div>
                      <div className="cdp-bm-more-indicator">
                        <ChevronDown size={13} />
                      </div>
                    </div>

                    {/* Rodapé: Edite com a IA */}
                    <div className="cdp-bm-footer">
                      <div className="cdp-bm-footer-input-wrap">
                        <Sparkles size={12} className="cdp-bm-footer-sparkle" />
                        <input type="text" placeholder="Edite com a IA" className="cdp-bm-footer-input" />
                      </div>
                      <span className="cdp-bm-footer-shortcut">Alt+⇧+E</span>
                    </div>
                  </BubbleMenu>
                  <EditorContent editor={editor} />
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
