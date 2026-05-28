"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../lib/auth";
import { BookingStatus, type OwnerBooking } from "../lib/bookings";
import {
    createOwnerItem, deleteOwnerItem, fetchOwnerBookings, fetchOwnerInventory,
    updateOwnerBookingStatus, updateOwnerItem, respondToBookingCancellation, type OwnerInventoryStore,
} from "../lib/owner";
import { useToast } from "./Toast";
import OwnerPanelShell from "./OwnerPanelShell";
import ConfirmationModal from "./ConfirmationModal";

type LoadingState = "loading" | "ready" | "error";
const LOW_STOCK = 5;

function getStoredUser() {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("munchies_user");
    if (!raw) return null;
    try { return JSON.parse(raw) as { role: string }; } catch { return null; }
}

function nextActions(status: BookingStatus) {
    if (status === "PLACED") return ["ACCEPTED", "REJECTED"] as const;
    if (status === "ACCEPTED") return ["READY", "REJECTED"] as const;
    if (status === "READY") return ["COMPLETED"] as const;
    return [] as const;
}

function money(v: number) { return `₹${v.toFixed(2)}`; }

function cleanImageFormData(fd: FormData) {
    const img = fd.get("image");
    if (img instanceof File && img.size === 0 && img.name === "") fd.delete("image");
}

