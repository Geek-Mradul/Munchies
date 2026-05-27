"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastType = "info" | "success" | "warning" | "error";

type ToastInput = {
    title: string;
    description?: string;
    type?: ToastType;
};

type ToastItem = ToastInput & {
    id: string;
    leaving?: boolean;
};

type ToastContextValue = {
    notify: (toast: ToastInput) => string;
    dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_TIMEOUT_MS = 3500;
const TOAST_ANIMATION_MS = 280;

function getToastStyles(type: ToastType) {
    if (type === "success") {
        return "border-emerald-200 bg-emerald-50 text-emerald-950";
    }

    if (type === "warning") {
        return "border-amber-200 bg-amber-50 text-amber-950";
    }

    if (type === "error") {
        return "border-rose-200 bg-rose-50 text-rose-950";
    }

    return "border-orange-200 bg-white text-gray-950";
}

function getToastAccent(type: ToastType) {
    if (type === "success") {
        return "bg-emerald-500";
    }

    if (type === "warning") {
        return "bg-amber-500";
    }

    if (type === "error") {
        return "bg-rose-500";
    }

    return "bg-orange-500";
}

function getToastLabel(type: ToastType) {
    if (type === "success") {
        return "Success";
    }

    if (type === "warning") {
        return "Heads up";
    }

    if (type === "error") {
        return "Error";
    }

    return "Notice";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timers = useRef<Map<string, number>>(new Map());

    const dismiss = useCallback((id: string) => {
        const timer = timers.current.get(id);

        if (timer) {
            window.clearTimeout(timer);
            timers.current.delete(id);
        }

        // mark leaving to allow exit animation, then remove after animation duration
        setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));

        window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, TOAST_ANIMATION_MS);
    }, []);

    const notify = useCallback(
        ({ title, description, type = "info" }: ToastInput) => {
            const id = window.crypto.randomUUID();

            setToasts((current) => [...current, { id, title, description, type, leaving: false }]);

            const timer = window.setTimeout(() => {
                dismiss(id);
            }, TOAST_TIMEOUT_MS);

            timers.current.set(id, timer);

            return id;
        },
        [dismiss]
    );

    useEffect(() => {
        const activeTimers = timers.current;

        return () => {
            activeTimers.forEach((timer) => window.clearTimeout(timer));
            activeTimers.clear();
        };
    }, []);

    const value = useMemo<ToastContextValue>(
        () => ({ notify, dismiss }),
        [dismiss, notify]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 sm:justify-end sm:px-6 lg:px-8">
                <div className="flex w-full max-w-sm flex-col gap-3">
                    {toasts.map((toast) => {
                        const type = toast.type ?? "info";

                        return (
                            <AnimatedToast key={toast.id} toast={toast} dismiss={dismiss} />
                        );
                    })}
                </div>
            </div>
        </ToastContext.Provider>
    );
}

function AnimatedToast({
    toast,
    dismiss,
}: {
    toast: ToastItem;
    dismiss: (id: string) => void;
}) {
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        // trigger enter animation next frame
        const raf = requestAnimationFrame(() => setEntered(true));

        return () => cancelAnimationFrame(raf);
    }, []);

    const type = toast.type ?? "info";

    const base = `pointer-events-auto overflow-hidden rounded-2xl border shadow-[0_18px_60px_rgba(15,23,42,0.15)] ${getToastStyles(type)} transform transition-all duration-200`;

    const visibleClass = entered && !toast.leaving ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95";

    return (
        <div
            className={`${base} ${visibleClass}`}
            role="status"
            aria-live="polite"
        >
            <div className={`h-1 w-full ${getToastAccent(type)}`} />
            <div className="flex items-start justify-between gap-4 p-4">
                <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                        {getToastLabel(type)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-950">
                        {toast.title}
                    </p>
                    {toast.description && (
                        <p className="mt-1 text-sm leading-6 text-gray-600">
                            {toast.description}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    className="rounded-full px-2 py-1 text-sm font-bold text-gray-400 transition hover:bg-black/5 hover:text-gray-700"
                    aria-label="Dismiss toast"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }

    return useMemo(
        () => ({
            notify: context.notify,
            success: (title: string, description?: string) =>
                context.notify({ title, description, type: "success" }),
            info: (title: string, description?: string) =>
                context.notify({ title, description, type: "info" }),
            warning: (title: string, description?: string) =>
                context.notify({ title, description, type: "warning" }),
            error: (title: string, description?: string) =>
                context.notify({ title, description, type: "error" }),
            dismiss: context.dismiss,
        }),
        [context]
    );
}