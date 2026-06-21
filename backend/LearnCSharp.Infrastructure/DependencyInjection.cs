using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Seeding;
using LearnCSharp.Application.Services;
using LearnCSharp.Infrastructure.Persistence;
using LearnCSharp.Infrastructure.Repositories;
using LearnCSharp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace LearnCSharp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=cleanpro.db";
        var provider = DatabaseProvider.Resolve(
            configuration["Database:Provider"],
            connectionString);

        services.AddDbContext<AppDbContext>(options =>
            ConfigureDbContext(options, provider, connectionString));

        services.AddSingleton(new DatabaseRuntimeOptions(provider));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IReviewRepository, ReviewRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IPendingCardOrderRepository, PendingCardOrderRepository>();
        services.AddScoped<IAdminPaymentInvoiceRepository, AdminPaymentInvoiceRepository>();
        services.AddScoped<IUserAddressRepository, UserAddressRepository>();
        services.AddScoped<ITelegramStaffRepository, TelegramStaffRepository>();
        services.AddScoped<ISupportTicketRepository, SupportTicketRepository>();
        services.AddScoped<IJobApplicationRepository, JobApplicationRepository>();
        services.AddScoped<IMonoPaymentClient, MonoPaymentClient>();

        return services;
    }

    private static void ConfigureDbContext(
        DbContextOptionsBuilder optionsBuilder,
        DatabaseProviderKind provider,
        string connectionString)
    {
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
            default:
                throw new ArgumentOutOfRangeException(nameof(provider), provider, "Unsupported database provider.");
        }
    }

    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        bool applyMigrations = true,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var runtimeOptions = scope.ServiceProvider.GetRequiredService<DatabaseRuntimeOptions>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger("LearnCSharp.Infrastructure.Database");

        if (applyMigrations)
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
            logger.LogInformation("Database migrations applied ({Provider}).", runtimeOptions.Provider);
        }
        else
        {
            await WaitForDatabaseAsync(dbContext, logger, cancellationToken);
        }

        var adminSeeder = scope.ServiceProvider.GetRequiredService<AdminSeeder>();
        await adminSeeder.SeedAsync();
    }

    private static async Task WaitForDatabaseAsync(
        AppDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 30;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            if (await dbContext.Database.CanConnectAsync(cancellationToken))
            {
                logger.LogInformation("Database connection ready.");
                return;
            }

            logger.LogWarning("Database not ready (attempt {Attempt}/{MaxAttempts}).", attempt, maxAttempts);
            await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
        }

        throw new InvalidOperationException("Database is not reachable after multiple attempts.");
    }
}
