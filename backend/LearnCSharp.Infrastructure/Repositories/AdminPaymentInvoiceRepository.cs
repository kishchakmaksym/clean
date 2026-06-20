using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Repositories;

public sealed class AdminPaymentInvoiceRepository(AppDbContext dbContext) : IAdminPaymentInvoiceRepository
{
    private static readonly string[] FinalStatuses = ["success", "expired", "failure", "reversed"];

    public async Task AddAsync(AdminPaymentInvoice invoice, CancellationToken cancellationToken = default)
    {
        dbContext.AdminPaymentInvoices.Add(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminPaymentInvoice>> GetForAdminAsync(
        Guid adminUserId,
        int limit = 100,
        CancellationToken cancellationToken = default)
    {
        return await dbContext.AdminPaymentInvoices
            .AsNoTracking()
            .Where(item => item.CreatedByUserId == adminUserId)
            .OrderByDescending(item => item.CreatedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminPaymentInvoice>> GetPendingStatusRefreshAsync(
        Guid adminUserId,
        CancellationToken cancellationToken = default)
    {
        return await dbContext.AdminPaymentInvoices
            .Where(item =>
                item.CreatedByUserId == adminUserId &&
                !FinalStatuses.Contains(item.Status))
            .OrderByDescending(item => item.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task UpdateStatusAsync(
        string invoiceId,
        string status,
        DateTime? paidAtUtc,
        CancellationToken cancellationToken = default)
    {
        var invoice = await dbContext.AdminPaymentInvoices
            .FirstOrDefaultAsync(item => item.InvoiceId == invoiceId, cancellationToken);

        if (invoice is null)
        {
            return;
        }

        invoice.Status = status;
        invoice.PaidAtUtc = paidAtUtc;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> MarkAsDeletedAsync(
        string invoiceId,
        Guid adminUserId,
        CancellationToken cancellationToken = default)
    {
        var invoice = await dbContext.AdminPaymentInvoices
            .FirstOrDefaultAsync(
                item => item.InvoiceId == invoiceId && item.CreatedByUserId == adminUserId,
                cancellationToken);

        if (invoice is null)
        {
            return false;
        }

        if (string.Equals(invoice.Status, "success", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (invoice.DeletedAtUtc is not null)
        {
            return true;
        }

        invoice.DeletedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RestoreAsync(
        string invoiceId,
        Guid adminUserId,
        CancellationToken cancellationToken = default)
    {
        var invoice = await dbContext.AdminPaymentInvoices
            .FirstOrDefaultAsync(
                item => item.InvoiceId == invoiceId && item.CreatedByUserId == adminUserId,
                cancellationToken);

        if (invoice is null || invoice.DeletedAtUtc is null)
        {
            return false;
        }

        if (string.Equals(invoice.Status, "success", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        invoice.DeletedAtUtc = null;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
