import { apiFetch } from "./api";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type StoreOwnerRequestRecord = {
    id: string;
    userId: string;
    status: RequestStatus;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        firstName: string;
        email: string;
        role: string;
    };
};

async function parseError(response: Response, fallback: string) {
    try {
        const data = (await response.json()) as {
            error?: string;
            message?: string;
        };

        return data.error || data.message || fallback;
    } catch {
        return fallback;
    }
}

export async function submitStoreOwnerRequest() {
    const response = await apiFetch("/store-owner-request", {
        method: "POST",
        includeAuth: true,
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to submit request"));
    }

    return response.json() as Promise<{
        message: string;
    }>;
}

export async function fetchStoreOwnerRequests() {
    const response = await apiFetch("/admin/store-owner-requests", {
        includeAuth: true,
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to load requests"));
    }

    return response.json() as Promise<StoreOwnerRequestRecord[]>;
}

export async function approveStoreOwnerRequest(requestId: string) {
    const response = await apiFetch(`/admin/store-owner-requests/${requestId}/approve`, {
        method: "POST",
        includeAuth: true,
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to approve request"));
    }

    return response.json() as Promise<{ message: string }>;
}

export async function rejectStoreOwnerRequest(requestId: string) {
    const response = await apiFetch(`/admin/store-owner-requests/${requestId}/reject`, {
        method: "POST",
        includeAuth: true,
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to reject request"));
    }

    return response.json() as Promise<{ message: string }>;
}
