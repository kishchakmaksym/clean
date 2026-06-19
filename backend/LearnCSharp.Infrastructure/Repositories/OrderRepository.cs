using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;
using LearnCSharp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Repositories;

public sealed class OrderRepository(AppDbContext dbContext) : IOrderRepository
{
    public async Task<IReadOnlyList<Order>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await dbContext.Orders
            .AsNoTracking()
            .Include(order => order.User)
            .OrderByDescending(order => order.CreatedAtUtc)
            .ThenByDescending(order => order.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Order>> GetByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        await dbContext.Orders
            .AsNoTracking()
            .Include(order => order.User)
            .Where(order => order.UserId == userId)
            .OrderByDescending(order => order.CreatedAtUtc)
            .ThenByDescending(order => order.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Order>> GetByStatusAsync(
        OrderStatus status,
        CancellationToken cancellationToken = default) =>
        await dbContext.Orders
            .AsNoTracking()
            .Include(order => order.User)
            .Where(order => order.Status == status)
            .OrderByDescending(order => order.CreatedAtUtc)
            .ThenByDescending(order => order.Id)
            .ToListAsync(cancellationToken);

    public Task<Order?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Orders
            .Include(order => order.User)
            .FirstOrDefaultAsync(order => order.Id == id, cancellationToken);

    public async Task AddAsync(Order order, CancellationToken cancellationToken = default)
    {
        dbContext.Orders.Add(order);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Order order, CancellationToken cancellationToken = default)
    {
        dbContext.Orders.Update(order);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
