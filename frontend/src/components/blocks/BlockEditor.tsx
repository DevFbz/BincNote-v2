import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { BlockData, BlockType, createBlock, blocksToDoc, docToBlocks, generateBlockId } from "./types";
import Block from "./Block";

/* ── Public imperative API ── */
export interface BlockEditorHandle {
  setContent: (html: string, replace?: boolean) => void;
}

/* ── Props ── */
interface BlockEditorProps {
  /** Initial content as TipTap doc JSON, or null/undefined */
  initialContent?: any;
  /** Called whenever blocks change */
  onChange?: (docJson: any) => void;
  /** Called when user selects text in a block */
  onSelect?: (text: string) => void;
  /** Placeholder when empty */
  placeholder?: string;
}

const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
  ({ initialContent, onChange, onSelect, placeholder }, ref) => {
    const [blocks, setBlocks] = useState<BlockData[]>(() => {
      if (initialContent) {
        try {
          const parsed = docToBlocks(initialContent);
          if (parsed.length > 0) return parsed;
        } catch {
          // fall through to default
        }
      }
      return [createBlock("paragraph")];
    });

    const prevJson = useRef<string>("");
    const prevContentJson = useRef<string>("");

    // Re-initialize when initialContent changes (e.g. template applied, page loaded)
    useEffect(() => {
      const json = JSON.stringify(initialContent ?? null);
      if (json !== prevContentJson.current) {
        prevContentJson.current = json;
        if (initialContent && initialContent.length > 0) {
          setBlocks(initialContent);
        }
      }
    }, [initialContent]);

    // Notify parent on change
    const notify = useCallback(
      (newBlocks: BlockData[]) => {
        const doc = blocksToDoc(newBlocks);
        const json = JSON.stringify(doc);
        if (json !== prevJson.current) {
          prevJson.current = json;
          onChange?.(doc);
        }
      },
      [onChange]
    );

    const updateBlocks = useCallback(
      (updater: BlockData[] | ((prev: BlockData[]) => BlockData[])) => {
        setBlocks((prev) => {
          const next = typeof updater === "function" ? updater(prev) : updater;
          // Only notify after state is committed — but we can still notify here
          // since React batches setState calls inside event handlers
          notify(next);
          return next;
        });
      },
      [notify]
    );

    /* ── Block operations ── */
    const handleChange = useCallback(
      (id: string, data: Partial<BlockData>) => {
        updateBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
      },
      [updateBlocks]
    );

    const handleDelete = useCallback(
      (id: string) => {
        updateBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === id);
          if (idx === -1) return prev;
          const next = prev.filter((b) => b.id !== id);
          return next.length === 0 ? [createBlock("paragraph")] : next;
        });
      },
      [updateBlocks]
    );

    const handleAddBelow = useCallback(
      (id: string, type: BlockType = "paragraph") => {
        updateBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === id);
          if (idx === -1) return prev;
          const newBlock = createBlock(type);
          const next = [...prev];
          next.splice(idx + 1, 0, newBlock);
          return next;
        });
      },
      [updateBlocks]
    );

    const handleAddAbove = useCallback(
      (id: string, type: BlockType = "paragraph") => {
        updateBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === id);
          if (idx === -1) return prev;
          const newBlock = createBlock(type);
          const next = [...prev];
          next.splice(idx, 0, newBlock);
          return next;
        });
      },
      [updateBlocks]
    );

    const handleChangeType = useCallback(
      (id: string, type: BlockType) => {
        updateBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type, content: b.content } : b)));
      },
      [updateBlocks]
    );

    /* ── Drag end ── */
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        updateBlocks((prev) => {
          const oldIdx = prev.findIndex((b) => b.id === active.id);
          const newIdx = prev.findIndex((b) => b.id === over.id);
          if (oldIdx === -1 || newIdx === -1) return prev;
          return arrayMove(prev, oldIdx, newIdx);
        });
      },
      [updateBlocks]
    );

    /* ── Imperative API (for AI content injection) ── */
    useImperativeHandle(
      ref,
      () => ({
        setContent: (html: string, replace: boolean = false) => {
          // Parse HTML into blocks and insert/replace content
          const text = html
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (!text) return;
          updateBlocks((prev) => {
            const lines = text.split("\n").filter((l) => l.trim());
            if (lines.length === 0) return prev;
            const newBlocks = lines.map((line) => createBlock("paragraph", line));
            if (replace) return newBlocks;
            return [...prev, ...newBlocks];
          });
        },
      }),
      [updateBlocks]
    );

    /* ── Render ── */
    return (
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="blk-editor">
            {blocks.map((block) => (
              <Block
                key={block.id}
                block={block}
                onChange={handleChange}
                onDelete={handleDelete}
                onAddAbove={handleAddAbove}
                onAddBelow={handleAddBelow}
                onChangeType={handleChangeType}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }
);

BlockEditor.displayName = "BlockEditor";
export default BlockEditor;
