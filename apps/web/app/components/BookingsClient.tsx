"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMyBookings, type CustomerBooking } from "../lib/bookings";
import { getToken } from "../lib/auth";

type LoadingState = "loading" | "ready" | "error";

export default function BookingsClient() {
    const router = useRouter();
    const [state, setState] = useState<LoadingState>("loading");
    const [error, setError] = useState("");
    const [bookings, setBookings] = useState<CustomerBooking[]>([]);

    useEffect(() => {
        async function loadBookings() {
            const token = getToken();

            if (!token) {
                router.push("/login");
                return;
            }

            try {
                const data = await fetchMyBookings();
                setBookings(data);
                setState("ready");
            } catch (loadError) {
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Failed to load booking history"
                );
                setState("error");
            }
        }

        loadBookings();
    }, [router]);

    if (state === "loading") {
        return (
            <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                <p className="text-sm font-medium text-gray-600">Loading your booking history...</p>
            </section>
        );
    }

    if (state === "error") {
        return (
            <section className="rounded-[2rem] border border-red-100 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                <p className="text-sm font-semibold text-red-700">{error}</p>
            </section>
        );
    }

    if (bookings.length === 0) {
        return (
            <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                <h2 className="mb-2 text-xl font-black text-gray-950">No bookings yet</h2>
                <p className="text-sm text-gray-600">Your placed bookings will appear here.</p>
                <Link
                    href="/"
                    className="mt-4 inline-block rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-200"
                >
                    Browse stores
                </Link>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            {bookings.map((booking) => (
                <article
                    key={booking.id}
                    className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)]"
                >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black text-gray-950">{booking.store.name}</h2>
                            <p className="text-sm text-gray-600">
                                {booking.store.hostel}, Room {booking.store.roomNumber}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 font-medium">Order Number: {booking.orderNumber || booking.id.slice(0, 8).toUpperCase()}</p>
                        </div>

                        <div className="text-right">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${booking.status === "PLACED" ? "bg-amber-50 text-amber-700 border border-amber-100"
                                    : booking.status === "ACCEPTED" ? "bg-sky-50 text-sky-700 border border-sky-100"
                                        : booking.status === "READY" ? "bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse"
                                            : booking.status === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-100"
                                                : "bg-gray-150 text-gray-700"
                                }`}>
                                {booking.status === "PLACED" ? "Preparing / Pending"
                                    : booking.status === "ACCEPTED" ? "Preparing..."
                                        : booking.status === "READY" ? "Ready"
                                            : booking.status === "REJECTED" ? "Cancelled"
                                                : "Completed"}
                            </span>
                            <p className="mt-2 text-sm font-bold text-gray-900">₹{booking.totalAmount.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-100 pt-4">
                        {booking.items.map((line) => (
                            <div
                                key={line.id}
                                className="flex items-center justify-between text-sm"
                            >
                                <p className="font-medium text-gray-800">
                                    {line.item.name} x {line.quantity}
                                </p>
                                <p className="text-gray-600">₹{(line.unitPrice * line.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </article>
            ))}
        </section>
    );
}
