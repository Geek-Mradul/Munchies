"use client";

import { useState } from "react";
import ItemCard from "./ItemCard";
import CartItem from "./CartItem";
import type { AddableItem, CartItem as CartLineItem, Store, StoreItem } from "../lib/munchies";

type Props = {
    store: Store;
    items: StoreItem[];
};

export default function StoreClient({ store, items }: Props) {
    const [cart, setCart] = useState<CartLineItem[]>([]);

    function addToCart(item: AddableItem) {
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
    }

    function removeFromCart(id: number) {
        setCart((prev) =>
            prev
                .map((item) =>
                    item.id === id
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const cartQuantities = cart.reduce<Record<number, number>>((counts, item) => {
        counts[item.id] = item.quantity;
        return counts;
    }, {});

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-8">
                <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                    <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                        <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h1 className="text-3xl font-extrabold text-gray-900">
                                    {store.name}
                                </h1>
                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                                    Open
                                </span>
                            </div>

                            <p className="mb-4 text-gray-500">
                                {store.tagline || "Late night snacks and beverages."}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-md bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700">
                                    {store.hostel}
                                </span>
                                <span className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
                                    Room {store.room}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <section>
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">Menu</h2>

                    {items.length === 0 ? (
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 font-medium text-gray-500 shadow-sm">
                            Menu is currently empty.
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

            <div className="w-full lg:w-[350px] xl:w-[400px]">
                <div className="sticky top-24 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h2>

                    {cart.length === 0 ? (
                        <div className="py-2 text-left">
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6">
                                <h3 className="mb-1 font-bold text-gray-900">Empty Cart</h3>
                                <p className="text-sm leading-6 text-gray-500">
                                    Add some delicious items from the menu to get started.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 border-b border-gray-100 pb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900">{store.name}</h3>
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

                            <h3 className="mb-3 font-bold text-gray-900">Bill Details</h3>
                            <div className="mb-4 space-y-2 border-b border-gray-100 pb-4 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Item Total</span>
                                    <span>₹{total}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span>Platform Discount</span>
                                    <span>- ₹20</span>
                                </div>
                            </div>

                            <div className="mb-6 flex items-center justify-between">
                                <span className="text-lg font-bold text-gray-900">To Pay</span>
                                <span className="text-lg font-extrabold text-gray-900">₹{Math.max(total - 20, 0)}</span>
                            </div>

                            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                                <p className="text-xs font-medium leading-relaxed text-red-800">
                                    <strong className="mb-1 block">Uncollected Order Policy</strong>
                                    Once accepted, you must collect this order within 24 hours to avoid a warning strike.
                                </p>
                            </div>

                            <button className="w-full rounded-xl bg-orange-600 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 active:scale-95">
                                Place Booking
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}