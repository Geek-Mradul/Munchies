"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchJson } from "../lib/api";
import { useToast } from "../components/Toast";

type Preferences = {
    prefBookingNotifications: boolean;
    prefPromoAlerts: boolean;
    prefNewStoreNotifications: boolean;
};

export default function PreferencesPage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(true);

    const [prefs, setPrefs] = useState<Preferences>({
        prefBookingNotifications: true,
        prefPromoAlerts: true,
        prefNewStoreNotifications: true,
    });

    useEffect(() => {
        async function loadPreferences() {
            try {
                const token = localStorage.getItem("munchies_token");
                if (!token) {
                    setIsAuthenticated(false);
                    setLoading(false);
                    return;
                }

                const data = await apiFetchJson<Preferences>("/auth/preferences", {
                    includeAuth: true,
                });
                setPrefs(data);
            } catch (err) {
                console.error("Failed to load preferences:", err);
                toast.error("Error", "Could not load your settings. Please try signing in again.");
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        }
        loadPreferences();
    }, [toast]);

    async function handleToggle(key: keyof Preferences) {
        if (saving) return;

        const nextVal = !prefs[key];
        const updatedPrefs = { ...prefs, [key]: nextVal };

        setPrefs(updatedPrefs);
        setSaving(true);

        try {
            await apiFetch("/auth/preferences", {
                method: "PUT",
                includeAuth: true,
                body: updatedPrefs,
            });
            toast.success("Settings Saved", "Your notification preferences have been updated.");
        } catch (err) {
            console.error("Failed to save preference:", err);
            setPrefs(prefs); // Revert UI state
            toast.error("Error", "Failed to update your settings. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading settings...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
                <div className="rounded-3xl border border-rose-100/50 bg-white p-8 shadow-xl space-y-6">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Sign In Required</h2>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium">
                            Please log in to your account to manage your notification settings.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push("/login")}
                        className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 py-3.5 text-sm font-bold text-white hover:brightness-105 active:scale-95 transition shadow-lg shadow-orange-100/50"
                    >
                        Sign In Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-12 md:py-20">
            {/* Header Controls */}
            <div className="flex items-center justify-between mb-10">
                <Link
                    href="/"
                    className="flex items-center gap-2 rounded-full border border-orange-100 bg-white/90 hover:bg-orange-50/50 px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-orange-700 transition active:scale-95 shadow-sm"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Munchies
                </Link>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                    Settings
                </span>
            </div>

            {/* Title / Hero */}
            <div className="mb-10 text-center md:text-left space-y-2">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-950">
                    Notification Settings
                </h1>
                <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">
                    Choose how you want to stay updated on your orders, special discounts, and new campus food spots.
                </p>
            </div>

            {/* List of Settings */}
            <div className="rounded-3xl border border-orange-100/40 bg-white p-6 md:p-8 shadow-xl shadow-orange-50/20 space-y-8">
                
                {/* 1. Booking Notifications */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-gray-50 pb-8">
                    <div className="space-y-2 max-w-md">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <h3 className="text-base font-extrabold text-gray-900">Order Updates</h3>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium pl-13">
                            Get real-time updates when your food is ready, cancellation requests are processed, or if there are any important warnings about your bookings.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleToggle("prefBookingNotifications")}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            prefs.prefBookingNotifications ? "bg-orange-600" : "bg-gray-200"
                        }`}
                        aria-label="Toggle Order Updates"
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                prefs.prefBookingNotifications ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* 2. Promotional Alerts */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-gray-50 pb-8">
                    <div className="space-y-2 max-w-md">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zM9 16V8m3 8V8m3 8V8" />
                                </svg>
                            </div>
                            <h3 className="text-base font-extrabold text-gray-900">Offers & Discounts</h3>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium pl-13">
                            Be the first to know about fresh coupon codes, promo campaigns, and active discounts to save on your cravings.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleToggle("prefPromoAlerts")}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            prefs.prefPromoAlerts ? "bg-orange-600" : "bg-gray-200"
                        }`}
                        aria-label="Toggle Offers and Discounts"
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                prefs.prefPromoAlerts ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* 3. New Store Alerts */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
                    <div className="space-y-2 max-w-md">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-base font-extrabold text-gray-900">New Spot Alerts</h3>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium pl-13">
                            Get notified whenever a brand new kitchen, snack outlet, or food spot opens near your hostel.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleToggle("prefNewStoreNotifications")}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            prefs.prefNewStoreNotifications ? "bg-orange-600" : "bg-gray-200"
                        }`}
                        aria-label="Toggle New Spot Alerts"
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                prefs.prefNewStoreNotifications ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

            </div>

            {/* Bottom Status Card */}
            <div className="mt-8 rounded-2xl bg-orange-50/50 border border-orange-100/50 p-4 text-center text-xs font-semibold text-orange-800 leading-relaxed">
                Your settings are saved automatically. We will only send you the updates you choose.
            </div>
        </div>
    );
}
