"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMyBookings, requestBookingCancellation, type CustomerBooking } from "../lib/bookings";
import { getToken } from "../lib/auth";
import { useToast } from "./Toast";
import ConfirmationModal from "./ConfirmationModal";

type LoadingState = "loading" | "ready" | "error";

export default function BookingsClient() {
    const router = useRouter();
    const toast = useToast();
    const [state, setState] = useState<LoadingState>("loading");
    const [error, setError] = useState("");
    const [bookings, setBookings] = useState<CustomerBooking[]>([]);
    const [submittingBookingId, setSubmittingBookingId] = useState<string | null>(null);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

    function triggerCancellation(bookingId: string) {
        setSelectedBookingId(bookingId);
        setCancelModalOpen(true);
    }

    async function handleRequestCancellation() {
        if (!selectedBookingId) return;
        setCancelModalOpen(false);
        try {
            setSubmittingBookingId(selectedBookingId);
            await requestBookingCancellation(selectedBookingId);
            toast.success("Cancellation request submitted");
            const data = await fetchMyBookings();
            setBookings(data);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to request cancellation");
        } finally {
            setSubmittingBookingId(null);
            setSelectedBookingId(null);
        }
    }

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
                            <p className="mt-0.5 text-xs text-gray-400 font-medium">
                                Ordered on: {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true
                                })}
                            </p>
                        </div>

                        <div className="text-right">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${booking.status === "PLACED" ? "bg-amber-50 text-amber-700 border border-amber-100"
                                    : booking.status === "ACCEPTED" ? "bg-sky-50 text-sky-700 border border-sky-100"
                                        : booking.status === "READY" ? "bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse"
                                            : booking.status === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-100"
                                                : booking.status === "CANCEL_REQUESTED" ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                                                    : booking.status === "CANCELLED" ? "bg-slate-100 text-slate-600 border border-slate-200"
                                                        : "bg-gray-150 text-gray-700"
                                }`}>
                                {booking.status === "PLACED" ? "Preparing / Pending"
                                    : booking.status === "ACCEPTED" ? "Preparing..."
                                        : booking.status === "READY" ? "Ready"
                                            : booking.status === "REJECTED" ? "Rejected"
                                                : booking.status === "CANCEL_REQUESTED" ? "Cancellation Requested"
                                                    : booking.status === "CANCELLED" ? "Cancelled"
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

                    {["PLACED", "ACCEPTED", "READY"].includes(booking.status) && (
                        <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
                            <button
                                type="button"
                                disabled={submittingBookingId === booking.id}
                                onClick={() => triggerCancellation(booking.id)}
                                className="rounded-full bg-rose-50 border border-rose-100 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition disabled:opacity-60 shadow-sm"
                            >
                                {submittingBookingId === booking.id ? "Requesting..." : "Request Cancellation"}
                            </button>
                        </div>
                    )}
                </article>
            ))}

            <ConfirmationModal
                isOpen={cancelModalOpen}
                title="Cancel Booking?"
                message="Are you sure you want to request cancellation for this booking? The store owner will review and respond to your request."
                confirmText="Yes, Request"
                cancelText="No, Keep it"
                type="warning"
                onConfirm={handleRequestCancellation}
                onCancel={() => {
                    setCancelModalOpen(false);
                    setSelectedBookingId(null);
                }}
            />
        </section>
    );
}
