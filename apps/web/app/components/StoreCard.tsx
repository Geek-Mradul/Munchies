import Link from "next/link";
import type { Store } from "../lib/munchies";

type Props = {
    store: Store;
};

export default function StoreCard({ store }: Props) {
    return (
        <Link
            href={`/store/${store.id}`}
            className="group block h-full"
        >
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:shadow-xl">
                <div className="flex flex-grow flex-col p-5">
                    <h3 className="mb-1 text-lg font-bold text-gray-900 transition-colors group-hover:text-orange-600">
                        {store.name}
                    </h3>

                    <p className="mb-4 line-clamp-1 flex-grow text-sm text-gray-500">
                        {store.tagline || "Late night snacks and beverages."}
                    </p>

                    {/* Location Badge */}
                    <div className="mt-auto flex w-max items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs font-semibold text-gray-600">
                        <span>{store.hostel}</span>
                        <span className="text-gray-300">|</span>
                        <span>Room {store.room}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}