import { useCallback, useMemo, useState } from "react";
import * as Toast from "@radix-ui/react-toast";
import { ToastContext } from "./toast-context";

let idCounter = 0;

const TOAST_DEFAULTS = {
  duration: 4000,
};

const VARIANT_CLASSES = {
  default: "border-border bg-background-elevated text-foreground",
  success: "border-emerald-400/60 bg-emerald-500/90 text-white",
  error: "border-destructive/60 bg-destructive text-destructive-foreground",
  info: "border-accent/60 bg-accent text-accent-foreground",
};

function ToastContainer({ toast, onClose }) {
  const { id, title, description, variant = "default", duration = TOAST_DEFAULTS.duration } = toast;
  const classes = VARIANT_CLASSES[variant] || VARIANT_CLASSES.default;

  return (
    <Toast.Root
      className={`relative mb-3 w-full max-w-sm rounded-2xl border px-4 py-3 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${classes}`}
      duration={duration}
      onOpenChange={(open) => {
        if (!open) onClose(id);
      }}
    >
      {title ? <Toast.Title className="text-sm font-semibold">{title}</Toast.Title> : null}
      {description ? <Toast.Description className="mt-1 text-sm opacity-90">{description}</Toast.Description> : null}
      <Toast.Close className="absolute right-2 top-2 text-xs uppercase tracking-[0.2em] opacity-70 transition hover:opacity-100">
        Schließen
      </Toast.Close>
    </Toast.Root>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    idCounter += 1;
    const id = `toast-${idCounter}`;
    setToasts((current) => [...current, { id, ...toast }]);
    return id;
  }, []);

  const contextValue = useMemo(() => {
    const build = (variant) => (options) => {
      const payload = typeof options === "string" ? { description: options } : options;
      return pushToast({ variant, ...payload });
    };

    return {
      notify: build("default"),
      success: build("success"),
      error: build("error"),
      info: build("info"),
      remove: removeToast,
    };
  }, [pushToast, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      <Toast.Provider swipeDirection="right" label="Benachrichtigungen">
        {children}
        <div className="pointer-events-none fixed inset-x-0 top-6 z-[100] flex flex-col items-center px-3">
          {toasts.map((toast) => (
            <ToastContainer key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
        <Toast.Viewport className="invisible" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

