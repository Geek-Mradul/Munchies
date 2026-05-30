"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AdminPanelShell from "./AdminPanelShell";
import AdminStoreOwnerRequestsClient from "./AdminStoreOwnerRequestsClient";
import AdminUsersManagementClient from "./AdminUsersManagementClient";
import { apiFetch } from "../lib/api";
import { useToast } from "./Toast";

type AuthRole = "USER" | "STORE_OWNER" | "ADMIN";

type StoredUser = {
    id: string;
    email: string;
    firstName: string;
    role: AuthRole;
};

type LoginResponse = {
    token: string;
    user: StoredUser;
    message?: string;
};

function getStoredUser() {
    if (typeof window === "undefined") {
        return null;
    }

    const userRaw = localStorage.getItem("munchies_user");

    if (!userRaw) {
        return null;
    }

    try {
        return JSON.parse(userRaw) as StoredUser;
    } catch {
        return null;
    }
}

export default function AdminAccessClient() {
    const router = useRouter();
    const toast = useToast();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("approvals");

    useEffect(() => {
        const syncRole = () => {
            const user = getStoredUser();
            setIsAdmin(user?.role === "ADMIN");
        };

        syncRole();
        window.addEventListener("storage", syncRole);
        window.addEventListener("munchies-auth-change", syncRole);

        return () => {
            window.removeEventListener("storage", syncRole);
            window.removeEventListener("munchies-auth-change", syncRole);
        };
    }, []);

    async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");

        try {
            const response = await apiFetch("/auth/login", {
                method: "POST",
                body: { email, password },
            });

            const data = (await response.json()) as Partial<LoginResponse> & {
                message?: string;
            };

            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            if (!data.token || !data.user) {
                throw new Error("Invalid login response");
            }

            if (data.user.role !== "ADMIN") {
                throw new Error("This account does not have admin access");
            }

            localStorage.setItem("munchies_token", data.token);
            localStorage.setItem("munchies_user", JSON.stringify(data.user));
            window.dispatchEvent(new Event("munchies-auth-change"));

            toast.success("Admin login successful");
            setIsAdmin(true);
            router.refresh();
        } catch (loginError) {
            const message = loginError instanceof Error ? loginError.message : "Login failed";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    if (isAdmin) {
        const shellTitle = activeTab === "approvals" ? "Store Approvals" : "User Management";
        const shellDesc = activeTab === "approvals" 
            ? "Review seller applications." 
            : "Manage user warnings, global checkout suspensions, and store-specific blocks.";

        return (
            <AdminPanelShell
                title={shellTitle}
                description={shellDesc}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            >
                {activeTab === "approvals" ? (
                    <AdminStoreOwnerRequestsClient />
                ) : (
                    <AdminUsersManagementClient />
                )}
            </AdminPanelShell>
        );
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.10),_transparent_34%),linear-gradient(180deg,_#fffaf5_0%,_#fff_28%,_#fff7ed_100%)] flex items-center justify-center p-4 text-gray-900 antialiased">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Admin access</p>
                <h1 className="mt-3 text-3xl font-black text-gray-950">Admin sign in</h1>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                    Sign in to manage stores, sellers, and the Munchies platform.
                </p>

                <form className="mt-6 space-y-4" method="POST" onSubmit={handleAdminLogin}>
                    <div>
                        <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-gray-700">
                            Email
                        </label>
                        <input
                            id="admin-email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="admin@munchies.com"
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                    </div>

                    <div>
                        <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-gray-700">
                            Password
                        </label>
                        <input
                            id="admin-password"
                            name="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                    </div>

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {loading ? "Signing in..." : "Sign in as admin"}
                    </button>
                </form>
            </div>
        </main>
    );
}