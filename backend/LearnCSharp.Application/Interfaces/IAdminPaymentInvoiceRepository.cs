using LearnCSharp.Domain.Entities;

namespace LearnCSharp.Application.Interfaces;

public interface IAdminPaymentInvoiceRepository
{
    Task AddAsync(AdminPaymentInvoice invoice, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminPaymentInvoice>> GetForAdminAsync(
        Guid adminUserId,
        int limit = 100,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminPaymentInvoice>> GetPendingStatusRefreshAsync(
        Guid adminUserId,
        CancellationToken cancellationToken = default);

    Task UpdateStatusAsync(
        string invoiceId,
        string status,
        DateTime? paidAtUtc,
        CancellationToken cancellationToken = default);

    Task<bool> MarkAsDeletedAsync(
        string invoiceId,
        Guid adminUserId,
        CancellationToken cancellationToken = default);

    Task<bool> RestoreAsync(
        string invoiceId,
        Guid adminUserId,
        CancellationToken cancellationToken = default);
}
