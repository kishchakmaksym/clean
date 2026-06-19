using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Repositories;

public sealed class PendingCardOrderRepository(AppDbContext dbContext) : IPendingCardOrderRepository
{
    public async Task SaveAsync(PendingCardOrder pending, CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.PendingCardOrders
            .FirstOrDefaultAsync(item => item.InvoiceId == pending.InvoiceId, cancellationToken);

        if (existing is null)
        {
            dbContext.PendingCardOrders.Add(pending);
        }
        else
        {
            existing.UserId = pending.UserId;
            existing.OrderPayloadJson = pending.OrderPayloadJson;
            existing.CreatedAtUtc = pending.CreatedAtUtc;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<PendingCardOrder?> FindByInvoiceIdAsync(
        string invoiceId,
        CancellationToken cancellationToken = default) =>
        dbContext.PendingCardOrders
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.InvoiceId == invoiceId, cancellationToken);

    public Task<PendingCardOrder?> FindLatestByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        dbContext.PendingCardOrders
            .AsNoTracking()
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task DeleteAsync(string invoiceId, CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.PendingCardOrders
            .FirstOrDefaultAsync(item => item.InvoiceId == invoiceId, cancellationToken);

        if (existing is null)
        {
            return;
        }

        dbContext.PendingCardOrders.Remove(existing);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
