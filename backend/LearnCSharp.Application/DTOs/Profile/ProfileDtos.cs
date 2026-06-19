namespace LearnCSharp.Application.DTOs.Profile;

public sealed class UserAddressDto
{
    public required Guid Id { get; init; }

    public string? Label { get; init; }

    public required string AddressLine { get; init; }

    public bool IsLastUsed { get; init; }

    public required DateTime CreatedAtUtc { get; init; }
}

public sealed class UserProfileDto
{
    public required Guid Id { get; init; }

    public required string Name { get; init; }

    public required string Email { get; init; }

    public required string Phone { get; init; }

    public required string Role { get; init; }

    public required DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }

    public Guid? LastUsedAddressId { get; init; }

    public IReadOnlyList<UserAddressDto> Addresses { get; init; } = [];
}

public sealed class UpdateProfileRequestDto
{
    public required Guid UserId { get; init; }

    public required string Name { get; init; }

    public required string Email { get; init; }

    public required string Phone { get; init; }
}

public sealed class SaveUserAddressRequestDto
{
    public required Guid UserId { get; init; }

    public string? Label { get; init; }

    public required string AddressLine { get; init; }

    public bool IsDefault { get; init; }
}

public sealed class UpdateUserAddressRequestDto
{
    public required Guid UserId { get; init; }

    public required Guid AddressId { get; init; }

    public string? Label { get; init; }

    public required string AddressLine { get; init; }

    public bool IsDefault { get; init; }
}

public sealed class DeleteUserAddressRequestDto
{
    public required Guid UserId { get; init; }

    public required Guid AddressId { get; init; }
}

public sealed class ProfileResponseDto
{
    public bool Success { get; init; }

    public string? Message { get; init; }

    public UserProfileDto? Profile { get; init; }

    public UserAddressDto? Address { get; init; }

    public IReadOnlyList<string>? Errors { get; init; }
}
