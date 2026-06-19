using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.ServiceArea;
using Microsoft.Extensions.Caching.Memory;

namespace LearnCSharp.Application.Services;

public sealed class StreetSearchService(
    IHttpClientFactory httpClientFactory,
    IMemoryCache cache,
    LocalStreetIndex localStreetIndex) : IStreetSearchService
{
    private const string NominatimClientName = "Nominatim";
    private const string PhotonClientName = "Photon";
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromHours(6);
    private static readonly SemaphoreSlim RateGate = new(1, 1);
    private static DateTime _lastNominatimRequestUtc = DateTime.MinValue;

    public Task<IReadOnlyList<string>> SearchStreetsAsync(
        string settlementId,
        string query,
        CancellationToken cancellationToken = default)
    {
        var settlement = ServiceAreaSettlements.Find(settlementId);
        if (settlement is null)
        {
            return Task.FromResult<IReadOnlyList<string>>([]);
        }

        var trimmedQuery = query.Trim();
        if (trimmedQuery.Length < 1)
        {
            return Task.FromResult<IReadOnlyList<string>>([]);
        }

        var cacheKey = $"streets:v4:{settlement.Id}:{trimmedQuery.ToLowerInvariant()}";
        if (cache.TryGetValue(cacheKey, out IReadOnlyList<string>? cached) && cached is not null)
        {
            return Task.FromResult(cached);
        }

        var results = localStreetIndex.Search(settlement.Id, trimmedQuery, limit: 100);

        if (results.Count > 0)
        {
            cache.Set(cacheKey, results, CacheLifetime);
        }

        return Task.FromResult<IReadOnlyList<string>>(results);
    }

    public async Task<(bool Success, string? Error)> ValidateAddressLineAsync(
        string addressLine,
        CancellationToken cancellationToken = default)
    {
        if (!ServiceAreaAddressParser.TryParse(addressLine, out var parsed, out var parseError) || parsed is null)
        {
            return (false, parseError);
        }

        if (!parsed.HasSettlement)
        {
            return await ValidateLegacyAddressAsync(parsed, cancellationToken);
        }

        var settlement = ServiceAreaSettlements.Find(parsed.SettlementId);
        if (settlement is null)
        {
            return (false, "Приймаємо адреси лише в Ужгороді, Минаї та Сторожниці.");
        }

        var cacheKey = $"validate:v2:{parsed.SettlementId}:{parsed.Street}:{parsed.Building}:{parsed.Apartment ?? ""}";
        if (cache.TryGetValue(cacheKey, out bool cachedValid))
        {
            return cachedValid
                ? (true, null)
                : (false, "Адресу не знайдено на карті. Оберіть вулицю з підказок.");
        }

        var streetPart = parsed.Apartment is null
            ? $"{parsed.Street} {parsed.Building}"
            : $"{parsed.Street} {parsed.Building}, кв. {parsed.Apartment}";

        var url =
            $"search?format=json&addressdetails=1&limit=5&countrycodes=ua" +
            $"&street={Uri.EscapeDataString(streetPart)}" +
            $"&city={Uri.EscapeDataString(settlement.NominatimCity)}" +
            $"&country=Ukraine";

        var results = await SendNominatimAsync<List<NominatimSearchResult>>(url, cancellationToken) ?? [];
        var isValid = results.Any(result => IsWithinSettlement(result, settlement));

        if (!isValid && localStreetIndex.Search(parsed.SettlementId, parsed.Street, limit: 5)
                .Any(street => StreetLabelHelper.StripStreetPrefix(street)
                    .Equals(parsed.Street, StringComparison.OrdinalIgnoreCase)
                    || street.Contains(parsed.Street, StringComparison.OrdinalIgnoreCase)))
        {
            isValid = true;
        }

        cache.Set(cacheKey, isValid, CacheLifetime);
        return isValid
            ? (true, null)
            : (false, "Адресу не знайдено на карті. Оберіть вулицю з підказок OpenStreetMap.");
    }

    private async Task<IReadOnlyList<string>> SearchPhotonAsync(
        ServiceSettlement settlement,
        string query,
        CancellationToken cancellationToken)
    {
        var url =
            $"api/?q={Uri.EscapeDataString(query)}" +
            $"&bbox={settlement.West.ToString(CultureInfo.InvariantCulture)},{settlement.South.ToString(CultureInfo.InvariantCulture)},{settlement.East.ToString(CultureInfo.InvariantCulture)},{settlement.North.ToString(CultureInfo.InvariantCulture)}" +
            "&limit=30";

        var response = await SendPhotonAsync<PhotonResponse>(url, cancellationToken);
        if (response?.Features is null)
        {
            return [];
        }

        var streets = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var feature in response.Features)
        {
            var properties = feature.Properties;
            if (properties is null)
            {
                continue;
            }

            if (!IsPhotonFeatureInSettlement(feature, settlement))
            {
                continue;
            }

            var candidates = new List<string>();
            if (!string.IsNullOrWhiteSpace(properties.Street))
            {
                candidates.Add(properties.Street);
            }

            if (!string.IsNullOrWhiteSpace(properties.Name)
                && string.Equals(properties.OsmKey, "highway", StringComparison.OrdinalIgnoreCase))
            {
                candidates.Add(properties.Name);
            }

            foreach (var candidate in candidates.Select(StreetLabelHelper.NormalizeForDisplay))
            {
                if (MatchesQuery(candidate, query))
                {
                    streets.Add(candidate);
                }
            }
        }

        return streets.ToList();
    }

    private async Task<IReadOnlyList<string>> SearchNominatimAsync(
        ServiceSettlement settlement,
        string query,
        CancellationToken cancellationToken)
    {
        var url =
            $"search?format=json&addressdetails=1&limit=25&countrycodes=ua&dedupe=1" +
            $"&street={Uri.EscapeDataString(query)}" +
            $"&city={Uri.EscapeDataString(settlement.NominatimCity)}" +
            $"&country=Ukraine";

        var results = await SendNominatimAsync<List<NominatimSearchResult>>(url, cancellationToken) ?? [];
        var streets = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var result in results)
        {
            if (!IsWithinSettlement(result, settlement))
            {
                continue;
            }

            if (!string.IsNullOrWhiteSpace(result.Address?.Road))
            {
                var road = StreetLabelHelper.NormalizeForDisplay(result.Address.Road);
                if (MatchesQuery(road, query))
                {
                    streets.Add(road);
                }

                continue;
            }

            if (!string.IsNullOrWhiteSpace(result.Name))
            {
                var name = StreetLabelHelper.NormalizeForDisplay(result.Name);
                if (MatchesQuery(name, query))
                {
                    streets.Add(name);
                }
            }
        }

        return streets.ToList();
    }

    private static bool IsPhotonFeatureInSettlement(PhotonFeature feature, ServiceSettlement settlement)
    {
        if (feature.Geometry?.Coordinates is not [var lon, var lat, ..])
        {
            return false;
        }

        if (!ServiceAreaSettlements.ContainsCoordinates(lat, lon, settlement))
        {
            return false;
        }

        var city = feature.Properties?.City;
        if (string.IsNullOrWhiteSpace(city))
        {
            return true;
        }

        return settlement.Id switch
        {
            "uzhhorod" => city.Contains("Ужгород", StringComparison.OrdinalIgnoreCase)
                || city.Contains("Uzhhorod", StringComparison.OrdinalIgnoreCase),
            "minai" => city.Contains("Минай", StringComparison.OrdinalIgnoreCase)
                || city.Contains("Mynai", StringComparison.OrdinalIgnoreCase),
            "storozhnytsia" => city.Contains("Сторожниця", StringComparison.OrdinalIgnoreCase)
                || city.Contains("Storozhnytsia", StringComparison.OrdinalIgnoreCase),
            _ => false,
        };
    }

    private static bool MatchesQuery(string street, string query)
    {
        if (StartsWithQuery(street, query))
        {
            return true;
        }

        var normalizedStreet = NormalizeSearchKey(street);
        var normalizedQuery = NormalizeSearchKey(query);
        return normalizedStreet.Contains(normalizedQuery, StringComparison.Ordinal);
    }

    private static bool StartsWithQuery(string street, string query)
    {
        return NormalizeSearchKey(street).StartsWith(NormalizeSearchKey(query), StringComparison.Ordinal);
    }

    private static string NormalizeSearchKey(string value)
    {
        return value.Trim().ToLower(new CultureInfo("uk-UA"));
    }

    private async Task<(bool Success, string? Error)> ValidateLegacyAddressAsync(
        ParsedServiceAreaAddress parsed,
        CancellationToken cancellationToken)
    {
        foreach (var settlement in ServiceAreaSettlements.All)
        {
            if (localStreetIndex.Search(settlement.Id, parsed.Street, limit: 5)
                    .Any(street => StreetLabelHelper.StripStreetPrefix(street)
                        .Equals(parsed.Street, StringComparison.OrdinalIgnoreCase)
                        || street.Contains(parsed.Street, StringComparison.OrdinalIgnoreCase)))
            {
                return (true, null);
            }

            var streetPart = parsed.Apartment is null
                ? $"{parsed.Street} {parsed.Building}"
                : $"{parsed.Street} {parsed.Building}, кв. {parsed.Apartment}";

            var url =
                $"search?format=json&addressdetails=1&limit=3&countrycodes=ua" +
                $"&street={Uri.EscapeDataString(streetPart)}" +
                $"&city={Uri.EscapeDataString(settlement.NominatimCity)}" +
                $"&country=Ukraine";

            var results = await SendNominatimAsync<List<NominatimSearchResult>>(url, cancellationToken) ?? [];
            if (results.Any(result => IsWithinSettlement(result, settlement)))
            {
                return (true, null);
            }
        }

        return (false, "Приймаємо адреси лише в Ужгороді, Минаї та Сторожниці.");
    }

    private static bool IsWithinSettlement(NominatimSearchResult result, ServiceSettlement settlement)
    {
        if (!double.TryParse(result.Lat, NumberStyles.Float, CultureInfo.InvariantCulture, out var latitude))
        {
            return false;
        }

        if (!double.TryParse(result.Lon, NumberStyles.Float, CultureInfo.InvariantCulture, out var longitude))
        {
            return false;
        }

        return ServiceAreaSettlements.ContainsCoordinates(latitude, longitude, settlement);
    }

    private async Task<T?> SendNominatimAsync<T>(string relativeUrl, CancellationToken cancellationToken)
    {
        await RateGate.WaitAsync(cancellationToken);
        try
        {
            var elapsed = DateTime.UtcNow - _lastNominatimRequestUtc;
            if (elapsed < TimeSpan.FromSeconds(1.1))
            {
                await Task.Delay(TimeSpan.FromSeconds(1.1) - elapsed, cancellationToken);
            }

            var client = _httpClientFactory.CreateClient(NominatimClientName);
            _lastNominatimRequestUtc = DateTime.UtcNow;

            using var response = await client.GetAsync(relativeUrl, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return default;
            }

            return await response.Content.ReadFromJsonAsync<T>(cancellationToken);
        }
        finally
        {
            RateGate.Release();
        }
    }

    private async Task<T?> SendPhotonAsync<T>(string relativeUrl, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient(PhotonClientName);

        using var response = await client.GetAsync(relativeUrl, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return default;
        }

        return await response.Content.ReadFromJsonAsync<T>(cancellationToken);
    }

    private sealed class NominatimSearchResult
    {
        [JsonPropertyName("lat")]
        public string Lat { get; init; } = string.Empty;

        [JsonPropertyName("lon")]
        public string Lon { get; init; } = string.Empty;

        [JsonPropertyName("class")]
        public string? Class { get; init; }

        [JsonPropertyName("name")]
        public string? Name { get; init; }

        [JsonPropertyName("address")]
        public NominatimAddress? Address { get; init; }
    }

    private sealed class NominatimAddress
    {
        [JsonPropertyName("road")]
        public string? Road { get; init; }
    }

    private sealed class PhotonResponse
    {
        [JsonPropertyName("features")]
        public List<PhotonFeature>? Features { get; init; }
    }

    private sealed class PhotonFeature
    {
        [JsonPropertyName("properties")]
        public PhotonProperties? Properties { get; init; }

        [JsonPropertyName("geometry")]
        public PhotonGeometry? Geometry { get; init; }
    }

    private sealed class PhotonProperties
    {
        [JsonPropertyName("osm_key")]
        public string? OsmKey { get; init; }

        [JsonPropertyName("type")]
        public string? Type { get; init; }

        [JsonPropertyName("name")]
        public string? Name { get; init; }

        [JsonPropertyName("street")]
        public string? Street { get; init; }

        [JsonPropertyName("city")]
        public string? City { get; init; }
    }

    private sealed class PhotonGeometry
    {
        [JsonPropertyName("coordinates")]
        public double[]? Coordinates { get; init; }
    }
}
