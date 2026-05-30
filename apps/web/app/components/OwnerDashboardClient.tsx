"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { getToken } from "../lib/auth";
import { BookingStatus, type OwnerBooking } from "../lib/bookings";
import {
    createOwnerItem, deleteOwnerItem, fetchOwnerBookings, fetchOwnerInventory,
    updateOwnerBookingStatus, updateOwnerItem, respondToBookingCancellation, type OwnerInventoryStore,
    fetchOwnerCampaigns, createOwnerCampaign, deleteOwnerCampaign, type OwnerCampaign, updateStoreSettings,
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
    const [campaigns, setCampaigns] = useState<OwnerCampaign[]>([]);
    const [processingItemId, setProcessingItemId] = useState<string | null>(null);
    const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
    const [processingCampaignId, setProcessingCampaignId] = useState<string | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"inventory" | "bookings" | "promotions" | "analytics" | "settings">("inventory");
    const [analytics, setAnalytics] = useState<{
        totalRevenue: number;
        weeklyRevenue: number;
        monthlyRevenue: number;
        mostSoldItem: { id: string; name: string; quantity: number; price: number } | null;
        leastSoldItem: { id: string; name: string; quantity: number; price: number } | null;
        bookingStatistics: Record<string, number>;
        lowStockAlerts: { id: string; name: string; stockQuantity: number }[];
    } | null>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [showAddItem, setShowAddItem] = useState(false);
    const [showAddCampaign, setShowAddCampaign] = useState(false);
    const [selectedStoreId, setSelectedStoreId] = useState<string>("");
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
    const [announceModalOpen, setAnnounceModalOpen] = useState(false);

    // Custom Confirmation Modals States
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedItemIdToDelete, setSelectedItemIdToDelete] = useState<string | null>(null);

    const [deleteCampaignModalOpen, setDeleteCampaignModalOpen] = useState(false);
    const [selectedCampaignToDelete, setSelectedCampaignToDelete] = useState<string | null>(null);

    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
    const [cancelAction, setCancelAction] = useState<"approve" | "reject" | null>(null);

    const [settingsName, setSettingsName] = useState("");
    const [settingsTagline, setSettingsTagline] = useState("");
    const [updatingSettings, setUpdatingSettings] = useState(false);

    async function handleSaveSettings(e: FormEvent) {
        e.preventDefault();
        if (!selectedStoreId || updatingSettings) return;

        if (!settingsName.trim()) {
            toast.error("Store name is required.");
            return;
        }

        setUpdatingSettings(true);
        try {
            const res = await updateStoreSettings(selectedStoreId, {
                name: settingsName.trim(),
                tagline: settingsTagline.trim() || null,
            });
            toast.success(res.message || "Store settings updated successfully!");
            
            // Refresh local inventory/store info
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save settings");
        } finally {
            setUpdatingSettings(false);
        }
    }

    async function load() {
        try {
            const [inv, bk, camps] = await Promise.all([
                fetchOwnerInventory(),
                fetchOwnerBookings(),
                fetchOwnerCampaigns()
            ]);
            setInventory(inv);
            setBookings(bk);
            setCampaigns(camps);
            if (!selectedStoreId && inv.length > 0) setSelectedStoreId(inv[0].id);
            setState("ready");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load dashboard");
            setState("error");
        }
    }

    async function loadAnalyticsData() {
        if (!selectedStoreId) return;
        setLoadingAnalytics(true);
        try {
            const res = await apiFetch(`/owner/analytics?storeId=${selectedStoreId}`, {
                includeAuth: true,
            });
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error("Failed to load analytics:", err);
        } finally {
            setLoadingAnalytics(false);
        }
    }

    useEffect(() => {
        const token = getToken();
        const user = getStoredUser();
        if (!token) { toast.info("Sign in again to continue."); router.replace("/"); return; }
        if (user?.role !== "STORE_OWNER") { toast.warning("You are not allowed to view the owner panel."); router.replace("/"); return; }
        void load();
    }, [router, toast]);

    useEffect(() => {
        if (selectedStoreId) {
            void loadAnalyticsData();
        }
    }, [selectedStoreId]);

    const selectedStore = useMemo(() => inventory.find((s) => s.id === selectedStoreId), [inventory, selectedStoreId]);
    const storeItems = selectedStore?.items ?? [];
    const allItems = useMemo(() => inventory.flatMap((s) => s.items), [inventory]);
    const lowStockItems = useMemo(() => storeItems.filter((i) => i.stockQuantity <= LOW_STOCK), [storeItems]);
    const storeBookings = useMemo(() => bookings.filter((b) => b.store.id === selectedStoreId), [bookings, selectedStoreId]);
    const pendingBookings = useMemo(() => storeBookings.filter((b) => b.status !== "COMPLETED"), [storeBookings]);
    const storeCampaigns = useMemo(() => campaigns.filter((c) => c.storeId === selectedStoreId), [campaigns, selectedStoreId]);

    const isWithin7Days = useMemo(() => {
        if (!selectedStore?.createdAt) return false;
        const createdDate = new Date(selectedStore.createdAt);
        const diffTime = Date.now() - createdDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
    }, [selectedStore]);

    useEffect(() => {
        if (selectedStore) {
            setSettingsName(selectedStore.name || "");
            setSettingsTagline(selectedStore.tagline || "");
        }
    }, [selectedStore]);

    async function handleSendAnnouncement() {
        if (!selectedStoreId || sendingAnnouncement) return;
        setSendingAnnouncement(true);
        try {
            const response = await apiFetch(`/owner/stores/${selectedStoreId}/announce`, {
                method: "POST",
                includeAuth: true,
            });

            if (response.ok) {
                toast.success("Announcement Broadcasted", "Your grand opening notification has been sent to all subscribed campus students!");
                await load();
            } else {
                const err = await response.json();
                toast.error("Announcement Failed", err.error || "Failed to broadcast announcement.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Connection Error", "Failed to connect to the server.");
        } finally {
            setSendingAnnouncement(false);
        }
    }

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

    async function handleCreateCampaign(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const code = formData.get("code")?.toString().trim() || undefined;
        const discountType = formData.get("discountType") as "PERCENTAGE" | "FLAT";
        const discountValue = parseFloat(formData.get("discountValue") as string);
        const startDateStr = formData.get("startDate") as string;
        const endDateStr = formData.get("endDate") as string;
        const minOrderValue = parseFloat(formData.get("minOrderValue") as string) || 0;
        
        const globalLimitRaw = formData.get("globalLimit") as string;
        const globalLimit = globalLimitRaw ? parseInt(globalLimitRaw, 10) : null;
        
        const perUserLimitRaw = formData.get("perUserLimit") as string;
        const perUserLimit = perUserLimitRaw ? parseInt(perUserLimitRaw, 10) : null;

        try {
            setProcessingCampaignId("new");
            await createOwnerCampaign({
                storeId: selectedStoreId,
                code,
                discountType,
                discountValue,
                startDate: new Date(startDateStr).toISOString(),
                endDate: new Date(endDateStr).toISOString(),
                minOrderValue,
                globalLimit,
                perUserLimit
            });
            
            e.currentTarget.reset();
            setShowAddCampaign(false);
            toast.success("Campaign created successfully!");
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create campaign");
        } finally {
            setProcessingCampaignId(null);
        }
    }

    function triggerDeleteCampaign(id: string) {
        setSelectedCampaignToDelete(id);
        setDeleteCampaignModalOpen(true);
    }

    async function handleDeleteCampaign() {
        if (!selectedCampaignToDelete) return;
        setDeleteCampaignModalOpen(false);
        try {
            setProcessingCampaignId(selectedCampaignToDelete);
            await deleteOwnerCampaign(selectedCampaignToDelete);
            toast.success("Campaign deleted");
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete campaign");
        } finally {
            setProcessingCampaignId(null);
            setSelectedCampaignToDelete(null);
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
                onTabChange={(t) => { if (t === "inventory" || t === "bookings" || t === "promotions" || t === "analytics" || t === "settings") setActiveTab(t); }}>
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
                onTabChange={(t) => { if (t === "inventory" || t === "bookings" || t === "promotions" || t === "analytics" || t === "settings") setActiveTab(t); }}>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-8 text-center shadow-sm">
                    <p className="text-base font-semibold text-rose-700">{error}</p>
                    <button onClick={() => void load()} className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 active:scale-95">Retry</button>
                </div>
            </OwnerPanelShell>
        );
    }

    const title = activeTab === "inventory"
        ? "Inventory Catalog"
        : activeTab === "bookings"
            ? "Orders Dashboard"
            : activeTab === "promotions"
                ? "Active Campaigns"
                : activeTab === "settings"
                    ? "Store Settings"
                    : "Live Store Analytics";

    const desc = activeTab === "inventory"
        ? `${storeItems.length} active menu items`
        : activeTab === "bookings"
            ? `${pendingBookings.length} pending requests`
            : activeTab === "promotions"
                ? `${storeCampaigns.length} configured sale campaigns`
                : activeTab === "settings"
                    ? "Manage your campus kitchen details, name, and tagline"
                    : "Real-time metrics, product popularity, and sales breakdown";

    return (
        <OwnerPanelShell
            title={title} description={desc}
            actionLabel={
                activeTab === "inventory"
                    ? (showAddItem ? "Cancel Add" : "+ Add Item")
                    : activeTab === "promotions"
                        ? (showAddCampaign ? "Cancel Create" : "+ Create Campaign")
                        : undefined
            }
            activeTab={activeTab}
            onTabChange={(t) => { if (t === "inventory" || t === "bookings" || t === "promotions" || t === "analytics" || t === "settings") setActiveTab(t); }}
            onActionClick={() => { 
                if (activeTab === "inventory") {
                    setShowAddItem((p) => !p); 
                } else if (activeTab === "promotions") {
                    setShowAddCampaign((p) => !p);
                }
            }}
        >
            <div className="space-y-6">
                {/* Store selector + stats row — hidden on Settings tab */}
                {activeTab !== "settings" && (
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
                )}

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
                ) : activeTab === "bookings" ? (
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
                                        <p className="text-[10px] text-gray-400 font-medium -mt-2">
                                            Ordered: {new Date(b.createdAt).toLocaleDateString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: true
                                            })}
                                        </p>

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
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Date</th>
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
                                                <td className="px-6 py-4 text-xs font-bold text-gray-500 whitespace-nowrap">
                                                    {new Date(b.createdAt).toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: true
                                                    })}
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
                ) : null}

                {/* PROMOTIONS TAB */}
                {activeTab === "promotions" && (
                    <div className="space-y-6">
                        {/* Popup Modal for Create Campaign */}
                        {showAddCampaign && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 animate-fade-in">
                                <div className="w-full max-w-lg rounded-2xl border border-orange-100 bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto animate-slide-up">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                        <div>
                                            <span className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Marketing & Sales</span>
                                            <h3 className="text-lg lg:text-xl font-black text-gray-900">Create Sale Campaign</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCampaign(false)}
                                            className="h-8 w-8 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm font-black transition"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    
                                    <form onSubmit={handleCreateCampaign} className="space-y-4">
                                        <div className="grid gap-4 grid-cols-2">
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Coupon Code (Optional)
                                                <input name="code" placeholder="e.g. SAVE20"
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm uppercase" />
                                            </label>
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Min Order Value (₹)
                                                <input name="minOrderValue" type="number" min="0" defaultValue="0" step="0.01" required
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                            </label>
                                        </div>

                                        <div className="grid gap-4 grid-cols-2">
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Discount Type
                                                <select name="discountType" required
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-orange-300 shadow-sm">
                                                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                                                    <option value="FLAT">FLAT (₹)</option>
                                                </select>
                                            </label>
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Discount Value
                                                <input name="discountValue" type="number" min="0.01" step="0.01" required placeholder="20"
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                            </label>
                                        </div>

                                        <div className="grid gap-4 grid-cols-2">
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Start Date & Time
                                                <input name="startDate" type="datetime-local" required
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                            </label>
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                End Date & Time
                                                <input name="endDate" type="datetime-local" required
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                            </label>
                                        </div>

                                        <div className="grid gap-4 grid-cols-2">
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Global Limit (Uses)
                                                <input name="globalLimit" type="number" min="1" placeholder="Unlimited"
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                            </label>
                                            <label className="block space-y-1.5 text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Per-User Limit (Uses)
                                                <input name="perUserLimit" type="number" min="1" placeholder="Unlimited"
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 shadow-sm" />
                                            </label>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddCampaign(false)}
                                                className="rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-5 py-2.5 text-sm font-bold transition active:scale-95 shadow-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={processingCampaignId === "new"}
                                                className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition active:scale-95 shadow-sm"
                                            >
                                                {processingCampaignId === "new" ? "Creating..." : "Save Campaign"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* MOBILE STACKED VIEW */}
                        <div className="block md:hidden space-y-4">
                            {storeCampaigns.length === 0 ? (
                                <div className="rounded-xl border border-gray-150 bg-white p-8 text-center text-sm text-gray-400">No campaigns created yet.</div>
                            ) : storeCampaigns.map((c) => (
                                <div key={c.id} className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-orange-600 text-lg tracking-wide uppercase">{c.code}</span>
                                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                            c.isActive 
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                                : "bg-rose-50 text-rose-700 border border-rose-100"
                                        }`}>
                                            {c.isActive ? "ACTIVE" : "INACTIVE"}
                                        </span>
                                    </div>

                                    <div className="text-sm text-gray-600 border-t border-gray-50 pt-2 space-y-1">
                                        <p className="font-bold text-gray-900">
                                            Discount: <span className="text-orange-600 font-extrabold">{c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : money(c.discountValue)} Off</span>
                                        </p>
                                        <p className="text-xs text-gray-500">Min. Order: {money(c.minOrderValue)}</p>
                                        <p className="text-xs text-gray-500">Uses: {c.usedCount} {c.globalLimit !== null ? `/ ${c.globalLimit}` : ""}</p>
                                        <p className="text-xs text-gray-500">Per-User Limit: {c.perUserLimit ?? "Unlimited"}</p>
                                        <p className="text-[11px] text-gray-400">Schedule: {new Date(c.startDate).toLocaleString()} - {new Date(c.endDate).toLocaleString()}</p>
                                    </div>

                                    <div className="flex gap-2 justify-end border-t border-gray-50 pt-2.5">
                                        <button type="button" disabled={processingCampaignId === c.id}
                                            onClick={() => triggerDeleteCampaign(c.id)}
                                            className="w-full rounded-xl bg-gray-50 border border-gray-150 py-2 text-xs font-bold text-rose-600 text-center active:scale-95 transition shadow-sm hover:bg-rose-50">
                                            Delete Campaign
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* DESKTOP WIDE TABLE VIEW */}
                        <div className="hidden md:block rounded-xl border border-gray-150 bg-white shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[850px]">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80">
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Coupon Code</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Discount</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Min Order</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Schedule</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-center">Uses</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-center">Status</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {storeCampaigns.map((c) => (
                                        <tr key={c.id} className="hover:bg-orange-50/30 transition duration-150">
                                            <td className="px-6 py-4 font-black text-orange-600 text-sm lg:text-base uppercase tracking-wider">{c.code}</td>
                                            <td className="px-6 py-4 font-extrabold text-gray-900">
                                                {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : money(c.discountValue)}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-700">{money(c.minOrderValue)}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-500">
                                                <div>{new Date(c.startDate).toLocaleString()}</div>
                                                <div className="text-[10px] text-gray-400">to {new Date(c.endDate).toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-800">
                                                {c.usedCount} <span className="text-gray-400 text-xs font-normal">/ {c.globalLimit ?? "∞"}</span>
                                                {c.perUserLimit && <div className="text-[10px] text-gray-400 font-medium">({c.perUserLimit} per user)</div>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                                    c.isActive 
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                                        : "bg-rose-50 text-rose-700 border border-rose-100"
                                                }`}>
                                                    <span className={`h-2 w-2 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                                                    {c.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button type="button" disabled={processingCampaignId === c.id}
                                                    onClick={() => triggerDeleteCampaign(c.id)}
                                                    className="rounded-xl bg-gray-50 border border-gray-150 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition active:scale-95 shadow-sm">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === "analytics" && (
                    <div className="space-y-6">
                        {loadingAnalytics && !analytics ? (
                            <div className="grid gap-4 sm:grid-cols-3">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="h-32 rounded-2xl bg-gray-100 animate-pulse border border-gray-100" />
                                ))}
                            </div>
                        ) : !analytics ? (
                            <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-8 text-center text-gray-500 font-semibold">
                                No analytics data available.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Revenue Row */}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/60 to-orange-100/40 p-6 shadow-sm">
                                        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Total Revenue</p>
                                        <p className="mt-2 text-3xl font-black text-gray-950">{money(analytics.totalRevenue)}</p>
                                        <p className="mt-1 text-[11px] text-gray-400 font-medium">All completed orders</p>
                                    </div>
                                    <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/60 to-rose-100/40 p-6 shadow-sm">
                                        <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Weekly Revenue</p>
                                        <p className="mt-2 text-3xl font-black text-gray-950">{money(analytics.weeklyRevenue)}</p>
                                        <p className="mt-1 text-[11px] text-gray-400 font-medium">Last 7 days completed</p>
                                    </div>
                                    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-amber-100/40 p-6 shadow-sm">
                                        <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Monthly Revenue</p>
                                        <p className="mt-2 text-3xl font-black text-gray-950">{money(analytics.monthlyRevenue)}</p>
                                        <p className="mt-1 text-[11px] text-gray-400 font-medium">Last 30 days completed</p>
                                    </div>
                                </div>

                                {/* Popularity Row */}
                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Most / Least Sold */}
                                    <div className="rounded-2xl border border-orange-100/80 bg-white p-6 shadow-sm space-y-4">
                                        <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-50 pb-2">Product Performance</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">Most Sold Item</span>
                                                    <span className="text-xs font-black text-gray-900">{analytics.mostSoldItem ? `${analytics.mostSoldItem.quantity} units sold` : "0 sales"}</span>
                                                </div>
                                                {analytics.mostSoldItem ? (
                                                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                                                        <p className="text-sm font-black text-gray-950">{analytics.mostSoldItem.name}</p>
                                                        <p className="text-xs text-gray-500 font-bold mt-0.5">Price: {money(analytics.mostSoldItem.price)} | Revenue: {money(analytics.mostSoldItem.quantity * analytics.mostSoldItem.price)}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 font-medium p-3 bg-gray-50 rounded-xl">No items have been ordered yet.</p>
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">Least Sold Item</span>
                                                    <span className="text-xs font-black text-gray-900">{analytics.leastSoldItem ? `${analytics.leastSoldItem.quantity} units sold` : "0 sales"}</span>
                                                </div>
                                                {analytics.leastSoldItem ? (
                                                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                                                        <p className="text-sm font-black text-gray-950">{analytics.leastSoldItem.name}</p>
                                                        <p className="text-xs text-gray-500 font-bold mt-0.5">Price: {money(analytics.leastSoldItem.price)} | Revenue: {money(analytics.leastSoldItem.quantity * analytics.leastSoldItem.price)}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 font-medium p-3 bg-gray-50 rounded-xl">No menu items found in catalog.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Low Stock Alerts */}
                                    <div className="rounded-2xl border border-orange-100/80 bg-white p-6 shadow-sm space-y-4">
                                        <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-50 pb-2">Low Stock Alerts</h3>
                                        <div className="space-y-2.5 max-h-[175px] overflow-y-auto pr-1">
                                            {analytics.lowStockAlerts.length === 0 ? (
                                                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                    <svg className="h-6 w-6 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-xs font-bold text-emerald-800">All Items In Stock</p>
                                                        <p className="text-[10px] text-emerald-600 font-bold">No menu items are currently below stock limits.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                analytics.lowStockAlerts.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between p-3 border border-rose-100 bg-rose-50/50 rounded-xl">
                                                        <span className="text-sm font-black text-gray-900">{item.name}</span>
                                                        <span className="text-xs font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full shrink-0">
                                                            {item.stockQuantity <= 0 ? "OUT OF STOCK" : `${item.stockQuantity} Left`}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Booking Statistics */}
                                <div className="rounded-2xl border border-orange-100/80 bg-white p-6 shadow-sm space-y-4">
                                    <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-50 pb-2">Booking Lifecycle Statistics</h3>
                                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
                                        <div className="p-3 border border-orange-100/30 bg-orange-50/20 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Placed</p>
                                            <p className="mt-1 text-2xl font-black text-orange-600">{analytics.bookingStatistics.PLACED}</p>
                                        </div>
                                        <div className="p-3 border border-sky-100/30 bg-sky-50/20 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Accepted</p>
                                            <p className="mt-1 text-2xl font-black text-sky-600">{analytics.bookingStatistics.ACCEPTED}</p>
                                        </div>
                                        <div className="p-3 border border-cyan-100/30 bg-cyan-50/20 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ready</p>
                                            <p className="mt-1 text-2xl font-black text-cyan-600">{analytics.bookingStatistics.READY}</p>
                                        </div>
                                        <div className="p-3 border border-emerald-100/30 bg-emerald-50/20 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</p>
                                            <p className="mt-1 text-2xl font-black text-emerald-600">{analytics.bookingStatistics.COMPLETED}</p>
                                        </div>
                                        <div className="p-3 border border-rose-100/30 bg-rose-50/20 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rejected</p>
                                            <p className="mt-1 text-2xl font-black text-rose-600">{analytics.bookingStatistics.REJECTED}</p>
                                        </div>
                                        <div className="p-3 border border-amber-100/30 bg-amber-50/20 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cancel Req</p>
                                            <p className="mt-1 text-2xl font-black text-amber-600">{analytics.bookingStatistics.CANCEL_REQUESTED}</p>
                                        </div>
                                        <div className="p-3 border border-slate-100/30 bg-slate-50/20 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cancelled</p>
                                            <p className="mt-1 text-2xl font-black text-slate-600">{analytics.bookingStatistics.CANCELLED}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === "settings" && selectedStore && (
                    <div className="max-w-2xl space-y-5">

                        {/* Kitchen Identity */}
                        <div className="rounded-2xl border border-orange-100/80 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                <div className="h-8 w-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                    <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Kitchen Identity</h3>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5">Shown to students on the campus kitchen catalog</p>
                                </div>
                            </div>

                            <form onSubmit={handleSaveSettings} className="space-y-4">
                                <div>
                                    <label htmlFor="settingsName" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Store Name
                                    </label>
                                    <input
                                        type="text"
                                        id="settingsName"
                                        value={settingsName}
                                        onChange={(e) => setSettingsName(e.target.value)}
                                        placeholder="e.g. Maggi Point"
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-orange-400 focus:bg-white focus:ring-1 focus:ring-orange-100 transition"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="settingsTagline" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Tagline
                                    </label>
                                    <input
                                        type="text"
                                        id="settingsTagline"
                                        value={settingsTagline}
                                        onChange={(e) => setSettingsTagline(e.target.value)}
                                        placeholder="e.g. Late night cravings sorted."
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-orange-400 focus:bg-white focus:ring-1 focus:ring-orange-100 transition"
                                    />
                                </div>

                                {/* Live Preview */}
                                <div className="rounded-xl border border-gray-150 bg-gray-50/60 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2.5">Student Preview</p>
                                    <div className="bg-white rounded-xl border border-orange-100/60 p-3.5 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-extrabold text-sm text-gray-950 truncate">
                                                    {settingsName.trim() || selectedStore.name}
                                                </p>
                                                <p className="text-xs text-gray-400 font-medium mt-0.5 line-clamp-1">
                                                    {settingsTagline.trim() || "No tagline yet"}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full uppercase tracking-wide shrink-0">
                                                {selectedStore.hostel}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <button
                                        type="submit"
                                        disabled={updatingSettings}
                                        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 shadow-md shadow-orange-200/60 transition active:scale-95"
                                    >
                                        {updatingSettings ? (
                                            <>
                                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Saving...
                                            </>
                                        ) : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Location — read-only */}
                        <div className="rounded-2xl border border-orange-100/80 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                <div className="h-8 w-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                    <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Branch Location</h3>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5">Locked — contact admin to relocate</p>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hostel</p>
                                    <p className="mt-1 text-sm font-extrabold text-gray-900">{selectedStore.hostel}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Room</p>
                                    <p className="mt-1 text-sm font-extrabold text-gray-900">{selectedStore.roomNumber}</p>
                                </div>
                            </div>
                        </div>

                        {/* Grand Opening Announcement */}
                        <div className="rounded-2xl border border-orange-100/80 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                <div className="h-8 w-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                    <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Launch Announcement</h3>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5">One-time campus-wide email blast</p>
                                </div>
                            </div>

                            {selectedStore.announcementSent ? (
                                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                                    <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs font-bold text-emerald-700">Launch email already sent to all campus subscribers.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                        Send a one-time launch notification to all campus students who subscribe to new store alerts. Let them know <span className="font-bold text-gray-800">{selectedStore.name}</span> is open at <span className="font-bold text-gray-800">{selectedStore.hostel}, Room {selectedStore.roomNumber}</span>.
                                    </p>
                                    {!isWithin7Days && (
                                        <div className="flex items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3">
                                            <svg className="h-4 w-4 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-xs font-semibold text-orange-700">Grand opening window has passed (available within 7 days of store creation).</p>
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            disabled={!isWithin7Days}
                                            onClick={() => setAnnounceModalOpen(true)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 shadow-md shadow-orange-200/60 transition active:scale-95"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            Send Launch Email
                                        </button>
                                    </div>
                                </div>
                            )}
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
                isOpen={deleteCampaignModalOpen}
                title="Delete Sale Campaign?"
                message="Are you sure you want to delete this sale campaign? Active coupon codes from this campaign will be deactivated immediately."
                confirmText="Delete Campaign"
                cancelText="Keep Campaign"
                type="danger"
                onConfirm={handleDeleteCampaign}
                onCancel={() => {
                    setDeleteCampaignModalOpen(false);
                    setSelectedCampaignToDelete(null);
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

            <ConfirmationModal
                isOpen={announceModalOpen}
                title="Send Launch Announcement?"
                message={`Are you sure you want to broadcast a Grand Opening email for ${selectedStore?.name || "your store"}? This email will be sent once to all subscribed campus students, and cannot be sent again.`}
                confirmText={sendingAnnouncement ? "Sending..." : "Send Announcement"}
                cancelText="Not Now"
                type="info"
                onConfirm={async () => {
                    setAnnounceModalOpen(false);
                    await handleSendAnnouncement();
                }}
                onCancel={() => {
                    setAnnounceModalOpen(false);
                }}
            />
        </OwnerPanelShell>
    );
}
