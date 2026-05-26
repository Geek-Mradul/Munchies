import Link from "next/link";
import AuthStatusNav from "../../components/AuthStatusNav";
import OwnerBookingsClient from "../../components/OwnerBookingsClient";

export default function OwnerBookingsPage() {
    return (
        <main className="min-h-screen text-gray-900 antialiased">
            <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/75 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="text-2xl font-black tracking-tight text-orange-600"
                    >
                        Munchies.
                    </Link>
                    <AuthStatusNav />
                </div>
            </nav>

            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                        Store Owner
                    </p>
                    <h1 className="text-3xl font-black text-gray-950">Incoming bookings</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Review live incoming orders across your stores.
                    </p>
                </div>

                <OwnerBookingsClient />
            </div>
        </main>
    );
}
