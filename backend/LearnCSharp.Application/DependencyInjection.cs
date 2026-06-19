using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Seeding;
using LearnCSharp.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace LearnCSharp.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<AdminSeeder>();
        return services;
    }
}
