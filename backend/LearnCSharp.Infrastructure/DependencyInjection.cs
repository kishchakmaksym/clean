using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Seeding;
using LearnCSharp.Application.Services;
using LearnCSharp.Infrastructure.Persistence;
using LearnCSharp.Infrastructure.Repositories;
using LearnCSharp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LearnCSharp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=cleanpro.db";

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(connectionString));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IReviewRepository, ReviewRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IPendingCardOrderRepository, PendingCardOrderRepository>();
        services.AddScoped<IAdminPaymentInvoiceRepository, AdminPaymentInvoiceRepository>();
        services.AddScoped<IUserAddressRepository, UserAddressRepository>();
        services.AddScoped<ITelegramStaffRepository, TelegramStaffRepository>();
        services.AddScoped<ISupportTicketRepository, SupportTicketRepository>();
        services.AddScoped<IMonoPaymentClient, MonoPaymentClient>();

        return services;
    }

    public static async Task InitializeDatabaseAsync(this IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();

        var adminSeeder = scope.ServiceProvider.GetRequiredService<AdminSeeder>();
        await adminSeeder.SeedAsync();
    }
}
