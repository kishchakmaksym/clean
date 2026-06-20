using LearnCSharp.Application.DTOs.Support;
using LearnCSharp.Domain.Entities;

namespace LearnCSharp.Application.Interfaces;

public interface ISupportTicketRepository
{
    Task<IReadOnlyList<SupportTicket>> GetByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportTicket>> GetAllOpenAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportTicket>> GetAllForAdminAsync(
        CancellationToken cancellationToken = default);

    Task<SupportTicket?> FindByIdAsync(Guid ticketId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportMessage>> GetMessagesAsync(
        Guid ticketId,
        DateTime? sinceUtc,
        CancellationToken cancellationToken = default);

    Task AddTicketAsync(SupportTicket ticket, CancellationToken cancellationToken = default);

    Task AddMessageAsync(SupportMessage message, CancellationToken cancellationToken = default);

    Task UpdateTicketAsync(SupportTicket ticket, CancellationToken cancellationToken = default);

    Task EnqueueOutboxAsync(
        SupportOutboxMessage message,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportOutboxMessage>> GetPendingOutboxAsync(
        int limit,
        CancellationToken cancellationToken = default);

    Task MarkOutboxProcessedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportTelegramAccount>> GetLinkedSupportAdminsAsync(
        CancellationToken cancellationToken = default);

    Task<SupportTelegramAccount?> FindSupportAccountByTelegramUserIdAsync(
        long telegramUserId,
        CancellationToken cancellationToken = default);

    Task UpsertSupportTelegramAccountAsync(
        SupportTelegramAccount account,
        CancellationToken cancellationToken = default);
}
