import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
    || (Platform.OS === "android" ? "http://10.0.2.2:3000/api" : "http://localhost:3000/api");

async function request(endpoint, { token, ...options } = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    if (response.status === 204) {
        if (!response.ok) {
            throw new Error("La solicitud no se pudo completar.");
        }
        return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        throw new Error(typeof data === "string" ? data : data?.error || "Error de la API");
    }

    return data;
}

export function login(credentials) {
    return request("/login", {
        method: "POST",
        body: JSON.stringify(credentials),
    });
}

export function logout(token) {
    return request("/logout", {
        method: "POST",
        token,
    });
}

export function getPhotos() {
    return request("/photos");
}

export function createPhoto(token, photo) {
    return request("/photos", {
        method: "POST",
        token,
        body: JSON.stringify(photo),
    });
}
