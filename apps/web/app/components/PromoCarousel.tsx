"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Store } from "../lib/munchies";

type Promo = {
    id: number;
    title: string;
    subtitle: string;
    storeId?: string;
    ctaLabel: string;
};

type Props = {
    stores: Store[];
};

const fallbackPromos: Promo[] = [
    {
        id: 1,
        title: "Browse nearby stores",
        subtitle: "Find the closest campus options and jump straight into ordering.",
        ctaLabel: "Explore stores",
    },
    {
        id: 2,
        title: "Quick hostel pickup",
        subtitle: "Keep your order local, simple, and ready when you are.",
        ctaLabel: "See hostels",
    },
    {
        id: 3,
        title: "Late-night comfort",
        subtitle: "Open the menu, pick your favorites, and place one easy order.",
        ctaLabel: "Order now",
    },
];

function getPromoBackground(index: number) {
    const backgrounds = [
        "from-orange-500 via-amber-500 to-rose-500",
        "from-emerald-500 via-teal-500 to-cyan-500",
        "from-indigo-500 via-violet-500 to-fuchsia-500",
    ];

    return backgrounds[index % backgrounds.length];
}

export default function PromoCarousel({ stores }: Props) {
    const [current, setCurrent] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const promos: Promo[] =
        stores.length > 0
            ? stores.slice(0, 3).map((store, index) => ({
                id: index + 1,
                title: store.name,
                subtitle:
                    store.tagline ||
                    `Order from ${store.hostel} Room ${store.room} in a couple of taps.`,
                storeId: store.id,
                ctaLabel: "Order now",
            }))
            : fallbackPromos;

    const scrollToSlide = useCallback((index: number) => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;

        containerRef.current.scrollTo({
            left: width * index,
            behavior: "smooth",
        });

        setCurrent(index);
    }, []);

    const scrollToStores = useCallback(() => {
        const storesSection = document.getElementById("popular-stores");

        if (!storesSection) {
            return;
        }

        storesSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const next = (current + 1) % promos.length;
            scrollToSlide(next);
        }, 5000);

        return () => clearInterval(interval);
    }, [current, promos.length, scrollToSlide]);

    return (
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_24px_90px_rgba(249,115,22,0.12)] backdrop-blur">
            {/* Slides */}
            <div
                ref={containerRef}
                className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
                {promos.map((promo) => (
                    <div
                        key={promo.id}
                        className={`relative h-[280px] min-w-full overflow-hidden bg-gradient-to-r ${getPromoBackground(promo.id - 1)} md:h-[360px]`}
                    >
                        <div className="absolute inset-0 bg-black/15" />

                        {/* Content */}
                        <div className="relative z-10 flex h-full flex-col justify-center px-6 py-8 md:px-10">
                            <span className="mb-3 w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                                Featured for you
                            </span>

                            <h1 className="max-w-xl text-3xl font-black text-white md:text-5xl">
                                {promo.title}
                            </h1>

                            <p className="mt-3 max-w-md text-sm leading-6 text-white/85 md:text-lg">
                                {promo.subtitle}
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                                {promo.storeId ? (
                                    <Link
                                        href={`/store/${promo.storeId}`}
                                        className="w-fit rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-950 shadow-lg shadow-black/10 transition hover:scale-105 hover:bg-white/95 active:scale-95"
                                    >
                                        {promo.ctaLabel}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={scrollToStores}
                                        className="w-fit rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-950 shadow-lg shadow-black/10 transition hover:scale-105 hover:bg-white/95 active:scale-95"
                                    >
                                        {promo.ctaLabel}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={scrollToStores}
                                    className="w-fit rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
                                >
                                    Browse all stores
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
                {promos.map((_, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => scrollToSlide(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === current
                            ? "w-7 bg-white"
                            : "w-2 bg-white/50 hover:bg-white/80"
                            }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}