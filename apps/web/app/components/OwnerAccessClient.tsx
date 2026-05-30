"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import OwnerPanelShell from "./OwnerPanelShell";
import OwnerDashboardClient from "./OwnerDashboardClient";
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

export default function OwnerAccessClient() {
    const router = useRouter();
    const toast = useToast();
    const [isOwner, setIsOwner] = useState(false);
    const [ownerLoginLoading, setOwnerLoginLoading] = useState(false);
    const [ownerError, setOwnerError] = useState<string | null>(null);

    const [isRegistering, setIsRegistering] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
    const [registerLoading, setRegisterLoading] = useState(false);

    useEffect(() => {
        const syncRole = () => {
            const user = getStoredUser();
            setIsOwner(user?.role === "STORE_OWNER");
        };

        syncRole();
        window.addEventListener("storage", syncRole);
        window.addEventListener("munchies-auth-change", syncRole);

        return () => {
            window.removeEventListener("storage", syncRole);
            window.removeEventListener("munchies-auth-change", syncRole);
        };
    }, []);

    async function loginWithCredentials(email: string, password: string) {
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

        return data as LoginResponse;
    }

    function persistSession(data: LoginResponse) {
        localStorage.setItem("munchies_token", data.token);
        localStorage.setItem("munchies_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("munchies-auth-change"));
    }

    async function handleOwnerLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setOwnerLoginLoading(true);
        setOwnerError(null);
        setRegisterSuccess(null);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("ownerEmail") ?? "").trim();
        const password = String(formData.get("ownerPassword") ?? "");

        try {
            const data = await loginWithCredentials(email, password);

            if (data.user.role !== "STORE_OWNER") {
                throw new Error("This account is not approved as a store owner yet");
            }

            persistSession(data);
            toast.success("Owner login successful");
            setIsOwner(true);
            router.refresh();
        } catch (loginError) {
            const message = loginError instanceof Error ? loginError.message : "Owner login failed";
            setOwnerError(message);
            toast.error(message);
        } finally {
            setOwnerLoginLoading(false);
        }
    }

    async function handleOwnerRegister(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setRegisterLoading(true);
        setOwnerError(null);
        setRegisterSuccess(null);

        const formData = new FormData(event.currentTarget);
        const firstName = String(formData.get("ownerFirstName") ?? "").trim();
        const email = String(formData.get("ownerEmail") ?? "").trim();
        const password = String(formData.get("ownerPassword") ?? "");

        try {
            const response = await apiFetch("/auth/register", {
                method: "POST",
                body: {
                    firstName,
                    email,
                    password,
                    requestOwner: true,
                },
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to register request");
            }

            setRegisterSuccess("Your store owner request has been submitted successfully! Please wait for a campus administrator to approve your account.");
            toast.success("Request Submitted", "Await administrator approval.");
            setIsRegistering(false);
        } catch (registerError) {
            const message = registerError instanceof Error ? registerError.message : "Failed to submit request";
            setOwnerError(message);
            toast.error(message);
        } finally {
            setRegisterLoading(false);
        }
    }

    if (isOwner) {
        return <OwnerDashboardClient />;
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.10),_transparent_34%),linear-gradient(180deg,_#fffaf5_0%,_#fff_28%,_#fff7ed_100%)] flex items-center justify-center p-4 text-gray-900 antialiased">
            <div className="w-full max-w-md">
                <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)] sm:p-8">
                    
                    {registerSuccess && (
                        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 leading-relaxed">
                            {registerSuccess}
                        </div>
                    )}

                    {!isRegistering ? (
                        <>
                            <h1 className="mt-3 text-3xl font-black text-gray-950">Store Owner sign in</h1>
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                Sign in to manage your store, menu, and incoming orders.
                            </p>

                            <form className="mt-6 space-y-4" method="POST" onSubmit={handleOwnerLogin}>
                                <div>
                                    <label htmlFor="owner-email" className="mb-2 block text-sm font-semibold text-gray-700">
                                        Email
                                    </label>
                                    <input
                                        id="owner-email"
                                        name="ownerEmail"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        placeholder="merchant@munchies.com"
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="owner-password" className="mb-2 block text-sm font-semibold text-gray-700">
                                        Password
                                    </label>
                                    <input
                                        id="owner-password"
                                        name="ownerPassword"
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>

                                {ownerError && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                        {ownerError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={ownerLoginLoading}
                                    className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {ownerLoginLoading ? "Signing in..." : "Sign in as owner"}
                                </button>

                                <div className="mt-6 text-center">
                                    <p className="text-xs text-gray-500 font-medium">
                                        Want to open your own campus kitchen?
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRegistering(true);
                                            setOwnerError(null);
                                        }}
                                        className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-orange-600 hover:text-orange-700 transition"
                                    >
                                        Apply for Store Ownership
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <>
                            <h1 className="mt-3 text-3xl font-black text-gray-950">Register Kitchen Owner</h1>
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                Create your merchant profile and submit your store approval request.
                            </p>

                            <form className="mt-6 space-y-4" method="POST" onSubmit={handleOwnerRegister}>
                                <div>
                                    <label htmlFor="owner-firstname" className="mb-2 block text-sm font-semibold text-gray-700">
                                        First Name
                                    </label>
                                    <input
                                        id="owner-firstname"
                                        name="ownerFirstName"
                                        type="text"
                                        required
                                        placeholder="Ravi"
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="owner-email" className="mb-2 block text-sm font-semibold text-gray-700">
                                        Email Address
                                    </label>
                                    <input
                                        id="owner-email"
                                        name="ownerEmail"
                                        type="email"
                                        required
                                        placeholder="merchant@munchies.com"
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="owner-password" className="mb-2 block text-sm font-semibold text-gray-700">
                                        Password
                                    </label>
                                    <input
                                        id="owner-password"
                                        name="ownerPassword"
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>

                                {ownerError && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                        {ownerError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={registerLoading}
                                    className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {registerLoading ? "Submitting request..." : "Submit Store Owner Request"}
                                </button>

                                <div className="mt-6 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setIsRegistering(false)}
                                        className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-gray-800 transition"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back to Owner Sign In
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </section>

            </div>
        </main>
    );
}