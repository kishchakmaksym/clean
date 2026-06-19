export type ServiceSettlementId = "uzhhorod" | "minai" | "storozhnytsia";

export type ServiceSettlement = {
    id: ServiceSettlementId;
    label: string;
    shortName: string;
};

export const SERVICE_SETTLEMENTS: readonly ServiceSettlement[] = [
    { id: "uzhhorod", label: "м. Ужгород", shortName: "Ужгород" },
    { id: "minai", label: "с. Минай", shortName: "Минай" },
    { id: "storozhnytsia", label: "с. Сторожниця", shortName: "Сторожниця" },
] as const;

const SETTLEMENT_BY_ID = new Map(SERVICE_SETTLEMENTS.map((item) => [item.id, item]));

export function getSettlementById(id: ServiceSettlementId): ServiceSettlement {
    return SETTLEMENT_BY_ID.get(id)!;
}

export function detectSettlementId(addressLine: string): ServiceSettlementId | null {
    const lower = addressLine.toLowerCase();

    if (lower.includes("ужгород")) {
        return "uzhhorod";
    }

    if (lower.includes("минай")) {
        return "minai";
    }

    if (lower.includes("сторожниця")) {
        return "storozhnytsia";
    }

    return null;
}

export function normalizeStreetKey(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}
