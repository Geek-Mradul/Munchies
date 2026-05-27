import { getAuthToken } from "./api";

export type AuthRole = "USER" | "STORE_OWNER" | "ADMIN";

export function getToken() {
    return getAuthToken();
}

export function getDashboardPathForRole(role: AuthRole) {
    if (role === "STORE_OWNER") {
        return "/owner";
    }

    if (role === "ADMIN") {
        return "/admin";
    }

    return "/";
}