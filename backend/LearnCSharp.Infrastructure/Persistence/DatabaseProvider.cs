namespace LearnCSharp.Infrastructure.Persistence;

public enum DatabaseProviderKind
{
    Sqlite,
    PostgreSql,
}

public static class DatabaseProvider
{
    public static DatabaseProviderKind Resolve(string? configuredProvider, string connectionString)
    {
        if (!string.IsNullOrWhiteSpace(configuredProvider))
        {
            return configuredProvider.Trim().ToLowerInvariant() switch
            {
                "postgresql" or "postgres" or "npgsql" => DatabaseProviderKind.PostgreSql,
                "sqlite" or "sqlitememory" => DatabaseProviderKind.Sqlite,
                _ => throw new InvalidOperationException($"Unknown Database:Provider value '{configuredProvider}'."),
            };
        }

        if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase)
            || connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase))
        {
            return DatabaseProviderKind.PostgreSql;
        }

        return DatabaseProviderKind.Sqlite;
    }
}