export default function OwnerDashboardClient() {
    const router = useRouter();
    const toast = useToast();
    const [state, setState] = useState<LoadingState>("loading");
    const [error, setError] = useState("");
    const [inventory, setInventory] = useState<OwnerInventoryStore[]>([]);
    const [bookings, setBookings] = useState<OwnerBooking[]>([]);
    const [processingItemId, setProcessingItemId] = useState<string | null>(null);
    const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"inventory" | "bookings">("inventory");
    const [showAddItem, setShowAddItem] = useState(false);
    const [selectedStoreId, setSelectedStoreId] = useState<string>("");

    // Custom Confirmation Modals States
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedItemIdToDelete, setSelectedItemIdToDelete] = useState<string | null>(null);

    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
    const [cancelAction, setCancelAction] = useState<"approve" | "reject" | null>(null);

    async function load() {
        try {
            const [inv, bk] = await Promise.all([fetchOwnerInventory(), fetchOwnerBookings()]);
            setInventory(inv);
            setBookings(bk);
            if (!selectedStoreId && inv.length > 0) setSelectedStoreId(inv[0].id);
            setState("ready");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load dashboard");
            setState("error");
        }
    }

    useEffect(() => {
        const token = getToken();
        const user = getStoredUser();
        if (!token) { toast.info("Sign in again to continue."); router.replace("/"); return; }
        if (user?.role !== "STORE_OWNER") { toast.warning("You are not allowed to view the owner panel."); router.replace("/"); return; }
        void load();
    }, [router, toast]);

    const selectedStore = useMemo(() => inventory.find((s) => s.id === selectedStoreId), [inventory, selectedStoreId]);
    const storeItems = selectedStore?.items ?? [];
    const allItems = useMemo(() => inventory.flatMap((s) => s.items), [inventory]);
    const lowStockItems = useMemo(() => storeItems.filter((i) => i.stockQuantity <= LOW_STOCK), [storeItems]);
    const storeBookings = useMemo(() => bookings.filter((b) => b.store.id === selectedStoreId), [bookings, selectedStoreId]);
    const pendingBookings = useMemo(() => storeBookings.filter((b) => b.status !== "COMPLETED"), [storeBookings]);

    async function handleCreateItem(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        cleanImageFormData(fd);
        fd.set("storeId", selectedStoreId);
        try {
            setProcessingItemId("new");
            await createOwnerItem(fd);
            e.currentTarget.reset();
            setShowAddItem(false);
            toast.success("Item added to catalog");
            await load();
        } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to create item"); }
        finally { setProcessingItemId(null); }
    }

    async function handleUpdateItem(e: FormEvent<HTMLFormElement>, id: string) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        cleanImageFormData(fd);
        try {
            setProcessingItemId(id);
            await updateOwnerItem(id, fd);
            setEditingItemId(null);
            toast.success("Item updated successfully");
            await load();
        } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update item"); }
        finally { setProcessingItemId(null); }
    }

    function triggerDeleteItem(id: string) {
        setSelectedItemIdToDelete(id);
        setDeleteModalOpen(true);
    }

    async function handleDeleteItem() {
        if (!selectedItemIdToDelete) return;
        setDeleteModalOpen(false);
        try {
            setProcessingItemId(selectedItemIdToDelete);
            await deleteOwnerItem(selectedItemIdToDelete);
            toast.success("Item removed");
            await load();
        } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete item"); }
        finally {
            setProcessingItemId(null);
            setSelectedItemIdToDelete(null);
        }
    }

    async function handleBookingStatus(id: string, status: BookingStatus) {
        try {
            setProcessingBookingId(id);
            await updateOwnerBookingStatus(id, status);
            toast.success(`Order updated to ${status}`);
            await load();
        } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update status"); }
        finally { setProcessingBookingId(null); }
    }

    function triggerCancelResponse(id: string, action: "approve" | "reject") {
        setCancelBookingId(id);
        setCancelAction(action);
        setCancelModalOpen(true);
    }

    async function handleCancelResponse() {
        if (!cancelBookingId || !cancelAction) return;
        setCancelModalOpen(false);
        try {
            setProcessingBookingId(cancelBookingId);
            await respondToBookingCancellation(cancelBookingId, cancelAction);
            toast.success(`Cancellation request ${cancelAction}ed`);
            await load();
        } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to respond to cancellation"); }
        finally {
            setProcessingBookingId(null);
            setCancelBookingId(null);
            setCancelAction(null);
        }
    }

    // --- Store selector dropdown (shared across tabs) ---
    const storeSelector = inventory.length > 1 ? (
        <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm lg:text-base font-bold text-gray-800 outline-none focus:border-orange-300 shadow-sm"
        >
            {inventory.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.hostel}, Room {s.roomNumber}</option>
            ))}
        </select>
    ) : null;

    if (state === "loading") {
        return (
            <OwnerPanelShell title="Loading..." description="Fetching store data." activeTab={activeTab}
                onTabChange={(t) => { if (t === "inventory" || t === "bookings") setActiveTab(t); }}>
                <div className="space-y-4">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            </OwnerPanelShell>
        );
    }

    if (state === "error") {
        return (
            <OwnerPanelShell title="Error" description="Unable to load store data." activeTab={activeTab}
                onTabChange={(t) => { if (t === "inventory" || t === "bookings") setActiveTab(t); }}>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-8 text-center shadow-sm">
                    <p className="text-base font-semibold text-rose-700">{error}</p>
                    <button onClick={() => void load()} className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 active:scale-95">Retry</button>
                </div>
            </OwnerPanelShell>
        );
    }

    const title = activeTab === "inventory" ? "Inventory Catalog" : "Orders Dashboard";
    const desc = activeTab === "inventory"
        ? `${storeItems.length} active menu items`
        : `${pendingBookings.length} pending requests`;

    return (
        <OwnerPanelShell
            title={title} description={desc}
            actionLabel={showAddItem ? "Cancel Add" : "+ Add Item"}
            activeTab={activeTab}
            onTabChange={(t) => { if (t === "inventory" || t === "bookings") setActiveTab(t); }}
            onActionClick={() => { setActiveTab("inventory"); setShowAddItem((p) => !p); }}
        >
            <div className="space-y-6">
                {/* Store selector + stats row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-sm gap-3 w-full sm:w-auto">
                        {storeSelector}
                        {selectedStore && (
                            <span className="self-start sm:self-center text-xs lg:text-sm font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                                {selectedStore.hostel} • Room {selectedStore.roomNumber}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <div className="rounded-xl border border-gray-105 bg-white px-5 py-3 text-center shadow-sm min-w-[100px] flex-1 sm:flex-none">
                            <p className="text-2xl font-black text-gray-950">{storeItems.length}</p>
                            <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-400">Catalog Items</p>
                        </div>
                        <div className="rounded-xl border border-gray-105 bg-white px-5 py-3 text-center shadow-sm min-w-[100px] flex-1 sm:flex-none">
                            <p className="text-2xl font-black text-gray-950">{pendingBookings.length}</p>
                            <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-400">Pending Orders</p>
                        </div>
                        {lowStockItems.length > 0 && (
                            <div className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-3 text-center shadow-sm min-w-[100px] flex-1 sm:flex-none">
                                <p className="text-2xl font-black text-amber-700">{lowStockItems.length}</p>
                                <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-amber-600">Low Stock</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* INVENTORY TAB */}
                {activeTab === "inventory" ? (
                    <div className="space-y-6">
                        {/* Popup Modal for Add Menu Item */}
                        {showAddItem && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 animate-fade-in">
                                <div className="w-full max-w-lg rounded-2xl border border-orange-100 bg-white p-6 shadow-xl space-y-4 animate-slide-up">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                        <div>
                                            <span className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-orange-600">New Product Offering</span>
                                            <h3 className="text-lg lg:text-xl font-black text-gray-900">Add to your menu</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddItem(false)}
                                            className="h-8 w-8 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm font-black transition"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <form onSubmit={handleCreateItem} className="space-y-4">
                                        <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            Product Name
                                            <input name="name" required placeholder="e.g. Cheese Veg Maggi"
                                                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                        </label>
                                        <div className="grid gap-4 grid-cols-2">
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Price (₹)
                                                <input name="price" type="number" min="0" step="0.01" required placeholder="80"
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                            </label>
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Stock Level
                                                <input name="stockQuantity" type="number" min="0" step="1" required placeholder="30"
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                            </label>
                                        </div>
                                        <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                            Menu Photo
                                            <input name="image" type="file" accept="image/*" required
                                                className="block w-full text-xs text-gray-500 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-orange-600 file:px-3 file:py-1 file:text-[10px] file:font-bold file:text-white transition hover:file:bg-orange-700" />
                                        </label>
                                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddItem(false)}
                                                className="rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-5 py-2.5 text-sm font-bold transition active:scale-95 shadow-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={processingItemId === "new"}
                                                className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition active:scale-95 shadow-sm"
                                            >
                                                {processingItemId === "new" ? "Creating..." : "Save Product"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* MOBILE STACKED CARDS VIEW */}
                        <div className="block md:hidden space-y-4">
                            {storeItems.length === 0 ? (
                                <div className="rounded-xl border border-gray-150 bg-white p-8 text-center text-sm text-gray-400">No items in catalog yet.</div>
                            ) : storeItems.map((item) => (
                                <div key={item.id} className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-gray-900 text-base">{item.name}</h4>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${item.stockQuantity <= 0 ? "bg-rose-50 text-rose-700 border border-rose-100"
                                            : item.stockQuantity <= LOW_STOCK ? "bg-amber-50 text-amber-700 border border-amber-100"
                                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                            }`}>
                                            {item.stockQuantity <= 0 ? "Sold Out" : item.stockQuantity <= LOW_STOCK ? "Low Stock" : "Available"}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm text-gray-600 border-t border-gray-50 pt-2.5">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Price</p>
                                            <p className="font-bold text-gray-950">{money(item.price)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stock Level</p>
                                            <p className="font-bold text-gray-950">{item.stockQuantity} units</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end border-t border-gray-50 pt-2.5">
                                        <button type="button" disabled={processingItemId === item.id}
                                            onClick={() => setEditingItemId((c) => c === item.id ? null : item.id)}
                                            className="flex-1 rounded-xl bg-gray-50 border border-gray-150 py-2.5 text-xs font-bold text-gray-700 text-center active:scale-95 transition shadow-sm">
                                            {editingItemId === item.id ? "Close" : "Edit"}
                                        </button>
                                        <button type="button" disabled={processingItemId === item.id}
                                            onClick={() => triggerDeleteItem(item.id)}
                                            className="flex-1 rounded-xl bg-gray-50 border border-gray-150 py-2.5 text-xs font-bold text-gray-700 text-center active:scale-95 transition shadow-sm hover:bg-rose-50 hover:text-rose-700">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* DESKTOP WIDE TABLE VIEW */}
                        <div className="hidden md:block rounded-xl border border-gray-150 bg-white shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80">
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Item Name</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-right">Price</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-right">Stock</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-right">Status</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {storeItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-orange-50/30 transition duration-150">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900 text-sm lg:text-base">{item.name}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-gray-800 text-sm lg:text-base">{money(item.price)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-700 text-sm lg:text-base">{item.stockQuantity} units</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${item.stockQuantity <= 0 ? "bg-rose-50 text-rose-700 border border-rose-100"
                                                    : item.stockQuantity <= LOW_STOCK ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                                                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                    }`}>
                                                    <span className={`h-2 w-2 rounded-full ${item.stockQuantity <= 0 ? "bg-rose-500" : item.stockQuantity <= LOW_STOCK ? "bg-amber-500" : "bg-emerald-500"
                                                        }`} />
                                                    {item.stockQuantity <= 0 ? "Sold Out" : item.stockQuantity <= LOW_STOCK ? "Low Stock" : "Available"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button type="button" disabled={processingItemId === item.id}
                                                        onClick={() => setEditingItemId((c) => c === item.id ? null : item.id)}
                                                        className="rounded-xl bg-gray-50 border border-gray-150 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition active:scale-95 shadow-sm">
                                                        {editingItemId === item.id ? "Close" : "Edit"}
                                                    </button>
                                                    <button type="button" disabled={processingItemId === item.id}
                                                        onClick={() => triggerDeleteItem(item.id)}
                                                        className="rounded-xl bg-gray-50 border border-gray-150 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-rose-50 hover:text-rose-700 transition active:scale-95 shadow-sm">
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Popup Modal for Edit Menu Item */}
                        {editingItemId && storeItems.find((i) => i.id === editingItemId) && (() => {
                            const item = storeItems.find((i) => i.id === editingItemId)!;
                            return (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 animate-fade-in">
                                    <div className="w-full max-w-lg rounded-2xl border border-orange-100 bg-white p-6 shadow-xl space-y-4 animate-slide-up">
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                            <div>
                                                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Modify Offering</span>
                                                <h3 className="text-lg lg:text-xl font-black text-gray-900">Edit Catalog Product</h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditingItemId(null)}
                                                className="h-8 w-8 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm font-black transition"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <form onSubmit={(e) => handleUpdateItem(e, item.id)} className="space-y-4">
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Product Name
                                                <input name="name" defaultValue={item.name} required
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                            </label>
                                            <div className="grid gap-4 grid-cols-2">
                                                <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                    Price (₹)
                                                    <input name="price" type="number" min="0" step="0.01" defaultValue={item.price} required
                                                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                                </label>
                                                <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                    Stock Level
                                                    <input name="stockQuantity" type="number" min="0" step="1" defaultValue={item.stockQuantity} required
                                                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                                </label>
                                            </div>
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Replace Photo (Optional)
                                                <input name="image" type="file" accept="image/*"
                                                    className="block w-full text-xs text-gray-500 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-orange-600 file:px-3 file:py-1 file:text-[10px] file:font-bold file:text-white transition hover:file:bg-orange-700" />
                                            </label>
                                            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingItemId(null)}
                                                    className="rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-5 py-2.5 text-sm font-bold transition active:scale-95 shadow-sm"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={processingItemId === item.id}
                                                    className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition active:scale-95 shadow-sm"
                                                >
                                                    {processingItemId === item.id ? "Saving..." : "Save Changes"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    /* BOOKINGS TAB */
                    <div className="space-y-4">
                        {/* MOBILE STACKED VIEW */}
                        <div className="block md:hidden space-y-4">
                            {storeBookings.length === 0 ? (
                                <div className="rounded-xl border border-gray-150 bg-white p-8 text-center text-sm text-gray-400">No orders placed yet.</div>
                            ) : storeBookings.map((b) => {
                                const acts = nextActions(b.status);
                                return (
                                    <div key={b.id} className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-orange-600 text-lg">Order #{b.orderNumber || b.id.slice(0, 6).toUpperCase()}</span>
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${b.status === "PLACED" ? "bg-amber-50 text-amber-700 border border-amber-100"
                                                : b.status === "ACCEPTED" ? "bg-sky-50 text-sky-700 border border-sky-100"
                                                    : b.status === "READY" ? "bg-cyan-50 text-cyan-700 border border-cyan-100"
                                                        : b.status === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-100"
                                                            : b.status === "CANCEL_REQUESTED" ? "bg-orange-50 text-orange-700 border border-orange-100 animate-pulse"
                                                                : b.status === "CANCELLED" ? "bg-slate-100 text-slate-600 border border-slate-200"
                                                                    : "bg-gray-100 text-gray-600"
                                                }`}>{b.status === "CANCEL_REQUESTED" ? "CANCEL REQUESTED" : b.status}</span>
                                        </div>

                                        <div className="text-sm text-gray-600 border-t border-gray-50 pt-2">
                                            <p className="font-bold text-gray-900 text-sm lg:text-base">{b.user.firstName || "Customer"}</p>
                                            <p className="text-xs text-gray-400">{b.user.email}</p>
                                        </div>

                                        <div className="border-t border-b border-gray-50 py-2 space-y-1">
                                            {b.items.map((l) => (
                                                <p key={l.id} className="text-gray-700 text-sm">
                                                    {l.item.name} <span className="font-black text-orange-600">×{l.quantity}</span>
                                                </p>
                                            ))}
                                            <p className="text-right font-black text-gray-950 text-sm lg:text-base mt-1">Total: {money(b.totalAmount)}</p>
                                        </div>

                                        {b.status === "CANCEL_REQUESTED" && (
                                            <div className="flex gap-2 pt-1">
                                                <button type="button" disabled={processingBookingId === b.id}
                                                    onClick={() => triggerCancelResponse(b.id, "approve")}
                                                    className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition active:scale-95 disabled:opacity-60 shadow-sm text-center">
                                                    Approve
                                                </button>
                                                <button type="button" disabled={processingBookingId === b.id}
                                                    onClick={() => triggerCancelResponse(b.id, "reject")}
                                                    className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white bg-slate-600 hover:bg-slate-700 transition active:scale-95 disabled:opacity-60 shadow-sm text-center">
                                                    Reject Request
                                                </button>
                                            </div>
                                        )}

                                        {acts.length > 0 && b.status !== "CANCEL_REQUESTED" && (
                                            <div className="flex gap-2 pt-1">
                                                {acts.map((s) => (
                                                    <button key={s} type="button" disabled={processingBookingId === b.id}
                                                        onClick={() => handleBookingStatus(b.id, s)}
                                                        className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-60 shadow-sm text-center ${s === "REJECTED" ? "bg-rose-600 hover:bg-rose-700"
                                                            : s === "READY" ? "bg-cyan-600 hover:bg-cyan-700"
                                                                : s === "COMPLETED" ? "bg-gray-900 hover:bg-gray-700"
                                                                    : "bg-emerald-600 hover:bg-emerald-700"
                                                            }`}>
                                                        {s === "ACCEPTED" ? "Accept"
                                                            : s === "READY" ? "Mark Ready"
                                                                : s === "REJECTED" ? (b.status === "ACCEPTED" ? "Cancel Order" : "Reject")
                                                                    : "Complete"}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* DESKTOP WIDE TABLE VIEW*/}
                        <div className="hidden md:block rounded-xl border border-gray-150 bg-white shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[750px]">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80">
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Order #</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Customer</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Items Ordered</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-right">Total</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-center">Status</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {storeBookings.map((b) => {
                                        const acts = nextActions(b.status);
                                        return (
                                            <tr key={b.id} className="hover:bg-orange-50/30 transition duration-150">
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-orange-600 text-base">{b.orderNumber || b.id.slice(0, 6).toUpperCase()}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900 text-sm lg:text-base">{b.user.firstName || "Customer"}</p>
                                                    <p className="text-xs text-gray-400">{b.user.email}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-0.5">
                                                        {b.items.map((l) => (
                                                            <p key={l.id} className="text-gray-700 text-sm">
                                                                {l.item.name} <span className="font-black text-orange-600">×{l.quantity}</span>
                                                            </p>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-gray-900 text-sm lg:text-base">{money(b.totalAmount)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${b.status === "PLACED" ? "bg-amber-50 text-amber-700 border border-amber-100"
                                                        : b.status === "ACCEPTED" ? "bg-sky-50 text-sky-700 border border-sky-100"
                                                            : b.status === "READY" ? "bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse"
                                                                : b.status === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-100"
                                                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                                        }`}>
                                                        {b.status === "ACCEPTED" ? "Preparing"
                                                            : b.status === "READY" ? "Ready"
                                                                : b.status === "CANCEL_REQUESTED" ? "Cancellation Requested"
                                                                    : b.status === "CANCELLED" ? "Cancelled"
                                                                        : b.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {b.status === "CANCEL_REQUESTED" ? (
                                                            <>
                                                                <button type="button" disabled={processingBookingId === b.id}
                                                                    onClick={() => triggerCancelResponse(b.id, "approve")}
                                                                    className="rounded-xl px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition active:scale-95 disabled:opacity-60 shadow-sm">
                                                                    Approve
                                                                </button>
                                                                <button type="button" disabled={processingBookingId === b.id}
                                                                    onClick={() => triggerCancelResponse(b.id, "reject")}
                                                                    className="rounded-xl px-4 py-2 text-xs font-bold text-white bg-slate-600 hover:bg-slate-700 transition active:scale-95 disabled:opacity-60 shadow-sm">
                                                                    Reject
                                                                </button>
                                                            </>
                                                        ) : (
                                                            acts.map((s) => (
                                                                <button key={s} type="button" disabled={processingBookingId === b.id}
                                                                    onClick={() => handleBookingStatus(b.id, s)}
                                                                    className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-60 shadow-sm ${s === "REJECTED" ? "bg-rose-600 hover:bg-rose-700"
                                                                        : s === "READY" ? "bg-cyan-600 hover:bg-cyan-700"
                                                                            : s === "COMPLETED" ? "bg-gray-900 hover:bg-gray-700"
                                                                                : "bg-emerald-600 hover:bg-emerald-700"
                                                                        }`}>
                                                                    {s === "ACCEPTED" ? "Accept"
                                                                        : s === "READY" ? "Mark Ready"
                                                                            : s === "REJECTED" ? (b.status === "ACCEPTED" ? "Cancel Order" : "Reject")
                                                                                : "Complete"}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={deleteModalOpen}
                title="Delete Menu Item?"
                message="Are you sure you want to delete this menu item? This action is permanent and cannot be undone."
                confirmText="Delete Item"
                cancelText="Keep Item"
                type="danger"
                onConfirm={handleDeleteItem}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setSelectedItemIdToDelete(null);
                }}
            />

            <ConfirmationModal
                isOpen={cancelModalOpen}
                title={cancelAction === "approve" ? "Approve Cancellation?" : "Reject Cancellation?"}
                message={cancelAction === "approve" 
                    ? "Are you sure you want to APPROVE this cancellation request? This will mark the booking as CANCELLED." 
                    : "Are you sure you want to REJECT this cancellation request? This will restore the order to its active state."}
                confirmText={cancelAction === "approve" ? "Yes, Approve" : "Yes, Reject"}
                cancelText="No, Go Back"
                type={cancelAction === "approve" ? "danger" : "warning"}
                onConfirm={handleCancelResponse}
                onCancel={() => {
                    setCancelModalOpen(false);
                    setCancelBookingId(null);
                    setCancelAction(null);
                }}
            />
        </OwnerPanelShell>
    );
}
