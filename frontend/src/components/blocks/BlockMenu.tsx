import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Text, Heading1, Heading2, Heading3, Heading4,
  FileText, ArrowRight, List, ListOrdered, CheckSquare,
  ChevronsDown, Code, Quote, Highlighter, Sigma,
  Columns3, Columns2, Columns4,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Link, Code2, FunctionSquare, MoreHorizontal,
  MessageSquare, Smile, Settings, Sparkles, Send,
  Check, ChevronRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   PAINEIS DE BLOCOS - Notion Style
   Painel A: Lista de blocos
   Painel B: Toolbar de formatação (aparece no hover)
   ═══════════════════════════════════════════════════ */

interface BlockOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  selected?: boolean;
  hasSubmenu?: boolean;
  command?: () => void;
}

/* ── Painel B: Toolbar de Formatação ── */
function FormatToolbar({
  onFormat,
  onClose,
}: {
  onFormat: (action: string) => void;
  onClose: () => void;
}) {
  const [hovering, setHovering] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleMouseEnter = useCallback(() => {
    setHovering(true);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const handleMouseLeave = useCallback(() => {
    timerRef.current = window.setTimeout(() => {
      setHovering(false);
    }, 200);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const line1 = [
    { id: "text-color", icon: <span style={{ fontSize: 13, fontWeight: 700, textDecoration: "underline", textDecorationColor: "#4F8CFF" }}>A</span>, label: "Cor do texto" },
    { id: "bold", icon: <Bold size={15} />, label: "Negrito" },
    { id: "italic", icon: <Italic size={15} />, label: "Itálico" },
    { id: "underline", icon: <UnderlineIcon size={15} />, label: "Sublinhado" },
    { id: "font", icon: <span style={{ fontSize: 12, fontWeight: 600 }}>Tx</span>, label: "Fonte" },
  ];

  const line2 = [
    { id: "link", icon: <Link size={15} />, label: "Link" },
    { id: "strikethrough", icon: <Strikethrough size={15} />, label: "Tachado" },
    { id: "code", icon: <Code2 size={15} />, label: "Código" },
    { id: "equation", icon: <FunctionSquare size={15} />, label: "Equação" },
    { id: "more", icon: <MoreHorizontal size={15} />, label: "Mais" },
  ];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger: Texto normal */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 10px",
          height: 34,
          borderRadius: 6,
          cursor: "pointer",
          background: hovering ? "#373736" : "transparent",
          transition: "background 0.1s",
        }}
      >
        <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, background: "rgba(255,255,255,0.05)", flexShrink: 0 }}>
          <Text size={14} color="#9B9B9B" />
        </div>
        <span style={{ flex: 1, fontSize: 14, color: "#D4D4D4" }}>Texto normal</span>
        <ChevronRight size={14} color="#7A7A7A" />
      </div>

      {/* Painel B: Conteúdo expandido */}
      {hovering && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 280,
            width: 185,
            background: "#252525",
            borderRadius: 10,
            padding: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 10001,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Divisor 1 */}
          <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

          {/* Toolbar linha 1 */}
          <div style={{ display: "flex", gap: 4, padding: "0 4px", marginBottom: 4 }}>
            {line1.map((item) => (
              <button
                key={item.id}
                title={item.label}
                onClick={() => onFormat(item.id)}
                style={{
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  color: "#B0B0B0",
                  cursor: "pointer",
                  transition: "all 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#3A3A3A"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {item.icon}
              </button>
            ))}
          </div>

          {/* Toolbar linha 2 */}
          <div style={{ display: "flex", gap: 4, padding: "0 4px", marginBottom: 4 }}>
            {line2.map((item) => (
              <button
                key={item.id}
                title={item.label}
                onClick={() => onFormat(item.id)}
                style={{
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  color: "#B0B0B0",
                  cursor: "pointer",
                  transition: "all 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#3A3A3A"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {item.icon}
              </button>
            ))}
          </div>

          {/* Divisor 2 */}
          <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

          {/* Comentário */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 10px",
              height: 34,
              borderRadius: 6,
              cursor: "pointer",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#373736"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <MessageSquare size={14} color="#9B9B9B" />
            <span style={{ flex: 1, fontSize: 14, color: "#D4D4D4" }}>Comentário</span>
            <Smile size={14} color="#7A7A7A" />
          </div>

          {/* Divisor 3 */}
          <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

          {/* Habilidades */}
          <div style={{ padding: "4px 10px 2px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#7A7A7A", letterSpacing: 1, textTransform: "uppercase" }}>Habilidades</span>
            <Settings size={12} color="#7A7A7A" />
          </div>
          <div style={{ padding: "2px 4px" }}>
            {["Melhorar escrita", "Revisão", "Explicar", "Reformatar"].map((item) => (
              <div
                key={item}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#D4D4D4",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                onClick={() => onFormat(item)}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Divisor 4 */}
          <div style={{ height: 1, background: "#3A3A3A", margin: "6px 8px" }} />

          {/* Input IA */}
          <div style={{ padding: "0 4px 4px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 10px",
                background: "#2C2C2C",
                border: "1px solid #3A3A3A",
                borderRadius: 8,
              }}
            >
              <Sparkles size={12} color="#7A7A7A" />
              <input
                placeholder="Edite com a IA"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#D4D4D4",
                  fontSize: 13,
                }}
              />
              <div style={{ display: "flex", gap: 3 }}>
                {["Alt", "⌃", "E"].map((key) => (
                  <span
                    key={key}
                    style={{
                      padding: "2px 4px",
                      background: "#3A3A3A",
                      borderRadius: 4,
                      fontSize: 10,
                      color: "#5C5C5C",
                      fontFamily: "monospace",
                    }}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Painel A: Lista de blocos ── */
export function BlockMenu({
  onSelect,
  onClose,
  position,
}: {
  onSelect: (type: string, attrs?: any) => void;
  onClose: () => void;
  position: { top: number; left: number };
}) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const blockOptions: BlockOption[] = [
    { id: "text", label: "Texto", icon: <Text size={16} />, selected: true, command: () => onSelect("paragraph") },
    { id: "h1", label: "Título 1", icon: <Heading1 size={16} />, command: () => onSelect("heading", { level: 1 }) },
    { id: "h2", label: "Título 2", icon: <Heading2 size={16} />, command: () => onSelect("heading", { level: 2 }) },
    { id: "h3", label: "Título 3", icon: <Heading3 size={16} />, command: () => onSelect("heading", { level: 3 }) },
    { id: "h4", label: "Título 4", icon: <Heading4 size={16} />, command: () => onSelect("heading", { level: 4 }) },
    { id: "page", label: "Página", icon: <FileText size={16} />, command: () => onSelect("page") },
    { id: "page-to", label: "Página em", icon: <ArrowRight size={16} />, hasSubmenu: true, command: () => onSelect("page-to") },
    { id: "bullet", label: "Lista com marcadores", icon: <List size={16} />, command: () => onSelect("bulletList") },
    { id: "numbered", label: "Lista numerada", icon: <ListOrdered size={16} />, command: () => onSelect("orderedList") },
    { id: "todo", label: "Lista de tarefas", icon: <CheckSquare size={16} />, command: () => onSelect("taskList") },
    { id: "toggle", label: "Lista de alternantes", icon: <ChevronsDown size={16} />, command: () => onSelect("toggleList") },
    { id: "code", label: "Código", icon: <Code size={16} />, command: () => onSelect("codeBlock") },
    { id: "quote", label: "Citação", icon: <span style={{ fontSize: 16, fontWeight: 700 }}>"</span>, command: () => onSelect("blockquote") },
    { id: "callout", label: "Frase de destaque", icon: <span style={{ fontSize: 13, fontWeight: 700, border: "1px solid #9B9B9B", padding: "1px 3px", borderRadius: 2 }}>T</span>, command: () => onSelect("callout") },
    { id: "equation", label: "Equação em bloco", icon: <Sigma size={16} />, command: () => onSelect("equation") },
    { id: "toggle-h1", label: "Título alternante 1", icon: <span style={{ fontSize: 12 }}>•H₁</span>, command: () => onSelect("toggleHeading", { level: 1 }) },
    { id: "toggle-h2", label: "Título alternante 2", icon: <span style={{ fontSize: 12 }}>•H₂</span>, command: () => onSelect("toggleHeading", { level: 2 }) },
    { id: "toggle-h3", label: "Título alternante 3", icon: <span style={{ fontSize: 12 }}>•H₃</span>, command: () => onSelect("toggleHeading", { level: 3 }) },
    { id: "toggle-h4", label: "Título alternante 4", icon: <span style={{ fontSize: 12 }}>•H₄</span>, command: () => onSelect("toggleHeading", { level: 4 }) },
    { id: "col-2", label: "2 colunas", icon: <Columns2 size={16} />, command: () => onSelect("columns", { count: 2 }) },
    { id: "col-3", label: "3 colunas", icon: <Columns3 size={16} />, command: () => onSelect("columns", { count: 3 }) },
    { id: "col-4", label: "4 colunas", icon: <Columns4 size={16} />, command: () => onSelect("columns", { count: 4 }) },
    { id: "col-5", label: "5 colunas", icon: <Columns4 size={16} />, command: () => onSelect("columns", { count: 5 }) },
  ];

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: 260,
        maxHeight: "70vh",
        overflowY: "auto",
        background: "#252525",
        borderRadius: 10,
        padding: "8px 6px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        zIndex: 10000,
        fontFamily: '-apple-system, "Segoe UI", Inter, sans-serif',
        fontSize: 14,
      }}
    >
      {blockOptions.map((opt) => (
        <div
          key={opt.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 10px",
            height: 34,
            borderRadius: 6,
            cursor: "pointer",
            background: hoveredItem === opt.id ? "#373736" : "transparent",
            color: hoveredItem === opt.id ? "#FFFFFF" : "#D4D4D4",
            transition: "background 0.1s",
          }}
          onMouseEnter={() => setHoveredItem(opt.id)}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => {
            if (opt.id === "text") {
              // Don't close, just highlight
            } else if (opt.command) {
              opt.command();
              onClose();
            }
          }}
        >
          {/* Ícone */}
          <div style={{
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
            background: "rgba(255,255,255,0.05)",
            flexShrink: 0,
            color: hoveredItem === opt.id ? "#FFFFFF" : "#9B9B9B",
          }}>
            {opt.icon}
          </div>

          {/* Label ou Toolbar */}
          {opt.id === "text" ? (
            <div style={{ flex: 1 }}>
              <FormatToolbar
                onFormat={(action) => {
                  console.log("Format action:", action);
                  onClose();
                }}
                onClose={onClose}
              />
            </div>
          ) : (
            <span style={{ flex: 1, fontSize: 14 }}>{opt.label}</span>
          )}

          {/* Check ou Chevron */}
          {opt.selected && (
            <Check size={14} color="#4F8CFF" />
          )}
          {opt.hasSubmenu && (
            <ChevronRight size={14} color="#7A7A7A" />
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}
