"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthStatusNav from "../components/AuthStatusNav";
import { apiFetch } from "../lib/api";

type UserAnalytics = {
    totalSpending: number;
    totalBookings: number;
    mostFrequentlyOrderedStore: {
        id: string;
        name: string;
        hostel: string;
        roomNumber: string;
        ordersCount: number;
    } | null;
    mostFrequentlyOrderedItem: {
        id: string;
        name: string;
        totalQuantity: number;
    } | null;
    monthlySpendingBreakdown: {
        month: string;
        amount: number;
    }[];
};

export default function UserAnalyticsPage() {
    const router = useRouter();
    const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("munchies_token") : null;
        if (!token) {
            router.replace("/login");
            return;
        }

        async function fetchAnalytics() {
            try {
                const res = await apiFetch("/bookings/analytics", {
                    includeAuth: true,
                });

                if (!res.ok) {
                    throw new Error("Failed to load user analytics");
                }

                const data = await res.json() as UserAnalytics;
                setAnalytics(data);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        }

        void fetchAnalytics();
    }, [router]);

    function money(amount: number) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.06),_transparent_34%),linear-gradient(180deg,_#fffaf5_0%,_#fff_28%,_#fff7ed_100%)] text-gray-900 antialiased">
            <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/75 backdrop-blur-xl">
                <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-8 lg:px-12">
                    <Link
                        href="/"
                        className="text-2xl font-black tracking-tight text-orange-600 hover:text-orange-700 transition"
                    >
                        Munchies.
                    </Link>
                    <AuthStatusNav />
                </div>
            </nav>

            <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8 lg:px-12 space-y-8">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                        Personal Dashboard
                    </p>
                    <h1 className="text-3xl font-black text-gray-950">Spending & Habit Analytics</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Dive deep into your order habits, spending breakdowns, and favorite campus stores.
                    </p>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="h-16 rounded-2xl bg-gray-150 animate-pulse animate-duration-1000" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center shadow-sm">
                        <p className="text-base font-semibold text-rose-700">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 transition active:scale-95 shadow-sm"
                        >
                            Retry
                        </button>
                    </div>
                ) : !analytics ? (
                    <div className="rounded-2xl border border-orange-100 bg-orange-50/20 p-8 text-center text-gray-500 font-semibold shadow-sm">
                        No history or analytics details found. Order some munchies first!
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {/* Summary Metrics Cards Grid */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm hover:shadow-md transition duration-200">
                                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Total Spent</p>
                                <p className="mt-2 text-3xl font-black text-gray-950">{money(analytics.totalSpending)}</p>
                                <p className="mt-1.5 text-xs text-gray-500 font-medium">Accumulated from completed orders</p>
                            </div>

                            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm hover:shadow-md transition duration-200">
                                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Total Bookings</p>
                                <p className="mt-2 text-3xl font-black text-gray-950">{analytics.totalBookings}</p>
                                <p className="mt-1.5 text-xs text-gray-500 font-medium">Orders placed on the platform</p>
                            </div>

                            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm hover:shadow-md transition duration-200">
                                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Favorite Store</p>
                                {analytics.mostFrequentlyOrderedStore ? (
                                    <>
                                        <p className="mt-2 text-lg font-black text-gray-950 truncate">{analytics.mostFrequentlyOrderedStore.name}</p>
                                        <p className="text-xs text-gray-500 font-bold mt-1">
                                            {analytics.mostFrequentlyOrderedStore.ordersCount} bookings ({analytics.mostFrequentlyOrderedStore.hostel})
                                        </p>
                                    </>
                                ) : (
                                    <p className="mt-2 text-sm text-gray-400 font-semibold py-1">No orders placed yet</p>
                                )}
                            </div>

                            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm hover:shadow-md transition duration-200">
                                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Favorite Item</p>
                                {analytics.mostFrequentlyOrderedItem ? (
                                    <>
                                        <p className="mt-2 text-lg font-black text-gray-950 truncate">{analytics.mostFrequentlyOrderedItem.name}</p>
                                        <p className="text-xs text-gray-500 font-bold mt-1">
                                            Ordered {analytics.mostFrequentlyOrderedItem.totalQuantity} items total
                                        </p>
                                    </>
                                ) : (
                                    <p className="mt-2 text-sm text-gray-400 font-semibold py-1">No items ordered yet</p>
                                )}
                            </div>
                        </div>

                        {/* Visual Monthly Spending Chart */}
                        <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm space-y-6">
                            <div>
                                <h3 className="text-base font-extrabold text-gray-950 uppercase tracking-wide">Monthly Spending Breakdown</h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Visualizing your spending patterns over the last 6 months</p>
                            </div>

                            {/* Chart Area */}
                            <div className="pt-4">
                                {analytics.monthlySpendingBreakdown.every(m => m.amount === 0) ? (
                                    <div className="rounded-xl border border-orange-100 bg-orange-50/20 p-8 text-center text-gray-500 font-semibold">
                                        No spending logged in the past 6 months.
                                    </div>
                                ) : (
                                    <div className="flex items-end justify-between gap-2 h-64 border-b border-gray-100 pb-1 px-2 sm:px-6">
                                        {analytics.monthlySpendingBreakdown.map((monthData, idx) => {
                                            const maxAmount = Math.max(...analytics.monthlySpendingBreakdown.map(m => m.amount), 1);
                                            const heightPercent = Math.max((monthData.amount / maxAmount) * 100, 4); // Min 4% height so empty bars are visible

                                            return (
                                                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-950 text-white text-[10px] sm:text-xs font-black rounded-lg px-2.5 py-1.5 shadow-md pointer-events-none z-10 whitespace-nowrap">
                                                        {money(monthData.amount)}
                                                    </div>

                                                    {/* Visual Bar with Munchies Orange-to-Rose gradient */}
                                                    <div
                                                        style={{ height: `${heightPercent}%` }}
                                                        className="w-full sm:w-[60%] rounded-t-xl bg-gradient-to-t from-orange-500 to-rose-500 shadow-sm transition-all duration-500 ease-out group-hover:brightness-105 group-hover:shadow-[0_-4px_16px_rgba(249,115,22,0.15)] cursor-pointer"
                                                    />

                                                    {/* Month label */}
                                                    <span className="mt-2 text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-wider group-hover:text-orange-600 transition">
                                                        {monthData.month}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
