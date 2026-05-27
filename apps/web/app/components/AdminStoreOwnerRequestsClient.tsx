"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    fetchStoreOwnerRequests,
    approveStoreOwnerRequest,
    rejectStoreOwnerRequest,
    type StoreOwnerRequestRecord,
} from "../lib/storeOwnerRequests";
import { getToken } from "../lib/auth";
import { useToast } from "./Toast";

type StoredUser = {
    role: string;
};

type LoadingState = "loading" | "ready" | "error";

function getStoredUser() {
    if (typeof window === "undefined") {
        return null;
    }

    const userRaw = localStorage.getItem("munchies_user");

    if (!userRaw) {
        return null;
    }

    try {
        return JSON.parse(userRaw) as StoredUser;
    } catch {
        return null;
    }
}

export default function AdminStoreOwnerRequestsClient() {
    const router = useRouter();
    const toast = useToast();
    const [state, setState] = useState<LoadingState>("loading");
    const [error, setError] = useState("");
    const [requests, setRequests] = useState<StoreOwnerRequestRecord[]>([]);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");

    async function loadRequests() {
        try {
            const data = await fetchStoreOwnerRequests();
            setRequests(data);
            setState("ready");
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Failed to load requests"
            );
            setState("error");
        }
    }

    useEffect(() => {
        const token = getToken();
        const user = getStoredUser();

        if (!token) {
            toast.info("Sign in again to continue.");
            router.replace("/");
            return;
        }

        if (user?.role !== "ADMIN") {
            toast.warning("You are not allowed to view the admin panel.");
            router.replace("/");
            return;
        }

        void (async () => {
            await loadRequests();
        })();
    }, [router, toast]);

    const pendingRequests = useMemo(
        () => requests.filter((request) => request.status === "PENDING"),
        [requests]
    );

    const approvedRequests = useMemo(
        () => requests.filter((request) => request.status === "APPROVED"),
        [requests]
    );

    const rejectedRequests = useMemo(
        () => requests.filter((request) => request.status === "REJECTED"),
        [requests]
    );

    const currentRequestsList = useMemo(() => {
        if (activeTab === "approved") {
            return approvedRequests;
        }
        if (activeTab === "rejected") {
            return rejectedRequests;
        }
        return pendingRequests;
    }, [activeTab, pendingRequests, approvedRequests, rejectedRequests]);

    async function handleApprove(requestId: string) {
        try {
            setProcessingRequestId(requestId);
            await approveStoreOwnerRequest(requestId);
            toast.success("Store application approved successfully");
            await loadRequests();
        } catch (actionError) {
            toast.error(
                actionError instanceof Error
                    ? actionError.message
                    : "Failed to approve request"
            );
        } finally {
            setProcessingRequestId(null);
        }
    }

    async function handleReject(requestId: string) {
        try {
            setProcessingRequestId(requestId);
            await rejectStoreOwnerRequest(requestId);
            toast.success("Store application rejected");
            await loadRequests();
        } catch (actionError) {
            toast.error(
                actionError instanceof Error
                    ? actionError.message
                    : "Failed to reject request"
            );
        } finally {
            setProcessingRequestId(null);
        }
    }

    if (state === "loading") {
        return (
            <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.04)]">
                <div className="h-5 w-48 animate-pulse rounded-full bg-orange-100" />
                <div className="mt-4 h-24 animate-pulse rounded-[1.5rem] bg-gradient-to-r from-orange-50 via-amber-50 to-rose-50" />
            </section>
        );
    }

    if (state === "error") {
        return (
            <section className="rounded-[2rem] border border-red-100 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.04)]">
                <p className="text-sm lg:text-base font-bold text-red-700">{error}</p>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            {/* Visual SaaS metrics overview - cleanly aligned & identical heights */}
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-150 bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[110px]">
                    <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Total Pending</p>
                    <p className="text-3xl lg:text-4xl font-black text-gray-950">{pendingRequests.length}</p>
                </div>
                <div className="rounded-2xl border border-gray-150 bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[110px]">
                    <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Total Approved</p>
                    <p className="text-3xl lg:text-4xl font-black text-emerald-600">{approvedRequests.length}</p>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/20 p-5 shadow-[0_12px_32px_rgba(249,115,22,0.02)] flex flex-col justify-center h-[110px]">
                    <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Quick Guide</p>
                    <p className="mt-1 text-xs lg:text-sm font-bold leading-normal text-gray-600">
                        Verify and approve store applications.
                    </p>
                </div>
            </div>

            {/* Segmented Control Pill Switcher */}
            <div className="flex flex-wrap gap-2 bg-orange-50/30 p-1.5 rounded-2xl border border-orange-100/50 self-start shrink-0">
                <button
                    type="button"
                    onClick={() => setActiveTab("pending")}
                    className={`px-4.5 py-2 text-xs lg:text-sm font-black rounded-xl transition duration-150 ${activeTab === "pending"
                        ? "bg-white text-orange-600 shadow-sm border border-orange-100/30"
                        : "text-gray-400 hover:text-gray-700"
                        }`}
                >
                    Pending Verification ({pendingRequests.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("approved")}
                    className={`px-4.5 py-2 text-xs lg:text-sm font-black rounded-xl transition duration-150 ${activeTab === "approved"
                        ? "bg-white text-orange-600 shadow-sm border border-orange-100/30"
                        : "text-gray-400 hover:text-gray-700"
                        }`}
                >
                    Approved Sellers ({approvedRequests.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("rejected")}
                    className={`px-4.5 py-2 text-xs lg:text-sm font-black rounded-xl transition duration-150 ${activeTab === "rejected"
                        ? "bg-white text-orange-600 shadow-sm border border-orange-100/30"
                        : "text-gray-400 hover:text-gray-700"
                        }`}
                >
                    Rejected ({rejectedRequests.length})
                </button>
            </div>

            {/* ADAPTIVE LIST VIEWS */}

            {currentRequestsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-250 bg-white p-12 text-center max-w-xl mx-auto py-16">
                    <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-xl text-gray-400 font-bold border border-gray-100">
                        ✓
                    </div>
                    <h3 className="text-lg font-black text-gray-950">
                        {activeTab === "pending"
                            ? "No Pending Applications"
                            : activeTab === "approved"
                                ? "No Approved Sellers"
                                : "No Rejected Applications"}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">
                        {activeTab === "pending"
                            ? "Incoming applications from store owners will appear here for review."
                            : activeTab === "approved"
                                ? "Verified merchant applications will be listed in this tab."
                                : "Rejected requests will be archived in this section for history."}
                    </p>
                </div>
            ) : (
                <>
                    {/* MOBILE COMPACT CARDS VIEW */}
                    <div className="block md:hidden space-y-4">
                        {currentRequestsList.map((request) => {
                            const isBusy = processingRequestId === request.id;
                            return (
                                <div key={request.id} className="rounded-2xl border border-gray-150 bg-white p-5 shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${request.status === "PENDING"
                                                ? "bg-orange-50 text-orange-700 border-orange-100"
                                                : request.status === "APPROVED"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    : "bg-rose-50 text-rose-700 border-rose-100"
                                                }`}>
                                                {request.status}
                                            </span>
                                            <h4 className="mt-2 font-black text-gray-900 text-base">{request.user.firstName || "Applicant"}</h4>
                                            <p className="text-xs text-gray-500 font-medium">{request.user.email}</p>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold">ID: {request.id.slice(0, 8)}...</span>
                                    </div>

                                    <div className="text-xs font-bold text-gray-500 border-t border-gray-50 pt-2.5">
                                        Submitted: {new Date(request.createdAt).toLocaleDateString()}
                                    </div>

                                    {request.status === "PENDING" && (
                                        <div className="flex gap-2 justify-end border-t border-gray-50 pt-2.5">
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleReject(request.id)}
                                                className="flex-1 rounded-xl bg-gray-50 border border-gray-200 py-2.5 text-xs font-bold text-gray-600 text-center active:scale-95 transition shadow-sm hover:bg-rose-50 hover:text-rose-700"
                                            >
                                                {isBusy && processingRequestId === request.id ? "..." : "Reject"}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleApprove(request.id)}
                                                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white text-center active:scale-95 transition shadow-sm hover:bg-emerald-700"
                                            >
                                                {isBusy && processingRequestId === request.id ? "Processing" : "Approve"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* DESKTOP HIGH-DENSITY DATA TABLE */}
                    <div className="hidden md:block rounded-2xl border border-gray-150 bg-white shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/80">
                                    <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Merchant Name</th>
                                    <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Email Address</th>
                                    <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400">Submission Date</th>
                                    <th className="px-6 py-4 font-bold text-xs lg:text-sm uppercase tracking-wider text-gray-400 text-right">Status / Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {currentRequestsList.map((request) => {
                                    const isBusy = processingRequestId === request.id;
                                    return (
                                        <tr key={request.id} className="hover:bg-orange-50/15 transition duration-150">
                                            <td className="px-6 py-4.5">
                                                <p className="font-bold text-gray-900 text-sm lg:text-base">{request.user.firstName || "Applicant"}</p>
                                            </td>
                                            <td className="px-6 py-4.5 text-gray-700 font-semibold text-sm lg:text-base">{request.user.email}</td>
                                            <td className="px-6 py-4.5 text-gray-500 font-bold text-sm lg:text-base">{new Date(request.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4.5 text-right">
                                                {request.status === "PENDING" ? (
                                                    <div className="flex justify-end gap-2.5">
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => handleReject(request.id)}
                                                            className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-rose-50 hover:text-rose-700 transition active:scale-95 shadow-sm"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => handleApprove(request.id)}
                                                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition active:scale-95 shadow-sm"
                                                        >
                                                            Approve
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border ${request.status === "APPROVED"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                                        }`}>
                                                        <span className={`h-2 w-2 rounded-full ${request.status === "APPROVED" ? "bg-emerald-500" : "bg-rose-500"
                                                            }`} />
                                                        {request.status === "APPROVED" ? "Approved" : "Rejected"}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}
