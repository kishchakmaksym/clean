using LearnCSharp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace LearnCSharp.Api;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=smartclean;Username=smartclean;Password=changeme";

        var provider = DatabaseProvider.Resolve(
            configuration["Database:Provider"] ?? Environment.GetEnvironmentVariable("Database__Provider"),
            connectionString);

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

        switch (provider)
        {
            case DatabaseProviderKind.PostgreSql:
                optionsBuilder.UseNpgsql(
                    connectionString,
                    npgsql => npgsql.MigrationsAssembly(DatabaseBootstrap.PostgresMigrationsAssemblyName));
                break;
            case DatabaseProviderKind.Sqlite:
                DatabaseBootstrap.ConfigureProvider(optionsBuilder, provider, connectionString);
                break;
        }

        return new AppDbContext(optionsBuilder.Options);
    }
}
