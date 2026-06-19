using LearnCSharp.Domain.Entities;

namespace LearnCSharp.Application.Interfaces;

public interface IOrderRepository
{
    Task<IReadOnlyList<Order>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Order>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Order>> GetByStatusAsync(
        Domain.Enums.OrderStatus status,
        CancellationToken cancellationToken = default);

    Task<Order?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task AddAsync(Order order, CancellationToken cancellationToken = default);

    Task UpdateAsync(Order order, CancellationToken cancellationToken = default);
}
