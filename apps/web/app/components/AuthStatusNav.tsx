"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { submitStoreOwnerRequest } from "../lib/storeOwnerRequests";

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

export default function AuthStatusNav() {
    const [requestLoading, setRequestLoading] = useState(false);
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

    function handleLogout() {
        localStorage.removeItem("munchies_token");
        localStorage.removeItem("munchies_user");
        window.dispatchEvent(new Event("munchies-auth-change"));
    }

    async function handleBecomeOwner() {
        try {
            setRequestLoading(true);
            const response = await submitStoreOwnerRequest();
            alert(response.message || "Request submitted successfully");
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to submit request"
            );
        } finally {
            setRequestLoading(false);
        }
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

    return (
        <div className="flex items-center gap-3">
            <Link
                href="/bookings"
                className="hidden rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-orange-700 md:inline-flex"
            >
                My bookings
            </Link>

            {user.role === "STORE_OWNER" && (
                <Link
                    href="/owner/bookings"
                    className="hidden rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-orange-700 lg:inline-flex"
                >
                    Owner orders
                </Link>
            )}

            {user.role === "ADMIN" && (
                <Link
                    href="/admin/store-owner-requests"
                    className="hidden rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-orange-700 lg:inline-flex"
                >
                    Owner requests
                </Link>
            )}

            {user.role === "USER" && (
                <button
                    type="button"
                    onClick={handleBecomeOwner}
                    disabled={requestLoading}
                    className="hidden rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-70 lg:inline-flex"
                >
                    {requestLoading
                        ? "Submitting..."
                        : "Become Store Owner"}
                </button>
            )}

            <div className="hidden items-center gap-3 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm text-gray-700 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-black text-white shadow-sm">
                    {user.firstName?.[0]?.toUpperCase() ?? "U"}
                </div>
                <p className="font-semibold text-gray-900">{user.firstName || "Account"}</p>
            </div>

            <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
                Logout
            </button>
        </div>
    );
}