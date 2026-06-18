using LearnCSharp.Application.DTOs.Auth;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Validation;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.Services;

public sealed class AuthService(IUserRepository userRepository) : IAuthService
{
    private const int BcryptWorkFactor = 12;

    public async Task<AuthResponseDto> RegisterAsync(
        RegisterRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var validationErrors = AuthValidator.ValidateRegister(
            request.Name,
            request.Email,
            request.Phone,
            request.Password,
            request.ConfirmPassword);

        if (validationErrors.Count > 0)
        {
            return Failure(validationErrors);
        }

        var normalizedEmail = AuthValidator.NormalizeEmail(request.Email);
        var normalizedPhone = AuthValidator.TryNormalizePhone(request.Phone, out var phone)
            ? phone
            : request.Phone.Trim();

        var duplicateErrors = new List<string>();

        if (await userRepository.EmailExistsAsync(normalizedEmail, cancellationToken))
        {
            duplicateErrors.Add("Користувач з такою електронною поштою вже існує.");
        }

        if (await userRepository.PhoneExistsAsync(normalizedPhone, cancellationToken))
        {
            duplicateErrors.Add("Користувач з таким номером телефону вже існує.");
        }

        if (duplicateErrors.Count > 0)
        {
            return Failure(duplicateErrors);
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            Phone = normalizedPhone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, BcryptWorkFactor),
            Role = UserRole.User,
            CreatedAtUtc = DateTime.UtcNow
        };

        await userRepository.AddAsync(user, cancellationToken);

        return Success(user, "Реєстрація успішна.");
    }

    public async Task<AuthResponseDto> LoginAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var validationErrors = AuthValidator.ValidateLogin(request.Login, request.Password);

        if (validationErrors.Count > 0)
        {
            return Failure(validationErrors);
        }

        var login = request.Login.Trim();
        User? user;

        if (login.Contains('@', StringComparison.Ordinal))
        {
            var normalizedEmail = AuthValidator.NormalizeEmail(login);
            user = await userRepository.FindByEmailAsync(normalizedEmail, cancellationToken);
        }
        else
        {
            if (!AuthValidator.TryNormalizePhone(login, out var normalizedPhone))
            {
                return Failure(["Некоректний формат номера телефону."]);
            }

            user = await userRepository.FindByPhoneAsync(normalizedPhone, cancellationToken);
        }

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Failure(["Невірна електронна пошта, номер телефону або пароль."]);
        }

        return Success(user, "Вхід успішний.");
    }

    private static AuthResponseDto Success(User user, string message) =>
        new()
        {
            Success = true,
            Message = message,
            User = MapUser(user)
        };

    private static AuthResponseDto Failure(IReadOnlyList<string> errors) =>
        new()
        {
            Success = false,
            Errors = errors
        };

    private static UserResponseDto MapUser(User user) =>
        new()
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role
        };
}
