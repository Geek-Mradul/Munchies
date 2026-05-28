"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./Toast";
import ConfirmationModal from "./ConfirmationModal";

type Store = {
    id: string;
    name: string;
    hostel: string;
    roomNumber: string;
};

type StoreBlock = {
    id: string;
    userId: string;
    storeId: string;
    store: {
        id: string;
        name: string;
    };
};

type ManagedUser = {
    id: string;
    firstName: string;
    email: string;
    role: "USER" | "STORE_OWNER" | "ADMIN";
    warningsCount: number;
    isBlocked: boolean;
    storeBlocks: StoreBlock[];
};

export default function AdminUsersManagementClient() {
    const toast = useToast();
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal state for store block management
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [updatingBlockId, setUpdatingBlockId] = useState<string | null>(null);

    // Modal state for confirmation
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        theme: "warning" | "danger" | "info";
        actionText: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        theme: "warning",
        actionText: "",
        onConfirm: () => {},
    });

    async function loadData() {
        setLoading(true);
        try {
            const [usersRes, storesRes] = await Promise.all([
                apiFetch("/admin/users", { includeAuth: true }),
                apiFetch("/admin/stores", { includeAuth: true }),
            ]);

            if (usersRes.ok && storesRes.ok) {
                const usersData = await usersRes.json();
                const storesData = await storesRes.json();
                setUsers(usersData);
                setStores(storesData);
            } else {
                toast.error("Failed to load user management records");
            }
        } catch (error) {
            console.error(error);
            toast.error("Network error while loading administrative data");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    // Toggle global block
    async function toggleGlobalBlock(user: ManagedUser) {
        const nextState = !user.isBlocked;
        
        setConfirmModal({
            isOpen: true,
            title: nextState ? "Block User Globally" : "Unblock User Globally",
            message: nextState 
                ? `Are you sure you want to globally block ${user.firstName} (${user.email})? They will be unable to place any new bookings on the platform.`
                : `Are you sure you want to globally unblock ${user.firstName} (${user.email})?`,
            theme: nextState ? "danger" : "warning",
            actionText: nextState ? "Globally Block" : "Restore Access",
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const res = await apiFetch(`/admin/users/${user.id}/block`, {
                        method: "POST",
                        body: { isBlocked: nextState },
                        includeAuth: true,
                    });

                    if (res.ok) {
                        toast.success(
                            nextState 
                                ? `Globally blocked ${user.firstName}` 
                                : `Globally unblocked ${user.firstName}`
                        );
                        loadData();
                    } else {
                        const err = await res.json();
                        toast.error(err.error || "Failed to update global block status");
                    }
                } catch {
                    toast.error("Connection failed while updating block status");
                }
            }
        });
    }

    // Toggle store specific block
    async function handleStoreBlock(userId: string, storeId: string, blockStatus: boolean) {
        setUpdatingBlockId(storeId);
        try {
            const res = await apiFetch(`/admin/users/${userId}/store-block`, {
                method: "POST",
                body: { storeId, isBlocked: blockStatus },
                includeAuth: true,
            });

            if (res.ok) {
                toast.success(
                    blockStatus
                        ? "Restricted store-specific checkout access"
                        : "Restored store-specific checkout access"
                );
                
                // Reload data and update selected user state for the modal
                const updatedUsersRes = await apiFetch("/admin/users", { includeAuth: true });
                if (updatedUsersRes.ok) {
                    const usersData = await updatedUsersRes.json();
                    setUsers(usersData);
                    
                    const u = usersData.find((user: ManagedUser) => user.id === userId);
                    if (u) {
                        setSelectedUser(u);
                    }
                }
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update store block status");
            }
        } catch {
            toast.error("Connection failed while updating store restrictions");
        } finally {
            setUpdatingBlockId(null);
        }
    }

    const filteredUsers = users.filter((u) => {
        const query = searchTerm.toLowerCase();
        return (
            u.firstName.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query) ||
            u.role.toLowerCase().includes(query)
        );
    });

    const totalUsers = users.length;
    const blockedUsers = users.filter((u) => u.isBlocked).length;

    return (
        <div className="space-y-6">
            {/* Visual SaaS metrics overview - cleanly aligned & identical heights */}
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-150 bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[110px]">
                    <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Total Users</p>
                    <p className="text-3xl lg:text-4xl font-black text-gray-950">{totalUsers}</p>
                </div>
                <div className="rounded-2xl border border-gray-150 bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[110px]">
                    <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Blocked Accounts</p>
                    <p className="text-3xl lg:text-4xl font-black text-red-600">{blockedUsers}</p>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/20 p-5 shadow-[0_12px_32px_rgba(249,115,22,0.02)] flex flex-col justify-center h-[110px]">
                    <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Quick Guide</p>
                    <p className="mt-1 text-xs lg:text-sm font-bold leading-normal text-gray-600">
                        Manage warnings and blocks to enforce platform policies.
                    </p>
                </div>
            </div>

            {/* Search and Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search users by name, email, or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none transition focus:border-orange-400 font-semibold placeholder-gray-400 text-sm shadow-sm"
                    />
                </div>

                <button
                    onClick={loadData}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-orange-50/15 text-gray-700 px-4 py-2 text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                >
                    <svg className={`h-4 w-4 ${loading ? "animate-spin text-orange-600" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span>Refresh</span>
                </button>
            </div>

            {/* Main Users Table Grid */}
            {loading && users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-250 bg-white text-center px-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                    <p className="mt-4 text-sm font-semibold text-gray-500">Querying registered user profiles...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-250 bg-white p-12 text-center max-w-xl mx-auto py-16">
                    <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-xl text-gray-400 font-bold border border-gray-100">
                        ✕
                    </div>
                    <h3 className="text-lg font-black text-gray-950">No matching user accounts found</h3>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">Try adjusting your filters or search terms</p>
                </div>
            ) : (
                <>
                    {/* MOBILE COMPACT CARDS VIEW */}
                    <div className="block md:hidden space-y-4">
                        {filteredUsers.map((user) => (
                            <div key={user.id} className="rounded-2xl border border-gray-150 bg-white p-5 shadow-sm space-y-4">
                                {/* Header Details */}
                                <div className="flex justify-between items-start gap-2.5">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 text-sm lg:text-base">{user.firstName}</span>
                                        <span className="text-xs font-semibold text-gray-400 mt-0.5">{user.email}</span>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                                        user.role === "STORE_OWNER"
                                            ? "bg-purple-50 text-purple-700 border-purple-100"
                                            : "bg-orange-50 text-orange-700 border-orange-100"
                                    }`}>
                                        {user.role}
                                    </span>
                                </div>

                                {/* Middle Stats & Access Row */}
                                <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-50 text-xs font-semibold">
                                    {/* Warnings */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Policy Warnings</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`h-2 w-2 rounded-full ${
                                                user.warningsCount >= 3 
                                                    ? "bg-red-500 animate-pulse" 
                                                    : user.warningsCount > 0 
                                                    ? "bg-amber-500" 
                                                    : "bg-emerald-500"
                                            }`} />
                                            <span className="font-bold text-gray-700">{user.warningsCount} warning{user.warningsCount !== 1 ? "s" : ""}</span>
                                        </div>
                                    </div>
                                    {/* Checkout Status */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Checkout Status</span>
                                        <div>
                                            {user.isBlocked ? (
                                                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
                                                    Blocked Globally
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    Active Access
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Store blocks */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Store blocks</span>
                                    {user.storeBlocks.length === 0 ? (
                                        <span className="text-gray-400 text-xs font-semibold">None (Full Access)</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-1">
                                            {user.storeBlocks.map((block) => (
                                                <span key={block.id} className="inline-block bg-orange-50 border border-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded font-bold">
                                                    {block.store.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 justify-end pt-1">
                                    <button
                                        onClick={() => setSelectedUser(user)}
                                        className="flex-1 rounded-xl bg-gray-50 border border-gray-200 py-2.5 text-xs font-bold text-gray-700 text-center active:scale-95 transition shadow-sm hover:bg-orange-50/15"
                                    >
                                        Store restrictions
                                    </button>
                                    <button
                                        onClick={() => toggleGlobalBlock(user)}
                                        className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-center active:scale-95 transition shadow-sm border ${
                                            user.isBlocked
                                                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                                                : "bg-gray-50 border-gray-200 text-red-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                        }`}
                                    >
                                        {user.isBlocked ? "Unblock Global" : "Block Global"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* DESKTOP HIGH-DENSITY DATA TABLE */}
                    <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80">
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">User Details</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Role</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Policy Warnings</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Checkout Status</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Store blocks</th>
                                        <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-orange-50/15 transition duration-150">
                                            <td className="px-6 py-4.5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 text-sm lg:text-base">{user.firstName}</span>
                                                    <span className="text-xs font-semibold text-gray-400 mt-0.5">{user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                                    user.role === "STORE_OWNER"
                                                        ? "bg-purple-50 text-purple-700 border border-purple-100"
                                                        : "bg-orange-50 text-orange-700 border border-orange-100"
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2.5 w-2.5 rounded-full ${
                                                        user.warningsCount >= 3 
                                                            ? "bg-red-500 animate-pulse" 
                                                            : user.warningsCount > 0 
                                                            ? "bg-amber-500" 
                                                            : "bg-emerald-500"
                                                    }`} />
                                                    <span className="font-bold text-sm text-gray-700">
                                                        {user.warningsCount} warning{user.warningsCount !== 1 ? "s" : ""}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                {user.isBlocked ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                                                        Blocked Globally
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        Active Access
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="max-w-[200px] truncate">
                                                    {user.storeBlocks.length === 0 ? (
                                                        <span className="text-gray-400 text-xs font-semibold">None</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.storeBlocks.map((block) => (
                                                                <span key={block.id} className="inline-block bg-orange-50 border border-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded font-bold">
                                                                    {block.store.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5 text-right">
                                                <div className="flex items-center justify-end gap-2.5">
                                                    {/* Manage store blocks */}
                                                    <button
                                                        onClick={() => setSelectedUser(user)}
                                                        className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-orange-50/15 transition active:scale-95 shadow-sm"
                                                    >
                                                        Store restrictions
                                                    </button>

                                                    {/* Global block status action button */}
                                                    <button
                                                        onClick={() => toggleGlobalBlock(user)}
                                                        className={`rounded-xl px-4 py-2 text-xs font-bold border transition active:scale-95 shadow-sm ${
                                                            user.isBlocked
                                                                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                                                                : "bg-gray-50 border-gray-200 text-red-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                                        }`}
                                                    >
                                                        {user.isBlocked ? "Unblock Global" : "Block Global"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Custom Modal for managing store specific blocks */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
                    
                    <div className="relative w-full max-w-lg rounded-3xl bg-white border border-orange-100/80 p-6 shadow-2xl animate-scale-up z-10 text-gray-900">
                        <div className="flex items-center justify-between border-b border-orange-50 pb-4 mb-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-950">Store Restrictions</h3>
                                <p className="text-xs font-semibold text-gray-400 mt-0.5">Manage blockades for {selectedUser.firstName}</p>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-1.5 rounded-full hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Add store block controller */}
                        <div className="bg-orange-50/40 border border-orange-100/50 rounded-2xl p-4 mb-5">
                            <h4 className="text-xs font-black uppercase tracking-wider text-orange-800">Add Store Block</h4>
                            <div className="mt-3 flex items-center gap-3">
                                <select
                                    value={selectedStoreId}
                                    onChange={(e) => setSelectedStoreId(e.target.value)}
                                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none transition focus:border-orange-400 text-sm font-semibold"
                                >
                                    <option value="">Select store to block...</option>
                                    {stores
                                        // Filter out stores where the user is already blocked
                                        .filter((s) => !selectedUser.storeBlocks.some((b) => b.storeId === s.id))
                                        .map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.hostel})
                                            </option>
                                        ))
                                    }
                                </select>

                                <button
                                    onClick={() => {
                                        if (!selectedStoreId) return;
                                        handleStoreBlock(selectedUser.id, selectedStoreId, true);
                                        setSelectedStoreId("");
                                    }}
                                    disabled={!selectedStoreId || updatingBlockId !== null}
                                    className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add Block
                                </button>
                            </div>
                        </div>

                        {/* Active store blocks list */}
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">Active Store Blockades</h4>
                            {selectedUser.storeBlocks.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50 text-xs font-semibold text-gray-400">
                                    This user has no active store restrictions.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                    {selectedUser.storeBlocks.map((block) => (
                                        <div key={block.id} className="flex items-center justify-between border border-orange-100 bg-white p-3 rounded-xl shadow-sm">
                                            <span className="font-bold text-sm text-gray-950">{block.store.name}</span>
                                            <button
                                                onClick={() => handleStoreBlock(selectedUser.id, block.storeId, false)}
                                                disabled={updatingBlockId === block.storeId}
                                                className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 border border-red-100/50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                                            >
                                                {updatingBlockId === block.storeId ? "Lifting..." : "Lift block"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.theme}
                confirmText={confirmModal.actionText}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
