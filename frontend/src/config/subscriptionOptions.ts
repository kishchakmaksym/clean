import {
    allOrderExtras,
    calculateCustomExtraTotal,
} from "./customCleaningOptions";

export const SUBSCRIPTION_CYCLE_DAYS = 28;

export const SUBSCRIPTION_DISCOUNT_RATE = 0.1;

export const MIN_SUBSCRIPTION_PER_VISIT = 1000;

export const subscriptionQuickPatterns = [
    { id: "daily", label: "Щодня", visitDays: () => generateEveryDayPattern() },
    { id: "every-3", label: "Кожні 3 дні", visitDays: () => generateEveryNthDayPattern(3) },
    { id: "weekly", label: "Щотижня", visitDays: () => generateEveryNthDayPattern(7) },
    { id: "2-on-5-off", label: "2 дні + 5 пауза", visitDays: () => generateOnOffPattern(2, 5) },
] as const;

function parseArea(area: string) {
    const trimmedArea = area.trim();
    if (!trimmedArea) {
        return null;
    }

    const parsedArea = Number.parseInt(trimmedArea, 10);
    if (Number.isNaN(parsedArea) || parsedArea <= 0) {
        return null;
    }

    return parsedArea;
}

export function normalizeVisitDays(days: number[]) {
    const unique = new Set<number>();

    for (const day of days) {
        if (Number.isInteger(day) && day >= 1 && day <= SUBSCRIPTION_CYCLE_DAYS) {
            unique.add(day);
        }
    }

    return Array.from(unique).sort((left, right) => left - right);
}

export function generateEveryDayPattern() {
    return Array.from({ length: SUBSCRIPTION_CYCLE_DAYS }, (_, index) => index + 1);
}

export function generateEveryNthDayPattern(stepDays: number) {
    const safeStep = Math.max(1, Math.min(SUBSCRIPTION_CYCLE_DAYS, stepDays));
    const days: number[] = [];

    for (let day = 1; day <= SUBSCRIPTION_CYCLE_DAYS; day += safeStep) {
        days.push(day);
    }

    return days;
}

export function generateOnOffPattern(activeDays: number, pauseDays: number, startDay = 1) {
    const safeActive = Math.max(1, Math.min(SUBSCRIPTION_CYCLE_DAYS, activeDays));
    const safePause = Math.max(0, Math.min(SUBSCRIPTION_CYCLE_DAYS, pauseDays));
    const days: number[] = [];
    let day = Math.max(1, Math.min(SUBSCRIPTION_CYCLE_DAYS, startDay));

    while (day <= SUBSCRIPTION_CYCLE_DAYS) {
        for (let index = 0; index < safeActive && day <= SUBSCRIPTION_CYCLE_DAYS; index += 1) {
            days.push(day);
            day += 1;
        }

        day += safePause;
    }

    return normalizeVisitDays(days);
}

export function formatVisitDaysSummary(visitDays: number[]) {
    if (visitDays.length === 0) {
        return "—";
    }

    if (visitDays.length <= 8) {
        return visitDays.map((day) => `день ${day}`).join(", ");
    }

    const visitWord =
        visitDays.length === 1 ? "візит" : visitDays.length >= 2 && visitDays.length <= 4 ? "візити" : "візитів";

    return `${visitDays.length} ${visitWord} за ${SUBSCRIPTION_CYCLE_DAYS} днів`;
}

export function describeVisitDayRanges(visitDays: number[]) {
    if (visitDays.length === 0) {
        return "";
    }

    const ranges: string[] = [];
    let rangeStart = visitDays[0];
    let previous = visitDays[0];

    for (let index = 1; index < visitDays.length; index += 1) {
        const current = visitDays[index];

        if (current === previous + 1) {
            previous = current;
            continue;
        }

        ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}–${previous}`);
        rangeStart = current;
        previous = current;
    }

    ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}–${previous}`);

    return `Дні: ${ranges.join(", ")}`;
}

export function estimateSubscriptionOrder(
    area: string,
    extraQuantities: Record<string, number>,
    visitDaysInput: number[],
) {
    const visitDays = normalizeVisitDays(visitDaysInput);
    const sqm = parseArea(area);
    const selectedExtras = allOrderExtras.filter((extra) => (extraQuantities[extra.id] ?? 0) > 0);
    const hasSelectedExtras = selectedExtras.length > 0;
    const needsArea = selectedExtras.some((extra) => (extra.priceUnit ?? "flat") === "sqm");
    const hasScheduleSelected = visitDays.length > 0;
    const visitsInCycle = visitDays.length;

    const emptyResult = {
        sqm: sqm ?? 0,
        visitsInCycle,
        visitDays,
        perVisitTotal: 0,
        cycleTotal: 0,
        discountedCycleTotal: 0,
        extrasTotal: 0,
        meetsMinimumPerVisit: false,
        isReady: false,
        hasSelectedExtras,
        hasScheduleSelected,
    };

    if (!hasScheduleSelected) {
        return emptyResult;
    }

    if (!hasSelectedExtras) {
        return {
            ...emptyResult,
            hasScheduleSelected: true,
        };
    }

    if (needsArea && sqm === null) {
        return {
            ...emptyResult,
            hasSelectedExtras: true,
            hasScheduleSelected: true,
        };
    }

    const effectiveSqm = sqm ?? 0;
    const extrasTotal = selectedExtras.reduce(
        (sum, extra) =>
            sum + calculateCustomExtraTotal(extra, effectiveSqm, extraQuantities[extra.id] ?? 1),
        0,
    );
    const perVisitTotal = Math.round(extrasTotal);
    const cycleTotal = Math.round(perVisitTotal * visitsInCycle);
    const discountedCycleTotal = Math.round(cycleTotal * (1 - SUBSCRIPTION_DISCOUNT_RATE));
    const meetsMinimumPerVisit = perVisitTotal >= MIN_SUBSCRIPTION_PER_VISIT;

    return {
        sqm: effectiveSqm,
        visitsInCycle,
        visitDays,
        perVisitTotal,
        cycleTotal,
        discountedCycleTotal,
        extrasTotal: perVisitTotal,
        meetsMinimumPerVisit,
        isReady: true,
        hasSelectedExtras: true,
        hasScheduleSelected: true,
    };
}
