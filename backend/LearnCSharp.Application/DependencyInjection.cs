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
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<ITelegramStaffService, TelegramStaffService>();
        services.AddScoped<ISupportTicketService, SupportTicketService>();
        services.AddSingleton<LocalStreetIndex>();
        services.AddSingleton<IStreetSearchService, StreetSearchService>();
        services.AddMemoryCache();
        services.AddHttpClient("Nominatim", client =>
        {
            client.BaseAddress = new Uri("https://nominatim.openstreetmap.org/");
            client.DefaultRequestHeaders.Add("User-Agent", "CleanPro/1.0 (address autocomplete; contact@cleanpro.local)");
            client.DefaultRequestHeaders.Add("Accept-Language", "uk,en");
        });
        services.AddHttpClient("Photon", client =>
        {
            client.BaseAddress = new Uri("https://photon.komoot.io/");
            client.DefaultRequestHeaders.Add("User-Agent", "CleanPro/1.0 (address autocomplete; contact@cleanpro.local)");
        });
        services.AddScoped<AdminSeeder>();
        return services;
    }
}
