export type UserAddressDto = {
    id: string;
    label?: string | null;
    addressLine: string;
    isLastUsed: boolean;
    createdAtUtc: string;
};

export type UserProfileDto = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAtUtc: string;
    updatedAtUtc?: string | null;
    lastUsedAddressId?: string | null;
    addresses: UserAddressDto[];
};

export type ProfileResponse = {
    success: boolean;
    message?: string;
    profile?: UserProfileDto;
    address?: UserAddressDto;
    errors?: string[];
};

export type UpdateProfileRequest = {
    userId: string;
    name: string;
    email: string;
    phone: string;
};

export type SaveUserAddressRequest = {
    userId: string;
    label?: string;
    addressLine: string;
};

export type UpdateUserAddressRequest = {
    userId: string;
    addressId: string;
    label?: string;
    addressLine: string;
};

export type DeleteUserAddressRequest = {
    userId: string;
    addressId: string;
};

export function buildOrderAddressFields(
    selection: string,
    customAddress: string,
): { addressId?: string; address?: string } | null {
    if (selection && selection !== "new") {
        return { addressId: selection };
    }

    const trimmed = customAddress.trim();
    if (!trimmed) {
        return null;
    }

    return { address: trimmed };
}

export async function fetchProfile(userId: string): Promise<ProfileResponse> {
    const response = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`);
    const data = (await response.json()) as ProfileResponse;

    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося завантажити профіль."] };
    }

    return data;
}

export async function updateProfile(payload: UpdateProfileRequest): Promise<ProfileResponse> {
    const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ProfileResponse;

    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося оновити профіль."] };
    }

    return data;
}

export async function addProfileAddress(payload: SaveUserAddressRequest): Promise<ProfileResponse> {
    const response = await fetch("/api/profile/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ProfileResponse;

    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося додати адресу."] };
    }

    return data;
}

export async function updateProfileAddress(payload: UpdateUserAddressRequest): Promise<ProfileResponse> {
    const response = await fetch("/api/profile/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ProfileResponse;

    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося оновити адресу."] };
    }

    return data;
}

export async function deleteProfileAddress(payload: DeleteUserAddressRequest): Promise<ProfileResponse> {
    const response = await fetch("/api/profile/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ProfileResponse;

    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося видалити адресу."] };
    }

    return data;
}
