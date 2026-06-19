using System.Globalization;
using System.Text.Json;
using LearnCSharp.Application.ServiceArea;

namespace LearnCSharp.Application.Services;

public sealed class LocalStreetIndex
{
    private readonly Dictionary<string, List<string>> _streetsBySettlement;

    public LocalStreetIndex()
    {
        _streetsBySettlement = LoadFromDisk();
    }

    public int GetStreetCount(string settlementId)
    {
        return _streetsBySettlement.TryGetValue(settlementId, out var streets) ? streets.Count : 0;
    }

    public IReadOnlyList<string> Search(string settlementId, string query, int limit = 100)
    {
        if (!_streetsBySettlement.TryGetValue(settlementId, out var streets))
        {
            return [];
        }

        var normalizedQuery = NormalizeKey(query);
        if (normalizedQuery.Length == 0)
        {
            return [];
        }

        return streets
            .Select(street => new { Street = street, Score = ScoreMatch(street, normalizedQuery) })
            .Where(item => item.Score > 0)
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.Street, StringComparer.Create(new CultureInfo("uk-UA"), ignoreCase: true))
            .Take(limit)
            .Select(item => item.Street)
            .ToList();
    }

    private static int ScoreMatch(string street, string normalizedQuery)
    {
        var normalizedStreet = NormalizeKey(street);

        if (normalizedStreet.StartsWith(normalizedQuery, StringComparison.Ordinal))
        {
            return 100;
        }

        var bestWordScore = 0;
        foreach (var word in normalizedStreet.Split([' ', '·', '-'], StringSplitOptions.RemoveEmptyEntries))
        {
            if (word.StartsWith(normalizedQuery, StringComparison.Ordinal))
            {
                bestWordScore = Math.Max(bestWordScore, 80);
            }
            else if (word.Contains(normalizedQuery, StringComparison.Ordinal))
            {
                bestWordScore = Math.Max(bestWordScore, 40);
            }
        }

        if (bestWordScore > 0)
        {
            return bestWordScore;
        }

        return normalizedStreet.Contains(normalizedQuery, StringComparison.Ordinal) ? 20 : 0;
    }

    private static Dictionary<string, List<string>> LoadFromDisk()
    {
        var merged = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var settlement in ServiceAreaSettlements.All)
        {
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var catalogPath = FindDataFile("service-area-streets.json");
            if (catalogPath is not null)
            {
                var catalog = ReadJson<StreetCatalogFile>(catalogPath);
                if (catalog?.Settlements?.TryGetValue(settlement.Id, out var entry) == true)
                {
                    foreach (var street in entry.Streets)
                    {
                        AddStreet(names, street);
                    }
                }
            }

            var supplementPath = FindDataFile("street-supplements.json");
            if (supplementPath is not null)
            {
                var supplements = ReadJson<Dictionary<string, List<string>>>(supplementPath);
                if (supplements?.TryGetValue(settlement.Id, out var extra) == true)
                {
                    foreach (var street in extra)
                    {
                        AddStreet(names, street);
                    }
                }
            }

            merged[settlement.Id] = StreetLanguageFilter.KeepUkrainianOnly(names)
                .OrderBy(street => street, StringComparer.Create(new CultureInfo("uk-UA"), ignoreCase: true))
                .ToList();
        }

        return merged;
    }

    private static void AddStreet(HashSet<string> names, string? street)
    {
        var normalized = StreetLabelHelper.NormalizeForDisplay(street ?? string.Empty);
        if (normalized.Length > 1)
        {
            names.Add(normalized);
        }
    }

    private static string? FindDataFile(string fileName)
    {
        foreach (var path in GetCandidatePaths(fileName))
        {
            if (File.Exists(path))
            {
                return path;
            }
        }

        return null;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private static T? ReadJson<T>(string path)
    {
        try
        {
            var json = File.ReadAllText(path).TrimStart('\uFEFF');
            return JsonSerializer.Deserialize<T>(json, JsonOptions);
        }
        catch
        {
            return default;
        }
    }

    private static IEnumerable<string> GetCandidatePaths(string fileName)
    {
        yield return Path.Combine(AppContext.BaseDirectory, "Data", fileName);
        yield return Path.Combine(Directory.GetCurrentDirectory(), "Data", fileName);
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Data", fileName));
    }

    private static string NormalizeKey(string value)
    {
        return value.Trim().ToLower(new CultureInfo("uk-UA"));
    }

    private sealed class StreetCatalogFile
    {
        public Dictionary<string, StreetCatalogSettlement>? Settlements { get; init; }
    }

    private sealed class StreetCatalogSettlement
    {
        public List<string> Streets { get; init; } = [];
    }
}
