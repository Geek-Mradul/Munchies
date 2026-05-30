"use client";

import Link from "next/link";
import { useSyncExternalStore, useState, useRef, useEffect } from "react";
import { getDashboardPathForRole } from "../lib/auth";

type StoredUser = {
    id: string;
    email: string;
    firstName: string;
    role: string;
};

function readAuthSnapshot() {
    if (typeof window === "undefined") {
        return "{\"token\":null,\"user\":null}";
    }

    const token = localStorage.getItem("munchies_token");
    const user = localStorage.getItem("munchies_user");

    return JSON.stringify({ token, user });
}

function parseUser(snapshot: string): StoredUser | null {
    try {
        const parsed = JSON.parse(snapshot) as {
            token: string | null;
            user: string | null;
        };

        if (!parsed.token || !parsed.user) {
            return null;
        }

        return JSON.parse(parsed.user) as StoredUser;
    } catch {
        return null;
    }
}

type AuthStatusNavProps = {
    minimal?: boolean;
};

export default function AuthStatusNav({ minimal }: AuthStatusNavProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const snapshot = useSyncExternalStore(
        (onStoreChange) => {
            window.addEventListener("storage", onStoreChange);
            window.addEventListener("munchies-auth-change", onStoreChange);

            return () => {
                window.removeEventListener("storage", onStoreChange);
                window.removeEventListener("munchies-auth-change", onStoreChange);
            };
        },
        readAuthSnapshot,
        () => "{\"token\":null,\"user\":null}"
    );
    const user = parseUser(snapshot);

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    function handleLogout() {
        localStorage.removeItem("munchies_token");
        localStorage.removeItem("munchies_user");
        window.dispatchEvent(new Event("munchies-auth-change"));
    }

    if (!user) {
        return (
            <div className="flex items-center gap-3 text-sm font-semibold">
                <Link
                    href="/login"
                    className="rounded-full px-4 py-2 text-gray-700 transition hover:bg-orange-50 hover:text-orange-700"
                >
                    Sign in
                </Link>
                <Link
                    href="/register"
                    className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-white shadow-lg shadow-orange-200 transition hover:brightness-105"
                >
                    Join
                </Link>
            </div>
        );
    }

    if (minimal) {
        return (
            <div className="flex items-center justify-between gap-3 w-full border-t border-orange-100/60 pt-4 mt-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-xs font-black text-white shadow-sm shrink-0">
                        {user.firstName?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <p className="font-bold text-gray-900 text-sm truncate">{user.firstName || "Account"}</p>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800 transition active:scale-95 shrink-0"
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Clickable Profile Badge */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/50 hover:bg-orange-50 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-700 transition active:scale-95 duration-150 shadow-sm"
            >
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-xs font-black text-white shadow-sm">
                    {user.firstName?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="font-bold text-gray-900 pr-1">{user.firstName || "Account"}</span>
                <span className="text-[10px] text-gray-400">▼</span>
            </button>

            {/* Premium Dropdown Card */}
            {isOpen && (
                <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-orange-100 bg-white p-2 shadow-xl z-50 animate-fade-in">
                    <div className="px-3 py-2.5 text-xs text-gray-500 border-b border-gray-50 mb-1">
                        <p className="font-bold text-gray-900 text-sm truncate">{user.firstName}</p>
                        <p className="text-gray-400 font-medium truncate">{user.email}</p>
                    </div>

                    <div className="space-y-0.5">
                        <Link
                            href="/bookings"
                            onClick={() => setIsOpen(false)}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-xs lg:text-sm font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition"
                        >
                            My Bookings
                        </Link>

                        <Link
                            href="/user"
                            onClick={() => setIsOpen(false)}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-xs lg:text-sm font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition"
                        >
                            Spending Analytics
                        </Link>

                        <Link
                            href="/preferences"
                            onClick={() => setIsOpen(false)}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-xs lg:text-sm font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition"
                        >
                            Email Preferences
                        </Link>

                        {user.role !== "USER" && (
                            <Link
                                href={getDashboardPathForRole(user.role as "USER" | "STORE_OWNER" | "ADMIN")}
                                onClick={() => setIsOpen(false)}
                                className="flex w-full items-center rounded-xl px-3 py-2 text-xs lg:text-sm font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition"
                            >
                                Dashboard
                            </Link>
                        )}
                    </div>

                    <div className="border-t border-gray-50 mt-1 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                handleLogout();
                                setIsOpen(false);
                            }}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-xs lg:text-sm font-bold text-rose-600 hover:bg-rose-50 transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}