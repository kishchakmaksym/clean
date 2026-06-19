using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Repositories;

public sealed class UserAddressRepository(AppDbContext dbContext) : IUserAddressRepository
{
    public async Task<IReadOnlyList<UserAddress>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await dbContext.UserAddresses
            .AsNoTracking()
            .Where(address => address.UserId == userId)
            .OrderByDescending(address => address.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public Task<UserAddress?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.UserAddresses.FirstOrDefaultAsync(address => address.Id == id, cancellationToken);

    public Task<UserAddress?> FindByUserAndLineAsync(Guid userId, string addressLine, CancellationToken cancellationToken = default) =>
        dbContext.UserAddresses
            .FirstOrDefaultAsync(
                address => address.UserId == userId && address.AddressLine == addressLine,
                cancellationToken);

    public async Task AddAsync(UserAddress address, CancellationToken cancellationToken = default)
    {
        dbContext.UserAddresses.Add(address);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(UserAddress address, CancellationToken cancellationToken = default)
    {
        dbContext.UserAddresses.Update(address);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(UserAddress address, CancellationToken cancellationToken = default)
    {
        dbContext.UserAddresses.Remove(address);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task ClearDefaultForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var defaults = await dbContext.UserAddresses
            .Where(address => address.UserId == userId && address.IsDefault)
            .ToListAsync(cancellationToken);

        foreach (var address in defaults)
        {
            address.IsDefault = false;
        }

        if (defaults.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
