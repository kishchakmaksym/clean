using System.Globalization;
using System.Text.RegularExpressions;

namespace LearnCSharp.Application.ServiceArea;

public sealed record ParsedServiceAreaAddress(
    string SettlementId,
    string Street,
    string Building,
    string? Apartment)
{
    public bool HasSettlement => !string.IsNullOrWhiteSpace(SettlementId);
}

public static partial class ServiceAreaAddressParser
{
    [GeneratedRegex(@"\b(\d+[a-zA-Zа-яА-ЯіїєґІЇЄҐ]?)\b", RegexOptions.Compiled)]
    private static partial Regex BuildingPattern();

    [GeneratedRegex(@"(?:кв\.?|квартира)\s*(\d+[a-zA-Zа-яА-ЯіїєґІЇЄҐ]?)", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex ApartmentPattern();

    [GeneratedRegex(@"^(?:вулиця|вул\.)\s+", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex StreetPrefixPattern();

    public static bool TryParse(string? addressLine, out ParsedServiceAreaAddress? parsed, out string? error)
    {
        parsed = null;
        error = null;

        if (string.IsNullOrWhiteSpace(addressLine))
        {
            error = "Вкажіть адресу.";
            return false;
        }

        var trimmed = addressLine.Trim();
        var settlementId = DetectSettlementId(trimmed);
        var withoutSettlement = settlementId is null ? trimmed : StripSettlementPrefix(trimmed);
        var apartmentMatch = ApartmentPattern().Match(withoutSettlement);
        string? apartment = apartmentMatch.Success ? apartmentMatch.Groups[1].Value : null;
        var withoutApartment = apartmentMatch.Success
            ? withoutSettlement[..apartmentMatch.Index].Trim().TrimEnd(',')
            : withoutSettlement;

        var buildingMatch = BuildingPattern().Match(withoutApartment);
        if (!buildingMatch.Success)
        {
            error = "Вкажіть номер будинку.";
            return false;
        }

        var building = buildingMatch.Groups[1].Value;
        var streetPart = withoutApartment[..buildingMatch.Index].Trim().TrimEnd(',');
        var street = StreetPrefixPattern().Replace(streetPart, string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(street) || street.Length < 2)
        {
            error = "Оберіть вулицю з підказок OpenStreetMap.";
            return false;
        }

        parsed = new ParsedServiceAreaAddress(settlementId ?? string.Empty, street, building, apartment);
        return true;
    }

    public static bool HasAllowedSettlement(string? addressLine)
    {
        return !string.IsNullOrWhiteSpace(addressLine) && DetectSettlementId(addressLine.Trim()) is not null;
    }

    private static string? DetectSettlementId(string addressLine)
    {
        var lower = addressLine.ToLower(CultureInfo.InvariantCulture);

        if (lower.Contains("ужгород", StringComparison.Ordinal))
        {
            return "uzhhorod";
        }

        if (lower.Contains("минай", StringComparison.Ordinal))
        {
            return "minai";
        }

        if (lower.Contains("сторожниця", StringComparison.Ordinal))
        {
            return "storozhnytsia";
        }

        return null;
    }

    private static string StripSettlementPrefix(string line)
    {
        return Regex.Replace(
            Regex.Replace(
                Regex.Replace(line, @"^м\.?\s*Ужгород\s*,?\s*", string.Empty, RegexOptions.IgnoreCase),
                @"^с\.?\s*Минай\s*,?\s*",
                string.Empty,
                RegexOptions.IgnoreCase),
            @"^с\.?\s*Сторожниця\s*,?\s*",
            string.Empty,
            RegexOptions.IgnoreCase).Trim();
    }
}
