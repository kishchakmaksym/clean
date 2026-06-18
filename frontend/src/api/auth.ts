import type { AuthResponse, LoginRequest, RegisterRequest, UserDto } from "./types";

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
    const data = (await response.json()) as AuthResponse;

    if (!response.ok && data.success !== false) {
        return {
            success: false,
            errors: ["Не вдалося виконати запит. Спробуйте пізніше."],
        };
    }

    return data;
}

export async function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    return parseAuthResponse(response);
}

export async function loginUser(payload: LoginRequest): Promise<AuthResponse> {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    return parseAuthResponse(response);
}

export const AUTH_USER_STORAGE_KEY = "cleanpro_user";

export function saveAuthUser(user: AuthResponse["user"]) {
    if (!user) return;
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export function getAuthUser() {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Partial<UserDto>;
        return {
            id: parsed.id ?? "",
            name: parsed.name ?? "",
            email: parsed.email ?? "",
            phone: parsed.phone ?? "",
            role: parsed.role ?? "User",
        };
    } catch {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        return null;
    }
}

export function clearAuthUser() {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}
