"use client";

import { useMemo, useState } from "react";
import StoreCard from "./StoreCard";
import type { Store } from "../lib/munchies";

type Props = {
    stores: Store[];
    fetchError: boolean;
};

export default function HomeClient({ stores, fetchError }: Props) {
    const [activeHostel, setActiveHostel] = useState<string>("All Hostels");

    const hostels = useMemo(
        () => Array.from(new Set(stores.map((store) => store.hostel))),
        [stores]
    );

    const visibleStores =
        activeHostel === "All Hostels"
            ? stores
            : stores.filter((store) => store.hostel === activeHostel);

    return (
        <>
            <section className="mt-8 mb-10 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)] backdrop-blur md:mt-12">
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
                        We couldn’t load the store list right now. Try again in a moment.
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