import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock, ChevronDown, ChevronRight, Link2, Star, MoreHorizontal, Plus,
  GripVertical, Smile, FileText, Sparkles, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, Code, Link as LinkIcon, MessageSquare, Settings, Sliders,
  Calendar, User, Tag, Copy, Check, Trash2, ArrowRight, Heading1, Heading2,
  Heading3, Heading4, List, ListOrdered, CheckSquare, RefreshCw, Clock, Share2, Clipboard, Download, Text
} from "lucide-react";
import { api } from "../../api/cliente";
import { useConfirm, useToast } from "../ui/ConfirmDialog";

/* ═══════════════════════════════════════════════════════════════
   Notion-style Page Editor — v2.5 (Fully Featured)
   Full-width selection area + two-layer highlight + Painel A & B
   ═══════════════════════════════════════════════════════════════ */

interface SubBlock {
  id: string;
  type: string;
  content: string;
  checked?: boolean;
  expanded?: boolean;
  indent?: number;
  language?: string;
  colorText?: string;
  colorBg?: string;
  emoji?: string;
  imageUrl?: string;
  caption?: string;
}

interface Block {
  id: string;
  type:
    | "paragraph"
    | "heading1"
    | "heading2"
    | "heading3"
    | "heading4"
    | "bullet"
    | "numbered"
    | "todo"
    | "toggle"
    | "code"
    | "quote"
    | "callout"
    | "equation"
    | "toggle-h1"
    | "toggle-h2"
    | "toggle-h3"
    | "toggle-h4"
    | "col-2"
    | "col-3"
    | "col-4"
    | "col-5"
    | "page";
  content: string;
  checked?: boolean;
  expanded?: boolean;
  indent?: number;
  language?: string;
  colorText?: string;
  colorBg?: string;
  emoji?: string;
  imageUrl?: string;
  caption?: string;
  width?: number;
  columnsData?: Block[][];
  widths?: number[];
}

interface Property {
  id: string;
  name: string;
  type: "status" | "date" | "person" | "tags";
  value: any;
}

interface PageData {
  id: number;
  titulo: string;
  icone: string;
  capa: string;
  parent?: number | null;
  kind: "document" | "database";
  conteudo: any;
}

interface NotionPageEditorProps {
  pagina: PageData;
  onSave: (data: Partial<PageData>) => void;
  onSaveConteudo: (conteudo: any) => void;
}

const TEXT_COLUMN_MAX_WIDTH = 720;
const SELECTION_TINT = "rgba(35, 131, 226, 0.13)";

const COLOR_TEXT_MAP: Record<string, string> = {
  gray: "#9B9B9B",
  brown: "#BA8E7A",
  orange: "#E27E3B",
  yellow: "#E6C24A",
  green: "#52C47C",
  blue: "#4F8CFF",
  purple: "#9B70FF",
  pink: "#EB70B1",
  red: "#FF5C5C",
};

const COLOR_BG_MAP: Record<string, string> = {
  gray: "rgba(155, 155, 155, 0.15)",
  brown: "rgba(186, 142, 122, 0.15)",
  orange: "rgba(226, 126, 59, 0.15)",
  yellow: "rgba(230, 194, 74, 0.15)",
  green: "rgba(82, 196, 124, 0.15)",
  blue: "rgba(79, 140, 255, 0.15)",
  purple: "rgba(155, 112, 255, 0.15)",
  pink: "rgba(235, 112, 177, 0.15)",
  red: "rgba(255, 92, 92, 0.15)",
};

const EMOJIS = ["📄","📘","✅","🗓️","🗂️","📝","💡","🎯","🚀","📚","🧠","📌","🎨","🔬","📈","🌱","☕","🏠","💼","🎵","🐈","🐶","🍔","🌍","✈️","🛠️","🔔","🔒","🔑","❤️"];
const CAPA_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
  "linear-gradient(135deg, #fccb90 0%, #e58c88 100%)",
  "linear-gradient(135deg, #d299c2 0%, #fef3bd 100%)",
];

let blockIdCounter = 0;
function generateBlockId(): string {
  return `block-${Date.now()}-${blockIdCounter++}`;
}

function createEmptyBlock(type: Block["type"] = "paragraph", content = ""): Block {
  const block: Block = { id: generateBlockId(), type, content, indent: 0 };
  if (type === "todo") block.checked = false;
  if (type === "toggle" || type.startsWith("toggle-h")) block.expanded = false;
  if (type === "code") block.language = "javascript";
  if (type === "callout") block.emoji = "💡";
  if (type === "equation") block.content = "E = mc^2";
  if (type.startsWith("col-")) {
    const cols = parseInt(type.split("-")[1]) || 2;
    block.columnsData = Array(cols).fill(null).map(() => [createEmptyBlock("paragraph")]);
    block.widths = Array(cols).fill(100 / cols);
  }
  return block;
}

