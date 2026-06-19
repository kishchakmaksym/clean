using LearnCSharp.Application.DTOs.Profile;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Validation;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.Services;

public sealed class ProfileService(
    IUserRepository userRepository,
    IUserAddressRepository userAddressRepository,
    IOrderRepository orderRepository,
    IStreetSearchService streetSearchService) : IProfileService
{
    private const int MaxAddressLength = 500;
    private const int MaxLabelLength = 64;

    public async Task<ProfileResponseDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.FindByIdWithAddressesAsync(userId, cancellationToken);
        if (user is null)
        {
            return Failure(["Користувача не знайдено."]);
        }

        return await SuccessProfileAsync(user, cancellationToken: cancellationToken);
    }

    public async Task<ProfileResponseDto> UpdateProfileAsync(
        UpdateProfileRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var errors = ValidateProfileFields(request.Name, request.Email, request.Phone);
        if (errors.Count > 0)
        {
            return Failure(errors);
        }

        var user = await userRepository.FindByIdWithAddressesAsync(request.UserId, cancellationToken);
        if (user is null)
        {
            return Failure(["Користувача не знайдено."]);
        }

        if (user.Role is not UserRole.User)
        {
            return Failure(["Редагувати профіль можуть лише клієнти."]);
        }

        var normalizedEmail = AuthValidator.NormalizeEmail(request.Email);
        var normalizedPhone = AuthValidator.TryNormalizePhone(request.Phone, out var phone)
            ? phone
            : request.Phone.Trim();

        if (await userRepository.EmailExistsForOtherUserAsync(normalizedEmail, user.Id, cancellationToken))
        {
            return Failure(["Користувач з такою електронною поштою вже існує."]);
        }

        if (await userRepository.PhoneExistsForOtherUserAsync(normalizedPhone, user.Id, cancellationToken))
        {
            return Failure(["Користувач з таким номером телефону вже існує."]);
        }

        user.Name = request.Name.Trim();
        user.Email = normalizedEmail;
        user.Phone = normalizedPhone;
        user.UpdatedAtUtc = DateTime.UtcNow;

        await userRepository.UpdateAsync(user, cancellationToken);

        return await SuccessProfileAsync(user, "Профіль оновлено.", cancellationToken);
    }

    public async Task<ProfileResponseDto> AddAddressAsync(
        SaveUserAddressRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var normalizedLine = NormalizeAddressLine(request.AddressLine);
        if (normalizedLine is null)
        {
            return Failure(["Вкажіть адресу."]);
        }

        var addressValidation = await streetSearchService.ValidateAddressLineAsync(normalizedLine, cancellationToken);
        if (!addressValidation.Success)
        {
            return Failure([addressValidation.Error ?? "Некоректна адреса."]);
        }

        var user = await userRepository.FindByIdAsync(request.UserId, cancellationToken);
        if (user is null)
        {
            return Failure(["Користувача не знайдено."]);
        }

        if (user.Role is not UserRole.User)
        {
            return Failure(["Адреси можуть додавати лише клієнти."]);
        }

        var existing = await userAddressRepository.FindByUserAndLineAsync(user.Id, normalizedLine, cancellationToken);
        if (existing is not null)
        {
            return Failure(["Така адреса вже збережена у профілі."]);
        }

        var address = new UserAddress
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Label = NormalizeLabel(request.Label),
            AddressLine = normalizedLine,
            IsDefault = false,
            CreatedAtUtc = DateTime.UtcNow,
        };

        await userAddressRepository.AddAsync(address, cancellationToken);

        user.UpdatedAtUtc = DateTime.UtcNow;
        await userRepository.UpdateAsync(user, cancellationToken);

        return new ProfileResponseDto
        {
            Success = true,
            Message = "Адресу додано.",
            Address = MapAddress(address, isLastUsed: false),
        };
    }

    public async Task<ProfileResponseDto> UpdateAddressAsync(
        UpdateUserAddressRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var normalizedLine = NormalizeAddressLine(request.AddressLine);
        if (normalizedLine is null)
        {
            return Failure(["Вкажіть адресу."]);
        }

        var addressValidation = await streetSearchService.ValidateAddressLineAsync(normalizedLine, cancellationToken);
        if (!addressValidation.Success)
        {
            return Failure([addressValidation.Error ?? "Некоректна адреса."]);
        }

        var address = await userAddressRepository.FindByIdAsync(request.AddressId, cancellationToken);
        if (address is null || address.UserId != request.UserId)
        {
            return Failure(["Адресу не знайдено."]);
        }

        var duplicate = await userAddressRepository.FindByUserAndLineAsync(request.UserId, normalizedLine, cancellationToken);
        if (duplicate is not null && duplicate.Id != address.Id)
        {
            return Failure(["Така адреса вже збережена у профілі."]);
        }

        address.Label = NormalizeLabel(request.Label);
        address.AddressLine = normalizedLine;

        await userAddressRepository.UpdateAsync(address, cancellationToken);

        var user = await userRepository.FindByIdAsync(request.UserId, cancellationToken);
        if (user is not null)
        {
            user.UpdatedAtUtc = DateTime.UtcNow;
            await userRepository.UpdateAsync(user, cancellationToken);
        }

        var lastUsedAddressId = await GetLastUsedAddressIdAsync(request.UserId, cancellationToken);

        return new ProfileResponseDto
        {
            Success = true,
            Message = "Адресу оновлено.",
            Address = MapAddress(address, address.Id == lastUsedAddressId),
        };
    }

    public async Task<ProfileResponseDto> DeleteAddressAsync(
        DeleteUserAddressRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var address = await userAddressRepository.FindByIdAsync(request.AddressId, cancellationToken);
        if (address is null || address.UserId != request.UserId)
        {
            return Failure(["Адресу не знайдено."]);
        }

        await userAddressRepository.DeleteAsync(address, cancellationToken);

        var user = await userRepository.FindByIdAsync(request.UserId, cancellationToken);
        if (user is not null)
        {
            user.UpdatedAtUtc = DateTime.UtcNow;
            await userRepository.UpdateAsync(user, cancellationToken);
        }

        return new ProfileResponseDto
        {
            Success = true,
            Message = "Адресу видалено.",
        };
    }

    public async Task<(bool Success, string? AddressLine, Guid? AddressId, IReadOnlyList<string> Errors)> ResolveOrderAddressAsync(
        Guid userId,
        Guid? addressId,
        string? newAddressLine,
        CancellationToken cancellationToken = default)
    {
        if (addressId is Guid selectedId)
        {
            var saved = await userAddressRepository.FindByIdAsync(selectedId, cancellationToken);
            if (saved is null || saved.UserId != userId)
            {
                return (false, null, null, ["Обрану адресу не знайдено."]);
            }

            return (true, saved.AddressLine, saved.Id, []);
        }

        var normalizedLine = NormalizeAddressLine(newAddressLine);
        if (normalizedLine is null)
        {
            return (false, null, null, ["Вкажіть адресу доставки."]);
        }

        var addressValidation = await streetSearchService.ValidateAddressLineAsync(normalizedLine, cancellationToken);
        if (!addressValidation.Success)
        {
            return (false, null, null, [addressValidation.Error ?? "Некоректна адреса."]);
        }

        var existing = await userAddressRepository.FindByUserAndLineAsync(userId, normalizedLine, cancellationToken);
        if (existing is not null)
        {
            return (true, existing.AddressLine, existing.Id, []);
        }

        var created = new UserAddress
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Label = null,
            AddressLine = normalizedLine,
            IsDefault = false,
            CreatedAtUtc = DateTime.UtcNow,
        };

        await userAddressRepository.AddAsync(created, cancellationToken);

        var user = await userRepository.FindByIdAsync(userId, cancellationToken);
        if (user is not null)
        {
            user.UpdatedAtUtc = DateTime.UtcNow;
            await userRepository.UpdateAsync(user, cancellationToken);
        }

        return (true, created.AddressLine, created.Id, []);
    }

    private async Task<Guid?> GetLastUsedAddressIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        var orders = await orderRepository.GetByUserIdAsync(userId, cancellationToken);
        var lastOrder = orders.FirstOrDefault();
        if (lastOrder is null)
        {
            return null;
        }

        if (lastOrder.UserAddressId is Guid addressId)
        {
            return addressId;
        }

        if (string.IsNullOrWhiteSpace(lastOrder.Address))
        {
            return null;
        }

        var addresses = await userAddressRepository.GetByUserIdAsync(userId, cancellationToken);
        var matched = addresses.FirstOrDefault(address =>
            string.Equals(address.AddressLine, lastOrder.Address, StringComparison.OrdinalIgnoreCase));

        return matched?.Id;
    }

    private static List<string> ValidateProfileFields(string? name, string? email, string? phone)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 2 || name.Trim().Length > 100)
        {
            errors.Add("Ім'я має містити від 2 до 100 символів.");
        }

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            errors.Add("Некоректний формат електронної пошти.");
        }

        if (string.IsNullOrWhiteSpace(phone) || !AuthValidator.TryNormalizePhone(phone, out _))
        {
            errors.Add("Некоректний формат номера телефону.");
        }

        return errors;
    }

    private static string? NormalizeAddressLine(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length > MaxAddressLength ? trimmed[..MaxAddressLength] : trimmed;
    }

    private static string? NormalizeLabel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length > MaxLabelLength ? trimmed[..MaxLabelLength] : trimmed;
    }

    private async Task<ProfileResponseDto> SuccessProfileAsync(
        User user,
        string? message = null,
        CancellationToken cancellationToken = default)
    {
        var lastUsedAddressId = await GetLastUsedAddressIdAsync(user.Id, cancellationToken);

        return new ProfileResponseDto
        {
            Success = true,
            Message = message,
            Profile = MapProfile(user, lastUsedAddressId),
        };
    }

    private static ProfileResponseDto Failure(IReadOnlyList<string> errors) =>
        new() { Success = false, Errors = errors };

    private static UserProfileDto MapProfile(User user, Guid? lastUsedAddressId) =>
        new()
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role.ToString(),
            CreatedAtUtc = user.CreatedAtUtc,
            UpdatedAtUtc = user.UpdatedAtUtc,
            LastUsedAddressId = lastUsedAddressId,
            Addresses = user.Addresses
                .OrderByDescending(address => lastUsedAddressId.HasValue && address.Id == lastUsedAddressId.Value)
                .ThenByDescending(address => address.CreatedAtUtc)
                .Select(address => MapAddress(address, lastUsedAddressId.HasValue && address.Id == lastUsedAddressId.Value))
                .ToList(),
        };

    private static UserAddressDto MapAddress(UserAddress address, bool isLastUsed) =>
        new()
        {
            Id = address.Id,
            Label = address.Label,
            AddressLine = address.AddressLine,
            IsLastUsed = isLastUsed,
            CreatedAtUtc = address.CreatedAtUtc,
        };
}
