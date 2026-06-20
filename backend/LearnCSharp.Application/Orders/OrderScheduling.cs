using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.Orders;

public static class OrderScheduling
{
    private static readonly TimeZoneInfo KyivTimeZone = ResolveKyivTimeZone();

    public static DateTime GetNextCleaningStartUtc(DateTime createdAtUtc, string timeSlot)
    {
        var createdLocal = ToKyivLocal(createdAtUtc);
        var startHour = GetSlotStartHour(timeSlot);

        var candidateLocal = createdLocal.Date.AddHours(startHour);
        if (createdLocal >= candidateLocal)
        {
            candidateLocal = candidateLocal.AddDays(1);
        }

        return ToUtc(candidateLocal);
    }

    public static bool CanUserCancel(
        DateTime createdAtUtc,
        string timeSlot,
        OrderStatus status,
        DateTime nowUtc)
    {
        if (status is OrderStatus.Completed or OrderStatus.Cancelled)
        {
            return false;
        }

        var cleaningStartUtc = GetNextCleaningStartUtc(createdAtUtc, timeSlot);
        return nowUtc <= cleaningStartUtc.AddHours(-1);
    }

    private static int GetSlotStartHour(string timeSlot) =>
        timeSlot.Trim().ToLowerInvariant() switch
        {
            "morning" => 8,
            "afternoon" => 12,
            "evening" => 16,
            _ => 8,
        };

    private static DateTime ToKyivLocal(DateTime utc)
    {
        var normalizedUtc = utc.Kind switch
        {
            DateTimeKind.Utc => utc,
            DateTimeKind.Local => utc.ToUniversalTime(),
            _ => DateTime.SpecifyKind(utc, DateTimeKind.Utc),
        };

        return TimeZoneInfo.ConvertTimeFromUtc(normalizedUtc, KyivTimeZone);
    }

    private static DateTime ToUtc(DateTime localUnspecified)
    {
        var local = DateTime.SpecifyKind(localUnspecified, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, KyivTimeZone);
    }

    private static TimeZoneInfo ResolveKyivTimeZone()
    {
        foreach (var timeZoneId in new[] { "Europe/Kyiv", "Europe/Kiev", "FLE Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.Utc;
    }
}
