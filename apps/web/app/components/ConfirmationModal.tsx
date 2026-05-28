"use client";

import { useEffect } from "react";

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "warning",
    onConfirm,
    onCancel,
}: ConfirmationModalProps) {
    // Disable background scrolling when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const themeColors = {
        danger: {
            bg: "bg-rose-50 border-rose-100",
            iconColor: "text-rose-600",
            buttonBg: "bg-rose-600 hover:bg-rose-700 shadow-rose-200",
            icon: (
                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        warning: {
            bg: "bg-amber-50 border-amber-100",
            iconColor: "text-amber-600",
            buttonBg: "bg-orange-500 hover:bg-orange-600 shadow-orange-200",
            icon: (
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        info: {
            bg: "bg-sky-50 border-sky-100",
            iconColor: "text-sky-600",
            buttonBg: "bg-sky-600 hover:bg-sky-700 shadow-sky-200",
            icon: (
                <svg className="h-6 w-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    };

    const activeTheme = themeColors[type];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with fade-in effect */}
            <div 
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onCancel}
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-md transform overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/95 p-6 text-left shadow-[0_32px_120px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out">
                <div className="flex items-start gap-4">
                    {/* Icon container */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] border ${activeTheme.bg}`}>
                        {activeTheme.icon}
                    </div>

                    <div className="flex-1">
                        <h3 className="text-lg font-black text-slate-900 leading-6">{title}</h3>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">{message}</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-full bg-slate-50 border border-slate-100 px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all shadow-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`rounded-full px-5 py-2.5 text-xs font-bold text-white transition-all active:scale-95 shadow-lg ${activeTheme.buttonBg}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
