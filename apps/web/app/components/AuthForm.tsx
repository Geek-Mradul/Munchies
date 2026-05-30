"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "../lib/api";
import { getDashboardPathForRole, type AuthRole } from "../lib/auth";
import { useToast } from "./Toast";

type AuthMode = "login" | "register";

type AuthFormProps = {
    mode: AuthMode;
    scope?: AuthRole;
};

type AuthResponse =
    | {
        token: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            role: AuthRole;
        };
    }
    | {
        message?: string;
        error?: string;
    };

function getLoginRoute() {
    return "/login";
}

function getRegisterRoute(scope: AuthRole) {
    if (scope === "STORE_OWNER") {
        return "/owner";
    }

    return "/register";
}

export default function AuthForm({ mode, scope }: AuthFormProps) {
    const router = useRouter();
    const isLogin = mode === "login";
    const isUniversalLogin = isLogin && !scope;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const loginScope: AuthRole = scope ?? "USER";

    const title = isUniversalLogin
        ? "Sign in to Munchies"
        : loginScope === "USER"
            ? isLogin
                ? "Welcome back!"
                : "Create account"
            : loginScope === "STORE_OWNER"
                ? "Merchant Dashboard"
                : "Admin Portal";

    const description = isUniversalLogin
        ? "Enter your credentials to access your campus dashboard."
        : loginScope === "USER"
            ? isLogin
                ? "Enter your campus details to jump back in."
                : "Enter your official campus email to get started."
            : loginScope === "STORE_OWNER"
                ? "Access your store controls, live analytics, and inventory manager."
                : "Authorized administrator panel access and lifecycle approvals.";

    const heroCopy = isUniversalLogin
        ? "Your gateway to campus cravings."
        : loginScope === "USER"
            ? isLogin
                ? "Your next hot meal is just a tap away."
                : "Skip the queues. Order ahead on campus."
            : loginScope === "STORE_OWNER"
                ? "Empower your campus culinary business."
                : "Manage the Munchies ecosystem.";

    const introCopy = isUniversalLogin
        ? "One unified portal to connect hungry students with passionate kitchen owners across your hostel wings."
        : loginScope === "USER"
            ? isLogin
                ? "Satisfy your late-night study cravings, explore daily specials from neighboring hostel rooms, and track your orders in real-time."
                : "Sign up today to discover local culinary setups, place custom orders, and skip the physical queues."
            : loginScope === "STORE_OWNER"
                ? "Update your digital menu card instantly, coordinate incoming orders with our new Ready-state workflow, and keep campus customers happy."
                : "Maintain platform security, moderate incoming seller requests, and scale campus-wide operations effortlessly.";

    const helpText = isUniversalLogin
        ? "New here?"
        : loginScope === "USER"
            ? isLogin
                ? "New here?"
                : "Already have an account?"
            : loginScope === "STORE_OWNER"
                ? isLogin
                    ? "Need access?"
                    : "Already approved?"
                : "Need an admin account?";

    const helpLink = isLogin ? getRegisterRoute(loginScope) : "/login";
    const helpLabel = isUniversalLogin
        ? "Create one"
        : loginScope === "USER"
            ? isLogin
                ? "Create one"
                : "Sign in instead"
            : loginScope === "STORE_OWNER"
                ? isLogin
                    ? "Request access"
                    : "Sign in instead"
                : "Go to sign in";

    const buttonLabel = isLogin
        ? "Sign in"
        : loginScope === "STORE_OWNER"
            ? "Request access"
            : "Create account";

    const showFirstName = !isLogin && loginScope === "USER";

    const toast = useToast();

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData(event.currentTarget);
        const payload = {
            firstName: String(formData.get("firstName") ?? "").trim(),
            email: String(formData.get("email") ?? "").trim(),
            password: String(formData.get("password") ?? ""),
        };

        try {
            const response = await apiFetch(`/auth/${isLogin ? "login" : "register"}`, {
                method: "POST",
                body: isLogin
                    ? {
                        email: payload.email,
                        password: payload.password,
                    }
                    : payload,
            });

            const data = (await response.json()) as AuthResponse;

            if (!response.ok) {
                const message =
                    "message" in data && data.message
                        ? data.message
                        : "Authentication failed";
                throw new Error(message);
            }

            if (isLogin && "token" in data) {
                // If this is the universal login page (no scope) only allow USER accounts here.
                if (isUniversalLogin && data.user.role !== "USER") {
                    toast.warning(
                        "Use the correct login page",
                        `This account is a ${data.user.role}. Please sign in at the correct page.`
                    );
                    // Redirect to the role-specific access page (admin/owner)
                    router.push(getDashboardPathForRole(data.user.role));
                    return;
                }

                localStorage.setItem("munchies_token", data.token);
                localStorage.setItem("munchies_user", JSON.stringify(data.user));
                window.dispatchEvent(new Event("munchies-auth-change"));
                setSuccess("Welcome back. Redirecting...");
                router.push(getDashboardPathForRole(data.user.role));
                router.refresh();
                return;
            }

            setSuccess(
                scope === "STORE_OWNER"
                    ? "Request submitted. Await admin approval."
                    : "Account created. Redirecting to login..."
            );
            router.push(getLoginRoute());
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen text-gray-900">
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.08),_transparent_32%),linear-gradient(180deg,_#fffaf5_0%,_#fff_32%,_#fff7ed_100%)]">
                <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
                    <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                        <div className="max-w-xl hidden lg:block">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                                {isUniversalLogin
                                    ? "Welcome"
                                    : loginScope === "USER"
                                        ? "Welcome"
                                        : loginScope === "STORE_OWNER"
                                            ? "Store owner"
                                            : "Admin"}
                            </p>
                            <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
                                {heroCopy}
                            </h1>
                            <p className="mt-5 max-w-lg text-lg leading-8 text-gray-600">
                                {introCopy}
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                {[
                                    ["Zero Queueing", "Order ahead and skip the physical crowd."],
                                    ["Wing Delivery", "Fresh food directly from neighboring rooms."],
                                    ["Live Tracking", "Watch your order move from Placed to Ready instantly."],
                                ].map(([itemTitle, itemDesc]) => (
                                    <div
                                        key={itemTitle}
                                        className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-[0_20px_60px_rgba(251,146,60,0.12)] backdrop-blur"
                                    >
                                        <div className="text-sm font-bold text-gray-900">{itemTitle}</div>
                                        <div className="mt-1 text-sm leading-6 text-gray-600">{itemDesc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-orange-300/20 via-amber-200/15 to-white blur-2xl" />
                            <div className="relative rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_rgba(249,115,22,0.18)] backdrop-blur-xl sm:p-8">
                                <div className="mb-8">
                                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                                        {isLogin
                                            ? "Welcome back"
                                            : loginScope === "STORE_OWNER"
                                                ? "Request access"
                                                : "Join Munchies"}
                                    </p>
                                    <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">{title}</h2>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
                                </div>

                                <form className="space-y-4" method="POST" onSubmit={handleSubmit}>
                                    {showFirstName && (
                                        <div>
                                            <label htmlFor="firstName" className="mb-2 block text-sm font-semibold text-gray-700">
                                                First name
                                            </label>
                                            <input
                                                id="firstName"
                                                name="firstName"
                                                type="text"
                                                autoComplete="given-name"
                                                placeholder="Foodie"
                                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                            />
                                        </div>
                                    )}

                                    {isLogin && loginScope !== "USER" && (
                                        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                                            Use your approved {loginScope === "STORE_OWNER" ? "owner" : "admin"} account to sign in.
                                        </div>
                                    )}

                                    <div>
                                        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="example@email.com"
                                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">
                                            Password
                                        </label>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete={isLogin ? "current-password" : "new-password"}
                                            placeholder="••••••••"
                                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                        />
                                    </div>

                                    {error && (
                                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                            {error}
                                        </div>
                                    )}

                                    {success && (
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                            {success}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {loading ? "Please wait..." : buttonLabel}
                                    </button>
                                </form>

                                <div className="mt-6 border-t border-gray-100 pt-5 text-sm text-gray-600">
                                    {helpText} <Link href={helpLink} className="font-semibold text-orange-600 hover:text-orange-700">{helpLabel}</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
