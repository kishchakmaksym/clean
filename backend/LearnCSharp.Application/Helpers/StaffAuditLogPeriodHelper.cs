using LearnCSharp.Application.DTOs.Telegram;

namespace LearnCSharp.Application.Helpers;

public static class StaffAuditLogPeriodHelper
{
    public static (DateTime FromUtc, DateTime? ToUtcExclusive, string Label) GetUtcRange(StaffAuditLogPeriod period)
    {
        var kyivNow = ToKyivTime(DateTime.UtcNow);
        var todayStartKyiv = kyivNow.Date;

        return period switch
        {
            StaffAuditLogPeriod.Today => (
                ToUtc(todayStartKyiv),
                null,
                "Сьогодні"),
            StaffAuditLogPeriod.Yesterday => (
                ToUtc(todayStartKyiv.AddDays(-1)),
                ToUtc(todayStartKyiv),
                "Вчора"),
            StaffAuditLogPeriod.Last7Days => (
                ToUtc(todayStartKyiv.AddDays(-6)),
                null,
                "7 днів"),
            StaffAuditLogPeriod.LastMonth => (
                ToUtc(todayStartKyiv.AddDays(-29)),
                null,
                "Місяць"),
            _ => (
                ToUtc(todayStartKyiv),
                null,
                "Сьогодні"),
        };
    }

    public static string FormatKyivTime(DateTime utc) =>
        ToKyivTime(utc).ToString("dd.MM.yyyy HH:mm");

    private static DateTime ToKyivTime(DateTime utc)
    {
        var tz = ResolveKyivTimeZone();
        return TimeZoneInfo.ConvertTimeFromUtc(utc, tz);
    }

    private static DateTime ToUtc(DateTime kyivUnspecified)
    {
        var tz = ResolveKyivTimeZone();
        return TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(kyivUnspecified, DateTimeKind.Unspecified),
            tz);
    }

    private static TimeZoneInfo ResolveKyivTimeZone() =>
        TimeZoneInfo.TryFindSystemTimeZoneById("Europe/Kyiv", out var kyiv)
            ? kyiv
            : TimeZoneInfo.TryFindSystemTimeZoneById("FLE Standard Time", out var fle)
                ? fle
                : TimeZoneInfo.Utc;
}
