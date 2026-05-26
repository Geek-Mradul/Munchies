export function getToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem("munchies_token");
}