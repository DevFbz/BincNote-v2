import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";

/* ── Public imperative API ── */
export interface BlockEditorHandle {
  setContent: (html: string, replace?: boolean) => void;
}

/* ── Props ── */
interface BlockEditorProps {
  /** TipTap doc JSON (or null/undefined) */
  initialContent?: any;
  /** Called whenever content changes (debounced externally) */
  onChange?: (docJson: any) => void;
  /** Called when user selects text */
  onSelect?: (text: string) => void;
  /** Placeholder when empty */
  placeholder?: string;
}

const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
  ({ initialContent, onChange, onSelect, placeholder = "Digite algo..." }, ref) => {
    const prevContentJson = useRef<string>("");
    const onChangeRef = useRef(onChange);
    const onSelectRef = useRef(onSelect);
    onChangeRef.current = onChange;
    onSelectRef.current = onSelect;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        TextStyle,
        Placeholder.configure({ placeholder }),
      ],
      content: initialContent ?? {
        type: "doc",
        content: [{ type: "paragraph" }],
      },
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "blk-input outline-none",
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChangeRef.current?.(ed.getJSON());
      },
      onCreate: ({ editor: ed }) => {
        // Listen for text selection (for context tag)
        ed.on("selectionUpdate", () => {
          const { from, to } = ed.state.selection;
          if (from === to) return;
          const texto = ed.state.doc.textBetween(from, to);
          if (texto.trim()) {
            onSelectRef.current?.(texto);
          }
        });
      },
    });

    // Sync when initialContent changes externally
    useEffect(() => {
      if (!editor) return;
      const json = JSON.stringify(initialContent ?? null);
      if (json !== prevContentJson.current) {
        prevContentJson.current = json;
        const content = initialContent ?? {
          type: "doc",
          content: [{ type: "paragraph" }],
        };
        editor.commands.setContent(content, false);
      }
    }, [editor, initialContent]);

    // Cleanup
    useEffect(() => {
      return () => void editor?.destroy();
    }, [editor]);

    /* ── Imperative API (for AI content injection) ── */
    useImperativeHandle(
      ref,
      () => ({
        setContent: (html: string, replace: boolean = false) => {
          if (!editor) return;
          // Convert plain text / simple HTML to TipTap content
          const text = html
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (!text) return;
          const lines = text.split("\n").filter((l) => l.trim());
          if (lines.length === 0) return;
          const doc = {
            type: "doc",
            content: lines.map((line) => ({
              type: "paragraph",
              content: line ? [{ type: "text", text: line }] : undefined,
            })),
          };
          if (replace) {
            editor.commands.setContent(doc);
          } else {
            editor.commands.insertContent(doc);
          }
        },
      }),
      [editor]
    );

    return (
      <div className="blk-editor">
        <EditorContent editor={editor} />
      </div>
    );
  }
);

BlockEditor.displayName = "BlockEditor";
export default BlockEditor;
