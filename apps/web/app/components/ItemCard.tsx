import type { StoreItem } from "../lib/munchies";
import { getApiBaseUrl } from "../lib/api";

type Props = {
    item: StoreItem;
    quantityInCart?: number;
    canIncrease: boolean;
    onAddToCart: (item: StoreItem) => void;
    onDecrease: (id: string) => void;
};

export default function ItemCard({
    item,
    quantityInCart = 0,
    canIncrease,
    onAddToCart,
    onDecrease,
}: Props) {
    const soldOut = item.stockQuantity <= 0;
    const actionLabel = soldOut ? "Sold out" : canIncrease ? "Add" : "Cart full";
    const imageSrc = item.imageUrl.startsWith("http")
        ? item.imageUrl
        : `${getApiBaseUrl()}${item.imageUrl}`;

    return (
        <div className="group flex items-center gap-4 rounded-[1.5rem] border border-white/70 bg-white/90 p-4 shadow-[0_16px_44px_rgba(249,115,22,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(249,115,22,0.12)]">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100">
                <img
                    src={imageSrc}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=60";
                    }}
                />
            </div>

            <div className="flex-1 pr-4">
                <h3 className="mb-1 text-lg font-black text-gray-950">
                    {item.name}
                </h3>

                <p className="mb-1 font-bold text-orange-600">
                    ₹{item.price}
                </p>

                <p className="line-clamp-2 text-sm leading-6 text-gray-600">
                    A quick comfort pick when you want something simple, warm, and easy to add.
                </p>
            </div>

            {quantityInCart > 0 ? (
                <div className="ml-4 flex items-center gap-3 rounded-full border border-orange-100 bg-orange-50 px-3 py-2 shadow-sm">
                    <button
                        onClick={() => onDecrease(item.id)}
                        className="text-lg font-bold leading-none text-orange-600 transition hover:text-orange-700 active:scale-90"
                        aria-label={`Decrease ${item.name}`}
                    >
                        −
                    </button>

                    <span className="min-w-6 text-center text-sm font-bold text-gray-900">
                        {quantityInCart}
                    </span>

                    <button
                        onClick={() => onAddToCart(item)}
                        disabled={!canIncrease}
                        className="text-lg font-bold leading-none text-orange-600 transition hover:text-orange-700 active:scale-90"
                        aria-label={`Increase ${item.name}`}
                    >
                        +
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => onAddToCart(item)}
                    disabled={!canIncrease}
                    className="ml-4 rounded-full border border-orange-100 bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2 font-extrabold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 active:scale-95"
                >
                    {actionLabel}
                </button>
            )}

        </div>
    );
}