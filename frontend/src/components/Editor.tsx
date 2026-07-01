import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Plus, Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Minus } from "lucide-react";

import { t } from "../i18n";

interface EditorProps {
  conteudo: object;
  onChange: (json: object) => void;
}

export function Editor({ conteudo, onChange }: EditorProps) {
  const debounce = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: t("editor.placeholder") }),
    ],
    content: conteudo,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "prose dark:prose-invert max-w-none min-h-[55vh] py-6 outline-none" },
    },
    onUpdate: ({ editor }) => {
      if (debounce.current) window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => onChange(editor.getJSON()), 500);
    },
  });

  useEffect(() => {
    if (editor && conteudo && JSON.stringify(editor.getJSON()) !== JSON.stringify(conteudo)) {
      editor.commands.setContent(conteudo as any, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteudo]);

  useEffect(() => () => void (editor?.destroy()), [editor]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {editor && <BarraEditor editor={editor} />}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function BarraEditor({ editor }: { editor: any }) {
  const [abrirAdd, setAbrirAdd] = useState(false);
  if (!editor) return null;
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b px-4 py-1.5 text-sm bg-surface-1/80 dark:bg-surface-dark1/80 backdrop-blur" style={{ borderColor: "var(--divider)" }}>
      <div className="relative">
        <button onClick={() => setAbrirAdd((v) => !v)} className="btn btn-ghost" title={t("blockActions.addBelowTooltip")}>
          <Plus size={14} /> {t("toolbar.addBlock")}
        </button>
        {abrirAdd && (
          <div className="absolute left-0 top-9 z-20 card p-1.5 w-56 shadow-pop">
            <ItemBloco
              icon={<Type size={14} />}
              label={t("editor.text")}
              onClick={() => { editor.chain().focus().setParagraph().run(); setAbrirAdd(false); }}
            />
            <ItemBloco
              icon={<Heading1 size={14} />}
              label={t("toolbar.h1")}
              onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setAbrirAdd(false); }}
            />
            <ItemBloco
              icon={<Heading2 size={14} />}
              label={t("toolbar.h2")}
              onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setAbrirAdd(false); }}
            />
            <ItemBloco
              icon={<Heading3 size={14} />}
              label={t("toolbar.h3")}
              onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setAbrirAdd(false); }}
            />
            <ItemBloco
              icon={<List size={14} />}
              label={t("editor.bulletList")}
              onClick={() => { editor.chain().focus().toggleBulletList().run(); setAbrirAdd(false); }}
            />
            <ItemBloco
              icon={<ListOrdered size={14} />}
              label={t("editor.orderedList")}
              onClick={() => { editor.chain().focus().toggleOrderedList().run(); setAbrirAdd(false); }}
            />
            <ItemBloco
              icon={<CheckSquare size={14} />}
              label={t("editor.taskList")}
              onClick={() => { editor.chain().focus().toggleTaskList().run(); setAbrirAdd(false); }}
            />
            <ItemBloco
              icon={<Quote size={14} />}
              label={t("editor.quote")}
              onClick={() => { editor.chain().focus().toggleBlockquote().run(); setAbrirAdd(false); }}
            />
            <ItemBloco
              icon={<Code size={14} />}
              label={t("editor.code")}
              onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setAbrirAdd(false); }}
            />
            <ItemBloco
              icon={<Minus size={14} />}
              label={t("editor.divider")}
              onClick={() => { editor.chain().focus().setHorizontalRule().run(); setAbrirAdd(false); }}
            />
          </div>
        )}
      </div>
      <Sep />
      <Btn label="B" title={`${t("editor.bold")} (Ctrl+B)`} onClick={() => editor.chain().focus().toggleBold().run()} ativo={editor.isActive("bold")} bold />
      <Btn label="I" title={`${t("editor.italic")} (Ctrl+I)`} onClick={() => editor.chain().focus().toggleItalic().run()} ativo={editor.isActive("italic")} italic />
      <Btn label="U" title={`${t("editor.underline")} (Ctrl+U)`} onClick={() => editor.chain().focus().toggleUnderline().run()} ativo={editor.isActive("underline")} underline />
      <Btn label="S" title={t("editor.strike")} onClick={() => editor.chain().focus().toggleStrike().run()} ativo={editor.isActive("strike")} strike />
      <Sep />
      <Btn label="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} ativo={editor.isActive("heading", { level: 1 })} />
      <Btn label="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} ativo={editor.isActive("heading", { level: 2 })} />
      <Btn label="H3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} ativo={editor.isActive("heading", { level: 3 })} />
      <Sep />
      <Btn label="•" title={t("editor.bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} ativo={editor.isActive("bulletList")} />
      <Btn label="1." title={t("editor.orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} ativo={editor.isActive("orderedList")} />
      <Btn label="☐" title={t("editor.taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} ativo={editor.isActive("taskList")} />
      <Btn label="❝" title={t("editor.quote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} ativo={editor.isActive("blockquote")} />
      <Btn label="</>" title={t("editor.code")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} ativo={editor.isActive("codeBlock")} />
      <Btn label="—" title={t("editor.divider")} onClick={() => editor.chain().focus().setHorizontalRule().run()} ativo={false} />
      <Btn label="✦" title={t("editor.highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} ativo={editor.isActive("highlight")} />
      <Btn
        label="🔗"
        title={t("editor.link")}
        onClick={() => {
          const url = window.prompt(t("editor.link"), "");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        ativo={editor.isActive("link")}
      />
    </div>
  );
}

function ItemBloco({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-surface-3 dark:hover:bg-surface-dark3 text-left">
      <span className="text-txt-muted">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Sep() {
  return <span className="w-px h-5 mx-1 bg-surface-4 dark:bg-surface-dark4" />;
}

function Btn({
  label, onClick, ativo, title, bold, italic, underline, strike,
}: {
  label: string;
  onClick: () => void;
  ativo: boolean;
  title?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2 py-1 rounded-md border border-transparent hover:bg-surface-3 dark:hover:bg-surface-dark3 transition-colors ${
        ativo ? "bg-surface-3 dark:bg-surface-dark3 font-semibold text-accent" : ""
      } ${bold ? "font-bold" : ""} ${italic ? "italic" : ""} ${underline ? "underline" : ""} ${strike ? "line-through" : ""}`}
    >
      {label}
    </button>
  );
}