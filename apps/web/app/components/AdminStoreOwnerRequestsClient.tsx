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
    const [state, setState] = useState<LoadingState>("loading");
    const [error, setError] = useState("");
    const [requests, setRequests] = useState<StoreOwnerRequestRecord[]>([]);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

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
            router.push("/login");
            return;
        }

        if (user?.role !== "ADMIN") {
            setError("Only admins can access this page");
            setState("error");
            return;
        }

        loadRequests();
    }, [router]);

    const pendingCount = useMemo(
        () => requests.filter((request) => request.status === "PENDING").length,
        [requests]
    );

    async function handleApprove(requestId: string) {
        try {
            setProcessingRequestId(requestId);
            await approveStoreOwnerRequest(requestId);
            await loadRequests();
        } catch (actionError) {
            alert(
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
            await loadRequests();
        } catch (actionError) {
            alert(
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
            <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                <p className="text-sm font-medium text-gray-600">Loading store owner requests...</p>
            </section>
        );
    }

    if (state === "error") {
        return (
            <section className="rounded-[2rem] border border-red-100 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                <p className="text-sm font-semibold text-red-700">{error}</p>
            </section>
        );
    }

    if (requests.length === 0) {
        return (
            <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                <h2 className="mb-2 text-xl font-black text-gray-950">No requests yet</h2>
                <p className="text-sm text-gray-600">New store owner requests will appear here.</p>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 text-sm text-gray-700 shadow-[0_24px_90px_rgba(249,115,22,0.08)]">
                Pending requests: <strong>{pendingCount}</strong>
            </div>

            {requests.map((request) => {
                const isPending = request.status === "PENDING";
                const isBusy = processingRequestId === request.id;

                return (
                    <article
                        key={request.id}
                        className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_rgba(249,115,22,0.08)]"
                    >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-black text-gray-950">
                                    {request.user.firstName || "User"}
                                </h2>
                                <p className="text-sm text-gray-600">{request.user.email}</p>
                                <p className="mt-1 text-xs text-gray-500">Request ID: {request.id}</p>
                            </div>

                            <div className="text-right">
                                <p className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                                    {request.status}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    Requested: {new Date(request.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {isPending && (
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleApprove(request.id)}
                                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    Approve
                                </button>
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleReject(request.id)}
                                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    Reject
                                </button>
                            </div>
                        )}
                    </article>
                );
            })}
        </section>
    );
}
