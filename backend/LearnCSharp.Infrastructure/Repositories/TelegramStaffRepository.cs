using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;
using LearnCSharp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Repositories;

public sealed class TelegramStaffRepository(AppDbContext dbContext) : ITelegramStaffRepository
{
    public async Task<TelegramAccountDto?> FindAccountByTelegramUserIdAsync(
        long telegramUserId,
        CancellationToken cancellationToken = default)
    {
        var account = await dbContext.TelegramAccounts
            .AsNoTracking()
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.TelegramUserId == telegramUserId, cancellationToken);

        return account is null ? null : MapAccount(account);
    }

    public async Task<TelegramAccountDto?> FindAccountByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var account = await dbContext.TelegramAccounts
            .AsNoTracking()
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);

        return account is null ? null : MapAccount(account);
    }

    public async Task<IReadOnlyList<TelegramAccountDto>> GetStaffAccountsAsync(
        CancellationToken cancellationToken = default)
    {
        var accounts = await dbContext.TelegramAccounts
            .AsNoTracking()
            .Include(item => item.User)
            .Where(item => item.User.Role == UserRole.Admin || item.User.Role == UserRole.Employee)
            .ToListAsync(cancellationToken);

        return accounts.Select(MapAccount).ToList();
    }

    public async Task LinkAccountAsync(
        Guid userId,
        long telegramUserId,
        long chatId,
        string verifiedPhone,
        CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.TelegramAccounts
            .FirstOrDefaultAsync(item => item.TelegramUserId == telegramUserId, cancellationToken);

        if (existing is not null)
        {
            existing.UserId = userId;
            existing.ChatId = chatId;
            existing.VerifiedPhone = verifiedPhone;
            existing.LastSeenAtUtc = DateTime.UtcNow;
        }
        else
        {
            dbContext.TelegramAccounts.Add(new TelegramAccount
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TelegramUserId = telegramUserId,
                ChatId = chatId,
                VerifiedPhone = verifiedPhone,
                LinkedAtUtc = DateTime.UtcNow,
                LastSeenAtUtc = DateTime.UtcNow,
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task TouchLastSeenAsync(long telegramUserId, CancellationToken cancellationToken = default)
    {
        var account = await dbContext.TelegramAccounts
            .FirstOrDefaultAsync(item => item.TelegramUserId == telegramUserId, cancellationToken);

        if (account is null)
        {
            return;
        }

        account.LastSeenAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<EmployeeProfileDto?> GetEmployeeProfileAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var profile = await dbContext.EmployeeProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);

        return profile is null
            ? null
            : new EmployeeProfileDto
            {
                SharePercent = profile.SharePercent,
                CanAcceptOrders = profile.CanAcceptOrders,
            };
    }

    public async Task EnsureEmployeeProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var exists = await dbContext.EmployeeProfiles
            .AnyAsync(item => item.UserId == userId, cancellationToken);

        if (exists)
        {
            return;
        }

        dbContext.EmployeeProfiles.Add(new EmployeeProfile
        {
            UserId = userId,
            SharePercent = 0,
            CanAcceptOrders = false,
            CreatedAtUtc = DateTime.UtcNow,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateEmployeeProfileAsync(
        Guid userId,
        decimal sharePercent,
        bool canAcceptOrders,
        CancellationToken cancellationToken = default)
    {
        await EnsureEmployeeProfileAsync(userId, cancellationToken);

        var profile = await dbContext.EmployeeProfiles
            .FirstAsync(item => item.UserId == userId, cancellationToken);

        profile.SharePercent = sharePercent;
        profile.CanAcceptOrders = canAcceptOrders;
        profile.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<EmployeeListItemDto>> GetEmployeesAsync(
        CancellationToken cancellationToken = default)
    {
        var employees = await dbContext.Users
            .AsNoTracking()
            .Where(user => user.Role == UserRole.Employee)
            .OrderBy(user => user.Name)
            .ToListAsync(cancellationToken);

        var profiles = await dbContext.EmployeeProfiles
            .AsNoTracking()
            .Where(profile => employees.Select(item => item.Id).Contains(profile.UserId))
            .ToDictionaryAsync(profile => profile.UserId, cancellationToken);

        var linked = await dbContext.TelegramAccounts
            .AsNoTracking()
            .Where(account => employees.Select(item => item.Id).Contains(account.UserId))
            .Select(account => account.UserId)
            .ToListAsync(cancellationToken);

        var linkedSet = linked.ToHashSet();

        return employees
            .Select(employee =>
            {
                profiles.TryGetValue(employee.Id, out var profile);
                return new EmployeeListItemDto
                {
                    UserId = employee.Id,
                    Name = employee.Name,
                    Phone = employee.Phone,
                    SharePercent = profile?.SharePercent ?? 0,
                    CanAcceptOrders = profile?.CanAcceptOrders ?? false,
                    IsLinkedToTelegram = linkedSet.Contains(employee.Id),
                };
            })
            .ToList();
    }

    public async Task<OrderAssignmentDto?> GetOrderAssignmentAsync(
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        var assignment = await dbContext.OrderAssignments
            .AsNoTracking()
            .Include(item => item.Employee)
            .FirstOrDefaultAsync(item => item.OrderId == orderId, cancellationToken);

        return assignment is null
            ? null
            : new OrderAssignmentDto
            {
                OrderId = assignment.OrderId,
                EmployeeUserId = assignment.EmployeeUserId,
                EmployeeName = assignment.Employee.Name,
                ClaimedAtUtc = assignment.ClaimedAtUtc,
            };
    }

    public async Task<bool> TryClaimOrderAsync(
        Guid orderId,
        Guid employeeUserId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var alreadyClaimed = await dbContext.OrderAssignments
            .AnyAsync(item => item.OrderId == orderId, cancellationToken);

        if (alreadyClaimed)
        {
            await transaction.RollbackAsync(cancellationToken);
            return false;
        }

        dbContext.OrderAssignments.Add(new OrderAssignment
        {
            OrderId = orderId,
            EmployeeUserId = employeeUserId,
            ClaimedAtUtc = DateTime.UtcNow,
        });

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            return false;
        }
    }

    public async Task AddAuditLogAsync(
        Guid actorUserId,
        StaffAuditAction action,
        string details,
        Guid? orderId = null,
        CancellationToken cancellationToken = default)
    {
        dbContext.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = actorUserId,
            OrderId = orderId,
            Action = action,
            Details = details,
            CreatedAtUtc = DateTime.UtcNow,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<StaffAuditLogDto>> GetRecentAuditLogsAsync(
        int limit,
        CancellationToken cancellationToken = default) =>
        await dbContext.StaffAuditLogs
            .AsNoTracking()
            .Include(item => item.Actor)
            .OrderByDescending(item => item.CreatedAtUtc)
            .Take(limit)
            .Select(item => new StaffAuditLogDto
            {
                Id = item.Id,
                ActorName = item.Actor.Name,
                Action = item.Action,
                Details = item.Details,
                OrderId = item.OrderId,
                CreatedAtUtc = item.CreatedAtUtc,
            })
            .ToListAsync(cancellationToken);

    public async Task EnqueueOutboxAsync(
        TelegramOutboxType type,
        string payloadJson,
        CancellationToken cancellationToken = default)
    {
        dbContext.TelegramOutboxMessages.Add(new TelegramOutboxMessage
        {
            Id = Guid.NewGuid(),
            Type = type,
            PayloadJson = payloadJson,
            CreatedAtUtc = DateTime.UtcNow,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TelegramOutboxDto>> DequeueOutboxBatchAsync(
        int batchSize,
        CancellationToken cancellationToken = default) =>
        await dbContext.TelegramOutboxMessages
            .Where(item => item.ProcessedAtUtc == null)
            .OrderBy(item => item.CreatedAtUtc)
            .Take(batchSize)
            .Select(item => new TelegramOutboxDto
            {
                Id = item.Id,
                Type = item.Type,
                PayloadJson = item.PayloadJson,
            })
            .ToListAsync(cancellationToken);

    public async Task MarkOutboxProcessedAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var message = await dbContext.TelegramOutboxMessages
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (message is null)
        {
            return;
        }

        message.ProcessedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveOrderNotificationAsync(
        Guid orderId,
        long chatId,
        int messageId,
        CancellationToken cancellationToken = default)
    {
        dbContext.TelegramOrderNotifications.Add(new TelegramOrderNotification
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            ChatId = chatId,
            MessageId = messageId,
            SentAtUtc = DateTime.UtcNow,
            IsClosed = false,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TelegramOrderNotificationDto>> GetOpenNotificationsForOrderAsync(
        Guid orderId,
        CancellationToken cancellationToken = default) =>
        await dbContext.TelegramOrderNotifications
            .AsNoTracking()
            .Where(item => item.OrderId == orderId && !item.IsClosed)
            .Select(item => new TelegramOrderNotificationDto
            {
                ChatId = item.ChatId,
                MessageId = item.MessageId,
            })
            .ToListAsync(cancellationToken);

    public async Task CloseOrderNotificationsAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var notifications = await dbContext.TelegramOrderNotifications
            .Where(item => item.OrderId == orderId && !item.IsClosed)
            .ToListAsync(cancellationToken);

        foreach (var notification in notifications)
        {
            notification.IsClosed = true;
        }

        if (notifications.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<IReadOnlyList<Order>> GetUnclaimedPendingOrdersAsync(
        CancellationToken cancellationToken = default)
    {
        var claimedIds = dbContext.OrderAssignments.Select(item => item.OrderId);

        return await dbContext.Orders
            .AsNoTracking()
            .Include(order => order.User)
            .Where(order =>
                order.Status == OrderStatus.PendingConfirmation &&
                !claimedIds.Contains(order.Id))
            .OrderByDescending(order => order.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Order>> GetOrdersAssignedToAsync(
        Guid employeeUserId,
        CancellationToken cancellationToken = default)
    {
        var orderIds = dbContext.OrderAssignments
            .Where(item => item.EmployeeUserId == employeeUserId)
            .Select(item => item.OrderId);

        return await dbContext.Orders
            .AsNoTracking()
            .Include(order => order.User)
            .Where(order => orderIds.Contains(order.Id) && order.Status != OrderStatus.Completed)
            .OrderByDescending(order => order.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Order>> GetCompletedOrdersForEmployeeAsync(
        Guid employeeUserId,
        DateTime? fromUtc,
        CancellationToken cancellationToken = default)
    {
        var orderIds = dbContext.OrderAssignments
            .Where(item => item.EmployeeUserId == employeeUserId)
            .Select(item => item.OrderId);

        var query = dbContext.Orders
            .AsNoTracking()
            .Where(order =>
                orderIds.Contains(order.Id) &&
                order.Status == OrderStatus.Completed);

        if (fromUtc is not null)
        {
            query = query.Where(order => order.UpdatedAtUtc >= fromUtc || order.CreatedAtUtc >= fromUtc);
        }

        return await query
            .OrderByDescending(order => order.UpdatedAtUtc ?? order.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Order>> GetActiveOrdersForAdminAsync(
        CancellationToken cancellationToken = default) =>
        await dbContext.Orders
            .AsNoTracking()
            .Include(order => order.User)
            .Where(order => order.Status != OrderStatus.Completed)
            .OrderByDescending(order => order.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public Task<Order?> FindOrderByIdAsync(Guid orderId, CancellationToken cancellationToken = default) =>
        dbContext.Orders
            .Include(order => order.User)
            .FirstOrDefaultAsync(order => order.Id == orderId, cancellationToken);

    public async Task UpdateOrderAsync(Order order, CancellationToken cancellationToken = default)
    {
        dbContext.Orders.Update(order);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static TelegramAccountDto MapAccount(TelegramAccount account) =>
        new()
        {
            UserId = account.UserId,
            Name = account.User.Name,
            Role = account.User.Role,
            TelegramUserId = account.TelegramUserId,
            ChatId = account.ChatId,
        };
}
