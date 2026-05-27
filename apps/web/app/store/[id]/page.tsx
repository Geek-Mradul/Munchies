import Link from "next/link";
import StoreClient from "../../components/StoreClient";
import { getStore, getStoreItems } from "../../lib/munchies";

function StoreNotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_34%),linear-gradient(180deg,_#fffaf5_0%,_#fff_32%,_#fff7ed_100%)] p-6 font-sans text-gray-900 antialiased">
            <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 text-center shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                <h1 className="mb-2 text-2xl font-black text-gray-950">
                    Store not found
                </h1>
                <p className="mb-8 text-sm text-gray-600">
                    This store may have closed or moved. Try another one from the main feed.
                </p>
                <Link
                    href="/"
                    className="inline-block w-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 active:scale-95"
                >
                    &larr; Back to home
                </Link>
            </div>
        </main>
    );
}

function StoreLoadError() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_34%),linear-gradient(180deg,_#fffaf5_0%,_#fff_32%,_#fff7ed_100%)] p-6 font-sans text-gray-900 antialiased">
            <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white/90 p-8 text-center shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                <h1 className="mb-2 text-xl font-black text-red-800">
                    We couldn't load this page.
                </h1>
                <p className="mb-8 text-sm text-gray-600">
                    The store details didn't arrive from the server. Please try again shortly.
                </p>
                <Link
                    href="/"
                    className="inline-block w-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 active:scale-95"
                >
                    &larr; Back to home
                </Link>
            </div>
        </main>
    );
}

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export default async function StorePage({ params }: Props) {
    const { id } = await params;

    let storeData:
        | Awaited<ReturnType<typeof getStore>>
        | null = null;
    let storeItems: Awaited<ReturnType<typeof getStoreItems>> = [];
    let loadFailed = false;

    try {
        storeData = await getStore(id);
        if (storeData) {
            storeItems = await getStoreItems(id);
        }
    } catch {
        loadFailed = true;
    }

    if (loadFailed) {
        return <StoreLoadError />;
    }

    if (!storeData) {
        return <StoreNotFound />;
    }

    return (
        <main className="min-h-screen px-4 py-6 font-sans text-gray-900 antialiased sm:px-8 lg:px-12">
            <div className="mx-auto max-w-[1600px]">
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-orange-700"
                    >
                        <span aria-hidden="true">←</span>
                        Back to home
                    </Link>
                </div>

                <StoreClient
                    store={storeData}
                    items={storeItems}
                />
            </div>
        </main>
    );
}