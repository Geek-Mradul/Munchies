"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

type AuthMode = "login" | "register";

type AuthFormProps = {
    mode: AuthMode;
};

type AuthResponse =
    | {
        token: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            role: string;
        };
    }
    | {
        message?: string;
        error?: string;
    };

export default function AuthForm({ mode }: AuthFormProps) {
    const router = useRouter();
    const isLogin = mode === "login";
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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
            const response = await apiFetch(
                `/auth/${isLogin ? "login" : "register"}`,
                {
                    method: "POST",
                    body: isLogin
                        ? {
                            email: payload.email,
                            password: payload.password,
                        }
                        : payload,
                }
            );

            const data = (await response.json()) as AuthResponse;

            if (!response.ok) {
                const message =
                    "message" in data && data.message
                        ? data.message
                        : "Authentication failed";
                throw new Error(message);
            }

            if (isLogin && "token" in data) {
                localStorage.setItem("munchies_token", data.token);
                localStorage.setItem("munchies_user", JSON.stringify(data.user));
                window.dispatchEvent(new Event("munchies-auth-change"));
                setSuccess("Welcome back. Redirecting...");
                router.push("/");
                router.refresh();
                return;
            }

            setSuccess("Account created. Redirecting to login...");
            router.push("/login");
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
            {/* Mobile-only simplified form */}
            <div className="lg:hidden min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.08),_transparent_32%),linear-gradient(180deg,_#fffaf5_0%,_#fff_32%,_#fff7ed_100%)] flex items-center">
                <div className="mx-auto w-full max-w-md px-4 py-8">
                    <div className="relative rounded-2xl border border-white/70 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
                        <h2 className="mb-2 text-2xl font-black text-gray-950">{isLogin ? "Sign in" : "Create account"}</h2>
                        <p className="mb-4 text-sm text-gray-600">{isLogin ? "Enter your email and password to continue." : "Create an account with your campus email."}</p>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {!isLogin && (
                                <div>
                                    <label htmlFor="firstName" className="sr-only">First name</label>
                                    <input id="firstName" name="firstName" type="text" placeholder="First name" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900" />
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="sr-only">Email</label>
                                <input id="email" name="email" type="email" placeholder="you@example.com" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900" />
                            </div>

                            <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <input id="password" name="password" type="password" placeholder="Password" autoComplete={isLogin ? "current-password" : "new-password"} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900" />
                            </div>

                            {error && <div className="text-sm text-red-700">{error}</div>}
                            {success && <div className="text-sm text-emerald-700">{success}</div>}

                            <button type="submit" disabled={loading} className="w-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3 text-sm font-bold text-white">
                                {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
                            </button>
                        </form>

                        <div className="mt-4 text-center text-sm text-gray-600">
                            {isLogin ? (
                                <>
                                    New here? <Link href="/register" className="font-semibold text-orange-600">Create one</Link>
                                </>
                            ) : (
                                <>
                                    Already have an account? <Link href="/login" className="font-semibold text-orange-600">Sign in</Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop / large layout (unchanged) */}
            <div className="hidden lg:block overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_32%),linear-gradient(180deg,_#fffaf5_0%,_#fff_32%,_#fff7ed_100%)]">
                <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-r from-orange-200/60 via-amber-100/40 to-rose-200/50 blur-3xl" />

                <section className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
                    <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                        <div className="max-w-xl">
                            <h1 className="mt-6 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
                                {isLogin
                                    ? "Sign in and pick up right where you left off."
                                    : "Create your account and make every snack run easier."}
                            </h1>
                            <p className="mt-5 max-w-lg text-lg leading-8 text-gray-600">
                                Browse nearby stores, keep your favorites close, and
                                turn late-night hunger into one calm, quick order.
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                {[
                                    ["Quick return", "Pick up your cart in a tap."],
                                    ["Campus friendly", "Built for hostel nights and breaks."],
                                    ["Warm, simple", "A calmer way to order food you want."],
                                ].map(([title, desc]) => (
                                    <div
                                        key={title}
                                        className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-[0_20px_60px_rgba(251,146,60,0.12)] backdrop-blur"
                                    >
                                        <div className="text-sm font-bold text-gray-900">{title}</div>
                                        <div className="mt-1 text-sm leading-6 text-gray-600">{desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-orange-300/20 via-amber-200/15 to-white blur-2xl" />
                            <div className="relative rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_rgba(249,115,22,0.18)] backdrop-blur-xl sm:p-8">
                                <div className="mb-8">
                                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                                        {isLogin ? "Welcome back" : "Join Munchies"}
                                    </p>
                                    <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                                        {isLogin ? "Sign in" : "Create account"}
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">
                                        {isLogin
                                            ? "Use the email and password you already set up."
                                            : "Set up an account with your campus email to get started."}
                                    </p>
                                </div>

                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    {!isLogin && (
                                        <div>
                                            <label
                                                htmlFor="firstName"
                                                className="mb-2 block text-sm font-semibold text-gray-700"
                                            >
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

                                    <div>
                                        <label
                                            htmlFor="email"
                                            className="mb-2 block text-sm font-semibold text-gray-700"
                                        >
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
                                        <label
                                            htmlFor="password"
                                            className="mb-2 block text-sm font-semibold text-gray-700"
                                        >
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
                                        {loading
                                            ? "Please wait..."
                                            : isLogin
                                                ? "Sign in"
                                                : "Create account"}
                                    </button>
                                </form>

                                <div className="mt-6 border-t border-gray-100 pt-5 text-sm text-gray-600">
                                    {isLogin ? (
                                        <>
                                            New here?{" "}
                                            <Link
                                                href="/register"
                                                className="font-semibold text-orange-600 hover:text-orange-700"
                                            >
                                                Create one now
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            Already have an account?{" "}
                                            <Link
                                                href="/login"
                                                className="font-semibold text-orange-600 hover:text-orange-700"
                                            >
                                                Sign in instead
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}