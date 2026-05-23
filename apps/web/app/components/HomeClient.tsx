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
            <section className="mb-10">
                <h2 className="mb-4 text-xl font-bold text-gray-900">
                    Browse by Hostel
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <button
                        type="button"
                        onClick={() => setActiveHostel("All Hostels")}
                        className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-colors ${activeHostel === "All Hostels" ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}
                    >
                        All Hostels
                    </button>
                    {hostels.map((hostel) => (
                        <button
                            key={hostel}
                            type="button"
                            onClick={() => setActiveHostel(hostel)}
                            className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-colors ${activeHostel === hostel ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}
                        >
                            {hostel}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="mb-6 text-xl font-bold text-gray-900">
                    Popular Stores
                </h2>

                {fetchError && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-6 font-medium text-red-700">
                        Could not load stores. Please try again later.
                    </div>
                )}

                {!fetchError && visibleStores.length === 0 && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 font-medium text-gray-500 shadow-sm">
                        No stores available for this hostel.
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