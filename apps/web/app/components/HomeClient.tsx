"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StoreCard from "./StoreCard";
import type { Store } from "../lib/munchies";
import { fetchMyBookings, type CustomerBooking } from "../lib/bookings";
import { getToken } from "../lib/auth";

type Props = {
    stores: Store[];
    fetchError: boolean;
};

export default function HomeClient({ stores, fetchError }: Props) {
    const [activeHostel, setActiveHostel] = useState<string>("All Hostels");
    const [bookings, setBookings] = useState<CustomerBooking[]>([]);

    useEffect(() => {
        const token = getToken();
        if (!token) return;

        void (async () => {
            try {
                const data = await fetchMyBookings();
                setBookings(data);
            } catch {
                // Silently ignore background load error
            }
        })();
    }, []);

    const hostels = useMemo(
        () => Array.from(new Set(stores.map((store) => store.hostel))),
        [stores]
    );

    const visibleStores =
        activeHostel === "All Hostels"
            ? stores
            : stores.filter((store) => store.hostel === activeHostel);

    const activeBookings = useMemo(
        () => bookings.filter((b) => b.status === "PLACED" || b.status === "ACCEPTED" || b.status === "READY"),
        [bookings]
    );

    const getStatusDetails = (status: string) => {
        switch (status) {
            case "READY":
                return {
                    label: "Ready",
                    color: "text-emerald-600 bg-emerald-50 border-emerald-100/60",
                    bullet: "bg-emerald-500",
                };
            case "ACCEPTED":
                return {
                    label: "Preparing Order",
                    color: "text-sky-600 bg-sky-50 border-sky-100/60",
                    bullet: "bg-sky-500",
                };
            default:
                return {
                    label: "Pending",
                    color: "text-amber-600 bg-amber-50 border-amber-100/60",
                    bullet: "bg-amber-500",
                };
        }
    };

    return (
        <>
            {/* Sideways Scrollable Live Order Tracker */}
            {activeBookings.length > 0 && (
                <div className="w-full mb-8">
                    <div className="mb-3 flex items-center justify-between px-1">
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {activeBookings.map((order) => {
                            const details = getStatusDetails(order.status);
                            return (
                                <div
                                    key={order.id}
                                    className="min-w-[290px] sm:min-w-[380px] flex-1 snap-start rounded-[1.8rem] border border-orange-100/60 bg-white/90 p-5 shadow-[0_12px_36px_rgba(249,115,22,0.03)] backdrop-blur-md transition hover:border-orange-200"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${details.bullet} animate-pulse`} />
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                                                Order #{order.orderNumber}
                                            </span>
                                        </div>
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${details.color}`}>
                                            {details.label}
                                        </span>
                                    </div>

                                    <div className="mb-4">
                                        <h4 className="text-base sm:text-lg font-black text-gray-950">
                                            {order.store.name}
                                        </h4>
                                        <p className="text-xs font-semibold text-gray-500 mt-0.5">
                                            Located at: {order.store.hostel} • Room {order.store.roomNumber}
                                        </p>
                                    </div>

                                    <div className="border-t border-orange-50/50 pt-4 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Amount</span>
                                            <p className="text-sm font-black text-gray-900 mt-0.5">₹{order.totalAmount}</p>
                                        </div>
                                        <Link
                                            href="/bookings"
                                            className="rounded-2xl bg-orange-50 border border-orange-100/50 px-4 py-2 text-xs font-black text-orange-600 transition hover:bg-orange-100/60 active:scale-95"
                                        >
                                            Track Order
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <section className="mt-4 mb-10 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)] backdrop-blur">
                <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Find something good</p>
                        <h2 className="mt-1 text-2xl font-black text-gray-950">
                            Browse by hostel
                        </h2>
                    </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <button
                        type="button"
                        onClick={() => setActiveHostel("All Hostels")}
                        className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all ${activeHostel === "All Hostels" ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200" : "border border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:text-orange-700"}`}
                    >
                        All Hostels
                    </button>
                    {hostels.map((hostel) => (
                        <button
                            key={hostel}
                            type="button"
                            onClick={() => setActiveHostel(hostel)}
                            className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all ${activeHostel === hostel ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200" : "border border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:text-orange-700"}`}
                        >
                            {hostel}
                        </button>
                    ))}
                </div>
            </section>

            <section id="popular-stores">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <h2 className="text-2xl font-black text-gray-950">
                        Popular stores
                    </h2>
                </div>

                {fetchError && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-6 font-medium text-red-700">
                        We couldn't load the store list right now. Try again in a moment.
                    </div>
                )}

                {!fetchError && visibleStores.length === 0 && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 font-medium text-gray-500 shadow-sm">
                        No stores are listed for this hostel yet.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleStores.map((store) => (
                        <StoreCard key={store.id} store={store} />
                    ))}
                </div>
            </section>
        </>
    );
}