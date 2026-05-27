const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiFetchOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: HeadersInit;
    body?: unknown;
    includeAuth?: boolean;
    cache?: RequestCache;
};

export function getApiBaseUrl() {
    return API_BASE_URL;
}

export function getAuthToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem("munchies_token");
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
    const {
        method = "GET",
        headers,
        body,
        includeAuth = false,
        cache,
    } = options;

    const finalHeaders = new Headers(headers);

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

    if (body !== undefined && !isFormData && !finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
    }

    if (includeAuth) {
        const token = getAuthToken();

        if (token) {
            finalHeaders.set("Authorization", `Bearer ${token}`);
        }
    }

    return fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
        cache,
    });
}

export async function apiFetchJson<T>(
    path: string,
    options: ApiFetchOptions = {}
): Promise<T> {
    const response = await apiFetch(path, options);

    if (!response.ok) {
        throw new Error(`Request failed for ${path}`);
    }

    return response.json() as Promise<T>;
}
