import {
    detectSettlementId,
    getSettlementById,
    type ServiceSettlementId,
} from "../data/serviceAreaStreets";

export type ParsedServiceAreaAddress = {
    settlementId: ServiceSettlementId | null;
    street: string;
    building: string;
    apartment: string;
};

const BUILDING_PATTERN = /\b(\d+[a-zA-Zа-яА-ЯіїєґІЇЄҐ]?)\b/;
const APARTMENT_PATTERN = /(?:кв\.?|квартира)\s*(\d+[a-zA-Zа-яА-ЯіїєґІЇЄҐ]?)/i;
const STREET_PREFIX_PATTERN = /^(?:вулиця|вул\.)\s+/i;

export function stripStreetPrefix(value: string): string {
    return value.trim().replace(STREET_PREFIX_PATTERN, "").trim();
}

function stripSettlementPrefix(line: string): string {
    return line
        .replace(/^м\.?\s*Ужгород\s*,?\s*/i, "")
        .replace(/^с\.?\s*Минай\s*,?\s*/i, "")
        .replace(/^с\.?\s*Сторожниця\s*,?\s*/i, "")
        .trim();
}

function extractStreetName(withoutApartment: string): string {
    const buildingMatch = withoutApartment.match(BUILDING_PATTERN);
    const streetPart = buildingMatch
        ? withoutApartment.slice(0, buildingMatch.index).trim().replace(/,\s*$/, "")
        : withoutApartment.trim();

    return stripStreetPrefix(streetPart);
}

export function parseServiceAreaAddress(addressLine: string): ParsedServiceAreaAddress {
    const trimmed = addressLine.trim();
    if (!trimmed) {
        return { settlementId: null, street: "", building: "", apartment: "" };
    }

    const settlementId = detectSettlementId(trimmed);
    const withoutSettlement = stripSettlementPrefix(trimmed);
    const apartmentMatch = withoutSettlement.match(APARTMENT_PATTERN);
    const apartment = apartmentMatch?.[1] ?? "";
    const withoutApartment = apartmentMatch
        ? withoutSettlement.replace(apartmentMatch[0], "").replace(/,\s*$/, "").trim()
        : withoutSettlement;

    const buildingMatch = withoutApartment.match(BUILDING_PATTERN);
    const building = buildingMatch?.[1] ?? "";
    const street = extractStreetName(withoutApartment);

    return {
        settlementId: settlementId ?? (street ? "uzhhorod" : null),
        street,
        building,
        apartment,
    };
}

export function buildServiceAreaAddress(parts: {
    settlementId: ServiceSettlementId;
    street: string;
    building: string;
    apartment?: string;
}): string {
    const settlement = getSettlementById(parts.settlementId);
    const street = stripStreetPrefix(parts.street);
    const building = parts.building.trim();
    const apartment = parts.apartment?.trim();

    let line = `${settlement.label}, вул. ${street}, ${building}`;

    if (apartment) {
        line += `, кв. ${apartment}`;
    }

    return line;
}

export function validateServiceAreaAddress(addressLine: string): string | null {
    const trimmed = addressLine.trim();

    if (!trimmed) {
        return "Вкажіть адресу.";
    }

    const parsed = parseServiceAreaAddress(trimmed);

    if (!parsed.settlementId) {
        return "Приймаємо адреси лише в Ужгороді, Минаї та Сторожниці.";
    }

    if (!parsed.street || parsed.street.length < 2) {
        return "Оберіть вулицю з підказок OpenStreetMap.";
    }

    if (!parsed.building) {
        return "Вкажіть номер будинку.";
    }

    return null;
}
