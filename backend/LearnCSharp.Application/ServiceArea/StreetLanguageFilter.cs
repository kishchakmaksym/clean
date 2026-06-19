using System.Globalization;
using System.Text.RegularExpressions;

namespace LearnCSharp.Application.ServiceArea;

public static partial class StreetLanguageFilter
{
    [GeneratedRegex(@"\s+(улица|переулок|набережная|площадь|шоссе|бульвар|тупик)$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex RussianTypeSuffix();

    [GeneratedRegex(@"\s+проспект\s*$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex RussianProspectSuffix();

    [GeneratedRegex(@"^(?:вулиця|вул\.|провулок|проспект|набережна|площа|шосе|бульвар|тупик)\s+", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex UkrainianTypePrefix();

    [GeneratedRegex(@"\s+(?:набережна|вулиця|площа)$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex UkrainianTypeSuffix();

    public static bool IsRussian(string value)
    {
        var trimmed = value.Trim();
        if (trimmed.Length == 0)
        {
            return false;
        }

        if (UkrainianTypePrefix().IsMatch(trimmed) || UkrainianTypeSuffix().IsMatch(trimmed))
        {
            return false;
        }

        return RussianTypeSuffix().IsMatch(trimmed) || RussianProspectSuffix().IsMatch(trimmed);
    }

    public static bool IsUkrainian(string value)
    {
        var trimmed = value.Trim();
        return trimmed.Length > 0
            && (UkrainianTypePrefix().IsMatch(trimmed) || UkrainianTypeSuffix().IsMatch(trimmed));
    }

    public static string ExtractCoreName(string value)
    {
        var name = value.Trim().ToLower(CultureInfo.GetCultureInfo("uk-UA"));
        name = UkrainianTypePrefix().Replace(name, string.Empty);
        name = Regex.Replace(
            name,
            @"\s+(?:улица|переулок|набережная|площадь|шоссе|бульвар|тупик|проспект|набережна|вулиця|площа)$",
            string.Empty,
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        name = Regex.Replace(name, @"^проспект\s+", string.Empty, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        return name.Trim();
    }

    public static string? TryConvertToUkrainian(string value)
    {
        var trimmed = value.Trim();
        if (trimmed.Length == 0 || IsUkrainian(trimmed))
        {
            return trimmed.Length > 0 ? trimmed : null;
        }

        var suffixMap = new (Regex Pattern, string Prefix)[]
        {
            (new Regex(@"^(.+?)\s+улица$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant), "вулиця "),
            (new Regex(@"^(.+?)\s+переулок$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant), "провулок "),
            (new Regex(@"^(.+?)\s+набережная$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant), "набережна "),
            (new Regex(@"^(.+?)\s+площадь$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant), "площа "),
            (new Regex(@"^(.+?)\s+шоссе$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant), "шосе "),
            (new Regex(@"^(.+?)\s+проспект$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant), "проспект "),
        };

        foreach (var (pattern, prefix) in suffixMap)
        {
            var match = pattern.Match(trimmed);
            if (match.Success)
            {
                return prefix + match.Groups[1].Value.Trim();
            }
        }

        return null;
    }

    public static IEnumerable<string> KeepUkrainianOnly(IEnumerable<string> streets)
    {
        var all = streets
            .Select(street => street.Trim())
            .Where(street => street.Length > 1)
            .ToList();

        var coresWithUkrainian = new HashSet<string>(
            all.Where(IsUkrainian).Select(ExtractCoreName),
            StringComparer.OrdinalIgnoreCase);

        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var street in all)
        {
            if (IsRussian(street))
            {
                var core = ExtractCoreName(street);
                if (coresWithUkrainian.Contains(core))
                {
                    continue;
                }

                var converted = TryConvertToUkrainian(street);
                if (converted is not null)
                {
                    result.Add(converted);
                }

                continue;
            }

            result.Add(street);
        }

        return result;
    }
}
