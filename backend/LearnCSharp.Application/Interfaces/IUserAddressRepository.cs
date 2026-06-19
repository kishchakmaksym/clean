using LearnCSharp.Domain.Entities;

namespace LearnCSharp.Application.Interfaces;

public interface IUserAddressRepository
{
    Task<IReadOnlyList<UserAddress>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<UserAddress?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<UserAddress?> FindByUserAndLineAsync(Guid userId, string addressLine, CancellationToken cancellationToken = default);

    Task AddAsync(UserAddress address, CancellationToken cancellationToken = default);

    Task UpdateAsync(UserAddress address, CancellationToken cancellationToken = default);

    Task DeleteAsync(UserAddress address, CancellationToken cancellationToken = default);

    Task ClearDefaultForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
