using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Persistence;

public static class DatabaseBootstrap
{
    public const string PostgresMigrationsAssemblyName = "LearnCSharp.Infrastructure.Postgres";
    public const string PostgresMigrationsHistoryTable = "__EFMigrationsHistory_Postgres";

    public static void ConfigureProvider(
        DbContextOptionsBuilder optionsBuilder,
        DatabaseProviderKind provider,
        string connectionString)
    {
        switch (provider)
        {
            case DatabaseProviderKind.PostgreSql:
                optionsBuilder.UseNpgsql(
                    connectionString,
                    npgsql => npgsql.MigrationsHistoryTable(PostgresMigrationsHistoryTable));
                break;
            case DatabaseProviderKind.Sqlite:
                optionsBuilder.UseSqlite(connectionString);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(provider), provider, "Unsupported database provider.");
        }
    }
}
