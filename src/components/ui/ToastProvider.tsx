import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

type ToastKind = "success" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, message, kind }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon =
            toast.kind === "success" ? CheckCircle2 : toast.kind === "warning" ? TriangleAlert : Info;
          return (
            <div className={`toast toast-${toast.kind}`} key={toast.id}>
              <Icon size={18} aria-hidden="true" />
              <span>{toast.message}</span>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar aviso"
                onClick={() => dismiss(toast.id)}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast precisa estar dentro de ToastProvider.");
  return value;
}
