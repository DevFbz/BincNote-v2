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
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

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
      return <List size={14} className={cls} />;
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

  function formatDate(s: string) {
    if (!s) return "";
    try {
      return new Date(s).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return s;
    }
  }

  return (
    <div className="cdp-prop-row">
      <div className="cdp-prop-label">
        <FieldIcon kind={field.kind} />
        <span>{field.nome}</span>
      </div>
      <div className="cdp-prop-value-cell">
        <input
          type="date"
          defaultValue={raw}
          className="cdp-date-input"
          onChange={(e) => onUpdate(field.id, { text: e.target.value })}
        />
        {raw ? (
          <span className="cdp-date-display">{formatDate(raw)}</span>
        ) : (
          <span className="cdp-empty-value">Vazio</span>
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
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Adicione uma descrição ou notas..." }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "cdp-editor-content",
      },
    },
    onUpdate: ({ editor: e }) => {
      if (debounce.current) window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => {
        // In a future iteration, persist the content to the record
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
              {editor && <EditorContent editor={editor} />}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
