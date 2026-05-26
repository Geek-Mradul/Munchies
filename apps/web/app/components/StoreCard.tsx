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
            <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(249,115,22,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(249,115,22,0.14)]">
                <div className="flex flex-grow flex-col p-5">
                    <h3 className="mb-1 text-lg font-black text-gray-950 transition-colors group-hover:text-orange-600">
                        {store.name}
                    </h3>

                    <p className="mb-4 line-clamp-2 flex-grow text-sm leading-6 text-gray-600">
                        {store.tagline || "Fresh snacks, cool drinks, and small comforts for the day."}
                    </p>

                    <div className="mt-auto flex w-max items-center gap-2 rounded-full bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
                        <span>{store.hostel}</span>
                        <span className="text-orange-300">|</span>
                        <span>Room {store.room}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}