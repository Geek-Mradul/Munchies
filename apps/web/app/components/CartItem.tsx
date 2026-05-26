import type { CartItem as CartLineItem } from "../lib/munchies";

type Props = {
    item: CartLineItem;
    onRemove: (id: string) => void;
    onAdd?: () => void;
};

export default function CartItem({ item, onRemove, onAdd }: Props) {
    return (
        <div className="flex items-start justify-between rounded-2xl border border-white/70 bg-white/90 px-3 py-3 shadow-[0_14px_32px_rgba(249,115,22,0.06)] transition-colors">
            <div>
                <h4 className="font-bold text-gray-950">
                    {item.name}
                </h4>
                <p className="text-xs font-medium text-gray-500">
                    ₹{item.price} each
                </p>
            </div>
            <div className="flex flex-col items-end gap-2">
                <span className="font-bold text-gray-950">
                    ₹{item.price * item.quantity}
                </span>

                <div className="flex items-center gap-3 rounded-full border border-orange-100 bg-orange-50 px-2 py-1 text-sm font-bold text-orange-600 shadow-sm">
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