export function NotionPageEditor({ pagina, onSave, onSaveConteudo }: NotionPageEditorProps) {
  const navigate = useNavigate();
  const { confirm, ConfirmModal } = useConfirm();
  const { addToast } = useToast();

  const [title, setTitle] = useState(pagina.titulo);
  const [icone, setIcone] = useState(pagina.icone);
  const [capa, setCapa] = useState(pagina.capa);
  const [coverPositionY, setCoverPositionY] = useState<number>(50);

  // Blocks & Properties
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  // Selection & UI
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  
  // Floating menu states
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [slashMenuTargetBlockId, setSlashMenuTargetBlockId] = useState<string | null>(null);
  const [slashMenuColInfo, setSlashMenuColInfo] = useState<{ parentId: string; colIdx: number } | null>(null);

  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubbleMenuPos, setBubbleMenuPos] = useState({ top: 0, left: 0 });
  const [bubbleSelectedText, setBubbleSelectedText] = useState("");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ top: number; left: number; blockId: string; colInfo?: { parentId: string; colIdx: number } } | null>(null);

  // Drag and drop sorting
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [dragIndicatorPos, setDragIndicatorPos] = useState<"top" | "bottom" | null>(null);

  // Reposition cover state
  const [isRepositioning, setIsRepositioning] = useState(false);
  const coverDragStart = useRef<number | null>(null);
  const coverPositionRef = useRef<number>(50);

  // Header options menus
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showIconMenu, setShowIconMenu] = useState(false);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const blockRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Load and Parse Page Content
  useEffect(() => {
    isFirstRender.current = true;
    setTitle(pagina.titulo || "");
    setIcone(pagina.icone || "");
    setCapa(pagina.capa || "");
    
    if (pagina.conteudo) {
      const data = pagina.conteudo;
      if (data.blocks) {
        setBlocks(data.blocks);
        setProperties(data.properties || []);
        setCoverPositionY(data.coverPositionY !== undefined ? data.coverPositionY : 50);
      } else {
        // Tiptap format migration
        const parsed: Block[] = [];
        if (data.type === "doc" && Array.isArray(data.content)) {
          data.content.forEach((node: any) => {
            let type: Block["type"] = "paragraph";
            if (node.type === "heading") {
              const lvl = node.attrs?.level || 1;
              type = `heading${lvl}` as any;
            } else if (node.type === "bulletList") type = "bullet";
            else if (node.type === "orderedList") type = "numbered";
            else if (node.type === "taskList") type = "todo";
            else if (node.type === "codeBlock") type = "code";
            else if (node.type === "blockquote") type = "quote";
            
            const textContent = node.content ? node.content.map((c: any) => c.text).join("") : "";
            parsed.push({
              id: generateBlockId(),
              type,
              content: textContent,
              indent: 0
            });
          });
        }
        setBlocks(parsed.length ? parsed : [createEmptyBlock()]);
      }
    } else {
      setBlocks([createEmptyBlock()]);
      setProperties([]);
      setCoverPositionY(50);
    }
  }, [pagina.id]);

  // Debounced auto-save content
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      onSaveConteudo({
        blocks,
        properties,
        coverPositionY
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [blocks, properties, coverPositionY]);

  // Save basic info on title/icon/cover changes
  const saveBasicInfo = (updates: Partial<PageData>) => {
    onSave(updates);
  };

  /* ── Typing & Keyboard Handlers ── */
  const handleBlockKeyDown = (e: React.KeyboardEvent, blockId: string, parentId?: string, colIdx?: number) => {
    const list = parentId && colIdx !== undefined
      ? blocks.find(b => b.id === parentId)?.columnsData?.[colIdx] || []
      : blocks;

    const setList = (newSub: Block[] | ((prev: Block[]) => Block[])) => {
      if (parentId && colIdx !== undefined) {
        setBlocks(prev => prev.map(b => {
          if (b.id === parentId && b.columnsData) {
            const nextCols = [...b.columnsData];
            nextCols[colIdx] = typeof newSub === "function" ? newSub(nextCols[colIdx]) : newSub;
            return { ...b, columnsData: nextCols };
          }
          return b;
        }));
      } else {
        setBlocks(prev => typeof newSub === "function" ? newSub(prev) : newSub);
      }
    };

    const idx = list.findIndex(b => b.id === blockId);
    const block = list[idx];

    // Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      // If list block is empty, convert to paragraph
      if (["bullet", "numbered", "todo", "toggle"].includes(block.type) && block.content.trim() === "") {
        setList(prev => prev.map(b => b.id === blockId ? { ...b, type: "paragraph", indent: 0 } : b));
        return;
      }

      // Create new block of same type
      const newType = ["bullet", "numbered", "todo", "toggle"].includes(block.type) ? block.type : "paragraph";
      const newBlock = createEmptyBlock(newType);
      newBlock.indent = block.indent || 0;

      setList(prev => {
        const next = [...prev];
        next.splice(idx + 1, 0, newBlock);
        return next;
      });

      setTimeout(() => {
        blockRefs.current.get(newBlock.id)?.focus();
        setFocusedBlockId(newBlock.id);
      }, 30);
      return;
    }

    // Backspace
    if (e.key === "Backspace") {
      const selection = window.getSelection();
      const caretAtStart = selection?.anchorOffset === 0;

      if (caretAtStart) {
        e.preventDefault();
        
        // If nested/indented list, outdent first
        if ((block.indent || 0) > 0) {
          setList(prev => prev.map(b => b.id === blockId ? { ...b, indent: Math.max(0, (b.indent || 0) - 1) } : b));
          return;
        }

        // If list item, convert to paragraph first
        if (block.type !== "paragraph") {
          setList(prev => prev.map(b => b.id === blockId ? { ...b, type: "paragraph" } : b));
          return;
        }

        // Merge with previous block
        if (idx > 0) {
          const prevBlock = list[idx - 1];
          const originalPrevContent = prevBlock.content;
          const mergedContent = originalPrevContent + block.content;

          // Update previous block content and remove current
          setList(prev => prev.map(b => b.id === prevBlock.id ? { ...b, content: mergedContent } : b).filter(b => b.id !== blockId));

          setTimeout(() => {
            const prevEl = blockRefs.current.get(prevBlock.id);
            if (prevEl) {
              prevEl.focus();
              // Place caret at position where merge happened
              const range = document.createRange();
              const sel = window.getSelection();
              if (prevEl.childNodes.length > 0) {
                const textNode = prevEl.childNodes[0];
                const pos = Math.min(originalPrevContent.length, textNode.textContent?.length || 0);
                range.setStart(textNode, pos);
                range.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(range);
              }
            }
          }, 30);
        }
      }
    }

    // Tab (Indent)
    if (e.key === "Tab") {
      e.preventDefault();
      const direction = e.shiftKey ? -1 : 1;
      setList(prev => prev.map(b => b.id === blockId ? {
        ...b,
        indent: Math.min(5, Math.max(0, (b.indent || 0) + direction))
      } : b));
    }

    // Arrows
    if (e.key === "ArrowUp" && idx > 0) {
      e.preventDefault();
      blockRefs.current.get(list[idx - 1].id)?.focus();
    }
    if (e.key === "ArrowDown" && idx < list.length - 1) {
      e.preventDefault();
      blockRefs.current.get(list[idx + 1].id)?.focus();
    }

    // Command Slash Menu `/`
    if (e.key === "/") {
      const selection = window.getSelection();
      if (selection?.anchorOffset === 0) {
        // Show Slash menu
        e.preventDefault();
        const rect = blockRefs.current.get(blockId)?.getBoundingClientRect();
        if (rect) {
          setSlashMenuPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
          setSlashMenuTargetBlockId(blockId);
          setSlashMenuColInfo(parentId && colIdx !== undefined ? { parentId, colIdx } : null);
          setShowSlashMenu(true);
        }
      }
    }
  };

  const handleBlockInput = (blockId: string, text: string, parentId?: string, colIdx?: number) => {
    if (parentId && colIdx !== undefined) {
      setBlocks(prev => prev.map(b => {
        if (b.id === parentId && b.columnsData) {
          const nextCols = [...b.columnsData];
          nextCols[colIdx] = nextCols[colIdx].map(sb => sb.id === blockId ? { ...sb, content: text } : sb);
          return { ...b, columnsData: nextCols };
        }
        return b;
      }));
    } else {
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: text } : b));
    }
  };

  /* ── Column Separator Resizing ── */
  const handleColumnResize = (blockId: string, index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const block = blocks.find(b => b.id === blockId);
    if (!block || !block.widths) return;

    const startWidths = [...block.widths];
    const rowEl = blockRowRefs.current.get(blockId);
    const containerWidth = rowEl?.getBoundingClientRect().width || 700;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      const nextWidths = [...startWidths];
      nextWidths[index] = Math.max(10, Math.min(80, startWidths[index] + deltaPercent));
      nextWidths[index + 1] = Math.max(10, Math.min(80, startWidths[index + 1] - deltaPercent));

      // Re-normalize sum to 100
      const total = nextWidths.reduce((a, b) => a + b, 0);
      const normalized = nextWidths.map(w => (w / total) * 100);

      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, widths: normalized } : b));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  /* ── Selection Handling ── */
  const getBlockIdAtY = useCallback((clientY: number): string | null => {
    for (const [blockId, rowEl] of blockRowRefs.current.entries()) {
      const rect = rowEl.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return blockId;
      }
    }
    return null;
  }, []);

  const getBlocksInYRange = useCallback((y1: number, y2: number): Set<string> => {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const selected = new Set<string>();

    for (const [blockId, rowEl] of blockRowRefs.current.entries()) {
      const rect = rowEl.getBoundingClientRect();
      const blockCenter = (rect.top + rect.bottom) / 2;
      if (blockCenter >= minY && blockCenter <= maxY) {
        selected.add(blockId);
      }
    }
    return selected;
  }, []);

  const dragStartPos = useRef<{ x: number; y: number; pageX: number; pageY: number } | null>(null);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click
    const target = e.target as HTMLElement;
    
    // Ignore clicks in inputs, pickers, or editable fields
    if (target.closest("[contenteditable='true']") || target.closest("button") || target.closest("input") || target.closest(".notion-popover")) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const containerPageX = rect.left + window.scrollX;
    const containerPageY = rect.top + window.scrollY;

    const startX = e.pageX - containerPageX;
    const startY = e.pageY - containerPageY;

    dragStartPos.current = { 
      x: startX, 
      y: startY, 
      pageX: e.pageX, 
      pageY: e.pageY 
    };

    setSelectedBlocks(new Set());
    setShowBubbleMenu(false);

    // Global drag handlers
    const handleMouseMoveGlobal = (moveEvent: MouseEvent) => {
      if (!dragStartPos.current) return;

      const rectInner = containerRef.current?.getBoundingClientRect();
      if (!rectInner) return;

      const containerPageXInner = rectInner.left + window.scrollX;
      const containerPageYInner = rectInner.top + window.scrollY;

      const currentX = moveEvent.pageX - containerPageXInner;
      const currentY = moveEvent.pageY - containerPageYInner;

      const dy = Math.abs(moveEvent.pageY - dragStartPos.current.pageY);
      const dx = Math.abs(moveEvent.pageX - dragStartPos.current.pageX);

      if (dy > 5 || dx > 5) {
        setIsSelecting(true);
        window.getSelection()?.removeAllRanges();
        (document.activeElement as HTMLElement)?.blur();
      }

      setMarqueeBox({
        x1: dragStartPos.current.x,
        y1: dragStartPos.current.y,
        x2: currentX,
        y2: currentY,
      });

      // Calculate which blocks are selected based on vertical intersection
      const startPageY = dragStartPos.current.pageY;
      const currentPageY = moveEvent.pageY;
      
      const minY = Math.min(startPageY, currentPageY);
      const maxY = Math.max(startPageY, currentPageY);
      const selected = new Set<string>();

      for (const [blockId, rowEl] of blockRowRefs.current.entries()) {
        const rowRect = rowEl.getBoundingClientRect();
        const rowPageTop = rowRect.top + window.scrollY;
        const rowPageBottom = rowRect.bottom + window.scrollY;
        
        const overlaps = Math.max(minY, rowPageTop) <= Math.min(maxY, rowPageBottom);
        if (overlaps) {
          selected.add(blockId);
        }
      }
      setSelectedBlocks(selected);
    };

    const handleMouseUpGlobal = () => {
      dragStartPos.current = null;
      setIsSelecting(false);
      setMarqueeBox(null);
      document.removeEventListener("mousemove", handleMouseMoveGlobal);
      document.removeEventListener("mouseup", handleMouseUpGlobal);
    };

    document.addEventListener("mousemove", handleMouseMoveGlobal);
    document.addEventListener("mouseup", handleMouseUpGlobal);
  }, []);

  const handleContainerMouseMove = useCallback(() => {}, []);
  const handleContainerMouseUp = useCallback(() => {}, []);

  // Text selection detection for BubbleMenu
  useEffect(() => {
    const handleSelectionChange = () => {
      if (isSelecting) return;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Ensure selection is inside a block row
        const container = range.commonAncestorContainer.parentElement;
        if (container && container.closest("[data-block-content='true']")) {
          setBubbleMenuPos({
            top: rect.top - 50 + window.scrollY,
            left: rect.left + rect.width / 2 - 90 + window.scrollX,
          });
          setBubbleSelectedText(selection.toString());
          setShowBubbleMenu(true);
          return;
        }
      }
      setShowBubbleMenu(false);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [isSelecting]);

  // Click outside to clear block selection
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (containerRef.current && !containerRef.current.contains(target) && !target.closest(".notion-popover")) {
        setSelectedBlocks(new Set());
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleTransformBlock = useCallback((blockId: string, newType: Block["type"]) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        const updated = { ...b, type: newType };
        if (newType === "todo" && b.checked === undefined) updated.checked = false;
        if ((newType === "toggle" || newType.startsWith("toggle-h")) && b.expanded === undefined) updated.expanded = false;
        if (newType === "code" && !b.language) updated.language = "javascript";
        if (newType === "callout" && !b.emoji) updated.emoji = "💡";
        return updated;
      }
      return b;
    }));
  }, []);

  /* ── Drag & Drop Sorting ── */
  const handleDragStart = (blockId: string, e: React.DragEvent) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = "move";
    // Set a blank ghost image to hide default browser preview if wanted
  };

  const handleDragOver = (blockId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedBlockId === blockId) return;

    const rowEl = blockRowRefs.current.get(blockId);
    if (!rowEl) return;

    const rect = rowEl.getBoundingClientRect();
    const midY = (rect.top + rect.bottom) / 2;
    const pos = e.clientY < midY ? "top" : "bottom";
    
    setDragOverBlockId(blockId);
    setDragIndicatorPos(pos);
  };

  const handleDrop = (targetBlockId: string) => {
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      clearDragState();
      return;
    }

    setBlocks(prev => {
      const next = [...prev];
      const draggedIdx = next.findIndex(b => b.id === draggedBlockId);
      const draggedBlock = next[draggedIdx];
      next.splice(draggedIdx, 1);

      let targetIdx = next.findIndex(b => b.id === targetBlockId);
      if (dragIndicatorPos === "bottom") {
        targetIdx += 1;
      }
      next.splice(targetIdx, 0, draggedBlock);
      return next;
    });

    clearDragState();
  };

  const clearDragState = () => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
    setDragIndicatorPos(null);
  };

  /* ── Reposition Cover Drag ── */
  const handleCoverMouseDown = (e: React.MouseEvent) => {
    if (!isRepositioning) return;
    coverDragStart.current = e.clientY;
    coverPositionRef.current = coverPositionY;
  };

  const handleCoverMouseMove = (e: React.MouseEvent) => {
    if (!isRepositioning || coverDragStart.current === null) return;
    const deltaY = e.clientY - coverDragStart.current;
    // factor relative to cover height (200px)
    const deltaPercent = (deltaY / 200) * 100;
    const nextY = Math.max(0, Math.min(100, coverPositionRef.current - deltaPercent));
    setCoverPositionY(nextY);
  };

  const handleCoverMouseUp = () => {
    coverDragStart.current = null;
  };

  /* ── Header Toolbar Page Actions ── */
  const handleDuplicarPagina = async () => {
    setShowMoreMenu(false);
    try {
      const response = await api.post<{ id: number }>("/documents/pages/", {
        titulo: `${title} (Cópia)`,
        icone,
        capa,
        conteudo: { blocks, properties, coverPositionY },
        kind: "document",
      });
      addToast("Página duplicada com sucesso", "success");
      navigate(`/pagina/${response.id}`);
    } catch {
      addToast("Erro ao duplicar página", "error");
    }
  };

  const handleMoverLixeira = async () => {
    setShowMoreMenu(false);
    const confirmed = await confirm({
      title: "Mover para Lixeira?",
      description: "Esta página e seus blocos serão movidos para a lixeira.",
      confirmLabel: "Mover",
      variant: "warning"
    });
    if (confirmed) {
      try {
        await api.del(`/documents/pages/${pagina.id}/`);
        addToast("Página movida para a lixeira", "success");
        navigate("/");
      } catch {
        addToast("Erro ao excluir página", "error");
      }
    }
  };

  /* ── Properties Management ── */
  const addCustomProperty = () => {
    const types: Property["type"][] = ["status", "date", "person", "tags"];
    const type = types[properties.length % 4];
    const name = `Propriedade ${properties.length + 1}`;
    
    let defaultValue: any = "";
    if (type === "status") defaultValue = "Em andamento";
    if (type === "date") defaultValue = new Date().toISOString().split("T")[0];
    if (type === "person") defaultValue = "Fbz";
    if (type === "tags") defaultValue = ["Trabalho"];

    const newProp: Property = {
      id: `prop-${Date.now()}`,
      name,
      type,
      value: defaultValue
    };
    setProperties([...properties, newProp]);
    addToast(`Propriedade '${name}' adicionada`, "success");
  };

  const updatePropertyVal = (id: string, value: any) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, value } : p));
  };

  const removeProperty = (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  /* ── Render Blocks helper ── */
  const renderBlockContentEditable = (block: Block, parentId?: string, colIdx?: number) => {
    const isSelected = selectedBlocks.has(block.id);
    const inlineStyle: React.CSSProperties = {
      color: block.colorText ? COLOR_TEXT_MAP[block.colorText] || block.colorText : undefined,
      backgroundColor: block.colorBg ? COLOR_BG_MAP[block.colorBg] || block.colorBg : undefined,
      fontSize: block.type === "heading1" ? 30 :
                block.type === "heading2" ? 24 :
                block.type === "heading3" ? 20 :
                block.type === "heading4" ? 17 : 16,
      fontWeight: block.type.startsWith("heading") ? 700 : 400,
      fontFamily: block.type === "code" ? '"JetBrains Mono", monospace' : "inherit",
      paddingLeft: block.type === "quote" ? 12 : undefined,
      borderLeft: block.type === "quote" ? "3px solid var(--accent)" : undefined,
    };

    if (block.type === "code") {
      return (
        <div style={{ position: "relative", width: "100%", background: "#1E1E1E", borderRadius: 8, padding: "12px 16px" }}>
          {/* Header option */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#6B6B6B" }}>
            <select
              value={block.language || "javascript"}
              onChange={e => {
                const lang = e.target.value;
                setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, language: lang } : b));
              }}
              style={{ background: "transparent", border: "none", outline: "none", color: "#8A8A8A", cursor: "pointer" }}
            >
              {["javascript", "typescript", "python", "css", "html", "sql", "json"].map(l => (
                <option key={l} value={l} style={{ background: "#252525" }}>{l}</option>
              ))}
            </select>
            <button
              onClick={() => {
                navigator.clipboard.writeText(block.content);
                addToast("Código copiado!", "success");
              }}
              className="notion-block-copy-btn"
              style={{ background: "transparent", border: "none", outline: "none", color: "#8A8A8A", cursor: "pointer" }}
            >
              Copiar
            </button>
          </div>
          <div
            ref={el => { if (el) blockRefs.current.set(block.id, el); }}
            contentEditable
            suppressContentEditableWarning
            onInput={e => handleBlockInput(block.id, e.currentTarget.innerText || "", parentId, colIdx)}
            onKeyDown={e => handleBlockKeyDown(e, block.id, parentId, colIdx)}
            style={{ outline: "none", minHeight: 24, whiteSpace: "pre-wrap", color: "#E9E9E7" }}
          >
            {block.content}
          </div>
        </div>
      );
    }

    if (block.type === "callout") {
      return (
        <div style={{ display: "flex", gap: 12, background: "#2E2E2E", borderRadius: 8, padding: 12, width: "100%" }}>
          <span style={{ fontSize: 20, cursor: "pointer" }}>{block.emoji || "💡"}</span>
          <div
            ref={el => { if (el) blockRefs.current.set(block.id, el); }}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Destaque..."
            onInput={e => handleBlockInput(block.id, e.currentTarget.innerText || "", parentId, colIdx)}
            onKeyDown={e => handleBlockKeyDown(e, block.id, parentId, colIdx)}
            className="block-callout-text"
            style={{ outline: "none", flex: 1, minHeight: 24, ...inlineStyle }}
          >
            {block.content}
          </div>
        </div>
      );
    }

    if (block.type === "equation") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 6 }}>
          <div
            ref={el => { if (el) blockRefs.current.set(block.id, el); }}
            contentEditable
            suppressContentEditableWarning
            onInput={e => handleBlockInput(block.id, e.currentTarget.innerText || "", parentId, colIdx)}
            onKeyDown={e => handleBlockKeyDown(e, block.id, parentId, colIdx)}
            style={{ outline: "none", minHeight: 24, textAlign: "center", fontFamily: "monospace", color: "var(--accent)" }}
          >
            {block.content}
          </div>
        </div>
      );
    }

    if (block.type === "page") {
      return (
        <div
          onClick={() => {
            // Navigate if clicked
            addToast("Abrindo subpágina...", "success");
          }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--divider)", borderRadius: 6, cursor: "pointer", width: "100%" }}
          className="subpage-block"
        >
          <FileText size={16} color="var(--accent)" />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{block.content || "Subpágina sem título"}</span>
        </div>
      );
    }

    // List rendering bullet/numbered decorators
    let prefix: React.ReactNode = null;
    const indent = block.indent || 0;

    if (block.type === "bullet") {
      const markers = ["•", "○", "■"];
      prefix = <span style={{ marginRight: 8, color: "#9B9B9B", width: 14, display: "inline-block" }}>{markers[indent % 3]}</span>;
    } else if (block.type === "numbered") {
      const numLabel = getNumberedLabel(block.id, parentId, colIdx);
      prefix = <span style={{ marginRight: 8, color: "#9B9B9B", fontSize: 14, minWidth: 16, display: "inline-block" }}>{numLabel}</span>;
    } else if (block.type === "todo") {
      prefix = (
        <input
          type="checkbox"
          checked={block.checked || false}
          onChange={e => {
            const chk = e.target.checked;
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, checked: chk } : b));
          }}
          style={{ marginRight: 10, width: 16, height: 16, cursor: "pointer", accentColor: "var(--accent)" }}
        />
      );
    } else if (block.type === "toggle" || block.type.startsWith("toggle-h")) {
      prefix = (
        <button
          onClick={() => {
            const exp = !block.expanded;
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, expanded: exp } : b));
          }}
          style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", padding: 2, marginRight: 4 }}
        >
          <ChevronRight size={14} style={{ transform: block.expanded ? "rotate(90deg)" : "none", transition: "transform 0.1s" }} />
        </button>
      );
    }

    return (
      <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
        {prefix}
        <div
          ref={el => { if (el) blockRefs.current.set(block.id, el); }}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={
            block.type === "paragraph" ? 'Digite algo ou "/" para comandos...' : "Sem título"
          }
          onInput={e => handleBlockInput(block.id, e.currentTarget.innerText || "", parentId, colIdx)}
          onKeyDown={e => handleBlockKeyDown(e, block.id, parentId, colIdx)}
          onFocus={() => setFocusedBlockId(block.id)}
          onMouseEnter={() => setHoveredBlockId(block.id)}
          onMouseLeave={() => { if (!isSelecting) setHoveredBlockId(null); }}
          className={`block-content-text ${isSelected ? "selected" : ""}`}
          style={{
            outline: "none",
            flex: 1,
            minHeight: 24,
            ...inlineStyle,
            opacity: (block.type === "todo" && block.checked) ? 0.5 : 1,
            textDecoration: (block.type === "todo" && block.checked) ? "line-through" : undefined,
          }}
        >
          {block.content}
        </div>
      </div>
    );
  };

  const getNumberedLabel = (blockId: string, parentId?: string, colIdx?: number) => {
    const list = parentId && colIdx !== undefined
      ? blocks.find(b => b.id === parentId)?.columnsData?.[colIdx] || []
      : blocks;

    const blockIndex = list.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return "1.";

    let count = 1;
    const currentIndent = list[blockIndex].indent || 0;
    for (let i = blockIndex - 1; i >= 0; i--) {
      const b = list[i];
      if (b.type === "numbered" && (b.indent || 0) === currentIndent) {
        count++;
      } else if ((b.indent || 0) < currentIndent) {
        break;
      }
    }
    return `${count}.`;
  };

  /* ── Filter visible blocks for collapsed toggle support ── */
  const getVisibleBlocks = () => {
    const visible: Block[] = [];
    let hiddenAboveIndent = 999;
    for (const b of blocks) {
      if (b.indent !== undefined && b.indent > hiddenAboveIndent) {
        continue;
      }
      hiddenAboveIndent = 999;
      visible.push(b);
      if ((b.type === "toggle" || b.type.startsWith("toggle-h")) && !b.expanded) {
        hiddenAboveIndent = b.indent || 0;
      }
    }
    return visible;
  };

  return (
    <div
      ref={containerRef}
      className="notion-page-editor"
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
      style={{
        minHeight: "100vh",
        background: "#191919",
        color: "#E9E9E7",
        fontFamily: '-apple-system, "Segoe UI", Inter, sans-serif',
        userSelect: isSelecting ? "none" : "text",
        position: "relative"
      }}
    >
      {ConfirmModal}

      {marqueeBox && (
        <div
          style={{
            position: "absolute",
            top: Math.min(marqueeBox.y1, marqueeBox.y2),
            left: Math.min(marqueeBox.x1, marqueeBox.x2),
            width: Math.abs(marqueeBox.x1 - marqueeBox.x2),
            height: Math.abs(marqueeBox.y1 - marqueeBox.y2),
            background: "rgba(35, 131, 226, 0.12)",
            border: "1px solid rgba(35, 131, 226, 0.3)",
            pointerEvents: "none",
            zIndex: 1000
          }}
        />
      )}

      {/* ═══ HEADER BREADCRUMB ═══ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "#191919",
          borderBottom: "1px solid #2A2A2A",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#8A8A8A", cursor: "pointer" }} className="breadcrumb-segment" onClick={() => navigate("/")}>Workspace</span>
          <span style={{ color: "#4A4A4A" }}>/</span>
          <span style={{ fontSize: 13, color: "#E9E9E7" }} className="breadcrumb-segment truncate max-w-[150px]">{title || "Sem título"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Lock toggle button */}
          <button className="notion-header-btn">
            <Lock size={14} />
            <span>Particular</span>
          </button>
          
          {/* Share option */}
          <div style={{ position: "relative" }}>
            <button className="notion-header-btn" onClick={() => setShowShareMenu(!showShareMenu)}>
              <Share2 size={14} />
              <span>Compartilhar</span>
            </button>
            {showShareMenu && (
              <div className="notion-popover" style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#252525", padding: 12, borderRadius: 8, width: 220, border: "1px solid #3A3A3A", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 100 }}>
                <div style={{ fontSize: 12, color: "#8A8A8A", marginBottom: 8 }}>Link de compartilhamento</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    addToast("Link copiado!", "success");
                    setShowShareMenu(false);
                  }}
                  style={{ display: "flex", gap: 8, width: "100%", padding: 6, border: "none", background: "#2E2E2E", color: "#fff", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                >
                  <Clipboard size={14} /> Copiar link público
                </button>
              </div>
            )}
          </div>

          {/* Star Favorite toggle */}
          <button
            className="notion-header-icon-btn"
            onClick={() => setIsStarred(!isStarred)}
            style={{ color: isStarred ? "#E6C24A" : "#8A8A8A" }}
          >
            <Star size={16} fill={isStarred ? "#E6C24A" : "none"} />
          </button>

          {/* More options ••• dropdown */}
          <div style={{ position: "relative" }}>
            <button className="notion-header-icon-btn" onClick={() => setShowMoreMenu(!showMoreMenu)}>
              <MoreHorizontal size={16} />
            </button>
            {showMoreMenu && (
              <div className="notion-popover" style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#252525", padding: "6px 0", borderRadius: 8, width: 180, border: "1px solid #3A3A3A", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 100 }}>
                <button onClick={handleDuplicarPagina} className="notion-dropdown-item"><Copy size={14} /> Duplicar página</button>
                <button onClick={handleMoverLixeira} className="notion-dropdown-item" style={{ color: "#FF5C5C" }}><Trash2 size={14} /> Mover para lixeira</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ CAPA DA PÁGINA (COVER) ═══ */}
      <div
        className="notion-cover-wrapper"
        onMouseMove={handleCoverMouseMove}
        onMouseUp={handleCoverMouseUp}
        onMouseLeave={handleCoverMouseUp}
        style={{
          height: capa ? 200 : 0,
          background: capa || "transparent",
          backgroundSize: "cover",
          backgroundPosition: `center ${coverPositionY}%`,
          position: "relative",
          transition: isRepositioning ? "none" : "height 0.2s",
          cursor: isRepositioning ? "ns-resize" : "default"
        }}
      >
        {capa && !isRepositioning && (
          <div className="notion-cover-buttons" style={{ position: "absolute", right: 16, bottom: 16, display: "flex", gap: 8 }}>
            <button className="notion-cover-btn" onClick={() => setShowCoverMenu(true)}>Alterar capa</button>
            <button className="notion-cover-btn" onClick={() => setIsRepositioning(true)}>Reposicionar</button>
          </div>
        )}

        {isRepositioning && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseDown={handleCoverMouseDown}>
            <span style={{ fontSize: 13, background: "rgba(0,0,0,0.7)", padding: "4px 12px", borderRadius: 4, fontWeight: 500 }}>Arraste para reposicionar</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRepositioning(false);
                saveBasicInfo({ conteudo: { blocks, properties, coverPositionY } });
              }}
              style={{ position: "absolute", right: 16, bottom: 16, background: "var(--accent)", color: "#191919", border: "none", padding: "4px 10px", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}
            >
              Salvar posição
            </button>
          </div>
        )}

        {/* Change Cover Popover */}
        {showCoverMenu && (
          <div className="notion-popover" style={{ position: "absolute", right: 16, top: 40, background: "#252525", padding: 12, borderRadius: 10, width: 260, border: "1px solid #3A3A3A", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 100 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#8A8A8A" }}>Escolha uma capa</span>
              <button onClick={() => setShowCoverMenu(false)} style={{ background: "transparent", border: "none", color: "#8A8A8A", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
              {CAPA_GRADIENTS.map((g, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCapa(g);
                    saveBasicInfo({ capa: g });
                    setShowCoverMenu(false);
                  }}
                  style={{ height: 40, background: g, borderRadius: 4, cursor: "pointer" }}
                />
              ))}
            </div>
            <button
              onClick={() => {
                setCapa("");
                saveBasicInfo({ capa: "" });
                setShowCoverMenu(false);
              }}
              style={{ width: "100%", padding: "6px 0", background: "rgba(255,92,92,0.1)", border: "none", color: "#FF5C5C", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              Remover capa
            </button>
          </div>
        )}
      </div>

      {/* ═══ MAIN LAYOUT COLUMN ═══ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 40px 100px", position: "relative" }}>
        
        {/* ÍCONE DA PÁGINA */}
        <div style={{ position: "relative", marginTop: capa ? -40 : 40, marginBottom: 16, zIndex: 10 }}>
          <button
            onClick={() => setShowIconMenu(!showIconMenu)}
            style={{
              fontSize: capa ? 64 : 80,
              background: "#191919",
              border: "none",
              borderRadius: "50%",
              width: capa ? 96 : 110,
              height: capa ? 96 : 110,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: capa ? "0 4px 12px rgba(0,0,0,0.5)" : "none"
            }}
          >
            {icone || "📄"}
          </button>

          {showIconMenu && (
            <div className="notion-popover" style={{ position: "absolute", left: 0, top: "100%", marginTop: 8, background: "#252525", padding: 12, borderRadius: 10, width: 280, border: "1px solid #3A3A3A", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 101 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#8A8A8A" }}>Emoji</span>
                <button onClick={() => setShowIconMenu(false)} style={{ background: "transparent", border: "none", color: "#8A8A8A", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 12 }}>
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => {
                      setIcone(e);
                      saveBasicInfo({ icone: e });
                      setShowIconMenu(false);
                    }}
                    style={{ fontSize: 20, background: "transparent", border: "none", cursor: "pointer", padding: 4, borderRadius: 4 }}
                    className="emoji-option"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => {
                    const rnd = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
                    setIcone(rnd);
                    saveBasicInfo({ icone: rnd });
                    setShowIconMenu(false);
                  }}
                  style={{ flex: 1, padding: "6px 0", background: "#2E2E2E", border: "none", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                >
                  Aleatório
                </button>
                <button
                  onClick={() => {
                    setIcone("");
                    saveBasicInfo({ icone: "" });
                    setShowIconMenu(false);
                  }}
                  style={{ flex: 1, padding: "6px 0", background: "rgba(255,92,92,0.1)", border: "none", color: "#FF5C5C", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                >
                  Remover
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BOTÕES CONTEXTUAIS ACIMA DO TÍTULO (Hover) */}
        {!capa && !icone && (
          <div className="notion-ghost-controls" style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            {!icone && <button onClick={() => setShowIconMenu(true)} className="notion-ghost-btn"><Smile size={14} /> Adicionar ícone</button>}
            {!capa && <button onClick={() => { setCapa(CAPA_GRADIENTS[0]); saveBasicInfo({ capa: CAPA_GRADIENTS[0] }); }} className="notion-ghost-btn"><FileText size={14} /> Adicionar capa</button>}
          </div>
        )}

        {/* TÍTULO DA PÁGINA */}
        <input
          value={title}
          placeholder="Sem título"
          onChange={e => setTitle(e.target.value)}
          onBlur={() => {
            if (title !== pagina.titulo) saveBasicInfo({ titulo: title });
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (blocks.length > 0) {
                blockRefs.current.get(blocks[0].id)?.focus();
              } else {
                const b = createEmptyBlock();
                setBlocks([b]);
                setTimeout(() => blockRefs.current.get(b.id)?.focus(), 30);
              }
            }
          }}
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#FFFFFF",
            background: "transparent",
            border: "none",
            outline: "none",
            width: "100%",
            marginBottom: 20
          }}
        />

        {/* ═══ PROPERTIES TABLE ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }} className="properties-section">
          {properties.map(prop => (
            <div key={prop.id} style={{ display: "flex", alignItems: "center", minHeight: 30 }} className="property-row">
              {/* Prop name */}
              <div style={{ width: 140, display: "flex", alignItems: "center", gap: 6, color: "#8A8A8A", fontSize: 13 }}>
                {prop.type === "status" && <Sliders size={14} />}
                {prop.type === "date" && <Calendar size={14} />}
                {prop.type === "person" && <User size={14} />}
                {prop.type === "tags" && <Tag size={14} />}
                <span>{prop.name}</span>
              </div>

              {/* Prop value editable cell */}
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                {prop.type === "status" && (
                  <select
                    value={prop.value}
                    onChange={e => updatePropertyVal(prop.id, e.target.value)}
                    className="property-select"
                  >
                    {["Não iniciado", "Em andamento", "Concluído"].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}

                {prop.type === "date" && (
                  <input
                    type="date"
                    value={prop.value}
                    onChange={e => updatePropertyVal(prop.id, e.target.value)}
                    className="property-date"
                  />
                )}

                {prop.type === "person" && (
                  <select
                    value={prop.value}
                    onChange={e => updatePropertyVal(prop.id, e.target.value)}
                    className="property-select"
                  >
                    {["Fbz", "Visitante", "Ninguém"].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}

                {prop.type === "tags" && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {Array.isArray(prop.value) ? prop.value.map(t => (
                      <span key={t} className="property-badge">{t}</span>
                    )) : <span className="property-badge">{prop.value}</span>}
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeProperty(prop.id)}
                className="property-remove-btn"
                style={{ background: "transparent", border: "none", color: "#6B6B6B", cursor: "pointer", padding: 4 }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* Add property button */}
          <button onClick={addCustomProperty} className="notion-ghost-btn" style={{ alignSelf: "flex-start", fontSize: 12 }}>
            + Adicionar propriedade
          </button>
        </div>

        <div style={{ height: 1, background: "#3A3A3A", margin: "16px 0 24px" }} />

        {/* ═══ BLOCKS LIST ═══ */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {getVisibleBlocks().map((block, index) => {
            const isSelected = selectedBlocks.has(block.id);
            const isDragged = draggedBlockId === block.id;
            const isDragOver = dragOverBlockId === block.id;

            return (
              <div
                key={block.id}
                ref={el => { if (el) blockRowRefs.current.set(block.id, el); }}
                data-block-id={block.id}
                onDragOver={e => handleDragOver(block.id, e)}
                onDrop={() => handleDrop(block.id)}
                className={`block-row ${isSelected ? "selected" : ""} ${isDragged ? "dragging" : ""}`}
                style={{
                  position: "relative",
                  width: "100%",
                  paddingLeft: (block.indent || 0) * 24,
                  background: "transparent",
                  transition: "background 0.08s",
                  borderTop: isDragOver && dragIndicatorPos === "top" ? "2px solid var(--accent)" : "none",
                  borderBottom: isDragOver && dragIndicatorPos === "bottom" ? "2px solid var(--accent)" : "none",
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  setContextMenu({ top: e.clientY + window.scrollY, left: e.clientX + window.scrollX, blockId: block.id });
                }}
              >
                {/* Drag Handle & Plus controls (Visible on hover) */}
                {(hoveredBlockId === block.id || focusedBlockId === block.id) && (
                  <div style={{ position: "absolute", left: -44, top: 4, display: "flex", alignItems: "center", gap: 2 }}>
                    <button
                      onClick={() => {
                        const newParagraph = createEmptyBlock();
                        setBlocks(prev => {
                          const next = [...prev];
                          const curIdx = next.findIndex(b => b.id === block.id);
                          next.splice(curIdx + 1, 0, newParagraph);
                          return next;
                        });
                        setTimeout(() => {
                          blockRefs.current.get(newParagraph.id)?.focus();
                          setFocusedBlockId(newParagraph.id);
                        }, 30);
                      }}
                      className="notion-block-control-btn"
                    >
                      <Plus size={16} />
                    </button>
                    <div
                      draggable
                      onDragStart={e => handleDragStart(block.id, e)}
                      onDragEnd={clearDragState}
                      className="notion-block-control-btn notion-block-control-btn-grab"
                    >
                      <GripVertical size={16} />
                    </div>
                  </div>
                )}

                {/* Camada 2: Text width limited select highlight */}
                <div
                  data-block-content="true"
                  className={`block-content ${isSelected ? "selected" : ""}`}
                  style={{
                    maxWidth: TEXT_COLUMN_MAX_WIDTH,
                    margin: isSelected ? "2px auto" : "0 auto",
                    padding: isSelected ? "3px 8px" : "4px 8px",
                    borderRadius: 4,
                    background: isSelected ? SELECTION_TINT : "transparent",
                    transition: "background 0.08s, margin 0.08s"
                  }}
                >
                  {/* Columns nested rendering */}
                  {block.type.startsWith("col-") && block.columnsData ? (
                    <div style={{ display: "flex", gap: 16, width: "100%", position: "relative" }}>
                      {block.columnsData.map((colList, colIdx) => (
                        <React.Fragment key={colIdx}>
                          {colIdx > 0 && (
                            <div
                              onMouseDown={e => handleColumnResize(block.id, colIdx - 1, e)}
                              style={{ width: 4, cursor: "col-resize", background: "transparent", alignSelf: "stretch" }}
                              className="col-resize-handle"
                            />
                          )}
                          <div style={{ flex: block.widths?.[colIdx] ? `0 0 ${block.widths[colIdx]}%` : 1, minWidth: 0 }}>
                            {colList.map(subB => (
                              <div key={subB.id} style={{ padding: "4px 0" }}>
                                {renderBlockContentEditable(subB, block.id, colIdx)}
                              </div>
                            ))}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    renderBlockContentEditable(block)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ RODAPÉ DO DOCUMENTO ═══ */}
        <div
          onClick={() => {
            const b = createEmptyBlock();
            setBlocks([...blocks, b]);
            setTimeout(() => blockRefs.current.get(b.id)?.focus(), 30);
          }}
          style={{ height: 60, width: "100%", cursor: "text", marginTop: 24, display: "flex", alignItems: "center", color: "#5C5C5C" }}
          className="notion-footer-line"
        >
          <span style={{ fontSize: 13 }}>Comece a digitar, arraste um arquivo aqui ou cole um link.</span>
        </div>
      </div>

      {/* ═══ FLOATING MENU A (SLASH MENU) ═══ */}
      {showSlashMenu && (
        <SlashMenu
          position={slashMenuPos}
          onSelect={(type, attrs) => {
            if (slashMenuTargetBlockId) {
              const updatedBlocks = (prev: Block[]) => prev.map(b => {
                if (b.id === slashMenuTargetBlockId) {
                  return createEmptyBlock(type as any);
                }
                return b;
              });

              if (slashMenuColInfo) {
                setBlocks(prev => prev.map(b => {
                  if (b.id === slashMenuColInfo.parentId && b.columnsData) {
                    const nextCols = [...b.columnsData];
                    nextCols[slashMenuColInfo.colIdx] = nextCols[slashMenuColInfo.colIdx].map(sb => sb.id === slashMenuTargetBlockId ? createEmptyBlock(type as any) : sb);
                    return { ...b, columnsData: nextCols };
                  }
                  return b;
                }));
              } else {
                setBlocks(prev => updatedBlocks(prev));
              }
            }
            setShowSlashMenu(false);
          }}
          onClose={() => setShowSlashMenu(false)}
        />
      )}

      {/* ═══ FLOATING MENU B (BUBBLE MENU / SUBMENU) ═══ */}
      {showBubbleMenu && (
        <BubbleMenu
          position={bubbleMenuPos}
          selectedText={bubbleSelectedText}
          onClose={() => setShowBubbleMenu(false)}
          onFormat={(action) => {
            document.execCommand(action, false);
            setShowBubbleMenu(false);
          }}
          activeBlockId={focusedBlockId}
          blocks={blocks}
          onTransformBlock={handleTransformBlock}
        />
      )}

      {/* ═══ CONTEXT MENU ═══ */}
      {contextMenu && (
        <ContextMenu
          position={{ top: contextMenu.top, left: contextMenu.left }}
          onSelect={(action, arg) => {
            const { blockId } = contextMenu;
            if (action === "delete") {
              setBlocks(prev => prev.filter(b => b.id !== blockId));
            } else if (action === "duplicate") {
              const item = blocks.find(b => b.id === blockId);
              if (item) {
                const dup = { ...item, id: generateBlockId() };
                setBlocks(prev => {
                  const idx = prev.findIndex(b => b.id === blockId);
                  const next = [...prev];
                  next.splice(idx + 1, 0, dup);
                  return next;
                });
              }
            } else if (action === "transform") {
              setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type: arg as any } : b));
            } else if (action === "colorText") {
              setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, colorText: arg } : b));
            } else if (action === "colorBg") {
              setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, colorBg: arg } : b));
            }
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ═══ STYLES ═══ */}
      <style>{`
        /* Segment Breadcrumbs hover */
        .breadcrumb-segment:hover {
          color: #FFFFFF !important;
          text-decoration: underline;
        }

        /* Cover buttons hover animation */
        .notion-cover-btn {
          background: rgba(25, 25, 25, 0.7);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.1);
          color: #D4D4D4;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.1s;
        }
        .notion-cover-btn:hover {
          background: rgba(25, 25, 25, 0.9);
          color: #FFF;
        }

        /* Ghost Controls */
        .notion-ghost-controls {
          opacity: 0;
          transition: opacity 0.15s ease-in-out;
        }
        div:hover > .notion-ghost-controls {
          opacity: 1;
        }
        .notion-ghost-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #8A8A8A;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .notion-ghost-btn:hover {
          background: #2E2E2E;
          color: #FFF;
        }

        /* Properties styles */
        .property-row {
          transition: background-color 0.1s;
        }
        .property-row:hover {
          background: #2E2E2E;
        }
        .property-select, .property-date {
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-size: 13px;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
        }
        .property-select:hover, .property-date:hover {
          background: rgba(255,255,255,0.05);
        }
        .property-badge {
          background: var(--accent);
          color: #191919;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
        }

        /* Block row hover grab */
        .block-row:hover {
          background-color: rgba(255, 255, 255, 0.01);
        }
        .notion-block-control-btn {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #6B6B6B;
          cursor: pointer;
          transition: color 0.1s, background-color 0.1s;
        }
        .notion-block-control-btn:hover {
          color: #D4D4D4;
          background-color: #2E2E2E;
        }
        .notion-block-control-btn-grab {
          cursor: grab;
        }

        /* Selection highlights stacking layers */
        .block-row.selected {
          background-color: transparent !important;
        }
        .block-content.selected {
          background-color: ${SELECTION_TINT} !important;
          outline: 1px solid rgba(168, 220, 255, 0.08);
        }

        /* Contenteditable styling */
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: #5C5C5C;
          pointer-events: none;
        }

        /* Context menu options */
        .notion-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 6px 14px;
          background: transparent;
          border: none;
          color: #D4D4D4;
          text-align: left;
          font-size: 13px;
          cursor: pointer;
        }
        .notion-dropdown-item:hover {
          background: #373736;
          color: #FFF;
        }

        /* Header btns */
        .notion-header-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #8A8A8A;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.1s, color 0.1s;
        }
        .notion-header-btn:hover {
          background: #2E2E2E;
          color: #FFF;
        }
        .notion-header-icon-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #8A8A8A;
          cursor: pointer;
        }
        .notion-header-icon-btn:hover {
          background: #2E2E2E;
          color: #FFF;
        }
        
        .property-remove-btn {
          opacity: 0;
          transition: opacity 0.1s;
        }
        .property-row:hover .property-remove-btn {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAINEL A: SLASH MENU
   ═══════════════════════════════════════════════════ */

interface SlashMenuProps {
  position: { top: number; left: number };
  onSelect: (type: string, attrs?: any) => void;
  onClose: () => void;
}

function SlashMenu({ position, onSelect, onClose }: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const items = [
    { id: "paragraph", label: "Texto", icon: <Text size={16} />, selected: true },
    { id: "heading1", label: "Título 1", icon: <Heading1 size={16} /> },
    { id: "heading2", label: "Título 2", icon: <Heading2 size={16} /> },
    { id: "heading3", label: "Título 3", icon: <Heading3 size={16} /> },
    { id: "heading4", label: "Título 4", icon: <Heading4 size={16} /> },
    { id: "page", label: "Página", icon: <FileText size={16} /> },
    { id: "page-in", label: "Página em", icon: <ArrowRight size={16} />, hasSubmenu: true },
    { id: "bullet", label: "Lista com marcadores", icon: <List size={16} /> },
    { id: "numbered", label: "Lista numerada", icon: <ListOrdered size={16} /> },
    { id: "todo", label: "Lista de tarefas", icon: <CheckSquare size={16} /> },
    { id: "toggle", label: "Lista de alternantes", icon: <ChevronRight size={16} /> },
    { id: "code", label: "Código", icon: <Code size={16} /> },
    { id: "quote", label: "Citação", icon: <span style={{ fontSize: 16, fontWeight: 700 }}>“</span> },
    { id: "callout", label: "Frase de destaque", icon: <span style={{ fontSize: 12, fontWeight: 700, border: "1px solid #9B9B9B", padding: "1px 3px", borderRadius: 2 }}>T</span> },
    { id: "equation", label: "Equação em bloco", icon: <span style={{ fontSize: 13, fontWeight: 700 }}>Σ</span> },
    { id: "toggle-h1", label: "Título alternante 1", icon: <span style={{ fontSize: 12 }}>•H₁</span> },
    { id: "toggle-h2", label: "Título alternante 2", icon: <span style={{ fontSize: 12 }}>•H₂</span> },
    { id: "toggle-h3", label: "Título alternante 3", icon: <span style={{ fontSize: 12 }}>•H₃</span> },
    { id: "toggle-h4", label: "Título alternante 4", icon: <span style={{ fontSize: 12 }}>•H₄</span> },
    { id: "col-2", label: "2 colunas", icon: <span style={{ fontSize: 12 }}>||</span> },
    { id: "col-3", label: "3 colunas", icon: <span style={{ fontSize: 12 }}>|||</span> },
    { id: "col-4", label: "4 colunas", icon: <span style={{ fontSize: 12 }}>||||</span> },
    { id: "col-5", label: "5 colunas", icon: <span style={{ fontSize: 12 }}>|||||</span> },
  ];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest(".notion-popover")) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        width: 260,
        maxHeight: 340,
        overflowY: "auto",
        background: "#252525",
        borderRadius: 10,
        padding: "8px 6px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        zIndex: 100,
        fontFamily: "inherit"
      }}
    >
      {items.map(opt => (
        <div
          key={opt.id}
          style={{
            position: "relative"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 10px",
              height: 34,
              borderRadius: 6,
              cursor: "pointer",
              background: hoveredItemId === opt.id ? "#373736" : "transparent",
              color: hoveredItemId === opt.id ? "#FFFFFF" : "#D4D4D4",
              border: opt.id === "paragraph" ? "1px solid #4F8CFF" : "none",
            }}
            onMouseEnter={() => setHoveredItemId(opt.id)}
            onMouseLeave={() => setHoveredItemId(null)}
            onClick={() => {
              if (opt.id === "paragraph") {
                // Keep selected/trigger hover
              } else {
                onSelect(opt.id);
              }
            }}
          >
            {/* Icon */}
            <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, background: "rgba(255,255,255,0.05)", flexShrink: 0, color: hoveredItemId === opt.id ? "#FFF" : "#9B9B9B" }}>
              {opt.icon}
            </div>

            {/* Label */}
            {opt.id === "paragraph" ? (
              <div style={{ flex: 1 }}>
                <FormatToolbar triggerText="Texto" onFormat={() => onClose()} />
              </div>
            ) : (
              <span style={{ flex: 1, fontSize: 14 }}>{opt.label}</span>
            )}

            {opt.id === "paragraph" && <Check size={14} color="#4F8CFF" />}
            {opt.hasSubmenu && <ChevronRight size={14} color="#7A7A7A" />}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAINEL B: BUBBLE MENU / FORMATTOOLBAR
   ═══════════════════════════════════════════════════ */

interface FormatToolbarProps {
  triggerText: string;
  onFormat: (action: string) => void;
}

function FormatToolbar({ triggerText, onFormat }: FormatToolbarProps) {
  const [hovering, setHovering] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHovering(true);

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const leftSpace = rect.right + 10;
      const isNearRight = rect.right > (window.innerWidth - 220);
      setPosition({
        top: rect.top,
        left: isNearRight ? (rect.left - 200) : leftSpace,
      });
    }
  };

  const handleMouseLeave = () => {
    timerRef.current = window.setTimeout(() => {
      setHovering(false);
    }, 200);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}
    >
      <span style={{ flex: 1, fontSize: 14 }}>{triggerText}</span>
      <ChevronRight size={14} color="#7A7A7A" />

      {hovering && (
        <div
          className="notion-popover"
          style={{
            position: "fixed",
            left: position.left,
            top: position.top,
            width: 185,
            background: "#252525",
            borderRadius: 10,
            padding: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 110,
            display: "flex",
            flexDirection: "column",
            border: "1px solid #3A3A3A"
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header trigger inside Painel B */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px", height: 34, borderRadius: 6, cursor: "pointer", background: "transparent" }}>
            <span style={{ flex: 1, fontSize: 14, color: "#D4D4D4", textAlign: "left" }}>Texto normal</span>
            <ChevronRight size={14} color="#7A7A7A" />
          </div>

          <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

          {/* Line 1 formatting */}
          <div style={{ display: "flex", gap: 4, padding: "0 4px", marginBottom: 4 }}>
            {[
              { id: "bold", icon: <Bold size={14} /> },
              { id: "italic", icon: <Italic size={14} /> },
              { id: "underline", icon: <UnderlineIcon size={14} /> },
              { id: "strikethrough", icon: <Strikethrough size={14} /> },
              { id: "code", icon: <Code size={14} /> }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onFormat(btn.id);
                }}
                className="toolbar-btn"
                style={{ width: 30, height: 30, background: "transparent", border: "none", color: "#B0B0B0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, cursor: "pointer" }}
              >
                {btn.icon}
              </button>
            ))}
          </div>

          {/* Line 2 formatting */}
          <div style={{ display: "flex", gap: 4, padding: "0 4px", marginBottom: 4 }}>
            {[
              { id: "createLink", icon: <LinkIcon size={14} /> },
              { id: "strike", icon: <Strikethrough size={14} /> },
              { id: "code2", icon: <Code size={14} /> },
              { id: "equation", icon: <span style={{ fontSize: 12 }}>√x</span> },
              { id: "more", icon: <MoreHorizontal size={14} /> }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onFormat(btn.id);
                }}
                className="toolbar-btn"
                style={{ width: 30, height: 30, background: "transparent", border: "none", color: "#B0B0B0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, cursor: "pointer" }}
              >
                {btn.icon}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

          {/* Comentario line */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px", height: 34, borderRadius: 6, cursor: "pointer" }} className="toolbar-row-hover">
            <MessageSquare size={14} color="#9B9B9B" />
            <span style={{ flex: 1, fontSize: 13, color: "#D4D4D4", textAlign: "left" }}>Comentário</span>
            <Smile size={14} color="#7A7A7A" />
          </div>

          <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

          {/* Habilidades AI */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#7A7A7A", textTransform: "uppercase" }}>Habilidades</span>
            <Sliders size={12} color="#7A7A7A" />
          </div>
          {["Melhorar escrita", "Revisão", "Explicar", "Reformatar"].map(hab => (
            <div key={hab} className="toolbar-row-hover" style={{ display: "flex", padding: "6px 10px", fontSize: 13, color: "#D4D4D4", cursor: "pointer", borderRadius: 6 }}>
              {hab}
            </div>
          ))}

          <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

          {/* AI Input footer */}
          <div style={{ padding: "0 4px 4px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", background: "#2C2C2C", border: "1px solid #3A3A3A", borderRadius: 8, padding: "6px 8px" }}>
              <Sparkles size={12} color="#7A7A7A" style={{ marginRight: 6 }} />
              <input
                placeholder="Edite com a IA"
                style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#FFF", flex: 1, width: 80 }}
              />
              <span style={{ fontSize: 10, background: "#3A3A3A", padding: "2px 4px", borderRadius: 4, color: "#5C5C5C" }}>Alt+⌃+E</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .toolbar-btn:hover {
          background: #3A3A3A !important;
          color: #FFF !important;
        }
        .toolbar-row-hover:hover {
          background: #373736;
        }
      `}</style>
    </div>
  );
}

interface BubbleMenuProps {
  position: { top: number; left: number };
  selectedText: string;
  onFormat: (action: string) => void;
  onClose: () => void;
  activeBlockId: string | null;
  blocks: Block[];
  onTransformBlock: (blockId: string, newType: Block["type"]) => void;
}

function BubbleMenu({ position, selectedText, onFormat, onClose, activeBlockId, blocks, onTransformBlock }: BubbleMenuProps) {
  const [hoveringTrigger, setHoveringTrigger] = useState(false);
  const timerRef = useRef<number | null>(null);

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const activeType = activeBlock ? activeBlock.type : "paragraph";

  const typeDetails: Record<string, { label: string; icon: React.ReactNode }> = {
    paragraph: { label: "Texto normal", icon: <Text size={14} /> },
    heading1: { label: "Título 1", icon: <Heading1 size={14} /> },
    heading2: { label: "Título 2", icon: <Heading2 size={14} /> },
    heading3: { label: "Título 3", icon: <Heading3 size={14} /> },
    heading4: { label: "Título 4", icon: <Heading4 size={14} /> },
    bullet: { label: "Lista com marcadores", icon: <List size={14} /> },
    numbered: { label: "Lista numerada", icon: <ListOrdered size={14} /> },
    todo: { label: "Lista de tarefas", icon: <CheckSquare size={14} /> },
    toggle: { label: "Lista de alternantes", icon: <ChevronRight size={14} /> },
    code: { label: "Código", icon: <Code size={14} /> },
    quote: { label: "Citação", icon: <span style={{ fontSize: 14, fontWeight: 700 }}>“</span> },
    callout: { label: "Frase de destaque", icon: <span style={{ fontSize: 11, fontWeight: 700, border: "1px solid #9B9B9B", padding: "0px 2px", borderRadius: 2 }}>T</span> },
    equation: { label: "Equação", icon: <span style={{ fontSize: 12, fontWeight: 700 }}>Σ</span> },
    "toggle-h1": { label: "Título alternante 1", icon: <span style={{ fontSize: 11 }}>•H₁</span> },
    "toggle-h2": { label: "Título alternante 2", icon: <span style={{ fontSize: 11 }}>•H₂</span> },
    "toggle-h3": { label: "Título alternante 3", icon: <span style={{ fontSize: 11 }}>•H₃</span> },
    "toggle-h4": { label: "Título alternante 4", icon: <span style={{ fontSize: 11 }}>•H₄</span> },
    "col-2": { label: "2 colunas", icon: <span style={{ fontSize: 11 }}>||</span> },
    "col-3": { label: "3 colunas", icon: <span style={{ fontSize: 11 }}>|||</span> },
    "col-4": { label: "4 colunas", icon: <span style={{ fontSize: 11 }}>||||</span> },
    "col-5": { label: "5 colunas", icon: <span style={{ fontSize: 11 }}>|||||</span> },
  };

  const blockTypes = [
    { id: "paragraph", label: "Texto normal", icon: <Text size={14} /> },
    { id: "heading1", label: "Título 1", icon: <Heading1 size={14} /> },
    { id: "heading2", label: "Título 2", icon: <Heading2 size={14} /> },
    { id: "heading3", label: "Título 3", icon: <Heading3 size={14} /> },
    { id: "heading4", label: "Título 4", icon: <Heading4 size={14} /> },
    { id: "bullet", label: "Lista com marcadores", icon: <List size={14} /> },
    { id: "numbered", label: "Lista numerada", icon: <ListOrdered size={14} /> },
    { id: "todo", label: "Lista de tarefas", icon: <CheckSquare size={14} /> },
    { id: "toggle", label: "Lista de alternantes", icon: <ChevronRight size={14} /> },
    { id: "code", icon: <Code size={14} /> },
    { id: "quote", label: "Citação", icon: <span style={{ fontSize: 14, fontWeight: 700 }}>“</span> },
    { id: "callout", label: "Frase de destaque", icon: <span style={{ fontSize: 11, fontWeight: 700, border: "1px solid #9B9B9B", padding: "0px 2px", borderRadius: 2 }}>T</span> },
    { id: "equation", label: "Equação em bloco", icon: <span style={{ fontSize: 12, fontWeight: 700 }}>Σ</span> },
  ];

  const currentDetails = typeDetails[activeType] || typeDetails.paragraph;

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHoveringTrigger(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = window.setTimeout(() => {
      setHoveringTrigger(false);
    }, 300);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const isNearRight = position.left > (window.innerWidth - 450);
  const submenuStyle: React.CSSProperties = isNearRight
    ? { position: "absolute", right: "100%", marginRight: 6, top: 0 }
    : { position: "absolute", left: "100%", marginLeft: 6, top: 0 };

  return (
    <div
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 101,
        background: "#252525",
        borderRadius: 10,
        padding: 6,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        width: 190,
        border: "1px solid #3A3A3A",
      }}
      onMouseLeave={handleMouseLeave}
    >
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setHoveringTrigger(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 10px",
          height: 34,
          borderRadius: 6,
          cursor: "pointer",
          background: hoveringTrigger ? "#373736" : "transparent"
        }}
      >
        <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {currentDetails.icon}
        </div>
        <span style={{ flex: 1, fontSize: 14, color: "#D4D4D4", textAlign: "left" }}>
          {currentDetails.label}
        </span>
        <ChevronRight size={14} color="#7A7A7A" />
      </div>

      {hoveringTrigger && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            ...submenuStyle,
            width: 220,
            maxHeight: 320,
            overflowY: "auto",
            background: "#252525",
            borderRadius: 10,
            padding: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 110,
            border: "1px solid #3A3A3A",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {blockTypes.map(opt => (
            <div
              key={opt.id}
              onClick={() => {
                if (activeBlockId) {
                  onTransformBlock(activeBlockId, opt.id as any);
                }
                setHoveringTrigger(false);
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 10px",
                height: 34,
                borderRadius: 6,
                cursor: "pointer",
                background: activeType === opt.id ? "#373736" : "transparent",
                color: activeType === opt.id ? "#FFFFFF" : "#D4D4D4",
              }}
              className="toolbar-row-hover"
            >
              <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }}>
                {opt.icon}
              </div>
              <span style={{ flex: 1, fontSize: 13, textAlign: "left" }}>{opt.label}</span>
              {activeType === opt.id && <Check size={14} color="#4F8CFF" />}
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

      <div style={{ display: "flex", gap: 4, padding: "0 4px", marginBottom: 4 }}>
        {[
          { id: "bold", icon: <Bold size={14} /> },
          { id: "italic", icon: <Italic size={14} /> },
          { id: "underline", icon: <UnderlineIcon size={14} /> },
          { id: "strikethrough", icon: <Strikethrough size={14} /> },
          { id: "code", icon: <Code size={14} /> }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => onFormat(btn.id)}
            className="toolbar-btn"
            style={{ width: 30, height: 30, background: "transparent", border: "none", color: "#B0B0B0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, cursor: "pointer" }}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, padding: "0 4px", marginBottom: 4 }}>
        {[
          { id: "createLink", icon: <LinkIcon size={14} /> },
          { id: "strike", icon: <Strikethrough size={14} /> },
          { id: "code2", icon: <Code size={14} /> },
          { id: "equation", icon: <span style={{ fontSize: 12 }}>√x</span> },
          { id: "more", icon: <MoreHorizontal size={14} /> }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => onFormat(btn.id)}
            className="toolbar-btn"
            style={{ width: 30, height: 30, background: "transparent", border: "none", color: "#B0B0B0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, cursor: "pointer" }}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px", height: 34, borderRadius: 6, cursor: "pointer" }} className="toolbar-row-hover">
        <MessageSquare size={14} color="#9B9B9B" />
        <span style={{ flex: 1, fontSize: 13, color: "#D4D4D4", textAlign: "left" }}>Comentário</span>
        <Smile size={14} color="#7A7A7A" />
      </div>

      <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#7A7A7A", textTransform: "uppercase" }}>Habilidades</span>
        <Sliders size={12} color="#7A7A7A" />
      </div>
      {["Melhorar escrita", "Revisão", "Explicar", "Reformatar"].map(hab => (
        <div key={hab} className="toolbar-row-hover" style={{ display: "flex", padding: "6px 10px", fontSize: 13, color: "#D4D4D4", cursor: "pointer", borderRadius: 6 }}>
          {hab}
        </div>
      ))}

      <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

      <div style={{ padding: "0 4px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#2C2C2C", border: "1px solid #3A3A3A", borderRadius: 8, padding: "6px 8px" }}>
          <Sparkles size={12} color="#7A7A7A" style={{ marginRight: 6 }} />
          <input
            placeholder="Edite com a IA"
            style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#FFF", flex: 1, width: 80 }}
          />
          <span style={{ fontSize: 10, background: "#3A3A3A", padding: "2px 4px", borderRadius: 4, color: "#5C5C5C" }}>Alt+⌃+E</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CONTEXT MENU COMPONENT
   ═══════════════════════════════════════════════════ */

interface ContextMenuProps {
  position: { top: number; left: number };
  onSelect: (action: string, arg?: string) => void;
  onClose: () => void;
}

function ContextMenu({ position, onSelect, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showTransformSub, setShowTransformSub] = useState(false);
  const [showColorSub, setShowColorSub] = useState(false);

  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [onClose]);

  const blockTypes = [
    { id: "paragraph", label: "Texto normal" },
    { id: "heading1", label: "Título 1" },
    { id: "heading2", label: "Título 2" },
    { id: "heading3", label: "Título 3" },
    { id: "bullet", label: "Lista com marcadores" },
    { id: "numbered", label: "Lista numerada" },
    { id: "todo", label: "Lista de tarefas" },
    { id: "code", label: "Código" },
    { id: "quote", label: "Citação" },
  ];

  const colors = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        background: "#252525",
        borderRadius: 8,
        border: "1px solid #3A3A3A",
        padding: "4px 0",
        minWidth: 160,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        zIndex: 200,
      }}
      onClick={e => e.stopPropagation()}
    >
      <button onClick={() => onSelect("delete")} className="notion-dropdown-item" style={{ color: "#FF5C5C" }}>
        <Trash2 size={14} /> Excluir
      </button>
      <button onClick={() => onSelect("duplicate")} className="notion-dropdown-item">
        <Copy size={14} /> Duplicar
      </button>

      <div style={{ height: 1, background: "#3A3A3A", margin: "4px 0" }} />

      {/* Transform Option */}
      <div
        onMouseEnter={() => setShowTransformSub(true)}
        onMouseLeave={() => setShowTransformSub(false)}
        style={{ position: "relative" }}
      >
        <div className="notion-dropdown-item" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Transformar em</span>
          <ChevronRight size={14} />
        </div>
        {showTransformSub && (
          <div
            style={{
              position: "absolute",
              left: "100%",
              top: 0,
              background: "#252525",
              borderRadius: 8,
              border: "1px solid #3A3A3A",
              padding: "4px 0",
              minWidth: 150,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            {blockTypes.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  onSelect("transform", t.id);
                  onClose();
                }}
                className="notion-dropdown-item"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Color option */}
      <div
        onMouseEnter={() => setShowColorSub(true)}
        onMouseLeave={() => setShowColorSub(false)}
        style={{ position: "relative" }}
      >
        <div className="notion-dropdown-item" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Colorir</span>
          <ChevronRight size={14} />
        </div>
        {showColorSub && (
          <div
            style={{
              position: "absolute",
              left: "100%",
              top: 0,
              background: "#252525",
              borderRadius: 8,
              border: "1px solid #3A3A3A",
              padding: "6px 12px",
              width: 220,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              maxHeight: 300,
              overflowY: "auto"
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "#8A8A8A", marginBottom: 6 }}>COR DO TEXTO</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 12 }}>
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => { onSelect("colorText", c); onClose(); }}
                  style={{
                    fontSize: 12,
                    background: "transparent",
                    border: `1px solid ${COLOR_TEXT_MAP[c]}`,
                    color: COLOR_TEXT_MAP[c],
                    borderRadius: 4,
                    padding: "2px 4px",
                    cursor: "pointer"
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: "#8A8A8A", marginBottom: 6 }}>FUNDO</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => { onSelect("colorBg", c); onClose(); }}
                  style={{
                    fontSize: 11,
                    background: COLOR_BG_MAP[c],
                    border: "none",
                    color: "#fff",
                    borderRadius: 4,
                    padding: "2px 4px",
                    cursor: "pointer"
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotionPageEditor;
