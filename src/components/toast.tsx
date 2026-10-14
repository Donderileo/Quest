"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type ToastInput = { message: string; actionLabel?: string; onAction?: () => void };
type ToastState = ToastInput & { id: number };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const counter = useRef(0);

  const show = useCallback((t: ToastInput) => {
    clearTimeout(timer.current);
    setToast({ ...t, id: ++counter.current });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(4px)" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="pointer-events-auto flex items-center gap-4 rounded-2xl bg-foreground/90 py-3 pl-4 pr-3 text-sm font-semibold text-background shadow-[0_12px_32px_-8px_rgba(0,0,0,.35)] backdrop-blur-xl"
            >
              <span>{toast.message}</span>
              {toast.onAction && (
                <button
                  onClick={() => {
                    toast.onAction?.();
                    setToast(null);
                  }}
                  className="press rounded-lg px-2 py-1 font-bold text-[var(--toast-action)]"
                >
                  {toast.actionLabel ?? "Desfazer"}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
