import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* ═══════════════════════════════════════════════════
   PromptDialog — Reusable input prompt modal
   Replaces window.prompt() with a styled Notion-like dialog
   ═══════════════════════════════════════════════════ */

interface PromptDialogProps {
  open: boolean;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  open,
  title,
  description,
  defaultValue = "",
  placeholder,
  confirmLabel = "OK",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, defaultValue]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel, onConfirm, value]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(2px)",
        animation: "confirmOverlayIn 150ms ease-out",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-title"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#252525",
          border: "1px solid #3A3A3A",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          animation: "confirmDialogIn 200ms ease-out",
        }}
      >
        {/* Title */}
        <h2 id="prompt-title" style={{ fontSize: 17, fontWeight: 600, color: "#EDEDED", margin: "0 0 8px" }}>
          {title}
        </h2>

        {/* Description */}
        {description && (
          <p style={{ fontSize: 14, color: "#9B9B9B", lineHeight: 1.5, margin: "0 0 16px" }}>
            {description}
          </p>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#1E1E1E",
            border: "1px solid #3A3A3A",
            borderRadius: 8,
            color: "#EDEDED",
            fontSize: 14,
            outline: "none",
            marginBottom: 20,
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#4F8CFF"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#3A3A3A"; }}
        />

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid #3A3A3A",
              borderRadius: 8,
              color: "#D4D4D4",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#2E2E2E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { if (value.trim()) onConfirm(value.trim()); }}
            disabled={!value.trim()}
            style={{
              padding: "8px 16px",
              background: value.trim() ? "#4F8CFF" : "#3A3A3A",
              border: "none",
              borderRadius: 8,
              color: value.trim() ? "#FFFFFF" : "#666",
              fontSize: 14,
              fontWeight: 500,
              cursor: value.trim() ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confirmOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes confirmDialogIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════
   usePrompt — Hook for prompt dialogs
   ═══════════════════════════════════════════════════ */

interface PromptOptions {
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function usePrompt() {
  const [config, setConfig] = useState<PromptOptions & { open: boolean; resolve: (v: string | null) => void } | null>(null);

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise(resolve => {
      setConfig({ ...options, open: true, resolve });
    });
  }, []);

  const handleConfirm = useCallback((value: string) => {
    config?.resolve(value);
    setConfig(null);
  }, [config]);

  const handleCancel = useCallback(() => {
    config?.resolve(null);
    setConfig(null);
  }, [config]);

  const PromptModal = config ? (
    <PromptDialog
      open={config.open}
      title={config.title}
      description={config.description}
      defaultValue={config.defaultValue}
      placeholder={config.placeholder}
      confirmLabel={config.confirmLabel}
      cancelLabel={config.cancelLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { prompt, PromptModal };
}
