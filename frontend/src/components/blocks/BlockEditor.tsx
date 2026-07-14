import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
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
  MessageSquare,
  Smile,
  Sparkles,
  Settings,
  PaintBucket,
  Eraser,
  Send,
  ArrowUp,
  ChevronRight,
  Text,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
} from "lucide-react";
import { api } from "../../api/cliente";

/* ── Public imperative API ── */
export interface BlockEditorHandle {
  setContent: (html: string, replace?: boolean) => void;
}

/* ── Props ── */
interface BlockEditorProps {
  initialContent?: any;
  onChange?: (docJson: any) => void;
  onSelect?: (text: string) => void;
  placeholder?: string;
}

/* ── AI action helper ── */
async function callAiAction(
  acao: string,
  trecho: string
): Promise<string | null> {
  try {
    const res = await api.post<{ resultado: string }>(
      "/api/ai/acao/",
      { acao, trecho }
    );
    return res.resultado;
  } catch {
    return null;
  }
}

/* ── BubbleMenu button ── */
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

/* ── Confirm overlay for AI results ── */
function AiConfirm({
  text,
  onAccept,
  onDiscard,
}: {
  text: string;
  onAccept: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="cdp-ai-confirm-overlay" onClick={onDiscard}>
      <div className="cdp-ai-confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="cdp-ai-confirm-text">{text}</div>
        <div className="cdp-ai-confirm-actions">
          <button className="cdp-ai-confirm-yes" onClick={onAccept}>
            Substituir
          </button>
          <button className="cdp-ai-confirm-no" onClick={onDiscard}>
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Notion-style block type transform submenu
   ════════════════════════════════════════════ */

interface TransformOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  command: () => void;
  preview?: { tag: string; sample: string };
}

function TransformDropdown({
  onPick,
  onClose,
}: {
  onPick: (type: string, attrs?: any) => void;
  onClose: () => void;
}) {
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);

  const options: (TransformOption & { sub?: Omit<TransformOption, "sub">[] })[] = [
    {
      id: "paragraph",
      label: "Texto normal",
      icon: <Text size={14} />,
      command: () => onPick("paragraph"),
      preview: { tag: "P", sample: "Texto normal" },
    },
    {
      id: "heading",
      label: "Cabeçalhos",
      icon: <Heading1 size={14} />,
      command: () => {},
      sub: [
        {
          id: "h1",
          label: "Título 1",
          icon: <Heading1 size={14} />,
          command: () => onPick("heading", { level: 1 }),
          preview: { tag: "H1", sample: "Título 1" },
        },
        {
          id: "h2",
          label: "Título 2",
          icon: <Heading2 size={14} />,
          command: () => onPick("heading", { level: 2 }),
          preview: { tag: "H2", sample: "Título 2" },
        },
        {
          id: "h3",
          label: "Título 3",
          icon: <Heading3 size={14} />,
          command: () => onPick("heading", { level: 3 }),
          preview: { tag: "H3", sample: "Título 3" },
        },
      ],
    },
    {
      id: "bulletList",
      label: "Lista",
      icon: <List size={14} />,
      command: () => onPick("bulletList"),
      preview: { tag: "UL", sample: "• Item de lista" },
    },
    {
      id: "orderedList",
      label: "Lista numerada",
      icon: <ListOrdered size={14} />,
      command: () => onPick("orderedList"),
      preview: { tag: "OL", sample: "1. Item numerado" },
    },
    {
      id: "taskList",
      label: "Tarefas",
      icon: <CheckSquare size={14} />,
      command: () => onPick("taskList"),
      preview: { tag: "☐", sample: "Tarefa pendente" },
    },
    {
      id: "codeBlock",
      label: "Código",
      icon: <Code size={14} />,
      command: () => onPick("codeBlock"),
      preview: { tag: "</>", sample: "const x = 1;" },
    },
    {
      id: "blockquote",
      label: "Citação",
      icon: <Text size={14} />,
      command: () => onPick("blockquote"),
      preview: { tag: "“", sample: "Citação" },
    },
  ];

  return (
    <div className="cdp-bm-transform-dropdown" onMouseLeave={() => setHoveredSub(null)}>
      {options.map((opt) => (
        <div
          key={opt.id}
          className="cdp-bm-transform-item"
          onMouseEnter={() => opt.sub && setHoveredSub(opt.id)}
          onClick={() => {
            if (!opt.sub) opt.command();
          }}
        >
          <span className="cdp-bm-transform-item-icon">{opt.icon}</span>
          <span className="cdp-bm-transform-item-label">{opt.label}</span>
          {opt.sub && <ChevronRight size={11} className="cdp-bm-transform-item-arrow" />}

          {/* Hover sub-window (Notion-style) */}
          {opt.sub && hoveredSub === opt.id && (
            <div className="cdp-bm-transform-sub">
              {opt.sub.map((sub) => (
                <div
                  key={sub.id}
                  className="cdp-bm-transform-sub-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    sub.command();
                  }}
                >
                  <span className="cdp-bm-transform-item-icon">{sub.icon}</span>
                  <div className="cdp-bm-transform-sub-content">
                    <span className="cdp-bm-transform-sub-tag">{sub.preview?.tag}</span>
                    <span className="cdp-bm-transform-sub-sample">
                      {sub.preview?.sample}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   Block type detection helpers
   ════════════════════════════════════════════ */

interface BlockType {
  icon: React.ReactNode;
  name: string;
}

function currentBlockType(editor: any): BlockType {
  if (editor.isActive("heading", { level: 1 }))
    return { icon: <Heading1 size={15} />, name: "Título 1" };
  if (editor.isActive("heading", { level: 2 }))
    return { icon: <Heading2 size={15} />, name: "Título 2" };
  if (editor.isActive("heading", { level: 3 }))
    return { icon: <Heading3 size={15} />, name: "Título 3" };
  if (editor.isActive("bulletList"))
    return { icon: <List size={15} />, name: "Lista" };
  if (editor.isActive("orderedList"))
    return { icon: <ListOrdered size={15} />, name: "Lista numerada" };
  if (editor.isActive("taskList"))
    return { icon: <CheckSquare size={15} />, name: "Tarefas" };
  if (editor.isActive("codeBlock"))
    return { icon: <Code size={15} />, name: "Código" };
  if (editor.isActive("blockquote"))
    return { icon: <Text size={15} />, name: "Citação" };
  return { icon: <Text size={15} />, name: "Texto normal" };
}

/* ════════════════════════════════════════════
   BlockEditor component
   ════════════════════════════════════════════ */

const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
  ({ initialContent, onChange, onSelect, placeholder = "Digite algo..." }, ref) => {
    const prevContentJson = useRef<string>("");
    const onChangeRef = useRef(onChange);
    const onSelectRef = useRef(onSelect);
    onChangeRef.current = onChange;
    onSelectRef.current = onSelect;

    // AI state
    const [selectedText, setSelectedText] = useState("");
    const [aiLoading, setAiLoading] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<{ acao: string; text: string } | null>(null);
    const [customPrompt, setCustomPrompt] = useState("");
    const [showTransformSubmenu, setShowTransformSubmenu] = useState(false);

    // Hover-open for block-type indicator
    const isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    const transformHoverTimerRef = useRef<number | null>(null);
    const transformWrapRef = useRef<HTMLDivElement>(null);

    const clearTransformTimer = useCallback(() => {
      if (transformHoverTimerRef.current !== null) {
        clearTimeout(transformHoverTimerRef.current);
        transformHoverTimerRef.current = null;
      }
    }, []);

    const handleBlockRowEnter = useCallback(() => {
      if (isTouchDevice) return;
      clearTransformTimer();
      transformHoverTimerRef.current = window.setTimeout(() => {
        setShowTransformSubmenu(true);
      }, 200);
    }, [isTouchDevice, clearTransformTimer]);

    const handleBlockRowLeave = useCallback(() => {
      if (isTouchDevice) return;
      clearTransformTimer();
      transformHoverTimerRef.current = window.setTimeout(() => {
        setShowTransformSubmenu(false);
      }, 150);
    }, [isTouchDevice, clearTransformTimer]);

    const handleArrowClick = useCallback(() => {
      clearTransformTimer();
      setShowTransformSubmenu((prev) => !prev);
    }, [clearTransformTimer]);

    const selectedTextRef = useRef("");
    selectedTextRef.current = selectedText;

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
        ed.on("selectionUpdate", () => {
          const { from, to } = ed.state.selection;
          if (from === to) {
            setSelectedText("");
            return;
          }
          const texto = ed.state.doc.textBetween(from, to);
          if (texto.trim()) {
            setSelectedText(texto);
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

    /* ── Imperative API ── */
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

    const transformTo = useCallback(
      (type: string, attrs?: any) => {
        if (!editor) return;
        editor.chain().focus().setNode(type, attrs).run();
        clearTransformTimer();
        setShowTransformSubmenu(false);
      },
      [editor, clearTransformTimer]
    );

    /* ── AI Actions ── */
    const handleAiAction = useCallback(
      async (acao: string) => {
        const trecho = selectedTextRef.current;
        if (!trecho || !editor) return;
        setAiLoading(acao);
        const result = await callAiAction(acao, trecho);
        setAiLoading(null);
        if (result) {
          setAiResult({ acao, text: result });
        }
      },
      [editor]
    );

    const handleCustomAI = useCallback(() => {
      const trecho = selectedTextRef.current;
      const prompt = customPrompt.trim();
      if (!trecho || !prompt || !editor) return;
      setAiLoading("custom");
      callAiAction("reformular", `${prompt}\n\n${trecho}`).then((result) => {
        setAiLoading(null);
        if (result) {
          setAiResult({ acao: "custom", text: result });
        }
      });
    }, [editor, customPrompt]);

    const acceptAiResult = useCallback(() => {
      if (!editor || !aiResult) return;
      const { from, to } = editor.state.selection;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(aiResult.text)
        .run();
      setAiResult(null);
      setCustomPrompt("");
    }, [editor, aiResult]);

    /* ── Render ── */
    const blockType = editor ? currentBlockType(editor) : { icon: null, name: "" };

    return (
      <div className="blk-editor">
        {aiResult && (
          <AiConfirm
            text={aiResult.text}
            onAccept={acceptAiResult}
            onDiscard={() => setAiResult(null)}
          />
        )}
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{
              duration: 150,
              placement: "top",
              maxWidth: 300,
            }}
            className="cdp-bubble-menu"
          >
            {/* ── Section 1: Block type bar ── */}
            <div
              ref={transformWrapRef}
              className="cdp-bm-transform-wrap"
              onMouseEnter={handleBlockRowEnter}
              onMouseLeave={handleBlockRowLeave}
            >
              <div className="cdp-bm-block-row">
                <span className="cdp-bm-block-icon">{blockType.icon}</span>
                <span className="cdp-bm-block-name">{blockType.name}</span>
                <button
                  className="cdp-bm-block-arrow"
                  onClick={handleArrowClick}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
              {showTransformSubmenu && (
                <TransformDropdown
                  onPick={transformTo}
                  onClose={() => {
                    clearTransformTimer();
                    setShowTransformSubmenu(false);
                  }}
                />
              )}
            </div>

            <div className="cdp-bm-divider" />

            {/* ── Section 2: Formatting grid ── */}
            <div className="cdp-bm-fmt-grid">
              <Btn
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")}
                title="Negrito"
              >
                <Bold size={14} />
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")}
                title="Itálico"
              >
                <Italic size={14} />
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive("underline")}
                title="Sublinhado"
              >
                <UnderlineIcon size={14} />
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive("strike")}
                title="Riscado"
              >
                <Strikethrough size={14} />
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().toggleCode().run()}
                active={editor.isActive("code")}
                title="Código"
              >
                <Code size={14} />
              </Btn>
              <Btn onClick={addLink} active={editor.isActive("link")} title="Link">
                <LinkIcon size={14} />
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().unsetAllMarks().run()}
                active={false}
                title="Limpar formatação"
              >
                <Eraser size={14} />
              </Btn>
              <Btn
                onClick={() => {/* Color submenu TBD */}}
                active={false}
                title="Cor do texto"
              >
                <PaintBucket size={14} />
              </Btn>
            </div>

            <div className="cdp-bm-divider" />

            {/* ── Section 3: Comment line ── */}
            <div className="cdp-bm-comment-row">
              <button
                className="cdp-bm-comment-btn"
                title="Comentar trecho selecionado"
              >
                <MessageSquare size={13} />
                Comentário
              </button>
              <button className="cdp-bm-comment-btn" title="Reagir com emoji">
                <Smile size={13} />
              </button>
            </div>

            <div className="cdp-bm-divider" />

            {/* ── Section 4: Habilidades (AI) ── */}
            <div className="cdp-bm-section-header">
              <span>Habilidades</span>
              <Settings size={12} />
            </div>
            <div className="cdp-bm-ai-list">
              {[
                { id: "melhorar", label: "Melhorar escrita" },
                { id: "corrigir", label: "Revisão" },
                { id: "explicar", label: "Explicar" },
                { id: "reformatar", label: "Reformatar" },
              ].map((item) => (
                <button
                  key={item.id}
                  className={`cdp-bm-ai-item ${
                    aiLoading === item.id ? "loading" : ""
                  } ${!selectedText ? "disabled" : ""}`}
                  onClick={() => handleAiAction(item.id)}
                  disabled={!selectedText || aiLoading !== null}
                >
                  <Sparkles size={12} />
                  <span>{item.label}</span>
                  {aiLoading === item.id && <span className="cdp-bm-ai-spinner" />}
                </button>
              ))}
            </div>

            <div className="cdp-bm-divider" />

            {/* ── Section 5: Footer "Edite com a IA" ── */}
            <div className="cdp-bm-footer">
              <div className="cdp-bm-footer-input-wrap">
                <Sparkles size={12} className="cdp-bm-footer-sparkle" />
                <input
                  className="cdp-bm-footer-input"
                  placeholder="Edite com a IA"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customPrompt.trim() && selectedText) {
                      handleCustomAI();
                    }
                  }}
                />
                <button
                  className="cdp-bm-footer-send"
                  onClick={handleCustomAI}
                  disabled={!customPrompt.trim() || !selectedText || aiLoading !== null}
                >
                  {aiLoading === "custom" ? (
                    <span className="cdp-bm-ai-spinner" />
                  ) : (
                    <ArrowUp size={14} />
                  )}
                </button>
              </div>
              <span className="cdp-bm-footer-shortcut">Alt+E</span>
            </div>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>
    );
  }
);

BlockEditor.displayName = "BlockEditor";
export default BlockEditor;
