import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
} from "lucide-react";

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

/* ── BubbleMenu button helper ── */
function Btn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`cdp-bm-btn ${active ? "cdp-bm-btn-active" : ""}`}
    >
      {children}
    </button>
  );
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
        Link.configure({ openOnClick: false }),
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

    const addLink = useCallback(() => {
      if (!editor) return;
      const url = window.prompt("URL do link:", "https://");
      if (url) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }
    }, [editor]);

    return (
      <div className="blk-editor">
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 150, placement: "top" }}
            className="cdp-bubble-menu"
          >
            <Btn
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Negrito"
            >
              <Bold size={15} strokeWidth={2.5} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Itálico"
            >
              <Italic size={15} strokeWidth={2.5} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Sublinhado"
            >
              <UnderlineIcon size={15} strokeWidth={2.5} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              title="Riscado"
            >
              <Strikethrough size={15} strokeWidth={2.5} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive("code")}
              title="Código"
            >
              <Code size={15} strokeWidth={2.5} />
            </Btn>
            <span className="cdp-bm-sep" />
            <Btn
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive("heading", { level: 1 })}
              title="Título 1"
            >
              <Heading1 size={15} strokeWidth={2.5} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive("heading", { level: 2 })}
              title="Título 2"
            >
              <Heading2 size={15} strokeWidth={2.5} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive("heading", { level: 3 })}
              title="Título 3"
            >
              <Heading3 size={15} strokeWidth={2.5} />
            </Btn>
            <span className="cdp-bm-sep" />
            <Btn
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Lista com marcadores"
            >
              <List size={15} strokeWidth={2.5} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Lista numerada"
            >
              <ListOrdered size={15} strokeWidth={2.5} />
            </Btn>
            <Btn
              onClick={addLink}
              active={editor.isActive("link")}
              title="Link"
            >
              <LinkIcon size={15} strokeWidth={2.5} />
            </Btn>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>
    );
  }
);

BlockEditor.displayName = "BlockEditor";
export default BlockEditor;
