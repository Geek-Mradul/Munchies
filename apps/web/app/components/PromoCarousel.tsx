"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function PromoCarousel() {
    const [current, setCurrent] = useState(0);
    const trackRef = useRef<HTMLDivElement | null>(null);

    const campaigns = [
        {
            id: 1,
            title: "Midnight Craving Sale",
            desc: "Get 20% off on all late-night snacks across selected hostels.",
            tag: "Limited Time Offer",
            bg: "from-orange-500 to-red-500",
            btnText: "text-orange-600",
        },
        {
            id: 2,
            title: "Caffeine Rush",
            desc: "Buy 1 Get 1 Free on all Cold Coffees at BH-2.",
            tag: "Weekend Special",
            bg: "from-blue-500 to-indigo-600",
            btnText: "text-blue-600",
        },
        {
            id: 3,
            title: "Mega Maggi Fest",
            desc: "Free extra cheese on all Maggi orders above ₹100.",
            tag: "New Arrival",
            bg: "from-yellow-400 to-orange-500",
            btnText: "text-orange-600",
        },
    ];

    // 1. Wrapped in useCallback so we can safely use it inside useEffect
    const scrollToSlide = useCallback((index: number) => {
        const track = trackRef.current;
        if (!track) return;

        track.scrollTo({
            left: index * track.clientWidth,
            behavior: "smooth",
        });
        setCurrent(index);
    }, []);

    // 2. Fixed Interval: It now actually triggers the scroll AND resets on user interaction
    useEffect(() => {
        const timer = setInterval(() => {
            scrollToSlide((current + 1) % campaigns.length);
        }, 4000);

        // By adding 'current' to the dependency array, this timer resets 
        // every time the user manually clicks a button or swipes!
        return () => clearInterval(timer);
    }, [current, campaigns.length, scrollToSlide]);

    // 3. Optimized scroll listener to prevent unnecessary re-renders
    function handleScroll() {
        const track = trackRef.current;
        if (!track) return;

        const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
        if (nextIndex !== current) {
            setCurrent(nextIndex);
        }
    }

    return (
        <div className="relative mb-10 overflow-hidden rounded-2xl shadow-lg group">
            <div
                ref={trackRef}
                onScroll={handleScroll}
                className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
                {campaigns.map((camp) => (
                    <div
                        key={camp.id}
                        className={`relative min-h-[280px] w-full flex-none snap-center bg-gradient-to-r ${camp.bg} md:min-h-[320px]`}
                    >
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="relative flex h-full flex-col justify-center p-8 text-white md:p-12">
                            <span className="mb-2 w-max rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                {camp.tag}
                            </span>
                            <h1 className="mb-3 text-3xl font-extrabold md:text-5xl">
                                {camp.title}
                            </h1>
                            <p className="mb-6 max-w-lg text-lg text-white/90 md:text-xl">
                                {camp.desc}
                            </p>
                            <button className={`w-max rounded-xl bg-white px-6 py-3 font-bold shadow-md transition hover:bg-gray-50 ${camp.btnText} active:scale-95`}>
                                Order Now &rarr;
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Left Button - Hidden on mobile, shows on hover on desktop */}
            <button
                type="button"
                onClick={() => scrollToSlide((current - 1 + campaigns.length) % campaigns.length)}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-lg font-bold text-gray-900 shadow-md backdrop-blur hover:bg-white active:scale-90 transition-all duration-200 opacity-0 md:group-hover:opacity-100"
                aria-label="Previous slide"
            >
                ←
            </button>

            {/* Right Button - Hidden on mobile, shows on hover on desktop */}
            <button
                type="button"
                onClick={() => scrollToSlide((current + 1) % campaigns.length)}
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-lg font-bold text-gray-900 shadow-md backdrop-blur hover:bg-white active:scale-90 transition-all duration-200 opacity-0 md:group-hover:opacity-100"
                aria-label="Next slide"
            >
                →
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {campaigns.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => scrollToSlide(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === current ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                            }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}