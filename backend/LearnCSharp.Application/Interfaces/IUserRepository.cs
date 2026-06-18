using LearnCSharp.Domain.Entities;

namespace LearnCSharp.Application.Interfaces;

public interface IUserRepository
{
    Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken cancellationToken = default);

    Task<bool> PhoneExistsAsync(string normalizedPhone, CancellationToken cancellationToken = default);

    Task<User?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default);

    Task<User?> FindByPhoneAsync(string normalizedPhone, CancellationToken cancellationToken = default);

    Task AddAsync(User user, CancellationToken cancellationToken = default);
}
