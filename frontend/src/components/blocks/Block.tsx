import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { BlockData, BlockType, createBlock, generateBlockId } from "./types";
import {
  GripVertical,
  Plus,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Minus,
  Type,
} from "lucide-react";

/* ── Block type icons ── */
const TYPE_ICONS: Record<BlockType, React.ReactNode> = {
  paragraph: <Type size={14} />,
  heading1: <Heading1 size={14} />,
  heading2: <Heading2 size={14} />,
  heading3: <Heading3 size={14} />,
  bulleted_list: <List size={14} />,
  numbered_list: <ListOrdered size={14} />,
  todo: <CheckSquare size={14} />,
  divider: <Minus size={14} />,
};

const TYPE_LABELS: Record<BlockType, string> = {
  paragraph: "Texto",
  heading1: "Título 1",
  heading2: "Título 2",
  heading3: "Título 3",
  bulleted_list: "Lista com marcadores",
  numbered_list: "Lista numerada",
  todo: "Lista de tarefas",
  divider: "Divisor",
};

/* ── Props ── */
interface BlockProps {
  block: BlockData;
  onChange: (id: string, data: Partial<BlockData>) => void;
  onDelete: (id: string) => void;
  onAddAbove: (id: string) => void;
  onAddBelow: (id: string) => void;
  onChangeType: (id: string, type: BlockType) => void;
}

export default React.memo(function Block({ block, onChange, onDelete, onAddAbove, onAddBelow, onChangeType }: BlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus the input when the component mounts (for new blocks)
  useEffect(() => {
    if (inputRef.current && !isDragging) {
      inputRef.current.focus();
    }
  }, []);

  // Sync content from external changes (AI, type change, initial load)
  // without fighting user's typing cursor
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // Skip sync if user is actively typing — DOM already has latest
    if (isTypingRef.current) return;
    const current = el.textContent ?? "";
    if (current !== block.content) {
      el.textContent = block.content;
    }
  }, [block.content, block.type]);

  /* ── Handle keyboard ── */
  const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        // Esc: close type menu
        if (e.key === "Escape") {
          setShowTypeMenu(false);
          return;
        }

        // Enter: create new block below
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onAddBelow(block.id);
          return;
        }

        // Backspace on empty: delete this block
        if (e.key === "Backspace" && !block.content) {
          e.preventDefault();
          onDelete(block.id);
          return;
        }

        // "/" : open type menu (only when empty so user can type / in text)
        if (e.key === "/" && !block.content) {
          e.preventDefault();
          setShowTypeMenu(true);
          return;
        }
      },
      [block.id, block.content, onAddBelow, onDelete]
    );

  /* ── Type select ── */
  const selectType = useCallback(
    (t: BlockType) => {
      onChangeType(block.id, t);
      setShowTypeMenu(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [block.id, onChangeType]
  );

  // Render prefix icon for list types
  const renderPrefix = () => {
    if (block.type === "bulleted_list") return <span className="blk-prefix">•</span>;
    if (block.type === "numbered_list") return <span className="blk-prefix">1.</span>;
    if (block.type === "todo")
      return (
        <input
          type="checkbox"
          checked={!!block.checked}
          onChange={(e) => onChange(block.id, { checked: e.target.checked })}
          className="blk-checkbox"
          onClick={(e) => e.stopPropagation()}
        />
      );
    if (block.type === "heading1" || block.type === "heading2" || block.type === "heading3") {
      return <span className="blk-prefix-icon">{TYPE_ICONS[block.type]}</span>;
    }
    return null;
  };

  /* ── Render ── */
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`blk-wrapper ${isDragging ? "blk-dragging" : ""}`}
    >
      {/* Hover controls */}
      <div className="blk-controls">
        {/* Add button */}
        <div className="blk-control-group">
          <button
            className="blk-btn blk-btn-add"
            onClick={(e) => {
              e.stopPropagation();
              if (e.altKey) onAddAbove(block.id);
              else onAddBelow(block.id);
            }}
            title="Clique para adicionar abaixo. Pressione Alt+clique para adicionar acima."
          >
            <Plus size={12} />
          </button>
          {/* Drag handle */}
          <button className="blk-btn blk-btn-drag" {...attributes} {...listeners}>
            <GripVertical size={12} />
          </button>
        </div>
      </div>

      {/* Block body */}
      <div className="blk-body">
        {renderPrefix()}
        {block.type === "divider" ? (
          <hr className="blk-divider" />
        ) : (
          <div
            ref={inputRef}
            className={`blk-input blk-input-${block.type}`}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={
              block.type === "heading1" ? "Título 1"
              : block.type === "heading2" ? "Título 2"
              : block.type === "heading3" ? "Título 3"
              : block.type === "bulleted_list" ? "Item da lista"
              : block.type === "numbered_list" ? "Item numerado"
              : block.type === "todo" ? "Tarefa"
              : "Digite algo..."
            }
            onInput={(e) => {
              isTypingRef.current = true;
              clearTimeout(typingTimerRef.current);
              typingTimerRef.current = setTimeout(() => {
                isTypingRef.current = false;
              }, 400);
              const text = (e.target as HTMLDivElement).textContent ?? "";
              onChange(block.id, { content: text });
            }}
            onBlur={() => { isTypingRef.current = false; clearTimeout(typingTimerRef.current); }}
            onKeyDown={handleKeyDown}
          />
        )}
      </div>

      {/* Type-change menu ("/" menu) */}
      {showTypeMenu && (
        <div className="blk-type-menu" onClick={(e) => e.stopPropagation()}>
          <div className="blk-type-menu-header">Tipos de bloco</div>
          {(["paragraph", "heading1", "heading2", "heading3", "bulleted_list", "numbered_list", "todo", "divider"] as BlockType[]).map((t) => (
            <button
              key={t}
              className={`blk-type-item ${t === block.type ? "active" : ""}`}
              onClick={() => selectType(t)}
            >
              <span className="blk-type-icon">{TYPE_ICONS[t]}</span>
              <span className="blk-type-label">{TYPE_LABELS[t]}</span>
              {t === block.type && <span className="blk-type-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
