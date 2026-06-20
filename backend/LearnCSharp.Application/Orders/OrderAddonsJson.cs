using System.Text.Json;

namespace LearnCSharp.Application.Orders;

public static class OrderAddonsJson
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static string? Serialize(IReadOnlyList<string>? addons)
    {
        if (addons is null || addons.Count == 0)
        {
            return null;
        }

        return JsonSerializer.Serialize(addons, JsonOptions);
    }

    public static IReadOnlyList<string> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
