import { apiFetch, apiFetchJson } from "./api";

export type Store = {
    id: string;
    name: string;
    hostel: string;
    room: string;
    tagline: string;
};

export type StoreItem = {
    id: string;
    storeId: string;
    name: string;
    price: number;
};

export type AddableItem = Pick<StoreItem, "id" | "name" | "price">;

export type CartItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
};

async function requestJson<T>(path: string): Promise<T> {
    return apiFetchJson<T>(path, {
        cache: "no-store",
    });
}

async function requestJsonOrNull<T>(path: string): Promise<T | null> {
    const response = await apiFetch(path, {
        cache: "no-store",
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Request failed for ${path}`);
    }

    return response.json() as Promise<T>;
}

export function getStores() {
    return requestJson<Store[]>("/stores");
}

export function getStore(id: string) {
    return requestJsonOrNull<Store>(`/stores/${id}`);
}

export function getStoreItems(id: string) {
    return requestJson<StoreItem[]>(`/stores/${id}/items`);
}