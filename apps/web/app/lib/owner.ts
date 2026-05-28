import { apiFetch } from "./api";
import type { BookingStatus, OwnerBooking } from "./bookings";

export type OwnerInventoryItem = {
    id: string;
    storeId: string;
    name: string;
    price: number;
    imageUrl: string;
    stockQuantity: number;
    createdAt?: string;
    updatedAt?: string;
};

export type OwnerInventoryStore = {
    id: string;
    name: string;
    hostel: string;
    roomNumber: string;
    items: OwnerInventoryItem[];
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

export async function fetchOwnerInventory() {
    const response = await apiFetch("/owner/items", {
        includeAuth: true,
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to load inventory"));
    }

    return response.json() as Promise<OwnerInventoryStore[]>;
}

export async function fetchOwnerBookings() {
    const response = await apiFetch("/owner/bookings", {
        includeAuth: true,
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to load owner bookings"));
    }

    return response.json() as Promise<OwnerBooking[]>;
}

export async function updateOwnerItem(
    itemId: string,
    data:
        | Partial<Pick<OwnerInventoryItem, "name" | "price" | "imageUrl" | "stockQuantity">>
        | FormData
) {
    const response = await apiFetch(`/owner/items/${itemId}`, {
        method: "PUT",
        includeAuth: true,
        body: data,
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to update item"));
    }

    return response.json() as Promise<OwnerInventoryItem>;
}

export async function createOwnerItem(formData: FormData) {
    const response = await apiFetch("/owner/items", {
        method: "POST",
        includeAuth: true,
        body: formData,
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to create item"));
    }

    return response.json() as Promise<OwnerInventoryItem>;
}

export async function deleteOwnerItem(itemId: string) {
    const response = await apiFetch(`/owner/items/${itemId}`, {
        method: "DELETE",
        includeAuth: true,
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to delete item"));
    }

    return response.json() as Promise<{ message: string }>;
}

export async function updateOwnerBookingStatus(
    bookingId: string,
    status: BookingStatus
) {
    const response = await apiFetch(`/owner/bookings/${bookingId}/status`, {
        method: "POST",
        includeAuth: true,
        body: { status },
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to update booking status"));
    }

    return response.json() as Promise<{ message: string; booking: OwnerBooking }>;
}

export async function respondToBookingCancellation(
    bookingId: string,
    action: "approve" | "reject"
) {
    const response = await apiFetch(`/owner/bookings/${bookingId}/cancel-respond`, {
        method: "POST",
        includeAuth: true,
        body: { action },
    });

    if (!response.ok) {
        throw new Error(await parseError(response, `Failed to ${action} cancellation request`));
    }

    return response.json() as Promise<{ message: string; booking: OwnerBooking }>;
}
