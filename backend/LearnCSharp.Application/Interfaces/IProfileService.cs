using LearnCSharp.Application.DTOs.Profile;

namespace LearnCSharp.Application.Interfaces;

public interface IProfileService
{
    Task<ProfileResponseDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<ProfileResponseDto> UpdateProfileAsync(UpdateProfileRequestDto request, CancellationToken cancellationToken = default);

    Task<ProfileResponseDto> AddAddressAsync(SaveUserAddressRequestDto request, CancellationToken cancellationToken = default);

    Task<ProfileResponseDto> UpdateAddressAsync(UpdateUserAddressRequestDto request, CancellationToken cancellationToken = default);

    Task<ProfileResponseDto> DeleteAddressAsync(DeleteUserAddressRequestDto request, CancellationToken cancellationToken = default);

    Task<(bool Success, string? AddressLine, Guid? AddressId, IReadOnlyList<string> Errors)> ResolveOrderAddressAsync(
        Guid userId,
        Guid? addressId,
        string? newAddressLine,
        CancellationToken cancellationToken = default);
}
