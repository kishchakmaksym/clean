export const UKRAINE_TIME_ZONE = "Europe/Kyiv";

export function parseUtcDate(value: string): Date {
    const trimmed = value.trim();
    const hasTimeZone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(trimmed);

    return new Date(hasTimeZone ? trimmed : `${trimmed}Z`);
}

export function formatUkrainianDateTime(
    value: string,
    options?: Intl.DateTimeFormatOptions,
): string {
    return new Intl.DateTimeFormat("uk-UA", {
        timeZone: UKRAINE_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...options,
    }).format(parseUtcDate(value));
}

export function formatUkrainianDate(
    value: string,
    options?: Intl.DateTimeFormatOptions,
): string {
    return new Intl.DateTimeFormat("uk-UA", {
        timeZone: UKRAINE_TIME_ZONE,
        day: "numeric",
        month: "long",
        year: "numeric",
        ...options,
    }).format(parseUtcDate(value));
}

export function ukraineTodayInputValue(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: UKRAINE_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

export function ukraineLocalDateTimeToUtcIso(
    date: string,
    hours = 12,
    minutes = 0,
): string {
    const [year, month, day] = date.split("-").map(Number);
    const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    let utcMs = Date.parse(`${date}T${time}Z`);

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: UKRAINE_TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
        }).formatToParts(new Date(utcMs));

        const read = (type: Intl.DateTimeFormatPartTypes) =>
            Number(parts.find((part) => part.type === type)?.value ?? 0);

        const shownMs = Date.UTC(
            read("year"),
            read("month") - 1,
            read("day"),
            read("hour"),
            read("minute"),
            read("second"),
        );
        const targetMs = Date.UTC(year, month - 1, day, hours, minutes, 0);
        utcMs += targetMs - shownMs;
    }

    return new Date(utcMs).toISOString();
}
