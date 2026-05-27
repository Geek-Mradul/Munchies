import { apiFetch } from "./api";

export type BookingStatus = "PLACED" | "ACCEPTED" | "READY" | "REJECTED" | "COMPLETED";

type BookingItem = {
    id: string;
    quantity: number;
    unitPrice: number;
    item: {
        id: string;
        name: string;
    };
};

export type CustomerBooking = {
    id: string;
    orderNumber?: string;
    status: BookingStatus;
    totalAmount: number;
    store: {
        id: string;
        name: string;
        hostel: string;
        roomNumber: string;
    };
    items: BookingItem[];
};

export type OwnerBooking = {
    id: string;
    orderNumber?: string;
    status: BookingStatus;
    totalAmount: number;
    store: {
        id: string;
        name: string;
        hostel: string;
        roomNumber: string;
    };
    user: {
        id: string;
        firstName: string;
        email: string;
    };
    items: BookingItem[];
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

export async function fetchMyBookings() {
    const response = await apiFetch("/bookings", {
        includeAuth: true,
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to load booking history"));
    }

    return response.json() as Promise<CustomerBooking[]>;
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
