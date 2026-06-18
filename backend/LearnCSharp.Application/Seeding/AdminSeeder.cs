using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Validation;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LearnCSharp.Application.Seeding;

public sealed class AdminSeeder(
    IUserRepository userRepository,
    IConfiguration configuration,
    ILogger<AdminSeeder> logger)
{
    private const int BcryptWorkFactor = 12;

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (await userRepository.AnyAdminExistsAsync(cancellationToken))
        {
            return;
        }

        var email = configuration["AdminSeed:Email"];
        var password = configuration["AdminSeed:Password"];
        var name = configuration["AdminSeed:Name"];
        var phone = configuration["AdminSeed:Phone"];

        if (string.IsNullOrWhiteSpace(email)
            || string.IsNullOrWhiteSpace(password)
            || string.IsNullOrWhiteSpace(name)
            || string.IsNullOrWhiteSpace(phone))
        {
            logger.LogWarning("Admin account was not created. Fill AdminSeed settings in appsettings.Development.json.");
            return;
        }

        var normalizedEmail = AuthValidator.NormalizeEmail(email);

        if (await userRepository.EmailExistsAsync(normalizedEmail, cancellationToken))
        {
            logger.LogWarning(
                "Admin account was not created. Email {Email} already exists.",
                normalizedEmail);
            return;
        }

        if (!AuthValidator.TryNormalizePhone(phone, out var normalizedPhone))
        {
            logger.LogWarning("Admin account was not created. Phone format is invalid.");
            return;
        }

        if (await userRepository.PhoneExistsAsync(normalizedPhone, cancellationToken))
        {
            logger.LogWarning("Admin account was not created. Phone already exists.");
            return;
        }

        var admin = new User
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Email = normalizedEmail,
            Phone = normalizedPhone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, BcryptWorkFactor),
            Role = UserRole.Admin,
            CreatedAtUtc = DateTime.UtcNow
        };

        await userRepository.AddAsync(admin, cancellationToken);

        logger.LogInformation("Default admin account created for {Email}.", normalizedEmail);
    }
}
