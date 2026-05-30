"use client";

import Link from "next/link";

export default function NotFound() {
    return (
        <main className="min-h-screen text-gray-900 antialiased flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_38%),linear-gradient(180deg,_#fffaf5_0%,_#fff_28%,_#fff7ed_100%)]">
            <div className="relative w-full max-w-xl text-center">
                {/* Decorative glowing background */}
                <div className="absolute -inset-10 rounded-[3rem] bg-gradient-to-tr from-orange-300/15 via-rose-300/10 to-transparent blur-3xl pointer-events-none" />

                <div className="relative rounded-[2.5rem] border border-white/70 bg-white/80 p-8 sm:p-12 shadow-[0_32px_120px_rgba(249,115,22,0.15)] backdrop-blur-2xl">
                    
                    {/* Big stylized 404 Badge */}
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 border border-orange-100 shadow-inner">
                        <span className="text-4xl font-black tracking-tight text-orange-600">404</span>
                    </div>

                    <h1 className="mt-8 text-3xl sm:text-4xl font-black tracking-tight text-gray-950">
                        Lost in the campus corridors?
                    </h1>
                    
                    <p className="mt-4 text-sm sm:text-base leading-7 text-gray-600 font-medium max-w-md mx-auto">
                        The kitchen Wing you are looking for might have closed, moved to another room, or the craving link is broken. Let's get you back to hot campus meals!
                    </p>

                    {/* Interactive suggestions or fast links */}
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 hover:brightness-105 active:scale-[0.98] transition duration-150"
                        >
                            Explore Kitchens
                        </Link>
                        <Link
                            href="/bookings"
                            className="inline-flex items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/50 hover:bg-orange-50 px-5 py-3.5 text-sm font-bold text-orange-700 active:scale-[0.98] transition duration-150"
                        >
                            Track Active Orders
                        </Link>
                    </div>

                    {/* Cute subtle footer details */}
                    <div className="mt-8 pt-6 border-t border-orange-50/80 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400">
                        <span>Munchies Wing Delivery</span>
                        <span className="h-1 w-1 rounded-full bg-orange-300" />
                        <span>Wings, Rooms, and Late-Night Cravings</span>
                    </div>

                </div>
            </div>
        </main>
    );
}
