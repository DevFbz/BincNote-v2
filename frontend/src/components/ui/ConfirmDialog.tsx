import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

/* ═══════════════════════════════════════════════════
   ConfirmDialog — Reusable modal confirmation
   Replaces window.confirm() with a styled Notion-like dialog
   ═══════════════════════════════════════════════════ */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  variant = "destructive",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap + auto-focus cancel button
  useEffect(() => {
    if (open) {
      // Focus cancel button after render
      setTimeout(() => cancelRef.current?.focus(), 50);
      // Block scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
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
  }, [open, onCancel]);

  if (!open) return null;

  const iconColor = variant === "destructive" ? "#D9A441" : variant === "warning" ? "#D9A441" : "#4F8CFF";
  const confirmBg = variant === "destructive" ? "#E03E3E" : variant === "warning" ? "#D9A441" : "#4F8CFF";
  const confirmHoverBg = variant === "destructive" ? "#C62828" : variant === "warning" ? "#C4922E" : "#3A7AE0";

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
        aria-labelledby="confirm-title"
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
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <AlertTriangle size={20} color={iconColor} style={{ marginTop: 2, flexShrink: 0 }} />
          <h2 id="confirm-title" style={{ fontSize: 17, fontWeight: 600, color: "#EDEDED", margin: 0, lineHeight: 1.4 }}>
            {title}
          </h2>
        </div>

        {/* Description */}
        {description && (
          <p style={{ fontSize: 14, color: "#9B9B9B", lineHeight: 1.5, margin: "0 0 24px 32px" }}>
            {description}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            ref={cancelRef}
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
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              background: confirmBg,
              border: "none",
              borderRadius: 8,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = confirmHoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = confirmBg; }}
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
   Toast System — Lightweight notifications
   ═══════════════════════════════════════════════════ */

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      {createPortal(
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 10001, display: "flex", flexDirection: "column", gap: 8 }}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              style={{
                padding: "12px 16px",
                background: "#252525",
                border: "1px solid #3A3A3A",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                color: "#EDEDED",
                animation: "toastIn 200ms ease-out",
                minWidth: 200,
                maxWidth: 400,
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: toast.type === "success" ? "#30a46c" : toast.type === "error" ? "#E03E3E" : "#4F8CFF",
                flexShrink: 0,
              }} />
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/* ═══════════════════════════════════════════════════
   useConfirm — Hook for confirm dialogs
   ═══════════════════════════════════════════════════ */

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning" | "info";
}

export function useConfirm() {
  const [config, setConfig] = useState<ConfirmOptions & { open: boolean; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfig({ ...options, open: true, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    config?.resolve(true);
    setConfig(null);
  }, [config]);

  const handleCancel = useCallback(() => {
    config?.resolve(false);
    setConfig(null);
  }, [config]);

  const ConfirmModal = config ? (
    <ConfirmDialog
      open={config.open}
      title={config.title}
      description={config.description}
      confirmLabel={config.confirmLabel}
      cancelLabel={config.cancelLabel}
      variant={config.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmModal };
}
