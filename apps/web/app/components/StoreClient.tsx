"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ItemCard from "./ItemCard";
import CartItem from "./CartItem";
import type { AddableItem, CartItem as CartLineItem, Store, StoreItem } from "../lib/munchies";
import { getToken } from "../lib/auth";

type Props = {
    store: Store;
    items: StoreItem[];
};

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000";

export default function StoreClient({ store, items }: Props) {
    const router = useRouter();
    const [cart, setCart] = useState<CartLineItem[]>([]);

    function requireAuthForCartAction() {
        const token = getToken();

        if (!token) {
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

                const response = await fetch(
                    `${API_BASE_URL}/cart/${store.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

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

    async function addToCart(item: AddableItem) {
        const token = requireAuthForCartAction();

        if (!token) {
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

            return [...prev, { ...item, quantity: 1 }];
        });

        try {
            await fetch(`${API_BASE_URL}/cart/${store.id}/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    itemId: item.id,
                    quantity: 1,
                }),
            });
        } catch (error) {
            console.error(error);
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

        setCart((prev) =>
            prev
                .map((item) =>
                    item.id === id
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );

        try {
            const cartResponse = await fetch(
                `${API_BASE_URL}/cart/${store.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const cartData = await cartResponse.json();

            const cartItem = cartData.items.find(
                (cartItem: { item: { id: string } }) => cartItem.item.id === id
            );

            if (!cartItem) {
                return;
            }

            if (existingItem.quantity === 1) {
                await fetch(`${API_BASE_URL}/cart/item/${cartItem.id}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                return;
            }

            await fetch(`${API_BASE_URL}/cart/item/${cartItem.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    quantity: existingItem.quantity - 1,
                }),
            });
        } catch (error) {
            console.error(error);
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
                            {items.map((item) => (
                                <ItemCard
                                    key={item.id}
                                    item={item}
                                    quantityInCart={cartQuantities[item.id] ?? 0}
                                    onAddToCart={addToCart}
                                    onDecrease={removeFromCart}
                                />
                            ))}
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
                                        onAdd={() => addToCart(item)}
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
                                onClick={() => {
                                    const token = getToken();

                                    if (!token) {
                                        router.push("/login");
                                        return;
                                    }
                                }}
                                className="w-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 active:scale-95"
                            >
                                Place order
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile sticky cart bar (shows when cart has items) */}
            {cart.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
                    <div className="mx-auto max-w-xl rounded-2xl border border-white/70 bg-white/95 p-4 shadow-[0_20px_50px_rgba(249,115,22,0.08)] flex items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-bold text-gray-900">{totalItems} item{totalItems === 1 ? "" : "s"}</div>
                            <div className="text-sm text-gray-600">To pay • ₹{Math.max(total - 20, 0)}</div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const token = getToken();

                                if (!token) {
                                    router.push("/login");
                                    return;
                                }

                                // On mobile, keep same behaviour as desktop Place order button
                            }}
                            className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3 text-sm font-bold text-white shadow-lg"
                        >
                            Place order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}