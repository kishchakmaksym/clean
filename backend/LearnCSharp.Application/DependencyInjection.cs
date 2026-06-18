using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace LearnCSharp.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}
