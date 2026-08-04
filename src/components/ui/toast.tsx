"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  push: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const toneIcon: Record<ToastTone, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toneColor: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-danger",
  warning: "text-warning",
  info: "text-info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const push = React.useCallback((toast: Omit<ToastItem, "id">) => {
    idRef.current += 1;
    setToasts((prev) => [...prev, { ...toast, id: idRef.current }]);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((toast) => {
          const Icon = toneIcon[toast.tone];
          return (
            <ToastPrimitive.Root
              key={toast.id}
              onOpenChange={(open) => !open && remove(toast.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-lg",
                "data-[state=open]:animate-[toast-in_200ms_ease-out]",
                "data-[state=closed]:animate-[toast-out_150ms_ease-in_forwards]",
              )}
            >
              <Icon className={cn("size-5 shrink-0 mt-0.5", toneColor[toast.tone])} />
              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="text-sm font-semibold text-foreground">
                  {toast.title}
                </ToastPrimitive.Title>
                {toast.description && (
                  <ToastPrimitive.Description className="text-sm text-foreground-muted mt-0.5">
                    {toast.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close className="text-foreground-muted hover:text-foreground">
                <X className="size-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-6 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return {
    success: (title: string, description?: string) => ctx.push({ title, description, tone: "success" }),
    error: (title: string, description?: string) => ctx.push({ title, description, tone: "error" }),
    warning: (title: string, description?: string) => ctx.push({ title, description, tone: "warning" }),
    info: (title: string, description?: string) => ctx.push({ title, description, tone: "info" }),
  };
}
