import type { StoreItem } from "../lib/munchies";

type Props = {
    item: StoreItem;
    quantityInCart?: number;
    onAddToCart: (item: StoreItem) => void;
    onDecrease: (id: number) => void;
};

export default function ItemCard({
    item,
    quantityInCart = 0,
    onAddToCart,
    onDecrease,
}: Props) {
    return (
        <div className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-gray-300">
            <div className="flex-1 pr-4">
                <h3 className="mb-1 text-lg font-bold text-gray-900">
                    {item.name}
                </h3>

                <p className="mb-1 font-bold text-gray-900">
                    ₹{item.price}
                </p>

                <p className="line-clamp-2 text-sm text-gray-500">
                    Freshly prepared {item.name.toLowerCase()} for late-night hostel cravings.
                </p>
            </div>

            {quantityInCart > 0 ? (
                <div className="ml-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
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
                        className="text-lg font-bold leading-none text-orange-600 transition hover:text-orange-700 active:scale-90"
                        aria-label={`Increase ${item.name}`}
                    >
                        +
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => onAddToCart(item)}
                    className="ml-4 rounded-lg border border-gray-200 bg-white px-6 py-2 font-extrabold text-orange-600 shadow-sm transition hover:bg-gray-50 active:scale-95"
                >
                    ADD
                </button>
            )}

        </div>
    );
}