using System.Text.RegularExpressions;

namespace LearnCSharp.Application.ServiceArea;

public static partial class StreetLabelHelper
{
    [GeneratedRegex(@"^(?:вулиця|вул\.)\s+", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex StreetPrefixPattern();

    public static string StripStreetPrefix(string value)
    {
        return StreetPrefixPattern().Replace(value.Trim(), string.Empty).Trim();
    }

    public static string NormalizeForDisplay(string value)
    {
        return value.Trim();
    }
}
