import type { CartItem as CartLineItem } from "../lib/munchies";

type Props = {
    item: CartLineItem;
    onRemove: (id: number) => void;
    onAdd?: () => void;
};

export default function CartItem({ item, onRemove, onAdd }: Props) {
    return (
        <div className="flex items-start justify-between rounded-xl border border-gray-100 bg-white px-3 py-3 transition-colors">
            <div>
                <h4 className="font-bold text-gray-900">
                    {item.name}
                </h4>
                <p className="text-xs font-medium text-gray-500">
                    ₹{item.price} each
                </p>
            </div>
            <div className="flex flex-col items-end gap-2">
                <span className="font-bold text-gray-900">
                    ₹{item.price * item.quantity}
                </span>

                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-bold text-orange-600 shadow-sm">
                    <button
                        onClick={() => onRemove(item.id)}
                        className="px-1 text-lg leading-none transition hover:text-orange-700 active:scale-90"
                        aria-label="Decrease quantity"
                    >
                        −
                    </button>

                    <span className="min-w-[12px] text-center text-gray-900">
                        {item.quantity}
                    </span>

                    <button
                        onClick={onAdd}
                        className="px-1 text-lg leading-none transition hover:text-orange-700 active:scale-90"
                        aria-label="Increase quantity"
                    >
                        +
                    </button>
                </div>
            </div>

        </div>
    );
}