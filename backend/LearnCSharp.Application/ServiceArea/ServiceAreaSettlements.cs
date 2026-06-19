namespace LearnCSharp.Application.ServiceArea;

public sealed record ServiceSettlement(
    string Id,
    string Label,
    string ShortName,
    string NominatimCity,
    double South,
    double North,
    double West,
    double East);

public static class ServiceAreaSettlements
{
    public static IReadOnlyList<ServiceSettlement> All { get; } =
    [
        new("uzhhorod", "м. Ужгород", "Ужгород", "Uzhhorod", 48.4623731, 48.7823731, 22.1422572, 22.4622572),
        new("minai", "с. Минай", "Минай", "Mynai", 48.5853095, 48.6032686, 22.2452223, 22.2934663),
        new("storozhnytsia", "с. Сторожниця", "Сторожниця", "Storozhnytsia", 48.5888716, 48.6148466, 22.2112623, 22.2694073),
    ];

    private static readonly Dictionary<string, ServiceSettlement> ById =
        All.ToDictionary(settlement => settlement.Id, StringComparer.OrdinalIgnoreCase);

    public static ServiceSettlement? Find(string? settlementId)
    {
        if (string.IsNullOrWhiteSpace(settlementId))
        {
            return null;
        }

        return ById.GetValueOrDefault(settlementId.Trim());
    }

    public static bool ContainsCoordinates(double latitude, double longitude, ServiceSettlement settlement)
    {
        return latitude >= settlement.South
            && latitude <= settlement.North
            && longitude >= settlement.West
            && longitude <= settlement.East;
    }
}
