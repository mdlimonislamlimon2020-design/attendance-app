import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** If set, the user must type this exact text to enable the confirm button. */
  requireTypedText?: string;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [typedText, setTypedText] = useState("");

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions = typeof options === "string" ? { message: options } : options;
    return new Promise((resolve) => {
      setTypedText("");
      setPending({ ...normalized, resolve });
    });
  }, []);

  function handleClose(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  const typedOk = !pending?.requireTypedText || typedText === pending.requireTypedText;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 dark:bg-black/60 px-4"
          onClick={() => handleClose(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-slate-800 p-5 shadow-lg"
          >
            {pending.title && (
              <h3 className="mb-2 font-display text-base font-semibold text-navy dark:text-slate-100">
                {pending.title}
              </h3>
            )}
            <p className="whitespace-pre-line text-sm text-navy/80 dark:text-slate-300">
              {pending.message}
            </p>

            {pending.requireTypedText && (
              <div className="mt-3">
                <p className="mb-1 text-xs text-navy/50 dark:text-slate-400">
                  নিশ্চিত হতে টাইপ করুন:{" "}
                  <span className="font-data font-semibold text-navy dark:text-slate-100">
                    {pending.requireTypedText}
                  </span>
                </p>
                <input
                  autoFocus
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="w-full rounded-lg border border-danger px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => handleClose(false)}
                className="rounded-lg border border-navy/15 dark:border-white/10 px-3.5 py-2 text-sm font-medium text-navy dark:text-slate-100 hover:bg-navy/5 dark:hover:bg-white/5"
              >
                {pending.cancelLabel || "বাতিল"}
              </button>
              <button
                onClick={() => handleClose(true)}
                disabled={!typedOk}
                className={
                  "rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40 " +
                  (pending.danger ? "bg-danger hover:bg-danger/90" : "bg-teal hover:bg-teal/90")
                }
              >
                {pending.confirmLabel || "নিশ্চিত করুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
