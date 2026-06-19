using LearnCSharp.Domain.Entities;

namespace LearnCSharp.Application.Interfaces;

public interface IPendingCardOrderRepository
{
    Task SaveAsync(PendingCardOrder pending, CancellationToken cancellationToken = default);

    Task<PendingCardOrder?> FindByInvoiceIdAsync(string invoiceId, CancellationToken cancellationToken = default);

    Task<PendingCardOrder?> FindLatestByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task DeleteAsync(string invoiceId, CancellationToken cancellationToken = default);
}
