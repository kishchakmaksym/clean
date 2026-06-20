using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;
using LearnCSharp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Repositories;

public sealed class SupportTicketRepository(AppDbContext dbContext) : ISupportTicketRepository
{
    public async Task<IReadOnlyList<SupportTicket>> GetByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        await dbContext.SupportTickets
            .AsNoTracking()
            .Include(ticket => ticket.User)
            .Where(ticket => ticket.UserId == userId)
            .OrderByDescending(ticket => ticket.UpdatedAtUtc ?? ticket.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SupportTicket>> GetAllOpenAsync(
        CancellationToken cancellationToken = default) =>
        await dbContext.SupportTickets
            .AsNoTracking()
            .Include(ticket => ticket.User)
            .Where(ticket => ticket.Status != SupportTicketStatus.Closed)
            .OrderByDescending(ticket => ticket.UpdatedAtUtc ?? ticket.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SupportTicket>> GetAllForAdminAsync(
        CancellationToken cancellationToken = default) =>
        await dbContext.SupportTickets
            .AsNoTracking()
            .Include(ticket => ticket.User)
            .OrderByDescending(ticket => ticket.UpdatedAtUtc ?? ticket.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public Task<SupportTicket?> FindByIdAsync(Guid ticketId, CancellationToken cancellationToken = default) =>
        dbContext.SupportTickets
            .Include(ticket => ticket.User)
            .FirstOrDefaultAsync(ticket => ticket.Id == ticketId, cancellationToken);

    public async Task<IReadOnlyList<SupportMessage>> GetMessagesAsync(
        Guid ticketId,
        DateTime? sinceUtc,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.SupportMessages
            .AsNoTracking()
            .Include(message => message.SenderUser)
            .Where(message => message.TicketId == ticketId);

        if (sinceUtc is not null)
        {
            query = query.Where(message => message.CreatedAtUtc > sinceUtc);
        }

        return await query
            .OrderBy(message => message.CreatedAtUtc)
            .ThenBy(message => message.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task AddTicketAsync(SupportTicket ticket, CancellationToken cancellationToken = default)
    {
        dbContext.SupportTickets.Add(ticket);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddMessageAsync(SupportMessage message, CancellationToken cancellationToken = default)
    {
        dbContext.SupportMessages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateTicketAsync(SupportTicket ticket, CancellationToken cancellationToken = default)
    {
        dbContext.SupportTickets.Update(ticket);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task EnqueueOutboxAsync(
        SupportOutboxMessage message,
        CancellationToken cancellationToken = default)
    {
        dbContext.SupportOutboxMessages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SupportOutboxMessage>> GetPendingOutboxAsync(
        int limit,
        CancellationToken cancellationToken = default) =>
        await dbContext.SupportOutboxMessages
            .Where(message => message.ProcessedAtUtc == null)
            .OrderBy(message => message.CreatedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public async Task MarkOutboxProcessedAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var message = await dbContext.SupportOutboxMessages.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (message is null)
        {
            return;
        }

        message.ProcessedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SupportTelegramAccount>> GetLinkedSupportAdminsAsync(
        CancellationToken cancellationToken = default) =>
        await dbContext.SupportTelegramAccounts
            .AsNoTracking()
            .Include(account => account.User)
            .ToListAsync(cancellationToken);

    public Task<SupportTelegramAccount?> FindSupportAccountByTelegramUserIdAsync(
        long telegramUserId,
        CancellationToken cancellationToken = default) =>
        dbContext.SupportTelegramAccounts
            .Include(account => account.User)
            .FirstOrDefaultAsync(account => account.TelegramUserId == telegramUserId, cancellationToken);

    public async Task UpsertSupportTelegramAccountAsync(
        SupportTelegramAccount account,
        CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.SupportTelegramAccounts
            .FirstOrDefaultAsync(item => item.TelegramUserId == account.TelegramUserId, cancellationToken);

        if (existing is null)
        {
            dbContext.SupportTelegramAccounts.Add(account);
        }
        else
        {
            existing.UserId = account.UserId;
            existing.ChatId = account.ChatId;
            existing.VerifiedPhone = account.VerifiedPhone;
            existing.LastSeenAtUtc = account.LastSeenAtUtc;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
