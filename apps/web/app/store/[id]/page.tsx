import Link from "next/link";
import StoreClient from "../../components/StoreClient";
import { getStore, getStoreItems } from "../../lib/munchies";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export default async function StorePage({ params }: Props) {
    const { id } = await params;

    try {
        const store = await getStore(id);
        if (!store) {
            return (
                <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 font-sans text-gray-900 antialiased">
                    <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                        <h1 className="mb-2 text-2xl font-extrabold text-gray-900">
                            Store not found
                        </h1>
                        <p className="mb-8 text-sm text-gray-500">
                            Looks like this store doesn't exist or is currently offline.
                        </p>
                        <Link
                            href="/"
                            className="inline-block w-full rounded-xl bg-orange-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-orange-700 active:scale-95"
                        >
                            &larr; Back to Marketplace
                        </Link>
                    </div>
                </main>
            );
        }

        const items = await getStoreItems(id);

        return (
            <main className="min-h-screen bg-gray-50 px-4 py-6 font-sans text-gray-900 antialiased sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-6">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                        >
                            <span aria-hidden="true">←</span>
                            Back to Marketplace
                        </Link>
                    </div>

                    <StoreClient
                        store={store}
                        items={items}
                    />
                </div>
            </main>
        );
    } catch {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 font-sans text-gray-900 antialiased">
                <div className="w-full max-w-md rounded-3xl border border-red-100 bg-red-50 p-8 text-center shadow-sm">
                    <h1 className="mb-2 text-xl font-bold text-red-800">
                        Oops! Connection Error.
                    </h1>
                    <p className="mb-8 text-sm text-red-600">
                        We couldn't load the store data from the server right now. Please try again later.
                    </p>
                    <Link
                        href="/"
                        className="inline-block w-full rounded-xl bg-white px-6 py-3 font-bold text-red-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                    >
                        &larr; Back to Marketplace
                    </Link>
                </div>
            </main>
        );
    }
}