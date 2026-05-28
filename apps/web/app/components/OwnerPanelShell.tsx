"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import AuthStatusNav from "./AuthStatusNav";

type OwnerPanelShellProps = {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onActionClick?: () => void;
    activeTab?: "inventory" | "bookings" | "promotions";
    onTabChange?: (tab: "inventory" | "bookings" | "promotions") => void;
    children: ReactNode;
};

type NavItem = {
    id: string;
    label: string;
    disabled?: boolean;
    icon: React.ReactNode;
};

export default function OwnerPanelShell({
    title,
    description,
    actionLabel = "+ Add New Item",
    actionHref = "#",
    onActionClick,
    activeTab = "inventory",
    onTabChange,
    children,
}: OwnerPanelShellProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Dynamic Navigation links config
    const navItems: NavItem[] = [
        {
            id: "inventory",
            label: "Inventory Catalog",
            icon: (
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            )
        },
        {
            id: "bookings",
            label: "Orders Manager",
            icon: (
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            )
        },
        {
            id: "promotions",
            label: "Active Campaigns",
            icon: (
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
            )
        },
        {
            id: "analytics",
            label: "Live Analytics (Soon)",
            disabled: true,
            icon: (
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        }
    ];

    const handleTabSelect = (tabId: "inventory" | "bookings" | "promotions") => {
        onTabChange?.(tabId);
        setIsDrawerOpen(false);
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.06),_transparent_34%),linear-gradient(180deg,_#fffaf5_0%,_#fff_28%,_#fff7ed_100%)] text-gray-900 antialiased">

            {/* Mobile Header Bar */}
            <div className="lg:hidden flex items-center justify-between border-b border-orange-100 bg-white/90 backdrop-blur-md px-4 py-3.5 sticky top-0 z-30 shadow-[0_4px_24px_rgba(249,115,22,0.03)] shrink-0">
                <div className="flex items-center gap-2">
                    {/* Drawer Toggle Hamburger */}
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(true)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition"
                        aria-label="Open navigation menu"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <Link href="/owner" className="text-lg font-black tracking-tight text-orange-600">
                        Munchies.
                    </Link>
                </div>

                <div className="scale-90 transform origin-right">
                    <AuthStatusNav />
                </div>
            </div>

            {/* Mobile Slide-over Drawer Menu Overlay */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => setIsDrawerOpen(false)}
                    />

                    {/* Drawer content panel */}
                    <div className="relative w-[300px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col p-6 border-r border-orange-100 z-10 animate-slide-right">
                        <div className="flex items-center justify-between border-b border-orange-50 pb-5 mb-6">
                            <Link href="/owner" className="text-xl font-black tracking-tight text-orange-600">
                                Munchies Owner
                            </Link>
                            <button
                                type="button"
                                onClick={() => setIsDrawerOpen(false)}
                                className="p-1.5 rounded-full hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Drawer Links list */}
                        <nav className="flex-1 flex flex-col gap-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    disabled={item.disabled}
                                    onClick={() => !item.disabled && handleTabSelect(item.id as "inventory" | "bookings" | "promotions")}
                                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left font-bold transition duration-200 ${item.disabled
                                            ? "opacity-40 cursor-not-allowed text-gray-400"
                                            : activeTab === item.id
                                                ? "bg-orange-50 text-orange-700 shadow-sm border border-orange-100/20"
                                                : "text-gray-500 hover:bg-orange-50/50 hover:text-orange-700"
                                        }`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>

                        {/* Drawer Footer profile */}
                        <div className="border-t border-orange-50 pt-5 mt-auto">
                            <AuthStatusNav minimal />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex min-h-screen flex-col lg:flex-row">

                {/* Desktop Left Sidebar Navbar */}
                <aside className="hidden lg:flex w-full lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:h-screen lg:w-[280px] flex-col border-r border-orange-100 bg-white/80 backdrop-blur-xl z-20 shadow-[4px_0_24px_rgba(249,115,22,0.02)]">
                    <div className="border-b border-orange-100 px-6 py-5 flex items-center justify-between shrink-0">
                        <Link href="/owner" className="text-xl lg:text-2xl font-black tracking-tight text-orange-600 transition hover:text-orange-700">
                            Munchies Owner
                        </Link>
                    </div>

                    <nav className="flex-1 flex flex-col gap-2 px-4 py-6 text-base font-bold overflow-y-auto">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                disabled={item.disabled}
                                onClick={() => !item.disabled && onTabChange?.(item.id as "inventory" | "bookings" | "promotions")}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left font-bold transition duration-200 ${item.disabled
                                        ? "opacity-40 cursor-not-allowed text-gray-400"
                                        : activeTab === item.id
                                            ? "bg-orange-50 text-orange-700 shadow-sm shadow-orange-100/50"
                                            : "text-gray-500 hover:bg-orange-50/50 hover:text-orange-700"
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}

                        <div className="mt-auto pt-6 border-t border-orange-50/80">
                            <AuthStatusNav minimal />
                        </div>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 lg:pl-[280px] flex flex-col min-h-screen">
                    <header className="border-b border-orange-100/60 bg-white/75 backdrop-blur-xl lg:sticky lg:top-0 z-10 shadow-[0_2px_18px_rgba(249,115,22,0.01)]">
                        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-5 sm:px-8 lg:px-10">
                            <div>
                                <h1 className="text-2xl lg:text-4xl font-black tracking-tight text-gray-950">
                                    {title}
                                </h1>
                                <p className="mt-1 max-w-4xl text-xs lg:text-base font-semibold text-gray-500">
                                    {description}
                                </p>
                            </div>

                            {activeTab === "inventory" && (
                                onActionClick ? (
                                    <button
                                        type="button"
                                        onClick={onActionClick}
                                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm lg:text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 active:scale-95 duration-200 shrink-0"
                                    >
                                        {actionLabel}
                                    </button>
                                ) : actionHref === "#" ? (
                                    <button
                                        type="button"
                                        className="inline-flex cursor-default items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm lg:text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 duration-200 shrink-0"
                                    >
                                        {actionLabel}
                                    </button>
                                ) : (
                                    <Link
                                        href={actionHref}
                                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm lg:text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 duration-200 shrink-0"
                                    >
                                        {actionLabel}
                                    </Link>
                                )
                            )}

                            {activeTab === "promotions" && onActionClick && (
                                <button
                                    type="button"
                                    onClick={onActionClick}
                                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm lg:text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 active:scale-95 duration-200 shrink-0"
                                >
                                    {actionLabel}
                                </button>
                            )}
                        </div>
                    </header>

                    <div className="flex-1 w-full px-4 py-6 sm:px-8 lg:px-10">
                        {children}
                    </div>
                </div>
            </div>
        </main>
    );
}