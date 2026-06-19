import type { ServiceSettlementId } from "../data/serviceAreaStreets";

export type StreetSearchResponse = {
    success: boolean;
    streets?: string[];
    errors?: string[];
};

export async function searchStreets(
    settlementId: ServiceSettlementId,
    query: string,
): Promise<string[]> {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
        return [];
    }

    const params = new URLSearchParams({
        settlement: settlementId,
        q: trimmed,
    });

    let response: Response;
    try {
        response = await fetch(`/api/streets/search?${params.toString()}`);
    } catch {
        throw new Error("Не вдалося з'єднатися з сервером пошуку вулиць.");
    }

    if (response.status === 404) {
        throw new Error("Сервер не має пошуку вулиць. Перезапустіть backend.");
    }

    const data = (await response.json()) as StreetSearchResponse;

    if (!response.ok || !data.success) {
        throw new Error(data.errors?.[0] ?? "Помилка пошуку вулиць.");
    }

    return data.streets ?? [];
}
