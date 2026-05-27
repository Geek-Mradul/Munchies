"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ItemCard from "./ItemCard";
import CartItem from "./CartItem";
import { MAX_CART_ITEMS, type CartItem as CartLineItem, type Store, type StoreItem } from "../lib/munchies";
import { getToken } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "./Toast";

type Props = {
    store: Store;
    items: StoreItem[];
};

export default function StoreClient({ store, items }: Props) {
    const router = useRouter();
    const toast = useToast();
    const [cart, setCart] = useState<CartLineItem[]>([]);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [showMobileCart, setShowMobileCart] = useState(false);

    function requireAuthForCartAction() {
        const token = getToken();

        if (!token) {
            toast.info("Please sign in to continue.");
            router.push("/login");
            return null;
        }

        return token;
    }

    useEffect(() => {
        async function fetchCart() {
            try {
                const token = getToken();

                if (!token) {
                    return;
                }

                const response = await apiFetch(`/cart/${store.id}`, {
                    includeAuth: true,
                    cache: "no-store",
                });

                if (!response.ok) {
                    return;
                }

                const data = await response.json();

                if (!data || !data.items) {
                    return;
                }

                const formattedCart = data.items.map(
                    (cartItem: {
                        item: {
                            id: string;
                            name: string;
                            price: number;
                        };
                        quantity: number;
                    }) => ({
                        id: cartItem.item.id,
                        name: cartItem.item.name,
                        price: cartItem.item.price,
                        quantity: cartItem.quantity,
                    })
                );

                setCart(formattedCart);
            } catch (error) {
                console.error(error);
            }
        }

        fetchCart();
    }, [store.id]);

    async function addToCart(item: StoreItem) {
        const token = requireAuthForCartAction();

        if (!token) {
            return;
        }

        const currentQuantity = cartQuantities[item.id] ?? 0;

        if (item.stockQuantity <= 0) {
            toast.error("This item is sold out.");
            return;
        }

        if (currentQuantity >= item.stockQuantity) {
            toast.error("You have reached the available stock for this item.");
            return;
        }

        if (totalItems >= MAX_CART_ITEMS) {
            toast.error("A cart can contain at most 7 items.");
            return;
        }

        try {
            const response = await apiFetch(`/cart/${store.id}/add`, {
                method: "POST",
                includeAuth: true,
                body: {
                    itemId: item.id,
                    quantity: 1,
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);

                toast.error(data?.error || "Unable to add item to cart");
                return;
            }

            setCart((prev) => {
                const existingItem = prev.find((cartItem) => cartItem.id === item.id);

                if (existingItem) {
                    return prev.map((cartItem) =>
                        cartItem.id === item.id
                            ? { ...cartItem, quantity: cartItem.quantity + 1 }
                            : cartItem
                    );
                }

                return [
                    ...prev,
                    {
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: 1,
                    },
                ];
            });
        } catch (error) {
            console.error(error);

            toast.error("Unable to add item to cart");
        }
    }

    async function removeFromCart(id: string) {
        const token = requireAuthForCartAction();

        if (!token) {
            return;
        }

        const existingItem = cart.find((item) => item.id === id);

        if (!existingItem) {
            return;
        }

        try {
            const cartResponse = await apiFetch(`/cart/${store.id}`, {
                includeAuth: true,
            });

            const cartData = await cartResponse.json();

            const cartItem = cartData.items.find(
                (cartItem: { item: { id: string } }) => cartItem.item.id === id
            );

            if (!cartItem) {
                return;
            }

            if (existingItem.quantity === 1) {
                const deleteResponse = await apiFetch(`/cart/item/${cartItem.id}`, {
                    method: "DELETE",
                    includeAuth: true,
                });

                if (!deleteResponse.ok) {
                    const data = await deleteResponse.json().catch(() => null);

                    throw new Error(data?.error || "Unable to remove cart item");
                }

                setCart((prev) => prev.filter((cartItem) => cartItem.id !== id));

                return;
            }

            const updateResponse = await apiFetch(`/cart/item/${cartItem.id}`, {
                method: "PUT",
                includeAuth: true,
                body: {
                    quantity: existingItem.quantity - 1,
                },
            });

            if (!updateResponse.ok) {
                const data = await updateResponse.json().catch(() => null);

                throw new Error(data?.error || "Unable to update cart item");
            }

            setCart((prev) =>
                prev
                    .map((cartItem) =>
                        cartItem.id === id
                            ? { ...cartItem, quantity: cartItem.quantity - 1 }
                            : cartItem
                    )
                    .filter((cartItem) => cartItem.quantity > 0)
            );
        } catch (error) {
            console.error(error);

            toast.error(
                error instanceof Error ? error.message : "Unable to update cart"
            );
        }
    }

    async function placeBooking() {
        try {
            setCheckoutLoading(true);

            const token = getToken();

            if (!token) {
                toast.info("Please login first.");
                return;
            }

            const response = await apiFetch(`/checkout/${store.id}`, {
                method: "POST",
                includeAuth: true,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Checkout failed");
            }

            // Clear cart in UI so the checkout state updates immediately.
            setCart([]);

            toast.success("Booking placed successfully");
            window.dispatchEvent(new Event("munchies-booking-placed"));
        } catch (error) {
            console.error(error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Checkout failed"
            );
        } finally {
            setCheckoutLoading(false);
        }
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const cartQuantities = cart.reduce<Record<string, number>>((counts, item) => {
        counts[item.id] = item.quantity;
        return counts;
    }, {});

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-8">
                <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)] md:p-8">
                    <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                        <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h1 className="text-3xl font-black text-gray-950">
                                    {store.name}
                                </h1>
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                                    Open now
                                </span>
                            </div>

                            <p className="mb-4 max-w-2xl text-gray-600">
                                {store.tagline || "Fresh snacks, cold drinks, and easy comfort for your next break."}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700">
                                    {store.hostel}
                                </span>
                                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
                                    Room {store.room}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <section>
                    <h2 className="mb-6 text-2xl font-black text-gray-950">Menu</h2>

                    {items.length === 0 ? (
                        <div className="rounded-2xl border border-white/70 bg-white/90 p-6 font-medium text-gray-500 shadow-[0_14px_32px_rgba(249,115,22,0.06)]">
                            This menu is quiet right now. Check back later for fresh options.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => {
                                const quantityInCart = cartQuantities[item.id] ?? 0;
                                const canIncrease =
                                    item.stockQuantity > 0 &&
                                    totalItems < MAX_CART_ITEMS &&
                                    quantityInCart < item.stockQuantity;

                                return (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        quantityInCart={quantityInCart}
                                        canIncrease={canIncrease}
                                        onAddToCart={addToCart}
                                        onDecrease={removeFromCart}
                                    />
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            <div className="hidden lg:block w-[350px] xl:w-[400px]">
                <div className="sticky top-24 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                    <h2 className="mb-6 text-2xl font-black text-gray-950">
                        Checkout
                        <span className="ml-2 text-sm font-semibold text-gray-500">
                            {totalItems} item{totalItems === 1 ? "" : "s"}
                        </span>
                    </h2>

                    {cart.length === 0 ? (
                        <div className="py-2 text-left">
                            <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-6">
                                <h3 className="mb-1 font-bold text-gray-950">Your cart is empty</h3>
                                <p className="text-sm leading-6 text-gray-600">
                                    Add a few favorites from the menu to build your order.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 border-b border-gray-100 pb-4">
                                <div>
                                    <h3 className="font-bold text-gray-950">{store.name}</h3>
                                    <p className="text-xs text-gray-500">
                                        {store.hostel}, Room {store.room}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6 space-y-4">
                                {cart.map((item) => (
                                    <CartItem
                                        key={item.id}
                                        item={item}
                                        onRemove={removeFromCart}
                                        onAdd={() => {
                                            const storeItem = items.find((menuItem) => menuItem.id === item.id);

                                            if (storeItem) {
                                                addToCart(storeItem);
                                            }
                                        }}
                                    />
                                ))}
                            </div>

                            <h3 className="mb-3 font-bold text-gray-950">Bill details</h3>
                            <div className="mb-4 space-y-2 border-b border-gray-100 pb-4 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Item Total</span>
                                    <span>₹{total}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span>Order savings</span>
                                    <span>- ₹20</span>
                                </div>
                            </div>

                            <div className="mb-6 flex items-center justify-between">
                                <span className="text-lg font-bold text-gray-950">To pay</span>
                                <span className="text-lg font-extrabold text-gray-950">₹{Math.max(total - 20, 0)}</span>
                            </div>

                            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                                <p className="text-xs font-medium leading-relaxed text-red-800">
                                    <strong className="mb-1 block">Pickup reminder</strong>
                                    Please collect your order promptly after it’s accepted so it stays fresh and ready.
                                </p>
                            </div>

                            {!getToken() && (
                                <div className="mb-4 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm font-medium text-orange-800">
                                    Sign in to save this cart and place your order.
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={placeBooking}
                                disabled={checkoutLoading}
                                className="w-full rounded-xl bg-orange-600 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {checkoutLoading
                                    ? "Placing Booking..."
                                    : "Place Booking"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile "View Cart" sticky bar*/}
            {cart.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setShowMobileCart(true)}
                        className="w-full mx-auto max-w-xl rounded-2xl border border-white/70 bg-gradient-to-r from-orange-500 to-rose-500 p-4 shadow-[0_20px_50px_rgba(249,115,22,0.15)] flex items-center justify-between gap-4 text-white active:scale-[0.98] transition duration-150"
                    >
                        <div className="text-left">
                            <div className="text-sm font-black text-white">{totalItems} item{totalItems === 1 ? "" : "s"} added</div>
                            <div className="text-xs text-orange-100 font-bold">To pay • ₹{Math.max(total - 20, 0)}</div>
                        </div>

                        <span className="flex items-center gap-1.5 font-bold text-sm bg-white/20 px-3 py-1.5 rounded-xl border border-white/10">
                            View Cart
                        </span>
                    </button>
                </div>
            )}

            {/* Premium Mobile Bottom-Sheet Popup (Swiggy style) */}
            {showMobileCart && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/60 backdrop-blur-sm p-0 animate-fade-in lg:hidden">
                    {/* Close triggers on backdrop click */}
                    <div className="absolute inset-0" onClick={() => setShowMobileCart(false)} />

                    <div className="relative w-full max-w-lg rounded-t-[2.5rem] bg-white p-6 shadow-2xl space-y-5 animate-slide-up z-10 max-h-[85vh] flex flex-col">
                        {/* Drag handlebar */}
                        <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200 shrink-0" onClick={() => setShowMobileCart(false)} />

                        {/* Sheet Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-gray-950">{store.name}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                    {store.hostel}, Room {store.room}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMobileCart(false)}
                                className="h-8 w-8 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm font-black transition"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Sheet Cart List & Options */}
                        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <CartItem
                                        key={item.id}
                                        item={item}
                                        onRemove={removeFromCart}
                                        onAdd={() => {
                                            const storeItem = items.find((menuItem) => menuItem.id === item.id);

                                            if (storeItem) {
                                                addToCart(storeItem);
                                            }
                                        }}
                                    />
                                ))}
                            </div>

                            <div>
                                <h4 className="mb-2 font-black text-gray-900 text-sm">Bill Details</h4>
                                <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 text-sm font-semibold">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Item Total</span>
                                        <span>₹{total}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600">
                                        <span>Order savings</span>
                                        <span>- ₹20</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-black text-gray-950">
                                        <span>To Pay</span>
                                        <span>₹{Math.max(total - 20, 0)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                                <p className="text-xs font-semibold leading-relaxed text-red-800">
                                    <strong className="mb-0.5 block">Pickup reminder</strong>
                                    Please collect your order promptly after it’s accepted so it stays fresh and ready.
                                </p>
                            </div>

                            {!getToken() && (
                                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-xs font-bold text-orange-800 text-center">
                                    Sign in to save this cart and place your order.
                                </div>
                            )}
                        </div>

                        {/* Sticky Action Button at sheet bottom */}
                        <div className="pt-3 border-t border-gray-100 shrink-0">
                            <button
                                type="button"
                                onClick={async () => {
                                    await placeBooking();
                                    setShowMobileCart(false);
                                }}
                                disabled={checkoutLoading}
                                className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 py-4 text-base font-black text-white shadow-lg shadow-orange-150 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-75"
                            >
                                {checkoutLoading ? "Placing Booking..." : `Place Order • ₹${Math.max(total - 20, 0)}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}